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

runTests().catch(err => {
    console.error('❌ فشل في الاختبارات:', err);
    process.exit(1);
});
