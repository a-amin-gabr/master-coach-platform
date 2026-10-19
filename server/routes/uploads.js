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
                    error: 'حجم الملف يتجاوز الحد الأقصى المسموح به (100 ميجابايت)',
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

        let { taskId, type, name, isAnonymous, section, topic, duration, beneficiaryCode, reflection } = req.body;

        // Auto-resolve taskId based on section or mime type if not explicitly passed
        if (!taskId) {
            if (section === 'recording' || (req.file.mimetype && req.file.mimetype.startsWith('audio')) || topic) {
                taskId = 'TASK-06';
            } else if (section === 'research') {
                taskId = 'TASK-05';
            } else if (section === 'graduation') {
                taskId = 'TASK-07';
            } else if (section === 'org') {
                taskId = 'TASK-04';
            } else if (section === 'model') {
                taskId = 'TASK-03';
            } else if (section === 'tools') {
                taskId = 'TASK-01';
            } else if (section === 'cases' || section === 'sessions') {
                taskId = 'TASK-02';
            }
        }

        if (!taskId) {
            if (req.file && req.file.path && fs.existsSync(req.file.path)) {
                try { fs.unlinkSync(req.file.path); } catch (_) {}
            }
            return res.status(400).json({ error: 'معرف المهمة أو القسم المرتبط بالدليل مطلوب' });
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
        const isAudio = (req.file.mimetype && req.file.mimetype.startsWith('audio')) || section === 'recording' || type === 'audio';
        const evidenceType = type || (isAudio ? 'audio' : 'document');
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
            isAudio ? (duration || '48:30') : null,
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
            duration: isAudio ? (duration || '48:30') : undefined,
            isAnonymous: true,
            createdAt: now
        };

        if (!Array.isArray(task.evidences)) task.evidences = [];
        task.evidences.push(newEvidence);

        // Version bump minor: v1.0 -> v1.1
        const parts = (task.version || 'v1.0').split('.');
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

        // If recording / audio upload: also persist to professionalRecordings in state
        let createdRecording = null;
        if (isAudio || taskId === 'TASK-06' || section === 'recording') {
            if (!Array.isArray(state.professionalRecordings)) {
                state.professionalRecordings = [];
            }
            const nextRecId = state.professionalRecordings.length > 0
                ? Math.max(...state.professionalRecordings.map(r => parseInt(r.id, 10) || 0)) + 1
                : 1;

            createdRecording = {
                id: nextRecId,
                title: displayName || `التسجيل ${nextRecId}: ${topic || 'كوتشنج متقدم'}`,
                topic: topic || 'كوتشنج القيادة التنفيذية وإدارة التغيير المؤسسي',
                duration: duration || '48:30',
                fileUrl,
                filePath: req.file.path,
                audioSimulatorId: `rec_${nextRecId}`,
                beneficiaryCode: beneficiaryCode || `BEN-REC-${nextRecId.toString().padStart(2, '0')}`,
                supervisorNotes: 'تم إيداع التسجيل الصوتي بنجاح وهو قيد المراجعة الإشرافية وربط الطوابع الزمنية بالروبرك.',
                timestamps: [
                    { time: '02:30', note: 'الافتتاح وتأطير أهداف الجلسة والالتزام بالسرية التامة ونزع الهوية.' },
                    { time: '16:40', note: 'سؤال تعميق الوعي واستدعاء استبصار المستفيد.' },
                    { time: '35:20', note: 'صياغة خطة العمل ومؤشرات الأداء المتفق عليها مع المستفيد.' }
                ],
                appliedImprovement: reflection || 'الالتزام بميثاق الكوتشنج، خفض نسبة المقاطعة، وتطبيق مهارة الصمت الاستراتيجي.',
                status: 'submitted',
                createdAt: now
            };

            state.professionalRecordings.push(createdRecording);
        }

        db.updateCoachState(coachId, state);

        return res.status(201).json({
            message: 'تم إيداع الدليل الرقمي بنجاح وتوثيق نزع الهوية الرقمية',
            evidence: newEvidence,
            recording: createdRecording,
            task,
            file: {
                path: fileUrl,
                filename: req.file.filename,
                mimetype: req.file.mimetype,
                size: req.file.size
            },
            professionalRecordingsCount: state.professionalRecordings ? state.professionalRecordings.length : 0
        });
    } catch (err) {
        console.error('Error uploading evidence:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء رفع الدليل', details: err.message });
    }
});

module.exports = router;
