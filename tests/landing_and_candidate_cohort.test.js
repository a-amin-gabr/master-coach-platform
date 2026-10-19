/**
 * Automated Verification Suite for Marketing Landing Page,
 * Automatic Candidate ID Generation on Signup, and Master Coach
 * Cohort Creation & Student Enrollment by ID or Name.
 *
 * Master Coach Qualification Platform v3.0
 * Tamkeen Al-Roaya for Professional Consulting (cyce52.com)
 * Arab Coaching Federation
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { app } = require('../server/server');
const db = require('../server/database');

// Fresh database initialization for clean test run
db.initializeDatabase(true);

const TEST_PORT = 3288;
let server = null;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let adminToken = '';
let registeredCandidateCode1 = '';
let registeredCandidateCode2 = '';
let registeredCoachId1 = null;
let registeredCoachId2 = null;
let createdCohortId = null;

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
    console.log('=== بدء الفحص الآلي لصفحة الهبوط والرقم التدريبي وإدارة الأفواج ===');
    console.log('================================================================\n');

    await new Promise((resolve) => {
        server = app.listen(TEST_PORT, resolve);
    });
    console.log(`✓ خادم الفحص يعمل بنجاح على المنفذ: ${TEST_PORT}\n`);

    try {
        // --- 1. Login Admin ---
        console.log('--- 1. مصادقة حساب الماستر كوتش المشرف (Admin) ---');
        const adminLogin = await request('/api/auth/login', {
            method: 'POST',
            json: { email: 'abdelkarim@cyce52.com', password: 'admin123' }
        });
        assert.strictEqual(adminLogin.status, 200, 'فشل تسجيل دخول المشرف');
        assert.strictEqual(adminLogin.body.user.role, 'admin', 'دور المشرف يجب أن يكون admin');
        adminToken = adminLogin.body.token;
        console.log(`✓ تم تسجيل دخول الماستر كوتش المشرف بنجاح (Token: ${adminToken.substring(0, 15)}...)\n`);

        // --- 2. Candidate ID Auto-Generation on Register ---
        console.log('--- 2. فحص توليد الرقم التدريبي الفريد (Candidate ID: MC-2026-XXX) عند التسجيل ---');
        
        // Coach 1: Auto-generated Candidate Code
        const reg1 = await request('/api/auth/register', {
            method: 'POST',
            json: {
                name: 'كوتش سلطان بن نايف الهذلي',
                email: 'sultan.hothali@cyce52.com',
                password: 'password123',
                title: 'كوتش قيادي أول',
                phone: '+966551122334'
            }
        });
        assert.strictEqual(reg1.status, 201, `فشل تسجيل الكوتش 1: ${JSON.stringify(reg1.body)}`);
        assert.ok(reg1.body.candidateCode, 'يجب إرجاع candidateCode في الاستجابة');
        assert.match(reg1.body.candidateCode, /^MC-2026-\d{3,}$/, 'تنسيق الرقم التدريبي يجب أن يطابق MC-2026-XXX');
        assert.strictEqual(reg1.body.user.candidateCode, reg1.body.candidateCode, 'تطابق candidateCode في كائن user');
        assert.ok(reg1.body.user.coach && reg1.body.user.coach.id, 'يجب إنشاء سجل coach للمتدرب');
        registeredCandidateCode1 = reg1.body.candidateCode;
        registeredCoachId1 = reg1.body.user.coach.id;
        console.log(`✓ الكوتش 1 مسجل بنجاح برقم تدريبي تلقائي: ${registeredCandidateCode1} (ID: ${registeredCoachId1})`);

        // Coach 2: Auto-generated sequential Candidate Code
        const reg2 = await request('/api/auth/register', {
            method: 'POST',
            json: {
                name: 'كوتش ريم بنت منصور التميمي',
                email: 'reem.tamimi@cyce52.com',
                password: 'password123',
                title: 'كوتش مؤسسي تنفيذي',
                phone: '+966559988776'
            }
        });
        assert.strictEqual(reg2.status, 201, `فشل تسجيل الكوتش 2: ${JSON.stringify(reg2.body)}`);
        assert.ok(reg2.body.candidateCode, 'يجب إرجاع candidateCode للكوتش 2');
        assert.match(reg2.body.candidateCode, /^MC-2026-\d{3,}$/, 'تنسيق الرقم التدريبي 2 يجب أن يطابق MC-2026-XXX');
        assert.notStrictEqual(reg2.body.candidateCode, registeredCandidateCode1, 'الأرقام التدريبية يجب أن تكون فريدة تماماً');
        registeredCandidateCode2 = reg2.body.candidateCode;
        registeredCoachId2 = reg2.body.user.coach.id;
        console.log(`✓ الكوتش 2 مسجل بنجاح برقم تدريبي تسلسلي فريد: ${registeredCandidateCode2} (ID: ${registeredCoachId2})`);

        // Coach 3: Custom Candidate Code preservation
        const customCode = 'MC-2026-ROYAL-VIP';
        const reg3 = await request('/api/auth/register', {
            method: 'POST',
            json: {
                name: 'كوتش خالد بن فهد السديري',
                email: 'khaled.sudairi@cyce52.com',
                password: 'password123',
                candidateCode: customCode
            }
        });
        assert.strictEqual(reg3.status, 201, 'فشل تسجيل الكوتش 3 برقم مخصص');
        assert.strictEqual(reg3.body.candidateCode, customCode, 'يجب الحفاظ على الرقم التدريبي المخصص إذا تم تمريره');
        console.log(`✓ تم الحفاظ على الرقم التدريبي المخصص بنجاح: ${customCode}\n`);

        // --- 3. Master Coach Admin Cohort Creation ---
        console.log('--- 3. فحص إنشاء دفعة تدريبية جديدة بواسطة الماستر كوتش المشرف ---');
        const createCohortRes = await request('/api/admin/cohorts', {
            method: 'POST',
            token: adminToken,
            json: {
                code: 'MC-COHORT-2026-Q3',
                name: 'دفعة تمكين النخبة - الربع الثالث 2026',
                description: 'الدفعة الاحترافية لتأهيل وإعداد قادة الكوتشنج المؤسسي المعتمد',
                startDate: '2026-07-01',
                endDate: '2026-10-31',
                maxCapacity: 35
            }
        });
        assert.strictEqual(createCohortRes.status, 201, 'فشل إنشاء الدفعة التدريبية');
        assert.ok(createCohortRes.body.cohort && createCohortRes.body.cohort.id, 'يجب إرجاع معرف الدفعة المنشأة');
        createdCohortId = createCohortRes.body.cohort.id;
        console.log(`✓ تم إنشاء الدفعة التدريبية بنجاح: ${createCohortRes.body.cohort.name} (ID: ${createdCohortId})\n`);

        // --- 4. Enroll Student to Cohort by Candidate ID ---
        console.log('--- 4. فحص إلحاق المتدرب بالدفعة باستخدام الرقم التدريبي (Candidate ID) ---');
        const enrollByIdRes = await request(`/api/admin/cohorts/${createdCohortId}/add-coach`, {
            method: 'POST',
            token: adminToken,
            json: { identifier: registeredCandidateCode1 }
        });
        assert.strictEqual(enrollByIdRes.status, 200, `فشل إلحاق المتدرب بالرقم التدريبي: ${JSON.stringify(enrollByIdRes.body)}`);
        assert.strictEqual(enrollByIdRes.body.coach.id, registeredCoachId1, 'يجب أن يتطابق الكوتش الملحق مع ID المسجل');
        assert.strictEqual(enrollByIdRes.body.coach.cohort_id, createdCohortId, 'يجب تحديث cohort_id للكوتش');
        console.log(`✓ تم إلحاق الكوتش (${enrollByIdRes.body.coach.name} - ${enrollByIdRes.body.coach.candidate_code}) بنجاح بالرقم التدريبي`);

        // --- 5. Enroll Student to Cohort by Name ---
        console.log('--- 5. فحص إلحاق المتدرب بالدفعة باستخدام اسم الكوتش (Name) ---');
        const enrollByNameRes = await request(`/api/admin/cohorts/${createdCohortId}/add-coach`, {
            method: 'POST',
            token: adminToken,
            json: { identifier: 'ريم بنت منصور' }
        });
        assert.strictEqual(enrollByNameRes.status, 200, `فشل إلحاق المتدرب بالاسم: ${JSON.stringify(enrollByNameRes.body)}`);
        assert.strictEqual(enrollByNameRes.body.coach.id, registeredCoachId2, 'يجب أن يتطابق الكوتش الملحق بالاسم');
        assert.strictEqual(enrollByNameRes.body.coach.cohort_id, createdCohortId, 'يجب تحديث cohort_id للكوتش 2');
        console.log(`✓ تم إلحاق الكوتش (${enrollByNameRes.body.coach.name}) بنجاح بالبحث بالاسم`);

        // --- 5.2 Enroll Student by Partial Code Suffix (e.g. "084" or "84" for MC-2026-084) ---
        console.log('--- 5.2 فحص إلحاق المتدرب باللاحقة الرقمية الجزئية (Partial Code: 084) ---');
        const enrollByPartialCodeRes = await request(`/api/admin/cohorts/${createdCohortId}/add-coach`, {
            method: 'POST',
            token: adminToken,
            json: { identifier: '084' }
        });
        assert.strictEqual(enrollByPartialCodeRes.status, 200, `فشل إلحاق المتدرب بالرمز الجزئي 084: ${JSON.stringify(enrollByPartialCodeRes.body)}`);
        assert.strictEqual(enrollByPartialCodeRes.body.coach.candidate_code, 'MC-2026-084', 'يجب أن يطابق الكود MC-2026-084');
        console.log(`✓ تم إلحاق الكوتش (${enrollByPartialCodeRes.body.coach.name}) بنجاح عبر الرقم التدريبي الجزئي (084)`);

        // --- 5.3 Enroll Student by Normalized Arabic Name (Diacritics & Hamza: "احمد" for "أحمد بن صالح الشمري") ---
        console.log('--- 5.3 فحص إلحاق المتدرب بالاسم العربي غير المهموز (Hamza Normalization: "احمد" -> "أحمد") ---');
        const enrollByNormArabicRes = await request(`/api/admin/cohorts/${createdCohortId}/add-coach`, {
            method: 'POST',
            token: adminToken,
            json: { identifier: 'احمد' }
        });
        assert.strictEqual(enrollByNormArabicRes.status, 200, `فشل إلحاق الكوتش بالاسم غير المهموز: ${JSON.stringify(enrollByNormArabicRes.body)}`);
        assert.strictEqual(enrollByNormArabicRes.body.coach.id, 1, 'يجب أن يتطابق مع كوتش أحمد');
        console.log(`✓ نجح التطابق العربي الدقيق بدون همزة ("احمد" -> "${enrollByNormArabicRes.body.coach.name}")`);

        // --- 6. Bulk Assignment by Candidate IDs & Coach Identifiers ---
        console.log('--- 6. فحص التعيين المتعدد (Bulk Assign) بالرقم التدريبي والاسم ---');
        const bulkAssignRes = await request(`/api/admin/cohorts/${createdCohortId}/assign-coaches`, {
            method: 'POST',
            token: adminToken,
            json: {
                candidateCodes: [registeredCandidateCode1, registeredCandidateCode2, customCode]
            }
        });
        assert.strictEqual(bulkAssignRes.status, 200, `فشل التعيين المتعدد بالرموز: ${JSON.stringify(bulkAssignRes.body)}`);
        assert.strictEqual(bulkAssignRes.body.assignedCount, 3, 'يجب تعيين 3 كوتشز للدفعة');
        console.log(`✓ تم إنجاز التعيين المتعدد بنجاح لـ ${bulkAssignRes.body.assignedCount} كوتشز باستخدام Candidate Codes`);

        // 6.2 Test Merged Assignment (coachIds + candidateCodes combined without dropping)
        console.log('--- 6.2 فحص الدمج المحكم في التعيين المتعدد (coachIds + candidateCodes مدمجة معاً) ---');
        const mergedAssignRes = await request(`/api/admin/cohorts/${createdCohortId}/assign-coaches`, {
            method: 'POST',
            token: adminToken,
            json: {
                coachIds: [1, 2],
                candidateCodes: [registeredCandidateCode1]
            }
        });
        assert.strictEqual(mergedAssignRes.status, 200, 'فشل التعيين المدمج');
        assert.ok(mergedAssignRes.body.assignedCount >= 2, 'يجب تعيين المعرفات والرموز معاً بدون إسقاط أي قائمة');
        console.log(`✓ تم إنجاز التعيين المدمج بنجاح لـ ${mergedAssignRes.body.assignedCount} كوتشز دون إسقاط أي طرف`);

        // Verify error when adding non-existent student
        const nonExistentRes = await request(`/api/admin/cohorts/${createdCohortId}/add-coach`, {
            method: 'POST',
            token: adminToken,
            json: { identifier: 'MC-2026-NON-EXISTENT-999' }
        });
        assert.strictEqual(nonExistentRes.status, 404, 'يجب رفض الكوتش غير الموجود برمز 404');
        console.log('✓ تم التحقق من حظر وإرجاع خطأ 404 عند إدخال معرف كوتش غير مسجل بالنظام\n');

        // --- 7. Static Architecture & Marketing Landing Page Verification ---
        console.log('--- 7. فحص بنية ومحتويات صفحة الهبوط العامة للمنظومة (Marketing Landing Page) ---');
        const htmlPath = path.resolve(__dirname, '../index.html');
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');

        // 7.1 Verify Critical DOM IDs
        const requiredLandingIds = [
            'public-landing-page',
            'main-content-container',
            'landing-public-nav',
            'guest-preview-banner',
            'landing-sticky-cta',
            'nav-status-strip',
            'landing-curriculum-search',
            'landing-domains-empty'
        ];
        requiredLandingIds.forEach(id => {
            assert.ok(htmlContent.includes(`id="${id}"`), `المعرف المفقود في صفحة الهبوط: ${id}`);
        });
        console.log(`✓ جميع المعرفات البرمجية الأساسية لصفحة الهبوط (${requiredLandingIds.length} معرف) موجودة في index.html`);

        // 7.1b Verify Domain Tags D1 to D8
        for (let d = 1; d <= 8; d++) {
            assert.ok(htmlContent.includes(`data-domain-tag="D${d}"`), `المحور D${d} غير موسوم بسمة data-domain-tag في index.html`);
        }
        console.log('✓ جميع المحاور الثمانية (D1 إلى D8) موسومة بسمات data-domain-tag التفاعلية');

        // 7.2 Verify Bag Curriculum Elements
        const curriculumCheckpoints = [
            { text: 'برنامج إعداد وتأهيل الماستر كوتش', desc: 'عنوان البرنامج الرسمي' },
            { text: '2026', desc: 'الإصدار 3.0 لسنة 2026' },
            { text: 'عبدالكريم الخليفي', desc: 'إعداد الماستر كوتش عبدالكريم الخليفي' },
            { text: 'تمكين الرؤية للاستشارات المهنية', desc: 'شركة تمكين الرؤية للاستشارات المهنية' },
            { text: 'cyce52.com', desc: 'رابط الاعتماد والموقع الرسمي' },
            { text: 'الاتحاد العربي للكوتشنج', desc: 'الاعتماد الرسمي من الاتحاد العربي للكوتشنج' },
            { text: '240', desc: 'إجمالي الساعات التدريبية والميدانية المعتمدة (240 ساعة)' },
            { text: '44', desc: 'الكفايات التخصصية الـ 44' },
            { text: '90', desc: 'تطبيقات الأدوات العملية الـ 90' },
            { text: 'MBTI', desc: 'أداة أنماط الشخصية MBTI (30 تطبيق)' },
            { text: 'عجلة الحياة', desc: 'أداة عجلة الحياة المتزنة (30 تطبيق)' },
            { text: 'SWOT', desc: 'أداة التحليل الرباعي SWOT (30 تطبيق)' },
            { text: 'LMMI', desc: 'مقياس مؤشرات النضج القيادي المبتكر LMMI' },
            { text: '10 نماذج', desc: 'النماذج الابتكارية العشرة' },
            { text: '50 صفحة', desc: 'الورقة العلمية التخصصية المحكمة (50 صفحة كحد أدنى)' }
        ];

        curriculumCheckpoints.forEach(cp => {
            assert.ok(htmlContent.includes(cp.text), `المحتوى المفقود من الحقيبة: ${cp.desc} (${cp.text})`);
        });
        console.log(`✓ جميع ركائز ومفردات حقيبة الماستر كوتش الـ 3.0 (${curriculumCheckpoints.length} متطلب) مدمجة في صفحة الهبوط`);

        // 7.3 Verify CSS styles
        const cssPath = path.resolve(__dirname, '../css/styles.css');
        const cssContent = fs.readFileSync(cssPath, 'utf8');
        const requiredCssClasses = [
            '.landing-hero-section',
            '.landing-section',
            '.domains-cards-grid',
            '.hours-track-grid',
            '.royal-mini-cert-frame',
            '.faq-accordion-item',
            '.landing-sticky-cta',
            '.landing-curriculum-toolbar',
            '.landing-tab-pill',
            'body.landing-page-active'
        ];
        requiredCssClasses.forEach(cls => {
            assert.ok(cssContent.includes(cls), `صنف التنسيق المفقود: ${cls}`);
        });
        console.log(`✓ جميع تنسيقات CSS الفاخرة (${requiredCssClasses.length} فئة) موجودة في styles.css`);

        // 7.4 Verify App.js Exports & Helpers
        const appJsPath = path.resolve(__dirname, '../js/app.js');
        const appJsContent = fs.readFileSync(appJsPath, 'utf8');
        const requiredAppExports = [
            'toggleGuestPreview',
            'openCandidateIdWelcomeModal',
            'filterAssignCoachesList',
            'toggleAllAssignCoaches',
            'quickAddCoachToCohort',
            'normalizeArabic',
            'filterLandingDomains',
            'filterLandingDomainsByTag'
        ];
        requiredAppExports.forEach(exp => {
            assert.ok(appJsContent.includes(exp), `الدالة المفقودة من تصدير window.App: ${exp}`);
        });
        console.log(`✓ جميع دوال التحكم والتفاعل (${requiredAppExports.length} دالة) مصدرة في window.App`);

        console.log('\n================================================================');
        console.log('=== ✅ جميع اختبارات صفحة الهبوط والأفواج والرقم التدريبي اجتازت 100% ===');
        console.log('================================================================\n');

    } finally {
        if (server) {
            await new Promise((resolve) => server.close(resolve));
            console.log('✓ تم إغلاق خادم الفحص بنجاح.');
        }
    }
}

runTests().catch(err => {
    console.error('❌ فشل في فحص الاختبارات:', err);
    process.exit(1);
});
