const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const db = require('../database');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');

// POST /api/uploads (Multipart file upload with robust validation & clean error handling)
router.post('/', authenticate, (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    error: 'حجم الملف يتجاوز الحد الأقصى المسموح به (50 ميجابايت)',
                    code: 'FILE_TOO_LARGE'
                });
            }
            return res.status(400).json({
                error: err.message || 'نوع الملف غير مدعوم أو تالف',
                code: 'INVALID_FILE_TYPE'
            });
        }
        next();
    });
}, (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'لم يتم استلام أي ملف للرفع' });
        }

        const { taskId, type, name, isAnonymous } = req.body;

        if (!taskId) {
            if (req.file && req.file.path && fs.existsSync(req.file.path)) {
                try { fs.unlinkSync(req.file.path); } catch (_) {}
            }
            return res.status(400).json({ error: 'معرف المهمة المرتبطة بالدليل مطلوب' });
        }

        // Must declare anonymization compliance
        if (isAnonymous !== 'true' && isAnonymous !== '1' && isAnonymous !== true) {
            if (req.file && req.file.path && fs.existsSync(req.file.path)) {
                try { fs.unlinkSync(req.file.path); } catch (_) {}
            }
            return res.status(400).json({
                error: 'تنبيه نظام النزاهة: يجب الإقرار بنزع الهوية الرقمية للمستفيد وحماية الخصوصية قبل رفع أي دليل'
            });
        }

        let coachId = null;
        if (req.user.role === 'admin') {
            coachId = req.body.coachId ? parseInt(req.body.coachId, 10) : 1;
        } else {
            coachId = req.coach ? req.coach.id : null;
        }

        if (!coachId) {
            if (req.file && req.file.path && fs.existsSync(req.file.path)) {
                try { fs.unlinkSync(req.file.path); } catch (_) {}
            }
            return res.status(400).json({ error: 'تعذر تحديد حساب الكوتش' });
        }

        const state = db.getCoachCompleteState(coachId);
        if (!state) {
            if (req.file && req.file.path && fs.existsSync(req.file.path)) {
                try { fs.unlinkSync(req.file.path); } catch (_) {}
            }
            return res.status(404).json({ error: 'بيانات الكوتش غير موجودة' });
        }

        const task = state.tasks.find(t => t.id === taskId);
        if (!task) {
            if (req.file && req.file.path && fs.existsSync(req.file.path)) {
                try { fs.unlinkSync(req.file.path); } catch (_) {}
            }
            return res.status(404).json({ error: 'المهمة المطلوبة غير موجودة' });
        }

        const fileUrl = `/uploads/${req.file.filename}`;
        const evidenceType = type || (req.file.mimetype.startsWith('audio') ? 'audio' : 'document');
        const displayName = name && name.trim() ? name.trim() : req.file.originalname;

        const dbConn = db.getDb();
        const now = new Date().toISOString();

        const insertRes = dbConn.prepare(`
            INSERT INTO evidences (
                task_id, coach_id, name, original_name, file_path, file_url, 
                mime_type, size_bytes, type, pages, duration, is_anonymous, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
        `).run(
            taskId,
            coachId,
            displayName,
            req.file.originalname,
            req.file.path,
            fileUrl,
            req.file.mimetype,
            req.file.size,
            evidenceType,
            evidenceType === 'document' ? 4 : null,
            evidenceType === 'audio' ? '15:30' : null,
            now
        );

        const newEvidence = {
            id: insertRes.lastInsertRowid,
            name: displayName,
            originalName: req.file.originalname,
            fileUrl,
            filePath: req.file.path,
            type: evidenceType,
            sizeBytes: req.file.size,
            mimeType: req.file.mimetype,
            pages: evidenceType === 'document' ? 4 : undefined,
            duration: evidenceType === 'audio' ? '15:30' : undefined,
            isAnonymous: true,
            createdAt: now
        };

        if (!Array.isArray(task.evidences)) task.evidences = [];
        task.evidences.push(newEvidence);

        // Version bump minor: v1.0 -> v1.1
        const parts = task.version.split('.');
        const minor = parseInt(parts[1] || '0', 10) + 1;
        task.version = `${parts[0]}.${minor}`;

        if (!Array.isArray(task.history)) task.history = [];
        task.history.push({
            version: task.version,
            date: now.split('T')[0],
            status: task.status,
            note: `إيداع دليل ثبوتي جديد: ${displayName}`
        });

        dbConn.prepare(`
            UPDATE tasks SET version = ?, updated_at = ? WHERE id = ? AND coach_id = ?
        `).run(task.version, now, task.id, coachId);

        db.updateCoachState(coachId, state);

        return res.status(201).json({
            message: 'تم إيداع الدليل الرقمي بنجاح وتوثيق نزع الهوية الرقمية',
            evidence: newEvidence,
            task
        });
    } catch (err) {
        console.error('Error uploading evidence:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء رفع الدليل', details: err.message });
    }
});

module.exports = router;
