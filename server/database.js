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

        CREATE TABLE IF NOT EXISTS chat_channels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            channel_type TEXT NOT NULL CHECK(channel_type IN ('direct', 'group')),
            name TEXT NOT NULL,
            description TEXT,
            direct_coach_id INTEGER REFERENCES coaches(id) ON DELETE CASCADE,
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

function setupNewCoachChat(newUserId, newCoachId, coachName) {
    const db = getDb();
    const now = new Date().toISOString();

    // 1. Add to group channel
    const group = db.prepare("SELECT id FROM chat_channels WHERE channel_type = 'group' LIMIT 1").get();
    if (group) {
        db.prepare(`
            INSERT OR IGNORE INTO chat_channel_members (channel_id, user_id, role, last_read_message_id, joined_at)
            VALUES (?, ?, 'member', 0, ?)
        `).run(group.id, newUserId, now);
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
    setupNewCoachChat
};
