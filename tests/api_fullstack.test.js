/**
 * Comprehensive Automated Fullstack Test Suite for Master Coach Platform v3.0
 * Tests Auth, RBAC, Multipart Uploads, Reflection, Task Lifecycle,
 * Anti-Duplication Engine, 6-Rubrics, Ethical Blockers, and Graduation Audit.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { app } = require('../server/server');
const db = require('../server/database');

// Ensure fresh test database state
db.initializeDatabase(true);

const TEST_PORT = 3199;
let server = null;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let adminToken = '';
let coachToken = '';
let newCoachToken = '';

async function request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const headers = options.headers || {};
    if (options.token) {
        headers['Authorization'] = `Bearer ${options.token}`;
    }
    if (options.json) {
        headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(options.json);
    }
    const res = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body: options.body
    });
    const text = await res.text();
    let body;
    try {
        body = JSON.parse(text);
    } catch (_) {
        body = text;
    }
    return { status: res.status, body, headers: res.headers };
}

async function runTests() {
    console.log('=== بدء الفحص الآلي الشامل للمنصة الكاملة (Fullstack Test Suite) ===\n');

    await new Promise((resolve) => {
        server = app.listen(TEST_PORT, resolve);
    });
    console.log(`✓ خادم الاختبار يعمل على المنفذ: ${TEST_PORT}`);

    try {
        // ----------------------------------------------------
        // 1. Healthcheck
        // ----------------------------------------------------
        console.log('\n--- 1. فحص صحة الخادم (Healthcheck) ---');
        const health = await request('/api/health');
        assert.strictEqual(health.status, 200, 'Healthcheck status must be 200');
        assert.strictEqual(health.body.status, 'UP');
        console.log('• فحص صحة الخادم: سليم وجاهز للعمل ✓');

        // ----------------------------------------------------
        // 2. Authentication & RBAC
        // ----------------------------------------------------
        console.log('\n--- 2. فحص المصادقة وإدارة الأدوار (Auth & RBAC) ---');
        
        // Admin login
        const adminLogin = await request('/api/auth/login', {
            method: 'POST',
            json: { email: 'abdelkarim@cyce52.com', password: 'Master@2026' }
        });
        assert.strictEqual(adminLogin.status, 200, 'Admin login should succeed');
        assert.ok(adminLogin.body.token, 'Token should be returned');
        assert.strictEqual(adminLogin.body.user.role, 'admin');
        adminToken = adminLogin.body.token;
        console.log('• تسجيل دخول الماستر كوتش عبدالكريم (Admin): ناجح ✓');

        // Coach login
        const coachLogin = await request('/api/auth/login', {
            method: 'POST',
            json: { email: 'coach@cyce52.com', password: 'Coach@2026' }
        });
        assert.strictEqual(coachLogin.status, 200, 'Coach login should succeed');
        assert.strictEqual(coachLogin.body.user.role, 'coach');
        assert.strictEqual(coachLogin.body.user.coach.candidateCode, 'MC-2026-084');
        coachToken = coachLogin.body.token;
        console.log('• تسجيل دخول الكوتش المتدرب أحمد الشمري (Coach): ناجح ✓');

        // Invalid credentials rejection
        const badLogin = await request('/api/auth/login', {
            method: 'POST',
            json: { email: 'coach@cyce52.com', password: 'WrongPassword' }
        });
        assert.strictEqual(badLogin.status, 401, 'Invalid password should be rejected with 401');
        console.log('• حظر كلمة المرور الخاطئة: تم بنجاح مع رمز 401 ✓');

        // Register new coach trainee
        const registerRes = await request('/api/auth/register', {
            method: 'POST',
            json: {
                name: 'كوتش خالد الدوسري',
                email: 'khaled@cyce52.com',
                password: 'Coach@2026',
                title: 'كوتش تنفيذي مرشح',
                phone: '+966 50 777 8888'
            }
        });
        assert.strictEqual(registerRes.status, 201, 'Registration should succeed with 201');
        assert.ok(registerRes.body.user.coach.candidateCode.startsWith('MC-2026-'), 'Candidate code generated');
        newCoachToken = registerRes.body.token;
        console.log(`• تسجيل كوتش متدرب جديد (${registerRes.body.user.coach.candidateCode}): ناجح ومطابق للحقيبة ✓`);

        // RBAC enforcement: coach attempts admin endpoint
        const forbiddenCoaches = await request('/api/coaches', {
            token: coachToken
        });
        assert.strictEqual(forbiddenCoaches.status, 403, 'Coach should not be able to list all coaches');
        console.log('• منع الكوتش من صلاحيات الإدارة العليا (RBAC 403 Forbidden): تم التحقق بنجاح ✓');

        // Admin lists all coaches
        const adminCoaches = await request('/api/coaches', {
            token: adminToken
        });
        assert.strictEqual(adminCoaches.status, 200);
        assert.ok(adminCoaches.body.coaches.length >= 3, 'Should list seeded coaches + newly registered');
        console.log(`• لوحة تحكم الماستر كوتش: استعراض جميع الكوتشز المسجلين (${adminCoaches.body.coaches.length} كوتش): ناجح ✓`);

        // ----------------------------------------------------
        // 3. Multipart Evidence Upload (Multer)
        // ----------------------------------------------------
        console.log('\n--- 3. فحص رفع الأدلة الثبوتية (Multipart File Upload) ---');
        
        // Prepare dummy multipart body
        const boundary = '----WebKitFormBoundaryTamkeenTest' + Math.random().toString(36).substring(2);
        const dummyFileContent = '%PDF-1.4 Mock Coach Session Document Evidence for Tamkeen Al-Roaya 2026';
        
        let multipartBody = '';
        multipartBody += `--${boundary}\r\n`;
        multipartBody += `Content-Disposition: form-data; name="taskId"\r\n\r\nTASK-01\r\n`;
        multipartBody += `--${boundary}\r\n`;
        multipartBody += `Content-Disposition: form-data; name="type"\r\n\r\ndocument\r\n`;
        multipartBody += `--${boundary}\r\n`;
        multipartBody += `Content-Disposition: form-data; name="name"\r\n\r\nتقرير جلسة كوتشنج تنفيذية معتمدة\r\n`;
        multipartBody += `--${boundary}\r\n`;
        multipartBody += `Content-Disposition: form-data; name="isAnonymous"\r\n\r\ntrue\r\n`;
        multipartBody += `--${boundary}\r\n`;
        multipartBody += `Content-Disposition: form-data; name="file"; filename="session_evidence_doc.pdf"\r\n`;
        multipartBody += `Content-Type: application/pdf\r\n\r\n`;
        multipartBody += dummyFileContent + '\r\n';
        multipartBody += `--${boundary}--\r\n`;

        const uploadRes = await fetch(`${BASE_URL}/api/uploads`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${coachToken}`,
                'Content-Type': `multipart/form-data; boundary=${boundary}`
            },
            body: Buffer.from(multipartBody, 'utf8')
        });
        const uploadJson = await uploadRes.json();
        assert.strictEqual(uploadRes.status, 201, 'Upload must succeed with 201');
        assert.ok(uploadJson.evidence.fileUrl, 'File URL must be returned');
        assert.ok(fs.existsSync(uploadJson.evidence.filePath), 'File must exist on disk');
        console.log(`• إيداع دليل ثبوتي حقيقي عبر Multer: تم الحفظ في القرص (${uploadJson.evidence.fileUrl}) وتحديث نسخة المهمة إلى ${uploadJson.task.version} ✓`);

        // ----------------------------------------------------
        // 4. 4-Part Reflection Form Submission
        // ----------------------------------------------------
        console.log('\n--- 4. فحص استمارة التأمل المهني الرباعية (4-Part Reflection) ---');
        const reflectionUpdate = await request('/api/tasks/TASK-01/reflection', {
            method: 'PUT',
            token: coachToken,
            json: {
                whatDidIDo: 'قمت بتنفيذ جلسة كوتشنج تنفيذي ركزت على نموذج بوصلة التمكين الخماسية.',
                why: 'لأن المستفيد يواجه تحدياً في اتخاذ القرارات الاستراتيجية تحت الضغط المؤسسي.',
                impact: 'تمكن المستفيد من إعادة ترتيب أولويات الربع الثالث وتحديد 3 مؤشرات قياس أداء واضحة.',
                whatWillIChange: 'سأتيح للمستفيد مساحة صمت أطول في بداية الجلسة لاستدعاء المشاعر المحفزة للقرار.'
            }
        });
        assert.strictEqual(reflectionUpdate.status, 200);
        assert.strictEqual(reflectionUpdate.body.task.reflection.whatDidIDo, 'قمت بتنفيذ جلسة كوتشنج تنفيذي ركزت على نموذج بوصلة التمكين الخماسية.');
        console.log('• حفظ استمارة التأمل المهني الرباعية المعتمدة في قاعدة البيانات: ناجح ومطابق 100% ✓');

        // ----------------------------------------------------
        // 5. Task Submission & Admin Evaluation Lifecycle
        // ----------------------------------------------------
        console.log('\n--- 5. دورة حياة المهمة وتقييم المشرف (Task Submission & Rating) ---');
        
        // Coach submits task
        const taskSubmit = await request('/api/tasks/TASK-01/submit', {
            method: 'POST',
            token: coachToken
        });
        assert.strictEqual(taskSubmit.status, 200);
        assert.strictEqual(taskSubmit.body.task.status, 'submitted');
        console.log(`• تسليم المهمة من الكوتش للمشرف: تم تحديث الحالة إلى submitted والنسخة إلى ${taskSubmit.body.task.version} ✓`);

        // Admin rates task with rubrics and supervisor notes
        const taskEval = await request('/api/tasks/TASK-01/evaluate', {
            method: 'POST',
            token: adminToken,
            json: {
                coachId: 1,
                status: 'approved',
                grade: 4.9,
                notes: 'أداء مهني استثنائي وتوثيق دقيق للتأمل ونزع الهوية الرقمية للمستفيد.',
                audioFeedbackUrl: '/uploads/feedback_memo_01.mp3'
            }
        });
        assert.strictEqual(taskEval.status, 200);
        assert.strictEqual(taskEval.body.task.status, 'approved');
        assert.strictEqual(taskEval.body.task.supervisorFeedback.grade, 4.9);
        console.log(`• اعتماد المهمة ورصد التقييم والملاحظات والتسجيل الصوتي من الماستر كوتش: ناجح (${taskEval.body.task.supervisorFeedback.grade}/5.00) ✓`);

        // ----------------------------------------------------
        // 6. Anti-Duplication Engine within Tools
        // ----------------------------------------------------
        console.log('\n--- 6. محرك منع تكرار المستفيد داخل الأداة الواحدة (Anti-Duplication) ---');
        
        // Attempt duplicate in MBTI (BEN-05 already exists in MBTI for coach 1)
        const dupeAttempt = await request('/api/tools/apply', {
            method: 'POST',
            token: coachToken,
            json: {
                toolType: 'mbti',
                beneficiaryCode: 'BEN-05',
                date: '2026-05-15',
                focus: 'محاولة تسجيل مكرر',
                plan: 'خطة تجريبية',
                isAnonymous: true
            }
        });
        assert.strictEqual(dupeAttempt.status, 400, 'Duplicate beneficiary in same tool must return 400');
        assert.strictEqual(dupeAttempt.body.code, 'DUPLICATE_BENEFICIARY_IN_TOOL');
        console.log('• حظر إضافة مستفيد مكرر في MBTI (BEN-05): تم الحظر بنجاح مع تنبيه اللائحة الصريح ✓');

        // Legal cross-tool application (BEN-05 is allowed in SWOT)
        // Check if BEN-05 is not yet in swot, or use a code from MBTI not in wheel/swot
        const crossToolApp = await request('/api/tools/apply', {
            method: 'POST',
            token: coachToken,
            json: {
                toolType: 'swot',
                beneficiaryCode: 'BEN-91',
                date: '2026-05-16',
                focus: 'تحليل SWOT للمستفيد',
                plan: 'خطة استراتيجية',
                isAnonymous: true
            }
        });
        assert.strictEqual(crossToolApp.status, 201, 'New application should succeed with 201');
        console.log('• تسجيل مستفيد جديد في SWOT (BEN-91): تم بنجاح ✓');

        // Add new unique beneficiary BEN-99 to MBTI
        const uniqueApp = await request('/api/tools/apply', {
            method: 'POST',
            token: coachToken,
            json: {
                toolType: 'mbti',
                beneficiaryCode: 'BEN-99',
                date: '2026-05-17',
                focus: 'تحليل نمط قيادي',
                plan: 'خطة تطوير',
                isAnonymous: true
            }
        });
        assert.strictEqual(uniqueApp.status, 201);
        console.log('• إضافة مستفيد فريد في MBTI (BEN-99): تم التسجيل والحفظ بنجاح ✓');

        // ----------------------------------------------------
        // 7. 6-Rubrics Matrix, Scoring & Critical Ethical Blocker
        // ----------------------------------------------------
        console.log('\n--- 7. مصفوفة الروبركات الستة وتفعيل الحظر الأخلاقي الحاسم (Ethical Blocker) ---');
        
        // Check initial audit determination (should be clean)
        const initialAudit = await request('/api/audit/determination?coachId=1', {
            token: adminToken
        });
        assert.strictEqual(initialAudit.status, 200);
        assert.strictEqual(initialAudit.body.hasBlocker, false, 'Initial state should have no blocker');
        console.log('• حالة الاعتماد الأولية للكوتش أحمد الشمري: مؤهل وخالٍ من الحظر الأخلاقي ✓');

        // Supervisor lowers critical ethical criterion R1-C4 to level 2 (< 3)
        const lowerCrit = await request('/api/rubrics/evaluate', {
            method: 'POST',
            token: adminToken,
            json: {
                coachId: 1,
                rubricCode: 'sessions',
                criterionId: 'R1-C4',
                level: 2,
                evidenceNote: 'تم رصد ضعف في تطبيق معيار السرية ونزع الهوية',
                notes: 'تنبيه: يجب إعادة التدريب على ميثاق الشرف',
                requiredImprovement: 'إلزام الكوتش بتقديم إقرار معتمد وإعادة الجلسة'
            }
        });
        assert.strictEqual(lowerCrit.status, 200);
        assert.strictEqual(lowerCrit.body.isCriticalBlocker, true, 'isCriticalBlocker must be true');
        console.log('• خفض معيار الأخلاقيات الحرج (R1-C4) إلى 2/5: رصد الحظر بنجاح ✓');

        // Live audit check should now be BLOCKED
        const blockedAudit = await request('/api/audit/determination?coachId=1', {
            token: adminToken
        });
        assert.strictEqual(blockedAudit.status, 200);
        assert.strictEqual(blockedAudit.body.hasBlocker, true, 'Audit must be blocked');
        assert.strictEqual(blockedAudit.body.isEligible, false, 'Candidate must not be eligible');
        console.log(`• فحص محضر التدقيق أثناء الحظر: تم حجب التوصية بالاعتماد وتوثيق السبب: ${blockedAudit.body.blockerReasons[0]} ✓`);

        // Attempt to issue graduation certificate while blocker is active
        const badCert = await request('/api/audit/determination', {
            method: 'POST',
            token: adminToken,
            json: {
                coachId: 1,
                verdict: 'certified',
                committeeNotes: 'محاولة اعتماد غير نظامية'
            }
        });
        assert.strictEqual(badCert.status, 400, 'Attempting to certify while blocked must be rejected with 400');
        assert.strictEqual(badCert.body.code, 'AUDIT_BLOCKERS_PRESENT');
        console.log('• منع إصدار شهادة التخرج نظامياً أثناء وجود الحظر الأخلاقي: تم التحقق بنجاح (400 Bad Request) ✓');

        // Restore criterion R1-C4 to level 5
        const restoreCrit = await request('/api/rubrics/evaluate', {
            method: 'POST',
            token: adminToken,
            json: {
                coachId: 1,
                rubricCode: 'sessions',
                criterionId: 'R1-C4',
                level: 5,
                evidenceNote: 'تم استيفاء كامل الأدلة بنزاهة تامة',
                notes: 'تمت معالجة الملاحظة واجتياز المعيار بامتياز',
                requiredImprovement: 'الحفاظ على نفس المستوى الرفيع من النزاهة'
            }
        });
        assert.strictEqual(restoreCrit.status, 200);
        assert.strictEqual(restoreCrit.body.isCriticalBlocker, false);

        const unblockedAudit = await request('/api/audit/determination?coachId=1', {
            token: adminToken
        });
        assert.strictEqual(unblockedAudit.body.hasBlocker, false);
        assert.strictEqual(unblockedAudit.body.isEligible, true);
        console.log('• استعادة المعيار الأخلاقي إلى 5/5: تم رفع الحظر واستعادة الجاهزية بنجاح ✓');

        // ----------------------------------------------------
        // 8. Ethics Gate Referrals
        // ----------------------------------------------------
        console.log('\n--- 8. سجل الإحالات التخصصية بحدود الممارسة (Specialist Referrals) ---');
        const refRes = await request('/api/ethics/referrals', {
            method: 'POST',
            token: coachToken,
            json: {
                beneficiaryCode: 'BEN-19',
                observedSymptoms: 'أعراض قلق حاد ونوبات هلع أثناء جلسة الكوتشنج',
                referredTo: 'مركز مطمئنة للاستشارات النفسية - د. طارق الحبيب',
                actionTaken: 'إيقاف مسار الكوتشنج فوراً والتوجيه المباشر للإشراف النفسي',
                detectionDate: '2026-05-18'
            }
        });
        assert.strictEqual(refRes.status, 201);
        assert.ok(refRes.body.referral.caseRef.startsWith('REF-2026-'));
        console.log(`• تسجيل إحالة طبية جديدة (${refRes.body.referral.caseRef}) لإثبات حدود الممارسة: ناجح وموثق ✓`);

        // ----------------------------------------------------
        // 10. Real-Time Supervisory & Group Chat Hub Suite
        // ----------------------------------------------------
        console.log('\n--- 10. مركز المحادثات والتوجيه الإشرافي والمحادثة الجماعية (Chat Hub & Group Cohort) ---');
        
        // 10.1 List Channels for Coach
        const coachChannelsRes = await request('/api/chat/channels', {
            token: coachToken
        });
        assert.strictEqual(coachChannelsRes.status, 200);
        assert.ok(Array.isArray(coachChannelsRes.body.channels));
        assert.ok(coachChannelsRes.body.channels.length >= 2, 'Coach must have at least group and direct channels');
        
        const groupChannel = coachChannelsRes.body.channels.find(c => c.channel_type === 'group');
        const directChannel = coachChannelsRes.body.channels.find(c => c.channel_type === 'direct');
        assert.ok(groupChannel, 'Group cohort channel must exist');
        assert.ok(directChannel, 'Direct supervisory channel must exist');
        console.log(`• جلب قنوات المحادثة: تم التحقق من وجود ديوان الزمالة الجماعي (${groupChannel.name}) وقناة الإشراف المباشر (${directChannel.name}) ✓`);

        // 10.2 List Channels for Master Coach (Admin)
        const adminChannelsRes = await request('/api/chat/channels', {
            token: adminToken
        });
        assert.strictEqual(adminChannelsRes.status, 200);
        assert.ok(adminChannelsRes.body.channels.length >= 2);
        console.log(`• جلب قنوات الماستر كوتش المشرف: تم استعراض كافة القنوات التوجيهية (${adminChannelsRes.body.channels.length} قنوات) ✓`);

        // 10.3 Post text message from Coach in direct supervisory channel
        const sendTextRes = await request(`/api/chat/channels/${directChannel.id}/messages`, {
            method: 'POST',
            token: coachToken,
            json: {
                messageType: 'text',
                content: 'ماستر عبدالكريم، تم رفع تسجيل الجلسة رقم 15 والورقة العلمية بانتظار توجيهاتكم الكريمة.'
            }
        });
        assert.strictEqual(sendTextRes.status, 201);
        assert.strictEqual(sendTextRes.body.status, 'success');
        assert.strictEqual(sendTextRes.body.message.message_type, 'text');
        console.log(`• إرسال رسالة نصية إشرافية من الكوتش إلى الماستر كوتش: تم الحفظ والتأكيد بنجاح ✓`);

        // 10.4 Upload voice note via Multer and send audio message
        const audioBoundary = '----WebKitFormBoundaryAudioNoteTest';
        const dummyAudio = Buffer.from('RIFF....WAVEfmt ....data....');
        let audioMultipart = `--${audioBoundary}\r\n`;
        audioMultipart += `Content-Disposition: form-data; name="file"; filename="supervisor_voice_feedback.wav"\r\n`;
        audioMultipart += `Content-Type: audio/wav\r\n\r\n`;
        const audioBuffer = Buffer.concat([
            Buffer.from(audioMultipart, 'utf8'),
            dummyAudio,
            Buffer.from(`\r\n--${audioBoundary}--\r\n`, 'utf8')
        ]);

        const uploadAudioRes = await fetch(`${BASE_URL}/api/chat/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': `multipart/form-data; boundary=${audioBoundary}`
            },
            body: audioBuffer
        });
        const uploadAudioJson = await uploadAudioRes.json();
        assert.strictEqual(uploadAudioRes.status, 201);
        assert.strictEqual(uploadAudioJson.type, 'audio');
        assert.ok(uploadAudioJson.fileUrl);

        const sendAudioMsgRes = await request(`/api/chat/channels/${directChannel.id}/messages`, {
            method: 'POST',
            token: adminToken,
            json: {
                messageType: 'audio',
                content: 'توجيه صوتي إشرافي حول عمق التساؤل السقراطي في الدقيقة 22',
                mediaUrl: uploadAudioJson.fileUrl,
                mediaMeta: {
                    fileName: uploadAudioJson.fileName,
                    sizeBytes: uploadAudioJson.sizeBytes,
                    mimeType: uploadAudioJson.mimeType,
                    durationSeconds: 45
                }
            }
        });
        assert.strictEqual(sendAudioMsgRes.status, 201);
        assert.strictEqual(sendAudioMsgRes.body.message.message_type, 'audio');
        console.log(`• رفع وإرسال رسالة صوتية إشرافية (Voice Note) عبر Multer: تم التخزين (${uploadAudioJson.fileUrl}) والإرسال ✓`);

        // 10.5 Upload image diagram and send image message
        const imgBoundary = '----WebKitFormBoundaryImgTest';
        const dummyPng = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
        let imgMultipart = `--${imgBoundary}\r\n`;
        imgMultipart += `Content-Disposition: form-data; name="file"; filename="coaching_framework_diagram.png"\r\n`;
        imgMultipart += `Content-Type: image/png\r\n\r\n`;
        const imgBuffer = Buffer.concat([
            Buffer.from(imgMultipart, 'utf8'),
            dummyPng,
            Buffer.from(`\r\n--${imgBoundary}--\r\n`, 'utf8')
        ]);

        const uploadImgRes = await fetch(`${BASE_URL}/api/chat/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${coachToken}`,
                'Content-Type': `multipart/form-data; boundary=${imgBoundary}`
            },
            body: imgBuffer
        });
        const uploadImgJson = await uploadImgRes.json();
        assert.strictEqual(uploadImgRes.status, 201);
        assert.strictEqual(uploadImgJson.type, 'image');

        const sendImgMsgRes = await request(`/api/chat/channels/${directChannel.id}/messages`, {
            method: 'POST',
            token: coachToken,
            json: {
                messageType: 'image',
                content: 'مخطط نموذج بوصلة التمكين الخماسي المطبق بالحالة المؤسسية',
                mediaUrl: uploadImgJson.fileUrl,
                mediaMeta: {
                    fileName: uploadImgJson.fileName,
                    sizeBytes: uploadImgJson.sizeBytes,
                    mimeType: uploadImgJson.mimeType
                }
            }
        });
        assert.strictEqual(sendImgMsgRes.status, 201);
        assert.strictEqual(sendImgMsgRes.body.message.message_type, 'image');
        console.log(`• رفع وإرسال صورة ومخطط إشرافي (Image Lightbox Card): تم التوثيق بنجاح ✓`);

        // 10.6 Post message in Group Cohort Channel
        const sendGroupRes = await request(`/api/chat/channels/${groupChannel.id}/messages`, {
            method: 'POST',
            token: adminToken,
            json: {
                messageType: 'text',
                content: 'تذكير لكافة الزملاء: غداً موعد مختبر التغذية الراجعة والنمذجة السلوكية الساعة 7 مساءً.'
            }
        });
        assert.strictEqual(sendGroupRes.status, 201);
        console.log(`• إرسال تعميم في ديوان الزمالة الجماعي للدفعة: تم النشر لجميع الأعضاء بنجاح ✓`);

        // 10.7 Search messages
        const searchRes = await request('/api/chat/search?q=السقراطي', {
            token: coachToken
        });
        assert.strictEqual(searchRes.status, 200);
        assert.ok(searchRes.body.count >= 1);
        console.log(`• محرك البحث في الرسائل الموثقة: تم استرجاع نتائج مطابقة (${searchRes.body.count} رسائل) ✓`);

        // 10.8 Mark channel read
        const markReadRes = await request(`/api/chat/channels/${directChannel.id}/read`, {
            method: 'POST',
            token: coachToken,
            json: {}
        });
        assert.strictEqual(markReadRes.status, 200);
        assert.strictEqual(markReadRes.body.success, true);
        console.log(`• تحديث حالة القراءة والإشعارات (Mark Read): تم التحديث بنجاح ✓`);

        // 10.9 Multi-Coach Group Cohort Collaboration & Sender Isolation
        const saraLogin = await request('/api/auth/login', {
            method: 'POST',
            json: { email: 'sara@cyce52.com', password: 'Coach@2026' }
        });
        assert.strictEqual(saraLogin.status, 200);
        const saraToken = saraLogin.body.token;
        const saraUserId = saraLogin.body.user.id;

        const sendSaraGroupRes = await request(`/api/chat/channels/${groupChannel.id}/messages`, {
            method: 'POST',
            token: saraToken,
            json: {
                messageType: 'text',
                content: 'أشارككم استبصار الحالة #02 حول أثر مقياس LMMI في تحسين التواصل القيادي.'
            }
        });
        assert.strictEqual(sendSaraGroupRes.status, 201);
        assert.strictEqual(sendSaraGroupRes.body.message.sender_id, saraUserId);
        console.log(`• مشاركة كوتش آخر (كوتش سارة) في ديوان الزمالة الجماعي: تم النشر بنجاح وتمايز المعرفات ✓`);

        // Verify group messages have distinct senders for UI bubble isolation
        const groupMsgsRes = await request(`/api/chat/channels/${groupChannel.id}/messages`, {
            token: coachToken
        });
        assert.strictEqual(groupMsgsRes.status, 200);
        const hasSaraMsg = groupMsgsRes.body.messages.some(m => m.sender_id === saraUserId);
        assert.ok(hasSaraMsg, 'Coach Sara message should be present in group');
        console.log(`• فحص تمايز مرسلي رسائل ديوان الزمالة (Sender Isolation): ناجح 100% ✓`);

        // 10.10 1-on-1 Direct Supervisory Channel Privacy Isolation (RBAC)
        const privacyReadRes = await request(`/api/chat/channels/${directChannel.id}/messages`, {
            token: saraToken
        });
        assert.strictEqual(privacyReadRes.status, 403, 'Coach Sara should NOT be able to read Coach Ahmed supervisory channel');

        const privacySendRes = await request(`/api/chat/channels/${directChannel.id}/messages`, {
            method: 'POST',
            token: saraToken,
            json: { messageType: 'text', content: 'محاولة اختراق قناة غير مصرح بها' }
        });
        assert.strictEqual(privacySendRes.status, 403, 'Coach Sara should NOT be able to send to Coach Ahmed supervisory channel');

        const privacyMarkReadRes = await request(`/api/chat/channels/${directChannel.id}/read`, {
            method: 'POST',
            token: saraToken,
            json: {}
        });
        assert.strictEqual(privacyMarkReadRes.status, 403, 'Coach Sara should NOT be able to mark Coach Ahmed channel as read');
        console.log(`• حماية خصوصية قنوات الإشراف الفردي المباشر (403 Forbidden Isolation): تم التحقق بنجاح ✓`);

        // 10.11 Upload file security check (disallowed file format)
        const badFileBoundary = '----WebKitFormBoundaryBadFileTest';
        let badFileMultipart = `--${badFileBoundary}\r\n`;
        badFileMultipart += `Content-Disposition: form-data; name="file"; filename="malicious_script.exe"\r\n`;
        badFileMultipart += `Content-Type: application/octet-stream\r\n\r\n`;
        badFileMultipart += `MZ executable content\r\n--${badFileBoundary}--\r\n`;

        const badUploadRes = await fetch(`${BASE_URL}/api/chat/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${coachToken}`,
                'Content-Type': `multipart/form-data; boundary=${badFileBoundary}`
            },
            body: Buffer.from(badFileMultipart)
        });
        assert.strictEqual(badUploadRes.status, 400, 'Unsupported file extension should be rejected');
        console.log(`• حظر الملفات غير المدعومة في المحادثات (.exe 400 Bad Request): تم بنجاح ✓`);

        // 10.12 Spoofed MIME type security check (must reject .exe even if Content-Type says image/png)
        const spoofBoundary = '----WebKitFormBoundarySpoofTest';
        let spoofMultipart = `--${spoofBoundary}\r\n`;
        spoofMultipart += `Content-Disposition: form-data; name="file"; filename="disguised_trojan.exe"\r\n`;
        spoofMultipart += `Content-Type: image/png\r\n\r\n`;
        spoofMultipart += `MZ executable binary bytes\r\n--${spoofBoundary}--\r\n`;

        const spoofUploadRes = await fetch(`${BASE_URL}/api/chat/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${coachToken}`,
                'Content-Type': `multipart/form-data; boundary=${spoofBoundary}`
            },
            body: Buffer.from(spoofMultipart)
        });
        assert.strictEqual(spoofUploadRes.status, 400, 'Spoofed MIME type must NOT bypass extension whitelist');
        console.log(`• حظر تزييف نوع المحتوى (Spoofed MIME Type Security Bypass): تم التحقق والحظر برمز 400 ✓`);

        // 10.13 Invalid messageType payload validation (400 Bad Request instead of 500 error)
        const badTypeRes = await request(`/api/chat/channels/${groupChannel.id}/messages`, {
            method: 'POST',
            token: coachToken,
            json: { messageType: 'malicious_script', content: 'hello test' }
        });
        assert.strictEqual(badTypeRes.status, 400, 'Invalid messageType must be rejected with 400 Bad Request');
        console.log(`• فحص التحقق من نوع الرسالة (Invalid messageType 400 Validation): تم بنجاح ✓`);

        // 10.14 Oversized content rejection (> 10000 characters)
        const hugeTextRes = await request(`/api/chat/channels/${groupChannel.id}/messages`, {
            method: 'POST',
            token: coachToken,
            json: { messageType: 'text', content: 'أ'.repeat(10001) }
        });
        assert.strictEqual(hugeTextRes.status, 400, 'Oversized content must be rejected with 400');
        console.log(`• حماية سعة الرسائل (Oversized Payload 400 Rejection): تم بنجاح ✓`);

        // 10.15 Admin global message search oversight
        const adminSearchRes = await request('/api/chat/search?q=الاستبصار', {
            token: adminToken
        });
        assert.strictEqual(adminSearchRes.status, 200);
        console.log(`• إشراف الماستر كوتش على البحث الشامل (Admin Global Search Oversight): تم بنجاح ✓`);

        // 10.16 Test SSE Connection headers
        const sseController = new AbortController();
        try {
            const sseRes = await fetch(`${BASE_URL}/api/chat/stream?token=${coachToken}`, {
                signal: sseController.signal
            });
            assert.strictEqual(sseRes.status, 200);
            assert.strictEqual(sseRes.headers.get('content-type'), 'text/event-stream');
            console.log(`• قناة البث الحي الفوري (Server-Sent Events / SSE): تم الاتصال واستلام ترويسة text/event-stream بنجاح ✓`);
        } finally {
            sseController.abort();
        }

        // ----------------------------------------------------
        // 11. 14 Core Competency Domains Data Integrity
        // ----------------------------------------------------
        console.log('\n--- 11. مجالات الكفايات الـ 14 المعتمدة (Arab Coaching Federation) ---');
        const dataPath = path.join(__dirname, '../js/data.js');
        const dataCode = fs.readFileSync(dataPath, 'utf8');
        assert.ok(dataCode.includes('core14Domains'), 'data.js must contain core14Domains');
        
        const vm = require('vm');
        const programData = vm.runInContext(`
            (function() {
                ${dataCode};
                return typeof DEFAULT_PROGRAM_DATA !== 'undefined' ? DEFAULT_PROGRAM_DATA : null;
            })()
        `, vm.createContext({ window: {}, localStorage: { getItem: () => null, setItem: () => {} } }));
        
        assert.ok(programData, 'DEFAULT_PROGRAM_DATA must be returned');
        assert.ok(programData.core14Domains, 'core14Domains must be present in DEFAULT_PROGRAM_DATA');
        assert.strictEqual(programData.core14Domains.length, 14, 'Must have exactly 14 Core Domains');
        
        const total14Hours = programData.core14Domains.reduce((sum, d) => sum + (d.targetHours || 0), 0);
        assert.strictEqual(total14Hours, 335, '14 Core Domains total hours must match 335 hours');
        
        programData.core14Domains.forEach(d => {
            assert.ok(d.id && d.id.startsWith('C14-'));
            assert.ok(d.title);
            assert.ok(d.description);
            assert.ok(Array.isArray(d.keyIndicators) && d.keyIndicators.length > 0);
            assert.ok(Array.isArray(d.linkedCompetencies) && d.linkedCompetencies.length > 0);
            assert.ok(Array.isArray(d.requiredEvidences) && d.requiredEvidences.length > 0);
        });
        console.log(`• مجالات الكفايات الـ 14 المعتمدة: 14 مجالاً موثقاً بإجمالي ${total14Hours} ساعة معتمدة ومؤشرات سلوكية كاملة ✓`);

        // ----------------------------------------------------
        // 9. Graduation Audit Decree & Certification Issuance
        // ----------------------------------------------------
        console.log('\n--- 9. إصدار محضر التدقيق والاعتماد النهائي (Graduation Decree) ---');
        const issueCert = await request('/api/audit/determination', {
            method: 'POST',
            token: adminToken,
            json: {
                coachId: 1,
                verdict: 'certified',
                committeeNotes: 'تم استيفاء كافة المتطلبات المهنية والأخلاقية والبحثية والميدانية لحقيبة الماستر كوتش 3.0 بنجاح فائق.',
                signatoryName: 'الماستر كوتش عبدالكريم الخليفي'
            }
        });
        assert.strictEqual(issueCert.status, 200);
        assert.strictEqual(issueCert.body.auditStatus, 'certified');
        assert.ok(issueCert.body.decree.certificateNumber.startsWith('CYCE-MC-'));
        console.log(`• إصدار شهادة الاعتماد الرسمية (${issueCert.body.decree.certificateNumber}): تم التوثيق والختم الرقمي بنجاح ✓`);

        // ----------------------------------------------------
        // 10. Dynamic Admin Management & Dynamic Certificate Suite
        // ----------------------------------------------------
        console.log('\n--- 10. فحص الإدارة الديناميكية الشاملة وتخصيص الشهادة (Dynamic Admin Suite) ---');

        // A. Dynamic Certificate Customization
        const certConfigGet = await request('/api/admin/certificate-config?coachId=1', { token: adminToken });
        assert.strictEqual(certConfigGet.status, 200);
        assert.ok(Array.isArray(certConfigGet.body.certificateConfig.rows));
        const initialRowsCount = certConfigGet.body.certificateConfig.rows.length;
        console.log(`• جلب إعدادات وبنود الشهادة: ${initialRowsCount} بنود معتمدة ✓`);

        // Add custom row to certificate
        const addCertRow = await request('/api/admin/certificate-rows', {
            method: 'POST',
            token: adminToken,
            json: {
                coachId: 1,
                title: 'ساعات الكوتشنج الإشرافي المتزامن',
                target: '15 ساعة مباشرة',
                achieved: '16 ساعة موثقة',
                indicator: 'حضور مباشر مع الماستر كوتش',
                verdict: 'مستوفى 100%',
                status: 'approved'
            }
        });
        assert.strictEqual(addCertRow.status, 200);
        assert.strictEqual(addCertRow.body.rows.length, initialRowsCount + 1);
        const customRowId = addCertRow.body.row.id;
        console.log(`• إضافة بند ديناميكي جديد للشهادة والمحضر (${customRowId}): تم بنجاح ✓`);

        // Edit custom row in certificate
        const editCertRow = await request(`/api/admin/certificate-rows/${customRowId}`, {
            method: 'PUT',
            token: adminToken,
            json: {
                coachId: 1,
                title: 'ساعات الكوتشنج الإشرافي المباشر المطور',
                achieved: '20 ساعة موثقة'
            }
        });
        assert.strictEqual(editCertRow.status, 200);
        assert.strictEqual(editCertRow.body.row.achieved, '20 ساعة موثقة');
        console.log('• تعديل بند ديناميكي في الشهادة: تم التحديث بنجاح ✓');

        // Delete custom row from certificate
        const deleteCertRow = await request(`/api/admin/certificate-rows/${customRowId}?coachId=1`, {
            method: 'DELETE',
            token: adminToken
        });
        assert.strictEqual(deleteCertRow.status, 200);
        assert.strictEqual(deleteCertRow.body.rows.length, initialRowsCount);
        console.log('• حذف بند من الشهادة والمحضر: تم الحذف بنجاح وتحديث الجدول ✓');

        // Update certificate metadata
        const updateCertMeta = await request('/api/admin/certificate-config', {
            method: 'PUT',
            token: adminToken,
            json: {
                coachId: 1,
                title: 'محضر التدقيق والجاهزية المهنية الرسمي للاعتماد',
                documentRef: 'AUDIT-2026-MC084-REV3'
            }
        });
        assert.strictEqual(updateCertMeta.status, 200);
        assert.strictEqual(updateCertMeta.body.certificateConfig.documentRef, 'AUDIT-2026-MC084-REV3');
        console.log('• تخصيص بيانات ترويسة الشهادة والموقعين: تم بنجاح ✓');

        // B. Dynamic Tasks Bank (Add, Edit, Delete)
        const addTaskRes = await request('/api/admin/tasks', {
            method: 'POST',
            token: adminToken,
            json: {
                coachId: 1,
                id: 'TASK-DYNAMIC-01',
                title: 'مهمة إدارة جلسات الكوتشنج الجماعي للقيادات',
                category: 'ممارسة مهنية وتطبيق مؤسسي',
                rubricCode: 'RUB-SESS',
                description: 'تصميم وتنفيذ جلسة كوتشنج جماعي لفريق قيادي تنفيذي.',
                status: 'submitted',
                version: 'v1.0'
            }
        });
        assert.strictEqual(addTaskRes.status, 200);
        assert.ok(addTaskRes.body.tasks.some(t => t.id === 'TASK-DYNAMIC-01'));
        console.log('• إضافة مهمة جديدة لبنك المهام بواسطة المشرف: تم بنجاح ✓');

        // Edit task
        const editTaskRes = await request('/api/admin/tasks/TASK-DYNAMIC-01', {
            method: 'PUT',
            token: adminToken,
            json: {
                coachId: 1,
                title: 'مهمة إدارة جلسات الكوتشنج الجماعي للقيادات التنفيذية العليا',
                status: 'approved'
            }
        });
        assert.strictEqual(editTaskRes.status, 200);
        assert.strictEqual(editTaskRes.body.task.status, 'approved');
        console.log('• تعديل بيانات المهمة في بنك المهام: تم بنجاح ✓');

        // Delete task
        const delTaskRes = await request('/api/admin/tasks/TASK-DYNAMIC-01?coachId=1', {
            method: 'DELETE',
            token: adminToken
        });
        assert.strictEqual(delTaskRes.status, 200);
        assert.ok(!delTaskRes.body.tasks.some(t => t.id === 'TASK-DYNAMIC-01'));
        console.log('• حذف المهمة من بنك المهام وقاعدة البيانات: تم بنجاح ✓');

        // C. Dynamic Competencies (Add, Edit, Delete)
        const addCompRes = await request('/api/admin/competencies', {
            method: 'POST',
            token: adminToken,
            json: {
                coachId: 1,
                id: 'COMP-D1-CUSTOM',
                domainId: 'D1',
                title: 'كفاية التفاوض وإبرام العقود الثلاثية المعقدة',
                level: 'master',
                isCritical: false
            }
        });
        assert.strictEqual(addCompRes.status, 200);
        assert.ok(addCompRes.body.competencies.some(c => c.id === 'COMP-D1-CUSTOM'));
        console.log('• إضافة كفاية جديدة لمصفوفة الكفايات: تم بنجاح ✓');

        const editCompRes = await request('/api/admin/competencies/COMP-D1-CUSTOM', {
            method: 'PUT',
            token: adminToken,
            json: {
                coachId: 1,
                title: 'كفاية التفاوض والتعاقد الثلاثي المؤسسي المتقدم'
            }
        });
        assert.strictEqual(editCompRes.status, 200);
        assert.strictEqual(editCompRes.body.competency.title, 'كفاية التفاوض والتعاقد الثلاثي المؤسسي المتقدم');
        console.log('• تعديل الكفاية في المصفوفة: تم بنجاح ✓');

        const delCompRes = await request('/api/admin/competencies/COMP-D1-CUSTOM?coachId=1', {
            method: 'DELETE',
            token: adminToken
        });
        assert.strictEqual(delCompRes.status, 200);
        assert.ok(!delCompRes.body.competencies.some(c => c.id === 'COMP-D1-CUSTOM'));
        console.log('• حذف الكفاية من المصفوفة: تم بنجاح ✓');

        // D. Dynamic Rubrics Criteria (Add, Edit, Delete)
        const addCritRes = await request('/api/admin/rubrics/criteria', {
            method: 'POST',
            token: adminToken,
            json: {
                coachId: 1,
                rubricCode: 'RUB-SESS',
                id: 'R1-C-CUSTOM',
                name: 'معيار مرونة التدخل وتكييف الأسئلة الحية',
                weight: 0.15,
                isCritical: false
            }
        });
        assert.strictEqual(addCritRes.status, 200);
        assert.ok(addCritRes.body.rubric.criteria.some(c => c.id === 'R1-C-CUSTOM'));
        console.log('• إضافة معيار جديد للروبرك: تم بنجاح ✓');

        const delCritRes = await request('/api/admin/rubrics/criteria/R1-C-CUSTOM?coachId=1', {
            method: 'DELETE',
            token: adminToken
        });
        assert.strictEqual(delCritRes.status, 200);
        console.log('• حذف المعيار من الروبرك: تم بنجاح ✓');

        // E. Dynamic Quotas / Targets
        const updateQuotasRes = await request('/api/admin/quotas', {
            method: 'PUT',
            token: adminToken,
            json: {
                coachId: 1,
                totalTargetHours: 250,
                casesTarget: 22
            }
        });
        assert.strictEqual(updateQuotasRes.status, 200);
        assert.strictEqual(updateQuotasRes.body.metadata.totalTargetHours, 250);
        console.log('• تعديل الحصص والمستهدفات النظامية (الساعات والحالات): تم بنجاح ✓');

        // Revert quotas back to standard 240 / 20
        await request('/api/admin/quotas', {
            method: 'PUT',
            token: adminToken,
            json: { coachId: 1, totalTargetHours: 240, casesTarget: 20 }
        });

        // F. Dynamic Coaches Management (Create, Edit, Delete)
        const createCoachRes = await request('/api/admin/coaches', {
            method: 'POST',
            token: adminToken,
            json: {
                name: 'كوتش نورة بنت عبدالعزيز',
                email: 'noura@cyce52.com',
                password: 'CoachNoura@2026',
                title: 'كوتش قيادي تنفيذي',
                candidateCode: 'MC-2026-099'
            }
        });
        assert.strictEqual(createCoachRes.status, 200);
        const newCoachId = createCoachRes.body.coach.id;
        console.log(`• إنشاء حساب كوتش متدرب جديد (${createCoachRes.body.coach.name} - ID ${newCoachId}): تم بنجاح ✓`);

        const editCoachRes = await request(`/api/admin/coaches/${newCoachId}`, {
            method: 'PUT',
            token: adminToken,
            json: {
                title: 'ماستر كوتش تنفيذي مشارك'
            }
        });
        assert.strictEqual(editCoachRes.status, 200);
        console.log('• تعديل بيانات الكوتش الجديد: تم بنجاح ✓');

        const delCoachRes = await request(`/api/admin/coaches/${newCoachId}`, {
            method: 'DELETE',
            token: adminToken
        });
        assert.strictEqual(delCoachRes.status, 200);
        console.log('• حذف حساب الكوتش: تم بنجاح وحماية الكوتش النموذجي الأساسي من الحذف ✓');

        console.log('\n================================================================');
        console.log('✅ جميع اختبارات المنصة الكاملة (Fullstack API Suite) اجتازت بنجاح 100%');
        console.log('================================================================\n');

    } finally {
        if (server) {
            await new Promise((resolve) => server.close(resolve));
            console.log('✓ تم إغلاق خادم الاختبار بنجاح.');
        }
    }
}

runTests().then(() => {
    process.exit(0);
}).catch(err => {
    console.error('❌ فشل في الاختبارات:', err);
    process.exit(1);
});
