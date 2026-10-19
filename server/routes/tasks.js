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

// GET /api/tasks
router.get('/', authenticate, (req, res) => {
    try {
        const coachId = resolveCoachId(req);
        if (!coachId) {
            return res.status(400).json({ error: 'تعذر تحديد حساب الكوتش' });
        }

        const state = db.getCoachCompleteState(coachId);
        if (!state) {
            return res.status(404).json({ error: 'بيانات الكوتش غير موجودة' });
        }

        return res.json({ tasks: state.tasks });
    } catch (err) {
        console.error('Error fetching tasks:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء جلب المهام', details: err.message });
    }
});

// GET /api/tasks/:id
router.get('/:id', authenticate, (req, res) => {
    try {
        const coachId = resolveCoachId(req);
        const state = db.getCoachCompleteState(coachId);
        if (!state) {
            return res.status(404).json({ error: 'بيانات الكوتش غير موجودة' });
        }

        const task = state.tasks.find(t => t.id === req.params.id);
        if (!task) {
            return res.status(404).json({ error: 'المهمة المطلوبة غير موجودة' });
        }

        return res.json({ task });
    } catch (err) {
        console.error('Error fetching task:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء جلب تفاصيل المهمة', details: err.message });
    }
});

// PUT /api/tasks/:id/reflection (Update 4-part reflection)
router.put('/:id/reflection', authenticate, (req, res) => {
    try {
        const coachId = resolveCoachId(req);
        const { whatDidIDo, why, impact, whatWillIChange } = req.body;

        const state = db.getCoachCompleteState(coachId);
        if (!state) return res.status(404).json({ error: 'بيانات الكوتش غير موجودة' });

        const task = state.tasks.find(t => t.id === req.params.id);
        if (!task) return res.status(404).json({ error: 'المهمة غير موجودة' });

        if (!task.reflection) task.reflection = {};
        if (whatDidIDo !== undefined) task.reflection.whatDidIDo = whatDidIDo;
        if (why !== undefined) task.reflection.why = why;
        if (impact !== undefined) task.reflection.impact = impact;
        if (whatWillIChange !== undefined) task.reflection.whatWillIChange = whatWillIChange;

        const dbConn = db.getDb();
        const now = new Date().toISOString();

        dbConn.prepare(`
            UPDATE tasks 
            SET reflection_json = ?, updated_at = ?
            WHERE id = ? AND coach_id = ?
        `).run(JSON.stringify(task.reflection), now, task.id, coachId);

        db.updateCoachState(coachId, state);

        return res.json({
            message: 'تم حفظ استمارة التأمل المهني الرباعية بنجاح',
            task
        });
    } catch (err) {
        console.error('Error saving reflection:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء حفظ التأمل', details: err.message });
    }
});

// POST /api/tasks/:id/submit (Coach submits or resubmits task)
router.post('/:id/submit', authenticate, (req, res) => {
    try {
        const coachId = resolveCoachId(req);
        const state = db.getCoachCompleteState(coachId);
        if (!state) return res.status(404).json({ error: 'بيانات الكوتش غير موجودة' });

        const task = state.tasks.find(t => t.id === req.params.id);
        if (!task) return res.status(404).json({ error: 'المهمة غير موجودة' });

        const prevStatus = task.status;
        task.status = 'submitted';

        // Version bump logic
        const versionNum = parseInt(task.version.replace(/[^0-9]/g, '') || '10', 10);
        const newMajor = Math.floor(versionNum / 10) + 1;
        task.version = `v${newMajor}.0`;

        if (!Array.isArray(task.history)) task.history = [];
        task.history.push({
            version: task.version,
            date: new Date().toISOString().split('T')[0],
            status: 'submitted',
            note: prevStatus === 'revision_required' 
                ? 'إعادة تسليم المهمة بعد معالجة ملاحظات المشرف واستيفاء الأدلة المطلوبة.'
                : 'تسليم المهمة والأدلة للاعتماد والتقييم بالروبرك.'
        });

        const dbConn = db.getDb();
        const now = new Date().toISOString();

        dbConn.prepare(`
            UPDATE tasks 
            SET status = 'submitted', version = ?, updated_at = ?
            WHERE id = ? AND coach_id = ?
        `).run(task.version, now, task.id, coachId);

        db.updateCoachState(coachId, state);

        return res.json({
            message: 'تم تسليم المهمة بنجاح للمشرف المعتمد للتدقيق والتقييم',
            task
        });
    } catch (err) {
        console.error('Error submitting task:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء تسليم المهمة', details: err.message });
    }
});

// POST /api/tasks/:id/evaluate (Admin/Supervisor evaluates task)
router.post('/:id/evaluate', authenticate, requireRole('admin'), (req, res) => {
    try {
        const { coachId, status, grade, notes, audioFeedbackUrl } = req.body;

        if (!coachId) {
            return res.status(400).json({ error: 'معرف الكوتش مطلوب لتقييم المهمة' });
        }

        if (!status || !['approved', 'revision_required'].includes(status)) {
            return res.status(400).json({ error: 'حالة التقييم غير صحيحة (مطلوب: approved أو revision_required)' });
        }

        const state = db.getCoachCompleteState(coachId);
        if (!state) return res.status(404).json({ error: 'بيانات الكوتش غير موجودة' });

        const task = state.tasks.find(t => t.id === req.params.id);
        if (!task) return res.status(404).json({ error: 'المهمة غير موجودة' });

        const parsedGrade = grade !== undefined ? parseFloat(grade) : (task.supervisorFeedback ? task.supervisorFeedback.grade : 5.0);
        if (isNaN(parsedGrade) || parsedGrade < 1 || parsedGrade > 5) {
            return res.status(400).json({ error: 'الدرجة يجب أن تكون بين 1.0 و 5.0' });
        }

        task.status = status;
        task.supervisorFeedback = {
            grade: parsedGrade,
            notes: notes || (task.supervisorFeedback ? task.supervisorFeedback.notes : ''),
            audioUrl: audioFeedbackUrl || (task.supervisorFeedback ? task.supervisorFeedback.audioUrl : '')
        };

        let newVer = task.version || (status === 'approved' ? 'v2.1' : 'v1.2');
        task.version = newVer;

        if (!Array.isArray(task.history)) task.history = [];
        task.history.push({
            version: newVer,
            date: new Date().toISOString().split('T')[0],
            status,
            note: status === 'approved'
                ? `تم الاعتماد الرسمي للدرجة (${parsedGrade}/5.00) والموافقة على الأدلة.`
                : `تم طلب استكمال أدلة التحسين: ${notes || 'يرجى مراجعة الملاحظات'}`
        });

        const dbConn = db.getDb();
        const now = new Date().toISOString();

        dbConn.prepare(`
            UPDATE tasks 
            SET status = ?, version = ?, grade = ?, supervisor_notes = ?, audio_feedback_url = ?, updated_at = ?
            WHERE id = ? AND coach_id = ?
        `).run(status, newVer, parsedGrade, task.supervisorFeedback.notes, task.supervisorFeedback.audioUrl, now, task.id, coachId);

        // Record supervisor feedback log
        dbConn.prepare(`
            INSERT INTO supervisor_feedbacks (coach_id, task_id, audio_file_path, text_notes, grade, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(coachId, task.id, task.supervisorFeedback.audioUrl, task.supervisorFeedback.notes, parsedGrade, now);

        db.updateCoachState(coachId, state);

        // Create supervisory notification for coach and push via WebSocket
        try {
            const coachRow = dbConn.prepare('SELECT user_id FROM coaches WHERE id = ?').get(coachId);
            if (coachRow && coachRow.user_id) {
                const notifType = task.supervisorFeedback.audioUrl ? 'voice_note' : 'task_review';
                const notifTitle = status === 'approved' 
                    ? `اعتماد المهمة [${task.id}]: ${task.title || ''}`
                    : `ملاحظات تعديل إشرافية على المهمة [${task.id}]: ${task.title || ''}`;
                const notifMsg = task.supervisorFeedback.notes || (status === 'approved' ? `تم اعتماد المهمة بنجاح بدرجة (${parsedGrade}/5.0)` : 'تم طلب استكمال أدلة التحسين');

                const notif = db.createNotification({
                    userId: coachRow.user_id,
                    type: notifType,
                    title: notifTitle,
                    message: notifMsg,
                    linkTab: 'tasks',
                    linkId: task.id,
                    linkAction: `task:${task.id}`,
                    metadata: { taskId: task.id, status, grade: parsedGrade }
                });
                broadcastNotificationViaWS(coachRow.user_id, notif);
            }
        } catch (_) {}

        return res.json({
            message: status === 'approved' ? 'تم اعتماد المهمة بنجاح ورصد التقييم' : 'تم طلب التعديل وإرسال الملاحظات للمشارك',
            task
        });
    } catch (err) {
        console.error('Error evaluating task:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء تقييم المهمة', details: err.message });
    }
});

module.exports = router;
