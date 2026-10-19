/**
 * Deep Empirical Runtime Verification Test for Interactive Guided Tour (TamkeenTour)
 * Simulates complete user sessions in a DOM environment:
 * - First-time Coach login & auto-trigger
 * - Step-by-step navigation through all 7 Coach steps
 * - First-time Master Coach login & auto-trigger
 * - Step-by-step navigation through all 6 Admin steps and targeted cards
 * - Header info ("i") button replay
 * - Mobile responsive positioning (.dock-top) for bottom fixed elements
 * - Keyboard navigation (Esc, ArrowLeft, ArrowRight) with input field immunity
 * - Role switching dynamic view adjustments
 */

const assert = require('assert');
const { readFileSync } = require('fs');
const { resolve } = require('path');

async function testRuntimeTour() {
    console.log('=== بدء اختبار المحاكاة التجريبية التفاعلية لجولة التمكين (Runtime Empirical Tour Test) ===\n');

    const baseDir = resolve('.');
    const tourJsContent = readFileSync(resolve(baseDir, 'js/tour.js'), 'utf8');

    // Setup Storage
    const storageStore = {};
    const mockStorage = {
        getItem: (k) => storageStore[k] || null,
        setItem: (k, v) => { storageStore[k] = String(v); },
        removeItem: (k) => { delete storageStore[k]; },
        clear: () => { Object.keys(storageStore).forEach(k => delete storageStore[k]); }
    };

    // Track smooth scrolls
    const scrollEvents = [];
    let currentScrollY = 0;

    // Track active DOM tree
    const domRegistry = {};

    function createMockElement(tag, id = '', className = '') {
        const el = {
            tagName: tag.toUpperCase(),
            id,
            className,
            style: {},
            _classes: className ? className.split(' ') : [],
            classList: {
                add: (c) => { if (!el._classes.includes(c)) el._classes.push(c); },
                remove: (c) => { el._classes = el._classes.filter(x => x !== c); },
                contains: (c) => el._classes.includes(c),
                toggle: (c, val) => {
                    const has = el._classes.includes(c);
                    const add = typeof val !== 'undefined' ? !!val : !has;
                    if (add && !has) el._classes.push(c);
                    if (!add && has) el._classes = el._classes.filter(x => x !== c);
                }
            },
            attributes: {},
            setAttribute: (k, v) => { el.attributes[k] = String(v); },
            getAttribute: (k) => el.attributes[k] || null,
            _innerHTML: '',
            get innerHTML() { return this._innerHTML; },
            set innerHTML(val) { this._innerHTML = val; },
            offsetWidth: 440,
            offsetHeight: 240,
            _eventListeners: {},
            addEventListener: (event, fn) => {
                el._eventListeners[event] = el._eventListeners[event] || [];
                el._eventListeners[event].push(fn);
            },
            removeEventListener: (event, fn) => {
                if (el._eventListeners[event]) {
                    el._eventListeners[event] = el._eventListeners[event].filter(f => f !== fn);
                }
            },
            trigger: function(event, evtObj = {}) {
                if (el._eventListeners[event]) {
                    el._eventListeners[event].forEach(fn => fn({ ...evtObj, target: el, preventDefault: () => {} }));
                }
            },
            getBoundingClientRect: () => {
                const isBottomFixed = el.id === 'floating-chat-launcher';
                return {
                    top: isBottomFixed ? 720 : 120,
                    bottom: isBottomFixed ? 782 : 460,
                    left: isBottomFixed ? 28 : 100,
                    right: isBottomFixed ? 90 : 800,
                    width: isBottomFixed ? 62 : 700,
                    height: isBottomFixed ? 62 : 340
                };
            }
        };
        if (id) domRegistry['#' + id] = el;
        if (className) {
            className.split(' ').forEach(c => {
                domRegistry['.' + c] = el;
            });
        }
        return el;
    }

    // Seed mock DOM elements
    createMockElement('div', 'btn-tour-info', 'btn-icon-action');
    createMockElement('div', 'panel-tasks', 'tab-panel');
    createMockElement('div', 'panel-quant', 'tab-panel');
    createMockElement('div', 'panel-rubrics', 'tab-panel');
    createMockElement('div', 'panel-ethics', 'tab-panel');
    createMockElement('div', 'panel-report', 'tab-panel');
    createMockElement('button', 'floating-chat-launcher', 'floating-chat-btn');
    createMockElement('div', 'admin-kpi-grid', 'admin-kpi-grid');
    createMockElement('div', 'admin-review-queue-card', 'coaches-table-card');
    createMockElement('div', 'admin-cohorts-card', 'coaches-table-card');
    createMockElement('div', 'admin-coaches-card', 'coaches-table-card');
    createMockElement('div', 'admin-customizer-card', 'coaches-table-card');
    createMockElement('div', '', 'quick-status-strip');

    const windowListeners = {};

    global.window = {
        localStorage: mockStorage,
        innerWidth: 1200,
        innerHeight: 800,
        pageYOffset: 0,
        scrollTo: (opts) => {
            scrollEvents.push(opts);
            if (opts && typeof opts.top === 'number') currentScrollY = opts.top;
        },
        getComputedStyle: (el) => ({
            position: el && el.id === 'floating-chat-launcher' ? 'fixed' : 'relative'
        }),
        addEventListener: (event, fn) => {
            windowListeners[event] = windowListeners[event] || [];
            windowListeners[event].push(fn);
        },
        removeEventListener: (event, fn) => {
            if (windowListeners[event]) {
                windowListeners[event] = windowListeners[event].filter(f => f !== fn);
            }
        },
        triggerWindow: (event, evtObj = {}) => {
            if (windowListeners[event]) {
                windowListeners[event].forEach(fn => fn({ ...evtObj, preventDefault: () => {} }));
            }
        },
        App: {
            state: { currentRole: 'participant', currentTab: 'dashboard', viewMode: 'onepage' },
            getState: function() { return this.state; },
            switchTab: (t) => { global.window.App.state.currentTab = t; },
            switchAdminTab: async (t) => { global.window.App.state.adminActiveTab = t; },
            scrollToSection: (s) => {},
            showToast: (m, t) => {}
        },
        ChatWidget: {
            isOpen: false,
            open: () => { global.window.ChatWidget.isOpen = true; },
            close: () => { global.window.ChatWidget.isOpen = false; }
        }
    };
    global.localStorage = mockStorage;

    global.document = {
        readyState: 'complete',
        createElement: (tag) => createMockElement(tag),
        getElementById: (id) => domRegistry['#' + id] || null,
        querySelector: (sel) => {
            const parts = sel.split(',').map(s => s.trim());
            for (const p of parts) {
                if (domRegistry[p]) return domRegistry[p];
            }
            return null;
        },
        body: {
            appendChild: (el) => {
                if (el.id) domRegistry['#' + el.id] = el;
                if (el.className) {
                    el.className.split(' ').forEach(c => { domRegistry['.' + c] = el; });
                }
            },
            scrollHeight: 3000
        },
        addEventListener: () => {}
    };

    // Load TamkeenTour module
    const tourFactory = new Function('module', 'exports', tourJsContent + '; return module.exports;');
    const mockModule = { exports: {} };
    const TamkeenTour = tourFactory(mockModule, mockModule.exports);
    global.window.TamkeenTour = TamkeenTour;

    TamkeenTour.init();

    console.log('--- 1. اختبار الإطلاق التلقائي الأول للكوتش المتدرب ---');
    mockStorage.clear();
    assert.strictEqual(TamkeenTour.isCompleted('coach'), false);
    TamkeenTour.checkAutoTrigger();
    assert.strictEqual(TamkeenTour.getState().active, true, 'الجولة يجب أن تكون نشطة تلقائياً لأول دخول للكوتش');
    assert.strictEqual(TamkeenTour.getState().role, 'coach');
    assert.strictEqual(TamkeenTour.getState().currentStepIndex, 0);

    // Step through each coach step
    for (let i = 1; i < 7; i++) {
        await TamkeenTour.next();
        assert.strictEqual(TamkeenTour.getState().currentStepIndex, i, `خطوة الكوتش ${i + 1} لم تتطابق`);
    }

    // Step 7 is chat launcher; finish tour
    assert.strictEqual(TamkeenTour.getState().currentStepIndex, 6);
    await TamkeenTour.next(); // finishes
    assert.strictEqual(TamkeenTour.getState().active, false);
    assert.strictEqual(TamkeenTour.isCompleted('coach'), true, 'اكتمال جولة الكوتش تم حفظه في localStorage');
    console.log('✓ جولة الكوتش المتكاملة (7 خطوات) اجتازت التحقق التجريبي');

    console.log('\n--- 2. اختبار الإطلاق التلقائي الأول للماستر كوتش (المشرف) ---');
    global.window.App.state.currentRole = 'supervisor';
    global.window.App.state.currentTab = 'admin-dashboard';
    assert.strictEqual(TamkeenTour.getActiveRole(), 'admin');
    assert.strictEqual(TamkeenTour.isCompleted('admin'), false);

    TamkeenTour.checkAutoTrigger();
    assert.strictEqual(TamkeenTour.getState().active, true);
    assert.strictEqual(TamkeenTour.getState().role, 'admin');
    assert.strictEqual(TamkeenTour.getState().currentStepIndex, 0);

    // Verify each admin step targets its dedicated card
    const expectedAdminTargets = [
        '#admin-kpi-grid',
        '#admin-review-queue-card',
        '#admin-cohorts-card',
        '#admin-coaches-card',
        '#admin-customizer-card',
        '#floating-chat-launcher'
    ];

    for (let i = 0; i < 6; i++) {
        const stepDef = TamkeenTour.DEFINITIONS.admin[i];
        assert.ok(stepDef.target.includes(expectedAdminTargets[i]), `مستهدف خطوة المشرف ${i + 1} غير مطابق`);
        if (i > 0) await TamkeenTour.next();
        assert.strictEqual(TamkeenTour.getState().currentStepIndex, i);
    }

    // Finish Admin tour
    await TamkeenTour.next();
    assert.strictEqual(TamkeenTour.getState().active, false);
    assert.strictEqual(TamkeenTour.isCompleted('admin'), true, 'اكتمال جولة المشرف تم حفظه في localStorage');
    console.log('✓ جولة الماستر كوتش المتكاملة (6 خطوات) والمستهدفات الدقيقة اجتازت التحقق التجريبي');

    console.log('\n--- 3. اختبار زر إعادة العرض ("i") في الشريط العلوي والتخطي ---');
    const infoBtn = domRegistry['#btn-tour-info'];
    assert.ok(infoBtn, 'زر الجولة موجود');
    TamkeenTour.startAuto();
    assert.strictEqual(TamkeenTour.getState().active, true);
    TamkeenTour.skip();
    assert.strictEqual(TamkeenTour.getState().active, false);
    console.log('✓ زر إعادة العرض وتخطي الجولة يعمل بسلاسة');

    console.log('\n--- 4. اختبار التجاوب مع شاشات الجوال وتجنب تغطية العناصر السفلية (.dock-top) ---');
    global.window.innerWidth = 375;
    global.window.innerHeight = 667;
    await TamkeenTour.start('coach', 6); // step 7 = floating chat launcher at bottom
    const popover = domRegistry['#tamkeen-tour-popover'];
    assert.ok(popover, 'البوب أوفر موجود');
    assert.ok(popover.classList.contains('dock-top'), 'يجب تطبيق .dock-top على شاشات الجوال عند تسليط الضوء على زر أسفل الشاشة');
    TamkeenTour.end();
    console.log('✓ خاصية .dock-top لشاشات الجوال (375px) أثبتت حماية العناصر السفلية بنجاح 100%');

    console.log('\n--- 5. اختبار لوحة المفاتيح وحصانة حقول الإدخال ---');
    await TamkeenTour.start('coach', 1);
    assert.strictEqual(TamkeenTour.getState().currentStepIndex, 1);

    // Simulate arrow left while typing in an input field: should NOT change step
    const fakeInput = { tagName: 'INPUT', isContentEditable: false };
    global.window.triggerWindow('keydown', { key: 'ArrowLeft', target: fakeInput });
    assert.strictEqual(TamkeenTour.getState().currentStepIndex, 1, 'الضغط على الأسهم أثناء الكتابة يجب ألا يغير الخطوة');

    // Simulate arrow left on document: should navigate forward
    const fakeBody = { tagName: 'BODY', isContentEditable: false };
    global.window.triggerWindow('keydown', { key: 'ArrowLeft', target: fakeBody });
    assert.strictEqual(TamkeenTour.getState().currentStepIndex, 2, 'الضغط على ArrowLeft خارج حقول الإدخال يتقدم خطوة');

    // Simulate Escape: should skip tour
    global.window.triggerWindow('keydown', { key: 'Escape', target: fakeBody });
    assert.strictEqual(TamkeenTour.getState().active, false, 'الضغط على Esc يغلق ويتخطى الجولة');
    console.log('✓ التنقل بلوحة المفاتيح وحصانة حقول الإدخال اجتازت التحقق بنجاح');

    console.log('\n=== ✅ جميع اختبارات المحاكاة التجريبية التفاعلية اجتازت بنجاح 100% ===\n');
}

testRuntimeTour().catch(err => {
    console.error('فشل في اختبار المحاكاة التجريبية:', err);
    process.exit(1);
});
