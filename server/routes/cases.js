const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticate } = require('../middleware/auth');

function resolveCoachId(req) {
    if (req.user.role === 'admin') {
        const queryId = (req.query && req.query.coachId) || (req.body && req.body.coachId);
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

// POST /api/cases (Register a new field case)
router.post('/', authenticate, (req, res) => {
    try {
        const coachId = resolveCoachId(req);
        if (!coachId) return res.status(400).json({ error: 'تعذر تحديد حساب الكوتش' });

        const state = db.getCoachCompleteState(coachId);
        if (!state) return res.status(404).json({ error: 'بيانات الكوتش غير موجودة' });

        const { code, title, sessionsCount, totalMinutes, models, notes, isAnonymous } = req.body;
        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'عنوان وموضوع الحالة الميدانية مطلوب' });
        }

        if (isAnonymous === false || isAnonymous === 'false') {
            return res.status(400).json({ error: 'يجب الالتزام بنزع الهوية الرقمية للمستفيد وحفظ الخصوصية' });
        }

        if (!Array.isArray(state.cases)) state.cases = [];

        const nextId = state.cases.length > 0 
            ? Math.max(...state.cases.map(c => parseInt(c.id, 10) || 0)) + 1 
            : 1;

        const newCase = {
            id: nextId,
            code: code && code.trim() ? code.trim().toUpperCase() : `CAS-${nextId.toString().padStart(2, '0')}`,
            title: title.trim(),
            sessionsCount: parseInt(sessionsCount, 10) || 1,
            totalMinutes: parseInt(totalMinutes, 10) || 60,
            models: Array.isArray(models) ? models : (typeof models === 'string' && models ? models.split(',').map(m => m.trim()) : ['نموذج GROW']),
            status: req.body.status || 'closed',
            notes: notes || 'تم استيفاء متطلبات الحالة ونزع الهوية وتوثيق المخرجات.',
            diagnosticSummary: req.body.diagnosticSummary || 'تشخيص كوتشنجي شامل وتحديد الأهداف ونقاط القوة.',
            outcomeEvaluation: req.body.outcomeEvaluation || 'تحقيق نتائج ملموسة بنسبة 100% وتحسن مؤشرات الأداء.',
            reflectionNote: req.body.reflectionNote || 'تطبيق النماذج المعتمدة والالتزام بالسرية التامة.',
            isAnonymous: true,
            createdAt: new Date().toISOString()
        };

        state.cases.push(newCase);
        db.updateCoachState(coachId, state);

        return res.status(201).json({
            message: 'تم توثيق الحالة الميدانية بنجاح',
            case: newCase,
            totalCases: state.cases.length
        });
    } catch (err) {
        console.error('Error creating case:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء حفظ الحالة الميدانية', details: err.message });
    }
});

// POST /api/cases/sessions (Log a new field session)
router.post('/sessions', authenticate, (req, res) => {
    try {
        const coachId = resolveCoachId(req);
        if (!coachId) return res.status(400).json({ error: 'تعذر تحديد حساب الكوتش' });

        const state = db.getCoachCompleteState(coachId);
        if (!state) return res.status(404).json({ error: 'بيانات الكوتش غير موجودة' });

        const { caseCode, date, duration, focus, rubricsScore, supervisorNotes, isAnonymous } = req.body;
        if (!focus || !focus.trim()) {
            return res.status(400).json({ error: 'محور وتركيز الجلسة الميدانية مطلوب' });
        }

        if (isAnonymous === false || isAnonymous === 'false') {
            return res.status(400).json({ error: 'يجب الالتزام بنزع الهوية الرقمية للمستفيد وحفظ الخصوصية' });
        }

        if (!Array.isArray(state.sessions)) state.sessions = [];

        const nextId = state.sessions.length > 0 
            ? Math.max(...state.sessions.map(s => parseInt(s.id, 10) || 0)) + 1 
            : 1;

        const newSession = {
            id: nextId,
            caseCode: caseCode || (state.cases && state.cases[0] ? state.cases[0].code : 'CAS-01'),
            date: date || new Date().toISOString().split('T')[0],
            duration: parseInt(duration, 10) || 50,
            focus: focus.trim(),
            rubricsScore: parseFloat(rubricsScore) || 5.0,
            supervisorNotes: supervisorNotes || 'جلسة متقنة تم فيها استيفاء المعايير والكفايات الميدانية.',
            status: 'approved',
            isAnonymous: true,
            createdAt: new Date().toISOString()
        };

        state.sessions.push(newSession);
        db.updateCoachState(coachId, state);

        return res.status(201).json({
            message: 'تم توثيق الجلسة الميدانية بنجاح',
            session: newSession,
            totalSessions: state.sessions.length
        });
    } catch (err) {
        console.error('Error creating session:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء حفظ الجلسة الميدانية', details: err.message });
    }
});

module.exports = router;
