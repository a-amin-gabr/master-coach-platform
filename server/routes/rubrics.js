const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticate, requireRole } = require('../middleware/auth');
const { broadcastNotificationViaWS } = require('../websocket');

function resolveCoachId(req) {
    if (req.user.role === 'admin') {
        const queryId = (req.query && req.query.coachId) || (req.body && req.body.coachId);
        return queryId ? parseInt(queryId, 10) : 1;
    }
    return req.coach ? req.coach.id : null;
}

// GET /api/rubrics
router.get('/', authenticate, (req, res) => {
    try {
        const coachId = resolveCoachId(req);
        if (!coachId) return res.status(400).json({ error: 'تعذر تحديد حساب الكوتش' });

        const state = db.getCoachCompleteState(coachId);
        if (!state) return res.status(404).json({ error: 'بيانات الكوتش غير موجودة' });

        return res.json({ rubrics: state.rubrics });
    } catch (err) {
        console.error('Error fetching rubrics:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء جلب الروبركات', details: err.message });
    }
});

// POST /api/rubrics/evaluate (Admin/Supervisor updates rubric criterion evaluation or batch criteria)
router.post('/evaluate', authenticate, requireRole('admin'), (req, res) => {
    try {
        const { coachId, rubricCode, criterionId, level, evidenceNote, notes, requiredImprovement, criteria } = req.body;

        if (!coachId) return res.status(400).json({ error: 'معرف الكوتش مطلوب' });
        if (!rubricCode) return res.status(400).json({ error: 'معرف الروبرك مطلوب' });

        const state = db.getCoachCompleteState(coachId);
        if (!state) return res.status(404).json({ error: 'بيانات الكوتش غير موجودة' });

        const rubric = state.rubrics.find(r => r.code === rubricCode);
        if (!rubric) return res.status(404).json({ error: 'الروبرك غير موجود' });

        const dbConn = db.getDb();
        const now = new Date().toISOString();

        // Support Batch evaluation if 'criteria' object is passed: { 'R1-C1': 4, 'R1-C2': 5 }
        if (criteria && typeof criteria === 'object' && !criterionId) {
            let hasBlockerInBatch = false;
            Object.keys(criteria).forEach(cId => {
                const targetCrit = rubric.criteria.find(c => c.id === cId);
                if (targetCrit) {
                    const parsedLvl = parseInt(criteria[cId], 10);
                    if (!isNaN(parsedLvl) && parsedLvl >= 1 && parsedLvl <= 5) {
                        targetCrit.currentLevel = parsedLvl;
                        if (targetCrit.isCritical && parsedLvl < 3) hasBlockerInBatch = true;
                        dbConn.prepare(`
                            INSERT INTO rubrics_evaluations (coach_id, rubric_code, criterion_id, level, evidence_note, notes, required_improvement, updated_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                            ON CONFLICT(coach_id, rubric_code, criterion_id) DO UPDATE SET
                                level = excluded.level,
                                updated_at = excluded.updated_at
                        `).run(coachId, rubricCode, cId, parsedLvl, targetCrit.evidence || '', notes || targetCrit.notes || '', targetCrit.requiredImprovement || '', now);
                    }
                }
            });

            db.updateCoachState(coachId, state);
            const batchWeightedScore = rubric.criteria.reduce((acc, c) => acc + (c.currentLevel * c.weight), 0);
            return res.json({
                message: 'تم بنجاح تحديث حزمة معايير الروبرك وحساب المتوسط المرجح',
                rubricCode,
                rubricWeightedScore: parseFloat(batchWeightedScore.toFixed(2)),
                isCriticalBlocker: hasBlockerInBatch
            });
        }

        // Single Criterion Update
        if (!criterionId) {
            return res.status(400).json({ error: 'معرف المعيار مطلوب' });
        }

        const criterion = rubric.criteria.find(c => c.id === criterionId);
        if (!criterion) return res.status(404).json({ error: 'المعيار غير موجود في هذا الروبرك' });

        let parsedLevel = criterion.currentLevel || 3;
        if (level !== undefined && level !== null) {
            const val = parseInt(level, 10);
            if (isNaN(val) || val < 1 || val > 5) {
                return res.status(400).json({ error: 'مستوى التقييم يجب أن يكون بين 1 و 5' });
            }
            parsedLevel = val;
            criterion.currentLevel = parsedLevel;
        }

        if (evidenceNote !== undefined) criterion.evidence = evidenceNote;
        if (notes !== undefined) criterion.notes = notes;
        if (requiredImprovement !== undefined) criterion.requiredImprovement = requiredImprovement;

        dbConn.prepare(`
            INSERT INTO rubrics_evaluations (coach_id, rubric_code, criterion_id, level, evidence_note, notes, required_improvement, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(coach_id, rubric_code, criterion_id) DO UPDATE SET
                level = excluded.level,
                evidence_note = excluded.evidence_note,
                notes = excluded.notes,
                required_improvement = excluded.required_improvement,
                updated_at = excluded.updated_at
        `).run(
            coachId,
            rubricCode,
            criterionId,
            parsedLevel,
            criterion.evidence || '',
            criterion.notes || '',
            criterion.requiredImprovement || '',
            now
        );

        db.updateCoachState(coachId, state);

        // Calculate rubric weighted average
        const rubricWeightedScore = rubric.criteria.reduce((acc, c) => acc + (c.currentLevel * c.weight), 0);

        // Check if critical blocker triggered
        const isCriticalBlocker = (criterion.isCritical && parsedLevel < 3);

        // Create supervisory notification for coach and push via WebSocket
        try {
            const coachRow = dbConn.prepare('SELECT user_id FROM coaches WHERE id = ?').get(coachId);
            if (coachRow && coachRow.user_id) {
                const notifType = isCriticalBlocker ? 'ethics_alert' : 'rubric_eval';
                const notifTitle = isCriticalBlocker
                    ? `تنبيه حظر أخلاقي حاسم: ${criterion.name}`
                    : `تحديث تقييم الروبرك: ${rubric.title} (${parsedLevel}/5)`;
                const notifMsg = isCriticalBlocker
                    ? `المعيار (${criterion.name}) معيار حرج لا يقبل التعويض. المستوى الحالي (${parsedLevel}/5) يتطلب معالجة عاجلة.`
                    : (criterion.notes || `تم تحديث تقييم المعيار (${criterion.name}) إلى المستوى ${parsedLevel}.`);

                const notif = db.createNotification({
                    userId: coachRow.user_id,
                    type: notifType,
                    title: notifTitle,
                    message: notifMsg,
                    linkTab: 'rubrics',
                    linkId: criterion.id,
                    linkAction: `rubric:${rubricCode}`,
                    metadata: { rubricCode, criterionId, level: parsedLevel, isCriticalBlocker }
                });
                broadcastNotificationViaWS(coachRow.user_id, notif);
            }
        } catch (_) {}

        return res.json({
            message: isCriticalBlocker
                ? 'تنبيه: تم رصد التقييم ولكن تم تفعيل الحظر الأخلاقي الحاسم لهبوط المعيار الحرج دون المستوى 3'
                : 'تم رصد تقييم المعيار وحساب المتوسط المرجح بنجاح',
            criterion,
            rubricWeightedScore: parseFloat(rubricWeightedScore.toFixed(2)),
            isCriticalBlocker,
            blockerNotice: isCriticalBlocker
                ? `المعيار (${criterion.name}) معيار حرج لا يقبل التعويض. المستوى الحالي (${parsedLevel}/5) يمنع التوصية بالاعتماد حتى يتم التحسين.`
                : null
        });
    } catch (err) {
        console.error('Error evaluating rubric:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء رصد تقييم الروبرك', details: err.message });
    }
});

module.exports = router;
