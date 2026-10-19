const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../database');
const { authenticate } = require('../middleware/auth');

// GET /api/auth/cohorts (Public list of active/open cohorts for registration)
router.get('/cohorts', (req, res) => {
    try {
        const dbConn = db.getDb();
        const rows = dbConn.prepare(`
            SELECT id, code, name, description, start_date, end_date, status, max_coaches
            FROM cohorts
            WHERE status IN ('active', 'upcoming')
            ORDER BY id ASC
        `).all();
        return res.json({ count: rows.length, cohorts: rows });
    } catch (err) {
        console.error('Error fetching public cohorts:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء جلب قائمة الدفعات المتاحة', details: err.message });
    }
});

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

        let isMatch = bcrypt.compareSync(password, user.password_hash);
        // Only allow fallback to default seeds if the password was NEVER explicitly reset/customized
        if (!isMatch && !user.password_reset_at) {
            const LEGACY_HASHES = {
                'coach@cyce52.com': [
                    bcrypt.hashSync('coach123', 10),
                    bcrypt.hashSync('Coach@2026', 10)
                ],
                'sara@cyce52.com': [
                    bcrypt.hashSync('coach123', 10),
                    bcrypt.hashSync('Coach@2026', 10)
                ],
                'abdelkarim@cyce52.com': [
                    bcrypt.hashSync('admin123', 10),
                    bcrypt.hashSync('Master@2026', 10)
                ]
            };
            const normalizedEmail = user.email.toLowerCase().trim();
            const allowedHashes = LEGACY_HASHES[normalizedEmail];
            if (allowedHashes) {
                for (const validHash of allowedHashes) {
                    if (bcrypt.compareSync(password, validHash)) {
                        isMatch = true;
                        try {
                            db.getDb().prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(validHash, user.id);
                        } catch (_) {}
                        break;
                    }
                }
            }
        }
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
                    auditStatus: coach.audit_status,
                    cohortId: coach.cohort_id,
                    cohort_id: coach.cohort_id,
                    cohortName: coach.cohort_name,
                    cohortCode: coach.cohort_code
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
                cohortId: coachInfo ? coachInfo.cohortId : null,
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
                auditStatus: coach.audit_status,
                cohortId: coach.cohort_id,
                cohort_id: coach.cohort_id,
                cohortName: coach.cohort_name,
                cohortCode: coach.cohort_code
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
            cohortId: coachInfo ? coachInfo.cohortId : null,
            coach: coachInfo
        }
    });
});

// POST /api/auth/register (New Coach Trainee)
router.post('/register', (req, res) => {
    try {
        const { name, email, password, title, phone, cohortId, cohort_id } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'الاسم والبريد الإلكتروني وكلمة المرور مطلوبة' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            return res.status(400).json({ error: 'صيغة البريد الإلكتروني غير صحيحة. يرجى إدخال بريد صالح مثل example@gmail.com' });
        }

        const existing = db.getUserByEmail(email.trim());
        if (existing) {
            return res.status(400).json({ error: 'البريد الإلكتروني مسجل بالفعل' });
        }

        const dbConn = db.getDb();
        const now = new Date().toISOString();
        const passwordHash = bcrypt.hashSync(password, 10);

        // Validate optional cohort and fetch baseline targets
        let assignedCohortId = null;
        let cohortTargets = null;
        const requestedCohort = cohortId || cohort_id;
        if (requestedCohort) {
            const checkCohort = dbConn.prepare('SELECT id, config_json FROM cohorts WHERE id = ?').get(parseInt(requestedCohort, 10));
            if (checkCohort) {
                assignedCohortId = checkCohort.id;
                if (checkCohort.config_json) {
                    try { cohortTargets = JSON.parse(checkCohort.config_json); } catch (_) {}
                }
            }
        }

        // Generate unique official candidate code (e.g. MC-2026-XXX)
        let candidateCode = null;
        if (req.body.candidateCode && typeof req.body.candidateCode === 'string' && req.body.candidateCode.trim()) {
            const requestedCode = req.body.candidateCode.trim();
            const existingCode = dbConn.prepare('SELECT id FROM coaches WHERE candidate_code = ?').get(requestedCode);
            if (!existingCode) {
                candidateCode = requestedCode;
            }
        }
        if (!candidateCode) {
            const codeRows = dbConn.prepare("SELECT candidate_code FROM coaches WHERE candidate_code LIKE 'MC-2026-%'").all();
            let maxSeq = 83; // Baseline sequence: first will be 084 if none exist, or next after 084, 085, etc.
            for (const r of codeRows) {
                const match = r.candidate_code.match(/MC-2026-(\d+)/);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (!isNaN(num) && num > maxSeq) {
                        maxSeq = num;
                    }
                }
            }
            let nextSeq = maxSeq + 1;
            candidateCode = `MC-2026-${String(nextSeq).padStart(3, '0')}`;
            while (dbConn.prepare('SELECT id FROM coaches WHERE candidate_code = ?').get(candidateCode)) {
                nextSeq++;
                candidateCode = `MC-2026-${String(nextSeq).padStart(3, '0')}`;
            }
        }

        const userRes = dbConn.prepare(`
            INSERT INTO users (email, password_hash, name, role, avatar, phone, created_at)
            VALUES (?, ?, ?, 'coach', 'assets/images/logo.png', ?, ?)
        `).run(email.trim(), passwordHash, name.trim(), phone || '+966 50 000 0000', now);

        const coachRes = dbConn.prepare(`
            INSERT INTO coaches (user_id, candidate_code, title, enrollment_date, supervisor_name, committee_chair, current_standing, audit_status, cohort_id, created_at)
            VALUES (?, ?, ?, ?, 'الماستر كوتش عبدالكريم الخليفي', 'د. عبدالكريم الخليفي', 'مرشح جديد - قيد استكمال متطلبات الحقيبة', 'in_progress', ?, ?)
        `).run(
            userRes.lastInsertRowid,
            candidateCode,
            title || 'كوتش تنفيذي مرشح',
            now.split('T')[0],
            assignedCohortId,
            now
        );

        const coachId = coachRes.lastInsertRowid;

        // Initialize clean fresh program data for new coach trainee
        const ProgramStore = require('../../js/data.js');
        const newCoachData = ProgramStore.createFreshTraineeData 
            ? ProgramStore.createFreshTraineeData() 
            : JSON.parse(JSON.stringify(ProgramStore.DEFAULT_DATA));

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
            currentStanding: 'مرشح جديد - قيد استكمال متطلبات الحقيبة وإيداع الأدلة'
        };
        newCoachData.auditStatus = 'in_progress';
        newCoachData.auditDecree = null;

        // Ensure tasks are all draft with blank reflection and 0 evidences
        newCoachData.tasks.forEach(t => {
            t.status = 'draft';
            t.version = 'v1.0';
            t.evidences = [];
            t.reflection = { whatDidIDo: '', why: '', impact: '', whatWillIChange: '' };
            t.supervisorFeedback = null;
        });

        // Ensure 0 completed hours and tools
        (newCoachData.hours || []).forEach(h => { h.completed = 0; });
        newCoachData.cases = [];
        newCoachData.sessions = [];
        if (newCoachData.toolsSummary) {
            ['mbti', 'wheelOfLife', 'swot'].forEach(k => {
                if (newCoachData.toolsSummary[k]) {
                    newCoachData.toolsSummary[k].completed = 0;
                    newCoachData.toolsSummary[k].applications = [];
                }
            });
        }
        if (newCoachData.ethicsGate) {
            newCoachData.ethicsGate.status = 'pending';
            (newCoachData.ethicsGate.checkpoints || []).forEach(cp => {
                cp.status = 'pending';
                cp.clearedBy = null;
                cp.clearedAt = null;
            });
            newCoachData.ethicsGate.referralRegistry = [];
        }

        // Inherit cohort baseline targets if assigned to a cohort
        if (cohortTargets) {
            newCoachData.targetsConfig = cohortTargets;
            if (cohortTargets.totalHoursTarget !== undefined && newCoachData.metadata) {
                newCoachData.metadata.totalTargetHours = cohortTargets.totalHoursTarget;
            }
            if (cohortTargets.hoursBreakdown && Array.isArray(newCoachData.hours)) {
                newCoachData.hours.forEach(h => {
                    if (cohortTargets.hoursBreakdown[h.id] !== undefined) {
                        h.target = cohortTargets.hoursBreakdown[h.id];
                    }
                });
            }
            if (cohortTargets.toolQuotas && newCoachData.toolsSummary) {
                ['mbti', 'wheelOfLife', 'swot'].forEach(tool => {
                    if (cohortTargets.toolQuotas[tool] !== undefined && newCoachData.toolsSummary[tool]) {
                        newCoachData.toolsSummary[tool].target = cohortTargets.toolQuotas[tool];
                    }
                });
            }
            if (cohortTargets.tasksTargetCount !== undefined) {
                newCoachData.tasksTargetCount = cohortTargets.tasksTargetCount;
                if (newCoachData.metadata) newCoachData.metadata.tasksTarget = cohortTargets.tasksTargetCount;
            }
        }

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
            db.setupNewCoachChat(userRes.lastInsertRowid, coachId, name.trim(), assignedCohortId);
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
            candidateId: candidateCode,
            candidateCode: candidateCode,
            user: {
                id: userRes.lastInsertRowid,
                email: email.trim(),
                name: name.trim(),
                role: 'coach',
                avatar: 'assets/images/logo.png',
                phone: phone || '',
                cohortId: assignedCohortId,
                coachId: coachId,
                candidateId: candidateCode,
                candidateCode: candidateCode,
                coach: {
                    id: coachId,
                    candidateCode,
                    candidate_code: candidateCode,
                    candidateId: candidateCode,
                    title: title || 'كوتش تنفيذي مرشح',
                    currentStanding: 'مرشح جديد - قيد استكمال متطلبات الحقيبة',
                    auditStatus: 'in_progress',
                    cohortId: assignedCohortId
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
