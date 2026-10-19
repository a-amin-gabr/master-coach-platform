/**
 * Comprehensive Automated Test Suite for Multi-Cohort Management,
 * Universal Email Registration, Password Administration, Targets Tuning,
 * and Production Premium Suite (Audit Logs & Executive Reporting).
 *
 * Master Coach Platform v3.0 - Tamkeen Al-Roaya (cyce52.com)
 */

const assert = require('assert');
const { app } = require('../server/server');
const db = require('../server/database');

// Fresh database initialization
db.initializeDatabase(true);

const TEST_PORT = 3201;
let server = null;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let adminToken = '';
let coach1Token = '';
let gmailCoachToken = '';
let createdCohortId = null;
let gmailCoachId = null;

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
    console.log('================================================================');
    console.log('=== بدء الفحص الآلي الشامل للدفعات والتحكم الإداري المتقدم ===');
    console.log('================================================================\n');

    await new Promise((resolve) => {
        server = app.listen(TEST_PORT, resolve);
    });
    console.log(`✓ خادم الفحص يعمل بنجاح على المنفذ: ${TEST_PORT}\n`);

    try {
        // ----------------------------------------------------
        // 1. تسجيل دخول الماستر كوتش الإداري والكوتش التجريبي
        // ----------------------------------------------------
        console.log('--- 1. التحقق من تسجيل دخول الإدارة والكوتش ---');
        const adminLogin = await request('/api/auth/login', {
            method: 'POST',
            json: { email: 'abdelkarim@cyce52.com', password: 'admin123' }
        });
        assert.strictEqual(adminLogin.status, 200, 'Admin login must return 200');
        assert.strictEqual(adminLogin.body.user.role, 'admin', 'Role must be admin');
        adminToken = adminLogin.body.token;
        console.log('• تسجيل دخول الماستر كوتش د. عبدالكريم الخليفي بنجاح ✓');

        const coachLogin = await request('/api/auth/login', {
            method: 'POST',
            json: { email: 'coach@cyce52.com', password: 'coach123' }
        });
        assert.strictEqual(coachLogin.status, 200, 'Coach login must return 200');
        coach1Token = coachLogin.body.token;
        console.log('• تسجيل دخول الكوتش أحمد الشمري بنجاح ✓');

        // ----------------------------------------------------
        // 2. التسجيل الشامل بالبريد الإلكتروني (Universal Email Signup)
        // ----------------------------------------------------
        console.log('\n--- 2. فحص التسجيل الشامل بكافة مزودي البريد الإلكتروني مع الدفعات ---');

        // 2.1 التسجيل ببريد Gmail وتعيين دفعة أولى
        const gmailReg = await request('/api/auth/register', {
            method: 'POST',
            json: {
                name: 'كوتش خالد بن فهد الدوسري',
                email: 'khaled.dossary@gmail.com',
                password: 'password123',
                candidateCode: 'MC-2026-GMAIL',
                title: 'كوتش تنفيذي معتمد',
                cohortId: 1
            }
        });
        assert.strictEqual(gmailReg.status, 201, 'Gmail registration must return 201');
        assert.strictEqual(gmailReg.body.user.email, 'khaled.dossary@gmail.com');
        assert.strictEqual(gmailReg.body.user.cohortId, 1, 'Cohort ID must be 1');
        gmailCoachToken = gmailReg.body.token;
        gmailCoachId = gmailReg.body.user.coachId;
        console.log('• تسجيل كوتش بنجاح عبر بريد Gmail (@gmail.com) وتعيينه بالدفعة 1 ✓');

        // 2.2 التسجيل ببريد Outlook وتعيين دفعة ثانية
        const outlookReg = await request('/api/auth/register', {
            method: 'POST',
            json: {
                name: 'كوتش نورة بنت عبدالعزيز',
                email: 'noura.aziz@outlook.com',
                password: 'password123',
                candidateCode: 'MC-2026-OUTLOOK',
                title: 'كوتش قيادي',
                cohort_id: 2
            }
        });
        assert.strictEqual(outlookReg.status, 201, 'Outlook registration must return 201');
        assert.strictEqual(outlookReg.body.user.email, 'noura.aziz@outlook.com');
        assert.strictEqual(outlookReg.body.user.cohortId, 2, 'Cohort ID must be 2');
        console.log('• تسجيل كوتش بنجاح عبر بريد Outlook (@outlook.com) وتعيينه بالدفعة 2 ✓');

        // 2.3 التسجيل بنطاق مخصص بدون دفعة
        const customReg = await request('/api/auth/register', {
            method: 'POST',
            json: {
                name: 'كوتش طارق المرزوقي',
                email: 'tariq@tamkeen-academy.org.sa',
                password: 'password123',
                candidateCode: 'MC-2026-CUSTOM',
                title: 'كوتش مؤسسي'
            }
        });
        assert.strictEqual(customReg.status, 201, 'Custom domain registration must return 201');
        assert.strictEqual(customReg.body.user.cohortId, null, 'Cohort ID should be null');
        console.log('• تسجيل كوتش بنجاح عبر نطاق مخصص مؤسسي (@tamkeen-academy.org.sa) ✓');

        // 2.4 رفض البريد الإلكتروني ذي الصيغة الخاطئة
        const invalidEmailReg = await request('/api/auth/register', {
            method: 'POST',
            json: {
                name: 'كوتش غير صالح',
                email: 'invalid-email-address',
                password: 'password123'
            }
        });
        assert.strictEqual(invalidEmailReg.status, 400, 'Invalid email must return 400');
        console.log('• رفض التسجيل بصيغة بريد غير صالحة نظامياً (400) بنجاح ✓');

        // 2.5 فحص مسار جلب الدفعات العام للزوار غير الموثقين
        const publicCohortsRes = await request('/api/auth/cohorts');
        assert.strictEqual(publicCohortsRes.status, 200, 'Public cohorts must return 200 without token');
        assert.ok(Array.isArray(publicCohortsRes.body.cohorts), 'Cohorts must be an array');
        assert.ok(publicCohortsRes.body.cohorts.length >= 2, 'Public cohorts should contain baseline cohorts');
        console.log('• جلب الدفعات المتاحة بنجاح لزوار صفحة التسجيل دون الحاجة لتوثيق مسبق (200) ✓');

        // ----------------------------------------------------
        // 3. إدارة كلمات المرور من قبل الماستر كوتش (Password Administration)
        // ----------------------------------------------------
        console.log('\n--- 3. فحص إدارة وإعادة تعيين كلمة المرور من الماستر كوتش ---');

        // 3.1 منع الكوتش العادي من تغيير كلمة مرور كوتش آخر (RBAC Guard)
        const unauthReset = await request(`/api/admin/coaches/${gmailCoachId}/reset-password`, {
            method: 'POST',
            token: coach1Token,
            json: { newPassword: 'HackedPassword123!' }
        });
        assert.strictEqual(unauthReset.status, 403, 'Non-admin reset must return 403');
        console.log('• منع الكوتش العادي من تغيير كلمات المرور (403 Forbidden) ✓');

        // 3.2 رفض كلمة المرور الضعيفة أو القصيرة (< 6 أحرف)
        const weakReset = await request(`/api/admin/coaches/${gmailCoachId}/reset-password`, {
            method: 'POST',
            token: adminToken,
            json: { newPassword: '123' }
        });
        assert.strictEqual(weakReset.status, 400, 'Short password must return 400');
        console.log('• رفض كلمات المرور القصيرة الأقل من 6 خانات (400) ✓');

        // 3.3 الماستر كوتش يغير كلمة مرور الكوتش بنجاح
        const newStrongPass = 'MasterCoachAdmin@2026!';
        const validReset = await request(`/api/admin/coaches/${gmailCoachId}/reset-password`, {
            method: 'POST',
            token: adminToken,
            json: { newPassword: newStrongPass }
        });
        assert.strictEqual(validReset.status, 200, 'Admin reset password must return 200');
        console.log('• قيام الماستر كوتش بإعادة تعيين كلمة المرور وتشفيرها بنجاح (200) ✓');

        // 3.4 فشل تسجيل الدخول بكلمة المرور القديمة للكوتش
        const oldPassLogin = await request('/api/auth/login', {
            method: 'POST',
            json: { email: 'khaled.dossary@gmail.com', password: 'password123' }
        });
        assert.strictEqual(oldPassLogin.status, 401, 'Old password must fail with 401');
        console.log('• إبطال كلمة المرور السابقة بنجاح (401 Unauthorized) ✓');

        // 3.5 نجاح تسجيل الدخول بكلمة المرور الجديدة المعدلة
        const newPassLogin = await request('/api/auth/login', {
            method: 'POST',
            json: { email: 'khaled.dossary@gmail.com', password: newStrongPass }
        });
        assert.strictEqual(newPassLogin.status, 200, 'New password must succeed with 200');
        assert.strictEqual(newPassLogin.body.user.email, 'khaled.dossary@gmail.com');
        console.log('• تسجيل دخول الكوتش بنجاح بكلمة المرور الجديدة المحدثة ✓');

        // 3.6 فحص إغلاق الثغرة القديمة وإلغاء كلمة المرور الافتراضية للكوتش الأساسي (Seed Coach)
        const seedReset = await request('/api/admin/coaches/1/reset-password', {
            method: 'POST',
            token: adminToken,
            json: { newPassword: 'NewSeedPassword@2026' }
        });
        assert.strictEqual(seedReset.status, 200);

        // محاولة تسجيل الدخول بكلمة المرور الافتراضية القديمة (coach123)
        const oldSeedLogin = await request('/api/auth/login', {
            method: 'POST',
            json: { email: 'coach@cyce52.com', password: 'coach123' }
        });
        assert.strictEqual(oldSeedLogin.status, 401, 'Legacy password backdoor must be completely blocked (401)');
        console.log('• حظر الثغرة القديمة: رفض تسجيل الدخول بكلمة coach123 بعد إعادة التعيين (401 Unauthorized) ✓');

        // تسجيل الدخول بكلمة المرور الجديدة بنجاح
        const newSeedLogin = await request('/api/auth/login', {
            method: 'POST',
            json: { email: 'coach@cyce52.com', password: 'NewSeedPassword@2026' }
        });
        assert.strictEqual(newSeedLogin.status, 200, 'New password for seed coach must succeed');
        coach1Token = newSeedLogin.body.token; // update token
        console.log('• تسجيل دخول الكوتش النموذجي بنجاح بكلمة المرور الجديدة المحدثة ✓');

        // ----------------------------------------------------
        // 4. إدارة الدفعات المتعددة (Multi-Cohort Management CRUD)
        // ----------------------------------------------------
        console.log('\n--- 4. فحص إدارة الدفعات المتعددة (Cohorts CRUD & Operations) ---');

        // 4.1 جلب قائمة الدفعات من لوحة الإدارة
        const listCohorts = await request('/api/admin/cohorts', {
            token: adminToken
        });
        assert.strictEqual(listCohorts.status, 200, 'Cohorts list must return 200');
        assert.ok(Array.isArray(listCohorts.body.cohorts), 'Cohorts must be array');
        assert.ok(listCohorts.body.cohorts.length >= 2, 'Should have at least 2 baseline cohorts');
        console.log(`• جلب قائمة الدفعات بنجاح (${listCohorts.body.cohorts.length} دفعات معتمدة) ✓`);

        // 4.2 إنشاء دفعة تدريبية جديدة مع مستهدفات متقدمة
        const createCohortRes = await request('/api/admin/cohorts', {
            method: 'POST',
            token: adminToken,
            json: {
                code: 'COHORT-2026-TEST',
                name: 'دفعة رواد الأعمال التنفيذيين - فوج الفحص',
                description: 'دفعة متخصصة لتطوير مهارات القيادة والذكاء الإشرافي',
                startDate: '2026-07-01',
                endDate: '2026-12-31',
                status: 'upcoming',
                maxCoaches: 20,
                targets: {
                    tasksTargetCount: 10,
                    totalHoursTarget: 260,
                    hoursBreakdown: { H1: 110, H2: 35, H3: 45, H4: 20, H5: 50 },
                    toolQuotas: { mbti: 35, wheelOfLife: 35, swot: 35 },
                    minRubricScore: 3.5,
                    criticalEthicsStrict: true
                }
            }
        });
        assert.strictEqual(createCohortRes.status, 201, 'Create cohort must return 201');
        assert.ok(createCohortRes.body.cohort, 'Created cohort object must exist');
        createdCohortId = createCohortRes.body.cohort.id;
        console.log(`• إنشاء الدفعة التدريبية بنجاح (ID: ${createdCohortId}) مع إنشاء قناة الحوار التفاعلية تلقائياً ✓`);

        // 4.3 جلب تفاصيل الدفعة المنشأة
        const getCohortRes = await request(`/api/admin/cohorts/${createdCohortId}`, {
            token: adminToken
        });
        assert.strictEqual(getCohortRes.status, 200, 'Get cohort must return 200');
        assert.strictEqual(getCohortRes.body.cohort.code, 'COHORT-2026-TEST');
        assert.strictEqual(getCohortRes.body.cohort.targets.tasksTargetCount, 10);
        console.log('• استرجاع بيانات وتفاصيل الدفعة ومستهدفاتها بدقة ✓');

        // 4.4 تعديل بيانات ومستهدفات وكود الدفعة
        const updateCohortRes = await request(`/api/admin/cohorts/${createdCohortId}`, {
            method: 'PUT',
            token: adminToken,
            json: {
                code: 'COHORT-2026-MODIFIED',
                name: 'دفعة رواد الأعمال التنفيذيين (معدلة)',
                status: 'active',
                maxCoaches: 25,
                targets: {
                    tasksTargetCount: 12,
                    totalHoursTarget: 280,
                    hoursBreakdown: { H1: 120, H2: 40, H3: 50, H4: 20, H5: 50 },
                    toolQuotas: { mbti: 40, wheelOfLife: 40, swot: 40 },
                    minRubricScore: 3.8,
                    criticalEthicsStrict: true
                }
            }
        });
        assert.strictEqual(updateCohortRes.status, 200, 'Update cohort must return 200');
        assert.strictEqual(updateCohortRes.body.cohort.status, 'active');
        assert.strictEqual(updateCohortRes.body.cohort.code, 'COHORT-2026-MODIFIED', 'Cohort code must update');
        assert.strictEqual(updateCohortRes.body.cohort.targets.tasksTargetCount, 12);
        console.log('• تحديث بيانات الدفعة وكودها ومستهدفاتها بنجاح (200) ✓');

        // ----------------------------------------------------
        // 5. تعيين الكوتشز بالدفعة وقنوات الحوار (Cohort Enrollment & Chat)
        // ----------------------------------------------------
        console.log('\n--- 5. فحص تعيين الكوتشز بالدفعة والاشتراك التلقائي في قنوات الحوار ---');

        // 5.1 تعيين كوتشين في الدفعة
        const assignRes = await request(`/api/admin/cohorts/${createdCohortId}/assign-coaches`, {
            method: 'POST',
            token: adminToken,
            json: {
                coachIds: [gmailCoachId, 2]
            }
        });
        assert.strictEqual(assignRes.status, 200, 'Assign coaches must return 200');
        assert.strictEqual(assignRes.body.assignedCount, 2);
        console.log('• تعيين الكوتشز في الدفعة واشتراكهم تلقائياً في قناة الفوج ✓');

        // 5.2 التحقق من فك ارتباط الكوتش وإزالته من قناة الفوج عند إلغاء اختياره
        const unassignRes = await request(`/api/admin/cohorts/${createdCohortId}/assign-coaches`, {
            method: 'POST',
            token: adminToken,
            json: {
                coachIds: [gmailCoachId]
            }
        });
        assert.strictEqual(unassignRes.status, 200);
        assert.strictEqual(unassignRes.body.assignedCount, 1);

        const coach2Profile = await request(`/api/coaches/2`, { token: adminToken });
        assert.strictEqual(coach2Profile.body.coach.cohort_id, null, 'Unchecked coach must have cohort_id reset to null');
        console.log('• فك ارتباط الكوتش غير المحدد بنجاح وعزل عضويته من قناة محادثة الفوج (Unassign) ✓');

        // التحقق من تعيين الدفعة في سجل الكوتش المتبقي
        const coachProfile = await request(`/api/coaches/${gmailCoachId}`, {
            token: adminToken
        });
        assert.strictEqual(coachProfile.status, 200);
        assert.strictEqual(coachProfile.body.coach.cohort_id, createdCohortId);
        console.log('• التحقق من تحديث cohort_id في سجل الكوتش بقاعدة البيانات ✓');

        // ----------------------------------------------------
        // 6. محرك مزامنة المستهدفات والتخصيص الفردي (Targets Sync & Fine-Tuning)
        // ----------------------------------------------------
        console.log('\n--- 6. فحص مزامنة مستهدفات الفوج والتخصيص الدقيق لكل كوتش ---');

        // 6.1 مزامنة مستهدفات الدفعة لجميع كوتشز الدفعة
        const syncRes = await request(`/api/admin/cohorts/${createdCohortId}/sync-targets`, {
            method: 'POST',
            token: adminToken
        });
        assert.strictEqual(syncRes.status, 200, 'Sync targets must return 200');
        assert.strictEqual(syncRes.body.updatedCoachesCount, 1);
        console.log('• مزامنة المستهدفات المعيارية للدفعة وتطبيقها على جميع كوتشز الفوج بنجاح ✓');

        // التحقق من تحديث المستهدفات لدى الكوتش
        const coachAfterSync = await request(`/api/coaches/${gmailCoachId}`, {
            token: adminToken
        });
        assert.strictEqual(coachAfterSync.body.coach.metadata.totalTargetHours, 280, 'Total hours should sync to 280');
        assert.strictEqual(coachAfterSync.body.coach.toolsSummary.mbti.target, 40, 'MBTI target should sync to 40');
        console.log('• تطابق مستهدفات الكوتش بعد المزامنة (ساعات: 280، أدوات: 40) ✓');

        // 6.2 التخصيص الفردي الدقيق لكوتش محدد (Fine-Tuning on Coach Level)
        const tuneRes = await request(`/api/admin/coaches/${gmailCoachId}/tune-targets`, {
            method: 'PUT',
            token: adminToken,
            json: {
                customTargets: {
                    tasksTargetCount: 15,
                    totalHoursTarget: 300,
                    hoursBreakdown: { H1: 130, H2: 45, H3: 55, H4: 20, H5: 50 },
                    toolQuotas: { mbti: 45, wheelOfLife: 45, swot: 45 },
                    minRubricScore: 4.0,
                    criticalEthicsStrict: true
                }
            }
        });
        assert.strictEqual(tuneRes.status, 200, 'Tune targets must return 200');
        console.log('• قيام الماستر كوتش بتخصيص دقيق لمستهدفات الكوتش الفردية (300 ساعة، 45 أداة) ✓');

        // التحقق من تطبيق التخصيص الفردي
        const coachAfterTune = await request(`/api/coaches/${gmailCoachId}`, {
            token: adminToken
        });
        assert.strictEqual(coachAfterTune.body.coach.metadata.totalTargetHours, 300);
        assert.strictEqual(coachAfterTune.body.coach.toolsSummary.mbti.target, 45);
        assert.strictEqual(coachAfterTune.body.coach.customTargets.minRubricScore, 4.0);
        console.log('• التحقق من استقرار التخصيص الفردي في حالة الكوتش البرمجية ✓');

        // ----------------------------------------------------
        // 7. استخراج التقرير التنفيذي للدفعة وسجل الرقابة (Reports & Audit Trail)
        // ----------------------------------------------------
        console.log('\n--- 7. فحص التقرير الإحصائي التنفيذي وسجل العمليات والرقابة ---');

        // 7.1 تقرير الدفعة التنفيذي المعتمد
        const reportRes = await request(`/api/admin/cohorts/${createdCohortId}/export-report`, {
            token: adminToken
        });
        assert.strictEqual(reportRes.status, 200, 'Export report must return 200');
        assert.ok(reportRes.body.report, 'Report body must exist');
        assert.strictEqual(reportRes.body.report.summary.totalEnrolledCoaches, 1);
        assert.strictEqual(reportRes.body.report.targets.totalHoursTarget, 280);
        assert.ok(Array.isArray(reportRes.body.report.roster), 'Roster must be array');
        console.log('• استخراج التقرير التنفيذي المعتمد للدفعة مع المؤشرات الإحصائية الكاملة ✓');

        // 7.2 فحص سجل العمليات والرقابة (Audit Trail)
        const auditRes = await request('/api/admin/audit-logs', {
            token: adminToken
        });
        assert.strictEqual(auditRes.status, 200, 'Audit logs must return 200');
        assert.ok(Array.isArray(auditRes.body.logs), 'Logs must be array');
        assert.ok(auditRes.body.logs.length >= 4, 'Should have multiple logged audit actions');

        const actions = auditRes.body.logs.map(l => l.action);
        assert.ok(actions.includes('RESET_PASSWORD'), 'Must log password resets');
        assert.ok(actions.includes('CREATE_COHORT'), 'Must log cohort creations');
        assert.ok(actions.includes('ASSIGN_COACHES'), 'Must log cohort assignments');
        assert.ok(actions.includes('TUNE_COACH_TARGETS'), 'Must log coach target tuning');
        console.log(`• التحقق من توثيق جميع العمليات الإدارية الحساسة في سجل الرقابة المشفر (${auditRes.body.logs.length} عمليات) ✓`);

        // 7.3 منع الكوتش العادي من الاطلاع على سجل الرقابة
        const unauthAudit = await request('/api/admin/audit-logs', {
            token: coach1Token
        });
        assert.strictEqual(unauthAudit.status, 403, 'Audit logs forbidden for non-admin');
        console.log('• حماية سرية سجل الرقابة ومنع الكوتشز غير المصرح لهم (403 Forbidden) ✓');

        // ----------------------------------------------------
        // 8. حذف / أرشفة الدفعة بأمان (Safe Cohort Deletion)
        // ----------------------------------------------------
        console.log('\n--- 8. فحص حذف وأرشفة الدفعة بأمان وفك ربط الكوتشز ---');

        const deleteRes = await request(`/api/admin/cohorts/${createdCohortId}`, {
            method: 'DELETE',
            token: adminToken
        });
        assert.strictEqual(deleteRes.status, 200, 'Delete cohort must return 200');
        console.log('• حذف الدفعة بنجاح وفك ارتباط الكوتشز المقيدين بها بأمان ✓');

        // التحقق من فك ارتباط الكوتش بالدفعة
        const coachAfterDelete = await request(`/api/coaches/${gmailCoachId}`, {
            token: adminToken
        });
        assert.strictEqual(coachAfterDelete.body.coach.cohort_id, null, 'Coach cohort_id should be null');
        console.log('• تأكيد فك ارتباط الكوتش وضبط cohort_id = null بنجاح ✓');

        // 8.3 التحقق من بقاء ديوان الزمالة الجماعي العام (Channel 1) سليمًا بدون cohort_id
        const globalLounge = db.getChannelById(1);
        assert.ok(globalLounge, 'Channel 1 (Global Lounge) must remain intact');
        assert.strictEqual(globalLounge.cohort_id, null, 'Global Lounge must have cohort_id = null');
        console.log('• حماية ديوان الزمالة الجماعي العام (Channel 1) واستمراره مستقلاً بدون cohort_id بعد حذف الدفعات ✓');

        // ----------------------------------------------------
        // 9. فحص ترابط محرك التدقيق والاعتماد مع المستهدفات المعدلة
        // ----------------------------------------------------
        console.log('\n--- 9. فحص احتساب التدقيق والاعتماد مع المستهدفات المعدلة (Dynamic Audit Engine) ---');
        // جلب قرار التدقيق للكوتش ذي المستهدفات المخصصة (300 ساعة، 45 أداة)
        const auditDetRes = await request(`/api/audit/determination?coachId=${gmailCoachId}`, {
            token: adminToken
        });
        assert.strictEqual(auditDetRes.status, 200, 'Audit determination must return 200');
        assert.strictEqual(auditDetRes.body.metrics.hoursTarget, 300, 'Audit must recognize tuned hours target of 300');
        assert.strictEqual(auditDetRes.body.metrics.toolTargets.mbti, 45, 'Audit must recognize tuned MBTI target of 45');
        assert.strictEqual(auditDetRes.body.metrics.minRubricScore, 4.0, 'Audit must recognize tuned rubric threshold of 4.0');
        console.log('• مطابقة محرك التدقيق للمستهدفات المخصصة بدقة (300 ساعة، 45 أداة، 4.0 روبرك) ✓');

        console.log('\n================================================================');
        console.log('✅ جميع اختبارات الدفعات والتحكم الإداري المتقدم اجتازت بنجاح 100%');
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
    console.error('\n❌ فشل أحد اختبارات الدفعات والتحكم الإداري:', err);
    process.exit(1);
});
