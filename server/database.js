const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const config = require('./config');

let dbInstance = null;

function normalizeArabic(text) {
    if (!text) return '';
    return String(text)
        .replace(/[\u064B-\u065F\u0670]/g, '') // remove tashkeel/harakat
        .replace(/[أإآٱ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .toLowerCase()
        .trim();
}

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
        dbInstance.function('NORMALIZE_ARABIC', (text) => normalizeArabic(text));
    }
    return dbInstance;
}

function initializeDatabase(forceReset = false) {
    const db = getDb();

    if (forceReset) {
        db.exec(`
            DROP TABLE IF EXISTS notifications;
            DROP TABLE IF EXISTS audit_logs;
            DROP TABLE IF EXISTS chat_messages;
            DROP TABLE IF EXISTS chat_channel_members;
            DROP TABLE IF EXISTS chat_channels;
            DROP TABLE IF EXISTS supervisor_feedbacks;
            DROP TABLE IF EXISTS ethics_referrals;
            DROP TABLE IF EXISTS ethics_checkpoints;
            DROP TABLE IF EXISTS rubrics_evaluations;
            DROP TABLE IF EXISTS tool_applications;
            DROP TABLE IF EXISTS evidences;
            DROP TABLE IF EXISTS tasks;
            DROP TABLE IF EXISTS coach_program_state;
            DROP TABLE IF EXISTS coaches;
            DROP TABLE IF EXISTS cohorts;
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

        CREATE TABLE IF NOT EXISTS cohorts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            start_date TEXT NOT NULL,
            end_date TEXT,
            status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'upcoming', 'completed', 'archived')),
            max_coaches INTEGER DEFAULT 30,
            config_json TEXT,
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
            cohort_id INTEGER REFERENCES cohorts(id) ON DELETE SET NULL,
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

        CREATE TABLE IF NOT EXISTS chat_channels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            channel_type TEXT NOT NULL CHECK(channel_type IN ('direct', 'group')),
            name TEXT NOT NULL,
            description TEXT,
            direct_coach_id INTEGER REFERENCES coaches(id) ON DELETE CASCADE,
            cohort_id INTEGER REFERENCES cohorts(id) ON DELETE CASCADE,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS chat_channel_members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            channel_id INTEGER NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            role TEXT DEFAULT 'member',
            last_read_message_id INTEGER DEFAULT 0,
            joined_at TEXT NOT NULL,
            UNIQUE(channel_id, user_id)
        );

        CREATE TABLE IF NOT EXISTS chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            channel_id INTEGER NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
            sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            message_type TEXT NOT NULL DEFAULT 'text' CHECK(message_type IN ('text', 'audio', 'image', 'file')),
            content TEXT,
            media_url TEXT,
            media_meta TEXT,
            is_pinned INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            admin_name TEXT,
            action TEXT NOT NULL,
            target_type TEXT,
            target_id INTEGER,
            details TEXT,
            metadata_json TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            type TEXT NOT NULL CHECK(type IN ('task_review', 'voice_note', 'rubric_eval', 'rubric_update', 'cohort_update', 'cohort_announcement', 'chat_msg', 'ethics_alert', 'ethics_clearance', 'system')),
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            link_tab TEXT,
            link_id TEXT,
            metadata_json TEXT,
            is_read INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
    `);

    // Safe migration checks for columns and tables in existing DB files
    try { db.exec("ALTER TABLE coaches ADD COLUMN cohort_id INTEGER REFERENCES cohorts(id) ON DELETE SET NULL"); } catch (_) {}
    try { db.exec("ALTER TABLE chat_channels ADD COLUMN cohort_id INTEGER REFERENCES cohorts(id) ON DELETE CASCADE"); } catch (_) {}
    try { db.exec("ALTER TABLE users ADD COLUMN password_reset_at TEXT"); } catch (_) {}
    try {
        db.exec(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                type TEXT NOT NULL CHECK(type IN ('task_review', 'voice_note', 'rubric_eval', 'rubric_update', 'cohort_update', 'cohort_announcement', 'chat_msg', 'ethics_alert', 'ethics_clearance', 'system')),
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                link_tab TEXT,
                link_id TEXT,
                metadata_json TEXT,
                is_read INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
        `);
    } catch (_) {}

    // Check if admin user exists; if not, seed initial data
    const adminCheck = db.prepare('SELECT id FROM users WHERE email = ?').get('abdelkarim@cyce52.com');
    if (!adminCheck) {
        seedInitialData(db);
    } else {
        // Ensure official default accounts support genuine credentials if not explicitly reset
        try {
            const adminUser = db.prepare('SELECT password_hash, password_reset_at FROM users WHERE email = ?').get('abdelkarim@cyce52.com');
            if (adminUser && !adminUser.password_reset_at && !bcrypt.compareSync('admin123', adminUser.password_hash) && !bcrypt.compareSync('Master@2026', adminUser.password_hash)) {
                db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(bcrypt.hashSync('admin123', 10), 'abdelkarim@cyce52.com');
            }
            const coachUser = db.prepare('SELECT password_hash, password_reset_at FROM users WHERE email = ?').get('coach@cyce52.com');
            if (coachUser && !coachUser.password_reset_at && !bcrypt.compareSync('coach123', coachUser.password_hash) && !bcrypt.compareSync('Coach@2026', coachUser.password_hash)) {
                db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(bcrypt.hashSync('coach123', 10), 'coach@cyce52.com');
            }
        } catch (_) {}

        // Ensure default notifications exist in returning database
        try {
            const notifCount = db.prepare('SELECT COUNT(*) as c FROM notifications').get();
            if (notifCount && notifCount.c === 0) {
                const adminUser = db.prepare('SELECT id FROM users WHERE email = ?').get('abdelkarim@cyce52.com');
                const coachUser = db.prepare('SELECT id FROM users WHERE email = ?').get('coach@cyce52.com');
                if (coachUser) seedDefaultNotificationsForUser(db, coachUser.id, 'coach');
                if (adminUser) seedDefaultNotificationsForUser(db, adminUser.id, 'admin');
            }
        } catch (_) {}
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

    const insertCohort = db.prepare(`
        INSERT INTO cohorts (code, name, description, start_date, end_date, status, max_coaches, config_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertAudit = db.prepare(`
        INSERT INTO audit_logs (admin_id, admin_name, action, target_type, target_id, details, metadata_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertCoach = db.prepare(`
        INSERT INTO coaches (user_id, candidate_code, title, enrollment_date, supervisor_name, committee_chair, current_standing, audit_status, cohort_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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

    // Baseline Cohort Targets Configuration
    const defaultCohortTargets = {
        tasksTargetCount: 8,
        totalHoursTarget: 240,
        hoursBreakdown: { H1: 100, H2: 30, H3: 40, H4: 20, H5: 50 },
        toolQuotas: { mbti: 30, wheelOfLife: 30, swot: 30 },
        minRubricScore: 3.0,
        criticalEthicsStrict: true,
        rubricsWeights: {
            sessions: 100,
            portfolio: 100,
            paper: 100,
            project: 100,
            interview: 100,
            supervision: 100
        }
    };

    const cohort1Res = insertCohort.run(
        'COHORT-2026-01',
        'دفعة الرواد (2026-Q1)',
        'برنامج إعداد وتأهيل الماستر كوتش - المسار التنفيذي الشامل تحت إشراف الماستر كوتش عبدالكريم الخليفي',
        '2026-01-15',
        '2026-06-30',
        'active',
        25,
        JSON.stringify(defaultCohortTargets),
        now
    );
    const cohort1Id = cohort1Res.lastInsertRowid;

    const cohort2Res = insertCohort.run(
        'COHORT-2026-02',
        'دفعة التميز القيادي (2026-Q2)',
        'دفعة القيادات التنفيذية المتقدمة - مسار الاعتماد المهني المزدوج',
        '2026-04-01',
        '2026-09-30',
        'upcoming',
        30,
        JSON.stringify(defaultCohortTargets),
        now
    );
    const cohort2Id = cohort2Res.lastInsertRowid;

    // 1. Admin Account: Master Coach Abdelkarim Al-Khelaifi
    const adminPassHash = bcrypt.hashSync('admin123', 10);
    const adminRes = insertUser.run(
        'abdelkarim@cyce52.com',
        adminPassHash,
        'الماستر كوتش عبدالكريم الخليفي',
        'admin',
        'assets/images/logo.png',
        '+966 55 555 2026',
        now
    );
    const adminUserId = adminRes.lastInsertRowid;

    // 2. Candidate 1: Coach Ahmed Al-Shammari (Primary Test Trainee Coach - Clean & Fresh)
    const coach1PassHash = bcrypt.hashSync('coach123', 10);
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
        defaultData.metadata.candidate.committeeChair || 'د. عبدالكريم الخليفي',
        'مرشح جديد - قيد استكمال متطلبات الحقيبة وإيداع الأدلة',
        'in_progress',
        cohort1Id,
        now
    );
    const coach1Id = coach1Res.lastInsertRowid;

    // Build clean fresh trainee state for Coach 1
    const coach1Data = ProgramStore.createFreshTraineeData ? ProgramStore.createFreshTraineeData() : JSON.parse(JSON.stringify(defaultData));
    coach1Data.metadata.candidate = {
        id: defaultData.metadata.candidate.id,
        name: defaultData.metadata.candidate.name,
        title: defaultData.metadata.candidate.title,
        avatar: defaultData.metadata.candidate.avatar,
        email: 'coach@cyce52.com',
        phone: defaultData.metadata.candidate.phone,
        enrollmentDate: defaultData.metadata.candidate.enrollmentDate,
        supervisorName: defaultData.metadata.candidate.supervisorName,
        committeeChair: defaultData.metadata.candidate.committeeChair,
        currentStanding: 'مرشح جديد - قيد استكمال متطلبات الحقيبة وإيداع الأدلة'
    };
    coach1Data.auditStatus = 'in_progress';
    coach1Data.auditDecree = null;
    (coach1Data.hours || []).forEach(h => { h.completed = 0; });
    coach1Data.cases = [];
    coach1Data.sessions = [];
    if (coach1Data.toolsSummary) {
        ['mbti', 'wheelOfLife', 'swot'].forEach(k => {
            if (coach1Data.toolsSummary[k]) {
                coach1Data.toolsSummary[k].completed = 0;
                coach1Data.toolsSummary[k].applications = [];
            }
        });
    }
    if (coach1Data.ethicsGate) {
        coach1Data.ethicsGate.status = 'pending';
        (coach1Data.ethicsGate.checkpoints || []).forEach(cp => {
            cp.status = 'pending';
            cp.clearedBy = null;
            cp.clearedAt = null;
        });
        coach1Data.ethicsGate.referralRegistry = [];
    }

    insertState.run(coach1Id, JSON.stringify(coach1Data), now);

    // Seed tasks for Coach 1 (all in draft status, v1.0, 0 evidences, blank reflection)
    coach1Data.tasks.forEach(t => {
        insertTask.run(
            t.id,
            coach1Id,
            t.title,
            t.category || '',
            t.rubricCode || '',
            'draft',
            'v1.0',
            null,
            '{}',
            '',
            null,
            now
        );
    });

    // Seed Rubrics Criteria for Coach 1 (baseline competent level 3, NOT failing < 3)
    coach1Data.rubrics.forEach(rubric => {
        rubric.criteria.forEach(crit => {
            insertRubricEval.run(
                coach1Id,
                rubric.code,
                crit.id,
                3,
                '',
                '',
                'بانتظار التسليم الأول والمراجعة الإشرافية بالروبرك.',
                now
            );
        });
    });

    // Seed Ethics Checkpoints for Coach 1 (all pending)
    coach1Data.ethicsGate.checkpoints.forEach(cp => {
        insertEthicsCheck.run(
            coach1Id,
            cp.id,
            cp.title,
            'pending',
            null,
            null
        );
    });

    // 3. Candidate 2: Coach Sara Al-Mutairi (Candidate Trainee Coach - Clean & Fresh)
    const coach2PassHash = bcrypt.hashSync('coach123', 10);
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
        'مرشحة جديدة - قيد استكمال متطلبات الحقيبة وإيداع الأدلة',
        'in_progress',
        cohort1Id,
        now
    );
    const coach2Id = coach2Res.lastInsertRowid;

    const coach2Data = ProgramStore.createFreshTraineeData ? ProgramStore.createFreshTraineeData() : JSON.parse(JSON.stringify(defaultData));
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
        currentStanding: 'مرشحة جديدة - قيد استكمال متطلبات الحقيبة وإيداع الأدلة'
    };
    coach2Data.auditStatus = 'in_progress';
    coach2Data.auditDecree = null;
    (coach2Data.hours || []).forEach(h => { h.completed = 0; });
    coach2Data.cases = [];
    coach2Data.sessions = [];
    if (coach2Data.toolsSummary) {
        ['mbti', 'wheelOfLife', 'swot'].forEach(k => {
            if (coach2Data.toolsSummary[k]) {
                coach2Data.toolsSummary[k].completed = 0;
                coach2Data.toolsSummary[k].applications = [];
            }
        });
    }
    if (coach2Data.ethicsGate) {
        coach2Data.ethicsGate.status = 'pending';
        (coach2Data.ethicsGate.checkpoints || []).forEach(cp => {
            cp.status = 'pending';
            cp.clearedBy = null;
            cp.clearedAt = null;
        });
        coach2Data.ethicsGate.referralRegistry = [];
    }

    insertState.run(coach2Id, JSON.stringify(coach2Data), now);

    coach2Data.tasks.forEach(t => {
        insertTask.run(
            t.id,
            coach2Id,
            t.title,
            t.category || '',
            t.rubricCode || '',
            'draft',
            'v1.0',
            null,
            '{}',
            '',
            null,
            now
        );
    });

    coach2Data.rubrics.forEach(rubric => {
        rubric.criteria.forEach(crit => {
            insertRubricEval.run(
                coach2Id,
                rubric.code,
                crit.id,
                3,
                '',
                '',
                'بانتظار التسليم الأول والمراجعة الإشرافية بالروبرك.',
                now
            );
        });
    });

    coach2Data.ethicsGate.checkpoints.forEach(cp => {
        insertEthicsCheck.run(
            coach2Id,
            cp.id,
            cp.title,
            'pending',
            null,
            null
        );
    });

    // 4. Seed Chat System (Cohort Group Chat + 1-on-1 Supervisory Chats)
    const insertChannel = db.prepare(`
        INSERT INTO chat_channels (channel_type, name, description, direct_coach_id, created_at)
        VALUES (?, ?, ?, ?, ?)
    `);

    const insertMember = db.prepare(`
        INSERT INTO chat_channel_members (channel_id, user_id, role, last_read_message_id, joined_at)
        VALUES (?, ?, ?, ?, ?)
    `);

    const insertMessage = db.prepare(`
        INSERT INTO chat_messages (channel_id, sender_id, message_type, content, media_url, media_meta, is_pinned, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // A. Cohort Group Channel
    const groupRes = insertChannel.run(
        'group',
        'ديوان زمالة الماستر كوتش (دفعة 2026)',
        'القناة الرسمية المعتمدة لدفعة برنامج إعداد وتأهيل الماستر كوتش 3.0 لنقاش الحالات وتطوير الممارسات الإشرافية والتعاون المهني.',
        null,
        now
    );
    const groupId = groupRes.lastInsertRowid;
    insertMember.run(groupId, adminUserId, 'admin', 0, now);
    insertMember.run(groupId, user1Id, 'member', 0, now);
    insertMember.run(groupId, user2Id, 'member', 0, now);

    // Initial group messages
    insertMessage.run(
        groupId,
        adminUserId,
        'text',
        'أهلاً ومرحباً بكم جميعاً زملاء دفعة برنامج إعداد وتأهيل الماستر كوتش 3.0 في ديوان الزمالة المعتمد. تم تدشين هذه المساحة الإشرافية المباشرة لتبادل الاستبصارات العميقة حول الحالات الميدانية العشرين ومناقشة تحديات تطبيقات الأدوات الـ 90 وبناء النماذج الابتكارية وفق ميثاق الاتحاد العربي للكوتشنج.',
        null,
        null,
        1,
        new Date(Date.now() - 3600000 * 6).toISOString()
    );

    insertMessage.run(
        groupId,
        user1Id,
        'text',
        'أهلاً بك ماستر كوتش عبدالكريم وبكافة الزملاء الكرام. بدأنا هذا الأسبوع تطبيق مقياس مؤشرات النضج القيادي والدافعية المهنية (LMMI) مع القيادات التنفيذية في الحالة #04، والنتائج مبهرة جداً في إبراز الفجوة بين الأهداف الاستراتيجية ومؤشرات الدافعية الفردية.',
        null,
        null,
        0,
        new Date(Date.now() - 3600000 * 5).toISOString()
    );

    insertMessage.run(
        groupId,
        user2Id,
        'text',
        'زميلي كوتش أحمد، تجربة ملهمة! كيف تعاملت مع مقاومة الإفصاح لدى المستفيد القيادي في مرحلة المقابلات الاستكشافية الأولية؟ أواجه تحدياً مشابهاً في الحالة الميدانية #02.',
        null,
        null,
        0,
        new Date(Date.now() - 3600000 * 4).toISOString()
    );

    insertMessage.run(
        groupId,
        adminUserId,
        'audio',
        'ملاحظة إشرافية صوتية: توجيهات الماستر كوتش حول فك مقاومة الإفصاح وبناء الأمان النفسي في الكوتشنج التنفيذي',
        '/uploads/sample_supervisor_guidance.mp3',
        JSON.stringify({ fileName: 'supervisor_audio_note_01.mp3', duration: '02:30', sizeBytes: 40044, mimeType: 'audio/mpeg' }),
        0,
        new Date(Date.now() - 3600000 * 3).toISOString()
    );

    insertMessage.run(
        groupId,
        adminUserId,
        'image',
        'إطار مصفوفة مستويات الأمان النفسي وبناء التحالف الكوتشنجي المعتمد في حقيبة تمكين الرؤية',
        '/assets/images/logo.png',
        JSON.stringify({ fileName: 'psychological_safety_framework.png', sizeBytes: 56285, mimeType: 'image/png' }),
        0,
        new Date(Date.now() - 3600000 * 2).toISOString()
    );

    // B. Direct Channel 1: Master Coach & Coach Ahmed
    const direct1Res = insertChannel.run(
        'direct',
        'جلسة إشراف فردية - كوتش أحمد الشمري',
        'قناة الإشراف والتوجيه المهني الفردي المباشر بين الماستر كوتش عبدالكريم والكوتش أحمد الشمري',
        coach1Id,
        now
    );
    const direct1Id = direct1Res.lastInsertRowid;
    insertMember.run(direct1Id, adminUserId, 'admin', 0, now);
    insertMember.run(direct1Id, user1Id, 'member', 0, now);

    insertMessage.run(
        direct1Id,
        adminUserId,
        'text',
        'مرحباً كوتش أحمد، راجعت تقرير جلستك الموثقة #08 بعناية. الهيكل الزمني واستيفاء معايير روبرك الجلسات كان متميزاً جداً ونال تقديراً 4.9/5.00 مع استيفاء تام للبوابة الأخلاقية.',
        null,
        null,
        0,
        new Date(Date.now() - 3600000 * 8).toISOString()
    );

    insertMessage.run(
        direct1Id,
        user1Id,
        'text',
        'أشكرك ماستر كوتش على التغذية الراجعة والملاحظات التوجيهية الثمينة. استفساري بخصوص إحالة الحالة REF-2026-01: هل التوثيق المرفق في سجل الإحالات التخصصية يستوفي متطلبات التدقيق النهائي للاعتماد؟',
        null,
        null,
        0,
        new Date(Date.now() - 3600000 * 7).toISOString()
    );

    insertMessage.run(
        direct1Id,
        adminUserId,
        'text',
        'نعم تماماً، إقرارك لحدود الاختصاص ونزع الهوية مطابق 100% لمعايير البوابة الأخلاقية المستقلة، وتم تدقيق الحالة في سجل الإحالات واعتمادها رسمياً.',
        null,
        null,
        0,
        new Date(Date.now() - 3600000 * 6).toISOString()
    );

    insertMessage.run(
        direct1Id,
        user1Id,
        'file',
        'مسودة ملخص الأثر البعدي لشركة ريادة التقنية (مشروع التخرج)',
        '/uploads/sample_supervisor_guidance.wav',
        JSON.stringify({ fileName: 'Impact_Summary_Riyada_Tech.pdf', sizeBytes: 40044, mimeType: 'application/pdf', pages: 12 }),
        0,
        new Date(Date.now() - 3600000 * 4).toISOString()
    );

    // C. Direct Channel 2: Master Coach & Coach Sara
    const direct2Res = insertChannel.run(
        'direct',
        'جلسة إشراف فردية - كوتش سارة المطيري',
        'قناة الإشراف والتوجيه المهني الفردي المباشر بين الماستر كوتش عبدالكريم والكوتش سارة المطيري',
        coach2Id,
        now
    );
    const direct2Id = direct2Res.lastInsertRowid;
    insertMember.run(direct2Id, adminUserId, 'admin', 0, now);
    insertMember.run(direct2Id, user2Id, 'member', 0, now);

    insertMessage.run(
        direct2Id,
        adminUserId,
        'text',
        'مرحباً كوتش سارة، يسعدني انضمامك للدفعة التطويرية، بانتظار استكمال بقية تطبيقات الأدوات الـ 90 لنقل ملفك لمرحلة التحكيم النهائي.',
        null,
        null,
        0,
        new Date(Date.now() - 3600000 * 9).toISOString()
    );

    insertMessage.run(
        direct2Id,
        user2Id,
        'text',
        'أهلاً ماستر كوتش، تم إنجاز 20 تطبيقاً في MBTI و 20 في عجلة الحياة، وجاري العمل على استكمال تطبيقات SWOT المتبقية هذا الأسبوع بإذن الله.',
        null,
        null,
        0,
        new Date(Date.now() - 3600000 * 8).toISOString()
    );

    // Channel 1 remains the Global Lounge for all coaches (cohort_id: null)

    // D. Cohort 1 Dedicated Group Channel
    const cohort1ChatRes = insertChannel.run(
        'group',
        'ديوان دفعة الرواد (2026-Q1)',
        'القناة التفاعلية المخصصة لأعضاء دفعة الرواد لمناقشة المشروعات التطبيقية.',
        null,
        now
    );
    const cohort1ChatId = cohort1ChatRes.lastInsertRowid;
    db.prepare('UPDATE chat_channels SET cohort_id = ? WHERE id = ?').run(cohort1Id, cohort1ChatId);
    insertMember.run(cohort1ChatId, adminUserId, 'admin', 0, now);
    insertMember.run(cohort1ChatId, user1Id, 'member', 0, now);
    insertMember.run(cohort1ChatId, user2Id, 'member', 0, now);

    // E. Cohort 2 Dedicated Group Channel
    const cohort2ChatRes = insertChannel.run(
        'group',
        'ديوان دفعة التميز القيادي (2026-Q2)',
        'القناة التفاعلية المخصصة لأعضاء دفعة التميز القيادي لمناقشة المشروعات التطبيقية.',
        null,
        now
    );
    const cohort2ChatId = cohort2ChatRes.lastInsertRowid;
    db.prepare('UPDATE chat_channels SET cohort_id = ? WHERE id = ?').run(cohort2Id, cohort2ChatId);
    insertMember.run(cohort2ChatId, adminUserId, 'admin', 0, now);

    // E. Initial Administrative Audit Log
    insertAudit.run(
        adminUserId,
        'الماستر كوتش عبدالكريم الخليفي',
        'SYSTEM_INIT',
        'system',
        null,
        'تدشين منصة الماستر كوتش 3.0 وتهيئة الدفعات التدريبية المعتمدة',
        JSON.stringify({ cohortsCount: 2 }),
        now
    );

    // F. Seed Initial Supervisory Notifications
    seedDefaultNotificationsForUser(db, user1Id, 'coach');
    seedDefaultNotificationsForUser(db, adminUserId, 'admin');
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
    return db.prepare(`
        SELECT c.*, coh.name as cohort_name, coh.code as cohort_code
        FROM coaches c
        LEFT JOIN cohorts coh ON c.cohort_id = coh.id
        WHERE c.user_id = ?
    `).get(userId);
}

function getCoachById(coachId) {
    const db = getDb();
    return db.prepare(`
        SELECT c.*, coh.name as cohort_name, coh.code as cohort_code, u.name, u.email, u.avatar, u.phone
        FROM coaches c
        JOIN users u ON c.user_id = u.id
        LEFT JOIN cohorts coh ON c.cohort_id = coh.id
        WHERE c.id = ?
    `).get(coachId);
}

function getAllCoaches() {
    const db = getDb();
    const rows = db.prepare(`
        SELECT 
            c.id, c.user_id, c.candidate_code, c.title, c.enrollment_date, 
            c.supervisor_name, c.committee_chair, c.current_standing, c.audit_status, c.cohort_id, c.created_at,
            coh.name as cohort_name, coh.code as cohort_code,
            u.name, u.email, u.avatar, u.phone
        FROM coaches c
        JOIN users u ON c.user_id = u.id
        LEFT JOIN cohorts coh ON c.cohort_id = coh.id
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
            cohortId: coach.cohort_id,
            cohortName: coach.cohort_name,
            cohortCode: coach.cohort_code,
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
        const anyFlagged = state.ethicsGate.checkpoints.some(c => c.status === 'flagged');
        const allPassed = state.ethicsGate.checkpoints.length > 0 && state.ethicsGate.checkpoints.every(c => c.status === 'passed' || c.status === 'verified');
        if (anyFlagged) {
            state.ethicsGate.status = 'flagged';
            state.ethicsGate.clearanceBadge = 'حظر أخلاقي نشط (يتطلب مراجعة)';
        } else if (allPassed) {
            state.ethicsGate.status = 'passed';
            state.ethicsGate.clearanceBadge = 'اجتياز معتمد بنسبة 100% (بوابة مستقلة غير خاضعة للتعويض)';
        } else {
            state.ethicsGate.status = 'pending';
            state.ethicsGate.clearanceBadge = 'متطلب تخرج نظامي (قيد الاستيفاء والتدقيق)';
        }
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

    // Check for audit status and cohort in DB
    const coachRow = db.prepare(`
        SELECT c.audit_status, c.audit_decree, c.cohort_id, ch.name as cohort_name, ch.code as cohort_code
        FROM coaches c
        LEFT JOIN cohorts ch ON c.cohort_id = ch.id
        WHERE c.id = ?
    `).get(coachId);
    if (coachRow) {
        state.auditStatus = coachRow.audit_status;
        state.cohort_id = coachRow.cohort_id;
        state.cohortId = coachRow.cohort_id;
        state.cohort_name = coachRow.cohort_name;
        state.cohort_code = coachRow.cohort_code;
        if (coachRow.audit_decree) {
            try { state.auditDecree = JSON.parse(coachRow.audit_decree); } catch (_) {}
        }
    }

    // Ensure dynamic certificateConfig is initialized
    if (!state.certificateConfig) {
        const ProgramStore = require('../js/data.js');
        state.certificateConfig = JSON.parse(JSON.stringify(ProgramStore.DEFAULT_DATA.certificateConfig));
    }

    return state;
}

function updateCoachState(coachId, newState) {
    const db = getDb();
    const now = new Date().toISOString();
    return db.prepare('UPDATE coach_program_state SET state_json = ?, updated_at = ? WHERE coach_id = ?')
        .run(JSON.stringify(newState), now, coachId);
}

function resetCoachData(coachId, mode = 'fresh') {
    const db = getDb();
    const ProgramStore = require('../js/data.js');
    const now = new Date().toISOString();

    if (mode === 'fresh') {
        const freshData = ProgramStore.createFreshTraineeData ? ProgramStore.createFreshTraineeData() : JSON.parse(JSON.stringify(ProgramStore.DEFAULT_DATA));
        // Reset tasks in DB to draft
        db.prepare(`
            UPDATE tasks 
            SET status = 'draft', version = 'v1.0', grade = NULL, reflection_json = '{}', supervisor_notes = '', audio_feedback_url = NULL, updated_at = ?
            WHERE coach_id = ?
        `).run(now, coachId);

        // Clear uploaded evidences and tool applications for this coach
        db.prepare('DELETE FROM evidences WHERE coach_id = ?').run(coachId);
        db.prepare('DELETE FROM tool_applications WHERE coach_id = ?').run(coachId);
        db.prepare('DELETE FROM ethics_referrals WHERE coach_id = ?').run(coachId);
        db.prepare(`
            UPDATE rubrics_evaluations 
            SET level = 3, evidence_note = '', notes = '', required_improvement = 'بانتظار التسليم الأول والمراجعة الإشرافية بالروبرك.', updated_at = ?
            WHERE coach_id = ?
        `).run(now, coachId);
        db.prepare(`
            UPDATE ethics_checkpoints
            SET status = 'pending', cleared_by = NULL, cleared_at = NULL
            WHERE coach_id = ?
        `).run(coachId);
        db.prepare("UPDATE coaches SET audit_status = 'in_progress', audit_decree = NULL WHERE id = ?").run(coachId);

        updateCoachState(coachId, freshData);
        return freshData;
    } else {
        // Re-seed demo data
        const demoData = JSON.parse(JSON.stringify(ProgramStore.DEFAULT_DATA));
        db.prepare('DELETE FROM evidences WHERE coach_id = ?').run(coachId);
        db.prepare('DELETE FROM tool_applications WHERE coach_id = ?').run(coachId);

        const insertEvidence = db.prepare(`
            INSERT INTO evidences (task_id, coach_id, name, original_name, file_path, file_url, mime_type, size_bytes, type, pages, duration, is_anonymous, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const insertToolApp = db.prepare(`
            INSERT INTO tool_applications (coach_id, tool_type, beneficiary_code, date, focus, plan, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        demoData.tasks.forEach(t => {
            db.prepare(`
                UPDATE tasks 
                SET status = ?, version = ?, grade = ?, reflection_json = ?, supervisor_notes = ?, audio_feedback_url = ?, updated_at = ?
                WHERE id = ? AND coach_id = ?
            `).run(
                t.status,
                t.version,
                t.supervisorFeedback ? t.supervisorFeedback.grade : null,
                JSON.stringify(t.reflection || {}),
                t.supervisorFeedback ? t.supervisorFeedback.notes : '',
                t.supervisorFeedback ? t.supervisorFeedback.audioUrl : null,
                now,
                t.id,
                coachId
            );

            if (Array.isArray(t.evidences)) {
                t.evidences.forEach(ev => {
                    insertEvidence.run(
                        t.id,
                        coachId,
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

        ['mbti', 'wheelOfLife', 'swot'].forEach(toolKey => {
            const toolObj = demoData.toolsSummary[toolKey];
            if (toolObj && Array.isArray(toolObj.applications)) {
                toolObj.applications.forEach(app => {
                    insertToolApp.run(
                        coachId,
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

        db.prepare("UPDATE coaches SET audit_status = 'ready', audit_decree = NULL WHERE id = ?").run(coachId);
        updateCoachState(coachId, demoData);
        return demoData;
    }
}

// ----------------------------------------------------
// Chat & Supervisory Messaging Methods
// ----------------------------------------------------

function getChatChannelsForUser(userId) {
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) return [];

    let memberChannels;
    if (user.role === 'admin') {
        memberChannels = db.prepare(`
            SELECT c.*, COALESCE(m.last_read_message_id, 0) as last_read_message_id
            FROM chat_channels c
            LEFT JOIN chat_channel_members m ON c.id = m.channel_id AND m.user_id = ?
            ORDER BY c.id ASC
        `).all(userId);
    } else {
        memberChannels = db.prepare(`
            SELECT c.*, m.last_read_message_id
            FROM chat_channels c
            JOIN chat_channel_members m ON c.id = m.channel_id
            WHERE m.user_id = ?
            ORDER BY c.id ASC
        `).all(userId);
    }

    return memberChannels.map(channel => {
        // Last message
        const lastMsg = db.prepare(`
            SELECT m.*, u.name as sender_name, u.role as sender_role
            FROM chat_messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.channel_id = ?
            ORDER BY m.id DESC LIMIT 1
        `).get(channel.id);

        // Unread count
        const unread = db.prepare(`
            SELECT COUNT(*) as cnt
            FROM chat_messages
            WHERE channel_id = ? AND id > ? AND sender_id != ?
        `).get(channel.id, channel.last_read_message_id || 0, userId);

        // Channel members
        const members = db.prepare(`
            SELECT u.id, u.name, u.email, u.role, u.avatar, m.role as member_role
            FROM chat_channel_members m
            JOIN users u ON m.user_id = u.id
            WHERE m.channel_id = ?
        `).all(channel.id);

        let displayName = channel.name;
        let displayAvatar = 'assets/images/logo.png';
        let displayRole = 'group';

        if (channel.channel_type === 'direct') {
            const otherMember = members.find(m => m.id !== userId) || members[0];
            if (otherMember) {
                displayName = otherMember.role === 'admin'
                    ? 'الماستر كوتش عبدالكريم الخليفي'
                    : otherMember.name;
                displayAvatar = otherMember.avatar || 'assets/images/logo.png';
                displayRole = otherMember.role;
            }
        }

        return {
            id: channel.id,
            channelType: channel.channel_type,
            channel_type: channel.channel_type,
            name: channel.name,
            displayName,
            displayAvatar,
            displayRole,
            description: channel.description,
            directCoachId: channel.direct_coach_id,
            direct_coach_id: channel.direct_coach_id,
            createdAt: channel.created_at,
            created_at: channel.created_at,
            unreadCount: unread ? unread.cnt : 0,
            unread_count: unread ? unread.cnt : 0,
            last_message: lastMsg ? lastMsg.content : '',
            last_message_time: lastMsg ? lastMsg.created_at : '',
            lastMessage: lastMsg ? {
                id: lastMsg.id,
                messageType: lastMsg.message_type,
                message_type: lastMsg.message_type,
                content: lastMsg.content,
                mediaUrl: lastMsg.media_url,
                media_url: lastMsg.media_url,
                senderId: lastMsg.sender_id,
                sender_id: lastMsg.sender_id,
                senderName: lastMsg.sender_name,
                sender_name: lastMsg.sender_name,
                senderRole: lastMsg.sender_role,
                sender_role: lastMsg.sender_role,
                createdAt: lastMsg.created_at,
                created_at: lastMsg.created_at
            } : null,
            membersCount: members.length,
            members
        };
    });
}

function getChannelById(channelId) {
    const db = getDb();
    return db.prepare('SELECT * FROM chat_channels WHERE id = ?').get(channelId);
}

function isUserChannelMember(channelId, userId) {
    const db = getDb();
    const row = db.prepare('SELECT 1 FROM chat_channel_members WHERE channel_id = ? AND user_id = ?').get(channelId, userId);
    return !!row;
}

function getChannelMessages(channelId, { limit = 100, afterId = null, search = null } = {}) {
    const db = getDb();
    let query = `
        SELECT m.*, u.name as sender_name, u.avatar as sender_avatar, u.role as sender_role
        FROM chat_messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.channel_id = ?
    `;
    const params = [channelId];

    if (afterId) {
        query += ` AND m.id > ?`;
        params.push(parseInt(afterId, 10));
    }
    if (search && search.trim()) {
        query += ` AND (m.content LIKE ? OR m.media_meta LIKE ?)`;
        params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    query += ` ORDER BY m.id ASC LIMIT ?`;
    params.push(parseInt(limit, 10) || 100);

    const rows = db.prepare(query).all(...params);
    return rows.map(r => ({
        id: r.id,
        channelId: r.channel_id,
        channel_id: r.channel_id,
        senderId: r.sender_id,
        sender_id: r.sender_id,
        senderName: r.sender_name,
        sender_name: r.sender_name,
        senderAvatar: r.sender_avatar,
        sender_avatar: r.sender_avatar,
        senderRole: r.sender_role,
        sender_role: r.sender_role,
        messageType: r.message_type,
        message_type: r.message_type,
        content: r.content,
        mediaUrl: r.media_url,
        media_url: r.media_url,
        mediaMeta: r.media_meta ? (typeof r.media_meta === 'string' ? JSON.parse(r.media_meta) : r.media_meta) : null,
        media_meta: r.media_meta ? (typeof r.media_meta === 'string' ? JSON.parse(r.media_meta) : r.media_meta) : null,
        isPinned: !!r.is_pinned,
        createdAt: r.created_at,
        created_at: r.created_at
    }));
}

function createChatMessage({ channelId, senderId, messageType = 'text', content = '', mediaUrl = null, mediaMeta = null }) {
    const db = getDb();
    const now = new Date().toISOString();
    const metaString = mediaMeta ? (typeof mediaMeta === 'string' ? mediaMeta : JSON.stringify(mediaMeta)) : null;

    const res = db.prepare(`
        INSERT INTO chat_messages (channel_id, sender_id, message_type, content, media_url, media_meta, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(channelId, senderId, messageType, content, mediaUrl, metaString, now);

    const newId = res.lastInsertRowid;

    // Update sender's last_read_message_id
    db.prepare(`
        UPDATE chat_channel_members
        SET last_read_message_id = ?
        WHERE channel_id = ? AND user_id = ?
    `).run(newId, channelId, senderId);

    const msg = db.prepare(`
        SELECT m.*, u.name as sender_name, u.avatar as sender_avatar, u.role as sender_role
        FROM chat_messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.id = ?
    `).get(newId);

    return {
        id: msg.id,
        channelId: msg.channel_id,
        channel_id: msg.channel_id,
        senderId: msg.sender_id,
        sender_id: msg.sender_id,
        senderName: msg.sender_name,
        sender_name: msg.sender_name,
        senderAvatar: msg.sender_avatar,
        sender_avatar: msg.sender_avatar,
        senderRole: msg.sender_role,
        sender_role: msg.sender_role,
        messageType: msg.message_type,
        message_type: msg.message_type,
        content: msg.content,
        mediaUrl: msg.media_url,
        media_url: msg.media_url,
        mediaMeta: msg.media_meta ? (typeof msg.media_meta === 'string' ? JSON.parse(msg.media_meta) : msg.media_meta) : null,
        media_meta: msg.media_meta ? (typeof msg.media_meta === 'string' ? JSON.parse(msg.media_meta) : msg.media_meta) : null,
        isPinned: !!msg.is_pinned,
        createdAt: msg.created_at,
        created_at: msg.created_at
    };
}

function markChannelRead(channelId, userId, messageId = null) {
    const db = getDb();
    if (!messageId) {
        const last = db.prepare('SELECT MAX(id) as maxId FROM chat_messages WHERE channel_id = ?').get(channelId);
        messageId = last ? (last.maxId || 0) : 0;
    }
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
    const role = (user && user.role) || 'member';

    return db.prepare(`
        INSERT INTO chat_channel_members (channel_id, user_id, role, last_read_message_id, joined_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(channel_id, user_id) DO UPDATE SET
            last_read_message_id = MAX(chat_channel_members.last_read_message_id, excluded.last_read_message_id)
    `).run(channelId, userId, role, messageId, new Date().toISOString());
}

function searchChatMessages(userId, query) {
    const db = getDb();
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
    const isAdmin = user && user.role === 'admin';
    let rows;

    if (isAdmin) {
        rows = db.prepare(`
            SELECT m.*, c.name as channel_name, c.channel_type, u.name as sender_name, u.role as sender_role
            FROM chat_messages m
            JOIN chat_channels c ON m.channel_id = c.id
            JOIN users u ON m.sender_id = u.id
            WHERE (m.content LIKE ? OR m.media_meta LIKE ?)
            ORDER BY m.id DESC
            LIMIT 50
        `).all(`%${query}%`, `%${query}%`);
    } else {
        rows = db.prepare(`
            SELECT m.*, c.name as channel_name, c.channel_type, u.name as sender_name, u.role as sender_role
            FROM chat_messages m
            JOIN chat_channels c ON m.channel_id = c.id
            JOIN chat_channel_members mem ON c.id = mem.channel_id
            JOIN users u ON m.sender_id = u.id
            WHERE mem.user_id = ? AND (m.content LIKE ? OR m.media_meta LIKE ?)
            ORDER BY m.id DESC
            LIMIT 50
        `).all(userId, `%${query}%`, `%${query}%`);
    }

    return rows.map(r => ({
        id: r.id,
        channelId: r.channel_id,
        channelName: r.channel_name,
        channelType: r.channel_type,
        senderId: r.sender_id,
        senderName: r.sender_name,
        senderRole: r.sender_role,
        messageType: r.message_type,
        content: r.content,
        mediaUrl: r.media_url,
        mediaMeta: r.media_meta ? (typeof r.media_meta === 'string' ? JSON.parse(r.media_meta) : r.media_meta) : null,
        createdAt: r.created_at
    }));
}

function setupNewCoachChat(newUserId, newCoachId, coachName, cohortId = null) {
    const db = getDb();
    const now = new Date().toISOString();

    // 1. Add to group channel (primary / general lounge)
    const group = db.prepare("SELECT id FROM chat_channels WHERE channel_type = 'group' AND cohort_id IS NULL ORDER BY id ASC LIMIT 1").get();
    if (group) {
        db.prepare(`
            INSERT OR IGNORE INTO chat_channel_members (channel_id, user_id, role, last_read_message_id, joined_at)
            VALUES (?, ?, 'member', 0, ?)
        `).run(group.id, newUserId, now);
    }

    // 1b. Add to cohort channel if assigned
    if (cohortId) {
        const cohortGroup = db.prepare("SELECT id FROM chat_channels WHERE cohort_id = ? LIMIT 1").get(cohortId);
        if (cohortGroup) {
            db.prepare(`
                INSERT OR IGNORE INTO chat_channel_members (channel_id, user_id, role, last_read_message_id, joined_at)
                VALUES (?, ?, 'member', 0, ?)
            `).run(cohortGroup.id, newUserId, now);
        }
    }

    // 2. Create direct supervisory channel with Master Coach
    const adminUser = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
    if (adminUser) {
        const res = db.prepare(`
            INSERT INTO chat_channels (channel_type, name, description, direct_coach_id, created_at)
            VALUES ('direct', ?, ?, ?, ?)
        `).run(
            `جلسة إشراف فردية - ${coachName}`,
            `قناة الإشراف والتوجيه المهني الفردي المباشر بين الماستر كوتش عبدالكريم والكوتش ${coachName}`,
            newCoachId,
            now
        );
        const directId = res.lastInsertRowid;
        db.prepare(`
            INSERT INTO chat_channel_members (channel_id, user_id, role, last_read_message_id, joined_at)
            VALUES (?, ?, 'admin', 0, ?), (?, ?, 'member', 0, ?)
        `).run(directId, adminUser.id, now, directId, newUserId, now);

        createChatMessage({
            channelId: directId,
            senderId: adminUser.id,
            messageType: 'text',
            content: `مرحباً بك يا كوتش ${coachName} في منظومة تمكين الرؤية لتأهيل الماستر كوتش. هذه القناة مخصصة للمتابعة الإشرافية المباشرة لجلساتك وحالاتك الميدانية واستشاراتك المهنية.`
        });
    }
}

// ====================================================
// Multi-Cohort Management & Fine-Tuning Functions
// ====================================================

function getAllCohorts() {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM cohorts ORDER BY id ASC').all();
    return rows.map(cohort => {
        const coaches = db.prepare(`
            SELECT c.id, c.candidate_code, c.title, c.audit_status, u.name, u.email, u.avatar
            FROM coaches c
            JOIN users u ON c.user_id = u.id
            WHERE c.cohort_id = ?
            ORDER BY c.id ASC
        `).all(cohort.id);

        let totalApprovedTasks = 0;
        let totalRubricSum = 0;
        let rubricCount = 0;
        let certifiedCount = 0;
        let readyCount = 0;
        let inProgressCount = 0;

        coaches.forEach(c => {
            if (c.audit_status === 'certified') certifiedCount++;
            else if (c.audit_status === 'ready') readyCount++;
            else inProgressCount++;

            const taskRow = db.prepare(`SELECT COUNT(*) as cnt FROM tasks WHERE coach_id = ? AND status = 'approved'`).get(c.id);
            totalApprovedTasks += (taskRow ? taskRow.cnt : 0);

            const rRow = db.prepare(`SELECT AVG(level) as avg_level FROM rubrics_evaluations WHERE coach_id = ?`).get(c.id);
            if (rRow && rRow.avg_level) {
                totalRubricSum += rRow.avg_level;
                rubricCount++;
            }
        });

        const coachesCount = coaches.length;
        const approvedTasksAvg = coachesCount > 0 ? parseFloat((totalApprovedTasks / coachesCount).toFixed(1)) : 0;
        const rubricsAvg = rubricCount > 0 ? parseFloat((totalRubricSum / rubricCount).toFixed(2)) : 4.5;
        const targets = cohort.config_json ? JSON.parse(cohort.config_json) : {};
        const targetTasks = targets.tasksTargetCount || 8;
        const progressAvg = coachesCount > 0 ? Math.min(100, Math.round((approvedTasksAvg / targetTasks) * 100)) : 0;

        return {
            id: cohort.id,
            code: cohort.code,
            name: cohort.name,
            description: cohort.description,
            startDate: cohort.start_date,
            start_date: cohort.start_date,
            endDate: cohort.end_date,
            end_date: cohort.end_date,
            status: cohort.status,
            maxCoaches: cohort.max_coaches,
            max_coaches: cohort.max_coaches,
            targets,
            coachesCount,
            certifiedCount,
            readyCount,
            inProgressCount,
            approvedTasksAvg,
            rubricsAvg,
            progressAvg,
            coaches,
            createdAt: cohort.created_at
        };
    });
}

function getCohortById(id) {
    const db = getDb();
    const cohort = db.prepare('SELECT * FROM cohorts WHERE id = ?').get(id);
    if (!cohort) return null;

    const coaches = db.prepare(`
        SELECT c.id, c.candidate_code, c.title, c.audit_status, c.enrollment_date, u.name, u.email, u.avatar, u.phone
        FROM coaches c
        JOIN users u ON c.user_id = u.id
        WHERE c.cohort_id = ?
        ORDER BY c.id ASC
    `).all(cohort.id);

    const coachesWithStats = coaches.map(c => {
        const tStats = db.prepare(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
                SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as submitted
            FROM tasks WHERE coach_id = ?
        `).get(c.id);

        const rStats = db.prepare('SELECT AVG(level) as avg_level FROM rubrics_evaluations WHERE coach_id = ?').get(c.id);
        const toolsStats = db.prepare('SELECT COUNT(*) as count FROM tool_applications WHERE coach_id = ?').get(c.id);

        return {
            ...c,
            approvedTasks: tStats ? tStats.approved : 0,
            submittedTasks: tStats ? tStats.submitted : 0,
            toolsCount: toolsStats ? toolsStats.count : 0,
            rubricsAvg: rStats && rStats.avg_level ? parseFloat(rStats.avg_level.toFixed(2)) : 0
        };
    });

    const targets = cohort.config_json ? JSON.parse(cohort.config_json) : {};
    return {
        id: cohort.id,
        code: cohort.code,
        name: cohort.name,
        description: cohort.description,
        startDate: cohort.start_date,
        start_date: cohort.start_date,
        endDate: cohort.end_date,
        end_date: cohort.end_date,
        status: cohort.status,
        maxCoaches: cohort.max_coaches,
        max_coaches: cohort.max_coaches,
        targets,
        coachesCount: coachesWithStats.length,
        coaches: coachesWithStats,
        createdAt: cohort.created_at
    };
}

function createCohort({ code, name, description, startDate, endDate, status = 'active', maxCoaches = 30, targets, adminUserId, adminName }) {
    const db = getDb();
    const now = new Date().toISOString();
    const targetsJson = JSON.stringify(targets || {
        tasksTargetCount: 8,
        totalHoursTarget: 240,
        hoursBreakdown: { H1: 100, H2: 30, H3: 40, H4: 20, H5: 50 },
        toolQuotas: { mbti: 30, wheelOfLife: 30, swot: 30 },
        minRubricScore: 3.0,
        criticalEthicsStrict: true,
        rubricsWeights: { sessions: 100, portfolio: 100, paper: 100, project: 100, interview: 100, supervision: 100 }
    });

    const res = db.prepare(`
        INSERT INTO cohorts (code, name, description, start_date, end_date, status, max_coaches, config_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(code.trim(), name.trim(), description || '', startDate, endDate || null, status, maxCoaches || 30, targetsJson, now);

    const cohortId = res.lastInsertRowid;

    // Automatically create dedicated Cohort Group Chat channel
    const chatRes = db.prepare(`
        INSERT INTO chat_channels (channel_type, name, description, direct_coach_id, cohort_id, created_at)
        VALUES ('group', ?, ?, null, ?, ?)
    `).run(`ديوان ${name.trim()}`, `الديوان التفاعلي المخصص لأعضاء دفعة ${name.trim()}`, cohortId, now);
    const chatId = chatRes.lastInsertRowid;

    // Add admin to this cohort channel
    if (adminUserId) {
        db.prepare(`
            INSERT OR IGNORE INTO chat_channel_members (channel_id, user_id, role, last_read_message_id, joined_at)
            VALUES (?, ?, 'admin', 0, ?)
        `).run(chatId, adminUserId, now);
    } else {
        const adminUser = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
        if (adminUser) {
            db.prepare(`
                INSERT OR IGNORE INTO chat_channel_members (channel_id, user_id, role, last_read_message_id, joined_at)
                VALUES (?, ?, 'admin', 0, ?)
            `).run(chatId, adminUser.id, now);
        }
    }

    logAuditAction({
        adminId: adminUserId || null,
        adminName: adminName || 'الماستر كوتش المشرف',
        action: 'CREATE_COHORT',
        targetType: 'cohort',
        targetId: cohortId,
        details: `إنشاء الدفعة التدريبية: ${name.trim()} (${code.trim()})`,
        metadata: { code, name, maxCoaches }
    });

    return getCohortById(cohortId);
}

function updateCohort(id, { code, name, description, startDate, endDate, status, maxCoaches, targets, adminUserId, adminName }) {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM cohorts WHERE id = ?').get(id);
    if (!existing) return null;

    if (code && code.trim() && code.trim() !== existing.code) {
        const dup = db.prepare('SELECT id FROM cohorts WHERE code = ? AND id != ?').get(code.trim(), id);
        if (dup) throw new Error('كود الدفعة التعريفي مستخدم مسبقاً في دفعة أخرى');
    }

    let targetsJson = existing.config_json;
    if (targets) {
        const merged = { ...(existing.config_json ? JSON.parse(existing.config_json) : {}), ...targets };
        targetsJson = JSON.stringify(merged);
    }

    db.prepare(`
        UPDATE cohorts
        SET code = COALESCE(?, code),
            name = COALESCE(?, name),
            description = COALESCE(?, description),
            start_date = COALESCE(?, start_date),
            end_date = COALESCE(?, end_date),
            status = COALESCE(?, status),
            max_coaches = COALESCE(?, max_coaches),
            config_json = ?
        WHERE id = ?
    `).run(
        code ? code.trim() : null,
        name ? name.trim() : null,
        description !== undefined ? description : null,
        startDate || null,
        endDate || null,
        status || null,
        maxCoaches || null,
        targetsJson,
        id
    );

    if (name) {
        db.prepare('UPDATE chat_channels SET name = ? WHERE cohort_id = ?').run(`ديوان ${name.trim()}`, id);
    }

    logAuditAction({
        adminId: adminUserId || null,
        adminName: adminName || 'الماستر كوتش المشرف',
        action: 'UPDATE_COHORT',
        targetType: 'cohort',
        targetId: id,
        details: `تحديث بيانات ومستهدفات الدفعة #${id}: ${name || existing.name}`,
        metadata: { code: code || existing.code, name, status, maxCoaches }
    });

    return getCohortById(id);
}

function deleteCohort(id, adminUserId, adminName) {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM cohorts WHERE id = ?').get(id);
    if (!existing) return false;

    // Unassign coaches from this cohort
    db.prepare('UPDATE coaches SET cohort_id = NULL WHERE cohort_id = ?').run(id);

    // Delete cohort chat channel and its members/messages
    const channels = db.prepare('SELECT id FROM chat_channels WHERE cohort_id = ?').all(id);
    for (const channel of channels) {
        db.prepare('DELETE FROM chat_messages WHERE channel_id = ?').run(channel.id);
        db.prepare('DELETE FROM chat_channel_members WHERE channel_id = ?').run(channel.id);
        db.prepare('DELETE FROM chat_channels WHERE id = ?').run(channel.id);
    }

    db.prepare('DELETE FROM cohorts WHERE id = ?').run(id);

    logAuditAction({
        adminId: adminUserId || null,
        adminName: adminName || 'الماستر كوتش المشرف',
        action: 'DELETE_COHORT',
        targetType: 'cohort',
        targetId: id,
        details: `حذف/أرشفة الدفعة التدريبية: ${existing.name} (${existing.code})`,
        metadata: { code: existing.code, name: existing.name }
    });

    return true;
}

function assignCoachesToCohort(cohortId, coachIds, adminUserId, adminName) {
    const db = getDb();
    const cohort = db.prepare('SELECT * FROM cohorts WHERE id = ?').get(cohortId);
    if (!cohort) throw new Error('الدفعة التدريبية غير موجودة');

    const channel = db.prepare('SELECT id FROM chat_channels WHERE cohort_id = ?').get(cohortId);
    const now = new Date().toISOString();
    const ids = Array.isArray(coachIds) ? coachIds.map(Number) : [Number(coachIds)];

    // 1. Unassign coaches currently in this cohort who are NOT in ids
    const currentCoaches = db.prepare('SELECT c.id, c.user_id FROM coaches c WHERE c.cohort_id = ?').all(cohortId);
    const coachesToUnassign = currentCoaches.filter(c => !ids.includes(c.id));
    for (const c of coachesToUnassign) {
        db.prepare('UPDATE coaches SET cohort_id = NULL WHERE id = ?').run(c.id);
        if (channel) {
            db.prepare('DELETE FROM chat_channel_members WHERE channel_id = ? AND user_id = ?').run(channel.id, c.user_id);
        }
    }

    // 2. Assign specified coaches to this cohort
    const updateCoach = db.prepare('UPDATE coaches SET cohort_id = ? WHERE id = ?');
    const getCoachInfo = db.prepare('SELECT user_id, cohort_id FROM coaches WHERE id = ?');
    const insertMember = db.prepare(`
        INSERT OR IGNORE INTO chat_channel_members (channel_id, user_id, role, last_read_message_id, joined_at)
        VALUES (?, ?, 'member', 0, ?)
    `);

    const cohortTargets = cohort.config_json ? JSON.parse(cohort.config_json) : null;

    for (const cId of ids) {
        const coachInfo = getCoachInfo.get(cId);
        if (!coachInfo) continue;

        // If coach was in another cohort, remove from old cohort chat channel
        if (coachInfo.cohort_id && coachInfo.cohort_id !== cohortId) {
            const oldChannel = db.prepare('SELECT id FROM chat_channels WHERE cohort_id = ?').get(coachInfo.cohort_id);
            if (oldChannel) {
                db.prepare('DELETE FROM chat_channel_members WHERE channel_id = ? AND user_id = ?').run(oldChannel.id, coachInfo.user_id);
            }
        }

        updateCoach.run(cohortId, cId);
        if (channel) {
            insertMember.run(channel.id, coachInfo.user_id, now);
        }

        // Apply cohort targets if coach state exists
        if (cohortTargets) {
            const stateRow = db.prepare('SELECT state_json FROM coach_program_state WHERE coach_id = ?').get(cId);
            if (stateRow) {
                const state = JSON.parse(stateRow.state_json);
                state.targetsConfig = cohortTargets;
                if (!state.customTargets) {
                    if (cohortTargets.totalHoursTarget !== undefined && state.metadata) {
                        state.metadata.totalTargetHours = cohortTargets.totalHoursTarget;
                    }
                    if (cohortTargets.hoursBreakdown && Array.isArray(state.hours)) {
                        state.hours.forEach(h => {
                            if (cohortTargets.hoursBreakdown[h.id] !== undefined) {
                                h.target = cohortTargets.hoursBreakdown[h.id];
                            }
                        });
                    }
                    if (cohortTargets.toolQuotas && state.toolsSummary) {
                        ['mbti', 'wheelOfLife', 'swot'].forEach(tool => {
                            if (cohortTargets.toolQuotas[tool] !== undefined && state.toolsSummary[tool]) {
                                state.toolsSummary[tool].target = cohortTargets.toolQuotas[tool];
                            }
                        });
                    }
                    if (cohortTargets.tasksTargetCount !== undefined) {
                        state.tasksTargetCount = cohortTargets.tasksTargetCount;
                        if (state.metadata) state.metadata.tasksTarget = cohortTargets.tasksTargetCount;
                    }
                }
                db.prepare('UPDATE coach_program_state SET state_json = ?, updated_at = ? WHERE coach_id = ?')
                    .run(JSON.stringify(state), now, cId);
            }
        }
    }

    logAuditAction({
        adminId: adminUserId || null,
        adminName: adminName || 'الماستر كوتش المشرف',
        action: 'ASSIGN_COACHES',
        targetType: 'cohort',
        targetId: cohortId,
        details: `تعيين ${ids.length} كوتش في الدفعة: ${cohort.name} (وإلغاء تعيين ${coachesToUnassign.length})`,
        metadata: { cohortId, coachIds: ids, unassignedCount: coachesToUnassign.length }
    });

    return getCohortById(cohortId);
}

function syncCohortTargetsToCoaches(cohortId, adminUserId, adminName) {
    const db = getDb();
    const cohort = db.prepare('SELECT * FROM cohorts WHERE id = ?').get(cohortId);
    if (!cohort) throw new Error('الدفعة التدريبية غير موجودة');

    const targets = cohort.config_json ? JSON.parse(cohort.config_json) : {};
    const coaches = db.prepare('SELECT id FROM coaches WHERE cohort_id = ?').all(cohortId);
    const now = new Date().toISOString();

    for (const c of coaches) {
        const stateRow = db.prepare('SELECT state_json FROM coach_program_state WHERE coach_id = ?').get(c.id);
        if (stateRow) {
            const state = JSON.parse(stateRow.state_json);
            state.targetsConfig = targets;

            // Apply hours breakdown targets if present
            if (targets.hoursBreakdown && Array.isArray(state.hours)) {
                state.hours.forEach(h => {
                    if (targets.hoursBreakdown[h.id] !== undefined) {
                        h.target = targets.hoursBreakdown[h.id];
                    }
                });
            }

            // Apply tools quotas if present
            if (targets.toolQuotas && state.toolsSummary) {
                ['mbti', 'wheelOfLife', 'swot'].forEach(tool => {
                    if (targets.toolQuotas[tool] !== undefined && state.toolsSummary[tool]) {
                        state.toolsSummary[tool].target = targets.toolQuotas[tool];
                    }
                });
            }

            if (targets.totalHoursTarget !== undefined && state.metadata) {
                state.metadata.totalTargetHours = targets.totalHoursTarget;
            }

            if (targets.tasksTargetCount !== undefined) {
                state.tasksTargetCount = targets.tasksTargetCount;
                if (state.metadata) state.metadata.tasksTarget = targets.tasksTargetCount;
            }

            db.prepare('UPDATE coach_program_state SET state_json = ?, updated_at = ? WHERE coach_id = ?')
                .run(JSON.stringify(state), now, c.id);
        }
    }

    logAuditAction({
        adminId: adminUserId || null,
        adminName: adminName || 'الماستر كوتش المشرف',
        action: 'SYNC_TARGETS',
        targetType: 'cohort',
        targetId: cohortId,
        details: `مزامنة وتعميم مستهدفات الدفعة (${cohort.name}) على ${coaches.length} كوتش منتسب`,
        metadata: { cohortId, syncedCoachesCount: coaches.length, targets }
    });

    return { success: true, syncedCoachesCount: coaches.length, targets };
}

function tuneCoachTargets(coachId, customTargets, adminUserId, adminName) {
    const db = getDb();
    const coach = db.prepare('SELECT c.*, u.name as coach_name FROM coaches c JOIN users u ON c.user_id = u.id WHERE c.id = ?').get(coachId);
    if (!coach) throw new Error('الكوتش غير موجود');

    const stateRow = db.prepare('SELECT state_json FROM coach_program_state WHERE coach_id = ?').get(coachId);
    if (!stateRow) throw new Error('بيانات ملف الكوتش غير موجودة');

    const state = JSON.parse(stateRow.state_json);
    const now = new Date().toISOString();

    state.customTargets = {
        ...(state.customTargets || {}),
        ...customTargets,
        tunedBy: adminName || 'الماستر كوتش عبدالكريم الخليفي',
        tunedAt: now
    };

    if (customTargets.totalHoursTarget !== undefined && state.metadata) {
        state.metadata.totalTargetHours = customTargets.totalHoursTarget;
    }

    if (customTargets.hoursBreakdown && Array.isArray(state.hours)) {
        state.hours.forEach(h => {
            if (customTargets.hoursBreakdown[h.id] !== undefined) {
                h.target = customTargets.hoursBreakdown[h.id];
            }
        });
    }

    if (customTargets.toolQuotas && state.toolsSummary) {
        ['mbti', 'wheelOfLife', 'swot'].forEach(tool => {
            if (customTargets.toolQuotas[tool] !== undefined && state.toolsSummary[tool]) {
                state.toolsSummary[tool].target = customTargets.toolQuotas[tool];
            }
        });
    }

    if (customTargets.tasksTargetCount !== undefined) {
        state.tasksTargetCount = customTargets.tasksTargetCount;
        if (state.metadata) state.metadata.tasksTarget = customTargets.tasksTargetCount;
    }

    db.prepare('UPDATE coach_program_state SET state_json = ?, updated_at = ? WHERE coach_id = ?')
        .run(JSON.stringify(state), now, coachId);

    logAuditAction({
        adminId: adminUserId || null,
        adminName: adminName || 'الماستر كوتش المشرف',
        action: 'TUNE_COACH_TARGETS',
        targetType: 'coach',
        targetId: coachId,
        details: `تخصيص المستهدفات الدقيقة للكوتش ${coach.coach_name} (${coach.candidate_code}): ${customTargets.notes || 'تعديل الساعات والمهام العلاجية'}`,
        metadata: { coachId, customTargets }
    });

    return { success: true, coachId, customTargets: state.customTargets };
}

function resetCoachPassword(coachId, newPassword, adminUserId, adminName) {
    const db = getDb();
    const coach = db.prepare('SELECT c.*, u.name as coach_name FROM coaches c JOIN users u ON c.user_id = u.id WHERE c.id = ?').get(coachId);
    if (!coach) throw new Error('الكوتش غير موجود');

    if (!newPassword || newPassword.trim().length < 6) {
        throw new Error('يجب أن تتكون كلمة المرور الجديدة من 6 أحرف على الأقل');
    }

    const now = new Date().toISOString();
    const hash = bcrypt.hashSync(newPassword.trim(), 10);
    db.prepare('UPDATE users SET password_hash = ?, password_reset_at = ? WHERE id = ?').run(hash, now, coach.user_id);

    logAuditAction({
        adminId: adminUserId || null,
        adminName: adminName || 'الماستر كوتش المشرف',
        action: 'RESET_PASSWORD',
        targetType: 'coach',
        targetId: coachId,
        details: `إعادة تعيين وتغيير كلمة المرور للكوتش: ${coach.coach_name} (${coach.candidate_code})`,
        metadata: { coachId, coachName: coach.coach_name }
    });

    return { success: true, message: `تم تحديث كلمة المرور بنجاح للكوتش ${coach.coach_name}` };
}

function logAuditAction({ adminId, adminName, action, targetType, targetId, details, metadata }) {
    try {
        const db = getDb();
        const now = new Date().toISOString();
        const metaStr = metadata ? (typeof metadata === 'string' ? metadata : JSON.stringify(metadata)) : null;
        db.prepare(`
            INSERT INTO audit_logs (admin_id, admin_name, action, target_type, target_id, details, metadata_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(adminId || null, adminName || 'الماستر كوتش المشرف', action, targetType || null, targetId || null, details || '', metaStr, now);
    } catch (e) {
        console.error('Failed to log audit action:', e.message);
    }
}

function getAuditLogs({ limit = 50, action, targetType, targetId } = {}) {
    const db = getDb();
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];

    if (action) {
        query += ' AND action = ?';
        params.push(action);
    }
    if (targetType) {
        query += ' AND target_type = ?';
        params.push(targetType);
    }
    if (targetId) {
        query += ' AND target_id = ?';
        params.push(targetId);
    }

    query += ' ORDER BY id DESC LIMIT ?';
    params.push(parseInt(limit, 10) || 50);

    const rows = db.prepare(query).all(...params);
    return rows.map(r => ({
        id: r.id,
        adminId: r.admin_id,
        adminName: r.admin_name,
        action: r.action,
        targetType: r.target_type,
        targetId: r.target_id,
        details: r.details,
        metadata: r.metadata_json ? JSON.parse(r.metadata_json) : null,
        createdAt: r.created_at
    }));
}

function getCohortExecutiveReport(cohortId) {
    const cohort = getCohortById(cohortId);
    if (!cohort) return null;

    const totalEnrolled = cohort.coaches.length;
    let certifiedCount = 0;
    let readyCount = 0;
    let inProgressCount = 0;
    let totalTasksApproved = 0;
    let totalTools = 0;
    let rubricsSum = 0;

    cohort.coaches.forEach(c => {
        if (c.audit_status === 'certified') certifiedCount++;
        else if (c.audit_status === 'ready') readyCount++;
        else inProgressCount++;

        totalTasksApproved += (c.approvedTasks || 0);
        totalTools += (c.toolsCount || 0);
        rubricsSum += (c.rubricsAvg || 0);
    });

    const tasksTarget = cohort.targets.tasksTargetCount || 8;
    const toolsTarget = (cohort.targets.toolQuotas ? (cohort.targets.toolQuotas.mbti + cohort.targets.toolQuotas.wheelOfLife + cohort.targets.toolQuotas.swot) : 90);
    const avgTasksRate = totalEnrolled > 0 ? Math.min(100, Math.round(((totalTasksApproved / totalEnrolled) / tasksTarget) * 100)) : 0;
    const avgToolsRate = totalEnrolled > 0 ? Math.min(100, Math.round(((totalTools / totalEnrolled) / toolsTarget) * 100)) : 0;
    const avgRubricLevel = totalEnrolled > 0 ? parseFloat((rubricsSum / totalEnrolled).toFixed(2)) : 0;

    return {
        reportId: `REP-COHORT-${cohort.code}-${Date.now()}`,
        generatedAt: new Date().toISOString(),
        institution: 'شركة تمكين الرؤية للاستشارات المهنية - cyce52.com',
        program: 'برنامج إعداد وتأهيل الماستر كوتش 3.0',
        accreditationBody: 'الاتحاد العربي للكوتشنج',
        supervisor: 'الماستر كوتش د. عبدالكريم الخليفي',
        cohort: {
            id: cohort.id,
            code: cohort.code,
            name: cohort.name,
            description: cohort.description,
            startDate: cohort.startDate,
            endDate: cohort.endDate,
            status: cohort.status,
            maxCoaches: cohort.maxCoaches,
            targets: cohort.targets
        },
        targets: cohort.targets,
        summary: {
            totalEnrolled,
            totalEnrolledCoaches: totalEnrolled,
            certifiedCount,
            readyCount,
            inProgressCount,
            cohortAverageProgress: avgTasksRate,
            cohortRubricsAverage: avgRubricLevel || 4.7,
            graduationReadinessPercentage: totalEnrolled > 0 ? Math.round(((certifiedCount + readyCount) / totalEnrolled) * 100) : 0,
            tasksComplianceRate: `${avgTasksRate}%`,
            toolsComplianceRate: `${avgToolsRate}%`
        },
        executiveSummary: {
            totalEnrolled,
            totalEnrolledCoaches: totalEnrolled,
            certifiedCount,
            readyCount,
            inProgressCount,
            cohortAverageProgress: avgTasksRate,
            cohortRubricsAverage: avgRubricLevel || 4.7,
            graduationReadinessPercentage: totalEnrolled > 0 ? Math.round(((certifiedCount + readyCount) / totalEnrolled) * 100) : 0,
            tasksComplianceRate: `${avgTasksRate}%`,
            toolsComplianceRate: `${avgToolsRate}%`,
            rubricsAverageScore: avgRubricLevel || 4.7
        },
        roster: cohort.coaches.map(c => ({
            id: c.id,
            candidateCode: c.candidate_code,
            name: c.name,
            email: c.email,
            phone: c.phone,
            title: c.title,
            enrollmentDate: c.enrollment_date,
            auditStatus: c.audit_status,
            approvedTasks: c.approvedTasks,
            approvedTasksCount: c.approvedTasks || 0,
            tasksTarget,
            toolsCount: c.toolsCount,
            toolsTarget,
            rubricsAvg: c.rubricsAvg,
            rubricsAverage: c.rubricsAvg || 4.5,
            progressPercentage: tasksTarget > 0 ? Math.min(100, Math.round(((c.approvedTasks || 0) / tasksTarget) * 100)) : 0
        })),
        recommendations: [
            'الاستمرار في المتابعة الإشرافية الميدانية عبر جلسات التدقيق الثنائية في الديوان.',
            'التأكيد على استيفاء متطلبات البوابة الأخلاقية المستقلة قبل جلسة التحكيم الختامية.',
            'عقد ورشة تحضيرية لملفات الإنجاز المهني ومناقشة مشروعات التخرج المبتكرة.'
        ]
    };
}

// ============================================================================
// Live Supervisory Notifications Hub Data Access Layer
// ============================================================================

function seedDefaultNotificationsForUser(db, userId, role = 'coach') {
    const now = new Date();
    const minutesAgo = (m) => new Date(now.getTime() - m * 60000).toISOString();

    const insert = db.prepare(`
        INSERT INTO notifications (user_id, type, title, message, link_tab, link_id, metadata_json, is_read, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    if (role === 'coach') {
        insert.run(
            userId,
            'voice_note',
            'ملاحظة صوتية إشرافية جديدة',
            'أضاف الماستر كوتش عبدالكريم الخليفي توجيهاً صوتياً تفصيلياً على بطاقة المهمة [TASK-01: كوتشنج القيادة وإدارة التغيير].',
            'tasks',
            'TASK-01',
            JSON.stringify({ duration: '03:45', supervisor: 'الماستر كوتش عبدالكريم الخليفي' }),
            0,
            minutesAgo(15)
        );
        insert.run(
            userId,
            'task_review',
            'اعتماد تدقيق المهمة [TASK-04]',
            'تمت مراجعة خطة تهيئة المنظمة للكوتشنج وإجازة مصفوفة التدخلات المؤسسية بنجاح.',
            'tasks',
            'TASK-04',
            JSON.stringify({ status: 'approved', grade: 5.0 }),
            0,
            minutesAgo(65)
        );
        insert.run(
            userId,
            'rubric_eval',
            'تحديث تقييم روبرك الورقة العلمية (RUB-RES)',
            'حقق ملف إنجازك المستوى 5.00/5.00 في معيار التأصيل المنهجي والمطابقة لـ APA 7 مع التوصية بالنشر.',
            'rubrics',
            'RUB-RES',
            JSON.stringify({ score: 5.0, rubricCode: 'RUB-RES' }),
            0,
            minutesAgo(180)
        );
        insert.run(
            userId,
            'cohort_update',
            'إعلان رسمي لدفعة الرواد 2026',
            'تم فتح نافذة إيداع مشروعات التخرج وتحديد مواعيد جلسات الدفاع ومناقشة الأوراق التطبيقية.',
            'quant',
            'COH-2026-Q1',
            JSON.stringify({ cohortCode: '2026-Q1' }),
            0,
            minutesAgo(360)
        );
        insert.run(
            userId,
            'ethics_alert',
            'إشعار سلامة مهنية وأخلاقية',
            'تم استيفاء وتدقيق كافة نقاط الفحص الأخلاقي السبعة وسجل الإحالات التخصصية بنسبة 100%.',
            'ethics',
            'ETH-GATE',
            JSON.stringify({ clearance: '100% Passed' }),
            1,
            minutesAgo(720)
        );
        insert.run(
            userId,
            'chat_msg',
            'رسالة جديدة في ديوان الزمالة',
            'شارك الماستر كوتش توجيهات حول فك مقاومة الإفصاح وبناء الأمان النفسي في الكوتشنج التنفيذي.',
            'chat',
            'group',
            JSON.stringify({ channel: 'group' }),
            1,
            minutesAgo(1440)
        );
    } else if (role === 'admin') {
        insert.run(
            userId,
            'task_review',
            'تسليم مهمة جديدة بانتظار التدقيق',
            'أودع الكوتش أحمد بن صالح الشمري تقرير الحالة واستمارة التأمل الرباعية للمهمة [TASK-01].',
            'admin-dashboard',
            'TASK-01',
            JSON.stringify({ coachName: 'كوتش أحمد بن صالح الشمري', taskId: 'TASK-01' }),
            0,
            minutesAgo(25)
        );
        insert.run(
            userId,
            'ethics_alert',
            'توثيق إحالة أخلاقية نموذجية',
            'قام الكوتش أحمد الشمري بإيداع وتوثيق حالة إحالة طبية تخصصية (REF-2026-01) مع نزع تام للهوية.',
            'admin-dashboard',
            'REF-2026-01',
            JSON.stringify({ caseRef: 'REF-2026-01' }),
            0,
            minutesAgo(90)
        );
        insert.run(
            userId,
            'cohort_update',
            'تقرير مؤشرات دفعة الرواد (2026-Q1)',
            'تجاوز متوسط الروبركات في دفعة الرواد 4.88 مع استيفاء 100% من الساعات المستهدفة.',
            'admin-dashboard',
            'cohorts',
            JSON.stringify({ cohortId: 1 }),
            1,
            minutesAgo(300)
        );
    }
}

function createNotification(payload) {
    let { userId, type, title, message, linkTab = null, linkId = null, linkAction = null, metadata = null } = payload;
    if (linkAction && !linkId) linkId = linkAction;
    const db = getDb();
    const now = new Date().toISOString();
    const metadataJson = metadata ? (typeof metadata === 'string' ? metadata : JSON.stringify(metadata)) : null;

    const res = db.prepare(`
        INSERT INTO notifications (user_id, type, title, message, link_tab, link_id, metadata_json, is_read, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).run(userId, type, title, message, linkTab, linkId, metadataJson, now);

    const notification = {
        id: res.lastInsertRowid,
        userId,
        type,
        title,
        message,
        linkTab,
        linkId,
        linkAction: linkAction || linkId,
        metadata: metadata ? (typeof metadata === 'object' ? metadata : JSON.parse(metadataJson)) : null,
        isRead: false,
        createdAt: now
    };

    try {
        const wsModule = require('./websocket');
        if (wsModule && typeof wsModule.broadcastNotificationViaWS === 'function') {
            wsModule.broadcastNotificationViaWS(userId, notification);
        }
    } catch (_) {}

    return notification;
}

function getNotifications(userId, options = {}) {
    const db = getDb();
    const { type, unreadOnly, limit = 50 } = options;
    let query = `SELECT * FROM notifications WHERE user_id = ?`;
    const params = [userId];

    if (type && type !== 'ALL') {
        query += ` AND type = ?`;
        params.push(type);
    }
    if (unreadOnly) {
        query += ` AND is_read = 0`;
    }
    query += ` ORDER BY id DESC LIMIT ?`;
    params.push(limit);

    const rows = db.prepare(query).all(...params);
    return rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        type: r.type,
        title: r.title,
        message: r.message,
        linkTab: r.link_tab,
        linkId: r.link_id,
        metadata: r.metadata_json ? JSON.parse(r.metadata_json) : null,
        isRead: r.is_read === 1,
        createdAt: r.created_at
    }));
}

function getUnreadNotificationsCount(userId) {
    const db = getDb();
    const row = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0').get(userId);
    return row ? row.count : 0;
}

function markNotificationAsRead(id, userId) {
    const db = getDb();
    const res = db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(id, userId);
    return res.changes > 0;
}

function markAllNotificationsAsRead(userId) {
    const db = getDb();
    const res = db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0').run(userId);
    return res.changes;
}

function deleteNotification(id, userId) {
    const db = getDb();
    const res = db.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?').run(id, userId);
    return res.changes > 0;
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
    updateCoachState,
    getChatChannelsForUser,
    getChannelById,
    isUserChannelMember,
    getChannelMessages,
    createChatMessage,
    markChannelRead,
    searchChatMessages,
    setupNewCoachChat,
    resetCoachData,
    // Multi-Cohort Management & Administrative Suite
    getAllCohorts,
    getCohortById,
    createCohort,
    updateCohort,
    deleteCohort,
    assignCoachesToCohort,
    syncCohortTargetsToCoaches,
    tuneCoachTargets,
    resetCoachPassword,
    logAuditAction,
    getAuditLogs,
    getCohortExecutiveReport,
    // Live Notifications Hub
    createNotification,
    getNotifications,
    getUnreadNotificationsCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    seedDefaultNotificationsForUser,
    normalizeArabic
};
