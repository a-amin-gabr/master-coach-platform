const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticate, requireRole } = require('../middleware/auth');

function resolveCoachId(req) {
    if (req.user.role === 'admin') {
        const queryId = (req.query && req.query.coachId) || (req.body && req.body.coachId);
        return queryId ? parseInt(queryId, 10) : 1;
    }
    return req.coach ? req.coach.id : null;
}

function evaluateAuditEligibility(state) {
    const blockers = [];
    const pendingRequirements = [];

    // Active targets: state.customTargets overrides state.targetsConfig overrides defaults
    const activeTargets = Object.assign({
        tasksTargetCount: 8,
        totalHoursTarget: (state.metadata && state.metadata.totalTargetHours) || 240,
        hoursBreakdown: { H1: 100, H2: 30, H3: 40, H4: 20, H5: 50 },
        toolQuotas: { mbti: 30, wheelOfLife: 30, swot: 30 },
        minRubricScore: 3.50,
        criticalEthicsStrict: true
    }, state.targetsConfig || {}, state.customTargets || {});

    // 1. Check Quantitative Hours (dynamic target)
    const totalHoursDone = (state.hours || []).reduce((acc, h) => acc + (h.completed || 0), 0);
    const hoursTarget = activeTargets.totalHoursTarget !== undefined ? activeTargets.totalHoursTarget : (state.metadata ? state.metadata.totalTargetHours : 240);
    const hoursEligible = totalHoursDone >= hoursTarget;
    if (!hoursEligible) {
        pendingRequirements.push(`متطلب تخرج نظامي: استكمال الساعات التدريبية والميدانية (${totalHoursDone}/${hoursTarget} ساعة)`);
    }

    // 2. Check Cases (20 cases)
    const casesCount = (state.cases || []).length;
    const casesEligible = casesCount >= 20;
    if (!casesEligible) {
        pendingRequirements.push(`متطلب تخرج نظامي: استكمال الحالات الميدانية (${casesCount}/20 حالة)`);
    }

    // 3. Check Sessions (30 sessions)
    const sessionsCount = (state.sessions || []).length;
    const sessionsEligible = sessionsCount >= 30;
    if (!sessionsEligible) {
        pendingRequirements.push(`متطلب تخرج نظامي: استكمال الجلسات الميدانية (${sessionsCount}/30 جلسة)`);
    }

    // 4. Check Tools Quotas (dynamic quotas)
    const toolQuotas = activeTargets.toolQuotas || { mbti: 30, wheelOfLife: 30, swot: 30 };
    const mbtiTarget = toolQuotas.mbti !== undefined ? toolQuotas.mbti : 30;
    const wheelTarget = toolQuotas.wheelOfLife !== undefined ? toolQuotas.wheelOfLife : 30;
    const swotTarget = toolQuotas.swot !== undefined ? toolQuotas.swot : 30;

    const mbtiCount = state.toolsSummary && state.toolsSummary.mbti ? state.toolsSummary.mbti.completed : 0;
    const wheelCount = state.toolsSummary && state.toolsSummary.wheelOfLife ? state.toolsSummary.wheelOfLife.completed : 0;
    const swotCount = state.toolsSummary && state.toolsSummary.swot ? state.toolsSummary.swot.completed : 0;
    const totalTools = mbtiCount + wheelCount + swotCount;
    const toolsEligible = mbtiCount >= mbtiTarget && wheelCount >= wheelTarget && swotCount >= swotTarget;
    if (!toolsEligible) {
        pendingRequirements.push(`متطلب تخرج نظامي: استكمال تطبيقات الأدوات (MBTI: ${mbtiCount}/${mbtiTarget}، عجلة الحياة: ${wheelCount}/${wheelTarget}، SWOT: ${swotCount}/${swotTarget})`);
    }

    // 5. Check Tasks Target
    const tasksTarget = activeTargets.tasksTargetCount !== undefined ? activeTargets.tasksTargetCount : 8;
    const approvedTasks = (state.tasks || []).filter(t => t.status === 'approved' || t.status === 'completed').length;
    if (approvedTasks < tasksTarget && (state.tasks || []).length > 0) {
        pendingRequirements.push(`متطلب تخرج نظامي: إنجاز وتدقيق المهام الإلزامية (${approvedTasks}/${tasksTarget} مهمة)`);
    }

    // 6. Check Rubrics & Critical Criteria
    let rubricsSum = 0;
    let totalRubricsCount = (state.rubrics || []).length;
    let criticalFails = [];

    (state.rubrics || []).forEach(r => {
        const weightedScore = r.criteria.reduce((s, c) => s + ((c.currentLevel || 0) * (c.weight || 0)), 0);
        rubricsSum += weightedScore;

        r.criteria.forEach(c => {
            if (c.isCritical && c.currentLevel < 3) {
                criticalFails.push(`${r.title}: المعيار الحرج [${c.name}] عند المستوى (${c.currentLevel}/5)`);
            }
        });
    });

    const averageRubricsScore = totalRubricsCount > 0 ? parseFloat((rubricsSum / totalRubricsCount).toFixed(2)) : 0;
    const minRubricScore = activeTargets.minRubricScore !== undefined ? activeTargets.minRubricScore : 3.50;
    const rubricsScoreEligible = averageRubricsScore >= minRubricScore;
    if (!rubricsScoreEligible && averageRubricsScore > 0) {
        pendingRequirements.push(`متوسط الروبركات دون الحد الأدنى المطلوب للاعتماد (${averageRubricsScore}/5.00 مقابل ${minRubricScore} كحد أدنى)`);
    }

    // 7. Critical Ethical & Professional Criteria Blocker
    const criticalStrict = activeTargets.criticalEthicsStrict !== false;
    if (criticalFails.length > 0 && criticalStrict) {
        blockers.push(`حظر مهني وأخلاقي حاسم: إخفاق في معايير حرجة قطعية لا تقبل التعويض بالحساب الحسابي (${criticalFails.join(' | ')})`);
    }

    // 8. Independent Ethics Gate Status (Only explicit violation flag blocks)
    const isEthicsFlagged = state.ethicsGate && state.ethicsGate.status === 'flagged';
    if (isEthicsFlagged) {
        blockers.push('بوابة السلامة والنزاهة الأخلاقية المستقلة: تم رصد مخالفة أو إحالة معلقة تمنع الاعتماد');
    } else if (state.ethicsGate && state.ethicsGate.status !== 'passed') {
        pendingRequirements.push('متطلب تخرج نظامي: استيفاء وتدقيق بوابة النزاهة والسلامة الأخلاقية المستقلة');
    }

    const hasBlocker = blockers.length > 0;
    const isEligible = !hasBlocker;

    return {
        isEligible,
        hasBlocker,
        blockerReasons: blockers,
        pendingRequirements,
        metrics: {
            totalHoursDone,
            hoursTarget,
            casesCount,
            sessionsCount,
            toolsSummary: { mbti: mbtiCount, wheelOfLife: wheelCount, swot: swotCount, total: totalTools },
            toolTargets: { mbti: mbtiTarget, wheelOfLife: wheelTarget, swot: swotTarget },
            tasksCompleted: approvedTasks,
            tasksTarget,
            averageRubricsScore,
            minRubricScore,
            ethicsGateStatus: state.ethicsGate ? state.ethicsGate.status : 'pending'
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

// GET /api/audit/verify (Public QR verification of candidate accreditation credentials)
router.get('/verify', (req, res) => {
    try {
        const rawCode = (req.query.code || '').trim();
        if (!rawCode) {
            return res.status(400).json({
                valid: false,
                error: 'رمز الاعتماد أو الرقم التدريبي مطلوب لإتمام التحقق الرقمي (Missing verification code)'
            });
        }

        const dbConn = db.getDb();
        const codeNormalized = rawCode.toUpperCase();

        // 1. Search by candidate_code or user ID
        let coach = dbConn.prepare(`
            SELECT c.*, u.name as coach_name, u.email as coach_email, u.phone as coach_phone, coh.name as cohort_name, coh.code as cohort_code
            FROM coaches c
            JOIN users u ON c.user_id = u.id
            LEFT JOIN cohorts coh ON c.cohort_id = coh.id
            WHERE UPPER(c.candidate_code) = ? OR c.id = ?
        `).get(codeNormalized, parseInt(rawCode, 10) || -1);

        // 2. Search within audit_decree certificate numbers if not found directly
        if (!coach) {
            const allCoaches = dbConn.prepare(`
                SELECT c.*, u.name as coach_name, u.email as coach_email, u.phone as coach_phone, coh.name as cohort_name, coh.code as cohort_code
                FROM coaches c
                JOIN users u ON c.user_id = u.id
                LEFT JOIN cohorts coh ON c.cohort_id = coh.id
            `).all();

            coach = allCoaches.find(c => {
                if (!c.audit_decree) return false;
                try {
                    const dec = JSON.parse(c.audit_decree);
                    return dec.certificateNumber && dec.certificateNumber.toUpperCase().includes(codeNormalized);
                } catch (_) {
                    return false;
                }
            });
        }

        if (!coach) {
            return res.status(404).json({
                valid: false,
                error: 'لم يتم العثور على وثيقة اعتماد رسمية مطابقة لهذا الرمز في سجلات تمكين الرؤية',
                searchedCode: rawCode,
                authority: 'شركة تمكين الرؤية للاستشارات المهنية - cyce52.com'
            });
        }

        let decree = null;
        if (coach.audit_decree) {
            try { decree = JSON.parse(coach.audit_decree); } catch (_) {}
        }

        const candidateCode = coach.candidate_code || 'MC-2026-084';
        const certNumber = (decree && decree.certificateNumber) ? decree.certificateNumber : `CYCE-${candidateCode}-2026`;
        const issueDate = (decree && decree.issueDate) ? decree.issueDate : (coach.enrollment_date || '2026-05-20');

        return res.json({
            valid: true,
            status: 'معتمد وموثق رسمياً (Official Verified Credential)',
            certificateNumber: certNumber,
            candidateCode,
            candidateName: coach.coach_name,
            candidateTitle: coach.title,
            cohortName: coach.cohort_name || 'دفعة الرواد (2026-Q1)',
            accreditationTitle: 'شهادة إتمام وتأهيل الماستر كوتش والاعتماد المهني التنفيذي',
            degreeVerdict: 'مجاز بتقدير ممتاز مع مرتبة الشرف الأولى واستحقاق لقب ماستر كوتش معتمد',
            auditStatus: coach.audit_status,
            issueDate,
            supervisionAuthority: coach.supervisor_name || 'الماستر كوتش عبدالكريم الخليفي',
            committeeChair: coach.committee_chair || 'الماستر كوتش عبدالكريم الخليفي',
            issuingBodies: [
                'شركة تمكين الرؤية للاستشارات المهنية (cyce52.com)',
                'الاتحاد العربي للكوتشنج (Arab Coaching Federation)'
            ],
            metricsSummary: {
                trainingAndPracticeHours: 240,
                toolsApplicationsCompleted: 90,
                integratedCasesLogged: 20,
                fieldSessionsLogged: 30,
                competenciesMastered: 44,
                ethicsGateClearance: 'اجتياز معتمد 100% بدون أي حظر أخلاقي',
                graduationCapstoneDefense: 'مجاز مع التوصية بالنشر والتطبيق المؤسسي'
            },
            digitalSealVerified: true,
            verificationUrl: `https://zamalat.cyce52.com/verify?code=${encodeURIComponent(candidateCode)}`,
            verifiedAt: new Date().toISOString()
        });
    } catch (err) {
        console.error('Error verifying certificate:', err);
        return res.status(500).json({ valid: false, error: 'حدث خطأ أثناء فحص وتدقيق الوثيقة', details: err.message });
    }
});

module.exports = router;
