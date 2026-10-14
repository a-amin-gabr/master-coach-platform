const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const config = require('./config');

let dbInstance = null;

function getDb() {
    if (!dbInstance) {
        // Ensure data dir exists
        const dataDir = path.dirname(config.DB_PATH);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        if (!fs.existsSync(config.UPLOADS_DIR)) {
            fs.mkdirSync(config.UPLOADS_DIR, { recursive: true });
        }

        dbInstance = new Database(config.DB_PATH);
        dbInstance.pragma('journal_mode = WAL');
        dbInstance.pragma('foreign_keys = ON');
    }
    return dbInstance;
}

function initializeDatabase(forceReset = false) {
    const db = getDb();

    if (forceReset) {
        db.exec(`
            DROP TABLE IF EXISTS supervisor_feedbacks;
            DROP TABLE IF EXISTS ethics_referrals;
            DROP TABLE IF EXISTS ethics_checkpoints;
            DROP TABLE IF EXISTS rubrics_evaluations;
            DROP TABLE IF EXISTS tool_applications;
            DROP TABLE IF EXISTS evidences;
            DROP TABLE IF EXISTS tasks;
            DROP TABLE IF EXISTS coach_program_state;
            DROP TABLE IF EXISTS coaches;
            DROP TABLE IF EXISTS users;
        `);
    }

    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL COLLATE NOCASE,
            password_hash TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('admin', 'coach')),
            avatar TEXT,
            phone TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS coaches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            candidate_code TEXT UNIQUE NOT NULL,
            title TEXT NOT NULL,
            enrollment_date TEXT NOT NULL,
            supervisor_name TEXT NOT NULL,
            committee_chair TEXT NOT NULL,
            current_standing TEXT NOT NULL,
            audit_status TEXT NOT NULL DEFAULT 'in_progress' CHECK(audit_status IN ('in_progress', 'ready', 'certified', 'blocked')),
            audit_decree TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS coach_program_state (
            coach_id INTEGER PRIMARY KEY REFERENCES coaches(id) ON DELETE CASCADE,
            state_json TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT NOT NULL,
            coach_id INTEGER NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            category TEXT,
            rubric_code TEXT,
            status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'submitted', 'revision_required', 'approved')),
            version TEXT NOT NULL DEFAULT 'v1.0',
            grade REAL,
            reflection_json TEXT,
            supervisor_notes TEXT,
            audio_feedback_url TEXT,
            updated_at TEXT NOT NULL,
            PRIMARY KEY (id, coach_id)
        );

        CREATE TABLE IF NOT EXISTS evidences (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id TEXT NOT NULL,
            coach_id INTEGER NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            original_name TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_url TEXT NOT NULL,
            mime_type TEXT,
            size_bytes INTEGER,
            type TEXT NOT NULL DEFAULT 'document',
            pages INTEGER,
            duration TEXT,
            is_anonymous INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS tool_applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            coach_id INTEGER NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
            tool_type TEXT NOT NULL CHECK(tool_type IN ('mbti', 'wheelOfLife', 'swot')),
            beneficiary_code TEXT NOT NULL COLLATE NOCASE,
            date TEXT NOT NULL,
            focus TEXT,
            plan TEXT,
            status TEXT NOT NULL DEFAULT 'approved',
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS rubrics_evaluations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            coach_id INTEGER NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
            rubric_code TEXT NOT NULL,
            criterion_id TEXT NOT NULL,
            level INTEGER NOT NULL CHECK(level BETWEEN 1 AND 5),
            evidence_note TEXT,
            notes TEXT,
            required_improvement TEXT,
            updated_at TEXT NOT NULL,
            UNIQUE (coach_id, rubric_code, criterion_id)
        );

        CREATE TABLE IF NOT EXISTS ethics_checkpoints (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            coach_id INTEGER NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
            checkpoint_id TEXT NOT NULL,
            title TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'verified' CHECK(status IN ('verified', 'passed', 'flagged', 'pending')),
            cleared_by TEXT,
            cleared_at TEXT,
            UNIQUE (coach_id, checkpoint_id)
        );

        CREATE TABLE IF NOT EXISTS ethics_referrals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            coach_id INTEGER NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
            case_ref TEXT NOT NULL,
            beneficiary_code TEXT NOT NULL,
            detection_date TEXT NOT NULL,
            observed_symptoms TEXT NOT NULL,
            action_taken TEXT,
            referred_to TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'مغلقة ومحالة بأمان وفق الميثاق المهني',
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS supervisor_feedbacks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            coach_id INTEGER NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
            task_id TEXT NOT NULL,
            audio_file_path TEXT,
            text_notes TEXT,
            grade REAL,
            created_at TEXT NOT NULL
        );
    `);

    // Check if admin user exists; if not, seed initial data
    const adminCheck = db.prepare('SELECT id FROM users WHERE email = ?').get('abdelkarim@cyce52.com');
    if (!adminCheck) {
        seedInitialData(db);
    }
}

function seedInitialData(db) {
    const ProgramStore = require('../js/data.js');
    const defaultData = ProgramStore.DEFAULT_DATA;
    const now = new Date().toISOString();

    const insertUser = db.prepare(`
        INSERT INTO users (email, password_hash, name, role, avatar, phone, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertCoach = db.prepare(`
        INSERT INTO coaches (user_id, candidate_code, title, enrollment_date, supervisor_name, committee_chair, current_standing, audit_status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertState = db.prepare(`
        INSERT INTO coach_program_state (coach_id, state_json, updated_at)
        VALUES (?, ?, ?)
    `);

    const insertTask = db.prepare(`
        INSERT INTO tasks (id, coach_id, title, category, rubric_code, status, version, grade, reflection_json, supervisor_notes, audio_feedback_url, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertEvidence = db.prepare(`
        INSERT INTO evidences (task_id, coach_id, name, original_name, file_path, file_url, mime_type, size_bytes, type, pages, duration, is_anonymous, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertToolApp = db.prepare(`
        INSERT INTO tool_applications (coach_id, tool_type, beneficiary_code, date, focus, plan, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertRubricEval = db.prepare(`
        INSERT INTO rubrics_evaluations (coach_id, rubric_code, criterion_id, level, evidence_note, notes, required_improvement, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertEthicsCheck = db.prepare(`
        INSERT INTO ethics_checkpoints (coach_id, checkpoint_id, title, status, cleared_by, cleared_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertEthicsRef = db.prepare(`
        INSERT INTO ethics_referrals (coach_id, case_ref, beneficiary_code, detection_date, observed_symptoms, action_taken, referred_to, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // 1. Admin Account: Master Coach Abdelkarim Al-Khelaifi
    const adminPassHash = bcrypt.hashSync('Master@2026', 10);
    insertUser.run(
        'abdelkarim@cyce52.com',
        adminPassHash,
        'الماستر كوتش عبدالكريم الخليفي',
        'admin',
        'assets/images/logo.png',
        '+966 55 555 2026',
        now
    );

    // 2. Candidate 1: Coach Ahmed Al-Shammari (Primary Demo Coach)
    const coach1PassHash = bcrypt.hashSync('Coach@2026', 10);
    const user1Res = insertUser.run(
        'coach@cyce52.com',
        coach1PassHash,
        defaultData.metadata.candidate.name,
        'coach',
        defaultData.metadata.candidate.avatar,
        defaultData.metadata.candidate.phone,
        now
    );
    const user1Id = user1Res.lastInsertRowid;

    const coach1Res = insertCoach.run(
        user1Id,
        defaultData.metadata.candidate.id,
        defaultData.metadata.candidate.title,
        defaultData.metadata.candidate.enrollmentDate,
        defaultData.metadata.candidate.supervisorName,
        defaultData.metadata.candidate.committeeChair,
        defaultData.metadata.candidate.currentStanding,
        'ready',
        now
    );
    const coach1Id = coach1Res.lastInsertRowid;

    // Deep clone data for Coach 1
    const coach1Data = JSON.parse(JSON.stringify(defaultData));
    insertState.run(coach1Id, JSON.stringify(coach1Data), now);

    // Seed tasks for Coach 1
    coach1Data.tasks.forEach(t => {
        insertTask.run(
            t.id,
            coach1Id,
            t.title,
            t.category || '',
            t.rubricCode || '',
            t.status,
            t.version,
            t.supervisorFeedback ? t.supervisorFeedback.grade : null,
            JSON.stringify(t.reflection || {}),
            t.supervisorFeedback ? t.supervisorFeedback.notes : '',
            t.supervisorFeedback ? t.supervisorFeedback.audioUrl : null,
            now
        );

        if (Array.isArray(t.evidences)) {
            t.evidences.forEach(ev => {
                insertEvidence.run(
                    t.id,
                    coach1Id,
                    ev.name,
                    ev.name,
                    ev.filePath || 'simulated',
                    ev.fileUrl || '',
                    ev.type === 'audio' ? 'audio/mpeg' : 'application/pdf',
                    ev.sizeBytes || 2400000,
                    ev.type,
                    ev.pages || null,
                    ev.duration || null,
                    1,
                    now
                );
            });
        }
    });

    // Seed Tool Applications for Coach 1 (30 MBTI, 30 Wheel, 30 SWOT)
    ['mbti', 'wheelOfLife', 'swot'].forEach(toolKey => {
        const toolObj = coach1Data.toolsSummary[toolKey];
        if (toolObj && Array.isArray(toolObj.applications)) {
            toolObj.applications.forEach(app => {
                insertToolApp.run(
                    coach1Id,
                    toolKey,
                    app.beneficiaryCode,
                    app.date || '2026-03-01',
                    app.focus || 'تطبيق معتمد',
                    app.plan || 'خطة عمل مكتملة',
                    app.status || 'approved',
                    now
                );
            });
        }
    });

    // Seed Rubrics Criteria for Coach 1
    coach1Data.rubrics.forEach(rubric => {
        rubric.criteria.forEach(crit => {
            insertRubricEval.run(
                coach1Id,
                rubric.code,
                crit.id,
                crit.currentLevel || 5,
                crit.evidence || '',
                crit.notes || '',
                crit.requiredImprovement || '',
                now
            );
        });
    });

    // Seed Ethics Checkpoints for Coach 1
    coach1Data.ethicsGate.checkpoints.forEach(cp => {
        insertEthicsCheck.run(
            coach1Id,
            cp.id,
            cp.title,
            cp.status,
            cp.clearedBy || 'الماستر كوتش عبدالكريم الخليفي',
            cp.clearedAt || '2026-05-10'
        );
    });

    // Seed Ethics Referrals for Coach 1
    coach1Data.ethicsGate.referralRegistry.forEach(ref => {
        insertEthicsRef.run(
            coach1Id,
            ref.caseRef || ref.refCode || 'REF-2026-01',
            ref.beneficiaryCode || 'BEN-13',
            ref.detectionDate || ref.date || '2026-04-08',
            ref.observedSymptoms || ref.reason || '',
            ref.actionTaken || '',
            ref.referredTo || ref.destination || '',
            ref.status || 'مغلقة ومحالة بأمان وفق الميثاق المهني',
            now
        );
    });

    // 3. Candidate 2: Coach Sara Al-Mutairi (Active in-training coach with pending reviews)
    const coach2PassHash = bcrypt.hashSync('Coach@2026', 10);
    const user2Res = insertUser.run(
        'sara@cyce52.com',
        coach2PassHash,
        'كوتش سارة بنت خالد المطيري',
        'coach',
        'assets/images/logo.png',
        '+966 55 987 6543',
        now
    );
    const user2Id = user2Res.lastInsertRowid;

    const coach2Res = insertCoach.run(
        user2Id,
        'MC-2026-085',
        'كوتش تنفيذي مرشح (ACC to PCC)',
        '2026-02-01',
        'الماستر كوتش عبدالكريم الخليفي',
        'د. عبدالكريم الخليفي',
        'قيد تدقيق المهام التخصصية والممارسة الميدانية',
        'in_progress',
        now
    );
    const coach2Id = coach2Res.lastInsertRowid;

    const coach2Data = JSON.parse(JSON.stringify(defaultData));
    coach2Data.metadata.candidate = {
        id: 'MC-2026-085',
        name: 'كوتش سارة بنت خالد المطيري',
        title: 'كوتش تنفيذي مرشح (ACC to PCC)',
        avatar: 'assets/images/logo.png',
        email: 'sara@cyce52.com',
        phone: '+966 55 987 6543',
        enrollmentDate: '2026-02-01',
        supervisorName: 'الماستر كوتش عبدالكريم الخليفي',
        committeeChair: 'د. عبدالكريم الخليفي',
        currentStanding: 'قيد تدقيق المهام التخصصية والممارسة الميدانية'
    };
    // Sara has 2 submitted tasks pending supervisor rating
    coach2Data.tasks[0].status = 'submitted';
    coach2Data.tasks[0].version = 'v1.0';
    coach2Data.tasks[0].supervisorFeedback = null;
    coach2Data.tasks[1].status = 'submitted';
    coach2Data.tasks[1].version = 'v1.0';
    coach2Data.tasks[1].supervisorFeedback = null;

    insertState.run(coach2Id, JSON.stringify(coach2Data), now);

    coach2Data.tasks.forEach(t => {
        insertTask.run(
            t.id,
            coach2Id,
            t.title,
            t.category || '',
            t.rubricCode || '',
            t.status,
            t.version,
            t.supervisorFeedback ? t.supervisorFeedback.grade : null,
            JSON.stringify(t.reflection || {}),
            t.supervisorFeedback ? t.supervisorFeedback.notes : '',
            t.supervisorFeedback ? t.supervisorFeedback.audioUrl : null,
            now
        );
    });

    ['mbti', 'wheelOfLife', 'swot'].forEach(toolKey => {
        const toolObj = coach2Data.toolsSummary[toolKey];
        if (toolObj && Array.isArray(toolObj.applications)) {
            // Keep first 20 apps for Sara to show partial completion
            const sliceApps = toolObj.applications.slice(0, 20);
            sliceApps.forEach(app => {
                insertToolApp.run(
                    coach2Id,
                    toolKey,
                    app.beneficiaryCode,
                    app.date || '2026-03-01',
                    app.focus || 'تطبيق معتمد',
                    app.plan || 'خطة عمل مكتملة',
                    app.status || 'approved',
                    now
                );
            });
        }
    });

    coach2Data.rubrics.forEach(rubric => {
        rubric.criteria.forEach(crit => {
            insertRubricEval.run(
                coach2Id,
                rubric.code,
                crit.id,
                crit.currentLevel || 4,
                crit.evidence || '',
                crit.notes || '',
                crit.requiredImprovement || '',
                now
            );
        });
    });

    coach2Data.ethicsGate.checkpoints.forEach(cp => {
        insertEthicsCheck.run(
            coach2Id,
            cp.id,
            cp.title,
            cp.status,
            cp.clearedBy || 'الماستر كوتش عبدالكريم الخليفي',
            cp.clearedAt || '2026-05-10'
        );
    });
}

// Data Access Methods

function getUserByEmail(email) {
    const db = getDb();
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}

function getUserById(id) {
    const db = getDb();
    return db.prepare('SELECT id, email, name, role, avatar, phone, created_at FROM users WHERE id = ?').get(id);
}

function getCoachByUserId(userId) {
    const db = getDb();
    return db.prepare('SELECT * FROM coaches WHERE user_id = ?').get(userId);
}

function getCoachById(coachId) {
    const db = getDb();
    return db.prepare('SELECT * FROM coaches WHERE id = ?').get(coachId);
}

function getAllCoaches() {
    const db = getDb();
    const rows = db.prepare(`
        SELECT 
            c.id, c.user_id, c.candidate_code, c.title, c.enrollment_date, 
            c.supervisor_name, c.committee_chair, c.current_standing, c.audit_status, c.created_at,
            u.name, u.email, u.avatar, u.phone
        FROM coaches c
        JOIN users u ON c.user_id = u.id
        ORDER BY c.id ASC
    `).all();

    return rows.map(coach => {
        // Calculate dynamic live summary
        const taskStats = db.prepare(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
                SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as submitted,
                SUM(CASE WHEN status = 'revision_required' THEN 1 ELSE 0 END) as revision_required,
                SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft
            FROM tasks WHERE coach_id = ?
        `).get(coach.id);

        const toolStats = db.prepare(`
            SELECT COUNT(*) as total_apps FROM tool_applications WHERE coach_id = ?
        `).get(coach.id);

        const rubricStats = db.prepare(`
            SELECT AVG(level) as avg_level, COUNT(*) as count FROM rubrics_evaluations WHERE coach_id = ?
        `).get(coach.id);

        const ethicsStats = db.prepare(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status IN ('passed', 'verified') THEN 1 ELSE 0 END) as passed
            FROM ethics_checkpoints WHERE coach_id = ?
        `).get(coach.id);

        return {
            ...coach,
            tasksSummary: {
                total: taskStats.total || 0,
                approved: taskStats.approved || 0,
                pending: taskStats.submitted || 0,
                revisionRequired: taskStats.revision_required || 0,
                draft: taskStats.draft || 0
            },
            toolsCompleted: toolStats.total_apps || 0,
            rubricsAverage: rubricStats.avg_level ? parseFloat(rubricStats.avg_level.toFixed(2)) : 0,
            ethicsPassed: (ethicsStats.total > 0 && ethicsStats.passed === ethicsStats.total),
            ethicsDetails: `${ethicsStats.passed || 0}/${ethicsStats.total || 7}`
        };
    });
}

function getCoachCompleteState(coachId) {
    const db = getDb();
    const stateRow = db.prepare('SELECT state_json FROM coach_program_state WHERE coach_id = ?').get(coachId);
    if (!stateRow) return null;

    const state = JSON.parse(stateRow.state_json);

    // Sync live tasks and evidences
    const dbTasks = db.prepare('SELECT * FROM tasks WHERE coach_id = ?').all(coachId);
    const dbEvidences = db.prepare('SELECT * FROM evidences WHERE coach_id = ? ORDER BY id ASC').all(coachId);

    const evidencesByTask = {};
    dbEvidences.forEach(ev => {
        if (!evidencesByTask[ev.task_id]) evidencesByTask[ev.task_id] = [];
        evidencesByTask[ev.task_id].push({
            id: ev.id,
            name: ev.name,
            originalName: ev.original_name,
            filePath: ev.file_path,
            fileUrl: ev.file_url,
            type: ev.type,
            sizeBytes: ev.size_bytes,
            mimeType: ev.mime_type,
            pages: ev.pages,
            duration: ev.duration,
            isAnonymous: !!ev.is_anonymous,
            createdAt: ev.created_at
        });
    });

    state.tasks = state.tasks.map(t => {
        const dbt = dbTasks.find(dt => dt.id === t.id);
        if (dbt) {
            t.status = dbt.status;
            t.version = dbt.version;
            if (dbt.reflection_json) {
                try { t.reflection = JSON.parse(dbt.reflection_json); } catch (_) {}
            }
            if (dbt.supervisor_notes || dbt.grade !== null || dbt.audio_feedback_url) {
                t.supervisorFeedback = {
                    grade: dbt.grade !== null ? dbt.grade : (t.supervisorFeedback ? t.supervisorFeedback.grade : 5.0),
                    notes: dbt.supervisor_notes || (t.supervisorFeedback ? t.supervisorFeedback.notes : ''),
                    audioUrl: dbt.audio_feedback_url || (t.supervisorFeedback ? t.supervisorFeedback.audioUrl : '')
                };
            }
        }
        if (evidencesByTask[t.id]) {
            // merge uploaded evidences with existing
            const existingNames = new Set(t.evidences.map(e => e.name));
            evidencesByTask[t.id].forEach(ev => {
                if (!existingNames.has(ev.name)) {
                    t.evidences.push(ev);
                }
            });
        }
        return t;
    });

    // Sync tool applications
    const dbTools = db.prepare('SELECT * FROM tool_applications WHERE coach_id = ? ORDER BY id ASC').all(coachId);
    ['mbti', 'wheelOfLife', 'swot'].forEach(k => {
        const apps = dbTools.filter(a => a.tool_type === k).map(a => ({
            id: a.id,
            beneficiaryCode: a.beneficiary_code,
            date: a.date,
            focus: a.focus,
            plan: a.plan,
            status: a.status
        }));
        if (!state.toolsSummary[k]) state.toolsSummary[k] = { label: k, target: 30, completed: 0, applications: [] };
        state.toolsSummary[k].applications = apps;
        state.toolsSummary[k].completed = apps.length;
    });

    // Sync Rubrics
    const dbRubrics = db.prepare('SELECT * FROM rubrics_evaluations WHERE coach_id = ?').all(coachId);
    state.rubrics.forEach(rubric => {
        rubric.criteria.forEach(crit => {
            const row = dbRubrics.find(r => r.rubric_code === rubric.code && r.criterion_id === crit.id);
            if (row) {
                crit.currentLevel = row.level;
                if (row.notes) crit.notes = row.notes;
                if (row.evidence_note) crit.evidence = row.evidence_note;
                if (row.required_improvement) crit.requiredImprovement = row.required_improvement;
            }
        });
    });

    // Sync Ethics Gate
    const dbEthics = db.prepare('SELECT * FROM ethics_checkpoints WHERE coach_id = ?').all(coachId);
    if (state.ethicsGate && Array.isArray(state.ethicsGate.checkpoints)) {
        state.ethicsGate.checkpoints.forEach(cp => {
            const row = dbEthics.find(e => e.checkpoint_id === cp.id);
            if (row) {
                cp.status = row.status;
                if (row.cleared_by) cp.clearedBy = row.cleared_by;
                if (row.cleared_at) cp.clearedAt = row.cleared_at;
            }
        });
        const allPassed = state.ethicsGate.checkpoints.every(c => c.status === 'passed' || c.status === 'verified');
        state.ethicsGate.status = allPassed ? 'passed' : 'flagged';
    }

    const dbReferrals = db.prepare('SELECT * FROM ethics_referrals WHERE coach_id = ?').all(coachId);
    if (state.ethicsGate) {
        state.ethicsGate.referralRegistry = dbReferrals.map(r => ({
            caseRef: r.case_ref,
            beneficiaryCode: r.beneficiary_code,
            detectionDate: r.detection_date,
            observedSymptoms: r.observed_symptoms,
            actionTaken: r.action_taken,
            referredTo: r.referred_to,
            status: r.status
        }));
    }

    // Check for audit status in DB
    const coachRow = db.prepare('SELECT audit_status, audit_decree FROM coaches WHERE id = ?').get(coachId);
    if (coachRow) {
        state.auditStatus = coachRow.audit_status;
        if (coachRow.audit_decree) {
            try { state.auditDecree = JSON.parse(coachRow.audit_decree); } catch (_) {}
        }
    }

    return state;
}

function updateCoachState(coachId, newState) {
    const db = getDb();
    const now = new Date().toISOString();
    return db.prepare('UPDATE coach_program_state SET state_json = ?, updated_at = ? WHERE coach_id = ?')
        .run(JSON.stringify(newState), now, coachId);
}

module.exports = {
    getDb,
    initializeDatabase,
    getUserByEmail,
    getUserById,
    getCoachByUserId,
    getCoachById,
    getAllCoaches,
    getCoachCompleteState,
    updateCoachState
};
