const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticate, requireRole } = require('../middleware/auth');

// GET /api/coaches (Admin only: list all registered coaches)
router.get('/', authenticate, requireRole('admin'), (req, res) => {
    try {
        const coaches = db.getAllCoaches();
        return res.json({ coaches });
    } catch (err) {
        console.error('Error fetching coaches:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء جلب قائمة الكوتشز', details: err.message });
    }
});

// GET /api/coaches/:id (Get full dossier of a specific coach)
router.get('/:id', authenticate, (req, res) => {
    try {
        const coachId = parseInt(req.params.id, 10);
        if (isNaN(coachId)) {
            return res.status(400).json({ error: 'معرف الكوتش غير صالح' });
        }

        // Access check: only admin or the coach themself
        if (req.user.role === 'coach' && (!req.coach || req.coach.id !== coachId)) {
            return res.status(403).json({ error: 'غير مصرح لك باستعراض ملف كوتش آخر' });
        }

        const coachData = db.getCoachCompleteState(coachId);
        if (!coachData) {
            return res.status(404).json({ error: 'ملف الكوتش غير موجود' });
        }

        return res.json({ coach: coachData });
    } catch (err) {
        console.error('Error fetching coach details:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء جلب تفاصيل الكوتش', details: err.message });
    }
});

module.exports = router;
