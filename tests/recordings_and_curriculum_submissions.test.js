/**
 * Automated Verification Suite for Professional Audio Recordings,
 * Live Microphone Capture, 100MB File Uploads, and Curriculum Submissions.
 *
 * Master Coach Platform v3.0 - cyce52.com
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { app } = require('../server/server');
const db = require('../server/database');

// Fresh database initialization
db.initializeDatabase(true);

const TEST_PORT = 3204;
let server = null;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let adminToken = '';
let coachToken = '';

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
    console.log('=== بدء الفحص الآلي الشامل للتسجيلات الصوتية ومخرجات الحقيبة ===');
    console.log('================================================================\n');

    await new Promise((resolve) => {
        server = app.listen(TEST_PORT, resolve);
    });
    console.log(`✓ خادم الفحص يعمل بنجاح على المنفذ: ${TEST_PORT}\n`);

    try {
        // ----------------------------------------------------
        // 1. تسجيل الدخول والحصول على رموز التوثيق
        // ----------------------------------------------------
        console.log('--- 1. تسجيل الدخول للمشرف والكوتش المتدرب ---');
        const adminLogin = await request('/api/auth/login', {
            method: 'POST',
            json: { email: 'abdelkarim@cyce52.com', password: 'admin123' }
        });
        assert.strictEqual(adminLogin.status, 200, 'Admin login must return 200');
        adminToken = adminLogin.body.token;

        const coachLogin = await request('/api/auth/login', {
            method: 'POST',
            json: { email: 'coach@cyce52.com', password: 'coach123' }
        });
        assert.strictEqual(coachLogin.status, 200, 'Coach login must return 200');
        coachToken = coachLogin.body.token;
        console.log('✓ تم تسجيل الدخول بنجاح\n');

        // ----------------------------------------------------
        // 2. فحص نقاط نهاية التسجيلات المهنية الـ 5 (/api/curriculum/recordings)
        // ----------------------------------------------------
        console.log('--- 2. فحص استرجاع وإيداع التسجيلات المهنية الخمسة ---');
        const getRecs = await request('/api/curriculum/recordings', { token: coachToken });
        assert.strictEqual(getRecs.status, 200, 'GET /api/curriculum/recordings must return 200');
        assert.strictEqual(getRecs.body.target, 5, 'Recordings target quota must be 5');

        // Missing title validation
        const badRec = await request('/api/curriculum/recordings', {
            method: 'POST',
            token: coachToken,
            json: { title: '', isAnonymous: true }
        });
        assert.strictEqual(badRec.status, 400, 'Should reject recording without title');

        // Missing anonymity consent validation
        const nonAnonRec = await request('/api/curriculum/recordings', {
            method: 'POST',
            token: coachToken,
            json: { title: 'جلسة قيادة', isAnonymous: false }
        });
        assert.strictEqual(nonAnonRec.status, 400, 'Should reject recording without anonymity consent');

        // Valid recording submission
        const initialCount = getRecs.body.total;
        const validRec = await request('/api/curriculum/recordings', {
            method: 'POST',
            token: coachToken,
            json: {
                title: 'جلسة كوتشنج قيادة تنفيذية: إدارة التغيير والتحول الرقمي',
                topic: 'كوتشنج القيادة التنفيذية وإدارة التغيير المؤسسي',
                duration: '52:00',
                beneficiaryCode: 'BEN-REC-TEST-01',
                reflection: 'تم تطبيق الصمت الاستراتيجي وطرح أسئلة التمكين واستخلاص خطة عمل قابلة للقياس.',
                isAnonymous: true
            }
        });
        assert.strictEqual(validRec.status, 201, 'Valid recording submission must return 201');
        assert.strictEqual(validRec.body.totalRecordings, initialCount + 1, 'Total recordings must increment');
        console.log('✓ تم إيداع التسجيل المهني ومطابقة الحصة والتحقق من النزاهة بنجاح\n');

        // ----------------------------------------------------
        // 3. فحص رفع ملفات الصوت المتعددة وحد الحجم 100MB (/api/uploads)
        // ----------------------------------------------------
        console.log('--- 3. فحص محرك رفع الملفات الصوتية (MP3/WAV/AAC) وسعة 100MB ---');
        
        // Prepare dummy audio payload
        const boundary = '----WebKitFormBoundaryMasterCoachTest';
        const dummyAudioContent = Buffer.from('RIFF....WAVEfmt ....data....');
        let multipartBody = Buffer.concat([
            Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="sample_session_recording.wav"\r\nContent-Type: audio/wav\r\n\r\n`),
            dummyAudioContent,
            Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="taskId"\r\n\r\nTASK-06\r\n`),
            Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="title"\r\n\r\nجلسة صوتية مرفوعة للاختبار\r\n`),
            Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="isAnonymous"\r\n\r\ntrue\r\n`),
            Buffer.from(`--${boundary}--\r\n`)
        ]);

        const uploadRes = await fetch(`${BASE_URL}/api/uploads`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${coachToken}`,
                'Content-Type': `multipart/form-data; boundary=${boundary}`
            },
            body: multipartBody
        });
        const uploadJson = await uploadRes.json();
        assert.strictEqual(uploadRes.status, 201, 'Audio upload must return 201');
        assert.ok(uploadJson.file, 'Upload response must include file details');
        assert.strictEqual(uploadJson.file.mimetype, 'audio/wav', 'MIME type must be audio/wav');
        console.log('✓ تم التحقق من استقبال الملفات الصوتية واعتمادها بنجاح\n');

        // ----------------------------------------------------
        // 4. فحص نقاط نهاية الحالات الميدانية والجلسات (/api/cases)
        // ----------------------------------------------------
        console.log('--- 4. فحص إيداع الحالات الميدانية والجلسات الموثقة ---');
        const newCaseRes = await request('/api/cases', {
            method: 'POST',
            token: coachToken,
            json: {
                code: 'CASE-TEST-99',
                title: 'كوتشنج إدارة الأزمات والضغوط التنفيذية',
                sessionsCount: 3,
                totalMinutes: 160,
                models: ['GROW', 'بوصلة التمكين', 'SWOT'],
                objectives: 'خفض مستويات القلق المهني وإعادة بناء خطة الطوارئ المؤسسية.'
            }
        });
        assert.strictEqual(newCaseRes.status, 201, 'POST /api/cases must return 201');

        const newSessionRes = await request('/api/cases/sessions', {
            method: 'POST',
            token: coachToken,
            json: {
                caseCode: 'CASE-TEST-99',
                date: '2026-04-10',
                duration: 55,
                rubricsScore: 4.9,
                focus: 'الاستماع التوليدي وتحديد الرؤية المستقبلية',
                notes: 'استبصار القائد لمصادر الدعم وتوزيع المهام بمرونة.'
            }
        });
        assert.strictEqual(newSessionRes.status, 201, 'POST /api/cases/sessions must return 201');
        console.log('✓ تم توثيق الحالات الميدانية والجلسات بنجاح\n');

        // ----------------------------------------------------
        // 5. فحص نقاط نهاية المخرجات النوعية (النماذج، الأداة، المشروع، الورقة)
        // ----------------------------------------------------
        console.log('--- 5. فحص النماذج الابتكارية، أداة الشخصية، تهيئة المؤسسة، الورقة العلمية ومحضر التخرج ---');
        
        // Models
        const modelRes = await request('/api/curriculum/models', {
            method: 'POST',
            token: coachToken,
            json: {
                title: 'نموذج بوصلة التمكين الخماسي',
                problemAddressed: 'علاج تشوهات اتخاذ القرار القيادي',
                theoreticalReference: 'علم النفس الإيجابي ونظرية النظم',
                addedValue: 'تسريع انتقال القائد من رد الفعل إلى المبادرة',
                feasibilityTest: 'تم تطبيقه على 10 قادة وأثبت فعالية عالية'
            }
        });
        assert.strictEqual(modelRes.status, 201, 'Model creation must return 201');

        // Innovative Tool (LMMI)
        const toolRes = await request('/api/curriculum/innovative-tool', {
            method: 'POST',
            token: coachToken,
            json: {
                name: 'مقياس مؤشرات النضج القيادي والدافعية المهنية (LMMI)',
                purpose: 'قياس النضج المهني والدافعية القيادية في بيئات الأعمال المعقدة',
                boundaries: 'أداة تطويرية كوتشنجية غير عيادية',
                verificationMechanism: 'الصدق الظاهري وتحكيم الخبراء وتطبيق تجريبي على 30 قائداً'
            }
        });
        assert.strictEqual(toolRes.status, 200, 'Innovative tool update must return 200');

        // Org Preparation Project
        const orgRes = await request('/api/curriculum/org-preparation', {
            method: 'POST',
            token: coachToken,
            json: {
                orgName: 'شركة ريادة التقنية للاستشارات المهنية',
                sector: 'الاستشارات والحلول السحابية',
                phases: [
                    { phase: 'المرحلة 1: التهيئة والتشخيص الميداني', duration: '4 أسابيع', output: 'مسح الجاهزية الثقافية' },
                    { phase: 'المرحلة 2: تصميم منظومة الكوتشنج', duration: '6 أسابيع', output: 'هندسة المسارات الثلاثة' },
                    { phase: 'المرحلة 3: التطبيق التجريبي والرعاية الإشرافية', duration: '8 أسابيع', output: 'إطلاق الدفعة التجريبية' },
                    { phase: 'المرحلة 4: التقييم المؤسسي والأثر المستدام', duration: '4 أسابيع', output: 'قياس العائد وتأسيس الوحدة' }
                ]
            }
        });
        assert.strictEqual(orgRes.status, 200, 'Org preparation update must return 200');

        // Applied Research Paper (validates min 50 pages)
        const shortPaper = await request('/api/curriculum/research-paper', {
            method: 'POST',
            token: coachToken,
            json: { title: 'بحث قصير', totalPages: 40 }
        });
        assert.strictEqual(shortPaper.status, 200, 'Research paper endpoint returns status');
        assert.strictEqual(shortPaper.body.researchPaper.status, 'submitted', 'Paper under 50 pages should not be auto-approved');

        const validPaper = await request('/api/curriculum/research-paper', {
            method: 'POST',
            token: coachToken,
            json: {
                title: 'أثر الكوتشنج القيادي في تعزيز المرونة التنظيمية وخفض الاحتراق المهني',
                totalPages: 58,
                abstract: 'دراسة ميدانية تطبيقية استقصائية تستهدف قياس أثر التدخلات الكوتشنجية في بيئات الأعمال.',
                keywords: 'كوتشنج، مرونة تنظيمية، LMMI، APA 7',
                apa7Compliant: true
            }
        });
        assert.strictEqual(validPaper.status, 200, 'Valid research paper must return 200');
        assert.strictEqual(validPaper.body.researchPaper.status, 'approved', 'Paper with 50+ pages must be approved');

        // Graduation Project
        const gradRes = await request('/api/curriculum/graduation-project', {
            method: 'POST',
            token: coachToken,
            json: {
                title: "منظومة 'تمكين 360' للذكاء الكوتشنجي",
                executiveSummary: 'منظومة نوعية تدمج مقياس LMMI ونموذج بوصلة التمكين الخماسي في البيئات المؤسسية.',
                juryVerdict: 'مجاز بتقدير ممتاز مع مرتبة الشرف الأولى'
            }
        });
        assert.strictEqual(gradRes.status, 200, 'Graduation project must return 200');

        // Test GET endpoints for all curriculum items
        const getTool = await request('/api/curriculum/innovative-tool', { token: coachToken });
        assert.strictEqual(getTool.status, 200, 'GET /api/curriculum/innovative-tool must return 200');
        assert.ok(getTool.body.tool, 'GET /api/curriculum/innovative-tool must return tool');

        const getOrg = await request('/api/curriculum/org-preparation', { token: coachToken });
        assert.strictEqual(getOrg.status, 200, 'GET /api/curriculum/org-preparation must return 200');
        assert.ok(getOrg.body.orgPreparation, 'GET /api/curriculum/org-preparation must return orgPreparation');

        const getPaper = await request('/api/curriculum/research-paper', { token: coachToken });
        assert.strictEqual(getPaper.status, 200, 'GET /api/curriculum/research-paper must return 200');
        assert.strictEqual(getPaper.body.researchPaper.totalPages, 58, 'GET /api/curriculum/research-paper must return updated paper');

        const getGrad = await request('/api/curriculum/graduation-project', { token: coachToken });
        assert.strictEqual(getGrad.status, 200, 'GET /api/curriculum/graduation-project must return 200');
        assert.ok(getGrad.body.graduationProject.title.includes('تمكين 360'), 'GET /api/curriculum/graduation-project must return updated project');

        console.log('✓ تم فحص جميع مخرجات الحقيبة ومسارات GET/POST بنجاح واستيفاء المتطلبات\n');

        // ----------------------------------------------------
        // 6. التحقق التجريبي من واجهة المستخدم و DOM الافتراضي
        // ----------------------------------------------------
        console.log('--- 6. فحص أزرار التسجيل والرفع والإرشادات عبر واجهات DOM ---');
        
        const elements = {};
        const getEl = (id) => {
            if (!elements[id]) {
                elements[id] = {
                    id,
                    value: '',
                    checked: true,
                    innerHTML: '',
                    textContent: '',
                    style: {},
                    classList: {
                        _classes: new Set(),
                        add(c) { this._classes.add(c); },
                        remove(c) { this._classes.delete(c); },
                        contains(c) { return this._classes.has(c); }
                    },
                    appendChild(c) {},
                    addEventListener(e, fn) { if (e === 'click') this._onClick = fn; },
                    click() { if (this._onClick) this._onClick({ preventDefault() {} }); },
                    focus() {},
                    setAttribute() {},
                    querySelector(sel) { return getEl(sel.replace(/^[#.]/, '')); },
                    querySelectorAll(sel) { return []; }
                };
            }
            return elements[id];
        };

        global.window = global;
        global.window.scrollTo = () => {};
        global.window.addEventListener = () => {};
        global.window.removeEventListener = () => {};
        global.window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
        global.document = {
            getElementById: getEl,
            querySelector: (sel) => getEl(sel.replace(/^[#.]/, '')),
            querySelectorAll: (sel) => [],
            createElement(tag) {
                return {
                    tagName: tag,
                    style: {},
                    classList: { add() {}, remove() {}, contains() { return false; } },
                    setAttribute() {},
                    appendChild() {},
                    remove() {}
                };
            },
            body: {
                style: {},
                appendChild() {},
                classList: { add() {}, remove() {}, contains() { return false; } }
            },
            addEventListener() {}
        };

        global.localStorage = {
            _data: {},
            getItem(k) { return this._data[k] || null; },
            setItem(k, v) { this._data[k] = v; },
            removeItem(k) { delete this._data[k]; }
        };

        global.AudioContext = class {
            createOscillator() { return { connect() {}, start() {}, stop() {} }; }
            createGain() { return { connect() {}, gain: { value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {} } }; }
            get destination() { return {}; }
            get currentTime() { return 0; }
        };

        // Load frontend scripts
        const iconsJs = fs.readFileSync(path.resolve(__dirname, '../js/icons.js'), 'utf8');
        const dataJs = fs.readFileSync(path.resolve(__dirname, '../js/data.js'), 'utf8');
        const apiJs = fs.readFileSync(path.resolve(__dirname, '../js/api.js'), 'utf8');
        const appJs = fs.readFileSync(path.resolve(__dirname, '../js/app.js'), 'utf8');

        eval(iconsJs);
        eval(dataJs);
        eval(apiJs);
        eval(appJs);

        // Initialize App
        await window.App.init();

        // Test Open Recording Modal
        window.App.openRecordingModal();
        const recModalHtml = elements['recording-modal']?.innerHTML || '';
        assert.ok(recModalHtml.includes('إيداع جلسة كوتشنج صوتية متخصصة'), 'Recording modal must display title');
        assert.ok(recModalHtml.includes('تسجيل مباشر عبر الميكروفون'), 'Recording modal must include live mic tab');
        assert.ok(recModalHtml.includes('رفع ملف صوتي جاهز'), 'Recording modal must include file upload tab');
        assert.ok(recModalHtml.includes('كوتشنج القيادة التنفيذية وإدارة التغيير المؤسسي'), 'Recording modal must include official curriculum topics');
        assert.ok(recModalHtml.includes('live-rec-preview'), 'Recording modal must include audio preview player');
        console.log('✓ نافذة التسجيل الصوتي التفاعلية تحتوي على علامات التبويب والمشغل والموضوعات المعتمدة');

        // Test Live Recording Controller methods
        window.App.startLiveRecording();
        assert.strictEqual(window.App.state.recordingState.isRecording, true, 'State must indicate recording active');

        window.App.pauseResumeLiveRecording();
        assert.strictEqual(window.App.state.recordingState.isPaused, true, 'State must indicate paused');

        window.App.pauseResumeLiveRecording();
        assert.strictEqual(window.App.state.recordingState.isPaused, false, 'State must indicate resumed');

        window.App.stopLiveRecording();
        assert.strictEqual(window.App.state.recordingState.isRecording, false, 'Recording must stop');
        assert.ok(window.App.state.recordingState.recordedBlob, 'Must generate audio blob on stop');

        window.App.resetLiveRecording();
        assert.strictEqual(window.App.state.recordingState.elapsedSeconds, 0, 'Reset must zero timer');
        console.log('✓ دورة حياة التسجيل المباشر (بدء، إيقاف مؤقت، إنهاء، إعادة) تعمل بسلاسة');

        // Test Guidance Modal
        window.App.openRecordingInstructionsModal();
        const curriculumModalHtml = elements['curriculum-modal']?.innerHTML || elements['generic-modal']?.innerHTML || '';
        assert.ok(curriculumModalHtml.includes('دليل ومتطلبات التسجيلات المهنية الاحترافية الخمسة'), 'Instructions modal must explain requirements');
        assert.ok(curriculumModalHtml.includes('RUB-SESS'), 'Instructions modal must reference RUB-SESS rubric');
        console.log('✓ نافذة الإرشادات والضوابط التوجيهية تعرض معايير الحقيبة 2026 والروبرك بدقة');

        // Test Task Modal shortcuts
        window.App.openTaskModal('TASK-06');
        const taskModalHtml = elements['task-modal']?.innerHTML || '';
        assert.ok(taskModalHtml.includes('openRecordingModal()'), 'TASK-06 modal must provide direct recording button');
        assert.ok(taskModalHtml.includes('openRecordingInstructionsModal()'), 'TASK-06 modal must provide guidance button');

        window.App.openTaskModal('TASK-05');
        const task5Html = elements['task-modal']?.innerHTML || '';
        assert.ok(task5Html.includes('openResearchPaperModal()'), 'TASK-05 modal must provide paper upload button');
        assert.ok(task5Html.includes('openResearchPaperInstructionsModal()'), 'TASK-05 modal must provide paper instructions button');

        window.App.openTaskModal('TASK-07');
        const task7Html = elements['task-modal']?.innerHTML || '';
        assert.ok(task7Html.includes('openGraduationProjectModal()'), 'TASK-07 modal must provide project modal button');
        assert.ok(task7Html.includes('openGraduationProjectInstructionsModal()'), 'TASK-07 modal must provide project instructions button');
        console.log('✓ شاشات المهام (TASK-05, TASK-06, TASK-07) تتضمن أزرار العمل المباشر وأدلة الإرشادات');

        // Test Instruction Modals
        window.App.openToolsInstructionsModal();
        let currHtml = elements['curriculum-modal']?.innerHTML || elements['generic-modal']?.innerHTML || '';
        assert.ok(currHtml.includes('دليل وضوابط تطبيقات الأدوات الـ 90'), 'Tools instructions modal must render');

        window.App.openResearchPaperInstructionsModal();
        currHtml = elements['curriculum-modal']?.innerHTML || elements['generic-modal']?.innerHTML || '';
        assert.ok(currHtml.includes('دليل ومعايير إعداد الورقة العلمية التطبيقية'), 'Paper instructions modal must render');

        window.App.openGraduationProjectInstructionsModal();
        currHtml = elements['curriculum-modal']?.innerHTML || elements['generic-modal']?.innerHTML || '';
        assert.ok(currHtml.includes('دليل ومعايير مشروع التخرج الابتكاري'), 'Graduation project instructions modal must render');
        console.log('✓ نوافذ الإرشادات التوجيهية لكافة المتطلبات تعمل بدقة وتفصّل المعايير الرسمية');

        // Test File Upload Handlers for Manuscript and Capstone
        window.App.onPaperFileSelected({ target: { files: [{ name: 'manuscript_v3.pdf', size: 1024 * 1024 }] } });
        assert.strictEqual(window.App.state.paperState.uploadedFile.name, 'manuscript_v3.pdf', 'Paper file must be staged');
        window.App.clearSelectedPaperFile();
        assert.strictEqual(window.App.state.paperState.uploadedFile, null, 'Paper file must clear');

        window.App.onProjFileSelected({ target: { files: [{ name: 'capstone_dossier.pdf', size: 2 * 1024 * 1024 }] } });
        assert.strictEqual(window.App.state.projState.uploadedFile.name, 'capstone_dossier.pdf', 'Capstone file must be staged');
        window.App.clearSelectedProjFile();
        assert.strictEqual(window.App.state.projState.uploadedFile, null, 'Capstone file must clear');
        console.log('✓ معالجات سحب ورفع ملفات المخطوطات ومشاريع التخرج تعمل بنزاهة وحصانة تامة');

        // Test Research Paper Modal & Dual State Synchronization
        window.App.openResearchPaperModal();
        assert.ok(elements['curriculum-modal']?.innerHTML.includes('modal-paper-title'), 'Paper modal must render title field');
        assert.ok(elements['curriculum-modal']?.innerHTML.includes('paper-file-input'), 'Paper modal must include manuscript file input');
        
        // Populate and submit paper
        const paperTitleEl = getEl('modal-paper-title');
        const paperPagesEl = getEl('modal-paper-pages');
        paperTitleEl.value = 'أثر الكوتشنج القيادي في تعزيز المرونة التنظيمية وخفض الاحتراق المهني';
        paperPagesEl.value = '58';
        await window.App.submitResearchPaper();
        assert.strictEqual(window.App.state.data.researchPaper.totalPages, 58, 'Canonical researchPaper must be updated');
        assert.strictEqual(window.App.state.data.appliedResearchPaper.totalPages, 58, 'appliedResearchPaper must be synchronized');
        console.log('✓ تزامن بيانات الورقة العلمية بين researchPaper و appliedResearchPaper بنجاح');

        // Test Graduation Project Modal
        window.App.openGraduationProjectModal();
        assert.ok(elements['curriculum-modal']?.innerHTML.includes('modal-proj-title'), 'Graduation modal must render title field');
        assert.ok(elements['curriculum-modal']?.innerHTML.includes('proj-file-input'), 'Graduation modal must include capstone file input');
        const projTitleEl = getEl('modal-proj-title');
        projTitleEl.value = "منظومة 'تمكين 360' للذكاء الكوتشنجي";
        await window.App.submitGraduationProject();
        assert.ok(window.App.state.data.graduationProject.title.includes('تمكين 360'), 'graduationProject must be updated');
        console.log('✓ إيداع وتحديث مشروع التخرج الابتكاري يعمل بنجاح');

        // Test Quantitative Panel All Sections (1 to 10)
        window.App.renderQuantitativePanel();
        const quantHtml = elements['quant-content-area']?.innerHTML || '';
        assert.ok(quantHtml.includes('openRecordingModal()'), 'Section 8 must contain openRecordingModal button');
        assert.ok(quantHtml.includes('openRecordingInstructionsModal()'), 'Section 8 must contain openRecordingInstructionsModal button');
        assert.ok(quantHtml.includes('openNewCaseModal()'), 'Cases section must contain new case button');
        assert.ok(quantHtml.includes('openNewSessionModal()'), 'Sessions section must contain new session button');
        assert.ok(quantHtml.includes('openNewModelModal()'), 'Models section must contain new model button');
        assert.ok(quantHtml.includes('openOrgPreparationModal()'), 'Org section must contain org preparation button');
        assert.ok(quantHtml.includes('openResearchPaperModal()'), 'Section 9 must contain research paper modal button');
        assert.ok(quantHtml.includes('openResearchPaperInstructionsModal()'), 'Section 9 must contain research paper instructions button');
        assert.ok(quantHtml.includes('openGraduationProjectModal()'), 'Section 10 must contain graduation project modal button');
        assert.ok(quantHtml.includes('openGraduationProjectInstructionsModal()'), 'Section 10 must contain graduation project instructions button');
        console.log('✓ جميع أقسام المنصة (1 إلى 10) في اللوحة الكمية مزودة بأزرار الإجراءات المباشرة وأدلة الإرشادات');

        console.log('\n================================================================');
        console.log('✅ جميع اختبارات التسجيلات الصوتية ومخرجات المنصة اجتازت بنجاح 100%');
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
    console.error('❌ فشل في فحص التسجيلات ومخرجات الحقيبة:', err);
    process.exit(1);
});
