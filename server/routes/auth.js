const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../database');
const { authenticate } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: 'يرجى إدخال البريد الإلكتروني وكلمة المرور'
            });
        }

        const user = db.getUserByEmail(email.trim());
        if (!user) {
            return res.status(401).json({
                error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
            });
        }

        const isMatch = bcrypt.compareSync(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({
                error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
            });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            config.JWT_SECRET,
            { expiresIn: config.JWT_EXPIRES_IN }
        );

        let coachInfo = null;
        if (user.role === 'coach') {
            const coach = db.getCoachByUserId(user.id);
            if (coach) {
                coachInfo = {
                    id: coach.id,
                    candidateCode: coach.candidate_code,
                    title: coach.title,
                    currentStanding: coach.current_standing,
                    auditStatus: coach.audit_status
                };
            }
        }

        return res.json({
            message: 'تم تسجيل الدخول بنجاح',
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                avatar: user.avatar,
                phone: user.phone,
                coach: coachInfo
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: 'حدث خطأ غير متوقع أثناء تسجيل الدخول', details: err.message });
    }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
    let coachInfo = null;
    if (req.user.role === 'coach') {
        const coach = db.getCoachByUserId(req.user.id);
        if (coach) {
            coachInfo = {
                id: coach.id,
                candidateCode: coach.candidate_code,
                title: coach.title,
                currentStanding: coach.current_standing,
                auditStatus: coach.audit_status
            };
        }
    }

    return res.json({
        user: {
            id: req.user.id,
            email: req.user.email,
            name: req.user.name,
            role: req.user.role,
            avatar: req.user.avatar,
            phone: req.user.phone,
            coach: coachInfo
        }
    });
});

// POST /api/auth/register (New Coach Trainee)
router.post('/register', (req, res) => {
    try {
        const { name, email, password, title, phone } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'الاسم والبريد الإلكتروني وكلمة المرور مطلوبة' });
        }

        const existing = db.getUserByEmail(email.trim());
        if (existing) {
            return res.status(400).json({ error: 'البريد الإلكتروني مسجل بالفعل' });
        }

        const dbConn = db.getDb();
        const now = new Date().toISOString();
        const passwordHash = bcrypt.hashSync(password, 10);

        // Generate candidate code
        const countRow = dbConn.prepare('SELECT COUNT(*) as count FROM coaches').get();
        const candidateSeq = String((countRow.count || 0) + 84).padStart(3, '0');
        const candidateCode = `MC-2026-${candidateSeq}`;

        const userRes = dbConn.prepare(`
            INSERT INTO users (email, password_hash, name, role, avatar, phone, created_at)
            VALUES (?, ?, ?, 'coach', 'assets/images/logo.png', ?, ?)
        `).run(email.trim(), passwordHash, name.trim(), phone || '+966 50 000 0000', now);

        const coachRes = dbConn.prepare(`
            INSERT INTO coaches (user_id, candidate_code, title, enrollment_date, supervisor_name, committee_chair, current_standing, audit_status, created_at)
            VALUES (?, ?, ?, ?, 'الماستر كوتش عبدالكريم الخليفي', 'د. عبدالكريم الخليفي', 'مرشح جديد - قيد استكمال متطلبات الحقيبة', 'in_progress', ?)
        `).run(
            userRes.lastInsertRowid,
            candidateCode,
            title || 'كوتش تنفيذي مرشح',
            now.split('T')[0],
            now
        );

        const coachId = coachRes.lastInsertRowid;

        // Clone default program data for new coach
        const ProgramStore = require('../../js/data.js');
        const newCoachData = JSON.parse(JSON.stringify(ProgramStore.DEFAULT_DATA));
        newCoachData.metadata.candidate = {
            id: candidateCode,
            name: name.trim(),
            title: title || 'كوتش تنفيذي مرشح',
            avatar: 'assets/images/logo.png',
            email: email.trim(),
            phone: phone || '+966 50 000 0000',
            enrollmentDate: now.split('T')[0],
            supervisorName: 'الماستر كوتش عبدالكريم الخليفي',
            committeeChair: 'د. عبدالكريم الخليفي',
            currentStanding: 'مرشح جديد - قيد استكمال متطلبات الحقيبة'
        };

        // Initialize tasks as draft for new coach
        newCoachData.tasks.forEach(t => {
            t.status = 'draft';
            t.version = 'v1.0';
            t.evidences = [];
            t.supervisorFeedback = null;
        });
        newCoachData.toolsSummary.mbti.completed = 0;
        newCoachData.toolsSummary.mbti.applications = [];
        newCoachData.toolsSummary.wheelOfLife.completed = 0;
        newCoachData.toolsSummary.wheelOfLife.applications = [];
        newCoachData.toolsSummary.swot.completed = 0;
        newCoachData.toolsSummary.swot.applications = [];

        dbConn.prepare(`
            INSERT INTO coach_program_state (coach_id, state_json, updated_at)
            VALUES (?, ?, ?)
        `).run(coachId, JSON.stringify(newCoachData), now);

        // Seed initial tasks
        const insertTask = dbConn.prepare(`
            INSERT INTO tasks (id, coach_id, title, category, rubric_code, status, version, grade, reflection_json, supervisor_notes, audio_feedback_url, updated_at)
            VALUES (?, ?, ?, ?, ?, 'draft', 'v1.0', null, ?, null, null, ?)
        `);

        newCoachData.tasks.forEach(t => {
            insertTask.run(t.id, coachId, t.title, t.category || '', t.rubricCode || '', JSON.stringify(t.reflection || {}), now);
        });

        // Seed rubrics evaluations
        const insertRubric = dbConn.prepare(`
            INSERT INTO rubrics_evaluations (coach_id, rubric_code, criterion_id, level, evidence_note, notes, required_improvement, updated_at)
            VALUES (?, ?, ?, 3, '', '', 'مطلوب إثبات المعيار بالأدلة العملية', ?)
        `);
        newCoachData.rubrics.forEach(r => {
            r.criteria.forEach(c => {
                insertRubric.run(coachId, r.code, c.id, now);
            });
        });

        // Seed ethics checkpoints
        const insertEthics = dbConn.prepare(`
            INSERT INTO ethics_checkpoints (coach_id, checkpoint_id, title, status, cleared_by, cleared_at)
            VALUES (?, ?, ?, 'pending', null, null)
        `);
        newCoachData.ethicsGate.checkpoints.forEach(cp => {
            insertEthics.run(coachId, cp.id, cp.title);
        });

        // Initialize Chat Channels (Cohort group & direct supervisory channel)
        try {
            db.setupNewCoachChat(userRes.lastInsertRowid, coachId, name.trim());
        } catch (chatErr) {
            console.error('Error setting up chat for new coach:', chatErr);
        }

        const token = jwt.sign(
            { id: userRes.lastInsertRowid, email: email.trim(), role: 'coach' },
            config.JWT_SECRET,
            { expiresIn: config.JWT_EXPIRES_IN }
        );

        return res.status(201).json({
            message: 'تم تسجيل الكوتش الجديد بنجاح في منصة تمكين الرؤية',
            token,
            user: {
                id: userRes.lastInsertRowid,
                email: email.trim(),
                name: name.trim(),
                role: 'coach',
                avatar: 'assets/images/logo.png',
                phone: phone || '',
                coach: {
                    id: coachId,
                    candidateCode,
                    title: title || 'كوتش تنفيذي مرشح',
                    currentStanding: 'مرشح جديد - قيد استكمال متطلبات الحقيبة',
                    auditStatus: 'in_progress'
                }
            }
        });
    } catch (err) {
        console.error('Register error:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء تسجيل الكوتش', details: err.message });
    }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
    return res.json({ success: true, message: 'تم تسجيل الخروج بنجاح' });
});

module.exports = router;
