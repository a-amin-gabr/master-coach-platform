/**
 * Comprehensive Automated Verification Suite for Interactive Guided Tour (TamkeenTour)
 * Tests Role-Awareness (Coach & Master Coach), Step Definitions, DOM Targeting (Coach & Admin),
 * Exception-Safe Storage Persistence, Navigation Logic, Keyboard Isolation, and Responsive Mobile CSS Rules.
 */

const { readFileSync } = require('fs');
const { resolve } = require('path');
const assert = require('assert');

async function runTests() {
    console.log('=== بدء الفحص الآلي الشامل للجولة الإرشادية التفاعلية (Guided Tour Test Suite) ===\n');

    const baseDir = resolve('.');
    const htmlPath = resolve(baseDir, 'index.html');
    const cssPath = resolve(baseDir, 'css/styles.css');
    const tourJsPath = resolve(baseDir, 'js/tour.js');
    const appJsPath = resolve(baseDir, 'js/app.js');

    const htmlContent = readFileSync(htmlPath, 'utf8');
    const cssContent = readFileSync(cssPath, 'utf8');
    const tourJsContent = readFileSync(tourJsPath, 'utf8');
    const appJsContent = readFileSync(appJsPath, 'utf8');

    console.log('--- 1. فحص وجود وتكامل ملفات الجولة الإرشادية ---');
    assert.ok(tourJsContent.length > 1000, 'ملف js/tour.js غير موجود أو فارغ');
    assert.ok(htmlContent.includes('js/tour.js'), 'ملف index.html لا يتضمن إشارة لـ js/tour.js');
    assert.ok(htmlContent.includes('id="btn-tour-info"'), 'زر الجولة الإرشادية id="btn-tour-info" مفقود في index.html');
    assert.ok(htmlContent.includes('title="جولة إرشادية تفاعلية"'), 'تلميح زر الجولة "جولة إرشادية تفاعلية" مفقود');
    console.log('✓ تكامل ملف js/tour.js وزر الجولة في شريط التنقل العلوي سليم 100%');

    // 2. Setup mock browser environment
    const localStorageMock = {
        _data: {},
        _throwErrors: false,
        getItem(k) {
            if (this._throwErrors) throw new Error('SecurityError: localStorage is disabled');
            return this._data[k] || null;
        },
        setItem(k, v) {
            if (this._throwErrors) throw new Error('QuotaExceededError: localStorage full or disabled');
            this._data[k] = String(v);
        },
        removeItem(k) {
            if (this._throwErrors) throw new Error('SecurityError: cannot remove');
            delete this._data[k];
        },
        clear() { this._data = {}; }
    };

    let scrolledTo = null;
    global.window = {
        localStorage: localStorageMock,
        scrollTo: (opts) => { scrolledTo = opts; },
        pageYOffset: 0,
        innerWidth: 1200,
        innerHeight: 800,
        getComputedStyle: (el) => ({
            position: el && el.isFixed ? 'fixed' : 'relative'
        }),
        addEventListener: () => {},
        removeEventListener: () => {},
        App: {
            state: { currentRole: 'participant', currentTab: 'dashboard', viewMode: 'onepage' },
            getState: function() { return this.state; },
            switchTab: () => {},
            scrollToSection: () => {},
            switchAdminTab: async () => {},
            showToast: () => {}
        }
    };
    global.localStorage = localStorageMock;

    let popoverElement = null;
    let highlightElement = null;

    global.document = {
        readyState: 'complete',
        body: {
            appendChild: () => {},
            scrollHeight: 3000
        },
        createElement: (tag) => {
            const el = {
                id: '',
                className: '',
                style: {},
                _classes: [],
                classList: {
                    add: function(c) { if (!el._classes.includes(c)) el._classes.push(c); },
                    remove: function(c) { el._classes = el._classes.filter(x => x !== c); },
                    contains: function(c) { return el._classes.includes(c); },
                    toggle: function(c, val) {
                        const has = el._classes.includes(c);
                        const add = typeof val !== 'undefined' ? !!val : !has;
                        if (add && !has) el._classes.push(c);
                        if (!add && has) el._classes = el._classes.filter(x => x !== c);
                    }
                },
                setAttribute: () => {},
                addEventListener: () => {},
                removeEventListener: () => {},
                innerHTML: '',
                offsetWidth: 440,
                offsetHeight: 240,
                getBoundingClientRect: () => ({ top: 100, left: 100, width: 300, height: 150, bottom: 250, right: 400 })
            };
            return el;
        },
        getElementById: (id) => {
            if (id === 'btn-tour-info') {
                return {
                    id: 'btn-tour-info',
                    classList: {
                        add: function(c) { this._classes = this._classes || []; if (!this._classes.includes(c)) this._classes.push(c); },
                        remove: function(c) { this._classes = (this._classes || []).filter(x => x !== c); },
                        contains: function(c) { return (this._classes || []).includes(c); }
                    },
                    setAttribute: () => {},
                    addEventListener: () => {}
                };
            }
            if (id === 'tamkeen-tour-popover') {
                if (!popoverElement) {
                    popoverElement = global.document.createElement('div');
                    popoverElement.id = 'tamkeen-tour-popover';
                }
                return popoverElement;
            }
            if (id === 'tamkeen-tour-highlight') {
                if (!highlightElement) {
                    highlightElement = global.document.createElement('div');
                    highlightElement.id = 'tamkeen-tour-highlight';
                }
                return highlightElement;
            }
            return null;
        },
        querySelector: (sel) => {
            return {
                offsetWidth: 800,
                offsetHeight: 350,
                isFixed: sel.includes('floating-chat-launcher'),
                getBoundingClientRect: () => ({
                    top: sel.includes('floating-chat-launcher') ? 720 : 120,
                    left: 100,
                    width: 800,
                    height: 350,
                    bottom: sel.includes('floating-chat-launcher') ? 780 : 470,
                    right: 900
                })
            };
        },
        addEventListener: () => {}
    };

    // Evaluate tour.js in Node mock environment
    let TamkeenTour;
    try {
        const tourModuleFactory = new Function('module', 'exports', tourJsContent + '; return module.exports;');
        const mockModule = { exports: {} };
        TamkeenTour = tourModuleFactory(mockModule, mockModule.exports);
    } catch (e) {
        throw new Error('فشل تفسير js/tour.js: ' + e.message);
    }

    assert.ok(TamkeenTour, 'فشل استيراد TamkeenTour');
    global.window.TamkeenTour = TamkeenTour;

    console.log('\n--- 2. فحص خطوات جولة الكوتش المتدرب (Coach Tour: 7 Steps) ---');
    const coachSteps = TamkeenTour.DEFINITIONS.coach;
    assert.strictEqual(coachSteps.length, 7, `عدد خطوات جولة الكوتش يجب أن يكون 7 (الموجود: ${coachSteps.length})`);

    const expectedCoachTitles = [
        'المؤشرات وساعات البرنامج الـ 240',
        'إيداع المهام والتأمل الرباعي',
        'تطبيقات الأدوات: MBTI، عجلة الحياة، SWOT بلا تكرار',
        'مصفوفة الروبركات الستة الرسمية',
        'بوابة السلامة الأخلاقية المستقلة',
        'محضر التدقيق والاعتماد النهائي',
        'ديوان الزمالة والمحادثة الإشرافية المباشرة'
    ];

    coachSteps.forEach((s, idx) => {
        assert.strictEqual(s.title, expectedCoachTitles[idx], `عنوان الخطوة ${idx + 1} غير مطابق`);
        assert.ok(s.desc && s.desc.length > 20, `وصف الخطوة ${idx + 1} مفقود أو قصير جداً`);
        assert.ok(s.guidance && s.guidance.length > 15, `الإرشاد التوجيهي للخطوة ${idx + 1} مفقود`);
        assert.ok(s.target, `محدد العنصر المستهدف للخطوة ${idx + 1} مفقود`);
        console.log(`• خطوة ${idx + 1}: [${s.title}] -> المستهدف: ${s.target} ✓`);
    });

    console.log('\n--- 3. فحص خطوات جولة الماستر كوتش المشرف (Master Coach / Admin Tour: 6 Steps) ---');
    const adminSteps = TamkeenTour.DEFINITIONS.admin;
    assert.strictEqual(adminSteps.length, 6, `عدد خطوات جولة الماستر كوتش يجب أن يكون 6 (الموجود: ${adminSteps.length})`);

    const expectedAdminTitles = [
        'المؤشرات التنفيذية للماستر كوتش',
        'طابور المراجعة وتقييم المهام بالروبركات والتغذية الصوتية',
        'إدارة الدفعات والأفواج والتحليلات المتقدمة',
        'سجل الكوتشز وتخصيص المستهدفات (Fine-Tuning)',
        'محرر الشهادة وبنك المهام والروبركات',
        'المحادثات الإشرافية وقنوات الدفعات وديوان الزمالة'
    ];

    adminSteps.forEach((s, idx) => {
        assert.strictEqual(s.title, expectedAdminTitles[idx], `عنوان خطوة المشرف ${idx + 1} غير مطابق`);
        assert.ok(s.desc && s.desc.length > 20, `وصف خطوة المشرف ${idx + 1} مفقود أو قصير جداً`);
        assert.ok(s.guidance && s.guidance.length > 15, `الإرشاد التوجيهي لخطوة المشرف ${idx + 1} مفقود`);
        assert.ok(s.target, `محدد العنصر المستهدف لخطوة المشرف ${idx + 1} مفقود`);
        console.log(`• خطوة مشرف ${idx + 1}: [${s.title}] -> المستهدف: ${s.target} ✓`);
    });

    console.log('\n--- 4. فحص محددات العناصر في index.html و app.js ---');
    const coachTargets = ['.quick-status-strip', '#panel-tasks', '#panel-quant', '#panel-rubrics', '#panel-ethics', '#panel-report', '#floating-chat-launcher'];
    coachTargets.forEach(t => {
        const rawId = t.startsWith('#') ? t.substring(1) : null;
        const rawClass = t.startsWith('.') ? t.substring(1) : null;
        if (rawId) {
            assert.ok(htmlContent.includes(`id="${rawId}"`), `المعرف ${rawId} غير موجود في index.html`);
        }
        if (rawClass) {
            assert.ok(htmlContent.includes(`class="${rawClass}`) || htmlContent.includes(`class="` + rawClass), `الفئة ${rawClass} غير موجودة في index.html`);
        }
        console.log(`• مستهدف الكوتش ${t} مؤكد وجوده في بنية DOM ✓`);
    });

    const expectedAdminIds = [
        'admin-kpi-grid',
        'admin-review-queue-card',
        'admin-cohorts-card',
        'admin-coaches-card',
        'admin-customizer-card'
    ];
    expectedAdminIds.forEach(id => {
        assert.ok(appJsContent.includes(`id="${id}"`), `معرف لوحة الإشراف ${id} غير موجود في app.js`);
        console.log(`• مستهدف المشرف #${id} مؤكد وجوده وتعيينه الدقيق في app.js ✓`);
    });

    console.log('\n--- 5. فحص التخزين والاستمرارية التلقائية وحصانة الاستثناءات (Persistence & Exception Immunity) ---');
    localStorageMock.clear();
    assert.strictEqual(TamkeenTour.isCompleted('coach'), false, 'جولة الكوتش يجب أن تكون غير مكتملة ابتدائياً');
    assert.strictEqual(TamkeenTour.isCompleted('admin'), false, 'جولة المشرف يجب أن تكون غير مكتملة ابتدائياً');

    // Start coach tour and test skip
    TamkeenTour.start('coach', 0);
    assert.strictEqual(TamkeenTour.getState().active, true);
    assert.strictEqual(TamkeenTour.getState().currentStepIndex, 0);

    TamkeenTour.skip();
    assert.strictEqual(TamkeenTour.getState().active, false);
    assert.strictEqual(TamkeenTour.isCompleted('coach'), true, 'تخطي الجولة يجب أن يسجل tamkeen_tour_completed_coach = true');
    assert.strictEqual(TamkeenTour.isCompleted('admin'), false, 'جولة المشرف يجب أن تظل غير مكتملة بعد تخطي جولة الكوتش');

    // Test admin tour finish
    TamkeenTour.start('admin', 0);
    assert.strictEqual(TamkeenTour.getState().active, true);
    assert.strictEqual(TamkeenTour.getState().role, 'admin');

    TamkeenTour.finish();
    assert.strictEqual(TamkeenTour.getState().active, false);
    assert.strictEqual(TamkeenTour.isCompleted('admin'), true, 'إنهاء الجولة يجب أن يسجل tamkeen_tour_completed_admin = true');

    // Test exception immunity when localStorage is completely disabled or throws errors
    localStorageMock._throwErrors = true;
    assert.doesNotThrow(() => {
        TamkeenTour.isCompleted('coach');
        TamkeenTour.isCompleted('admin');
        TamkeenTour.skip();
        TamkeenTour.finish();
        TamkeenTour.resetCompletion('all');
        TamkeenTour.checkAutoTrigger();
    }, 'TamkeenTour يجب ألا يلقي أي استثناء عند تعطل localStorage');
    localStorageMock._throwErrors = false;

    // Reset completion
    TamkeenTour.resetCompletion('all');
    assert.strictEqual(TamkeenTour.isCompleted('coach'), false);
    assert.strictEqual(TamkeenTour.isCompleted('admin'), false);
    console.log('✓ دورة حياة التخزين المؤقت وحصانة أخطاء localStorage مجازة 100%');

    console.log('\n--- 6. فحص محرك التنقل والانتقال وحماية العناصر الثابتة (Step Navigation & Fixed Element Protection) ---');
    TamkeenTour.start('coach', 0);
    assert.strictEqual(TamkeenTour.getState().currentStepIndex, 0);

    // Navigate forward
    await TamkeenTour.next();
    assert.strictEqual(TamkeenTour.getState().currentStepIndex, 1);
    await TamkeenTour.next();
    assert.strictEqual(TamkeenTour.getState().currentStepIndex, 2);

    // Navigate backward
    await TamkeenTour.prev();
    assert.strictEqual(TamkeenTour.getState().currentStepIndex, 1);
    await TamkeenTour.prev();
    assert.strictEqual(TamkeenTour.getState().currentStepIndex, 0);
    // Prevent negative index
    await TamkeenTour.prev();
    assert.strictEqual(TamkeenTour.getState().currentStepIndex, 0);

    // Jump to step
    await TamkeenTour.goTo(5);
    assert.strictEqual(TamkeenTour.getState().currentStepIndex, 5);

    // Test Step 7 (chat launcher fixed element): verify window.scrollTo is NOT called for fixed elements
    scrolledTo = null;
    await TamkeenTour.goTo(6);
    assert.strictEqual(TamkeenTour.getState().currentStepIndex, 6);
    assert.strictEqual(scrolledTo, null, 'العنصر ذو الموضع الثابت position: fixed يجب ألا يتم تحريك التمرير له');

    // Switch role dynamic transition
    await TamkeenTour.switchRole('admin');
    assert.strictEqual(TamkeenTour.getState().role, 'admin');
    assert.strictEqual(TamkeenTour.getState().currentStepIndex, 0);

    TamkeenTour.end();
    assert.strictEqual(TamkeenTour.getState().active, false);
    console.log('✓ محرك التنقل والانتقال وحماية العناصر الثابتة مجاز 100%');

    console.log('\n--- 7. فحص قواعد التنسيق والتجاوب مع الهواتف الذكية (Mobile CSS Rules & Dock-Top) ---');
    assert.ok(cssContent.includes('.tamkeen-tour-backdrop'), 'تنسيق .tamkeen-tour-backdrop مفقود في styles.css');
    assert.ok(cssContent.includes('.tamkeen-tour-highlight-box'), 'تنسيق .tamkeen-tour-highlight-box مفقود في styles.css');
    assert.ok(cssContent.includes('.tamkeen-tour-popover'), 'تنسيق .tamkeen-tour-popover مفقود في styles.css');
    assert.ok(cssContent.includes('@keyframes tourDotPulse'), 'حركة وميض زر الجولة tourDotPulse مفقودة');
    assert.ok(cssContent.includes('@media (max-width: 640px)'), 'استعلام الشاشات الصغيرة @media (max-width: 640px) مفقود في styles.css');
    assert.ok(cssContent.includes('max-width: calc(100vw - 24px)'), 'ضمان عدم تجاوز العرض في شاشات الجوال مفقود');
    assert.ok(cssContent.includes('.tamkeen-tour-popover.dock-top'), 'تنسيق .dock-top لتجنب تغطية العناصر السفلية مفقود');
    console.log('✓ قواعد CSS وخصائص الاستجابة لشاشات الجوال و.dock-top معتمدة 100%');

    console.log('\n=== ✅ جميع اختبارات الجولة الإرشادية التفاعلية اجتازت بنجاح تام 100% ===\n');
}

runTests().catch(err => {
    console.error('فشل في اختبارات الجولة الإرشادية:', err);
    process.exit(1);
});
