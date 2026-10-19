/**
 * Tamkeen Al-Roaya Master Coach Platform v3.0
 * Ultra-Responsive Native Arabic Guided Tour Engine (جولة إرشادية تفاعلية مدمجة)
 * 
 * Features:
 * - 100% Zero-dependency vanilla JS module, fully offline.
 * - Role-Aware Tours: 7-Step Coach / Trainee Tour & 6-Step Master Coach / Supervisor Tour.
 * - Hardware-accelerated Spotlight Cutout Overlay with golden glow.
 * - Responsive popover positioning with automatic mobile viewport clamping (375px/390px/414px+).
 * - Full Arabic RTL native typography, step badges, coaching guidance, and keyboard shortcuts.
 * - First-time auto-trigger via localStorage and omnipresent top navbar info ("i") replay button.
 * - Robust exception-safe storage layer and clean non-interfering keyboard handlers.
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.TamkeenTour = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // Storage Keys
    const KEY_COACH_COMPLETED = 'tamkeen_tour_completed_coach';
    const KEY_ADMIN_COMPLETED = 'tamkeen_tour_completed_admin';

    // Safe Storage Wrappers (Exception-Immune)
    function safeGetStorage(key) {
        try {
            return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
        } catch (_) {
            return null;
        }
    }

    function safeSetStorage(key, val) {
        try {
            if (typeof localStorage !== 'undefined') localStorage.setItem(key, String(val));
        } catch (_) {}
    }

    function safeRemoveStorage(key) {
        try {
            if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
        } catch (_) {}
    }

    // Helper: Safely retrieve runtime app state
    function getRuntimeAppState() {
        if (typeof window === 'undefined' || !window.App) return {};
        if (window.App.state) return window.App.state;
        if (typeof window.App.getState === 'function') return window.App.getState() || {};
        return {};
    }

    // SVG Icons Helper for Tour
    const tourIcons = {
        info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
        check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
        arrowLeft: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>',
        arrowRight: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>',
        sparkles: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path></svg>',
        crown: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>',
        graduate: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>',
        close: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
    };

    // Role-Aware Tour Step Definitions
    const TOUR_DEFINITIONS = {
        coach: [
            {
                id: 'coach-kpi',
                target: '.quick-status-strip',
                title: 'المؤشرات وساعات البرنامج الـ 240',
                subtitle: 'المتطلبات الكمية والزمنية المعتمدة',
                desc: 'الشريط التنفيذي العلوي يعرض الإنجاز الزمني والكمي التراكمي: 240 ساعة معتمدة موزعة بين التدريب المباشر والممارسة الميدانية والمختبرات، وتتبع الـ 20 حالة والـ 30 جلسة وتطبيقات الأدوات (90).',
                guidance: 'المؤشرات الكمية تمثل شرطاً أولياً للتأهيل؛ حيث تُحدّث تلقائياً مع كل جلسة ومهمة معتمدة من المشرف.',
                position: 'bottom',
                action: async () => {
                    if (typeof window !== 'undefined' && window.App) {
                        if (typeof window.App.switchTab === 'function') window.App.switchTab('dashboard');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                }
            },
            {
                id: 'coach-tasks',
                target: '#panel-tasks',
                title: 'إيداع المهام والتأمل الرباعي',
                subtitle: 'دورة حياة الإنجاز المهني والأدلة',
                desc: 'بوابة إيداع المهام الـ 8 المعتمدة بالحقيبة؛ تتيح لك رفع الأدلة والشواهد، وإرفاق الملفات الميدانية، وتدوين استمارة التأمل الرباعي المنهجي (الواقع، التحديات، المعالجة، والتعلم المستفاد).',
                guidance: 'كل مهمة تخضع لمراجعة تدقيقية دقيقة من الماستر كوتش المشرف، وتظهر لك التغذية الراجعة فوراً لإعادة التسليم والتحسين المستمر.',
                position: 'top',
                action: async () => {
                    if (typeof window !== 'undefined' && window.App) {
                        const appState = getRuntimeAppState();
                        if (appState.viewMode === 'tabs') {
                            window.App.switchTab('tasks');
                        } else if (typeof window.App.scrollToSection === 'function') {
                            window.App.scrollToSection('panel-tasks');
                        }
                    }
                }
            },
            {
                id: 'coach-tools',
                target: '#panel-quant',
                title: 'تطبيقات الأدوات: MBTI، عجلة الحياة، SWOT بلا تكرار',
                subtitle: 'سجل الـ 90 تطبيقاً الميدانياً',
                desc: 'توثيق وتتبع تطبيقات أدوات الكوتشنج الأساسية الثلاث (30 تطبيقاً لكل أداة = 90 تطبيقاً). النظام مزود بمحرك حظر التكرار الصارم للمستفيدين داخل كل أداة لضمان اتساع وعمق الممارسة المهنية.',
                guidance: 'يمكن للمستفيد الواحد المشاركة في أكثر من أداة مختلفة، ولكن يُحظر برمجياً تكرار نفس المستفيد داخل الأداة الواحدة.',
                position: 'top',
                action: async () => {
                    if (typeof window !== 'undefined' && window.App) {
                        const appState = getRuntimeAppState();
                        if (appState.viewMode === 'tabs') {
                            window.App.switchTab('quant');
                        } else if (typeof window.App.scrollToSection === 'function') {
                            window.App.scrollToSection('panel-quant');
                        }
                    }
                }
            },
            {
                id: 'coach-rubrics',
                target: '#panel-rubrics',
                title: 'مصفوفة الروبركات الستة الرسمية',
                subtitle: 'معايير التقييم المحكمة والمعتمدة 2026',
                desc: 'تتضمن 6 روبركات رسمية (الجلسات الميدانية، ملف الإنجاز، الورقة العلمية، المشروع الابتكاري، المقابلة الختامية، والإشراف المهني) بإجمالي 30 معياراً مقسمة وفق مؤشرات أداء نوعية من 1 إلى 5.',
                guidance: 'يُشترط الحصول على تقييم 3 فأعلى في المعايير الأساسية، واستيفاء كافة بنود التحسين المطلوب المسجلة من قِبل المشرف.',
                position: 'top',
                action: async () => {
                    if (typeof window !== 'undefined' && window.App) {
                        const appState = getRuntimeAppState();
                        if (appState.viewMode === 'tabs') {
                            window.App.switchTab('rubrics');
                        } else if (typeof window.App.scrollToSection === 'function') {
                            window.App.scrollToSection('panel-rubrics');
                        }
                    }
                }
            },
            {
                id: 'coach-ethics',
                target: '#panel-ethics',
                title: 'بوابة السلامة الأخلاقية المستقلة',
                subtitle: 'بوابة مستقلة غير خاضعة للتعويض بالمتوسطات',
                desc: 'صمام الأمان المهني للمنظومة؛ تتأكد من الالتزام بالميثاق الأخلاقي وحماية الخصوصية ونظام الإحالات الطبية والنفسية. أي خلل في المعايير الأخلاقية يُفعّل الحظر التلقائي للاعتماد.',
                guidance: 'المبدأ المنهجي الحاسم: المتوسط الحسابي المرتفع لا يعوض بأي حال أي إخفاق في السلامة الأخلاقية أو المعايير الحرجة.',
                position: 'top',
                action: async () => {
                    if (typeof window !== 'undefined' && window.App) {
                        const appState = getRuntimeAppState();
                        if (appState.viewMode === 'tabs') {
                            window.App.switchTab('ethics');
                        } else if (typeof window.App.scrollToSection === 'function') {
                            window.App.scrollToSection('panel-ethics');
                        }
                    }
                }
            },
            {
                id: 'coach-report',
                target: '#panel-report',
                title: 'محضر التدقيق والاعتماد النهائي',
                subtitle: 'ملف التخرج والقرار الإشرافي',
                desc: 'المحضر الشامل الذي يلخص استيفاء جميع المتطلبات ودرجات الروبركات وتوصية اللجنة العلمية، مع إمكانية استعراض وثيقة الاعتماد الرسمية وطباعتها بصيغة محضر رسمي موثق.',
                guidance: 'عند اكتمال كافة الشروط وعدم وجود أي حظر، يتحول المحضر إلى (ملف تدقيق معتمد ومستوفٍ لكافة معايير 2026).',
                position: 'top',
                action: async () => {
                    if (typeof window !== 'undefined' && window.App) {
                        const appState = getRuntimeAppState();
                        if (appState.viewMode === 'tabs') {
                            window.App.switchTab('report');
                        } else if (typeof window.App.scrollToSection === 'function') {
                            window.App.scrollToSection('panel-report');
                        }
                    }
                }
            },
            {
                id: 'coach-chat',
                target: '#floating-chat-launcher',
                title: 'ديوان الزمالة والمحادثة الإشرافية المباشرة',
                subtitle: 'التوجيه الحي والملاحظات الصوتية',
                desc: 'قناة تواصل فورية ومشفرة للتوجيه الإشرافي الفردي المباشر مع الماستر كوتش عبدالكريم الخليفي، ومشاركة النقاشات التفاعلية مع زملاء الدفعة في ديوان الزمالة.',
                guidance: 'انقر على زر المحادثة في أي وقت لفتح الدرج الجانبي، إرسال الاستفسارات، والاستماع للتوجيهات الصوتية المباشرة.',
                position: 'top',
                action: async () => {
                    if (typeof window !== 'undefined' && window.ChatWidget && window.ChatWidget.isOpen) {
                        try { window.ChatWidget.close(); } catch (_) {}
                    }
                }
            }
        ],
        admin: [
            {
                id: 'admin-kpi',
                target: '#admin-kpi-grid, .admin-kpi-grid',
                title: 'المؤشرات التنفيذية للماستر كوتش',
                subtitle: 'غرفة المراقبة والتحكم الشامل',
                desc: 'متابعة إحصائية فورية ودقيقة لإجمالي الكوتشز المسجلين، طابور المهام بانتظار المراجعة والتدقيق الإشرافي، عدد المهام المعتمدة، ومتوسط تقييمات الروبركات لكافة المتدربين.',
                guidance: 'تمنحك هذه المؤشرات رؤية شاملة لمعدل إنجاز الدفعات ونقاط الاختناق التي تتطلب تدخلاً إشرافياً فورياً.',
                position: 'bottom',
                action: async () => {
                    if (typeof window !== 'undefined' && window.App) {
                        if (typeof window.App.switchTab === 'function') await window.App.switchTab('admin-dashboard');
                        if (typeof window.App.switchAdminTab === 'function') await window.App.switchAdminTab('queue');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                }
            },
            {
                id: 'admin-queue',
                target: '#admin-review-queue-card, .review-queue-grid, .coaches-table-card',
                title: 'طابور المراجعة وتقييم المهام بالروبركات والتغذية الصوتية',
                subtitle: 'التدقيق المهني والتقييم المعياري',
                desc: 'جدول تدقيق الكوتشز المرشحين؛ يمكنك اختيار أي كوتش لمراجعة أدلته المودعة وتقييمها عبر الروبرك، وإرسال تسجيلات صوتية إشرافية وتدوين متطلبات التحسين.',
                guidance: 'النظام يدعم إرفاق التغذية الصوتية المباشرة المسجلة من المتصفح لتعزيز التجربة الإشرافية الحية.',
                position: 'top',
                action: async () => {
                    if (typeof window !== 'undefined' && window.App) {
                        if (typeof window.App.switchTab === 'function') await window.App.switchTab('admin-dashboard');
                        if (typeof window.App.switchAdminTab === 'function') await window.App.switchAdminTab('queue');
                    }
                }
            },
            {
                id: 'admin-cohorts',
                target: '#admin-cohorts-card, .cohorts-grid, .coaches-table-card',
                title: 'إدارة الدفعات والأفواج والتحليلات المتقدمة',
                subtitle: 'المتابعة الإستراتيجية للأفواج التدريبية',
                desc: 'إنشاء وإدارة الدفعات التدريبية وتعيين الكوتشز، وضبط الحصص المستهدفة لكل دفعة، ومتابعة منحنى الإنجاز وتصدير تقارير الأداء المعتمدة بصيغ رقمية احترافية.',
                guidance: 'إدارة الدفعات تتيح عزل بيانات كل فوج ومقارنة نسب الإنجاز وسرعة استيفاء ساعات التدريب الميداني.',
                position: 'top',
                action: async () => {
                    if (typeof window !== 'undefined' && window.App) {
                        if (typeof window.App.switchTab === 'function') await window.App.switchTab('admin-dashboard');
                        if (typeof window.App.switchAdminTab === 'function') await window.App.switchAdminTab('cohorts');
                    }
                }
            },
            {
                id: 'admin-roster',
                target: '#admin-coaches-card, #admin-roster-table-card, .coaches-table-card',
                title: 'سجل الكوتشز وتخصيص المستهدفات (Fine-Tuning)',
                subtitle: 'التحكم في الحسابات والتخصيص الفردي',
                desc: 'إدارة شاملة لحسابات الكوتشز: توليد كلمات مرور قوية وإعادة تعيينها، وتخصيص مستهدفات ساعات وأدوات وروبركات خاصة لكل كوتش وفق متطلبات مساره التأهيلي.',
                guidance: 'ميزة التخصيص الفردي (Fine-Tuning) تسمح بتعديل متطلبات الكوتش دون التأثير على الإعدادات العامة للدفعة.',
                position: 'top',
                action: async () => {
                    if (typeof window !== 'undefined' && window.App) {
                        if (typeof window.App.switchTab === 'function') await window.App.switchTab('admin-dashboard');
                        if (typeof window.App.switchAdminTab === 'function') await window.App.switchAdminTab('coaches');
                    }
                }
            },
            {
                id: 'admin-customizer',
                target: '#admin-customizer-card, .admin-segmented-tabs',
                title: 'محرر الشهادة وبنك المهام والروبركات',
                subtitle: 'تخصيص بنية المنظومة والمحضر الرسمي',
                desc: 'تحكم ديناميكي كامل في هيكل المنظومة: تحرير بنود شهادة التخرج الرسمية، تعديل بنك المهام وأدلتها، وتكييف مصفوفة الكفايات وأوزان معايير الروبركات الستة.',
                guidance: 'أي تعديل تجريه هنا يُحفظ تلقائياً في قاعدة البيانات وينعكس فوراً على واجهات التقييم ومحاضر التدقيق لجميع الكوتشز.',
                position: 'bottom',
                action: async () => {
                    if (typeof window !== 'undefined' && window.App) {
                        if (typeof window.App.switchTab === 'function') await window.App.switchTab('admin-dashboard');
                        if (typeof window.App.switchAdminTab === 'function') await window.App.switchAdminTab('certificate');
                    }
                }
            },
            {
                id: 'admin-chat',
                target: '#floating-chat-launcher',
                title: 'المحادثات الإشرافية وقنوات الدفعات وديوان الزمالة',
                subtitle: 'الإشراف الحي الفردي والجماعي',
                desc: 'إدارة المحادثات الإشرافية المباشرة مع كل كوتش على انفراد، وقنوات الدفعات المستقلة، وقناة ديوان الزمالة العامة مع دعم الرسائل الصوتية والتسجيلات المباشرة والمرفقات.',
                guidance: 'تستطيع التبديل بين القنوات، والاستماع للملاحظات الصوتية وإرسال التوجيهات الحية بكل سلاسة وأمان.',
                position: 'top',
                action: async () => {
                    if (typeof window !== 'undefined' && window.ChatWidget && window.ChatWidget.isOpen) {
                        try { window.ChatWidget.close(); } catch (_) {}
                    }
                }
            }
        ]
    };

    // Guided Tour State
    const tourState = {
        active: false,
        role: 'coach',
        currentStepIndex: 0,
        layoutTimer: null,
        dom: {
            backdrop: null,
            highlightBox: null,
            popover: null,
            infoBtn: null
        },
        keydownListener: null,
        scrollListener: null,
        resizeListener: null
    };

    // Helper: Determine Active Role
    function getActiveRole() {
        if (typeof window === 'undefined') return 'coach';
        if (window.ApiClient && typeof window.ApiClient.isAdmin === 'function' && window.ApiClient.isAdmin()) {
            return 'admin';
        }
        const appState = getRuntimeAppState();
        const role = appState.currentRole;
        const tab = appState.currentTab;
        if (role === 'supervisor' || role === 'committee' || tab === 'admin-dashboard') {
            return 'admin';
        }
        return 'coach';
    }

    // Helper: Ensure Tour DOM Elements
    function ensureTourDOM() {
        if (typeof document === 'undefined') return;

        // Backdrop Veil
        if (!tourState.dom.backdrop) {
            let backdrop = document.getElementById('tamkeen-tour-backdrop');
            if (!backdrop) {
                backdrop = document.createElement('div');
                backdrop.id = 'tamkeen-tour-backdrop';
                backdrop.className = 'tamkeen-tour-backdrop';
                document.body.appendChild(backdrop);
            }
            // Close or skip tour when clicking outside on backdrop
            if (typeof backdrop.addEventListener === 'function') {
                backdrop.addEventListener('click', function (e) {
                    if (e.target === backdrop) {
                        skipTour();
                    }
                });
            }
            tourState.dom.backdrop = backdrop;
        }

        // Highlight Spotlight Frame
        if (!tourState.dom.highlightBox) {
            let box = document.getElementById('tamkeen-tour-highlight');
            if (!box) {
                box = document.createElement('div');
                box.id = 'tamkeen-tour-highlight';
                box.className = 'tamkeen-tour-highlight-box';
                document.body.appendChild(box);
            }
            tourState.dom.highlightBox = box;
        }

        // Popover Card
        if (!tourState.dom.popover) {
            let popover = document.getElementById('tamkeen-tour-popover');
            if (!popover) {
                popover = document.createElement('div');
                popover.id = 'tamkeen-tour-popover';
                popover.className = 'tamkeen-tour-popover';
                popover.setAttribute('role', 'dialog');
                popover.setAttribute('aria-modal', 'true');
                popover.setAttribute('dir', 'rtl');
                document.body.appendChild(popover);
            }
            tourState.dom.popover = popover;
        }

        // Ensure non-active initial state never captures pointer events
        if (!tourState.active) {
            if (tourState.dom.backdrop) {
                tourState.dom.backdrop.style.display = 'none';
                tourState.dom.backdrop.style.pointerEvents = 'none';
            }
            if (tourState.dom.highlightBox) {
                tourState.dom.highlightBox.style.display = 'none';
                tourState.dom.highlightBox.style.pointerEvents = 'none';
            }
            if (tourState.dom.popover) {
                tourState.dom.popover.style.display = 'none';
                tourState.dom.popover.style.pointerEvents = 'none';
            }
        }

        // Header Info Button reference
        tourState.dom.infoBtn = document.getElementById('btn-tour-info');
    }

    // Update Info Button Visual State (Pulse indicator if not completed)
    function updateInfoButtonState() {
        const infoBtn = tourState.dom.infoBtn || (typeof document !== 'undefined' ? document.getElementById('btn-tour-info') : null);
        if (!infoBtn) return;

        const role = getActiveRole();
        const key = role === 'admin' ? KEY_ADMIN_COMPLETED : KEY_COACH_COMPLETED;
        const isDone = !!safeGetStorage(key);

        if (!isDone) {
            infoBtn.classList.add('tour-pulse');
            infoBtn.setAttribute('title', 'ابدأ الجولة الإرشادية التفاعلية للتعرف على المنصة');
        } else {
            infoBtn.classList.remove('tour-pulse');
            infoBtn.setAttribute('title', 'جولة إرشادية تفاعلية (إعادة العرض)');
        }
    }

    // Position Highlight Box and Popover
    function updateLayout(targetEl, preferredPos) {
        if (!tourState.active || !tourState.dom.highlightBox || !tourState.dom.popover) return;

        const box = tourState.dom.highlightBox;
        const popover = tourState.dom.popover;

        const rect = targetEl ? targetEl.getBoundingClientRect() : null;
        const isVisible = !!(rect && (rect.width > 0 || rect.height > 0));

        // 1. Position Spotlight Box
        if (isVisible && rect) {
            const padding = 6;
            const top = Math.max(0, rect.top - padding);
            const left = Math.max(0, rect.left - padding);
            const width = rect.width + (padding * 2);
            const height = rect.height + (padding * 2);

            box.style.display = 'block';
            box.style.top = Math.round(top) + 'px';
            box.style.left = Math.round(left) + 'px';
            box.style.width = Math.round(width) + 'px';
            box.style.height = Math.round(height) + 'px';
        } else {
            // Target not found or hidden: hide highlight box
            box.style.display = 'none';
        }

        // 2. Position Popover Card
        const margin = 14;
        const viewW = typeof window !== 'undefined' ? window.innerWidth : 1200;
        const viewH = typeof window !== 'undefined' ? window.innerHeight : 800;
        const isMobile = viewW <= 640;

        if (isMobile) {
            // Responsive action sheet for mobile viewports
            // If the target element is near the bottom, dock top so popover doesn't cover it
            const targetNearBottom = isVisible && rect && (rect.bottom > (viewH - 260));
            popover.classList.toggle('dock-top', targetNearBottom);
            popover.style.left = '12px';
            popover.style.right = '12px';
            if (targetNearBottom) {
                popover.style.top = '76px';
                popover.style.bottom = 'auto';
            } else {
                popover.style.bottom = '14px';
                popover.style.top = 'auto';
            }
            popover.style.width = 'calc(100vw - 24px)';
            popover.style.maxWidth = '460px';
            popover.style.margin = '0 auto';
            return;
        }

        popover.classList.remove('dock-top');

        const popoverWidth = Math.min(460, viewW - 32);
        popover.style.width = popoverWidth + 'px';
        popover.style.maxWidth = 'calc(100vw - 32px)';
        popover.style.margin = '0';

        const popoverHeight = popover.offsetHeight || 260;

        // If target is invisible or missing, center gracefully
        if (!isVisible || !rect) {
            const top = (viewH - popoverHeight) / 2;
            const left = (viewW - popoverWidth) / 2;
            popover.style.top = Math.round(Math.max(margin, top)) + 'px';
            popover.style.left = Math.round(Math.max(margin, left)) + 'px';
            popover.style.bottom = 'auto';
            popover.style.right = 'auto';
            return;
        }

        // Desktop Adaptive Positioning
        let pos = preferredPos || 'bottom';

        const spaceBelow = viewH - rect.bottom;
        const spaceAbove = rect.top;
        const spaceLeft = rect.left;
        const spaceRight = viewW - rect.right;

        // Auto-flip if insufficient space
        if (pos === 'bottom' && spaceBelow < (popoverHeight + margin) && spaceAbove > (popoverHeight + margin)) {
            pos = 'top';
        } else if (pos === 'top' && spaceAbove < (popoverHeight + margin) && spaceBelow > (popoverHeight + margin)) {
            pos = 'bottom';
        }

        if (pos === 'left' && spaceLeft < (popoverWidth + margin)) {
            pos = spaceBelow > (popoverHeight + margin) ? 'bottom' : (spaceAbove > (popoverHeight + margin) ? 'top' : 'bottom');
        } else if (pos === 'right' && spaceRight < (popoverWidth + margin)) {
            pos = spaceBelow > (popoverHeight + margin) ? 'bottom' : (spaceAbove > (popoverHeight + margin) ? 'top' : 'bottom');
        }

        let top, left;

        if (pos === 'top') {
            top = rect.top - popoverHeight - 14;
            left = rect.left + (rect.width - popoverWidth) / 2;
        } else if (pos === 'bottom') {
            top = rect.bottom + 14;
            left = rect.left + (rect.width - popoverWidth) / 2;
        } else if (pos === 'left') {
            top = rect.top + (rect.height - popoverHeight) / 2;
            left = rect.left - popoverWidth - 16;
        } else if (pos === 'right') {
            top = rect.top + (rect.height - popoverHeight) / 2;
            left = rect.right + 16;
        } else {
            top = (viewH - popoverHeight) / 2;
            left = (viewW - popoverWidth) / 2;
        }

        // Clamp securely inside viewport bounds
        left = Math.max(margin, Math.min(viewW - popoverWidth - margin, left));
        top = Math.max(margin, Math.min(viewH - popoverHeight - margin, top));

        popover.style.top = Math.round(top) + 'px';
        popover.style.left = Math.round(left) + 'px';
        popover.style.bottom = 'auto';
        popover.style.right = 'auto';
    }

    // Render Popover Card Content
    function renderStepContent(step, index, totalSteps, role) {
        const popover = tourState.dom.popover;
        if (!popover) return;

        const isLast = index === totalSteps - 1;
        const otherRole = role === 'admin' ? 'coach' : 'admin';
        const otherRoleTitle = role === 'admin' ? 'عرض جولة الكوتش' : 'عرض جولة الماستر كوتش';

        // Dots markup
        let dotsHtml = '';
        for (let i = 0; i < totalSteps; i++) {
            const cls = i === index ? 'active' : (i < index ? 'completed' : '');
            dotsHtml += `<button class="tour-progress-dot ${cls}" onclick="window.TamkeenTour.goTo(${i})" title="انتقال إلى الخطوة ${i + 1}" aria-label="الخطوة ${i + 1}"></button>`;
        }

        popover.innerHTML = `
            <div class="tour-popover-inner">
                <!-- Header -->
                <div class="tour-popover-header">
                    <div class="tour-header-badges">
                        <span class="tour-step-badge">خطوة ${index + 1} من ${totalSteps}</span>
                        <span class="tour-role-badge ${role}">
                            ${role === 'admin' ? tourIcons.crown : tourIcons.graduate}
                            <span>${role === 'admin' ? 'جولة الماستر كوتش (الإدارة)' : 'جولة الكوتش المتدرب'}</span>
                        </span>
                    </div>

                    <div class="tour-header-actions">
                        <button class="tour-switch-role-btn" onclick="window.TamkeenTour.switchRole('${otherRole}')" title="${otherRoleTitle}">
                            ${otherRoleTitle}
                        </button>
                        <button class="tour-btn-close" onclick="window.TamkeenTour.skip()" title="إغلاق وتخطي الجولة (Esc)" aria-label="إغلاق">
                            ${tourIcons.close}
                        </button>
                    </div>
                </div>

                <!-- Body -->
                <div class="tour-popover-body">
                    <h3 class="tour-step-title">${step.title}</h3>
                    ${step.subtitle ? `<div class="tour-step-subtitle">${step.subtitle}</div>` : ''}
                    <p class="tour-step-desc">${step.desc}</p>

                    ${step.guidance ? `
                        <div class="tour-step-guidance">
                            <div class="tour-guidance-icon">${tourIcons.info}</div>
                            <div class="tour-guidance-text">${step.guidance}</div>
                        </div>
                    ` : ''}
                </div>

                <!-- Footer Navigation -->
                <div class="tour-popover-footer">
                    <div class="tour-progress-dots" role="tablist">
                        ${dotsHtml}
                    </div>

                    <div class="tour-action-buttons">
                        <button class="tour-btn tour-btn-skip" onclick="window.TamkeenTour.skip()">
                            تخطي الجولة
                        </button>

                        <div class="tour-nav-group">
                            <button class="tour-btn tour-btn-prev" onclick="window.TamkeenTour.prev()" ${index === 0 ? 'disabled' : ''}>
                                ${tourIcons.arrowRight}
                                <span>السابق</span>
                            </button>

                            <button class="tour-btn tour-btn-next ${isLast ? 'finish' : ''}" onclick="window.TamkeenTour.next()">
                                <span>${isLast ? 'إنهاء الجولة' : 'التالي'}</span>
                                ${isLast ? tourIcons.check : tourIcons.arrowLeft}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Go to Specific Step
    async function goToStep(index) {
        if (!tourState.active) return;
        const steps = TOUR_DEFINITIONS[tourState.role] || TOUR_DEFINITIONS.coach;
        if (index < 0 || index >= steps.length) return;

        // Cancel previous pending layout adjustments
        if (tourState.layoutTimer) {
            clearTimeout(tourState.layoutTimer);
            tourState.layoutTimer = null;
        }

        tourState.currentStepIndex = index;
        const step = steps[index];

        // 1. Run step prerequisite action if present
        if (typeof step.action === 'function') {
            try {
                await step.action();
            } catch (err) {
                console.warn('TamkeenTour: step action warning', err);
            }
        }

        // Allow microtask / DOM reflow tick
        await new Promise(res => setTimeout(res, 60));

        // 2. Find target element
        const targetEl = step.target ? document.querySelector(step.target) : null;

        // 3. Scroll to target if present and not a fixed element
        if (targetEl && typeof window !== 'undefined') {
            try {
                const isFixed = window.getComputedStyle ? window.getComputedStyle(targetEl).position === 'fixed' : false;
                if (!isFixed) {
                    const rect = targetEl.getBoundingClientRect();
                    const isMobile = window.innerWidth <= 640;
                    const headerOffset = isMobile ? 80 : 130;
                    const elementTop = rect.top + (window.pageYOffset || 0) - headerOffset;
                    window.scrollTo({
                        top: Math.max(0, elementTop),
                        behavior: 'smooth'
                    });
                }
            } catch (_) {}
        }

        // 4. Render popover content
        renderStepContent(step, index, steps.length, tourState.role);

        // 5. Update layout coordinates immediately
        updateLayout(targetEl, step.position);

        // 6. Secondary layout verification after smooth scroll finishes
        tourState.layoutTimer = setTimeout(() => {
            updateLayout(targetEl, step.position);
            tourState.layoutTimer = null;
        }, 100);
    }

    // Keydown Handler for Accessible Keyboard Navigation
    function handleKeyDown(e) {
        if (!tourState.active) return;

        // Do not intercept keystrokes when typing into form fields
        const tagName = e.target && e.target.tagName;
        if (tagName === 'INPUT' || tagName === 'TEXTAREA' || (e.target && e.target.isContentEditable)) {
            return;
        }

        if (e.key === 'Escape') {
            e.preventDefault();
            skipTour();
        } else if (e.key === 'ArrowLeft') {
            // Arabic RTL: Left is forward
            e.preventDefault();
            nextStep();
        } else if (e.key === 'ArrowRight') {
            // Arabic RTL: Right is backward
            e.preventDefault();
            prevStep();
        }
    }

    // Reposition Handler for Window Scroll/Resize
    function handleReposition() {
        if (!tourState.active) return;
        const steps = TOUR_DEFINITIONS[tourState.role] || TOUR_DEFINITIONS.coach;
        const step = steps[tourState.currentStepIndex];
        if (!step) return;
        const targetEl = step.target ? document.querySelector(step.target) : null;
        updateLayout(targetEl, step.position);
    }

    // Start Guided Tour
    async function startTour(role, stepIndex = 0) {
        ensureTourDOM();

        const resolvedRole = (role === 'admin' || role === 'supervisor') ? 'admin' : (role === 'coach' ? 'coach' : getActiveRole());

        // Guard against duplicate concurrent execution
        if (tourState.active && tourState.role === resolvedRole && tourState.currentStepIndex === stepIndex) {
            return;
        }

        tourState.role = resolvedRole;
        tourState.active = true;
        tourState.currentStepIndex = stepIndex;

        // Activate DOM nodes
        if (tourState.dom.backdrop) {
            tourState.dom.backdrop.style.display = 'block';
            tourState.dom.backdrop.style.pointerEvents = 'auto';
            tourState.dom.backdrop.classList.add('active');
        }
        if (tourState.dom.popover) {
            tourState.dom.popover.style.display = 'block';
            tourState.dom.popover.style.pointerEvents = 'auto';
            tourState.dom.popover.classList.add('active');
        }
        if (tourState.dom.highlightBox) {
            tourState.dom.highlightBox.style.display = 'block';
        }

        // Bind global listeners
        if (!tourState.keydownListener && typeof window !== 'undefined') {
            tourState.keydownListener = handleKeyDown;
            window.addEventListener('keydown', handleKeyDown);
        }
        if (!tourState.scrollListener && typeof window !== 'undefined') {
            tourState.scrollListener = handleReposition;
            window.addEventListener('scroll', handleReposition, { passive: true });
        }
        if (!tourState.resizeListener && typeof window !== 'undefined') {
            tourState.resizeListener = handleReposition;
            window.addEventListener('resize', handleReposition, { passive: true });
        }

        await goToStep(stepIndex);
    }

    // Next Step
    async function nextStep() {
        if (!tourState.active) return;
        const steps = TOUR_DEFINITIONS[tourState.role] || TOUR_DEFINITIONS.coach;
        if (tourState.currentStepIndex < steps.length - 1) {
            await goToStep(tourState.currentStepIndex + 1);
        } else {
            finishTour();
        }
    }

    // Previous Step
    async function prevStep() {
        if (!tourState.active) return;
        if (tourState.currentStepIndex > 0) {
            await goToStep(tourState.currentStepIndex - 1);
        }
    }

    // End / Tear Down Tour
    function endTour() {
        tourState.active = false;

        if (tourState.layoutTimer) {
            clearTimeout(tourState.layoutTimer);
            tourState.layoutTimer = null;
        }

        if (tourState.dom.backdrop) {
            tourState.dom.backdrop.classList.remove('active');
            tourState.dom.backdrop.style.display = 'none';
            tourState.dom.backdrop.style.pointerEvents = 'none';
        }
        if (tourState.dom.popover) {
            tourState.dom.popover.classList.remove('active');
            tourState.dom.popover.classList.remove('dock-top');
            tourState.dom.popover.style.display = 'none';
            tourState.dom.popover.style.pointerEvents = 'none';
        }
        if (tourState.dom.highlightBox) {
            tourState.dom.highlightBox.style.display = 'none';
            tourState.dom.highlightBox.style.pointerEvents = 'none';
        }

        if (tourState.keydownListener && typeof window !== 'undefined') {
            window.removeEventListener('keydown', tourState.keydownListener);
            tourState.keydownListener = null;
        }
        if (tourState.scrollListener && typeof window !== 'undefined') {
            window.removeEventListener('scroll', tourState.scrollListener);
            tourState.scrollListener = null;
        }
        if (tourState.resizeListener && typeof window !== 'undefined') {
            window.removeEventListener('resize', tourState.resizeListener);
            tourState.resizeListener = null;
        }

        // Return coach back to dashboard view if they were exploring admin tour preview
        if (typeof window !== 'undefined' && window.App) {
            const actualRole = getActiveRole();
            const appState = getRuntimeAppState();
            if (actualRole === 'coach' && appState.currentTab === 'admin-dashboard' && typeof window.App.switchTab === 'function') {
                window.App.switchTab('dashboard');
            }
        }

        updateInfoButtonState();
    }

    // Skip Tour
    function skipTour() {
        if (!tourState.active) return;
        const role = tourState.role;
        endTour();

        const key = role === 'admin' ? KEY_ADMIN_COMPLETED : KEY_COACH_COMPLETED;
        safeSetStorage(key, 'true');

        if (typeof window !== 'undefined' && window.App && typeof window.App.showToast === 'function') {
            window.App.showToast('تم تخطي الجولة الإرشادية. يمكنك إعادة تشغيلها في أي وقت بالنقر على زر (i) في الأعلى.', 'info');
        }
    }

    // Finish Tour
    function finishTour() {
        if (!tourState.active) return;
        const role = tourState.role;
        endTour();

        const key = role === 'admin' ? KEY_ADMIN_COMPLETED : KEY_COACH_COMPLETED;
        safeSetStorage(key, 'true');

        if (typeof window !== 'undefined' && window.App && typeof window.App.showToast === 'function') {
            const msg = role === 'admin'
                ? 'تهانينا! اكتملت جولة الماستر كوتش الإشرافية بنجاح.'
                : 'تهانينا! اكتملت جولة الكوتش المتدرب بنجاح، نتمنى لك مساراً تأهيلياً مثمراً.';
            window.App.showToast(msg, 'success');
        }
    }

    // Switch Role Tour dynamically
    async function switchRole(newRole) {
        tourState.role = newRole === 'admin' ? 'admin' : 'coach';
        await goToStep(0);
    }

    // Start Auto (Detects active role and launches)
    function startAuto() {
        const role = getActiveRole();
        startTour(role, 0);
    }

    // Auto-Trigger on First Login/Visit
    function checkAutoTrigger(forceOnLogin = false) {
        if (tourState.active) return;

        // Never auto-trigger tour if the user is a guest on the public landing page
        const appState = getRuntimeAppState();
        if (appState && appState.isGuest && !appState.demoPreview && !forceOnLogin) {
            return;
        }

        const role = getActiveRole();
        const key = role === 'admin' ? KEY_ADMIN_COMPLETED : KEY_COACH_COMPLETED;
        const isDone = safeGetStorage(key);

        if (!isDone) {
            startTour(role, 0);
        } else {
            updateInfoButtonState();
        }
    }

    // Reset Completion (Useful for tests and re-testing)
    function resetCompletion(role) {
        if (!role || role === 'all') {
            safeRemoveStorage(KEY_COACH_COMPLETED);
            safeRemoveStorage(KEY_ADMIN_COMPLETED);
        } else if (role === 'admin') {
            safeRemoveStorage(KEY_ADMIN_COMPLETED);
        } else {
            safeRemoveStorage(KEY_COACH_COMPLETED);
        }
        updateInfoButtonState();
    }

    // Initialize module on page load
    function init() {
        ensureTourDOM();
        updateInfoButtonState();

        if (typeof document !== 'undefined') {
            const btn = document.getElementById('btn-tour-info');
            if (btn && !btn._tamkeenTourBound) {
                btn._tamkeenTourBound = true;
                btn.addEventListener('click', function (e) {
                    e.preventDefault();
                    startAuto();
                });
            }
        }
    }

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    }

    // Public API
    return {
        init,
        start: startTour,
        startAuto,
        next: nextStep,
        prev: prevStep,
        goTo: goToStep,
        skip: skipTour,
        finish: finishTour,
        end: endTour,
        switchRole,
        checkAutoTrigger,
        resetCompletion,
        getActiveRole,
        updateInfoButtonState,
        isCompleted: (role) => {
            const key = role === 'admin' ? KEY_ADMIN_COMPLETED : KEY_COACH_COMPLETED;
            return !!safeGetStorage(key);
        },
        getState: () => ({ ...tourState }),
        DEFINITIONS: TOUR_DEFINITIONS
    };
}));
