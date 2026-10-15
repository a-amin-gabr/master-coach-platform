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

// GET /api/ethics
router.get('/', authenticate, (req, res) => {
    try {
        const coachId = resolveCoachId(req);
        if (!coachId) return res.status(400).json({ error: 'تعذر تحديد حساب الكوتش' });

        const state = db.getCoachCompleteState(coachId);
        if (!state) return res.status(404).json({ error: 'بيانات الكوتش غير موجودة' });

        return res.json({ ethicsGate: state.ethicsGate });
    } catch (err) {
        console.error('Error fetching ethics gate:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء جلب بيانات البوابة الأخلاقية', details: err.message });
    }
});

// POST /api/ethics/toggle (Admin toggles checkpoint verification status)
router.post('/toggle', authenticate, requireRole('admin'), (req, res) => {
    try {
        const coachId = req.body.coachId;
        const checkpointId = req.body.checkpointId || req.body.cpId;
        const status = req.body.status;

        if (!coachId || !checkpointId || !status) {
            return res.status(400).json({ error: 'معرف الكوتش ومعرف النقطة والحالة مطلوبة' });
        }

        if (!['passed', 'flagged', 'pending', 'verified'].includes(status)) {
            return res.status(400).json({ error: 'حالة النقطة الأخلاقية غير صالحة' });
        }

        const state = db.getCoachCompleteState(coachId);
        if (!state) return res.status(404).json({ error: 'بيانات الكوتش غير موجودة' });

        const cp = state.ethicsGate.checkpoints.find(c => c.id === checkpointId);
        if (!cp) return res.status(404).json({ error: 'نقطة التدقيق الأخلاقي غير موجودة' });

        const now = new Date().toISOString();
        cp.status = status;
        cp.clearedBy = status === 'passed' || status === 'verified' ? (req.body.clearedBy || req.user.name) : null;
        cp.clearedAt = status === 'passed' || status === 'verified' ? now.split('T')[0] : null;

        const allPassed = state.ethicsGate.checkpoints.every(c => c.status === 'passed' || c.status === 'verified');
        state.ethicsGate.status = allPassed ? 'passed' : 'flagged';

        const dbConn = db.getDb();
        dbConn.prepare(`
            UPDATE ethics_checkpoints
            SET status = ?, cleared_by = ?, cleared_at = ?
            WHERE coach_id = ? AND checkpoint_id = ?
        `).run(status, cp.clearedBy, cp.clearedAt, coachId, checkpointId);

        db.updateCoachState(coachId, state);

        return res.json({
            message: 'تم تحديث حالة نقطة التدقيق الأخلاقي بنجاح',
            checkpoint: cp,
            gateStatus: state.ethicsGate.status
        });
    } catch (err) {
        console.error('Error toggling ethics checkpoint:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء تعديل نقطة التدقيق الأخلاقي', details: err.message });
    }
});

// POST /api/ethics/referrals (Register specialized ethical referral)
router.post('/referrals', authenticate, (req, res) => {
    try {
        const coachId = resolveCoachId(req);
        if (!coachId) return res.status(400).json({ error: 'تعذر تحديد حساب الكوتش' });

        const { beneficiaryCode, observedSymptoms, actionTaken, referredTo, detectionDate } = req.body;

        if (!beneficiaryCode || !observedSymptoms || !referredTo) {
            return res.status(400).json({ error: 'رمز المستفيد، الأعراض المرصودة، والجهة المحال إليها مطلوبة' });
        }

        const state = db.getCoachCompleteState(coachId);
        if (!state) return res.status(404).json({ error: 'بيانات الكوتش غير موجودة' });

        const dbConn = db.getDb();
        const now = new Date().toISOString();

        const countRow = dbConn.prepare('SELECT COUNT(*) as count FROM ethics_referrals WHERE coach_id = ?').get(coachId);
        const refSeq = String((countRow.count || 0) + 1).padStart(2, '0');
        const caseRef = `REF-2026-${refSeq}`;
        const refDate = detectionDate || now.split('T')[0];

        dbConn.prepare(`
            INSERT INTO ethics_referrals (
                coach_id, case_ref, beneficiary_code, detection_date, observed_symptoms, action_taken, referred_to, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'مغلقة ومحالة بأمان وفق الميثاق المهني', ?)
        `).run(
            coachId,
            caseRef,
            beneficiaryCode.trim().toUpperCase(),
            refDate,
            observedSymptoms.trim(),
            actionTaken ? actionTaken.trim() : 'إنهاء جلسة الكوتشنج فوراً بأسلوب رحيم وتفعيل بروتوكول الإحالة الطبية المعتمد',
            referredTo.trim(),
            now
        );

        const newReferral = {
            caseRef,
            beneficiaryCode: beneficiaryCode.trim().toUpperCase(),
            detectionDate: refDate,
            observedSymptoms: observedSymptoms.trim(),
            actionTaken: actionTaken || 'إنهاء جلسة الكوتشنج فوراً بأسلوب رحيم وتفعيل بروتوكول الإحالة الطبية المعتمد',
            referredTo: referredTo.trim(),
            status: 'مغلقة ومحالة بأمان وفق الميثاق المهني'
        };

        if (!state.ethicsGate) state.ethicsGate = {};
        if (!Array.isArray(state.ethicsGate.referralRegistry)) state.ethicsGate.referralRegistry = [];
        state.ethicsGate.referralRegistry.push(newReferral);

        db.updateCoachState(coachId, state);

        return res.status(201).json({
            message: 'تم تسجيل الإحالة التخصصية وتوثيق الالتزام بحدود الممارسة المهنية بنجاح',
            referral: newReferral
        });
    } catch (err) {
        console.error('Error adding referral:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء تسجيل الإحالة', details: err.message });
    }
});

module.exports = router;
