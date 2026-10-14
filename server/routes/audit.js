const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticate, requireRole } = require('../middleware/auth');

function resolveCoachId(req) {
    if (req.user.role === 'admin') {
        const queryId = req.query.coachId || req.body.coachId;
        return queryId ? parseInt(queryId, 10) : 1;
    }
    return req.coach ? req.coach.id : null;
}

function evaluateAuditEligibility(state) {
    const blockers = [];

    // 1. Check Quantitative Hours (240h target)
    const totalHoursDone = (state.hours || []).reduce((acc, h) => acc + (h.completed || 0), 0);
    const hoursTarget = state.metadata ? state.metadata.totalTargetHours : 240;
    const hoursEligible = totalHoursDone >= hoursTarget;
    if (!hoursEligible) {
        blockers.push(`الساعات التدريبية والميدانية غير مكتملة (${totalHoursDone}/${hoursTarget} ساعة)`);
    }

    // 2. Check Cases (20 cases)
    const casesCount = (state.cases || []).length;
    const casesEligible = casesCount >= 20;
    if (!casesEligible) {
        blockers.push(`الحالات الميدانية غير مكتملة (${casesCount}/20 حالة)`);
    }

    // 3. Check Sessions (30 sessions)
    const sessionsCount = (state.sessions || []).length;
    const sessionsEligible = sessionsCount >= 30;
    if (!sessionsEligible) {
        blockers.push(`الجلسات الميدانية غير مكتملة (${sessionsCount}/30 جلسة)`);
    }

    // 4. Check Tools (30 MBTI, 30 Wheel, 30 SWOT = 90 total)
    const mbtiCount = state.toolsSummary && state.toolsSummary.mbti ? state.toolsSummary.mbti.completed : 0;
    const wheelCount = state.toolsSummary && state.toolsSummary.wheelOfLife ? state.toolsSummary.wheelOfLife.completed : 0;
    const swotCount = state.toolsSummary && state.toolsSummary.swot ? state.toolsSummary.swot.completed : 0;
    const totalTools = mbtiCount + wheelCount + swotCount;
    const toolsEligible = mbtiCount >= 30 && wheelCount >= 30 && swotCount >= 30;
    if (!toolsEligible) {
        blockers.push(`تطبيقات الأدوات غير مكتملة: MBTI (${mbtiCount}/30)، عجلة الحياة (${wheelCount}/30)، SWOT (${swotCount}/30)`);
    }

    // 5. Check Rubrics & Critical Criteria
    let rubricsSum = 0;
    let totalRubricsCount = (state.rubrics || []).length;
    let criticalFails = [];

    (state.rubrics || []).forEach(r => {
        const weightedScore = r.criteria.reduce((s, c) => s + (c.currentLevel * c.weight), 0);
        rubricsSum += weightedScore;

        r.criteria.forEach(c => {
            if (c.isCritical && c.currentLevel < 3) {
                criticalFails.push(`${r.title}: المعيار الحرج [${c.name}] عند المستوى (${c.currentLevel}/5)`);
            }
        });
    });

    const averageRubricsScore = totalRubricsCount > 0 ? parseFloat((rubricsSum / totalRubricsCount).toFixed(2)) : 0;
    const rubricsScoreEligible = averageRubricsScore >= 3.50;
    if (!rubricsScoreEligible) {
        blockers.push(`متوسط الروبركات دون الحد الأدنى المطلوب للاعتماد (${averageRubricsScore}/5.00 مقابل 3.50 كحد أدنى)`);
    }

    // 6. Critical Ethical & Professional Criteria Blocker
    if (criticalFails.length > 0) {
        blockers.push(`حظر مهني وأخلاقي حاسم: إخفاق في معايير حرجة قطعية لا تقبل التعويض بالحساب الحسابي: ${criticalFails.join(' | ')}`);
    }

    // 7. Independent Ethics Gate Status
    const ethicsPassed = state.ethicsGate && state.ethicsGate.status === 'passed';
    if (!ethicsPassed) {
        blockers.push('بوابة السلامة والنزاهة الأخلاقية المستقلة لم تجتز بنسبة 100%');
    }

    const hasBlocker = blockers.length > 0;
    const isEligible = !hasBlocker;

    return {
        isEligible,
        hasBlocker,
        blockerReasons: blockers,
        metrics: {
            totalHoursDone,
            hoursTarget,
            casesCount,
            sessionsCount,
            toolsSummary: { mbti: mbtiCount, wheelOfLife: wheelCount, swot: swotCount, total: totalTools },
            averageRubricsScore,
            ethicsGateStatus: state.ethicsGate ? state.ethicsGate.status : 'flagged'
        }
    };
}

// GET /api/audit/determination (Live audit calculation)
router.get('/determination', authenticate, (req, res) => {
    try {
        const coachId = resolveCoachId(req);
        if (!coachId) return res.status(400).json({ error: 'تعذر تحديد حساب الكوتش' });

        const state = db.getCoachCompleteState(coachId);
        if (!state) return res.status(404).json({ error: 'بيانات الكوتش غير موجودة' });

        const determination = evaluateAuditEligibility(state);

        return res.json({
            candidate: state.metadata ? state.metadata.candidate : null,
            auditStatus: state.auditStatus || 'in_progress',
            auditDecree: state.auditDecree || null,
            ...determination
        });
    } catch (err) {
        console.error('Error calculating audit determination:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء احتساب محضر التدقيق', details: err.message });
    }
});

// POST /api/audit/determination (Admin/Committee issues official graduation decree)
router.post('/determination', authenticate, requireRole('admin'), (req, res) => {
    try {
        const { coachId, verdict, committeeNotes, signatoryName } = req.body;

        if (!coachId) return res.status(400).json({ error: 'معرف الكوتش مطلوب' });

        const state = db.getCoachCompleteState(coachId);
        if (!state) return res.status(404).json({ error: 'بيانات الكوتش غير موجودة' });

        const determination = evaluateAuditEligibility(state);

        if (determination.hasBlocker && verdict === 'certified') {
            return res.status(400).json({
                error: 'لا يمكن إصدار محضر التخرج أو اعتماد الشهادة لوجود حظر أخلاقي أو مهني حاسم غير مستوفى!',
                code: 'AUDIT_BLOCKERS_PRESENT',
                blockerReasons: determination.blockerReasons
            });
        }

        const now = new Date().toISOString();
        const candidateCode = state.metadata && state.metadata.candidate ? state.metadata.candidate.id : 'MC-2026-084';
        const certCode = `CYCE-MC-${candidateCode.replace(/[^0-9]/g, '')}-${Date.now().toString().slice(-6)}`;

        const decree = {
            certificateNumber: certCode,
            issueDate: now.split('T')[0],
            verdict: verdict || 'certified',
            standing: verdict === 'certified'
                ? 'مجاز بتقدير ممتاز مع مرتبة الشرف الأولى واستحقاق لقب ماستر كوتش تنفيذي معتمد'
                : 'إعادة تدقيق واستكمال المتطلبات',
            committeeChair: signatoryName || 'الماستر كوتش عبدالكريم الخليفي',
            provider: 'شركة تمكين الرؤية للاستشارات المهنية (cyce52.com)',
            metricsSummary: determination.metrics,
            committeeNotes: committeeNotes || 'تم استيفاء كافة متطلبات حقيبة إعداد وتأهيل الماستر كوتش (الإصدار 3.0) بنجاح واقتدار مهني.',
            digitalSealVerified: true,
            issuedAt: now
        };

        const finalStatus = verdict === 'certified' ? 'certified' : 'in_progress';

        const dbConn = db.getDb();
        dbConn.prepare(`
            UPDATE coaches 
            SET audit_status = ?, audit_decree = ?
            WHERE id = ?
        `).run(finalStatus, JSON.stringify(decree), coachId);

        state.auditStatus = finalStatus;
        state.auditDecree = decree;
        if (state.metadata && state.metadata.candidate) {
            state.metadata.candidate.currentStanding = decree.standing;
        }
        db.updateCoachState(coachId, state);

        return res.json({
            message: 'تم بنجاح إصدار محضر التدقيق النهائي والاعتماد الرسمي للماستر كوتش!',
            decree,
            auditStatus: finalStatus
        });
    } catch (err) {
        console.error('Error issuing graduation decree:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء إصدار محضر الاعتماد', details: err.message });
    }
});

module.exports = router;
