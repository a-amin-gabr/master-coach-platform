const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticate } = require('../middleware/auth');

function resolveCoachId(req) {
    if (req.user.role === 'admin') {
        const queryId = req.query.coachId || req.body.coachId;
        return queryId ? parseInt(queryId, 10) : 1;
    }
    return req.coach ? req.coach.id : null;
}

// GET /api/cases (List all 20 integrated field cases)
router.get('/', authenticate, (req, res) => {
    try {
        const coachId = resolveCoachId(req);
        if (!coachId) return res.status(400).json({ error: 'تعذر تحديد حساب الكوتش' });

        const state = db.getCoachCompleteState(coachId);
        if (!state) return res.status(404).json({ error: 'بيانات الكوتش غير موجودة' });

        const cases = state.cases || [];
        return res.json({
            total: cases.length,
            target: 20,
            isComplete: cases.length >= 20,
            cases
        });
    } catch (err) {
        console.error('Error fetching cases:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء جلب الحالات الميدانية', details: err.message });
    }
});

// GET /api/cases/:id (Get single case details with linked sessions)
router.get('/:id', authenticate, (req, res) => {
    try {
        const coachId = resolveCoachId(req);
        if (!coachId) return res.status(400).json({ error: 'تعذر تحديد حساب الكوتش' });

        const state = db.getCoachCompleteState(coachId);
        if (!state) return res.status(404).json({ error: 'بيانات الكوتش غير موجودة' });

        const caseItem = (state.cases || []).find(c => c.id === req.params.id || c.code === req.params.id);
        if (!caseItem) {
            return res.status(404).json({ error: 'الحالة الميدانية المطلوبة غير موجودة' });
        }

        const linkedSessions = (state.sessions || []).filter(s => s.caseCode === caseItem.code);

        return res.json({
            case: caseItem,
            sessions: linkedSessions
        });
    } catch (err) {
        console.error('Error fetching case detail:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء جلب تفاصيل الحالة', details: err.message });
    }
});

module.exports = router;
