const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticate } = require('../middleware/auth');

const TOOL_NAMES = {
    mbti: 'مقياس أنماط الشخصية (MBTI)',
    wheelOfLife: 'عجلة الحياة المتوازنة (Wheel of Life)',
    swot: 'التحليل الرباعي الاستراتيجي (SWOT)'
};

function resolveCoachId(req) {
    if (req.user.role === 'admin') {
        const queryId = req.query.coachId || req.body.coachId;
        return queryId ? parseInt(queryId, 10) : 1;
    }
    return req.coach ? req.coach.id : null;
}

// GET /api/tools (Get tools summary and registered applications)
router.get('/', authenticate, (req, res) => {
    try {
        const coachId = resolveCoachId(req);
        if (!coachId) return res.status(400).json({ error: 'تعذر تحديد حساب الكوتش' });

        const state = db.getCoachCompleteState(coachId);
        if (!state) return res.status(404).json({ error: 'بيانات الكوتش غير موجودة' });

        return res.json({ toolsSummary: state.toolsSummary });
    } catch (err) {
        console.error('Error fetching tools:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء جلب بيانات الأدوات', details: err.message });
    }
});

// POST /api/tools/apply (Register new tool application with strict anti-duplication enforcement)
router.post('/apply', authenticate, (req, res) => {
    try {
        const coachId = resolveCoachId(req);
        if (!coachId) return res.status(400).json({ error: 'تعذر تحديد حساب الكوتش' });

        const { toolType, beneficiaryCode, date, focus, plan, isAnonymous } = req.body;

        if (!toolType || !['mbti', 'wheelOfLife', 'swot'].includes(toolType)) {
            return res.status(400).json({ error: 'نوع الأداة غير صالح (المسموح: mbti, wheelOfLife, swot)' });
        }

        if (!beneficiaryCode || typeof beneficiaryCode !== 'string' || !beneficiaryCode.trim()) {
            return res.status(400).json({ error: 'رمز المستفيد مطلوب (مثال: BEN-45)' });
        }

        // Anonymization check
        if (isAnonymous === false || isAnonymous === 'false') {
            return res.status(400).json({ error: 'يجب الإقرار بنزع الهوية وحفظ خصوصية المستفيد للمتابعة' });
        }

        const normalizedCode = beneficiaryCode.trim().replace(/\s+/g, '').toUpperCase();
        const dbConn = db.getDb();

        // 1. Strict Anti-Duplication Check: WITHIN THE SAME TOOL
        const existingApp = dbConn.prepare(`
            SELECT * FROM tool_applications 
            WHERE coach_id = ? AND tool_type = ? AND UPPER(REPLACE(beneficiary_code, ' ', '')) = ?
        `).get(coachId, toolType, normalizedCode);

        if (existingApp) {
            const toolName = TOOL_NAMES[toolType] || toolType;
            return res.status(400).json({
                error: `تنبيه نظام التحقق: المستفيد (${normalizedCode}) مسجل مسبقاً في أداة ${toolName} بتاريخ ${existingApp.date}!`,
                code: 'DUPLICATE_BENEFICIARY_IN_TOOL',
                ruleNotice: 'تنص لائحة الحقيبة صراحةً: يمنع تكرار المستفيد داخل عداد الأداة نفسها. (ملاحظة: يجوز استخدامه في أداة أخرى كعجلة الحياة أو SWOT ولكن لا يسجل مرتين في نفس الأداة)',
                existingRecord: existingApp
            });
        }

        const now = new Date().toISOString();
        const appDate = date || now.split('T')[0];

        const insertRes = dbConn.prepare(`
            INSERT INTO tool_applications (coach_id, tool_type, beneficiary_code, date, focus, plan, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'approved', ?)
        `).run(
            coachId,
            toolType,
            normalizedCode,
            appDate,
            focus || 'تطبيق معتمد مع خطة متابعة وتأمل مهني',
            plan || 'تم الاتفاق على الأولويات ووضع خطة الاستدامة',
            now
        );

        const newApplication = {
            id: insertRes.lastInsertRowid,
            beneficiaryCode: normalizedCode,
            date: appDate,
            focus: focus || 'تطبيق معتمد مع خطة متابعة وتأمل مهني',
            plan: plan || 'تم الاتفاق على الأولويات ووضع خطة الاستدامة',
            status: 'approved'
        };

        // Sync with coach complete state
        const state = db.getCoachCompleteState(coachId);
        let completedCount = 0;
        if (state && state.toolsSummary && state.toolsSummary[toolType]) {
            completedCount = (state.toolsSummary[toolType].applications || []).length;
            state.toolsSummary[toolType].completed = completedCount;
            db.updateCoachState(coachId, state);
        }

        return res.status(201).json({
            message: `تم بنجاح تسجيل تطبيق أداة ${TOOL_NAMES[toolType]} للمستفيد ${normalizedCode} بدون تكرار!`,
            application: newApplication,
            totalCompleted: completedCount,
            tool: {
                type: toolType,
                completed_count: completedCount
            }
        });
    } catch (err) {
        console.error('Error applying tool:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء تسجيل تطبيق الأداة', details: err.message });
    }
});

module.exports = router;
