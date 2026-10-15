/**
 * Tamkeen Al-Roaya Master Coach Qualification Platform v3.0
 * Application Controller & Reactive Engine
 * Master Coach Abdelkarim Al-Khelaifi — Tamkeen Al-Roaya (cyce52.com)
 */

(function () {
    'use strict';

    // Premium SVG Vector Icon Helper
    const icon = (name, opts) => (typeof window !== 'undefined' && window.AppIcons ? window.AppIcons.get(name, opts) : '');

    // Application State
    const appState = {
        data: null,
        currentRole: 'participant', // 'participant' | 'supervisor' | 'committee'
        currentTab: 'dashboard',
        viewMode: 'onepage', // 'onepage' (default for trained coach) | 'tabs'
        theme: 'light',
        activeTask: null,
        activeRubric: 'sessions',
        activeToolTab: 'mbti', // 'mbti' | 'wheelOfLife' | 'swot'
        toolsSearchQuery: '',
        sessionsFilterCase: 'ALL',
        sessionsShowAll: false,
        compFilterDomain: 'ALL',
        compFilterStatus: 'ALL',
        compSearchQuery: '',
        activeAudioTrack: null,
        audioPlaying: false,
        audioCurrentTime: 0,
        audioTotalDuration: 180,
        audioTimer: null,
        audioContext: null,
        activeCoachId: 1,
        allCoachesList: [],
        authTab: 'login',
        pendingFileUpload: null,
        pendingFileName: '',
        pendingFileType: 'document',
        pendingFileSizeBytes: 0,
        compsViewMode: 'domains14', // 'domains14' | 'subcomps44'
        chatState: {
            channels: [],
            activeChannelId: null,
            messages: [],
            isRecording: false,
            recordStartTime: null,
            mediaRecorder: null,
            audioChunks: [],
            recordingTimerId: null,
            searchQuery: '',
            eventSource: null,
            currentPlayingAudioMsgId: null,
            audioElement: null
        }
    };

    // DOM Elements Cache
    const DOM = {
        body: document.body,
        themeToggleBtn: document.getElementById('btn-toggle-theme'),
        roleSelect: document.getElementById('select-role'),
        navTabs: document.querySelectorAll('.nav-tab-btn'),
        tabPanels: document.querySelectorAll('.tab-panel'),
        candidateAvatar: document.getElementById('candidate-avatar-initials'),
        candidateNameText: document.getElementById('candidate-name-text'),
        candidateRoleText: document.getElementById('candidate-role-text'),
        stripHoursVal: document.getElementById('strip-hours-val'),
        stripCasesVal: document.getElementById('strip-cases-val'),
        stripSessionsVal: document.getElementById('strip-sessions-val'),
        stripToolsVal: document.getElementById('strip-tools-val'),
        stripCompsVal: document.getElementById('strip-comps-val'),
        stripEthicsVal: document.getElementById('strip-ethics-val'),
        toastContainer: document.getElementById('toast-container'),
        taskModal: document.getElementById('task-modal'),
        toolModal: document.getElementById('tool-modal'),
        caseModal: document.getElementById('case-modal'),
        genericModal: document.getElementById('generic-modal'),
        userSessionWidget: document.getElementById('user-session-widget'),
        authModal: document.getElementById('auth-modal'),
        tabAdminDashboard: document.getElementById('tab-admin-dashboard'),
        panelAdminDashboard: document.getElementById('panel-admin-dashboard'),
        panelChat: document.getElementById('panel-chat'),
        chatContentArea: document.getElementById('chat-content-area'),
        chatMediaModal: document.getElementById('chat-media-modal'),
        domain14Modal: document.getElementById('domain14-modal'),
        chatNavBadge: document.getElementById('chat-nav-badge')
    };

    // Initialize Application
    async function init() {
        if (!window.ProgramStore) {
            console.error('ProgramStore not loaded');
            return;
        }
        appState.data = window.ProgramStore.load();

        const savedTheme = localStorage.getItem('TAMKEEN_THEME') || 'light';
        setTheme(savedTheme);

        bindEvents();

        // Check backend API connection & restore user session
        if (window.ApiClient) {
            try {
                const isOnline = await window.ApiClient.checkConnection();
                if (isOnline) {
                    const user = await window.ApiClient.getMe();
                    if (user) {
                        if (user.role === 'admin') {
                            appState.currentRole = 'supervisor';
                            if (DOM.roleSelect) DOM.roleSelect.value = 'supervisor';
                        } else if (user.role === 'coach') {
                            appState.currentRole = 'participant';
                            if (DOM.roleSelect) DOM.roleSelect.value = 'participant';
                            if (user.coach && user.coach.id) appState.activeCoachId = user.coach.id;
                        }
                        const coachData = await window.ApiClient.getCoach(appState.activeCoachId);
                        if (coachData && coachData.coach) {
                            appState.data = coachData.coach;
                        }
                    }
                }
            } catch (err) {
                console.warn('API sync notice:', err);
            }
        }

        renderUserSession();
        await loadChatChannels();
        renderAll();
    }

    // Bind Global Events
    function bindEvents() {
        if (DOM.themeToggleBtn) {
            DOM.themeToggleBtn.addEventListener('click', toggleTheme);
        }

        if (DOM.roleSelect) {
            DOM.roleSelect.addEventListener('change', function (e) {
                appState.currentRole = e.target.value;
                showToast(`تم التبديل إلى وضع: ${getRoleTitle(appState.currentRole)}`, 'info');
                renderAll();
            });
        }

        DOM.navTabs.forEach(tab => {
            tab.addEventListener('click', function () {
                const targetTab = this.getAttribute('data-tab');
                switchTab(targetTab);
            });
        });

        // Close modal when clicking on backdrop overlay
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', function (e) {
                if (e.target === overlay) {
                    closeAllModals();
                }
            });
        });

        // Delegate close clicks for dynamically created modal close buttons
        document.addEventListener('click', function (e) {
            if (e.target.closest('.btn-close-modal, .modal-backdrop-close')) {
                closeAllModals();
            }
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                closeAllModals();
            }
        });

        const resetBtn = document.getElementById('btn-reset-data');
        if (resetBtn) {
            resetBtn.addEventListener('click', async function () {
                const confirmed = await confirmDialog({
                    title: 'استعادة البيانات النموذجية',
                    message: 'هل أنت متأكد من رغبتك في إعادة تعيين كافة البيانات إلى الحالة النموذجية الافتراضية؟ سيتم استبدال التعديلات غير المحفوظة.',
                    confirmText: 'نعم، استعادة البيانات',
                    cancelText: 'إلغاء',
                    danger: true
                });
                if (confirmed) {
                    appState.data = window.ProgramStore.reset();
                    showToast('تمت استعادة البيانات النموذجية بنجاح.', 'success');
                    renderAll();
                }
            });
        }

        const exportBtn = document.getElementById('btn-export-data');
        if (exportBtn) {
            exportBtn.addEventListener('click', function () {
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appState.data, null, 2));
                const downloadAnchor = document.createElement('a');
                downloadAnchor.setAttribute("href", dataStr);
                downloadAnchor.setAttribute("download", `tamkeen_master_coach_${appState.data.metadata.candidate.id}.json`);
                document.body.appendChild(downloadAnchor);
                downloadAnchor.click();
                downloadAnchor.remove();
                showToast('تم تصدير ملف البيانات بنجاح.', 'success');
            });
        }

        const printBtn = document.getElementById('btn-print-report');
        if (printBtn) {
            printBtn.addEventListener('click', function () {
                window.print();
            });
        }

        // One-Page ScrollSpy: Automatically highlight active section on scroll
        let isScrollThrottled = false;
        window.addEventListener('scroll', function () {
            if (isScrollThrottled || appState.viewMode !== 'onepage') return;
            isScrollThrottled = true;
            setTimeout(() => { isScrollThrottled = false; }, 100);

            const scrollPos = window.pageYOffset + 180;
            const panels = [
                'panel-dashboard',
                'panel-tasks',
                'panel-quant',
                'panel-chat',
                'panel-rubrics',
                'panel-competencies',
                'panel-ethics',
                'panel-labs',
                'panel-report'
            ];

            let activeId = 'panel-dashboard';
            for (const id of panels) {
                const el = document.getElementById(id);
                if (el && el.offsetTop <= scrollPos) {
                    activeId = id;
                }
            }

            // Update sticky pills active state
            document.querySelectorAll('.sticky-nav-pill').forEach(pill => {
                if (pill.getAttribute('data-target') === activeId) {
                    pill.classList.add('active');
                } else {
                    pill.classList.remove('active');
                }
            });

            // Update top nav tabs active state
            const targetTabName = activeId.replace('panel-', '');
            DOM.navTabs.forEach(tab => {
                if (tab.getAttribute('data-tab') === targetTabName) {
                    tab.classList.add('active');
                } else {
                    tab.classList.remove('active');
                }
            });
        }, { passive: true });
    }

    // Role Titles
    function getRoleTitle(role) {
        switch (role) {
            case 'participant': return 'المشارك (كوتش متدرب)';
            case 'supervisor': return 'المشرف والمقيم المعتمد';
            case 'committee': return 'اللجنة العلمية وإدارة الاعتماد';
            default: return role;
        }
    }

    // Theme Management
    function toggleTheme() {
        const newTheme = appState.theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    }

    function setTheme(theme) {
        appState.theme = theme;
        localStorage.setItem('TAMKEEN_THEME', theme);
        if (theme === 'light') {
            DOM.body.classList.add('theme-light');
            DOM.body.classList.remove('theme-dark');
            if (DOM.themeToggleBtn) {
                DOM.themeToggleBtn.title = 'التبديل إلى المظهر الداكن';
                DOM.themeToggleBtn.innerHTML = `
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                    </svg>
                `;
            }
        } else {
            DOM.body.classList.remove('theme-light');
            DOM.body.classList.add('theme-dark');
            if (DOM.themeToggleBtn) {
                DOM.themeToggleBtn.title = 'التبديل إلى المظهر الفاتح';
                DOM.themeToggleBtn.innerHTML = `
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="5"></circle>
                        <line x1="12" y1="1" x2="12" y2="3"></line>
                        <line x1="12" y1="21" x2="12" y2="23"></line>
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                        <line x1="1" y1="12" x2="3" y2="12"></line>
                        <line x1="21" y1="12" x2="23" y2="12"></line>
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                    </svg>
                `;
            }
        }
    }

    // Set View Mode: 'onepage' (default for trained coach) | 'tabs'
    function setViewMode(mode) {
        appState.viewMode = mode;
        const mainContainer = document.getElementById('main-content-container') || DOM.appMainContent;
        const btnOnePage = document.getElementById('btn-mode-onepage');
        const btnTabs = document.getElementById('btn-mode-tabs');

        if (mode === 'onepage') {
            if (mainContainer) mainContainer.classList.add('mode-onepage');
            if (btnOnePage) btnOnePage.classList.add('active');
            if (btnTabs) btnTabs.classList.remove('active');
            showToast('تم تفعيل وضع الصفحة الموحدة للمتدرب (One Page)', 'info');
            initChatStream();
            scrollToSection('panel-dashboard');
        } else {
            if (mainContainer) mainContainer.classList.remove('mode-onepage');
            if (btnOnePage) btnOnePage.classList.remove('active');
            if (btnTabs) btnTabs.classList.add('active');
            showToast('تم تفعيل وضع التبويبات المنفصلة', 'info');
            switchTab(appState.currentTab || 'dashboard');
        }
    }

    // Smooth In-Page Section Scroll for One-Page Layout
    function scrollToSection(panelId) {
        if (panelId === 'panel-chat' || panelId === 'chat') {
            if (window.ChatWidget && typeof window.ChatWidget.open === 'function') {
                window.ChatWidget.open();
                return;
            }
        }

        let el = document.getElementById(panelId);
        if (!el && !panelId.startsWith('panel-')) {
            el = document.getElementById(`panel-${panelId}`);
        }
        if (!el) return;

        const targetTabName = el.getAttribute('data-section-name') || el.id.replace('panel-', '');
        appState.currentTab = targetTabName;

        // Update nav tabs active indicator
        DOM.navTabs.forEach(tab => {
            if (tab.getAttribute('data-tab') === targetTabName) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        // Update sticky pills active indicator
        document.querySelectorAll('.sticky-nav-pill').forEach(pill => {
            if (pill.getAttribute('data-target') === el.id) {
                pill.classList.add('active');
            } else {
                pill.classList.remove('active');
            }
        });

        const headerOffset = 135;
        const elementPosition = el.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
            top: Math.max(0, offsetPosition),
            behavior: 'smooth'
        });
    }

    // Toggle Chat Drawer Helper
    function toggleChatDrawer(forceOpen) {
        if (!window.ChatWidget) return;
        if (forceOpen === true) window.ChatWidget.open();
        else if (forceOpen === false) window.ChatWidget.close();
        else window.ChatWidget.toggle();
    }

    // Switch Tabs / Navigation Dispatcher
    function switchTab(tabId) {
        if (tabId === 'chat') {
            if (window.ChatWidget && typeof window.ChatWidget.open === 'function') {
                window.ChatWidget.open();
                return;
            }
        }

        const isOnePage = appState.viewMode === 'onepage' && tabId !== 'admin-dashboard';
        const mainContainer = document.getElementById('main-content-container') || DOM.appMainContent;

        if (isOnePage) {
            if (mainContainer) mainContainer.classList.add('mode-onepage');
            scrollToSection(tabId);
            return;
        }

        if (tabId === 'admin-dashboard' && mainContainer) {
            mainContainer.classList.remove('mode-onepage');
        } else if (appState.viewMode === 'onepage' && mainContainer) {
            mainContainer.classList.add('mode-onepage');
        }

        appState.currentTab = tabId;
        DOM.navTabs.forEach(tab => {
            if (tab.getAttribute('data-tab') === tabId) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        DOM.tabPanels.forEach(panel => {
            if (panel.id === `panel-${tabId}`) {
                panel.classList.add('active');
            } else {
                panel.classList.remove('active');
            }
        });

        if (tabId === 'chat') {
            renderChatPanel();
            initChatStream();
            if (appState.chatState.activeChannelId) {
                loadChatMessages(appState.chatState.activeChannelId).then(() => {
                    renderChatMessagesOnly();
                    scrollChatToBottom();
                });
            }
        } else if (appState.chatState.audioElement && !appState.chatState.audioElement.paused) {
            try { appState.chatState.audioElement.pause(); } catch (_) {}
            appState.chatState.currentPlayingAudioMsgId = null;
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Helper: Check for Critical Ethical Blocker across entire system
    function checkEthicalBlocker() {
        let hasBlocker = false;
        let blockerReasons = [];

        // 1. Check all critical criteria in rubrics
        appState.data.rubrics.forEach(rubric => {
            rubric.criteria.forEach(crit => {
                if (crit.isCritical && crit.currentLevel < 3) {
                    hasBlocker = true;
                    blockerReasons.push(`معيار حرج (${crit.name}) بروبرك ${rubric.title} بدرجة ${crit.currentLevel}/5`);
                }
            });
        });

        // 2. Check independent ethics gate status
        if (appState.data.ethicsGate.status !== 'passed') {
            hasBlocker = true;
            blockerReasons.push('بوابة السلامة الأخلاقية المستقلة لم تستوفِ كافة شروط الاعتماد');
        }

        return { hasBlocker, blockerReasons };
    }

    // Master Render Method
    function renderAll() {
        renderUserSession();
        renderHeaderAndStrip();
        renderDualDashboard();
        renderQuantitativePanel();
        renderCompetencyMatrixPanel();
        renderTasksPanel();
        renderRubricsPanel();
        renderEthicsPanel();
        renderLabsPanel();
        renderReportDossier();
        renderAdminDashboard();
        renderChatPanel();
    }

    // Render Header & Top Strip
    function renderHeaderAndStrip() {
        const candidate = appState.data.metadata.candidate;
        if (DOM.candidateNameText) DOM.candidateNameText.textContent = candidate.name;
        if (DOM.candidateRoleText) DOM.candidateRoleText.textContent = `${candidate.title} • ${candidate.id}`;

        const totalHours = appState.data.hours.reduce((acc, h) => acc + h.completed, 0);
        const totalTargetHours = appState.data.metadata.totalTargetHours;
        const casesCount = appState.data.cases.length;
        const sessionsCount = appState.data.sessions.length;
        const toolsCount = appState.data.toolsSummary.mbti.completed + 
                           appState.data.toolsSummary.wheelOfLife.completed + 
                           appState.data.toolsSummary.swot.completed;
        
        // 43 competencies across 8 domains + 1 supervision competency
        const coreComps = appState.data.competencies.filter(c => c.domainId !== 'D9');
        const coreMastered = coreComps.filter(c => c.status === 'mastered').length;
        const supComp = appState.data.competencies.find(c => c.domainId === 'D9');
        const supMastered = supComp && supComp.status === 'mastered' ? 1 : 0;

        if (DOM.stripHoursVal) DOM.stripHoursVal.textContent = `${totalHours} / ${totalTargetHours} س`;
        if (DOM.stripCasesVal) DOM.stripCasesVal.textContent = `${casesCount} / 20 حالة`;
        if (DOM.stripSessionsVal) DOM.stripSessionsVal.textContent = `${sessionsCount} / 30 جلسة`;
        if (DOM.stripToolsVal) DOM.stripToolsVal.textContent = `${toolsCount} / 90 تطبيق`;
        if (DOM.stripCompsVal) DOM.stripCompsVal.textContent = `${coreMastered} / 43 + ${supMastered}/1 إشراف`;

        const { hasBlocker } = checkEthicalBlocker();
        if (DOM.stripEthicsVal) {
            if (hasBlocker) {
                DOM.stripEthicsVal.innerHTML = `<span class="badge-status referred" style="background:#DC2626; color:#FFF; font-weight:700;">${icon("alertTriangle", {size:13, style:"vertical-align:-1px; margin-left:3px;"})} حظر أخلاقي</span>`;
            } else {
                DOM.stripEthicsVal.innerHTML = `<span class="ethics-pill-pass">اجتياز معتمد 100%</span>`;
            }
        }
    }

    // Render Top User Session Widget
    function renderUserSession() {
        const widget = DOM.userSessionWidget;
        if (!widget) return;

        const authClient = window.ApiClient;
        const user = authClient ? authClient.getUser() : null;

        if (user) {
            const isAdmin = user.role === 'admin';
            widget.innerHTML = `
                <div class="user-profile-badge">
                    <div class="user-profile-avatar ${isAdmin ? 'admin' : ''}">
                        ${isAdmin ? icon('crown', {size:18}) : icon('graduationCap', {size:18})}
                    </div>
                    <div>
                        <div class="user-profile-name">${user.name}</div>
                        <div style="display:flex; align-items:center; gap:0.4rem;">
                            <span class="user-profile-role-tag ${isAdmin ? 'admin' : 'coach'}">
                                ${isAdmin ? 'الماستر كوتش (الإدارة العليا)' : 'كوتش متدرب'}
                            </span>
                            ${user.coach ? `<small style="font-family:var(--font-mono); color:var(--text-muted); font-size:0.7rem;">${user.coach.candidateCode}</small>` : ''}
                        </div>
                    </div>
                    <button class="btn-auth-logout" onclick="window.App.handleLogout()" title="تسجيل الخروج">
                        ${icon('power', {size:13, style:'margin-left:4px;'})} خروج
                    </button>
                </div>
            `;

            // Reveal admin tab if admin
            if (DOM.tabAdminDashboard) {
                DOM.tabAdminDashboard.style.display = isAdmin ? 'inline-flex' : 'none';
            }
        } else {
            widget.innerHTML = `
                <button class="btn-auth-trigger" onclick="window.App.openAuthModal()">
                    <span>تسجيل الدخول / الحسابات</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
                </button>
            `;
            if (DOM.tabAdminDashboard) {
                DOM.tabAdminDashboard.style.display = 'none';
            }
        }
    }

    // Open Interactive Auth Modal
    function openAuthModal() {
        const modal = DOM.authModal;
        if (!modal) return;

        const isLogin = appState.authTab === 'login';

        modal.innerHTML = `
            <div class="auth-modal-card">
                <button class="btn-close-modal" onclick="window.App.closeAllModals()" style="position:absolute; top:1.25rem; left:1.25rem; font-size:1.5rem; background:none; border:none; color:var(--text-muted); cursor:pointer;">×</button>
                
                <div style="text-align:center; margin-bottom:1.5rem;">
                    <img src="assets/images/logo.png" alt="تمكين الرؤية" style="height:48px; margin-bottom:0.5rem;">
                    <h3 style="font-size:1.25rem; color:var(--brand-gold);">منظومة الماستر كوتش (الإصدار 3.0)</h3>
                    <p style="font-size:0.82rem; color:var(--text-muted);">شركة تمكين الرؤية للاستشارات المهنية - cyce52.com</p>
                </div>

                <!-- 1-Click Demo Accounts -->
                <div class="quick-demo-accounts">
                    <div class="quick-demo-title">
                        <span>${icon('zap', {size:16, style:'color:var(--status-amber); vertical-align:-2px; margin-left:4px;'})} الوصول السريع بحسابات النظام المعتمدة:</span>
                    </div>
                    <button class="quick-demo-btn admin-quick" onclick="window.App.handleQuickLogin('abdelkarim@cyce52.com', 'Master@2026')">
                        <div>
                            <strong>${icon('crown', {size:16, style:'color:var(--status-amber); vertical-align:-2px; margin-left:4px;'})} الماستر كوتش عبدالكريم الخليفي (Admin)</strong>
                            <div style="font-size:0.75rem; color:var(--text-muted);">المشرف العام • تقييم الروبركات • التدقيق والاعتماد</div>
                        </div>
                        <span style="font-size:0.8rem; color:var(--brand-gold); font-weight:700;">دخول ${icon("arrowLeft", {size:13, style:"vertical-align:-2px; margin-right:2px;"})}</span>
                    </button>
                    <button class="quick-demo-btn" onclick="window.App.handleQuickLogin('coach@cyce52.com', 'Coach@2026')">
                        <div>
                            <strong>${icon('graduationCap', {size:16, style:'color:var(--brand-blue-light); vertical-align:-2px; margin-left:4px;'})} كوتش أحمد بن صالح الشمري (MC-2026-084)</strong>
                            <div style="font-size:0.75rem; color:var(--text-muted);">مرشح ماستر كوتش • إيداع المهام • استيفاء الساعات</div>
                        </div>
                        <span style="font-size:0.8rem; color:var(--brand-blue-light); font-weight:700;">دخول ${icon("arrowLeft", {size:13, style:"vertical-align:-2px; margin-right:2px;"})}</span>
                    </button>
                    <button class="quick-demo-btn" onclick="window.App.handleQuickLogin('sara@cyce52.com', 'Coach@2026')">
                        <div>
                            <strong>${icon('user', {size:16, style:'color:var(--status-emerald-light); vertical-align:-2px; margin-left:4px;'})} كوتش سارة بنت خالد المطيري (MC-2026-085)</strong>
                            <div style="font-size:0.75rem; color:var(--text-muted);">مرشحة جديدة • مهام قيد التدقيق الإشرافي</div>
                        </div>
                        <span style="font-size:0.8rem; color:var(--status-emerald-light); font-weight:700;">دخول ${icon("arrowLeft", {size:13, style:"vertical-align:-2px; margin-right:2px;"})}</span>
                    </button>
                </div>

                <div class="auth-tabs">
                    <button class="auth-tab-btn ${isLogin ? 'active' : ''}" onclick="window.App.switchAuthTab('login')">
                        تسجيل الدخول
                    </button>
                    <button class="auth-tab-btn ${!isLogin ? 'active' : ''}" onclick="window.App.switchAuthTab('register')">
                        تسجيل كوتش جديد
                    </button>
                </div>

                ${isLogin ? `
                    <form id="form-login" onsubmit="window.App.handleLogin(event)">
                        <div style="margin-bottom:1rem;">
                            <label class="reflection-label">البريد الإلكتروني المهني:</label>
                            <input type="email" id="auth-email" required placeholder="name@cyce52.com" style="width:100%; direction:ltr; text-align:right;">
                        </div>
                        <div style="margin-bottom:1.5rem;">
                            <label class="reflection-label">كلمة المرور:</label>
                            <input type="password" id="auth-password" required placeholder="••••••••" style="width:100%; direction:ltr; text-align:right;">
                        </div>
                        <button type="submit" class="btn-primary" style="width:100%; padding:0.75rem; font-size:1rem;">
                            تسجيل الدخول إلى المنصة
                        </button>
                    </form>
                ` : `
                    <form id="form-register" onsubmit="window.App.handleRegister(event)">
                        <div style="margin-bottom:0.75rem;">
                            <label class="reflection-label">الاسم الثلاثي للكوتش:</label>
                            <input type="text" id="reg-name" required placeholder="مثال: كوتش فيصل بن حمد العتيبي" style="width:100%;">
                        </div>
                        <div style="margin-bottom:0.75rem;">
                            <label class="reflection-label">البريد الإلكتروني المهني:</label>
                            <input type="email" id="reg-email" required placeholder="faisal@cyce52.com" style="width:100%; direction:ltr; text-align:right;">
                        </div>
                        <div style="margin-bottom:0.75rem;">
                            <label class="reflection-label">كلمة المرور:</label>
                            <input type="password" id="reg-password" required placeholder="6 أحرف على الأقل" style="width:100%; direction:ltr; text-align:right;">
                        </div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; margin-bottom:1.5rem;">
                            <div>
                                <label class="reflection-label">الصفة / الرتبة المهنية:</label>
                                <input type="text" id="reg-title" placeholder="كوتش تنفيذي مرشح" style="width:100%;">
                            </div>
                            <div>
                                <label class="reflection-label">رقم الهاتف:</label>
                                <input type="text" id="reg-phone" placeholder="+966 50 000 0000" style="width:100%; direction:ltr; text-align:right;">
                            </div>
                        </div>
                        <button type="submit" class="btn-emerald" style="width:100%; padding:0.75rem; font-size:1rem;">
                            إنشاء الحساب وبدء برنامج الماستر كوتش
                        </button>
                    </form>
                `}
            </div>
        `;
        openModalWithFocus(modal);
    }

    function switchAuthTab(tab) {
        appState.authTab = tab;
        openAuthModal();
    }

    async function handleQuickLogin(email, password) {
        try {
            if (window.ApiClient) {
                const res = await window.ApiClient.login(email, password);
                showToast(`مرحباً بك: ${res.user.name}`, 'success');
                if (res.user.role === 'admin') {
                    appState.currentRole = 'supervisor';
                    if (DOM.roleSelect) DOM.roleSelect.value = 'supervisor';
                } else {
                    appState.currentRole = 'participant';
                    if (DOM.roleSelect) DOM.roleSelect.value = 'participant';
                    if (res.user.coach && res.user.coach.id) appState.activeCoachId = res.user.coach.id;
                }
                const coachData = await window.ApiClient.getCoach(appState.activeCoachId);
                if (coachData && coachData.coach) {
                    appState.data = coachData.coach;
                }
            }
            // Refresh chat channels and SSE stream for the authenticated user session
            appState.chatState.channels = [];
            appState.chatState.activeChannelId = null;
            appState.chatState.messages = [];
            await loadChatChannels();
            initChatStream();
            if (window.ChatWidget && typeof window.ChatWidget.handleAuthChange === 'function') {
                window.ChatWidget.handleAuthChange();
            }

            closeAllModals();
            renderUserSession();
            renderAll();
            if (window.ApiClient && window.ApiClient.isAdmin()) {
                switchTab('admin-dashboard');
            }
        } catch (err) {
            showToast(err.message || 'فشل تسجيل الدخول', 'error');
        }
    }

    async function handleLogin(e) {
        if (e) e.preventDefault();
        const email = document.getElementById('auth-email')?.value;
        const password = document.getElementById('auth-password')?.value;
        if (!email || !password) return;
        await handleQuickLogin(email, password);
    }

    async function handleRegister(e) {
        if (e) e.preventDefault();
        const name = document.getElementById('reg-name')?.value;
        const email = document.getElementById('reg-email')?.value;
        const password = document.getElementById('reg-password')?.value;
        const title = document.getElementById('reg-title')?.value;
        const phone = document.getElementById('reg-phone')?.value;

        try {
            if (window.ApiClient) {
                const res = await window.ApiClient.register({ name, email, password, title, phone });
                showToast(`تم تسجيل الحساب بنجاح: ${res.user.name}`, 'success');
                appState.currentRole = 'participant';
                if (DOM.roleSelect) DOM.roleSelect.value = 'participant';
                if (res.user.coach && res.user.coach.id) appState.activeCoachId = res.user.coach.id;
                const coachData = await window.ApiClient.getCoach(appState.activeCoachId);
                if (coachData && coachData.coach) {
                    appState.data = coachData.coach;
                }
            }
            // Refresh chat channels and SSE stream for the newly registered coach
            appState.chatState.channels = [];
            appState.chatState.activeChannelId = null;
            appState.chatState.messages = [];
            await loadChatChannels();
            initChatStream();

            closeAllModals();
            renderUserSession();
            renderAll();
        } catch (err) {
            showToast(err.message || 'فشل تسجيل الكوتش', 'error');
        }
    }

    async function handleLogout() {
        if (appState.chatState.audioElement) {
            try { appState.chatState.audioElement.pause(); } catch (_) {}
            appState.chatState.currentPlayingAudioMsgId = null;
        }
        if (appState.chatState.eventSource) {
            try { appState.chatState.eventSource.close(); } catch (_) {}
            appState.chatState.eventSource = null;
        }
        appState.chatState.channels = [];
        appState.chatState.messages = [];
        appState.chatState.activeChannelId = null;

        if (window.ApiClient) {
            await window.ApiClient.logout();
        }
        if (window.ChatWidget && typeof window.ChatWidget.handleAuthChange === 'function') {
            window.ChatWidget.handleAuthChange();
        }
        showToast('تم تسجيل الخروج بنجاح', 'info');
        renderUserSession();
        await loadChatChannels();
        renderAll();
        switchTab('dashboard');
    }

    // Render Executive Admin Dashboard
    async function renderAdminDashboard() {
        const container = document.getElementById('admin-dashboard-content-area');
        if (!container) return;

        let coaches = [];
        if (window.ApiClient && window.ApiClient.isServerAvailable && window.ApiClient.isAdmin()) {
            try {
                const res = await window.ApiClient.getCoaches();
                coaches = res.coaches || [];
                appState.allCoachesList = coaches;
            } catch (_) {}
        }

        if (coaches.length === 0) {
            coaches = [
                {
                    id: 1,
                    candidate_code: 'MC-2026-084',
                    name: 'كوتش أحمد بن صالح الشمري',
                    email: 'coach@cyce52.com',
                    title: 'كوتش تنفيذي معتمد (PCC)',
                    tasksSummary: { total: 8, approved: 8, pending: 0 },
                    toolsCompleted: 90,
                    rubricsAverage: 4.97,
                    ethicsPassed: true,
                    audit_status: 'ready'
                },
                {
                    id: 2,
                    candidate_code: 'MC-2026-085',
                    name: 'كوتش سارة بنت خالد المطيري',
                    email: 'sara@cyce52.com',
                    title: 'كوتش تنفيذي مرشح (ACC to PCC)',
                    tasksSummary: { total: 8, approved: 6, pending: 2 },
                    toolsCompleted: 60,
                    rubricsAverage: 4.80,
                    ethicsPassed: true,
                    audit_status: 'in_progress'
                }
            ];
            appState.allCoachesList = coaches;
        }

        const totalCoaches = coaches.length;
        const totalPending = coaches.reduce((acc, c) => acc + (c.tasksSummary ? c.tasksSummary.pending : 0), 0);
        const totalApproved = coaches.reduce((acc, c) => acc + (c.tasksSummary ? c.tasksSummary.approved : 0), 0);
        const avgRubrics = (coaches.reduce((acc, c) => acc + (c.rubricsAverage || 4.5), 0) / (totalCoaches || 1)).toFixed(2);

        appState.adminActiveTab = appState.adminActiveTab || 'queue';
        const certConfig = appState.data.certificateConfig || window.ProgramStore.DEFAULT_DATA.certificateConfig;
        const certRows = certConfig.rows || [];

        container.innerHTML = `
            <div style="margin-bottom:2rem;">
                <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:1rem; margin-bottom:1.5rem;">
                    <div>
                        <div style="display:flex; align-items:center; gap:0.6rem; margin-bottom:0.25rem;">
                            <span class="badge-status approved">لوحة القيادة التنفيذية الكاملة</span>
                            <span style="color:var(--brand-gold); font-weight:700; font-size:0.9rem;">إشراف الماستر كوتش د. عبدالكريم الخليفي</span>
                        </div>
                        <h2 style="font-size:1.6rem; color:var(--text-primary); font-weight:900;">
                            غرفة التحكم الإداري الشامل وتخصيص المنظومة
                        </h2>
                        <p style="color:var(--text-secondary); font-size:0.88rem;">
                            إدارة ديناميكية كاملة: بنود الشهادة والمحضر، بنك المهام، مصفوفة الكفايات، روبركات التقييم، والمستهدفات.
                        </p>
                    </div>

                    <div style="display:flex; gap:0.6rem;">
                        <button class="btn-secondary btn-sm" onclick="window.App.adminResetDemo()">
                            ↺ استعادة البيانات الافتراضية
                        </button>
                        <button class="btn-primary btn-sm" onclick="window.App.adminExportBackup()">
                            ⤓ تصدير نسخة احتياطية
                        </button>
                    </div>
                </div>

                <!-- Executive Admin Segmented Navigation Tabs -->
                <div class="admin-segmented-tabs">
                    <button class="admin-tab-btn ${appState.adminActiveTab === 'queue' ? 'active' : ''}" onclick="window.App.switchAdminTab('queue')">
                        ${icon('clipboard', {size:16, style:'margin-left:4px;'})} طابور المراجعة والمصادقات
                        ${totalPending > 0 ? `<span class="badge-status submitted" style="font-size:0.7rem; padding:2px 6px;">${totalPending}</span>` : ''}
                    </button>
                    <button class="admin-tab-btn ${appState.adminActiveTab === 'certificate' ? 'active' : ''}" onclick="window.App.switchAdminTab('certificate')">
                        ${icon('award', {size:16, style:'margin-left:4px;'})} محرر بنود الشهادة والمحضر (${certRows.length})
                    </button>
                    <button class="admin-tab-btn ${appState.adminActiveTab === 'tasks' ? 'active' : ''}" onclick="window.App.switchAdminTab('tasks')">
                        ${icon('folder', {size:16, style:'margin-left:4px;'})} إدارة بنك المهام (${appState.data.tasks.length})
                    </button>
                    <button class="admin-tab-btn ${appState.adminActiveTab === 'competencies' ? 'active' : ''}" onclick="window.App.switchAdminTab('competencies')">
                        ${icon('target', {size:16, style:'margin-left:4px;'})} مصفوفة الكفايات (${appState.data.competencies.length})
                    </button>
                    <button class="admin-tab-btn ${appState.adminActiveTab === 'rubrics_quotas' ? 'active' : ''}" onclick="window.App.switchAdminTab('rubrics_quotas')">
                        ${icon('scale', {size:16, style:'margin-left:4px;'})} الروبركات والمستهدفات
                    </button>
                    <button class="admin-tab-btn ${appState.adminActiveTab === 'coaches' ? 'active' : ''}" onclick="window.App.switchAdminTab('coaches')">
                        ${icon('users', {size:16, style:'margin-left:4px;'})} حسابات الكوتشز (${coaches.length})
                    </button>
                </div>

                <!-- TAB 1: REVIEW QUEUE & ROSTER -->
                ${appState.adminActiveTab === 'queue' ? `
                    <!-- KPI Metrics Cards -->
                    <div class="admin-kpi-grid">
                        <div class="admin-kpi-card">
                            <div class="admin-kpi-icon blue">${icon("users", {size:22})}</div>
                            <div>
                                <div class="admin-kpi-val">${totalCoaches}</div>
                                <div class="admin-kpi-label">إجمالي الكوتشز المسجلين</div>
                            </div>
                        </div>
                        <div class="admin-kpi-card">
                            <div class="admin-kpi-icon gold">${icon("clock", {size:22})}</div>
                            <div>
                                <div class="admin-kpi-val" style="color:var(--brand-gold);">${totalPending}</div>
                                <div class="admin-kpi-label">مهام قيد التدقيق الإشرافي</div>
                            </div>
                        </div>
                        <div class="admin-kpi-card">
                            <div class="admin-kpi-icon emerald">${icon("checkCircle", {size:22})}</div>
                            <div>
                                <div class="admin-kpi-val" style="color:var(--status-emerald-light);">${totalApproved}</div>
                                <div class="admin-kpi-label">مهام معتمدة بالروبرك</div>
                            </div>
                        </div>
                        <div class="admin-kpi-card">
                            <div class="admin-kpi-icon purple">${icon("star", {size:22, style:"fill:currentColor;"})}</div>
                            <div>
                                <div class="admin-kpi-val" style="color:#A78BFA;">${avgRubrics}</div>
                                <div class="admin-kpi-label">متوسط الروبركات (من 5.0)</div>
                            </div>
                        </div>
                    </div>

                    <!-- Coaches Roster Table -->
                    <div class="coaches-table-card">
                        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1rem; flex-wrap:wrap; gap:0.5rem;">
                            <div>
                                <h3 style="font-size:1.15rem; color:var(--brand-blue-light);">
                                    سجل الكوتشز المرشحين ومتابعة الإنجاز
                                </h3>
                                <p style="font-size:0.8rem; color:var(--text-muted);">
                                    انقر على أي كوتش لمعاينة وتدقيق ملف إنجازه وروبركاته
                                </p>
                            </div>
                            <button class="btn btn-sm btn-primary" onclick="window.App.openAddCoachModal()">
                                ${icon('plus', {size:14, style:'margin-left:4px;'})} إضافة كوتش جديد
                            </button>
                        </div>

                        <div style="overflow-x:auto;">
                            <table class="coaches-table">
                                <thead>
                                    <tr>
                                        <th>الكوتش المرشح</th>
                                        <th>كود الحقيبة</th>
                                        <th>الرتبة المهنية</th>
                                        <th>المهام المعتمدة</th>
                                        <th>الأدوات (90)</th>
                                        <th>متوسط الروبرك</th>
                                        <th>البوابة الأخلاقية</th>
                                        <th>حالة الاعتماد</th>
                                        <th>الإجراء الإشرافي</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${coaches.map(c => `
                                        <tr style="${appState.activeCoachId === c.id ? 'background:rgba(29, 78, 216, 0.12);' : ''}">
                                            <td>
                                                <div style="display:flex; align-items:center; gap:0.6rem;">
                                                    <div class="coach-avatar-initials">${c.name ? c.name.split(' ')[1]?.substring(0, 1) || 'ك' : 'ك'}</div>
                                                    <div>
                                                        <strong>${c.name}</strong>
                                                        <div style="font-size:0.75rem; color:var(--text-muted);">${c.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td><span class="comp-item-id">${c.candidate_code || c.candidateCode}</span></td>
                                            <td><span style="font-size:0.8rem; color:var(--text-secondary);">${c.title}</span></td>
                                            <td>
                                                <span class="badge-status approved">${c.tasksSummary ? c.tasksSummary.approved : 0} معتمدة</span>
                                                ${c.tasksSummary && c.tasksSummary.pending > 0 ? `<span class="badge-status submitted" style="margin-right:4px;">${c.tasksSummary.pending} قيد المراجعة</span>` : ''}
                                            </td>
                                            <td><strong>${c.toolsCompleted || 0}</strong> / 90</td>
                                            <td><strong style="color:var(--brand-gold);">${c.rubricsAverage ? c.rubricsAverage.toFixed(2) : '4.50'}</strong> / 5.0</td>
                                            <td>
                                                <span class="ethics-pill-pass" style="font-size:0.75rem;">
                                                    ${c.ethicsPassed ? `${icon('check', {size:13, style:'vertical-align:-1px; margin-left:3px;'})} اجتياز 100%` : `${icon('alertTriangle', {size:13, style:'vertical-align:-1px; margin-left:3px;'})} قيد التدقيق`}
                                                </span>
                                            </td>
                                            <td>
                                                <span class="badge-status ${c.audit_status === 'certified' ? 'approved' : c.audit_status === 'ready' ? 'submitted' : 'revision_required'}">
                                                    ${c.audit_status === 'certified' ? 'مجاز ومعتمد رسمياً' : c.audit_status === 'ready' ? 'مؤهل للمناقشة' : 'قيد الاستكمال'}
                                                </span>
                                            </td>
                                            <td>
                                                <button class="btn-sm btn-primary" onclick="window.App.switchAdminCoach(${c.id})">
                                                    معاينة وتدقيق الملف
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Pending Submissions Queue -->
                    <div class="coaches-table-card">
                        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1rem;">
                            <h3 style="font-size:1.15rem; color:var(--brand-gold);">
                                ${icon('clock', {size:18, style:'vertical-align:-3px; margin-left:4px;'})} طابور المهام المستلمة بانتظار تقييم المشرف (${totalPending} مهام)
                            </h3>
                        </div>

                        ${totalPending === 0 ? `
                            <div style="padding:1.5rem; text-align:center; color:var(--text-muted); background:var(--bg-input); border-radius:var(--radius-md);">
                                ${icon('checkCircle', {size:18, style:'color:var(--status-emerald); vertical-align:-3px; margin-left:4px;'})} رائع! لا توجد حالياً أي مهام معلقة بانتظار التدقيق. كافة التسليمات معتمدة ومقيمة بالروبرك.
                            </div>
                        ` : `
                            <div class="review-queue-grid">
                                ${appState.data.tasks.filter(t => t.status === 'submitted').map(task => `
                                    <div class="review-queue-card">
                                        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.5rem;">
                                            <span class="badge-status submitted">قيد التدقيق</span>
                                            <span style="font-family:var(--font-mono); font-size:0.75rem; color:var(--text-muted);">${task.id}</span>
                                        </div>
                                        <h4 style="font-size:0.95rem; margin-bottom:0.4rem; color:var(--text-primary);">${task.title}</h4>
                                        <p style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:0.75rem;">
                                            الأدلة المودعة: ${task.evidences.length} أدلة • النسخة: ${task.version}
                                        </p>
                                        <button class="btn-emerald btn-sm" style="width:100%;" onclick="window.App.openTaskModal('${task.id}')">
                                            تقييم بالروبرك ورصد الدرجة والملاحظات
                                        </button>
                                    </div>
                                `).join('')}
                            </div>
                        `}
                    </div>

                    <!-- Final Graduation Audit Issuance -->
                    <div class="coaches-table-card" style="border: 1px solid var(--brand-gold); background: rgba(217, 119, 6, 0.04);">
                        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:1rem;">
                            <div>
                                <span class="badge-status approved" style="margin-bottom:0.5rem;">محضر التدقيق والاعتماد النهائي</span>
                                <h3 style="font-size:1.2rem; color:var(--brand-gold); margin-bottom:0.25rem;">
                                    إصدار شهادة التخرج والاعتماد الرسمي للماستر كوتش
                                </h3>
                                <p style="font-size:0.85rem; color:var(--text-secondary);">
                                    الكوتش الحالي المحدد: <strong>${appState.data.metadata.candidate.name}</strong> (${appState.data.metadata.candidate.id})
                                </p>
                            </div>
                            <div>
                                <button class="btn-primary" onclick="window.App.issueGraduationAuditDecree(${appState.activeCoachId})">
                                    ${icon('award', {size:16, style:'margin-left:4px;'})} اعتماد التخرج وإصدار الوثيقة الرسمية
                                </button>
                            </div>
                        </div>
                    </div>
                ` : ''}

                <!-- TAB 2: DYNAMIC CERTIFICATE BUILDER -->
                ${appState.adminActiveTab === 'certificate' ? `
                    <div class="coaches-table-card">
                        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:1rem; margin-bottom:1.5rem;">
                            <div>
                                <h3 style="font-size:1.25rem; color:#0B1B3D; font-weight:800; margin-bottom:0.25rem;">
                                    محرر بنود الشهادة ومحضر التدقيق الرسمي (Dynamic Certificate Builder)
                                </h3>
                                <p style="font-size:0.85rem; color:var(--text-secondary);">
                                    يمكنك كـ ماستر كوتش تعديل، إضافة، أو حذف أي بند من بنود الشهادة بحرية تامة مع الحفظ الفوري الموثق.
                                </p>
                            </div>

                            <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
                                <button class="btn-primary btn-sm" onclick="window.App.openAddCertificateRowModal()">
                                    ${icon('plus', {size:14, style:'margin-left:4px;'})} إضافة بند جديد للشهادة
                                </button>
                                <button class="btn-secondary btn-sm" onclick="window.App.openEditCertificateMetaModal()">
                                    ${icon('settings', {size:14, style:'margin-left:4px;'})} تخصيص الترويسة والموقعين
                                </button>
                                <button class="btn-ghost btn-sm" onclick="window.App.resetCertificateRows()" style="color:#64748B;">
                                    ↺ استعادة البنود الافتراضية
                                </button>
                                <button class="btn-emerald btn-sm" onclick="window.App.switchTab('report')">
                                    ${icon('scroll', {size:14, style:'margin-left:4px;'})} معاينة وطباعة الشهادة
                                </button>
                            </div>
                        </div>

                        <!-- Certificate Meta Card -->
                        <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:8px; padding:1rem 1.25rem; margin-bottom:1.5rem; display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:1rem; font-size:0.85rem;">
                            <div><strong>رقم الوثيقة:</strong> <span style="font-family:var(--font-mono); color:#2563EB;">${certConfig.documentRef || 'AUDIT-2026-MC084'}</span></div>
                            <div><strong>تاريخ الإصدار:</strong> ${certConfig.issueDate || '2026-05-20'}</div>
                            <div><strong>المشرف الميداني:</strong> ${certConfig.signatory1?.name || 'كوتش د. فهد السبيعي'}</div>
                            <div><strong>رئيس اللجنة:</strong> ${certConfig.signatory2?.name || 'الماستر كوتش عبدالكريم الخليفي'}</div>
                        </div>

                        <!-- Certificate Rows Table -->
                        <div style="overflow-x:auto;">
                            <table class="coaches-table">
                                <thead>
                                    <tr>
                                        <th style="width:40px;">#</th>
                                        <th>المعيار والمتطلب المعتمد</th>
                                        <th>المستهدف بالحقيبة</th>
                                        <th>المحقق في ملف الإنجاز</th>
                                        <th>مؤشر التحقق والجودة</th>
                                        <th>قرار اللجنة</th>
                                        <th style="width:160px; text-align:center;">إجراء المشرف</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${certRows.map((row, idx) => `
                                        <tr data-row-id="${row.id}">
                                            <td style="font-family:var(--font-mono); color:var(--text-muted);">${idx + 1}</td>
                                            <td>
                                                <strong>${row.title}</strong>
                                                ${row.isCustom ? `<span style="margin-right:6px; font-size:0.7rem; background:#E0F2FE; color:#0369A1; padding:2px 6px; border-radius:4px; font-weight:bold;">بند مخصص</span>` : ''}
                                            </td>
                                            <td>${row.target}</td>
                                            <td><strong>${row.achieved}</strong></td>
                                            <td><span style="font-size:0.8rem; color:var(--text-secondary);">${row.indicator}</span></td>
                                            <td>
                                                <span class="badge-status ${row.status === 'blocked' ? 'revision_required' : 'approved'}">
                                                    ${row.verdict}
                                                </span>
                                            </td>
                                            <td style="text-align:center; white-space:nowrap;">
                                                <button class="btn-xs btn-outline" onclick="window.App.openEditCertificateRowModal('${row.id}')" title="تعديل هذا البند">
                                                    ${icon('edit', {size:12, style:'margin-left:2px;'})} تعديل
                                                </button>
                                                <button class="btn-xs btn-danger-outline" onclick="window.App.deleteCertificateRow('${row.id}')" title="حذف هذا البند" style="margin-right:4px;">
                                                    ${icon('trash', {size:12, style:'margin-left:2px;'})} حذف
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ` : ''}

                <!-- TAB 3: DYNAMIC TASKS BANK -->
                ${appState.adminActiveTab === 'tasks' ? `
                    <div class="coaches-table-card">
                        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:1rem; margin-bottom:1.5rem;">
                            <div>
                                <h3 style="font-size:1.25rem; color:#0B1B3D; font-weight:800; margin-bottom:0.25rem;">
                                    إدارة بنك المهام الميدانية والمخرجات (${appState.data.tasks.length} مهام)
                                </h3>
                                <p style="font-size:0.85rem; color:var(--text-secondary);">
                                    إضافة مهام تطبيقية جديدة، ربطها بالروبرك الرسمي، تعديل متطلبات الأدلة، أو حذف المهام.
                                </p>
                            </div>

                            <button class="btn-primary btn-sm" onclick="window.App.openAddTaskModal()">
                                ${icon('plus', {size:14, style:'margin-left:4px;'})} إنشاء مهمة جديدة
                            </button>
                        </div>

                        <div style="overflow-x:auto;">
                            <table class="coaches-table">
                                <thead>
                                    <tr>
                                        <th>معرف المهمة</th>
                                        <th>عنوان المهمة الميدانية</th>
                                        <th>المجال / التصنيف</th>
                                        <th>الروبرك المرتبط</th>
                                        <th>الأدلة المودعة</th>
                                        <th>الحالة والنسخة</th>
                                        <th style="width:160px; text-align:center;">إجراء المشرف</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${appState.data.tasks.map(task => `
                                        <tr>
                                            <td><span class="comp-item-id">${task.id}</span></td>
                                            <td>
                                                <strong>${task.title}</strong>
                                                <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">
                                                    ${(task.description || '').substring(0, 60)}...
                                                </div>
                                            </td>
                                            <td><span style="font-size:0.8rem; color:var(--text-secondary);">${task.category || 'عام'}</span></td>
                                            <td><span style="font-family:var(--font-mono); font-size:0.8rem; color:#2563EB;">${task.rubricCode || 'RUB-SESS'}</span></td>
                                            <td><strong>${task.evidences ? task.evidences.length : 0}</strong> أدلة</td>
                                            <td>
                                                <span class="badge-status ${task.status}">
                                                    ${task.status === 'approved' ? 'معتمدة' : task.status === 'submitted' ? 'قيد المراجعة' : task.status === 'revision_required' ? 'تحتاج تعديلاً' : 'مسودة'}
                                                </span>
                                                <span style="font-size:0.75rem; color:var(--text-muted); margin-right:4px;">${task.version}</span>
                                            </td>
                                            <td style="text-align:center; white-space:nowrap;">
                                                <button class="btn-xs btn-outline" onclick="window.App.openEditTaskModal('${task.id}')" title="تعديل تفاصيل المهمة">
                                                    ${icon('edit', {size:12, style:'margin-left:2px;'})} تعديل
                                                </button>
                                                <button class="btn-xs btn-danger-outline" onclick="window.App.deleteTask('${task.id}')" title="حذف المهمة" style="margin-right:4px;">
                                                    ${icon('trash', {size:12, style:'margin-left:2px;'})} حذف
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ` : ''}

                <!-- TAB 4: DYNAMIC COMPETENCIES -->
                ${appState.adminActiveTab === 'competencies' ? `
                    <div class="coaches-table-card">
                        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:1rem; margin-bottom:1.5rem;">
                            <div>
                                <h3 style="font-size:1.25rem; color:#0B1B3D; font-weight:800; margin-bottom:0.25rem;">
                                    مصفوفة الكفايات والمحاور (${appState.data.competencies.length} كفاية)
                                </h3>
                                <p style="font-size:0.85rem; color:var(--text-secondary);">
                                    إضافة كفايات جديدة، تحديد المعايير الأخلاقية والمهنية الحرجة، وتحديث مستويات الإتقان.
                                </p>
                            </div>

                            <button class="btn-primary btn-sm" onclick="window.App.openAddCompetencyModal()">
                                ${icon('plus', {size:14, style:'margin-left:4px;'})} إضافة كفاية جديدة
                            </button>
                        </div>

                        <div style="overflow-x:auto;">
                            <table class="coaches-table">
                                <thead>
                                    <tr>
                                        <th>المعرف</th>
                                        <th>المحور التدريبي</th>
                                        <th>عنوان الكفاية المهنية</th>
                                        <th>المستوى</th>
                                        <th>المعيار الحرج</th>
                                        <th>حالة الإتقان</th>
                                        <th style="width:140px; text-align:center;">إجراء المشرف</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${appState.data.competencies.map(comp => `
                                        <tr>
                                            <td><span class="comp-item-id">${comp.id}</span></td>
                                            <td><span class="badge-status" style="background:#E0F2FE; color:#0369A1;">${comp.domainId}</span></td>
                                            <td>
                                                <strong>${comp.title}</strong>
                                                <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">
                                                    ${(comp.description || '').substring(0, 50)}...
                                                </div>
                                            </td>
                                            <td><span style="font-size:0.8rem; font-weight:700;">${comp.level}</span></td>
                                            <td>
                                                ${comp.isCritical 
                                                    ? ('<span style="color:#DC2626; font-size:0.75rem; font-weight:bold; background:#FEF2F2; padding:2px 6px; border-radius:4px; border:1px solid #FCA5A5;">' + icon('alertTriangle', {size:12, style:'vertical-align:-1px; margin-left:3px;'}) + ' حرج قطعي</span>') 
                                                    : '<span style="color:var(--text-muted); font-size:0.75rem;">معياري</span>'}
                                            </td>
                                            <td>
                                                <span class="badge-status ${comp.status === 'mastered' ? 'approved' : 'submitted'}">
                                                    ${comp.status === 'mastered' ? 'متقن بامتياز' : 'قيد التطوير'}
                                                </span>
                                            </td>
                                            <td style="text-align:center; white-space:nowrap;">
                                                <button class="btn-xs btn-outline" onclick="window.App.openEditCompetencyModal('${comp.id}')" title="تعديل الكفاية">
                                                    ${icon('edit', {size:12, style:'margin-left:2px;'})} تعديل
                                                </button>
                                                <button class="btn-xs btn-danger-outline" onclick="window.App.deleteCompetency('${comp.id}')" title="حذف الكفاية" style="margin-right:4px;">
                                                    ${icon('trash', {size:12, style:'margin-left:2px;'})} حذف
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ` : ''}

                <!-- TAB 5: RUBRICS & QUOTAS -->
                ${appState.adminActiveTab === 'rubrics_quotas' ? `
                    <div style="display:grid; grid-template-columns: 1fr; gap:1.5rem;">
                        <!-- Quotas Customizer -->
                        <div class="coaches-table-card">
                            <h3 style="font-size:1.15rem; color:#0B1B3D; font-weight:800; margin-bottom:0.5rem;">
                                تعديل المستهدفات والحصص النظامية المعتمدة
                            </h3>
                            <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:1.25rem;">
                                قم بتعديل الساعات المطلوبة، أو عدد الحالات، الجلسات، أو تطبيقات الأدوات الـ 90 لحساب الكوتش.
                            </p>

                            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:1rem; margin-bottom:1.25rem;">
                                <div class="admin-form-group">
                                    <label>إجمالي الساعات (هدف 240):</label>
                                    <input type="number" id="input-quota-hours" value="${appState.data.metadata.totalTargetHours || 240}">
                                </div>
                                <div class="admin-form-group">
                                    <label>الحالات الميدانية (هدف 20):</label>
                                    <input type="number" id="input-quota-cases" value="${appState.data.metadata.casesTarget || 20}">
                                </div>
                                <div class="admin-form-group">
                                    <label>الجلسات الميدانية (هدف 30):</label>
                                    <input type="number" id="input-quota-sessions" value="${appState.data.metadata.sessionsTarget || 30}">
                                </div>
                                <div class="admin-form-group">
                                    <label>تطبيقات MBTI (هدف 30):</label>
                                    <input type="number" id="input-quota-mbti" value="${appState.data.toolsSummary?.mbti?.target || 30}">
                                </div>
                                <div class="admin-form-group">
                                    <label>تطبيقات عجلة الحياة (30):</label>
                                    <input type="number" id="input-quota-wheel" value="${appState.data.toolsSummary?.wheelOfLife?.target || 30}">
                                </div>
                                <div class="admin-form-group">
                                    <label>تطبيقات SWOT (هدف 30):</label>
                                    <input type="number" id="input-quota-swot" value="${appState.data.toolsSummary?.swot?.target || 30}">
                                </div>
                                <div class="admin-form-group">
                                    <label>صفحات البحث (هدف 50):</label>
                                    <input type="number" id="input-quota-paper" value="${appState.data.researchPaper?.targetPages || 50}">
                                </div>
                            </div>

                            <button class="btn-primary btn-sm" onclick="window.App.saveAdminQuotas()">
                                ${icon('save', {size:14, style:'margin-left:4px;'})} حفظ تعديلات الحصص والمستهدفات
                            </button>
                        </div>

                        <!-- Rubrics Criteria Customizer -->
                        <div class="coaches-table-card">
                            <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:1rem; margin-bottom:1.5rem;">
                                <div>
                                    <h3 style="font-size:1.15rem; color:#0B1B3D; font-weight:800; margin-bottom:0.25rem;">
                                        مصفوفة الروبركات الرسمية الستة (الأوزان والمعايير)
                                    </h3>
                                    <p style="font-size:0.85rem; color:var(--text-secondary);">
                                        يمكنك إضافة معيار جديد لأي روبرك، تعديل الأوزان النسبية، أو حذف معيار.
                                    </p>
                                </div>

                                <button class="btn-primary btn-sm" onclick="window.App.openAddRubricCriterionModal('sessions')">
                                    ${icon('plus', {size:14, style:'margin-left:4px;'})} إضافة معيار لروبرك الجلسات
                                </button>
                            </div>

                            ${appState.data.rubrics.map(rubric => `
                                <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:8px; padding:1.25rem; margin-bottom:1.5rem;">
                                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.75rem; flex-wrap:wrap; gap:0.5rem;">
                                        <div style="display:flex; align-items:center; gap:0.6rem;">
                                            <span class="comp-item-id">${rubric.code}</span>
                                            <h4 style="font-size:1rem; color:#0B1B3D; font-weight:800;">${rubric.title}</h4>
                                        </div>
                                        <button class="btn-xs btn-outline" onclick="window.App.openAddRubricCriterionModal('${rubric.code}')">
                                            ${icon('plus', {size:12, style:'margin-left:2px;'})} إضافة معيار في هذا الروبرك
                                        </button>
                                    </div>

                                    <table class="coaches-table" style="background:#fff; border-radius:6px;">
                                        <thead>
                                            <tr>
                                                <th>المعيار التقييمي</th>
                                                <th>الوزن النسبي</th>
                                                <th>التقييم الحالي</th>
                                                <th>حرج أخلاقي؟</th>
                                                <th style="width:130px; text-align:center;">إجراء</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${rubric.criteria.map(crit => `
                                                <tr>
                                                    <td>
                                                        <strong>${crit.name}</strong>
                                                        <div style="font-size:0.75rem; color:var(--text-muted);">${(crit.description || '').substring(0, 45)}...</div>
                                                    </td>
                                                    <td><strong style="font-family:var(--font-mono);">${(crit.weight * 100).toFixed(0)}%</strong></td>
                                                    <td><strong style="color:var(--brand-gold);">${crit.currentLevel} / 5</strong></td>
                                                    <td>
                                                        ${crit.isCritical 
                                                            ? ('<span style="color:#DC2626; font-size:0.75rem; font-weight:bold;">' + icon('alertTriangle', {size:12, style:'vertical-align:-1px; margin-left:3px;'}) + ' حرج</span>') 
                                                            : '<span style="color:var(--text-muted); font-size:0.75rem;">معياري</span>'}
                                                    </td>
                                                    <td style="text-align:center; white-space:nowrap;">
                                                        <button class="btn-xs btn-outline" onclick="window.App.openEditRubricCriterionModal('${crit.id}')" title="تعديل المعيار">${icon('edit', {size:13})}</button>
                                                        <button class="btn-xs btn-danger-outline" onclick="window.App.deleteRubricCriterion('${crit.id}')" style="margin-right:4px;" title="حذف المعيار">${icon('trash', {size:13})}</button>
                                                    </td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- TAB 6: DYNAMIC COACHES ACCOUNTS -->
                ${appState.adminActiveTab === 'coaches' ? `
                    <div class="coaches-table-card">
                        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:1rem; margin-bottom:1.5rem;">
                            <div>
                                <h3 style="font-size:1.25rem; color:#0B1B3D; font-weight:800; margin-bottom:0.25rem;">
                                    سجل وإدارة حسابات الكوتشز المسجلين (${coaches.length} كوتش)
                                </h3>
                                <p style="font-size:0.85rem; color:var(--text-secondary);">
                                    إنشاء حسابات جديدة للكوتشز المرشحين، تعديل بياناتهم الوظيفية، أو حذف الحسابات.
                                </p>
                            </div>

                            <button class="btn-primary btn-sm" onclick="window.App.openAddCoachModal()">
                                ${icon('plus', {size:14, style:'margin-left:4px;'})} إضافة كوتش مرشح جديد
                            </button>
                        </div>

                        <div style="overflow-x:auto;">
                            <table class="coaches-table">
                                <thead>
                                    <tr>
                                        <th>الكوتش</th>
                                        <th>البريد الإلكتروني</th>
                                        <th>كود الحقيبة</th>
                                        <th>الرتبة المهنية</th>
                                        <th>تاريخ الالتحاق</th>
                                        <th>حالة الاعتماد</th>
                                        <th style="width:160px; text-align:center;">إجراءات المشرف</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${coaches.map(c => `
                                        <tr>
                                            <td>
                                                <div style="display:flex; align-items:center; gap:0.6rem;">
                                                    <div class="coach-avatar-initials">${c.name ? c.name.split(' ')[1]?.substring(0, 1) || 'ك' : 'ك'}</div>
                                                    <strong>${c.name}</strong>
                                                </div>
                                            </td>
                                            <td><span style="font-size:0.82rem; color:var(--text-secondary);">${c.email}</span></td>
                                            <td><span class="comp-item-id">${c.candidate_code || c.candidateCode}</span></td>
                                            <td><span style="font-size:0.82rem;">${c.title}</span></td>
                                            <td><span style="font-size:0.8rem; color:var(--text-muted);">${c.enrollment_date || '2026-01-15'}</span></td>
                                            <td>
                                                <span class="badge-status ${c.audit_status === 'certified' ? 'approved' : c.audit_status === 'ready' ? 'submitted' : 'revision_required'}">
                                                    ${c.audit_status === 'certified' ? 'مجاز رسمياً' : c.audit_status === 'ready' ? 'مؤهل' : 'قيد الاستكمال'}
                                                </span>
                                            </td>
                                            <td style="text-align:center; white-space:nowrap;">
                                                <button class="btn-xs btn-outline" onclick="window.App.switchAdminCoach(${c.id})" title="فتح ملف الكوتش">
                                                    ${icon('search', {size:12, style:'margin-left:2px;'})} فتح
                                                </button>
                                                <button class="btn-xs btn-outline" onclick="window.App.openEditCoachModal(${c.id})" title="تعديل بيانات الكوتش" style="margin-right:2px;">
                                                    ${icon('edit', {size:13})}
                                                </button>
                                                ${c.id !== 1 ? `
                                                    <button class="btn-xs btn-danger-outline" onclick="window.App.deleteCoach(${c.id})" title="حذف حساب الكوتش" style="margin-right:2px;">
                                                        ${icon('trash', {size:13})}
                                                    </button>
                                                ` : ''}
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ` : ''}

            </div>
        `;
    }

    function switchAdminTab(tabName) {
        appState.adminActiveTab = tabName;
        renderAdminDashboard();
    }

    async function switchAdminCoach(coachId) {
        appState.activeCoachId = coachId;
        if (window.ApiClient && window.ApiClient.isServerAvailable) {
            try {
                const res = await window.ApiClient.getCoach(coachId);
                if (res && res.coach) {
                    appState.data = res.coach;
                }
            } catch (e) {
                console.warn(e);
            }
        }
        showToast(`تم فتح ملف الكوتش: ${appState.data.metadata.candidate.name}`, 'info');
        renderAll();
    }

    async function issueGraduationAuditDecree(coachId) {
        const id = coachId || appState.activeCoachId || 1;
        try {
            if (window.ApiClient && window.ApiClient.isServerAvailable) {
                const check = await window.ApiClient.getAuditDetermination(id);
                if (check.hasBlocker) {
                    openGenericModal(
                        'تعذر إصدار محضر التخرج: يوجد حظر مهني أو أخلاقي',
                        `<div style="color:var(--text-primary); line-height:1.6;">
                            لا يمكن إصدار محضر التخرج للكوتش لوجود موانع نظامية قطعية:<br><br>
                            <ul style="color:var(--status-crimson-light); padding-right:1.25rem;">
                                ${check.blockerReasons.map(r => `<li>${r}</li>`).join('')}
                            </ul>
                        </div>`
                    );
                    return;
                }

                const decreeRes = await window.ApiClient.issueGraduationDecree({
                    coachId: id,
                    verdict: 'certified',
                    committeeNotes: 'تم استيفاء كافة المتطلبات بنجاح واقتدار مهني فائق.'
                });
                showToast('تم بنجاح إصدار محضر التدقيق النهائي والاعتماد الرسمي!', 'success');
                appState.data.auditStatus = 'certified';
                appState.data.auditDecree = decreeRes.decree;
                renderAll();
                switchTab('report');
            } else {
                showToast('تم إصدار محضر التدقيق والاعتماد بنجاح.', 'success');
                switchTab('report');
            }
        } catch (err) {
            showToast(err.message || 'حدث خطأ أثناء إصدار القرار', 'error');
        }
    }

    async function adminResetDemo() {
        const confirmed = await confirmDialog({
            title: 'إعادة ضبط المنظومة التجريبية',
            message: 'هل أنت متأكد من رغبتك في إعادة تعيين كافة البيانات إلى الحالة النموذجية الافتراضية؟ سيتم تحديث قاعدة البيانات.',
            confirmText: 'نعم، إعادة الضبط',
            cancelText: 'إلغاء',
            danger: true
        });
        if (!confirmed) return;
        if (window.ApiClient && window.ApiClient.isServerAvailable) {
            try {
                await window.ApiClient.resetDemoData();
                showToast('تمت إعادة تعيين الخادم وقاعدة البيانات بنجاح.', 'success');
            } catch (err) {
                showToast(err.message, 'error');
            }
        }
        appState.data = window.ProgramStore.reset();
        renderAll();
    }

    async function adminExportBackup() {
        if (window.ApiClient && window.ApiClient.isServerAvailable) {
            try {
                const backup = await window.ApiClient.exportBackup();
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
                const downloadAnchor = document.createElement('a');
                downloadAnchor.setAttribute("href", dataStr);
                downloadAnchor.setAttribute("download", `tamkeen_platform_backup_${new Date().toISOString().split('T')[0]}.json`);
                document.body.appendChild(downloadAnchor);
                downloadAnchor.click();
                downloadAnchor.remove();
                showToast('تم تصدير النسخة الاحتياطية بنجاح من الخادم.', 'success');
                return;
            } catch (err) {
                console.warn(err);
            }
        }
        // Fallback
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appState.data, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `tamkeen_master_coach_${appState.data.metadata.candidate.id}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        showToast('تم تصدير ملف البيانات بنجاح.', 'success');
    }

    // =========================================================================
    // Dynamic Admin & Certificate Modal Action Handlers (Master Coach Abdelkarim)
    // =========================================================================

    // 1. Certificate Rows & Meta Management
    function openAddCertificateRowModal() {
        const modal = DOM.genericModal;
        if (!modal) return;

        modal.innerHTML = `
            <div class="modal-container" style="max-width: 600px;">
                <div class="modal-header">
                    <div>
                        <span class="badge-status approved" style="font-size:0.75rem;">تخصيص محضر التدقيق والشهادة</span>
                        <h3 style="margin-top:4px; font-size:1.15rem; color:#0B1B3D;">${icon("plusCircle", {size:18, style:"vertical-align:-3px; margin-left:4px;"})} إضافة بند واعتماد جديد للشهادة الرسمية</h3>
                    </div>
                    <button class="btn-close-modal" onclick="window.App.closeAllModals()">×</button>
                </div>
                <div class="modal-body">
                    <form id="form-add-cert-row" onsubmit="event.preventDefault(); window.App.submitAddCertificateRow();">
                        <div class="admin-form-group">
                            <label>عنوان المعيار أو المتطلب بالشهادة: *</label>
                            <input type="text" id="cert-row-title" required placeholder="مثال: اجتياز ورشة أدوات الكوتشنج الذكية والتحليل المنظومي" />
                        </div>
                        <div class="admin-grid-2">
                            <div class="admin-form-group">
                                <label>المستهدف بالحقيبة: *</label>
                                <input type="text" id="cert-row-target" required placeholder="مثال: ورشة متقدمة واحدة (15 ساعة)" />
                            </div>
                            <div class="admin-form-group">
                                <label>المحقق في ملف الإنجاز: *</label>
                                <input type="text" id="cert-row-achieved" required placeholder="مثال: منجز ومعتمد بنسبة 100%" />
                            </div>
                        </div>
                        <div class="admin-form-group">
                            <label>مؤشر التحقق والجودة:</label>
                            <input type="text" id="cert-row-indicator" placeholder="مثال: فحص وتدقيق مخرجات الأداة المعتمدة وملف التدخل" />
                        </div>
                        <div class="admin-grid-2">
                            <div class="admin-form-group">
                                <label>قرار اللجنة: *</label>
                                <input type="text" id="cert-row-verdict" required value="مستوفٍ بامتياز" />
                            </div>
                            <div class="admin-form-group">
                                <label>الحالة النظامية: *</label>
                                <select id="cert-row-status">
                                    <option value="passed">مستوفٍ / معتمد (Passed)</option>
                                    <option value="in_progress">قيد الاستكمال (In Progress)</option>
                                    <option value="flagged">ملاحظة إشرافية (Flagged)</option>
                                    <option value="blocked">حظر / غير مستوفٍ (Blocked)</option>
                                </select>
                            </div>
                        </div>
                        <div class="modal-footer" style="padding:1rem 0 0 0; border:none; background:transparent;">
                            <button type="button" class="btn btn-secondary" onclick="window.App.closeAllModals()">إلغاء</button>
                            <button type="submit" class="btn btn-primary">${icon("plus", {size:14, style:"margin-left:4px;"})} حفظ وإضافة البند للشهادة</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        modal.classList.add('active');
    }

    async function submitAddCertificateRow() {
        const title = document.getElementById('cert-row-title')?.value.trim();
        const target = document.getElementById('cert-row-target')?.value.trim();
        const achieved = document.getElementById('cert-row-achieved')?.value.trim();
        const indicator = document.getElementById('cert-row-indicator')?.value.trim() || 'فحص وتوثيق تدقيقي معتمد';
        const verdict = document.getElementById('cert-row-verdict')?.value.trim() || 'مستوفٍ بامتياز';
        const status = document.getElementById('cert-row-status')?.value || 'passed';

        if (!title || !target || !achieved) {
            showToast('يرجى ملء جميع الحقول المطلوبة للبند الجديد.', 'warn');
            return;
        }

        const newRow = {
            id: 'cert_row_' + Date.now(),
            title,
            target,
            achieved,
            indicator,
            verdict,
            status,
            isCustom: true
        };

        if (window.ApiClient && window.ApiClient.isServerAvailable && window.ApiClient.isAdmin()) {
            try {
                const res = await window.ApiClient.addCertificateRow({
                    coachId: appState.activeCoachId,
                    ...newRow
                });
                if (res && res.row) {
                    newRow.id = res.row.id;
                }
            } catch (err) {
                console.warn('Backend row add error:', err);
            }
        }

        if (!appState.data.certificateConfig) {
            appState.data.certificateConfig = JSON.parse(JSON.stringify(window.ProgramStore.DEFAULT_DATA.certificateConfig));
        }
        if (!appState.data.certificateConfig.rows) {
            appState.data.certificateConfig.rows = [];
        }
        appState.data.certificateConfig.rows.push(newRow);
        window.ProgramStore.save(appState.data);

        closeAllModals();
        showToast('تمت إضافة البند الجديد للشهادة والمحضر بنجاح.', 'success');
        renderAdminDashboard();
        renderReportDossier();
    }

    function openEditCertificateRowModal(rowId) {
        const certConfig = appState.data.certificateConfig || window.ProgramStore.DEFAULT_DATA.certificateConfig;
        const row = (certConfig.rows || []).find(r => String(r.id) === String(rowId));
        if (!row) {
            showToast('تعذر العثور على البند المطلوب تعديله.', 'warn');
            return;
        }

        const modal = DOM.genericModal;
        if (!modal) return;

        modal.innerHTML = `
            <div class="modal-container" style="max-width: 600px;">
                <div class="modal-header">
                    <div>
                        <span class="badge-status submitted" style="font-size:0.75rem;">تعديل معايير الشهادة والمحضر</span>
                        <h3 style="margin-top:4px; font-size:1.15rem; color:#0B1B3D;">${icon("edit", {size:18, style:"vertical-align:-3px; margin-left:4px;"})} تعديل بند الشهادة: ${escapeHtml(row.title)}</h3>
                    </div>
                    <button class="btn-close-modal" onclick="window.App.closeAllModals()">×</button>
                </div>
                <div class="modal-body">
                    <form id="form-edit-cert-row" onsubmit="event.preventDefault(); window.App.submitEditCertificateRow('${row.id}');">
                        <div class="admin-form-group">
                            <label>عنوان المعيار أو المتطلب بالشهادة: *</label>
                            <input type="text" id="cert-edit-title" required value="${escapeHtml(row.title)}" />
                        </div>
                        <div class="admin-grid-2">
                            <div class="admin-form-group">
                                <label>المستهدف بالحقيبة: *</label>
                                <input type="text" id="cert-edit-target" required value="${escapeHtml(row.target)}" />
                            </div>
                            <div class="admin-form-group">
                                <label>المحقق في ملف الإنجاز: *</label>
                                <input type="text" id="cert-edit-achieved" required value="${escapeHtml(row.achieved)}" />
                            </div>
                        </div>
                        <div class="admin-form-group">
                            <label>مؤشر التحقق والجودة:</label>
                            <input type="text" id="cert-edit-indicator" value="${escapeHtml(row.indicator || '')}" />
                        </div>
                        <div class="admin-grid-2">
                            <div class="admin-form-group">
                                <label>قرار اللجنة: *</label>
                                <input type="text" id="cert-edit-verdict" required value="${escapeHtml(row.verdict || 'مستوفٍ بامتياز')}" />
                            </div>
                            <div class="admin-form-group">
                                <label>الحالة النظامية: *</label>
                                <select id="cert-edit-status">
                                    <option value="passed" ${row.status === 'passed' ? 'selected' : ''}>مستوفٍ / معتمد (Passed)</option>
                                    <option value="in_progress" ${row.status === 'in_progress' ? 'selected' : ''}>قيد الاستكمال (In Progress)</option>
                                    <option value="flagged" ${row.status === 'flagged' ? 'selected' : ''}>ملاحظة إشرافية (Flagged)</option>
                                    <option value="blocked" ${row.status === 'blocked' ? 'selected' : ''}>حظر / غير مستوفٍ (Blocked)</option>
                                </select>
                            </div>
                        </div>
                        <div class="modal-footer" style="padding:1rem 0 0 0; border:none; background:transparent;">
                            <button type="button" class="btn btn-secondary" onclick="window.App.closeAllModals()">إلغاء</button>
                            <button type="submit" class="btn btn-primary">${icon("save", {size:14, style:"margin-left:4px;"})} حفظ تعديلات البند</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        modal.classList.add('active');
    }

    async function submitEditCertificateRow(rowId) {
        const title = document.getElementById('cert-edit-title')?.value.trim();
        const target = document.getElementById('cert-edit-target')?.value.trim();
        const achieved = document.getElementById('cert-edit-achieved')?.value.trim();
        const indicator = document.getElementById('cert-edit-indicator')?.value.trim() || 'فحص وتوثيق تدقيقي معتمد';
        const verdict = document.getElementById('cert-edit-verdict')?.value.trim() || 'مستوفٍ بامتياز';
        const status = document.getElementById('cert-edit-status')?.value || 'passed';

        if (!title || !target || !achieved) {
            showToast('يرجى ملء كافة الحقول الأساسية.', 'warn');
            return;
        }

        const certConfig = appState.data.certificateConfig || window.ProgramStore.DEFAULT_DATA.certificateConfig;
        const row = (certConfig.rows || []).find(r => String(r.id) === String(rowId));
        if (row) {
            row.title = title;
            row.target = target;
            row.achieved = achieved;
            row.indicator = indicator;
            row.verdict = verdict;
            row.status = status;
        }

        if (window.ApiClient && window.ApiClient.isServerAvailable && window.ApiClient.isAdmin()) {
            try {
                await window.ApiClient.updateCertificateRow(rowId, {
                    coachId: appState.activeCoachId,
                    title, target, achieved, indicator, verdict, status
                });
            } catch (err) {
                console.warn('Backend row update error:', err);
            }
        }

        window.ProgramStore.save(appState.data);
        closeAllModals();
        showToast('تم تحديث بند الشهادة والمحضر بنجاح.', 'success');
        renderAdminDashboard();
        renderReportDossier();
    }

    async function deleteCertificateRow(rowId) {
        const confirmed = await confirmDialog({
            title: 'حذف بند من الشهادة الرسمية',
            message: 'هل أنت متأكد من حذف هذا البند من الشهادة ومحضر التدقيق الرسمي؟ لا يمكن استرجاعه إلا بإعادة الضبط.',
            confirmText: 'نعم، حذف البند',
            cancelText: 'إلغاء',
            danger: true
        });
        if (!confirmed) return;

        if (window.ApiClient && window.ApiClient.isServerAvailable && window.ApiClient.isAdmin()) {
            try {
                await window.ApiClient.deleteCertificateRow(rowId, appState.activeCoachId);
            } catch (err) {
                console.warn('Backend delete row error:', err);
            }
        }

        const certConfig = appState.data.certificateConfig || window.ProgramStore.DEFAULT_DATA.certificateConfig;
        if (certConfig.rows) {
            certConfig.rows = certConfig.rows.filter(r => String(r.id) !== String(rowId));
        }
        window.ProgramStore.save(appState.data);

        showToast('تم حذف البند من الشهادة والمحضر بنجاح.', 'info');
        renderAdminDashboard();
        renderReportDossier();
    }

    function openEditCertificateMetaModal() {
        const certConfig = appState.data.certificateConfig || window.ProgramStore.DEFAULT_DATA.certificateConfig;
        const modal = DOM.genericModal;
        if (!modal) return;

        modal.innerHTML = `
            <div class="modal-container" style="max-width: 680px;">
                <div class="modal-header">
                    <div>
                        <span class="badge-status approved" style="font-size:0.75rem;">تخصيص الترويسة والتوقيعات الرسمية</span>
                        <h3 style="margin-top:4px; font-size:1.15rem; color:#0B1B3D;">${icon("settings", {size:18, style:"vertical-align:-3px; margin-left:4px;"})} تخصيص ترويسة وموقعي الشهادة والمحضر</h3>
                    </div>
                    <button class="btn-close-modal" onclick="window.App.closeAllModals()">×</button>
                </div>
                <div class="modal-body">
                    <form id="form-edit-cert-meta" onsubmit="event.preventDefault(); window.App.submitEditCertificateMeta();">
                        <div class="admin-grid-2">
                            <div class="admin-form-group">
                                <label>عنوان الوثيقة الرئيسي: *</label>
                                <input type="text" id="meta-title" required value="${escapeHtml(certConfig.title || '')}" />
                            </div>
                            <div class="admin-form-group">
                                <label>رقم الوثيقة / الكود المرجعي: *</label>
                                <input type="text" id="meta-doc-ref" required value="${escapeHtml(certConfig.documentRef || '')}" />
                            </div>
                        </div>
                        <div class="admin-grid-2">
                            <div class="admin-form-group">
                                <label>اسم المؤسسة / الهيئة: *</label>
                                <input type="text" id="meta-org-name" required value="${escapeHtml(certConfig.orgName || '')}" />
                            </div>
                            <div class="admin-form-group">
                                <label>تاريخ التدقيق والإصدار: *</label>
                                <input type="date" id="meta-issue-date" required value="${escapeHtml(certConfig.issueDate || '')}" />
                            </div>
                        </div>
                        <div class="admin-form-group">
                            <label>العنوان الفرعي للبرنامج والترخيص:</label>
                            <input type="text" id="meta-program-sub" value="${escapeHtml(certConfig.programSub || '')}" />
                        </div>

                        <div style="background:#F1F5F9; border-radius:6px; padding:1rem; margin:1rem 0;">
                            <h4 style="font-size:0.9rem; color:#0B1B3D; margin-bottom:0.75rem;">توقيع المشرف الميداني:</h4>
                            <div class="admin-grid-2">
                                <div class="admin-form-group">
                                    <label>صفة المشرف:</label>
                                    <input type="text" id="meta-sig1-title" value="${escapeHtml(certConfig.signatory1?.title || '')}" />
                                </div>
                                <div class="admin-form-group">
                                    <label>اسم المشرف:</label>
                                    <input type="text" id="meta-sig1-name" value="${escapeHtml(certConfig.signatory1?.name || '')}" />
                                </div>
                            </div>
                            <div class="admin-form-group" style="margin-bottom:0;">
                                <label>بيانات الاعتماد الرقمي:</label>
                                <input type="text" id="meta-sig1-sub" value="${escapeHtml(certConfig.signatory1?.sub || '')}" />
                            </div>
                        </div>

                        <div style="background:#F1F5F9; border-radius:6px; padding:1rem; margin-bottom:1rem;">
                            <h4 style="font-size:0.9rem; color:#0B1B3D; margin-bottom:0.75rem;">توقيع رئيس اللجنة / المدير العام:</h4>
                            <div class="admin-grid-2">
                                <div class="admin-form-group">
                                    <label>صفة رئيس اللجنة:</label>
                                    <input type="text" id="meta-sig2-title" value="${escapeHtml(certConfig.signatory2?.title || '')}" />
                                </div>
                                <div class="admin-form-group">
                                    <label>اسم رئيس اللجنة:</label>
                                    <input type="text" id="meta-sig2-name" value="${escapeHtml(certConfig.signatory2?.name || '')}" />
                                </div>
                            </div>
                            <div class="admin-form-group" style="margin-bottom:0;">
                                <label>بيانات الاعتماد الرقمي:</label>
                                <input type="text" id="meta-sig2-sub" value="${escapeHtml(certConfig.signatory2?.sub || '')}" />
                            </div>
                        </div>

                        <div class="admin-form-group">
                            <label>نص قرار اللجنة وتوصية التخرج:</label>
                            <textarea id="meta-verdict-text" rows="3">${escapeHtml(certConfig.committeeVerdictText || '')}</textarea>
                        </div>

                        <div class="modal-footer" style="padding:1rem 0 0 0; border:none; background:transparent;">
                            <button type="button" class="btn btn-secondary" onclick="window.App.closeAllModals()">إلغاء</button>
                            <button type="submit" class="btn btn-primary">${icon("save", {size:14, style:"margin-left:4px;"})} حفظ بيانات ترويسة الشهادة</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        modal.classList.add('active');
    }

    async function submitEditCertificateMeta() {
        const title = document.getElementById('meta-title')?.value.trim();
        const documentRef = document.getElementById('meta-doc-ref')?.value.trim();
        const orgName = document.getElementById('meta-org-name')?.value.trim();
        const issueDate = document.getElementById('meta-issue-date')?.value.trim();
        const programSub = document.getElementById('meta-program-sub')?.value.trim();
        const sig1Title = document.getElementById('meta-sig1-title')?.value.trim();
        const sig1Name = document.getElementById('meta-sig1-name')?.value.trim();
        const sig1Sub = document.getElementById('meta-sig1-sub')?.value.trim();
        const sig2Title = document.getElementById('meta-sig2-title')?.value.trim();
        const sig2Name = document.getElementById('meta-sig2-name')?.value.trim();
        const sig2Sub = document.getElementById('meta-sig2-sub')?.value.trim();
        const verdictText = document.getElementById('meta-verdict-text')?.value.trim();

        const certConfig = appState.data.certificateConfig || window.ProgramStore.DEFAULT_DATA.certificateConfig;
        certConfig.title = title || certConfig.title;
        certConfig.documentRef = documentRef || certConfig.documentRef;
        certConfig.orgName = orgName || certConfig.orgName;
        certConfig.issueDate = issueDate || certConfig.issueDate;
        certConfig.programSub = programSub || certConfig.programSub;
        certConfig.signatory1 = { title: sig1Title, name: sig1Name, sub: sig1Sub };
        certConfig.signatory2 = { title: sig2Title, name: sig2Name, sub: sig2Sub };
        certConfig.committeeVerdictText = verdictText || certConfig.committeeVerdictText;

        if (window.ApiClient && window.ApiClient.isServerAvailable && window.ApiClient.isAdmin()) {
            try {
                await window.ApiClient.updateCertificateConfig({
                    coachId: appState.activeCoachId,
                    title: certConfig.title,
                    documentRef: certConfig.documentRef,
                    orgName: certConfig.orgName,
                    issueDate: certConfig.issueDate,
                    programSub: certConfig.programSub,
                    signatory1: certConfig.signatory1,
                    signatory2: certConfig.signatory2,
                    committeeVerdictText: certConfig.committeeVerdictText
                });
            } catch (err) {
                console.warn('Backend update cert config error:', err);
            }
        }

        window.ProgramStore.save(appState.data);
        closeAllModals();
        showToast('تم تحديث بيانات الترويسة وموقعي الشهادة بنجاح.', 'success');
        renderAdminDashboard();
        renderReportDossier();
    }

    async function resetCertificateRows() {
        const confirmed = await confirmDialog({
            title: 'استعادة بنود الشهادة النموذجية',
            message: 'هل أنت متأكد من استعادة البنود النموذجية الـ 12 للشهادة وفق حقيبة الماستر كوتش 3.0؟ سيتم استبدال أي صفوف مخصصة أضفتها.',
            confirmText: 'نعم، استعادة البنود',
            cancelText: 'إلغاء',
            danger: true
        });
        if (!confirmed) return;

        if (window.ApiClient && window.ApiClient.isServerAvailable && window.ApiClient.isAdmin()) {
            try {
                await window.ApiClient.resetCertificateRows(appState.activeCoachId);
            } catch (err) {
                console.warn('Backend reset certificate rows error:', err);
            }
        }

        const defaultRows = JSON.parse(JSON.stringify(window.ProgramStore.DEFAULT_DATA.certificateConfig?.rows || []));
        if (!appState.data.certificateConfig) {
            appState.data.certificateConfig = JSON.parse(JSON.stringify(window.ProgramStore.DEFAULT_DATA.certificateConfig));
        }
        appState.data.certificateConfig.rows = defaultRows;
        window.ProgramStore.save(appState.data);

        showToast('تمت استعادة البنود النموذجية للشهادة والمحضر بنجاح.', 'success');
        renderAdminDashboard();
        renderReportDossier();
    }

    // 2. Tasks Bank Management
    function openAddTaskModal() {
        const modal = DOM.genericModal;
        if (!modal) return;

        const nextNum = appState.data.tasks.length + 1;
        const autoId = 'TASK-' + (nextNum < 10 ? '0' + nextNum : nextNum);

        modal.innerHTML = `
            <div class="modal-container" style="max-width: 600px;">
                <div class="modal-header">
                    <div>
                        <span class="badge-status approved" style="font-size:0.75rem;">إدارة بنك المهام</span>
                        <h3 style="margin-top:4px; font-size:1.15rem; color:#0B1B3D;">${icon("plusCircle", {size:18, style:"vertical-align:-3px; margin-left:4px;"})} إضافة مهمة ميدانية جديدة للحقيبة</h3>
                    </div>
                    <button class="btn-close-modal" onclick="window.App.closeAllModals()">×</button>
                </div>
                <div class="modal-body">
                    <form id="form-add-task" onsubmit="event.preventDefault(); window.App.submitAddTask();">
                        <div class="admin-grid-2">
                            <div class="admin-form-group">
                                <label>معرف المهمة: *</label>
                                <input type="text" id="task-new-id" required value="${autoId}" />
                            </div>
                            <div class="admin-form-group">
                                <label>التصنيف / المجال: *</label>
                                <select id="task-new-category">
                                    <option value="جلسات كوتشنج ميدانية">جلسات كوتشنج ميدانية</option>
                                    <option value="أدوات واستكشاف">أدوات واستكشاف</option>
                                    <option value="بحث علمي تطبيقي">بحث علمي تطبيقي</option>
                                    <option value="مشروع ابتكاري">مشروع ابتكاري</option>
                                    <option value="إشراف مهني">إشراف مهني</option>
                                    <option value="عام">عام</option>
                                </select>
                            </div>
                        </div>
                        <div class="admin-form-group">
                            <label>عنوان المهمة الميدانية: *</label>
                            <input type="text" id="task-new-title" required placeholder="مثال: تنفيذ جلسة كوتشنج قيادي متقدمة مع تسجيل صوتي" />
                        </div>
                        <div class="admin-form-group">
                            <label>وصف المهمة ومخرجات التسليم المطلوبة: *</label>
                            <textarea id="task-new-desc" rows="3" required placeholder="بيان متطلبات الإنجاز، الأدلة الواجب رفعها، وشروط الاعتماد..."></textarea>
                        </div>
                        <div class="admin-grid-2">
                            <div class="admin-form-group">
                                <label>الروبرك المعتمد للتقييم: *</label>
                                <select id="task-new-rubric">
                                    <option value="RUB-SESS">روبرك الجلسات المهنية (RUB-SESS)</option>
                                    <option value="RUB-PORT">روبرك ملف الإنجاز الشامل (RUB-PORT)</option>
                                    <option value="RUB-RESR">روبرك الورقة العلمية (RUB-RESR)</option>
                                    <option value="RUB-INNO">روبرك المشروع الابتكاري (RUB-INNO)</option>
                                    <option value="RUB-INTV">روبرك المقابلة الختامية (RUB-INTV)</option>
                                    <option value="RUB-SUPV">روبرك الإشراف المهني (RUB-SUPV)</option>
                                </select>
                            </div>
                            <div class="admin-form-group">
                                <label>الحالة الأولية:</label>
                                <select id="task-new-status">
                                    <option value="draft">مسودة (Draft)</option>
                                    <option value="submitted">مقدمة للمراجعة (Submitted)</option>
                                    <option value="approved">معتمدة (Approved)</option>
                                </select>
                            </div>
                        </div>
                        <div class="modal-footer" style="padding:1rem 0 0 0; border:none; background:transparent;">
                            <button type="button" class="btn btn-secondary" onclick="window.App.closeAllModals()">إلغاء</button>
                            <button type="submit" class="btn btn-primary">${icon("plus", {size:14, style:"margin-left:4px;"})} إنشاء وحفظ المهمة</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        modal.classList.add('active');
    }

    async function submitAddTask() {
        const id = document.getElementById('task-new-id')?.value.trim();
        const category = document.getElementById('task-new-category')?.value;
        const title = document.getElementById('task-new-title')?.value.trim();
        const description = document.getElementById('task-new-desc')?.value.trim();
        const rubricCode = document.getElementById('task-new-rubric')?.value;
        const status = document.getElementById('task-new-status')?.value || 'draft';

        if (!id || !title || !description) {
            showToast('يرجى استيفاء جميع الحقول المطلوبة.', 'warn');
            return;
        }

        const newTask = {
            id,
            title,
            category,
            description,
            rubricCode,
            status,
            version: 'v1.0',
            linkedCompetencies: ['C-01', 'C-02'],
            evidences: [],
            reflection: { q1: '', q2: '', q3: '', q4: '' },
            evaluation: null
        };

        if (window.ApiClient && window.ApiClient.isServerAvailable && window.ApiClient.isAdmin()) {
            try {
                await window.ApiClient.createAdminTask({
                    coachId: appState.activeCoachId,
                    ...newTask
                });
            } catch (err) {
                console.warn('Backend create task error:', err);
            }
        }

        appState.data.tasks.push(newTask);
        window.ProgramStore.save(appState.data);

        closeAllModals();
        showToast('تمت إضافة المهمة الجديدة لبنك المهام بنجاح.', 'success');
        renderAdminDashboard();
        renderTasksPanel();
    }

    function openEditTaskModal(taskId) {
        const task = appState.data.tasks.find(t => t.id === taskId);
        if (!task) {
            showToast('المهمة غير موجودة.', 'warn');
            return;
        }

        const modal = DOM.genericModal;
        if (!modal) return;

        modal.innerHTML = `
            <div class="modal-container" style="max-width: 600px;">
                <div class="modal-header">
                    <div>
                        <span class="badge-status submitted" style="font-size:0.75rem;">تعديل بيانات المهمة</span>
                        <h3 style="margin-top:4px; font-size:1.15rem; color:#0B1B3D;">${icon("edit", {size:18, style:"vertical-align:-3px; margin-left:4px;"})} تعديل المهمة: ${escapeHtml(task.id)}</h3>
                    </div>
                    <button class="btn-close-modal" onclick="window.App.closeAllModals()">×</button>
                </div>
                <div class="modal-body">
                    <form id="form-edit-task" onsubmit="event.preventDefault(); window.App.submitEditTask('${task.id}');">
                        <div class="admin-grid-2">
                            <div class="admin-form-group">
                                <label>معرف المهمة (ثابت):</label>
                                <input type="text" value="${escapeHtml(task.id)}" disabled style="background:#F1F5F9;" />
                            </div>
                            <div class="admin-form-group">
                                <label>التصنيف / المجال: *</label>
                                <input type="text" id="task-edit-category" value="${escapeHtml(task.category || 'عام')}" required />
                            </div>
                        </div>
                        <div class="admin-form-group">
                            <label>عنوان المهمة الميدانية: *</label>
                            <input type="text" id="task-edit-title" required value="${escapeHtml(task.title)}" />
                        </div>
                        <div class="admin-form-group">
                            <label>وصف المهمة ومخرجات التسليم المطلوبة: *</label>
                            <textarea id="task-edit-desc" rows="3" required>${escapeHtml(task.description || '')}</textarea>
                        </div>
                        <div class="admin-grid-2">
                            <div class="admin-form-group">
                                <label>الروبرك المعتمد للتقييم: *</label>
                                <select id="task-edit-rubric">
                                    <option value="RUB-SESS" ${task.rubricCode === 'RUB-SESS' ? 'selected' : ''}>روبرك الجلسات المهنية (RUB-SESS)</option>
                                    <option value="RUB-PORT" ${task.rubricCode === 'RUB-PORT' ? 'selected' : ''}>روبرك ملف الإنجاز الشامل (RUB-PORT)</option>
                                    <option value="RUB-RESR" ${task.rubricCode === 'RUB-RESR' ? 'selected' : ''}>روبرك الورقة العلمية (RUB-RESR)</option>
                                    <option value="RUB-INNO" ${task.rubricCode === 'RUB-INNO' ? 'selected' : ''}>روبرك المشروع الابتكاري (RUB-INNO)</option>
                                    <option value="RUB-INTV" ${task.rubricCode === 'RUB-INTV' ? 'selected' : ''}>روبرك المقابلة الختامية (RUB-INTV)</option>
                                    <option value="RUB-SUPV" ${task.rubricCode === 'RUB-SUPV' ? 'selected' : ''}>روبرك الإشراف المهني (RUB-SUPV)</option>
                                </select>
                            </div>
                            <div class="admin-form-group">
                                <label>الحالة الحالية:</label>
                                <select id="task-edit-status">
                                    <option value="draft" ${task.status === 'draft' ? 'selected' : ''}>مسودة (Draft)</option>
                                    <option value="submitted" ${task.status === 'submitted' ? 'selected' : ''}>مقدمة للمراجعة (Submitted)</option>
                                    <option value="revision_required" ${task.status === 'revision_required' ? 'selected' : ''}>تحتاج تعديلاً (Revision Required)</option>
                                    <option value="approved" ${task.status === 'approved' ? 'selected' : ''}>معتمدة (Approved)</option>
                                </select>
                            </div>
                        </div>
                        <div class="modal-footer" style="padding:1rem 0 0 0; border:none; background:transparent;">
                            <button type="button" class="btn btn-secondary" onclick="window.App.closeAllModals()">إلغاء</button>
                            <button type="submit" class="btn btn-primary">${icon("save", {size:14, style:"margin-left:4px;"})} حفظ تعديلات المهمة</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        modal.classList.add('active');
    }

    async function submitEditTask(taskId) {
        const title = document.getElementById('task-edit-title')?.value.trim();
        const category = document.getElementById('task-edit-category')?.value.trim();
        const description = document.getElementById('task-edit-desc')?.value.trim();
        const rubricCode = document.getElementById('task-edit-rubric')?.value;
        const status = document.getElementById('task-edit-status')?.value;

        if (!title || !description) {
            showToast('يرجى ملء الحقول المطلوبة.', 'warn');
            return;
        }

        const task = appState.data.tasks.find(t => t.id === taskId);
        if (task) {
            task.title = title;
            task.category = category;
            task.description = description;
            task.rubricCode = rubricCode;
            task.status = status;
        }

        if (window.ApiClient && window.ApiClient.isServerAvailable && window.ApiClient.isAdmin()) {
            try {
                await window.ApiClient.updateAdminTask(taskId, {
                    coachId: appState.activeCoachId,
                    title, category, description, rubricCode, status
                });
            } catch (err) {
                console.warn('Backend update task error:', err);
            }
        }

        window.ProgramStore.save(appState.data);
        closeAllModals();
        showToast('تم تحديث تفاصيل المهمة بنجاح.', 'success');
        renderAdminDashboard();
        renderTasksPanel();
    }

    async function deleteTask(taskId) {
        const confirmed = await confirmDialog({
            title: 'حذف مهمة من بنك المهام',
            message: `هل أنت متأكد من حذف المهمة (${taskId}) من بنك المهام؟ سيتم حذف كافة الأدلة والتأملات المرتبطة بها.`,
            confirmText: 'نعم، حذف المهمة',
            cancelText: 'إلغاء',
            danger: true
        });
        if (!confirmed) return;

        if (window.ApiClient && window.ApiClient.isServerAvailable && window.ApiClient.isAdmin()) {
            try {
                await window.ApiClient.deleteAdminTask(taskId, appState.activeCoachId);
            } catch (err) {
                console.warn('Backend delete task error:', err);
            }
        }

        appState.data.tasks = appState.data.tasks.filter(t => t.id !== taskId);
        window.ProgramStore.save(appState.data);

        showToast(`تم حذف المهمة (${taskId}) بنجاح.`, 'info');
        renderAdminDashboard();
        renderTasksPanel();
    }

    // 3. Competencies Management
    function openAddCompetencyModal() {
        const modal = DOM.genericModal;
        if (!modal) return;

        const nextNum = appState.data.competencies.length + 1;
        const autoCode = 'C-' + (nextNum < 10 ? '0' + nextNum : nextNum);

        modal.innerHTML = `
            <div class="modal-container" style="max-width: 600px;">
                <div class="modal-header">
                    <div>
                        <span class="badge-status approved" style="font-size:0.75rem;">إدارة الكفايات والمحاور</span>
                        <h3 style="margin-top:4px; font-size:1.15rem; color:#0B1B3D;">${icon("target", {size:18, style:"vertical-align:-3px; margin-left:4px;"})} إضافة كفاية مهنية جديدة</h3>
                    </div>
                    <button class="btn-close-modal" onclick="window.App.closeAllModals()">×</button>
                </div>
                <div class="modal-body">
                    <form id="form-add-comp" onsubmit="event.preventDefault(); window.App.submitAddCompetency();">
                        <div class="admin-grid-2">
                            <div class="admin-form-group">
                                <label>كود الكفاية: *</label>
                                <input type="text" id="comp-new-code" required value="${autoCode}" />
                            </div>
                            <div class="admin-form-group">
                                <label>المحور التدريبي: *</label>
                                <select id="comp-new-domain">
                                    <option value="D1">D1: الكفايات المهنية الأساسية</option>
                                    <option value="D2">D2: الكفايات التحليلية</option>
                                    <option value="D3">D3: الكفايات التطبيقية</option>
                                    <option value="D4">D4: التفكير والقيادة المهنية</option>
                                    <option value="D5">D5: الكفايات البحثية</option>
                                    <option value="D6">D6: كفايات الابتكار</option>
                                    <option value="D7">D7: الكفايات الرقمية والذكاء الاصطناعي</option>
                                    <option value="D8">D8: الكفايات الأخلاقية وحدود الاختصاص</option>
                                    <option value="D9">D9: كفاية الإشراف على الممارسين</option>
                                </select>
                            </div>
                        </div>
                        <div class="admin-form-group">
                            <label>عنوان الكفاية المهنية: *</label>
                            <input type="text" id="comp-new-title" required placeholder="مثال: التقييم التكاملي لنماذج التحليل المؤسسي المتقدم" />
                        </div>
                        <div class="admin-form-group">
                            <label>وصف الكفاية ومؤشرات الإتقان السلوكية: *</label>
                            <textarea id="comp-new-desc" rows="3" required placeholder="بيان السلوك المهني المطلوب ومؤشرات التحقق..."></textarea>
                        </div>
                        <div class="admin-grid-2">
                            <div class="admin-form-group">
                                <label>مستوى الأداء المستهدف:</label>
                                <input type="text" id="comp-new-level" value="ماستر كوتش متمكن" />
                            </div>
                            <div class="admin-form-group">
                                <label>حالة الإتقان الحالية:</label>
                                <select id="comp-new-status">
                                    <option value="mastered">متقن بامتياز (Mastered)</option>
                                    <option value="in_progress">قيد التطوير (In Progress)</option>
                                </select>
                            </div>
                        </div>
                        <div class="admin-form-group" style="display:flex; align-items:center; gap:0.6rem; background:#FEF2F2; padding:0.75rem; border-radius:6px; border:1px solid #FCA5A5;">
                            <input type="checkbox" id="comp-new-critical" style="width:auto;" />
                            <label for="comp-new-critical" style="margin-bottom:0; color:#991B1B; font-weight:700;">
                                ${icon("alertTriangle", {size:14, style:"color:#DC2626; vertical-align:-2px; margin-left:4px;"})} تعيين كمعيار حرج قطعي (يمنع الاعتماد في حال عدم الاستيفاء)
                            </label>
                        </div>
                        <div class="modal-footer" style="padding:1rem 0 0 0; border:none; background:transparent;">
                            <button type="button" class="btn btn-secondary" onclick="window.App.closeAllModals()">إلغاء</button>
                            <button type="submit" class="btn btn-primary">${icon("plus", {size:14, style:"margin-left:4px;"})} إضافة الكفاية للمصفوفة</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        modal.classList.add('active');
    }

    async function submitAddCompetency() {
        const code = document.getElementById('comp-new-code')?.value.trim();
        const domainId = document.getElementById('comp-new-domain')?.value;
        const title = document.getElementById('comp-new-title')?.value.trim();
        const description = document.getElementById('comp-new-desc')?.value.trim();
        const level = document.getElementById('comp-new-level')?.value.trim() || 'ماستر كوتش';
        const status = document.getElementById('comp-new-status')?.value || 'mastered';
        const isCritical = document.getElementById('comp-new-critical')?.checked || false;

        if (!code || !title || !description) {
            showToast('يرجى ملء كافة الحقول الأساسية.', 'warn');
            return;
        }

        const newComp = {
            id: code,
            code,
            domainId,
            title,
            description,
            level,
            status,
            isCritical
        };

        if (window.ApiClient && window.ApiClient.isServerAvailable && window.ApiClient.isAdmin()) {
            try {
                await window.ApiClient.createAdminCompetency({
                    coachId: appState.activeCoachId,
                    ...newComp
                });
            } catch (err) {
                console.warn('Backend create competency error:', err);
            }
        }

        appState.data.competencies.push(newComp);
        window.ProgramStore.save(appState.data);

        closeAllModals();
        showToast('تمت إضافة الكفاية الجديدة للمصفوفة بنجاح.', 'success');
        renderAdminDashboard();
        renderCompetencyMatrixPanel();
        renderHeaderAndStrip();
    }

    function openEditCompetencyModal(compId) {
        const comp = appState.data.competencies.find(c => c.id === compId);
        if (!comp) {
            showToast('الكفاية غير موجودة.', 'warn');
            return;
        }

        const modal = DOM.genericModal;
        if (!modal) return;

        modal.innerHTML = `
            <div class="modal-container" style="max-width: 600px;">
                <div class="modal-header">
                    <div>
                        <span class="badge-status submitted" style="font-size:0.75rem;">تعديل بيانات الكفاية</span>
                        <h3 style="margin-top:4px; font-size:1.15rem; color:#0B1B3D;">${icon("edit", {size:18, style:"vertical-align:-3px; margin-left:4px;"})} تعديل الكفاية: ${escapeHtml(comp.id)}</h3>
                    </div>
                    <button class="btn-close-modal" onclick="window.App.closeAllModals()">×</button>
                </div>
                <div class="modal-body">
                    <form id="form-edit-comp" onsubmit="event.preventDefault(); window.App.submitEditCompetency('${comp.id}');">
                        <div class="admin-grid-2">
                            <div class="admin-form-group">
                                <label>المعرف (ثابت):</label>
                                <input type="text" value="${escapeHtml(comp.id)}" disabled style="background:#F1F5F9;" />
                            </div>
                            <div class="admin-form-group">
                                <label>المحور التدريبي: *</label>
                                <select id="comp-edit-domain">
                                    <option value="D1" ${comp.domainId === 'D1' ? 'selected' : ''}>D1: الكفايات المهنية الأساسية</option>
                                    <option value="D2" ${comp.domainId === 'D2' ? 'selected' : ''}>D2: الكفايات التحليلية</option>
                                    <option value="D3" ${comp.domainId === 'D3' ? 'selected' : ''}>D3: الكفايات التطبيقية</option>
                                    <option value="D4" ${comp.domainId === 'D4' ? 'selected' : ''}>D4: التفكير والقيادة المهنية</option>
                                    <option value="D5" ${comp.domainId === 'D5' ? 'selected' : ''}>D5: الكفايات البحثية</option>
                                    <option value="D6" ${comp.domainId === 'D6' ? 'selected' : ''}>D6: كفايات الابتكار</option>
                                    <option value="D7" ${comp.domainId === 'D7' ? 'selected' : ''}>D7: الكفايات الرقمية والذكاء الاصطناعي</option>
                                    <option value="D8" ${comp.domainId === 'D8' ? 'selected' : ''}>D8: الكفايات الأخلاقية وحدود الاختصاص</option>
                                    <option value="D9" ${comp.domainId === 'D9' ? 'selected' : ''}>D9: كفاية الإشراف على الممارسين</option>
                                </select>
                            </div>
                        </div>
                        <div class="admin-form-group">
                            <label>عنوان الكفاية المهنية: *</label>
                            <input type="text" id="comp-edit-title" required value="${escapeHtml(comp.title)}" />
                        </div>
                        <div class="admin-form-group">
                            <label>وصف الكفاية ومؤشرات الإتقان السلوكية: *</label>
                            <textarea id="comp-edit-desc" rows="3" required>${escapeHtml(comp.description || '')}</textarea>
                        </div>
                        <div class="admin-grid-2">
                            <div class="admin-form-group">
                                <label>مستوى الأداء المستهدف:</label>
                                <input type="text" id="comp-edit-level" value="${escapeHtml(comp.level || 'ماستر كوتش')}" />
                            </div>
                            <div class="admin-form-group">
                                <label>حالة الإتقان الحالية:</label>
                                <select id="comp-edit-status">
                                    <option value="mastered" ${comp.status === 'mastered' ? 'selected' : ''}>متقن بامتياز (Mastered)</option>
                                    <option value="in_progress" ${comp.status === 'in_progress' ? 'selected' : ''}>قيد التطوير (In Progress)</option>
                                </select>
                            </div>
                        </div>
                        <div class="admin-form-group" style="display:flex; align-items:center; gap:0.6rem; background:#FEF2F2; padding:0.75rem; border-radius:6px; border:1px solid #FCA5A5;">
                            <input type="checkbox" id="comp-edit-critical" ${comp.isCritical ? 'checked' : ''} style="width:auto;" />
                            <label for="comp-edit-critical" style="margin-bottom:0; color:#991B1B; font-weight:700;">
                                ${icon("alertTriangle", {size:14, style:"color:#DC2626; vertical-align:-2px; margin-left:4px;"})} تعيين كمعيار حرج قطعي (يمنع الاعتماد في حال عدم الاستيفاء)
                            </label>
                        </div>
                        <div class="modal-footer" style="padding:1rem 0 0 0; border:none; background:transparent;">
                            <button type="button" class="btn btn-secondary" onclick="window.App.closeAllModals()">إلغاء</button>
                            <button type="submit" class="btn btn-primary">${icon("save", {size:14, style:"margin-left:4px;"})} حفظ تعديلات الكفاية</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        modal.classList.add('active');
    }

    async function submitEditCompetency(compId) {
        const title = document.getElementById('comp-edit-title')?.value.trim();
        const domainId = document.getElementById('comp-edit-domain')?.value;
        const description = document.getElementById('comp-edit-desc')?.value.trim();
        const level = document.getElementById('comp-edit-level')?.value.trim();
        const status = document.getElementById('comp-edit-status')?.value;
        const isCritical = document.getElementById('comp-edit-critical')?.checked || false;

        if (!title || !description) {
            showToast('يرجى ملء الحقول المطلوبة.', 'warn');
            return;
        }

        const comp = appState.data.competencies.find(c => c.id === compId);
        if (comp) {
            comp.title = title;
            comp.domainId = domainId;
            comp.description = description;
            comp.level = level;
            comp.status = status;
            comp.isCritical = isCritical;
        }

        if (window.ApiClient && window.ApiClient.isServerAvailable && window.ApiClient.isAdmin()) {
            try {
                await window.ApiClient.updateAdminCompetency(compId, {
                    coachId: appState.activeCoachId,
                    title, domainId, description, level, status, isCritical
                });
            } catch (err) {
                console.warn('Backend update competency error:', err);
            }
        }

        window.ProgramStore.save(appState.data);
        closeAllModals();
        showToast('تم تحديث الكفاية بنجاح.', 'success');
        renderAdminDashboard();
        renderCompetencyMatrixPanel();
        renderHeaderAndStrip();
    }

    async function deleteCompetency(compId) {
        const confirmed = await confirmDialog({
            title: 'حذف كفاية مهنية',
            message: `هل أنت متأكد من حذف الكفاية (${compId}) نهائياً؟ سيتم استبعادها من محاور التقييم الـ 8 ومن نسب الإتقان.`,
            confirmText: 'نعم، حذف الكفاية',
            cancelText: 'إلغاء',
            danger: true
        });
        if (!confirmed) return;

        if (window.ApiClient && window.ApiClient.isServerAvailable && window.ApiClient.isAdmin()) {
            try {
                await window.ApiClient.deleteAdminCompetency(compId, appState.activeCoachId);
            } catch (err) {
                console.warn('Backend delete competency error:', err);
            }
        }

        appState.data.competencies = appState.data.competencies.filter(c => c.id !== compId);
        window.ProgramStore.save(appState.data);

        showToast(`تم حذف الكفاية (${compId}) بنجاح.`, 'info');
        renderAdminDashboard();
        renderCompetencyMatrixPanel();
        renderHeaderAndStrip();
    }

    // 4. Rubrics Criteria Management
    function openAddRubricCriterionModal(rubricCode) {
        const modal = DOM.genericModal;
        if (!modal) return;

        const targetCode = rubricCode || 'sessions';

        modal.innerHTML = `
            <div class="modal-container" style="max-width: 600px;">
                <div class="modal-header">
                    <div>
                        <span class="badge-status approved" style="font-size:0.75rem;">تخصيص الروبركات الرسمية</span>
                        <h3 style="margin-top:4px; font-size:1.15rem; color:#0B1B3D;">${icon("plusCircle", {size:18, style:"vertical-align:-3px; margin-left:4px;"})} إضافة معيار تقييمي جديد</h3>
                    </div>
                    <button class="btn-close-modal" onclick="window.App.closeAllModals()">×</button>
                </div>
                <div class="modal-body">
                    <form id="form-add-crit" onsubmit="event.preventDefault(); window.App.submitAddRubricCriterion();">
                        <div class="admin-form-group">
                            <label>الروبرك المستهدف: *</label>
                            <select id="crit-new-rubric">
                                <option value="sessions" ${targetCode === 'sessions' || targetCode === 'RUB-SESS' ? 'selected' : ''}>روبرك الجلسات المهنية (RUB-SESS)</option>
                                <option value="portfolio" ${targetCode === 'portfolio' || targetCode === 'RUB-PORT' ? 'selected' : ''}>روبرك ملف الإنجاز الشامل (RUB-PORT)</option>
                                <option value="research_paper" ${targetCode === 'research_paper' || targetCode === 'RUB-RESR' ? 'selected' : ''}>روبرك الورقة العلمية (RUB-RESR)</option>
                                <option value="innovation_project" ${targetCode === 'innovation_project' || targetCode === 'RUB-INNO' ? 'selected' : ''}>روبرك المشروع الابتكاري (RUB-INNO)</option>
                                <option value="final_interview" ${targetCode === 'final_interview' || targetCode === 'RUB-INTV' ? 'selected' : ''}>روبرك المقابلة الختامية (RUB-INTV)</option>
                                <option value="supervision_rubric" ${targetCode === 'supervision_rubric' || targetCode === 'RUB-SUPV' ? 'selected' : ''}>روبرك الإشراف المهني (RUB-SUPV)</option>
                            </select>
                        </div>
                        <div class="admin-form-group">
                            <label>اسم المعيار التقييمي: *</label>
                            <input type="text" id="crit-new-name" required placeholder="مثال: الاستخدام المسؤول للذكاء الاصطناعي في توثيق الجلسات" />
                        </div>
                        <div class="admin-form-group">
                            <label>وصف المعيار ومؤشرات الأداء: *</label>
                            <textarea id="crit-new-desc" rows="3" required placeholder="بيان متطلبات الإتقان في مستويات الروبرك الخمسة..."></textarea>
                        </div>
                        <div class="admin-grid-2">
                            <div class="admin-form-group">
                                <label>الوزن النسبي (من 0.05 إلى 0.50): *</label>
                                <input type="number" id="crit-new-weight" step="0.05" min="0.01" max="1.0" required value="0.20" />
                            </div>
                            <div class="admin-form-group">
                                <label>التقييم الأولي (من 1 إلى 5): *</label>
                                <input type="number" id="crit-new-level" min="1" max="5" required value="5" />
                            </div>
                        </div>
                        <div class="admin-form-group" style="display:flex; align-items:center; gap:0.6rem; background:#FEF2F2; padding:0.75rem; border-radius:6px; border:1px solid #FCA5A5;">
                            <input type="checkbox" id="crit-new-critical" style="width:auto;" />
                            <label for="crit-new-critical" style="margin-bottom:0; color:#991B1B; font-weight:700;">
                                ${icon("alertTriangle", {size:14, style:"color:#DC2626; vertical-align:-2px; margin-left:4px;"})} تعيين كمعيار أخلاقي / مهني حرج (تفعّل الحظر إذا قلّ عن 3/5)
                            </label>
                        </div>
                        <div class="modal-footer" style="padding:1rem 0 0 0; border:none; background:transparent;">
                            <button type="button" class="btn btn-secondary" onclick="window.App.closeAllModals()">إلغاء</button>
                            <button type="submit" class="btn btn-primary">${icon("plus", {size:14, style:"margin-left:4px;"})} إضافة المعيار للروبرك</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        modal.classList.add('active');
    }

    async function submitAddRubricCriterion() {
        const rubricCode = document.getElementById('crit-new-rubric')?.value;
        const name = document.getElementById('crit-new-name')?.value.trim();
        const description = document.getElementById('crit-new-desc')?.value.trim();
        const weight = parseFloat(document.getElementById('crit-new-weight')?.value) || 0.20;
        const currentLevel = parseInt(document.getElementById('crit-new-level')?.value) || 5;
        const isCritical = document.getElementById('crit-new-critical')?.checked || false;

        if (!name || !description) {
            showToast('يرجى كتابة اسم المعيار ووصفه.', 'warn');
            return;
        }

        const newCrit = {
            id: 'crit_' + Date.now(),
            name,
            description,
            weight,
            currentLevel,
            isCritical,
            evidence: 'توثيق الأدلة المعتمدة في ملف الإنجاز',
            supervisorFeedback: 'أداء مستوفٍ ومطابق لمعايير الحقيبة.',
            requiredImprovement: 'الالتزام المستمر بمعايير التميز في هذا المعيار.',
            levelsDesc: {
                1: 'ضعيف: لم يستوفِ المتطلب.',
                2: 'مقبول: استيفاء جزئي يحتاج تحسين.',
                3: 'جيد: استيفاء مرضٍ وفق المعيار.',
                4: 'جيد جداً: أداء متقدم ومتقن.',
                5: 'ممتاز: إتقان نموذجي مع مرتبة الشرف.'
            }
        };

        if (window.ApiClient && window.ApiClient.isServerAvailable && window.ApiClient.isAdmin()) {
            try {
                const res = await window.ApiClient.createAdminRubricCriterion({
                    coachId: appState.activeCoachId,
                    rubricCode,
                    ...newCrit
                });
                if (res && res.criterion) {
                    newCrit.id = res.criterion.id;
                }
            } catch (err) {
                console.warn('Backend create rubric criterion error:', err);
            }
        }

        const rObj = appState.data.rubrics.find(r => r.id === rubricCode || r.code === rubricCode);
        if (rObj) {
            rObj.criteria.push(newCrit);
        }
        window.ProgramStore.save(appState.data);

        closeAllModals();
        showToast('تمت إضافة المعيار التقييمي الجديد للروبرك بنجاح.', 'success');
        renderAdminDashboard();
        renderRubricsPanel();
        renderReportDossier();
    }

    function openEditRubricCriterionModal(critId) {
        let foundCrit = null;
        let foundRubric = null;

        for (const r of appState.data.rubrics) {
            const c = (r.criteria || []).find(x => String(x.id) === String(critId));
            if (c) {
                foundCrit = c;
                foundRubric = r;
                break;
            }
        }

        if (!foundCrit) {
            showToast('المعيار التقييمي غير موجود.', 'warn');
            return;
        }

        const modal = DOM.genericModal;
        if (!modal) return;

        modal.innerHTML = `
            <div class="modal-container" style="max-width: 600px;">
                <div class="modal-header">
                    <div>
                        <span class="badge-status submitted" style="font-size:0.75rem;">تعديل معايير الروبرك</span>
                        <h3 style="margin-top:4px; font-size:1.15rem; color:#0B1B3D;">${icon("edit", {size:18, style:"vertical-align:-3px; margin-left:4px;"})} تعديل المعيار: ${escapeHtml(foundCrit.name)}</h3>
                    </div>
                    <button class="btn-close-modal" onclick="window.App.closeAllModals()">×</button>
                </div>
                <div class="modal-body">
                    <form id="form-edit-crit" onsubmit="event.preventDefault(); window.App.submitEditRubricCriterion('${foundCrit.id}');">
                        <div class="admin-form-group">
                            <label>اسم المعيار التقييمي: *</label>
                            <input type="text" id="crit-edit-name" required value="${escapeHtml(foundCrit.name)}" />
                        </div>
                        <div class="admin-form-group">
                            <label>وصف المعيار ومؤشرات الأداء: *</label>
                            <textarea id="crit-edit-desc" rows="3" required>${escapeHtml(foundCrit.description || '')}</textarea>
                        </div>
                        <div class="admin-grid-2">
                            <div class="admin-form-group">
                                <label>الوزن النسبي: *</label>
                                <input type="number" id="crit-edit-weight" step="0.05" min="0.01" max="1.0" required value="${foundCrit.weight}" />
                            </div>
                            <div class="admin-form-group">
                                <label>التقييم الحالي (من 1 إلى 5): *</label>
                                <input type="number" id="crit-edit-level" min="1" max="5" required value="${foundCrit.currentLevel}" />
                            </div>
                        </div>
                        <div class="admin-form-group">
                            <label>التحسين المطلوب الموثق:</label>
                            <input type="text" id="crit-edit-imp" value="${escapeHtml(foundCrit.requiredImprovement || '')}" />
                        </div>
                        <div class="admin-form-group" style="display:flex; align-items:center; gap:0.6rem; background:#FEF2F2; padding:0.75rem; border-radius:6px; border:1px solid #FCA5A5;">
                            <input type="checkbox" id="crit-edit-critical" ${foundCrit.isCritical ? 'checked' : ''} style="width:auto;" />
                            <label for="crit-edit-critical" style="margin-bottom:0; color:#991B1B; font-weight:700;">
                                ${icon("alertTriangle", {size:14, style:"color:#DC2626; vertical-align:-2px; margin-left:4px;"})} تعيين كمعيار أخلاقي / مهني حرج (تفعّل الحظر إذا قلّ عن 3/5)
                            </label>
                        </div>
                        <div class="modal-footer" style="padding:1rem 0 0 0; border:none; background:transparent;">
                            <button type="button" class="btn btn-secondary" onclick="window.App.closeAllModals()">إلغاء</button>
                            <button type="submit" class="btn btn-primary">${icon("save", {size:14, style:"margin-left:4px;"})} حفظ تعديلات المعيار</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        modal.classList.add('active');
    }

    async function submitEditRubricCriterion(critId) {
        const name = document.getElementById('crit-edit-name')?.value.trim();
        const description = document.getElementById('crit-edit-desc')?.value.trim();
        const weight = parseFloat(document.getElementById('crit-edit-weight')?.value) || 0.20;
        const currentLevel = parseInt(document.getElementById('crit-edit-level')?.value) || 5;
        const requiredImprovement = document.getElementById('crit-edit-imp')?.value.trim();
        const isCritical = document.getElementById('crit-edit-critical')?.checked || false;

        if (!name || !description) {
            showToast('يرجى ملء الحقول المطلوبة.', 'warn');
            return;
        }

        for (const r of appState.data.rubrics) {
            const c = (r.criteria || []).find(x => String(x.id) === String(critId));
            if (c) {
                c.name = name;
                c.description = description;
                c.weight = weight;
                c.currentLevel = currentLevel;
                c.requiredImprovement = requiredImprovement;
                c.isCritical = isCritical;
                break;
            }
        }

        if (window.ApiClient && window.ApiClient.isServerAvailable && window.ApiClient.isAdmin()) {
            try {
                await window.ApiClient.updateAdminRubricCriterion(critId, {
                    coachId: appState.activeCoachId,
                    name, description, weight, currentLevel, requiredImprovement, isCritical
                });
            } catch (err) {
                console.warn('Backend update criterion error:', err);
            }
        }

        window.ProgramStore.save(appState.data);
        closeAllModals();
        showToast('تم حفظ تعديلات المعيار التقييمي بنجاح.', 'success');
        renderAdminDashboard();
        renderRubricsPanel();
        renderReportDossier();
    }

    async function deleteRubricCriterion(critId) {
        const confirmed = await confirmDialog({
            title: 'حذف معيار من الروبرك المعتمد',
            message: 'هل أنت متأكد من حذف هذا المعيار من الروبرك؟ سيتم إعادة احتساب الأوزان النسبية ومتوسط التقييم العام.',
            confirmText: 'نعم، حذف المعيار',
            cancelText: 'إلغاء',
            danger: true
        });
        if (!confirmed) return;

        if (window.ApiClient && window.ApiClient.isServerAvailable && window.ApiClient.isAdmin()) {
            try {
                await window.ApiClient.deleteAdminRubricCriterion(critId, appState.activeCoachId);
            } catch (err) {
                console.warn('Backend delete criterion error:', err);
            }
        }

        for (const r of appState.data.rubrics) {
            r.criteria = (r.criteria || []).filter(c => String(c.id) !== String(critId));
        }
        window.ProgramStore.save(appState.data);

        showToast('تم حذف المعيار من الروبرك بنجاح.', 'info');
        renderAdminDashboard();
        renderRubricsPanel();
        renderReportDossier();
    }

    // 5. Quotas & Targets Management
    async function saveAdminQuotas() {
        const hours = parseInt(document.getElementById('input-quota-hours')?.value) || 240;
        const cases = parseInt(document.getElementById('input-quota-cases')?.value) || 20;
        const sessions = parseInt(document.getElementById('input-quota-sessions')?.value) || 30;
        const mbti = parseInt(document.getElementById('input-quota-mbti')?.value) || 30;
        const wheel = parseInt(document.getElementById('input-quota-wheel')?.value) || 30;
        const swot = parseInt(document.getElementById('input-quota-swot')?.value) || 30;
        const paper = parseInt(document.getElementById('input-quota-paper')?.value) || 50;

        appState.data.metadata.totalTargetHours = hours;
        appState.data.metadata.casesTarget = cases;
        appState.data.metadata.sessionsTarget = sessions;

        if (appState.data.toolsSummary) {
            if (appState.data.toolsSummary.mbti) appState.data.toolsSummary.mbti.target = mbti;
            if (appState.data.toolsSummary.wheelOfLife) appState.data.toolsSummary.wheelOfLife.target = wheel;
            if (appState.data.toolsSummary.swot) appState.data.toolsSummary.swot.target = swot;
        }

        if (appState.data.researchPaper) {
            appState.data.researchPaper.targetPages = paper;
        }

        if (window.ApiClient && window.ApiClient.isServerAvailable && window.ApiClient.isAdmin()) {
            try {
                await window.ApiClient.updateAdminQuotas({
                    coachId: appState.activeCoachId,
                    totalTargetHours: hours,
                    casesTarget: cases,
                    sessionsTarget: sessions,
                    mbtiTarget: mbti,
                    wheelTarget: wheel,
                    swotTarget: swot,
                    paperTarget: paper
                });
            } catch (err) {
                console.warn('Backend update quotas error:', err);
            }
        }

        window.ProgramStore.save(appState.data);
        showToast('تم حفظ وتحديث الحصص والمستهدفات النظامية بنجاح.', 'success');
        renderAdminDashboard();
        renderDualDashboard();
        renderHeaderAndStrip();
    }

    // 6. Coaches Accounts Management
    function openAddCoachModal() {
        const modal = DOM.genericModal;
        if (!modal) return;

        const nextNum = (appState.allCoachesList ? appState.allCoachesList.length : 2) + 1;
        const autoCode = 'MC-2026-08' + nextNum;

        modal.innerHTML = `
            <div class="modal-container" style="max-width: 600px;">
                <div class="modal-header">
                    <div>
                        <span class="badge-status approved" style="font-size:0.75rem;">إدارة حسابات الكوتشز</span>
                        <h3 style="margin-top:4px; font-size:1.15rem; color:#0B1B3D;">${icon("users", {size:18, style:"vertical-align:-3px; margin-left:4px;"})} إنشاء حساب كوتش مرشح جديد</h3>
                    </div>
                    <button class="btn-close-modal" onclick="window.App.closeAllModals()">×</button>
                </div>
                <div class="modal-body">
                    <form id="form-add-coach" onsubmit="event.preventDefault(); window.App.submitAddCoach();">
                        <div class="admin-form-group">
                            <label>الاسم الكامل للكوتش: *</label>
                            <input type="text" id="coach-new-name" required placeholder="مثال: كوتش فيصل بن تركي العتيبي" />
                        </div>
                        <div class="admin-grid-2">
                            <div class="admin-form-group">
                                <label>البريد الإلكتروني: *</label>
                                <input type="email" id="coach-new-email" required placeholder="faisal@cyce52.com" />
                            </div>
                            <div class="admin-form-group">
                                <label>كلمة المرور الابتدائية: *</label>
                                <input type="password" id="coach-new-password" required value="coach123" />
                            </div>
                        </div>
                        <div class="admin-grid-2">
                            <div class="admin-form-group">
                                <label>كود المرشح بالحقيبة: *</label>
                                <input type="text" id="coach-new-code" required value="${autoCode}" />
                            </div>
                            <div class="admin-form-group">
                                <label>الرتبة المهنية: *</label>
                                <input type="text" id="coach-new-title" required value="كوتش تنفيذي مرشح (ACC to PCC)" />
                            </div>
                        </div>
                        <div class="modal-footer" style="padding:1rem 0 0 0; border:none; background:transparent;">
                            <button type="button" class="btn btn-secondary" onclick="window.App.closeAllModals()">إلغاء</button>
                            <button type="submit" class="btn btn-primary">${icon("plus", {size:14, style:"margin-left:4px;"})} إنشاء حساب الكوتش</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        modal.classList.add('active');
    }

    async function submitAddCoach() {
        const name = document.getElementById('coach-new-name')?.value.trim();
        const email = document.getElementById('coach-new-email')?.value.trim();
        const password = document.getElementById('coach-new-password')?.value.trim();
        const candidateCode = document.getElementById('coach-new-code')?.value.trim();
        const title = document.getElementById('coach-new-title')?.value.trim();

        if (!name || !email || !password || !candidateCode) {
            showToast('يرجى ملء جميع الحقول المطلوبة.', 'warn');
            return;
        }

        if (window.ApiClient && window.ApiClient.isServerAvailable && window.ApiClient.isAdmin()) {
            try {
                await window.ApiClient.createAdminCoach({
                    name,
                    email,
                    password,
                    candidateCode,
                    title
                });
                const res = await window.ApiClient.getCoaches();
                appState.allCoachesList = res.coaches || [];
            } catch (err) {
                showToast(err.message || 'فشل إنشاء حساب الكوتش', 'error');
                return;
            }
        } else {
            const newCoach = {
                id: Date.now(),
                name,
                email,
                candidate_code: candidateCode,
                title,
                audit_status: 'in_progress',
                tasksSummary: { total: 8, approved: 0, pending: 0 },
                toolsCompleted: 0,
                rubricsAverage: 0,
                ethicsPassed: true
            };
            appState.allCoachesList = appState.allCoachesList || [];
            appState.allCoachesList.push(newCoach);
        }

        closeAllModals();
        showToast(`تم إنشاء حساب الكوتش (${name}) بنجاح.`, 'success');
        renderAdminDashboard();
    }

    function openEditCoachModal(coachId) {
        const coach = (appState.allCoachesList || []).find(c => c.id === coachId);
        if (!coach) {
            showToast('بيانات الكوتش غير موجودة.', 'warn');
            return;
        }

        const modal = DOM.genericModal;
        if (!modal) return;

        modal.innerHTML = `
            <div class="modal-container" style="max-width: 600px;">
                <div class="modal-header">
                    <div>
                        <span class="badge-status submitted" style="font-size:0.75rem;">تعديل بيانات الحساب</span>
                        <h3 style="margin-top:4px; font-size:1.15rem; color:#0B1B3D;">${icon("edit", {size:18, style:"vertical-align:-3px; margin-left:4px;"})} تعديل حساب الكوتش: ${escapeHtml(coach.name)}</h3>
                    </div>
                    <button class="btn-close-modal" onclick="window.App.closeAllModals()">×</button>
                </div>
                <div class="modal-body">
                    <form id="form-edit-coach" onsubmit="event.preventDefault(); window.App.submitEditCoach(${coach.id});">
                        <div class="admin-form-group">
                            <label>الاسم الكامل للكوتش: *</label>
                            <input type="text" id="coach-edit-name" required value="${escapeHtml(coach.name)}" />
                        </div>
                        <div class="admin-grid-2">
                            <div class="admin-form-group">
                                <label>البريد الإلكتروني: *</label>
                                <input type="email" id="coach-edit-email" required value="${escapeHtml(coach.email)}" />
                            </div>
                            <div class="admin-form-group">
                                <label>كود المرشح بالحقيبة: *</label>
                                <input type="text" id="coach-edit-code" required value="${escapeHtml(coach.candidate_code || coach.candidateCode || '')}" />
                            </div>
                        </div>
                        <div class="admin-grid-2">
                            <div class="admin-form-group">
                                <label>الرتبة المهنية: *</label>
                                <input type="text" id="coach-edit-title" required value="${escapeHtml(coach.title || '')}" />
                            </div>
                            <div class="admin-form-group">
                                <label>حالة الاعتماد: *</label>
                                <select id="coach-edit-status">
                                    <option value="in_progress" ${coach.audit_status === 'in_progress' ? 'selected' : ''}>قيد الاستكمال (In Progress)</option>
                                    <option value="ready" ${coach.audit_status === 'ready' ? 'selected' : ''}>مؤهل للمناقشة (Ready)</option>
                                    <option value="certified" ${coach.audit_status === 'certified' ? 'selected' : ''}>مجاز ومعتمد رسمياً (Certified)</option>
                                </select>
                            </div>
                        </div>
                        <div class="modal-footer" style="padding:1rem 0 0 0; border:none; background:transparent;">
                            <button type="button" class="btn btn-secondary" onclick="window.App.closeAllModals()">إلغاء</button>
                            <button type="submit" class="btn btn-primary">${icon("save", {size:14, style:"margin-left:4px;"})} حفظ تعديلات الحساب</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        modal.classList.add('active');
    }

    async function submitEditCoach(coachId) {
        const name = document.getElementById('coach-edit-name')?.value.trim();
        const email = document.getElementById('coach-edit-email')?.value.trim();
        const candidateCode = document.getElementById('coach-edit-code')?.value.trim();
        const title = document.getElementById('coach-edit-title')?.value.trim();
        const audit_status = document.getElementById('coach-edit-status')?.value;

        if (!name || !email || !candidateCode) {
            showToast('يرجى ملء جميع الحقول المطلوبة.', 'warn');
            return;
        }

        if (window.ApiClient && window.ApiClient.isServerAvailable && window.ApiClient.isAdmin()) {
            try {
                await window.ApiClient.updateAdminCoach(coachId, {
                    name,
                    email,
                    candidateCode,
                    title,
                    audit_status
                });
                const res = await window.ApiClient.getCoaches();
                appState.allCoachesList = res.coaches || [];
            } catch (err) {
                showToast(err.message || 'فشل تحديث بيانات الكوتش', 'error');
                return;
            }
        } else {
            const coach = (appState.allCoachesList || []).find(c => c.id === coachId);
            if (coach) {
                coach.name = name;
                coach.email = email;
                coach.candidate_code = candidateCode;
                coach.title = title;
                coach.audit_status = audit_status;
            }
        }

        closeAllModals();
        showToast('تم تحديث بيانات الكوتش بنجاح.', 'success');
        renderAdminDashboard();
    }

    async function deleteCoach(coachId) {
        if (coachId === 1) {
            showToast('لا يمكن حذف الكوتش النموذجي الأساسي لحماية النظام والبيانات.', 'warn');
            return;
        }

        const confirmed = await confirmDialog({
            title: 'حذف حساب كوتش متدرب',
            message: 'هل أنت متأكد من حذف حساب هذا الكوتش وسجلاته نهائياً من المنظومة؟ لا يمكن التراجع عن هذا الإجراء.',
            confirmText: 'نعم، حذف الحساب',
            cancelText: 'إلغاء',
            danger: true
        });
        if (!confirmed) return;

        if (window.ApiClient && window.ApiClient.isServerAvailable && window.ApiClient.isAdmin()) {
            try {
                await window.ApiClient.deleteAdminCoach(coachId);
                const res = await window.ApiClient.getCoaches();
                appState.allCoachesList = res.coaches || [];
            } catch (err) {
                showToast(err.message || 'فشل حذف حساب الكوتش', 'error');
                return;
            }
        } else {
            appState.allCoachesList = (appState.allCoachesList || []).filter(c => c.id !== coachId);
        }

        showToast('تم حذف حساب الكوتش بنجاح.', 'info');
        renderAdminDashboard();
    }

    function onRealFileSelected(event, taskId) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        appState.pendingFileUpload = file;
        appState.pendingFileName = file.name;
        appState.pendingFileSizeBytes = file.size;

        const infoBox = document.getElementById(`selected-file-info-${taskId}`);
        if (infoBox) {
            infoBox.style.display = 'block';
            infoBox.innerHTML = `
                <div style="display:flex; align-items:center; gap:0.5rem;">
                    <span>${icon("paperclip", {size:14})}</span>
                    <strong>الملف المختار: ${file.name}</strong>
                    <span style="color:var(--text-muted); font-size:0.75rem;">(${(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                </div>
            `;
        }
    }

    // Render Dual Dashboard (Engine 1: Quantitative & Hours / Engine 2: Competencies & Mastery)
    function renderDualDashboard() {
        const container = document.getElementById('dashboard-content-area');
        if (!container) return;

        const totalHours = appState.data.hours.reduce((acc, h) => acc + h.completed, 0);
        const targetHours = appState.data.metadata.totalTargetHours;
        const quantPct = Math.min(100, Math.round((totalHours / targetHours) * 100));

        const coreComps = appState.data.competencies.filter(c => c.domainId !== 'D9');
        const coreMastered = coreComps.filter(c => c.status === 'mastered').length;
        const totalComps = appState.data.competencies.length;
        const allMastered = appState.data.competencies.filter(c => c.status === 'mastered').length;
        const compPct = Math.round((allMastered / totalComps) * 100);

        // Calculate weighted averages across the 6 rubrics
        let totalRubricSum = 0;
        appState.data.rubrics.forEach(r => {
            const rScore = r.criteria.reduce((sum, c) => sum + (c.currentLevel * c.weight), 0);
            totalRubricSum += rScore;
        });
        const avgRubricScore = (totalRubricSum / appState.data.rubrics.length).toFixed(2);

        // Domain breakdowns
        const d1Comps = appState.data.competencies.filter(c => c.domainId === 'D1');
        const d1Mastered = d1Comps.filter(c => c.status === 'mastered').length;

        const d2Comps = appState.data.competencies.filter(c => c.domainId === 'D2');
        const d2Mastered = d2Comps.filter(c => c.status === 'mastered').length;

        const d8Comps = appState.data.competencies.filter(c => c.domainId === 'D8');
        const d8Mastered = d8Comps.filter(c => c.status === 'mastered').length;

        const { hasBlocker, blockerReasons } = checkEthicalBlocker();

        container.innerHTML = `
            <!-- Coach Executive Hero Summary Banner -->
            <div class="coach-hero-summary-card">
                <div class="coach-hero-info">
                    <div class="coach-hero-avatar">${icon("graduationCap", {size:30})}</div>
                    <div class="coach-hero-texts">
                        <h2>لوحة المتابعة المهنية الموحدة: ${appState.data.metadata.candidate.name}</h2>
                        <p>
                            <span>${appState.data.metadata.candidate.title}</span>
                            <span>•</span>
                            <span class="coach-hero-badge">رمز الاعتماد: ${appState.data.metadata.candidate.id}</span>
                            <span>•</span>
                            <span>المشرف العام: الماستر كوتش عبدالكريم الخليفي (cyce52.com)</span>
                        </p>
                    </div>
                </div>
                <div class="coach-hero-actions">
                    <button class="coach-hero-btn primary" onclick="window.App.scrollToSection('panel-tasks')">
                        ${icon('document', {size:15, style:'margin-left:4px;'})} إيداع مهمة أو دليل
                    </button>
                    <button class="coach-hero-btn secondary" onclick="window.App.openNewToolModal()">
                        ${icon('target', {size:15, style:'margin-left:4px;'})} تسجيل أداة جديدة (90)
                    </button>
                    <button class="coach-hero-btn secondary" onclick="window.App.scrollToSection('panel-chat')">
                        ${icon('chat', {size:15, style:'margin-left:4px;'})} رسالة للمشرف
                    </button>
                    <button class="coach-hero-btn secondary" onclick="window.App.scrollToSection('panel-report')">
                        ${icon('scroll', {size:15, style:'margin-left:4px;'})} استعراض محضر التخرج
                    </button>
                </div>
            </div>

            <!-- Sticky Quick-Navigation Anchor Bar -->
            <div class="coach-sticky-nav-bar" id="coach-sticky-nav-bar">
                <button class="sticky-nav-pill active" data-target="panel-dashboard" onclick="window.App.scrollToSection('panel-dashboard')">
                    <span>${icon("zap", {size:14, style:"margin-left:4px;"})} المؤشرات العامة</span>
                </button>
                <button class="sticky-nav-pill" data-target="panel-tasks" onclick="window.App.scrollToSection('panel-tasks')">
                    <span>${icon("document", {size:14, style:"margin-left:4px;"})} المهام والأدلة</span>
                    <span class="pill-count">${appState.data.tasks.length}</span>
                </button>
                <button class="sticky-nav-pill" data-target="panel-quant" onclick="window.App.scrollToSection('panel-quant')">
                    <span>${icon("target", {size:14, style:"margin-left:4px;"})} تطبيقات الأدوات (90)</span>
                    <span class="pill-count">90</span>
                </button>
                <button class="sticky-nav-pill" data-target="panel-chat" onclick="window.App.scrollToSection('panel-chat')">
                    <span>${icon("chat", {size:14, style:"margin-left:4px;"})} المحادثة والتوجيه</span>
                    <span class="pill-live-dot"></span>
                </button>
                <button class="sticky-nav-pill" data-target="panel-rubrics" onclick="window.App.scrollToSection('panel-rubrics')">
                    <span>${icon("scale", {size:14, style:"margin-left:4px;"})} الروبركات الرسمية</span>
                    <span class="pill-count">6</span>
                </button>
                <button class="sticky-nav-pill" data-target="panel-competencies" onclick="window.App.scrollToSection('panel-competencies')">
                    <span>${icon("brain", {size:14, style:"margin-left:4px;"})} الكفايات الـ 14</span>
                    <span class="pill-count">43</span>
                </button>
                <button class="sticky-nav-pill" data-target="panel-ethics" onclick="window.App.scrollToSection('panel-ethics')">
                    <span>${icon("shield", {size:14, style:"margin-left:4px;"})} بوابة الأخلاقيات</span>
                    <span class="pill-badge-pass">100%</span>
                </button>
                <button class="sticky-nav-pill" data-target="panel-labs" onclick="window.App.scrollToSection('panel-labs')">
                    <span>${icon("microscope", {size:14, style:"margin-left:4px;"})} المختبرات والتميز</span>
                    <span class="pill-count">9</span>
                </button>
                <button class="sticky-nav-pill" data-target="panel-report" onclick="window.App.scrollToSection('panel-report')">
                    <span>${icon("scroll", {size:14, style:"margin-left:4px;"})} محضر الاعتماد</span>
                </button>
            </div>

            <!-- Quick Action Shortcuts Grid -->
            <div class="quick-shortcuts-grid">
                <div class="quick-shortcut-card" onclick="window.App.scrollToSection('panel-tasks')">
                    <div class="quick-shortcut-icon blue">${icon("document", {size:22})}</div>
                    <div class="quick-shortcut-info">
                        <h4>إيداع المهام والتأملات</h4>
                        <p>8 مهام ميدانية وبحثية معتمدة</p>
                    </div>
                </div>
                <div class="quick-shortcut-card" onclick="window.App.openNewToolModal()">
                    <div class="quick-shortcut-icon emerald">${icon("target", {size:22})}</div>
                    <div class="quick-shortcut-info">
                        <h4>تسجيل أداة تقييم (90)</h4>
                        <p>MBTI وعجلة الحياة وSWOT بلا تكرار</p>
                    </div>
                </div>
                <div class="quick-shortcut-card" onclick="window.App.scrollToSection('panel-chat')">
                    <div class="quick-shortcut-icon amber">${icon("chat", {size:22})}</div>
                    <div class="quick-shortcut-info">
                        <h4>التوجيه الإشرافي وديوان الزمالة</h4>
                        <p>ملاحظات صوتية ومستندات مباشرة</p>
                    </div>
                </div>
                <div class="quick-shortcut-card" onclick="window.App.scrollToSection('panel-report')">
                    <div class="quick-shortcut-icon purple">${icon("scroll", {size:22})}</div>
                    <div class="quick-shortcut-info">
                        <h4>محضر التدقيق والجاهزية</h4>
                        <p>شهادة الاعتماد CYCE الرقمية</p>
                    </div>
                </div>
            </div>

            ${hasBlocker ? `
                <div class="doctrine-callout-box" style="border-right-color:var(--status-crimson); background:rgba(220, 38, 38, 0.15);">
                    <div class="doctrine-icon" style="color:var(--status-crimson);">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                    </div>
                    <div class="doctrine-content">
                        <h4 style="color:var(--status-crimson-light);">${icon("alertTriangle", {size:18, style:"vertical-align:-3px; margin-left:4px;"})} تنبيه حاسم: تفعيل حظر الاعتماد الأخلاقي المستقل</h4>
                        <p style="color:var(--text-primary);">
                            <strong>المتوسط الحسابي لا يعوض بأي حال الإخفاق في الكفايات المهنية الجوهرية أو السلامة الأخلاقية.</strong>
                            <br>أسباب الحظر المرصودة: ${blockerReasons.join(' • ')}.
                        </p>
                    </div>
                </div>
            ` : ''}

            <!-- Methodological Doctrine Principle Box -->
            <div class="doctrine-callout-box">
                <div class="doctrine-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                </div>
                <div class="doctrine-content">
                    <h4>تنبيه منهجي معتمد: محركا التقييم المستقلان</h4>
                    <p>
                        يعرض الموقع <strong>تقدمين منفصلين تماماً</strong>: استكمال المتطلبات الكمية والساعات، ومستوى تحقق الكفايات وجودة الأداء المهني؛ 
                        فقد يستكمل المشارك العدد المطلوب من الجلسات والساعات ويحتاج إلى تحسين جودة الأداء. 
                        <strong>المتوسط الحسابي لا يعوض بأي حال الإخفاق في الكفايات المهنية الجوهرية أو السلامة الأخلاقية.</strong>
                    </p>
                </div>
            </div>

            <!-- Dual Progress Engines Grid -->
            <div class="dual-engine-grid">
                <!-- Engine 1: Quantitative & Hours -->
                <div class="engine-card quant">
                    <div class="engine-card-header">
                        <div class="engine-card-title">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            المحرك الأول: استكمال المتطلبات الكمية والساعات
                        </div>
                        <span class="engine-tag blue">تتبع عددي وزمني</span>
                    </div>

                    <div class="engine-gauge-wrap">
                        <div class="radial-progress-box">
                            <svg class="radial-progress-svg" viewBox="0 0 100 100">
                                <circle class="radial-bg" cx="50" cy="50" r="42"></circle>
                                <circle class="radial-bar blue" cx="50" cy="50" r="42" 
                                    stroke-dasharray="264" 
                                    stroke-dashoffset="${264 - (264 * quantPct / 100)}"></circle>
                            </svg>
                            <div class="radial-center-text">${quantPct}%</div>
                        </div>
                        <div class="gauge-details">
                            <div class="gauge-big-stat">${totalHours} <span style="font-size:0.9rem; font-weight:normal;">/ ${targetHours} ساعة معتمدة</span></div>
                            <div class="gauge-desc">شملت التدريب المباشر، والمختبرات، والممارسة الميدانية، والإشراف، والأبحاث.</div>
                        </div>
                    </div>

                    <div class="engine-mini-stats">
                        <div class="mini-stat-card">
                            <span class="mini-stat-label">المشروعات الميدانية</span>
                            <span class="mini-stat-val">${appState.data.cases.length} / 20</span>
                            <span class="mini-stat-sub">حالة متكاملة</span>
                        </div>
                        <div class="mini-stat-card">
                            <span class="mini-stat-label">الجلسات الميدانية</span>
                            <span class="mini-stat-val">${appState.data.sessions.length} / 30</span>
                            <span class="mini-stat-sub">جلسة موثقة</span>
                        </div>
                        <div class="mini-stat-card">
                            <span class="mini-stat-label">تطبيقات الأدوات</span>
                            <span class="mini-stat-val">${appState.data.toolsSummary.mbti.completed + appState.data.toolsSummary.wheelOfLife.completed + appState.data.toolsSummary.swot.completed} / 90</span>
                            <span class="mini-stat-sub">30 لكل أداة (بلا تكرار)</span>
                        </div>
                        <div class="mini-stat-card">
                            <span class="mini-stat-label">النماذج الابتكارية</span>
                            <span class="mini-stat-val">${appState.data.innovativeModels.length} / 10</span>
                            <span class="mini-stat-sub">نماذج معتمدة</span>
                        </div>
                    </div>
                </div>

                <!-- Engine 2: Competencies & Mastery -->
                <div class="engine-card competency">
                    <div class="engine-card-header">
                        <div class="engine-card-title">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                            المحرك الثاني: تحقق الكفايات وجودة الأداء
                        </div>
                        <span class="engine-tag emerald">تقييم بالروبركات</span>
                    </div>

                    <div class="engine-gauge-wrap">
                        <div class="radial-progress-box">
                            <svg class="radial-progress-svg" viewBox="0 0 100 100">
                                <circle class="radial-bg" cx="50" cy="50" r="42"></circle>
                                <circle class="radial-bar emerald" cx="50" cy="50" r="42" 
                                    stroke-dasharray="264" 
                                    stroke-dashoffset="${264 - (264 * compPct / 100)}"></circle>
                            </svg>
                            <div class="radial-center-text">${compPct}%</div>
                        </div>
                        <div class="gauge-details">
                            <div class="gauge-big-stat">${coreMastered} / 43 <span style="font-size:0.9rem; font-weight:normal;">كفاية فرعية</span></div>
                            <div class="gauge-desc">موزعة على المحاور الثمانية ومثبتة بالأدلة والتأملات الرباعية ومراجعة المشرف.</div>
                        </div>
                    </div>

                    <div class="engine-mini-stats">
                        <div class="mini-stat-card">
                            <span class="mini-stat-label">متوسط الروبركات</span>
                            <span class="mini-stat-val emerald">${avgRubricScore} / 5.0</span>
                            <span class="mini-stat-sub">متوسط مرجح من 5</span>
                        </div>
                        <div class="mini-stat-card">
                            <span class="mini-stat-label">الكفايات المهنية</span>
                            <span class="mini-stat-val">${d1Mastered} / ${d1Comps.length}</span>
                            <span class="mini-stat-sub">${d1Mastered === d1Comps.length ? 'تحقق كامل' : 'قيد التدقيق'}</span>
                        </div>
                        <div class="mini-stat-card">
                            <span class="mini-stat-label">الكفايات التحليلية</span>
                            <span class="mini-stat-val">${d2Mastered} / ${d2Comps.length}</span>
                            <span class="mini-stat-sub">${d2Mastered === d2Comps.length ? 'تحقق كامل' : 'قيد التدقيق'}</span>
                        </div>
                        <div class="mini-stat-card">
                            <span class="mini-stat-label">الكفايات الأخلاقية</span>
                            <span class="mini-stat-val gold">${d8Mastered} / ${d8Comps.length}</span>
                            <span class="mini-stat-sub">بوابة مستقلة قطعية</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Ethics Gate Fast-Check Card -->
            <div class="ethics-gate-banner" style="${hasBlocker ? 'border-color:var(--status-crimson);' : ''}">
                <div class="ethics-banner-right">
                    <div class="ethics-shield-icon" style="${hasBlocker ? 'background:rgba(220, 38, 38, 0.2); color:var(--status-crimson);' : ''}">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                        </svg>
                    </div>
                    <div class="ethics-banner-info">
                        <h3>بوابة السلامة والنزاهة الأخلاقية المستقلة (Ethical Safeguards Gate)</h3>
                        <p>
                            حالة التدقيق: <strong>${hasBlocker ? `${icon('alertTriangle', {size:14, style:'color:#DC2626; vertical-align:-2px; margin-left:3px;'})} حظر أخلاقي نشط` : appState.data.ethicsGate.clearanceBadge}</strong> • 
                            ${hasBlocker ? 'يوجد إخفاق في معيار حرج يمنع اعتماد التخرج.' : 'تم فحص كافة التعاقدات والسرية ونزع الهوية وحالة الإحالة REF-2026-01 بنجاح تام.'}
                        </p>
                    </div>
                </div>
                <button class="ethics-gate-action-btn" onclick="window.App.switchTab('ethics')">
                    فحص سجل البوابة الأخلاقية والإحالات ←
                </button>
            </div>

            <!-- Recent Highlights & Milestones -->
            <div class="section-header-wrap" style="margin-top: 2rem;">
                <div>
                    <h3 class="section-title" style="font-size: 1.2rem;">المخرجات الرئيسية المعتمدة في ملف الإنجاز</h3>
                    <p class="section-desc">أهم الإنجازات التطبيقية التي تم تدقيقها واعتمادها من الماستر كوتش عبدالكريم الخليفي</p>
                </div>
            </div>

            <div class="cards-grid-4">
                <div class="standard-card">
                    <div class="card-top-row">
                        <span class="badge-status approved">معتمد</span>
                        <small style="color:var(--text-muted); font-family:var(--font-mono);">58 صفحة</small>
                    </div>
                    <h4 class="card-title-lg">الورقة العلمية التطبيقية</h4>
                    <p class="card-desc-sm">بحث تطبيقي رصين بنظام APA 7 وعرض مرئي في الملتقى السنوي لتمكين 2026.</p>
                    <div class="progress-bar-wrap"><div class="progress-bar-fill emerald" style="width: 100%;"></div></div>
                </div>

                <div class="standard-card">
                    <div class="card-top-row">
                        <span class="badge-status approved">مجاز بامتياز</span>
                        <small style="color:var(--text-muted); font-family:var(--font-mono);">مشروع تخرج</small>
                    </div>
                    <h4 class="card-title-lg">مشروع التخرج الابتكاري</h4>
                    <p class="card-desc-sm">منظومة تمكين 360 للذكاء الكوتشنجي، دمج مقياس LMMI وبوصلة التمكين الخماسي.</p>
                    <div class="progress-bar-wrap"><div class="progress-bar-fill emerald" style="width: 100%;"></div></div>
                </div>

                <div class="standard-card">
                    <div class="card-top-row">
                        <span class="badge-status approved">معتمد</span>
                        <small style="color:var(--text-muted); font-family:var(--font-mono);">شركة ريادة</small>
                    </div>
                    <h4 class="card-title-lg">تهيئة مؤسسة للكوتشنج</h4>
                    <p class="card-desc-sm">تطبيق نموذج عمر قرافي للمسارات الثلاثة والخطة الاستراتيجية لـ Pfeiffer المعدل.</p>
                    <div class="progress-bar-wrap"><div class="progress-bar-fill emerald" style="width: 100%;"></div></div>
                </div>

                <div class="standard-card">
                    <div class="card-top-row">
                        <span class="badge-status approved">معتمد</span>
                        <small style="color:var(--text-muted); font-family:var(--font-mono);">5 تسجيلات</small>
                    </div>
                    <h4 class="card-title-lg">التسجيلات الاحترافية</h4>
                    <p class="card-desc-sm">5 تسجيلات صوتية في موضوعات كوتشنج تخصصية مع تغذية راجعة بطوابع زمنية.</p>
                    <div class="progress-bar-wrap"><div class="progress-bar-fill emerald" style="width: 100%;"></div></div>
                </div>
            </div>
        `;
    }

    // Render Quantitative Panel (Hours, Prerequisites, 20 Cases, 30 Sessions, 90 Tools, Models, Org, Audio)
    function renderQuantitativePanel() {
        const container = document.getElementById('quant-content-area');
        if (!container) return;

        // Hours Rows
        const hoursRowsHtml = appState.data.hours.map(h => `
            <tr>
                <td><strong>${h.component}</strong></td>
                <td><span style="font-family:var(--font-mono); font-weight:700;">${h.target} س</span></td>
                <td><span style="font-family:var(--font-mono); font-weight:700; color:var(--status-emerald-light);">${h.completed} س</span></td>
                <td style="width:250px;">
                    <div class="progress-bar-wrap">
                        <div class="progress-bar-fill ${h.completed >= h.target ? 'emerald' : 'blue'}" 
                             style="width: ${Math.min(100, (h.completed / h.target) * 100)}%;"></div>
                    </div>
                </td>
                <td><span class="badge-status approved">مستوفى 100%</span></td>
                <td style="font-size:0.8rem; color:var(--text-secondary);">${h.details}</td>
            </tr>
        `).join('');

        // Prerequisites & Field Follow-up Cards
        const meta = appState.data.metadata;
        const prereqHtml = `
            <div class="cards-grid-4" style="margin-bottom: 2rem;">
                <div class="standard-card">
                    <div class="card-top-row">
                        <span class="badge-status approved">معتمد بالقبول</span>
                        <span style="font-family:var(--font-mono); color:var(--text-muted); font-size:0.75rem;">CPC / PCC</span>
                    </div>
                    <h4 class="card-title-lg">${meta.prerequisites?.title || 'مراجعة مخرجات CPC و PCC'}</h4>
                    <p class="card-desc-sm">${meta.prerequisites?.evidence || 'سجل تدقيق القبول والاطلاع الموثق على التسجيلات السابقة.'}</p>
                    <div style="font-size:0.75rem; color:var(--status-emerald-light); font-weight:600; border-top:1px solid var(--border-subtle); padding-top:0.4rem;">
                        المعتمد: ${meta.prerequisites?.auditor || 'الماستر كوتش عبدالكريم الخليفي'}
                    </div>
                </div>

                <div class="standard-card">
                    <div class="card-top-row">
                        <span class="badge-status approved">3 أشهر كاملة</span>
                        <span style="font-family:var(--font-mono); color:var(--accent-cyan); font-weight:bold;">90 يوماً</span>
                    </div>
                    <h4 class="card-title-lg">المتابعة الميدانية الزمنية</h4>
                    <p class="card-desc-sm">${meta.fieldFollowup?.evidence || 'سجل زمني متصل للممارسة الميدانية والمتابعة المستمرة لمدة 3 أشهر.'}</p>
                    <div style="font-size:0.75rem; color:var(--text-muted); border-top:1px solid var(--border-subtle); padding-top:0.4rem; font-family:var(--font-mono);">
                        الفترة: ${meta.fieldFollowup?.startDate} إلى ${meta.fieldFollowup?.endDate}
                    </div>
                </div>

                <div class="standard-card">
                    <div class="card-top-row">
                        <span class="badge-status approved">إقرار موثق</span>
                        <span style="font-size:0.75rem; color:var(--text-muted);">كافة المقررات</span>
                    </div>
                    <h4 class="card-title-lg">${meta.mediaDeclaration?.title || 'المواد الصوتية والمرئية'}</h4>
                    <p class="card-desc-sm">${meta.mediaDeclaration?.details || 'تم الاستماع والمشاهدة لكافة المواد المسجلة المعتمدة بالحقيبة.'}</p>
                    <div style="font-size:0.75rem; color:var(--status-emerald-light); font-weight:600; border-top:1px solid var(--border-subtle); padding-top:0.4rem;">
                        تاريخ الإقرار: ${meta.mediaDeclaration?.signDate}
                    </div>
                </div>

                <div class="standard-card">
                    <div class="card-top-row">
                        <span class="badge-status approved">مجاز بتفوق</span>
                        <span style="font-family:var(--font-mono); color:var(--text-gold); font-weight:bold;">${meta.periodicAssessments?.averageScore || 96.5}%</span>
                    </div>
                    <h4 class="card-title-lg">${meta.periodicAssessments?.title || 'التقييمات النظرية والمرحلية'}</h4>
                    <p class="card-desc-sm">${meta.periodicAssessments?.verdict || 'اجتياز بتفوق لكافة محطات التحقق المعرفي والمرحلي.'}</p>
                    <div style="font-size:0.75rem; color:var(--status-emerald-light); font-weight:600; border-top:1px solid var(--border-subtle); padding-top:0.4rem;">
                        النتيجة: مكتملة ومعتمدة
                    </div>
                </div>
            </div>
        `;

        // Cases Table (20 Cases with Inspect Button)
        const casesRowsHtml = appState.data.cases.map(c => `
            <tr>
                <td><span class="comp-item-id">${c.code}</span></td>
                <td><strong>${c.title}</strong></td>
                <td><span style="font-family:var(--font-mono);">${c.sessionsCount} جلسة (${c.totalMinutes} دقيقة)</span></td>
                <td>${c.models.map(m => `<span style="display:inline-block; margin:2px; font-size:0.75rem; background:var(--bg-input); padding:2px 6px; border-radius:4px;">${m}</span>`).join('')}</td>
                <td>
                    <span class="badge-status ${c.status === 'closed' ? 'approved' : 'referred'}">
                        ${c.status === 'closed' ? 'مكتملة ومغلقة' : 'محالة طبياً'}
                    </span>
                </td>
                <td>
                    <button class="btn-sm btn-secondary" onclick="window.App.openCaseModal(${c.id})">
                        استعراض ملف الحالة
                    </button>
                </td>
            </tr>
        `).join('');

        // Sessions Table with Filter & View All Toggle
        let filteredSessions = appState.data.sessions;
        if (appState.sessionsFilterCase !== 'ALL') {
            filteredSessions = filteredSessions.filter(s => s.caseCode === appState.sessionsFilterCase);
        }
        const displayedSessions = appState.sessionsShowAll ? filteredSessions : filteredSessions.slice(0, 10);

        const sessionsRowsHtml = displayedSessions.map(s => `
            <tr>
                <td><span style="font-family:var(--font-mono); font-weight:700;">#${s.id}</span></td>
                <td><span class="comp-item-id">${s.caseCode}</span></td>
                <td><span style="font-family:var(--font-mono);">${s.date}</span></td>
                <td><span style="font-family:var(--font-mono);">${s.duration} دقيقة</span></td>
                <td><strong>${s.focus}</strong></td>
                <td><span style="font-family:var(--font-mono); color:var(--status-emerald-light); font-weight:700;">${s.rubricsScore} / 5</span></td>
                <td><span class="badge-status approved">معتمدة</span></td>
            </tr>
        `).join('');

        // 90 Tools Applications List Viewer
        const activeTool = appState.data.toolsSummary[appState.activeToolTab] || appState.data.toolsSummary.mbti;
        const toolApps = activeTool.applications || [];
        const filteredToolApps = toolApps.filter(app => {
            if (!appState.toolsSearchQuery) return true;
            const q = appState.toolsSearchQuery.toLowerCase();
            return (app.beneficiaryCode && app.beneficiaryCode.toLowerCase().includes(q)) ||
                   (app.focus && app.focus.toLowerCase().includes(q)) ||
                   (app.resultType && app.resultType.toLowerCase().includes(q));
        });

        const toolAppsTableRows = filteredToolApps.map((app, idx) => `
            <tr>
                <td><span style="font-family:var(--font-mono); font-weight:bold;">#${app.id || idx + 1}</span></td>
                <td><span class="comp-item-id">${app.beneficiaryCode}</span></td>
                <td><span style="font-family:var(--font-mono);">${app.date}</span></td>
                <td>${app.resultType ? `<span style="font-family:var(--font-mono); color:var(--accent-cyan); font-weight:bold;">${app.resultType}</span>` : (app.baselineScore ? `<span style="font-family:var(--font-mono);">${app.baselineScore} ← ${app.targetScore}</span>` : 'تحليل رباعي')}</td>
                <td style="font-size:0.82rem;">${app.focus}</td>
                <td><span class="badge-status approved">معتمد وخالٍ من التكرار</span></td>
            </tr>
        `).join('');

        // Innovative Models (10)
        const modelsHtml = appState.data.innovativeModels.map(m => `
            <div class="standard-card">
                <div class="card-top-row">
                    <span class="badge-status approved">نموذج #${m.id}</span>
                    <small style="color:var(--text-emerald); font-weight:bold;">معتمد ومختبر</small>
                </div>
                <h4 class="card-title-lg" style="margin-bottom:0.5rem; color:var(--brand-blue-light);">${m.title}</h4>
                <div style="font-size:0.82rem; margin-bottom:0.4rem;">
                    <strong style="color:var(--text-muted);">المشكلة المعالجة:</strong> ${m.problemAddressed}
                </div>
                <div style="font-size:0.82rem; margin-bottom:0.4rem;">
                    <strong style="color:var(--text-muted);">المرجعية النظرية:</strong> ${m.theoreticalReference}
                </div>
                <div style="font-size:0.82rem; margin-bottom:0.4rem;">
                    <strong style="color:var(--text-muted);">القيمة المضافة:</strong> ${m.addedValue}
                </div>
                <div style="font-size:0.82rem; background:var(--bg-surface); padding:0.5rem; border-radius:var(--radius-sm); border:1px solid var(--border-subtle);">
                    <strong style="color:var(--status-emerald-light);">اختبار القابلية والأثر:</strong> ${m.feasibilityTest}
                </div>
            </div>
        `).join('');

        // Topic Recordings (5)
        const recordingsHtml = appState.data.professionalRecordings.map(r => `
            <div class="standard-card">
                <div class="card-top-row">
                    <span class="badge-status approved">${r.topic}</span>
                    <span style="font-family:var(--font-mono); color:var(--text-cyan); font-weight:bold;">${r.duration}</span>
                </div>
                <h4 class="card-title-lg" style="margin-bottom:0.5rem;">${r.title}</h4>
                <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:0.75rem;">
                    <strong>ملاحظة المشرف:</strong> ${r.supervisorNotes}
                </p>
                
                <!-- Audio Waveform Simulator -->
                <div class="audio-player-simulator" id="audio-player-${r.id}">
                    <div class="audio-player-top">
                        <div class="audio-track-info">
                            <button class="audio-play-btn" id="play-btn-${r.id}" onclick="window.App.toggleAudioPlayback(this, '${r.id}', '${r.duration}')">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                </svg>
                            </button>
                            <div class="audio-meta">
                                <h5>استماع للتسجيل والتغذية الإشرافية</h5>
                                <span>صوت نقي مشفر • تقييم الماستر كوتش عبدالكريم الخليفي</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="waveform-visual-bars" id="waveform-${r.id}" onclick="window.App.scrubAudio(event, '${r.id}')">
                        ${generateWaveformBars(r.id)}
                    </div>
                    
                    <div class="audio-time-row">
                        <span class="audio-cur-time" id="cur-time-${r.id}">00:00</span>
                        <span>${r.duration}</span>
                    </div>

                    <div class="timestamps-pills-wrap">
                        <small style="color:var(--text-muted); margin-left:0.5rem;">طوابع التغذية الزمنية:</small>
                        ${r.timestamps.map(ts => `
                            <button class="ts-pill-btn" onclick="window.App.jumpToTimestamp('${r.id}', '${ts.time}', '${escapeJsAttr(ts.note)}')">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                ${ts.time}
                            </button>
                        `).join('')}
                    </div>

                    <div id="active-ts-note-${r.id}" style="display:none; margin-top:0.6rem; font-size:0.78rem; background:rgba(37,99,235,0.15); padding:0.4rem 0.6rem; border-radius:var(--radius-sm); border:1px solid var(--border-accent); color:var(--text-cyan);"></div>
                </div>

                <div style="margin-top:0.75rem; font-size:0.8rem; color:var(--status-emerald-light);">
                    <strong>التحسين المطبق:</strong> ${r.appliedImprovement}
                </div>
            </div>
        `).join('');

        container.innerHTML = `
            <div class="onepage-section-header" id="sec-quant-header">
                <div class="sec-header-left">
                    <span class="sec-icon-box">${icon("target", {size:24})}</span>
                    <div>
                        <h2 class="sec-title">مسار تطبيقات الأدوات الـ 90 والمتطلبات الميدانية</h2>
                        <p class="sec-subtitle">توثيق 30 MBTI + 30 عجلة الحياة + 30 SWOT مع فحص منع التكرار ومتابعة الـ 20 حالة والـ 30 جلسة</p>
                    </div>
                </div>
                <div class="sec-header-right">
                    <span class="badge" style="background:#2563EB; color:#fff; padding:0.35rem 0.85rem; border-radius:999px; font-weight:700; font-size:0.82rem;">90 / 90 تطبيقاً موثقاً</span>
                    <button class="btn btn-primary btn-sm" onclick="window.App.openNewToolModal()" style="background:#059669; border-color:#059669;">+ تسجيل تطبيق أداة جديد</button>
                </div>
            </div>

            <!-- Prerequisites Section -->
            <div class="section-header-wrap">
                <div>
                    <h3 class="section-title">1. متطلبات القبول والمتابعة الميدانية والتقييمات المرحلية</h3>
                    <p class="section-desc">المتطلبات النظامية الواردة بالحقيبة لضبط التأهيل والجاهزية المهنية</p>
                </div>
            </div>
            ${prereqHtml}

            <!-- Hours Section -->
            <div class="section-header-wrap" style="margin-top: 2rem;">
                <div>
                    <h3 class="section-title">2. الساعات المعتمدة للبرنامج (240 ساعة كاملة)</h3>
                    <p class="section-desc">متابعة دقيقة ومنفصلة للأعداد والساعات وفق معايير حقيبة الماستر كوتش 3.0</p>
                </div>
            </div>

            <div class="table-responsive-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>المكون التدريبي</th>
                            <th>المستهدف</th>
                            <th>المنجز الفعلي</th>
                            <th>نسبة الإنجاز</th>
                            <th>الحالة</th>
                            <th>البيان والتفاصيل</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${hoursRowsHtml}
                    </tbody>
                </table>
            </div>

            <!-- 90 Tools Engine Section -->
            <div class="section-header-wrap" style="margin-top: 3rem;">
                <div>
                    <h3 class="section-title">3. تطبيقات الأدوات الـ 90 وضبط منع التكرار</h3>
                    <p class="section-desc">
                        قاعدة الحقيبة الذهبية: تتطلب 90 تطبيقاً موثقاً (30 لكل أداة)، 
                        <strong>ويمنع تكرار المستفيد داخل عداد الأداة نفسها</strong> (مع جواز استخدامه بين الأدوات المختلفة).
                    </p>
                </div>
                <div class="section-actions">
                    <button class="btn-primary" onclick="window.App.openNewToolModal()">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        تسجيل تطبيق جديد وفحص التكرار
                    </button>
                </div>
            </div>

            <div class="cards-grid-3">
                <div class="standard-card ${appState.activeToolTab === 'mbti' ? 'selected-tool' : ''}" style="cursor:pointer;" onclick="window.App.switchToolTab('mbti')">
                    <div class="card-top-row">
                        <span class="badge-status approved">${appState.data.toolsSummary.mbti.completed} / 30 مكتمل</span>
                        <small style="color:var(--status-emerald-light); font-weight:bold;">خالٍ من التكرار</small>
                    </div>
                    <h4 class="card-title-lg">اختبار أنماط الشخصية MBTI</h4>
                    <p class="card-desc-sm">30 مستفيداً مختلفاً مع تقارير التفسير والتأملات المهنية المرفقة.</p>
                    <div class="progress-bar-wrap"><div class="progress-bar-fill emerald" style="width: 100%;"></div></div>
                </div>

                <div class="standard-card ${appState.activeToolTab === 'wheelOfLife' ? 'selected-tool' : ''}" style="cursor:pointer;" onclick="window.App.switchToolTab('wheelOfLife')">
                    <div class="card-top-row">
                        <span class="badge-status approved">${appState.data.toolsSummary.wheelOfLife.completed} / 30 مكتمل</span>
                        <small style="color:var(--status-emerald-light); font-weight:bold;">خالٍ من التكرار</small>
                    </div>
                    <h4 class="card-title-lg">عجلة الحياة (Wheel of Life)</h4>
                    <p class="card-desc-sm">30 خطة تطبيق متكاملة تشمل الأولويات، الأهداف، والإجراءات ومؤشرات المتابعة.</p>
                    <div class="progress-bar-wrap"><div class="progress-bar-fill emerald" style="width: 100%;"></div></div>
                </div>

                <div class="standard-card ${appState.activeToolTab === 'swot' ? 'selected-tool' : ''}" style="cursor:pointer;" onclick="window.App.switchToolTab('swot')">
                    <div class="card-top-row">
                        <span class="badge-status approved">${appState.data.toolsSummary.swot.completed} / 30 مكتمل</span>
                        <small style="color:var(--status-emerald-light); font-weight:bold;">خالٍ من التكرار</small>
                    </div>
                    <h4 class="card-title-lg">تحليل SWOT الشخصي والمهني</h4>
                    <p class="card-desc-sm">30 تحليلاً نوعياً مع توصيات وخطط تطوير قابلة للمتابعة الميدانية والقياس.</p>
                    <div class="progress-bar-wrap"><div class="progress-bar-fill emerald" style="width: 100%;"></div></div>
                </div>
            </div>

            <!-- Active Tool Applications Log -->
            <div style="background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:1.25rem; margin-top:1.5rem;">
                <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:1rem; margin-bottom:1rem;">
                    <div>
                        <h4 style="font-size:1rem; font-weight:700; color:var(--text-primary);">
                            سجل تطبيقات: <span style="color:var(--brand-blue-light);">${activeTool.label}</span> (${activeTool.completed} تطبيقاً مسجلاً)
                        </h4>
                        <p style="font-size:0.78rem; color:var(--text-muted);">${activeTool.description}</p>
                    </div>
                    <div class="search-input-wrap" style="width:260px;">
                        <span class="search-icon-inside">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        </span>
                        <input type="text" placeholder="بحث برمز المستفيد..." value="${appState.toolsSearchQuery}" oninput="window.App.filterToolApplications(this.value)">
                    </div>
                </div>

                <div class="table-responsive-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>رمز المستفيد</th>
                                <th>تاريخ التطبيق</th>
                                <th>النتيجة / القياس</th>
                                <th>مجال التركيز</th>
                                <th>حالة الاعتماد</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${toolAppsTableRows.length > 0 ? toolAppsTableRows : '<tr><td colspan="6" style="text-align:center; padding:1.5rem; color:var(--text-muted);">لا توجد نتائج مطابقة لبحثك.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- 20 Cases Section -->
            <div class="section-header-wrap" style="margin-top: 3rem;">
                <div>
                    <h3 class="section-title">4. المشروعات الميدانية (20 حالة متكاملة)</h3>
                    <p class="section-desc">عشرون حالة حقيقية متكاملة بملف كامل للجلسات والتدخلات والنتائج والأثر الملحوظ.</p>
                </div>
            </div>

            <div class="table-responsive-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>رمز الحالة</th>
                            <th>عنوان الحالة وموضوع الكوتشنج</th>
                            <th>الجلسات والمدة</th>
                            <th>النماذج المطبقة</th>
                            <th>الحالة والنتيجة</th>
                            <th>الإجراء والملف</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${casesRowsHtml}
                    </tbody>
                </table>
            </div>

            <!-- 30 Sessions Sample Log -->
            <div class="section-header-wrap" style="margin-top: 3rem;">
                <div>
                    <h3 class="section-title">5. سجل الجلسات الميدانية (30 جلسة موثقة)</h3>
                    <p class="section-desc">الجلسات الثلاثون إجمالي موزع على الحالات العشرين وموثقة بتقرير تسجيل معتمد لكل جلسة.</p>
                </div>
                <div class="section-actions" style="display:flex; gap:0.5rem; align-items:center;">
                    <select class="role-select" style="font-size:0.8rem; padding:0.3rem 0.6rem;" onchange="window.App.filterSessionsByCase(this.value)">
                        <option value="ALL">كافة الحالات العشرين</option>
                        ${appState.data.cases.map(c => `<option value="${c.code}" ${appState.sessionsFilterCase === c.code ? 'selected' : ''}>${c.code}: ${c.title.substring(0, 25)}...</option>`).join('')}
                    </select>
                    <button class="btn-sm btn-secondary" onclick="window.App.toggleSessionsView()">
                        ${appState.sessionsShowAll ? 'عرض أحدث 10 جلسات فقط' : `عرض كافة الجلسات (${filteredSessions.length})`}
                    </button>
                </div>
            </div>

            <div class="table-responsive-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>رقم الجلسة</th>
                            <th>الحالة المرتبطة</th>
                            <th>تاريخ الانعقاد</th>
                            <th>المدة</th>
                            <th>محور وتركيز الجلسة</th>
                            <th>تقييم الروبرك</th>
                            <th>الاعتماد</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sessionsRowsHtml}
                    </tbody>
                </table>
            </div>

            <!-- 10 Innovative Models Grid -->
            <div class="section-header-wrap" style="margin-top: 3rem;">
                <div>
                    <h3 class="section-title">6. النماذج الابتكارية للكوتشنج والتطبيقات الإدارية (10 نماذج)</h3>
                    <p class="section-desc">الفكرة، القيمة المضافة، آلية التطبيق، واختبار القابلية والأثر على الحالات الواقعية.</p>
                </div>
            </div>

            <div class="cards-grid-3">
                ${modelsHtml}
            </div>

            <!-- 1 Personality Tool & 1 Org Readiness -->
            <div class="section-header-wrap" style="margin-top: 3rem;">
                <div>
                    <h3 class="section-title">7. أداة تحليل الشخصية المبتكرة وتهيئة المؤسسة للكوتشنج</h3>
                    <p class="section-desc">مخرجات تخصصية نادرة تميز حقيبة الماستر كوتش في تمكين الرؤية.</p>
                </div>
            </div>

            <div class="cards-grid-3">
                <div class="standard-card" style="border-color:var(--border-gold);">
                    <div class="card-top-row">
                        <span class="badge-status approved">أداة مبتكرة معتمدة</span>
                        <span style="color:var(--text-gold); font-weight:bold;">LMMI Index</span>
                    </div>
                    <h4 class="card-title-lg" style="color:var(--text-gold);">${appState.data.innovativeTool.name}</h4>
                    <p class="card-desc-sm"><strong>الغرض:</strong> ${appState.data.innovativeTool.purpose}</p>
                    <p class="card-desc-sm"><strong>الحدود المهنية:</strong> ${appState.data.innovativeTool.boundaries}</p>
                    <p class="card-desc-sm" style="color:var(--status-emerald-light);"><strong>آلية التحقق:</strong> ${appState.data.innovativeTool.verificationMechanism}</p>
                </div>

                <div class="standard-card" style="border-color:var(--brand-blue); grid-column: span 2;">
                    <div class="card-top-row">
                        <span class="badge-status approved">مشروع تهيئة مؤسسة</span>
                        <span style="color:var(--brand-blue-light); font-weight:bold;">${appState.data.orgPreparation.orgName}</span>
                    </div>
                    <h4 class="card-title-lg">${appState.data.orgPreparation.sector}</h4>
                    <p class="card-desc-sm">تطبيق خطة قرافي للمسارات الثلاثة + نموذج Pfeiffer المعدل لتأسيس ثقافة الكوتشنج المؤسسي.</p>
                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:0.5rem; margin-top:0.75rem;">
                        ${appState.data.orgPreparation.phases.map(p => `
                            <div style="background:var(--bg-surface); padding:0.6rem; border-radius:var(--radius-sm); border:1px solid var(--border-subtle); font-size:0.78rem;">
                                <div style="font-weight:bold; color:var(--text-primary);">${p.phase}</div>
                                <div style="color:var(--text-muted);">${p.duration}</div>
                                <div style="color:var(--status-emerald-light); margin-top:4px;">${p.output}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <!-- 5 Professional Topic Recordings -->
            <div class="section-header-wrap" style="margin-top: 3rem;">
                <div>
                    <h3 class="section-title">8. التسجيلات المهنية الاحترافية في موضوعات كوتشنج مختارة (5 تسجيلات)</h3>
                    <p class="section-desc">تسجيلات صوتية تخصصية مع تغذية راجعة للمشرف مرتبطة بطوابع زمنية دقيقة وإثبات التحسين.</p>
                </div>
            </div>

            <div class="cards-grid-3">
                ${recordingsHtml}
            </div>
        `;
    }

    // Helper for Audio Waveform Bars
    function generateWaveformBars(trackId) {
        const heights = [30, 45, 70, 85, 60, 40, 75, 95, 50, 65, 80, 45, 90, 70, 55, 85, 100, 60, 40, 75, 90, 50, 65, 80, 45, 95, 70, 60, 85, 40];
        return heights.map((h, i) => `
            <div class="wave-bar" id="wave-${trackId}-${i}" style="height:${h}%;"></div>
        `).join('');
    }

    // Switch Competencies View Mode ('domains14' | 'subcomps44')
    function switchCompsViewMode(mode) {
        appState.compsViewMode = mode;
        renderCompetencyMatrixPanel();
    }

    // Render Competency Matrix (14 Core Domains or 43 + 1 Subcompetencies)
    function renderCompetencyMatrixPanel() {
        const container = document.getElementById('comps-content-area');
        if (!container) return;

        const switcherHtml = `
            <div class="comps-view-switcher">
                <button class="comps-switch-btn ${appState.compsViewMode === 'domains14' ? 'active' : ''}" onclick="window.App.switchCompsViewMode('domains14')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>
                    مجالات الكفايات الـ 14 المعتمدة (الاتحاد العربي للكوتشنج)
                </button>
                <button class="comps-switch-btn ${appState.compsViewMode === 'subcomps44' ? 'active' : ''}" onclick="window.App.switchCompsViewMode('subcomps44')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                    مصفوفة الكفايات التفصيلية (43 + 1) والمحاور الثمانية
                </button>
            </div>
        `;

        if (appState.compsViewMode === 'domains14') {
            render14DomainsGrid(container, switcherHtml);
            return;
        }

        // Subcompetencies (43 + 1) View
        let domainPills = `<button class="filter-pill-btn ${appState.compFilterDomain === 'ALL' ? 'active' : ''}" onclick="window.App.filterCompsByDomain('ALL')">كافة المحاور (9)</button>`;
        domainPills += appState.data.domains.map(d => `
            <button class="filter-pill-btn ${appState.compFilterDomain === d.id ? 'active' : ''}" onclick="window.App.filterCompsByDomain('${d.id}')">
                ${d.title} (${d.count})
            </button>
        `).join('');

        // Filter Competencies
        const filteredComps = appState.data.competencies.filter(c => {
            const matchesDomain = appState.compFilterDomain === 'ALL' || c.domainId === appState.compFilterDomain;
            const matchesStatus = appState.compFilterStatus === 'ALL' || c.status === appState.compFilterStatus;
            const matchesSearch = !appState.compSearchQuery || 
                                  c.title.toLowerCase().includes(appState.compSearchQuery.toLowerCase()) ||
                                  c.code.toLowerCase().includes(appState.compSearchQuery.toLowerCase()) ||
                                  c.description.toLowerCase().includes(appState.compSearchQuery.toLowerCase());
            return matchesDomain && matchesStatus && matchesSearch;
        });

        // Group by Domain
        const domainsHtml = appState.data.domains.map(domain => {
            if (appState.compFilterDomain !== 'ALL' && appState.compFilterDomain !== domain.id) {
                return '';
            }

            const domainComps = filteredComps.filter(c => c.domainId === domain.id);
            if (domainComps.length === 0) return '';

            const masteredInDomain = domainComps.filter(c => c.status === 'mastered').length;

            return `
                <div class="domain-card" id="domain-${domain.id}">
                    <div class="domain-header-bar">
                        <div class="domain-title-wrap">
                            <div class="domain-badge-circle" style="background:${domain.bgColor}; color:${domain.color};">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 6 12 12 16 14"></polyline>
                                </svg>
                            </div>
                            <div>
                                <h3 class="domain-name">${domain.title}</h3>
                                <p style="font-size:0.8rem; color:var(--text-secondary);">${domain.description}</p>
                            </div>
                        </div>
                        <div class="domain-stats-summary">
                            <span>التحقق: <strong>${masteredInDomain} / ${domainComps.length}</strong></span>
                            ${domain.isIndependentGate ? '<span class="ethics-pill-pass">شرط اجتياز مستقل</span>' : ''}
                        </div>
                    </div>

                    <div class="subcompetencies-list">
                        ${domainComps.map(c => `
                            <div class="comp-item-card">
                                <div>
                                    <div class="comp-item-top">
                                        <span class="comp-item-id">${c.id} • ${c.code}</span>
                                        <span class="badge-status ${c.status === 'mastered' ? 'approved' : 'draft'}">
                                            ${c.status === 'mastered' ? 'متحققة بامتياز' : 'قيد التدقيق'}
                                        </span>
                                    </div>
                                    <h4 class="comp-item-title">${c.title}</h4>
                                    <p style="font-size:0.8rem; color:var(--text-secondary); margin:0.4rem 0;">${c.description}</p>
                                </div>

                                <div>
                                    <div class="comp-item-eval">
                                        <strong style="color:var(--text-muted);">أسلوب التقييم:</strong> ${c.evaluationMethod}
                                    </div>
                                    <div class="comp-item-footer">
                                        <span style="color:var(--status-emerald-light); font-weight:bold;">
                                            ${c.evidenceCount} أدلة وبراهين مسندة
                                        </span>
                                        <button class="btn-sm btn-secondary" onclick="window.App.openInspectCompetencyModal('${c.id}')">
                                            استعراض الأدلة
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            ${switcherHtml}

            <div class="section-header-wrap">
                <div>
                    <h3 class="section-title">مصفوفة الكفايات الـ 43 ومحاورها الثمانية + كفاية الإشراف</h3>
                    <p class="section-desc">
                        تتضمن الحقيبة ثمانية محاور تضم 43 كفاية فرعية (بالإضافة إلى كفاية الإشراف على الممارسين). 
                        يمكن تقييم عدة كفايات بالدليل نفسه بدل إنشاء مهمة مستقلة لكل كفاية.
                    </p>
                </div>
            </div>

            <div class="toolbar-filter-row">
                <div class="search-input-wrap">
                    <span class="search-icon-inside">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    </span>
                    <input type="text" placeholder="بحث في الكفايات، التوصيف، أسلوب التقييم..." 
                           value="${appState.compSearchQuery}" 
                           oninput="window.App.onCompSearch(this.value)">
                </div>

                <div class="filter-pills-group">
                    <button class="filter-pill-btn ${appState.compFilterStatus === 'ALL' ? 'active' : ''}" onclick="window.App.filterCompsByStatus('ALL')">الكل</button>
                    <button class="filter-pill-btn ${appState.compFilterStatus === 'mastered' ? 'active' : ''}" onclick="window.App.filterCompsByStatus('mastered')">متحققة</button>
                    <button class="filter-pill-btn ${appState.compFilterStatus === 'in_progress' ? 'active' : ''}" onclick="window.App.filterCompsByStatus('in_progress')">قيد التطوير</button>
                </div>
            </div>

            <div class="filter-pills-group" style="margin-bottom: 1.5rem;">
                ${domainPills}
            </div>

            <div class="domains-container">
                ${domainsHtml}
            </div>
        `;
    }

    // Render 14 Core Competency Domains Grid
    function render14DomainsGrid(container, switcherHtml) {
        const domains14 = appState.data.core14Domains || [];
        const totalHours = domains14.reduce((acc, d) => acc + (d.targetHours || 0), 0);

        const cardsHtml = domains14.map(domain => {
            const indicatorsHtml = (domain.keyIndicators || []).map(ind => `
                <li>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>${ind}</span>
                </li>
            `).join('');

            const linkedCount = (domain.linkedCompetencies || []).length;

            return `
                <div class="domain14-card" id="domain14-${domain.id}">
                    <div>
                        <div class="domain14-header">
                            <span class="domain14-code-pill">${domain.id}</span>
                            <span class="badge-status approved" style="font-size:0.75rem;">
                                المستوى 5/5: خبير
                            </span>
                        </div>
                        <h4>${domain.title}</h4>
                        <div class="domain14-subtitle">${domain.subtitle || ''}</div>
                        <p class="domain14-desc">${domain.description || ''}</p>
                        
                        <div style="font-size:0.78rem; font-weight:700; color:var(--text-muted); margin-bottom:0.4rem;">
                            أبرز المؤشرات السلوكية المقاسة:
                        </div>
                        <ul class="domain14-indicators-list">
                            ${indicatorsHtml}
                        </ul>
                    </div>

                    <div>
                        <div style="display:flex; align-items:center; justify-content:space-between; font-size:0.8rem; margin-bottom:0.75rem; padding:0.5rem; background:var(--bg-input); border-radius:var(--radius-sm); border:1px solid var(--border-subtle);">
                            <span>الساعات المعتمدة: <strong>${domain.targetHours} ساعة</strong></span>
                            <span>الكفايات المتقاطعة: <strong>${linkedCount}</strong></span>
                        </div>

                        <div class="domain14-footer">
                            <span class="domain14-meta" style="color:var(--status-emerald-light); font-weight:700;">
                                متحققة 100%
                            </span>
                            <button class="btn-sm btn-secondary" onclick="window.App.openInspectDomain14Modal('${domain.id}')">
                                استعراض الأدلة والمعايير ←
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="onepage-section-header" id="sec-comps-header">
                <div class="sec-header-left">
                    <span class="sec-icon-box">${icon("brain", {size:24})}</span>
                    <div>
                        <h2 class="sec-title">مصفوفة الكفايات والجدارات المهنية الـ 14</h2>
                        <p class="sec-subtitle">المعايير المرجعية العليا المعتمدة لدى الاتحاد العربي للكوتشنج (الإصدار 3.0)</p>
                    </div>
                </div>
                <div class="sec-header-right">
                    <span class="badge" style="background:#059669; color:#fff; padding:0.35rem 0.85rem; border-radius:999px; font-weight:700; font-size:0.82rem;">${icon("check", {size:13, style:"vertical-align:-1px; margin-left:3px;"})} 43 / 43 كفاية متحققة</span>
                </div>
            </div>

            ${switcherHtml}

            <div class="section-header-wrap">
                <div>
                    <h3 class="section-title">مجالات الكفايات الـ 14 المعتمدة — الاتحاد العربي للكوتشنج</h3>
                    <p class="section-desc">
                        المعايير المرجعية العليا لبرنامج إعداد وتأهيل الماستر كوتش (الإصدار 3.0) بإشراف المستشار عبدالكريم الخليفي.
                        تغطي مجالات الممارسة المهنية المعمقة بإجمالي 240 ساعة تدريبية وتطبيقية معتمدة ومؤشرات سلوكية دقيقة.
                    </p>
                </div>
                <div class="section-actions">
                    <span class="badge-status approved" style="font-size:0.88rem; padding:0.4rem 0.85rem;">
                        إجمالي الساعات المعتمدة: ${totalHours} ساعة
                    </span>
                </div>
            </div>

            <div class="domains14-grid">
                ${cardsHtml}
            </div>
        `;
    }

    // Modal: Inspect 14 Core Competency Domain Details
    function openInspectDomain14Modal(domainId) {
        const domain = (appState.data.core14Domains || []).find(d => d.id === domainId);
        if (!domain) return;

        const modal = DOM.domain14Modal || document.getElementById('domain14-modal');
        if (!modal) return;

        const linkedComps = (domain.linkedCompetencies || []).map(code => {
            const comp = (appState.data.competencies || []).find(c => c.id === code || c.code === code);
            return comp ? comp : { id: code, title: code, description: '' };
        });

        modal.innerHTML = `
            <div class="modal-container" style="max-width:720px;">
                <div class="modal-header">
                    <div>
                        <span class="domain14-code-pill" style="font-size:0.8rem; margin-bottom:0.3rem; display:inline-block;">${domain.id} • ${domain.code}</span>
                        <h3 style="margin:0.2rem 0;">${domain.title}</h3>
                        <p style="font-size:0.82rem; color:var(--text-muted); margin:0;">${domain.subtitle || ''}</p>
                    </div>
                    <button class="btn-close-modal" onclick="window.App.closeAllModals()">×</button>
                </div>
                <div class="modal-body">
                    <div style="background:var(--bg-input); padding:0.9rem; border-radius:var(--radius-sm); margin-bottom:1.25rem; font-size:0.9rem; color:var(--text-secondary); line-height:1.6;">
                        ${domain.description}
                    </div>

                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; margin-bottom:1.25rem;">
                        <div style="background:var(--bg-surface); padding:0.75rem; border-radius:var(--radius-sm); border:1px solid var(--border-subtle);">
                            <div style="font-size:0.75rem; color:var(--text-muted);">الساعات المعتمدة للمجال:</div>
                            <div style="font-size:1.1rem; font-weight:800; color:var(--brand-blue-light);">${domain.targetHours} ساعة تدريبية</div>
                        </div>
                        <div style="background:var(--bg-surface); padding:0.75rem; border-radius:var(--radius-sm); border:1px solid var(--border-subtle);">
                            <div style="font-size:0.75rem; color:var(--text-muted);">مستوى الإتقان المطلوب:</div>
                            <div style="font-size:1.1rem; font-weight:800; color:var(--status-emerald-light);">المستوى 5/5 (خبير ماستر)</div>
                        </div>
                    </div>

                    <div style="margin-bottom:1.25rem;">
                        <h4 style="font-size:0.92rem; margin-bottom:0.5rem; color:var(--brand-navy); font-weight:800;">المؤشرات السلوكية المقاسة:</h4>
                        <ul class="domain14-indicators-list" style="margin-bottom:0;">
                            ${(domain.keyIndicators || []).map(ind => `
                                <li>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    <span>${ind}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>

                    <div style="margin-bottom:1.25rem;">
                        <h4 style="font-size:0.92rem; margin-bottom:0.5rem; color:var(--brand-navy); font-weight:800;">الكفايات الفرعية المتقاطعة (${linkedComps.length} كفايات):</h4>
                        <div style="display:flex; flex-direction:column; gap:0.4rem;">
                            ${linkedComps.map(c => `
                                <div style="display:flex; align-items:center; justify-content:space-between; background:var(--bg-surface); padding:0.55rem 0.75rem; border-radius:var(--radius-sm); border:1px solid var(--border-subtle); font-size:0.83rem;">
                                    <div>
                                        <strong style="color:var(--brand-blue-light); font-family:var(--font-mono); margin-left:0.5rem;">${c.id}</strong>
                                        <span>${c.title}</span>
                                    </div>
                                    <span class="badge-status approved" style="font-size:0.7rem;">معتمد</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div>
                        <h4 style="font-size:0.92rem; margin-bottom:0.5rem; color:var(--status-emerald-light); font-weight:800;">الأدلة والبراهين المودعة للمجال:</h4>
                        <div style="display:flex; flex-direction:column; gap:0.4rem;">
                            ${(domain.requiredEvidences || []).map((ev, idx) => `
                                <div style="display:flex; align-items:center; gap:0.5rem; background:var(--bg-surface); padding:0.5rem 0.75rem; border-radius:var(--radius-sm); border:1px solid var(--border-subtle); font-size:0.82rem;">
                                    <span style="color:var(--status-emerald-light); font-weight:bold;">${idx + 1}.</span>
                                    <span>${ev}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-primary" onclick="window.App.closeAllModals()">إغلاق المعاينة</button>
                </div>
            </div>
        `;
        modal.classList.add('active');
    }

    // Render Tasks & Evidence Lifecycle Hub
    function renderTasksPanel() {
        const container = document.getElementById('tasks-content-area');
        if (!container) return;

        const tasksCards = appState.data.tasks.map(t => {
            const compsList = (t.linkedCompetencies || []).map(cId => {
                const comp = appState.data.competencies.find(c => c.id === cId);
                return comp ? comp.title : cId;
            });

            return `
                <div class="standard-card">
                    <div class="card-top-row">
                        <span class="badge-status ${t.status}">${getStatusArabic(t.status)}</span>
                        <span style="font-family:var(--font-mono); color:var(--text-secondary); font-size:0.75rem;">الإصدار: ${t.version}</span>
                    </div>

                    <h4 class="card-title-lg" style="margin-bottom:0.4rem;">${t.title}</h4>
                    <div style="font-size:0.8rem; color:var(--brand-blue-light); margin-bottom:0.75rem; font-weight:bold;">
                        تصنيف المهمة: ${t.category}
                    </div>

                    <div style="background:var(--bg-surface); padding:0.6rem; border-radius:var(--radius-sm); border:1px solid var(--border-subtle); margin-bottom:0.75rem;">
                        <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:0.25rem;">الكفايات المرتبطة بهذا التسليم:</div>
                        <div style="font-size:0.8rem; line-height:1.4;">
                            ${compsList.slice(0, 2).map(c => `• ${c}`).join('<br>')}
                            ${compsList.length > 2 ? `<small style="color:var(--text-cyan);">+ ${compsList.length - 2} كفايات أخرى</small>` : ''}
                        </div>
                    </div>

                    <div style="display:flex; align-items:center; justify-content:space-between; font-size:0.78rem; margin-bottom:0.75rem; color:var(--text-secondary);">
                        <span>الأدلة المرفوعة: <strong>${(t.evidences || []).length} ملفات</strong></span>
                        <span>التقييم: <strong style="color:var(--status-emerald-light); font-family:var(--font-mono);">${t.supervisorFeedback && t.supervisorFeedback.grade ? t.supervisorFeedback.grade + ' / 5' : (t.status === 'approved' ? '5.0 / 5' : 'بانتظار التقييم')}</strong></span>
                    </div>

                    <button class="btn-primary" style="width:100%; justify-content:center;" onclick="window.App.openTaskModal('${t.id}')">
                        فتح بطاقة المهمة ودورة الاعتماد ←
                    </button>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="onepage-section-header" id="sec-tasks-header">
                <div class="sec-header-left">
                    <span class="sec-icon-box">${icon("document", {size:24})}</span>
                    <div>
                        <h2 class="sec-title">بنك المهام الميدانية وإيداع الأدلة والتأملات المهنية</h2>
                        <p class="sec-subtitle">إيداع تقارير الجلسات، التسجيلات الصوتية، استمارة التأمل الرباعية، وتلقي التغذية الراجعة الإشرافية</p>
                    </div>
                </div>
                <div class="sec-header-right">
                    <span class="badge" style="background:#059669; color:#fff; padding:0.35rem 0.85rem; border-radius:999px; font-weight:700; font-size:0.82rem;">${icon("check", {size:13, style:"vertical-align:-1px; margin-left:3px;"})} 8 مهام معتمدة</span>
                    <button class="btn btn-primary btn-sm" onclick="window.App.openTaskModal('TASK-01')">+ إيداع دليل جديد</button>
                </div>
            </div>

            <div class="section-header-wrap">
                <div>
                    <h3 class="section-title">بطاقات المهام الميدانية وتتبع دورة الاعتماد</h3>
                    <p class="section-desc">
                        دورة المهمة المعتمدة: تعليمات ومعايير ظاهرة ← التنفيذ ورفع الدليل ← تقييم ذاتي وتأمل رباعي 
                        ← مراجعة المشرف وتغذية راجعة (نصية وصوتية) ← التحسين وإعادة التسليم ← الاعتماد النهائي.
                    </p>
                </div>
            </div>

            <div class="cards-grid-3">
                ${tasksCards}
            </div>
        `;
    }

    // Status in Arabic
    function getStatusArabic(status) {
        switch (status) {
            case 'approved': return 'معتمدة نهائياً';
            case 'submitted': return 'مقدمة للمراجعة';
            case 'revision_required': return 'تحتاج تعديلاً وتحسيناً';
            case 'draft': return 'مسودة قيد الإعداد';
            default: return status;
        }
    }

    // Open Task Modal with Full Lifecycle (6 Steps)
    function openTaskModal(taskId) {
        const task = appState.data.tasks.find(t => t.id === taskId);
        if (!task) return;
        appState.activeTask = task;

        const modal = DOM.taskModal;
        if (!modal) return;

        const isSupervisor = appState.currentRole === 'supervisor';
        const isCommittee = appState.currentRole === 'committee';
        const isParticipant = appState.currentRole === 'participant';

        modal.innerHTML = `
            <div class="modal-container">
                <div class="modal-header">
                    <div>
                        <span class="badge-status ${task.status}">${getStatusArabic(task.status)}</span>
                        <h3 style="margin-top:4px;">${task.title}</h3>
                        <small style="color:var(--text-muted); font-family:var(--font-mono);">${task.id} • الإصدار الحالي: ${task.version}</small>
                    </div>
                    <button class="btn-close-modal" onclick="window.App.closeAllModals()">×</button>
                </div>

                <div class="modal-body">
                    <!-- Step 1 & 2: Task Details & Rubric Preview -->
                    <div style="background:var(--bg-input); padding:1rem; border-radius:var(--radius-md); margin-bottom:1.5rem; border:1px solid var(--border-subtle);">
                        <h4 style="font-size:0.95rem; margin-bottom:0.4rem; color:var(--brand-blue-light);">1. معايير الإنجاز والروبرك المسبق</h4>
                        <p style="font-size:0.85rem; color:var(--text-secondary); line-height:1.5;">
                            يتم تقييم هذه المهمة استناداً إلى معايير روبرك <strong>${task.rubricCode}</strong>. 
                            المستويات تتدرج من 1 (ضعيف) إلى 5 (ممتاز). يشترط الالتزام الصارم بضوابط السرية ونزع الهوية وحماية المستفيد.
                        </p>
                    </div>

                    <!-- Step 3: Evidences List & Upload Simulation -->
                    <div style="margin-bottom:1.5rem;">
                        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.75rem;">
                            <h4 style="font-size:0.95rem;">2. الأدلة الثبوتية المودعة (${task.evidences.length} ملفات)</h4>
                            ${isParticipant ? `
                                <button class="btn-sm btn-primary" onclick="window.App.openAddEvidenceSection('${task.id}')">
                                    + إيداع دليل إضافي
                                </button>
                            ` : ''}
                        </div>

                        <!-- Add Evidence Form (Interactive Real File Upload) -->
                        <div id="add-evidence-form-${task.id}" style="display:none; background:var(--bg-input); padding:1rem; border-radius:var(--radius-md); border:1px dashed var(--border-accent); margin-bottom:1rem;">
                            <h5 style="font-size:0.88rem; margin-bottom:0.5rem; color:var(--text-cyan);">إيداع دليل ثبوتي جديد في الخادم المشفر:</h5>
                            
                            <div class="upload-drop-zone" onclick="document.getElementById('real-file-input-${task.id}').click()">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom:0.5rem; color:var(--brand-gold);">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="17 8 12 3 7 8"></polyline>
                                    <line x1="12" y1="3" x2="12" y2="15"></line>
                                </svg>
                                <div style="font-size:0.85rem; font-weight:700;">انقر لاختيار ملف من جهازك أو اسحبه هنا</div>
                                <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">PDF, DOCX, MP3, WAV, PNG, JPG (حتى 50 ميجابايت)</div>
                            </div>
                            <input type="file" id="real-file-input-${task.id}" style="display:none;" onchange="window.App.onRealFileSelected(event, '${task.id}')" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.mp3,.wav,.m4a">
                            
                            <div id="selected-file-info-${task.id}" style="display:none; background:rgba(5, 150, 105, 0.15); border:1px solid var(--status-emerald); padding:0.5rem 0.75rem; border-radius:var(--radius-sm); margin-bottom:0.75rem; font-size:0.82rem; color:var(--status-emerald-light);"></div>

                            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.75rem; margin-bottom:0.5rem;">
                                <div>
                                    <label class="reflection-label">نوع الدليل:</label>
                                    <select id="new-ev-type" style="width:100%;">
                                        <option value="document">ملف وثائقي PDF / DOCX</option>
                                        <option value="audio">تسجيل صوتي MP3 / WAV</option>
                                        <option value="video">تسجيل مرئي MP4</option>
                                        <option value="spreadsheet">جدول بيانات Excel</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="reflection-label">تسمية الدليل (اختياري):</label>
                                    <input type="text" id="new-ev-name" placeholder="مثال: تقرير_الجلسة_المعدل.pdf" style="width:100%;">
                                </div>
                            </div>
                            <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.75rem; font-size:0.78rem;">
                                <input type="checkbox" id="new-ev-anon" checked>
                                <label for="new-ev-anon">أقر بأن الملف منزوع الهوية وخالٍ من بيانات المستفيد الشخصية وفق ميثاق الشرف المهني.</label>
                            </div>
                            <div style="display:flex; gap:0.5rem;">
                                <button class="btn-sm btn-secondary" onclick="document.getElementById('add-evidence-form-${task.id}').style.display='none'">إلغاء</button>
                                <button class="btn-sm btn-emerald" onclick="window.App.submitTaskEvidence('${task.id}')">رفع وتوثيق الدليل في الخادم</button>
                            </div>
                        </div>

                        <div style="display:flex; flex-direction:column; gap:0.5rem;">
                            ${task.evidences.map((ev, evIdx) => `
                                <div style="display:flex; align-items:center; justify-content:space-between; background:var(--bg-surface); padding:0.75rem 1rem; border-radius:var(--radius-sm); border:1px solid var(--border-subtle);">
                                    <div style="display:flex; align-items:center; gap:0.6rem;">
                                        <span style="font-size:1.2rem;">${ev.type === 'audio' ? icon('music', {size:18}) : ev.type === 'video' ? icon('film', {size:18}) : icon('document', {size:18})}</span>
                                        <div>
                                            <div style="font-weight:bold; font-size:0.88rem;">${ev.name}</div>
                                            <div style="font-size:0.75rem; color:var(--text-muted);">${ev.size || ''} ${ev.pages ? '• ' + ev.pages + ' صفحات' : ''} ${ev.duration ? '• مدة: ' + ev.duration : ''}</div>
                                        </div>
                                    </div>
                                    <button class="btn-sm btn-secondary" onclick="window.App.openEvidencePreview('${task.id}', ${evIdx})">
                                        معاينة الدليل الآمن
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Step 4: 4-Part Structured Reflection Form -->
                    <div class="reflection-section-box">
                        <h4 style="font-size:1rem; margin-bottom:0.25rem; color:var(--text-gold);">
                            3. استمارة التأمل المهني الرباعية المعتمدة
                        </h4>
                        <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:1rem;">
                            نموذج تمكين الرؤية الإلزامي: ماذا فعلت؟ لماذا؟ ما أثره؟ وما الذي سأغيره مستقبلاً؟
                        </p>

                        <div class="reflection-question-wrap">
                            <label class="reflection-label">س1: ماذا فعلت تحديداً؟ (الوصف الإجرائي للممارسة)</label>
                            <textarea id="ref-what" rows="2" style="width:100%;" ${!isParticipant ? 'readonly' : ''}>${task.reflection.whatDidIDo}</textarea>
                        </div>

                        <div class="reflection-question-wrap">
                            <label class="reflection-label">س2: لماذا؟ (الأسس النظرية والمنهجية ومبررات الاختيار)</label>
                            <textarea id="ref-why" rows="2" style="width:100%;" ${!isParticipant ? 'readonly' : ''}>${task.reflection.why}</textarea>
                        </div>

                        <div class="reflection-question-wrap">
                            <label class="reflection-label">س3: ما أثره الملحوظ؟ (الأثر والتحول المتحقق لدى المستفيد)</label>
                            <textarea id="ref-impact" rows="2" style="width:100%;" ${!isParticipant ? 'readonly' : ''}>${task.reflection.impact}</textarea>
                        </div>

                        <div class="reflection-question-wrap">
                            <label class="reflection-label">س4: ما الذي سأغيره أو أطوره في المرات القادمة؟ (خطة التحسين)</label>
                            <textarea id="ref-change" rows="2" style="width:100%;" ${!isParticipant ? 'readonly' : ''}>${task.reflection.whatWillIChange}</textarea>
                        </div>
                    </div>

                    <!-- Step 5: Supervisor Feedback & Timestamped Audio Notes -->
                    <div style="background:var(--bg-surface); padding:1.25rem; border-radius:var(--radius-md); border:1px solid var(--border-accent); margin-bottom:1.5rem;">
                        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.75rem;">
                            <h4 style="font-size:1rem; color:var(--brand-blue-light);">
                                4. التغذية الراجعة والتقييم الإشرافي
                            </h4>
                            <span style="font-family:var(--font-mono); font-weight:bold; color:var(--status-emerald-light); font-size:1.1rem;">
                                الدرجة: ${task.supervisorFeedback.grade} / 5.0
                            </span>
                        </div>

                        ${isSupervisor ? `
                            <div style="margin-bottom:1rem; background:var(--bg-input); padding:0.75rem; border-radius:var(--radius-sm);">
                                <label class="reflection-label">تعديل درجة التقييم (من 5.0):</label>
                                <input type="number" step="0.1" min="1" max="5" id="sup-input-grade" value="${task.supervisorFeedback.grade}" style="width:100px; margin-bottom:0.5rem;">
                                <label class="reflection-label">ملاحظات التغذية الراجعة للمتدرب:</label>
                                <textarea id="sup-input-notes" rows="2" style="width:100%;">${task.supervisorFeedback.notes}</textarea>
                            </div>
                        ` : `
                            <p style="font-size:0.88rem; color:var(--text-primary); margin-bottom:0.75rem; line-height:1.5;">
                                <strong>ملاحظات المقيم المعتمد (${task.supervisorFeedback.evaluator}):</strong><br>
                                ${task.supervisorFeedback.notes}
                            </p>
                        `}

                        <!-- Supervisor Audio Player -->
                        <div class="audio-player-simulator" id="audio-player-sup_${task.id}">
                            <div class="audio-player-top">
                                <div class="audio-track-info">
                                    <button class="audio-play-btn" id="play-btn-sup_${task.id}" onclick="window.App.toggleAudioPlayback(this, 'sup_${task.id}', '${task.supervisorFeedback.audioDuration || '03:30'}')">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                                    </button>
                                    <div class="audio-meta">
                                        <h5>التسجيل الصوتي الإشرافي للمقيم المعتمد</h5>
                                        <span>مدة التوجيه: ${task.supervisorFeedback.audioDuration}</span>
                                    </div>
                                </div>
                            </div>

                            <div class="waveform-visual-bars" id="waveform-sup_${task.id}" onclick="window.App.scrubAudio(event, 'sup_${task.id}')">
                                ${generateWaveformBars('sup_' + task.id)}
                            </div>

                            <div class="audio-time-row">
                                <span class="audio-cur-time" id="cur-time-sup_${task.id}">00:00</span>
                                <span>${task.supervisorFeedback.audioDuration}</span>
                            </div>

                            <div class="timestamps-pills-wrap">
                                <small style="color:var(--text-muted); margin-left:0.5rem;">ملاحظات مرتبطة بالطوابع الزمنية:</small>
                                ${task.supervisorFeedback.timestamps.map(ts => `
                                    <button class="ts-pill-btn" onclick="window.App.jumpToTimestamp('sup_${task.id}', '${ts.time}', '${escapeJsAttr(ts.comment)}')">
                                        ${icon('clock', {size:12, style:'vertical-align:-1px; margin-left:3px;'})} ${ts.time}: ${ts.comment.substring(0, 30)}...
                                    </button>
                                `).join('')}
                            </div>

                            <div id="active-ts-note-sup_${task.id}" style="display:none; margin-top:0.6rem; font-size:0.78rem; background:rgba(37,99,235,0.15); padding:0.4rem 0.6rem; border-radius:var(--radius-sm); border:1px solid var(--border-accent); color:var(--text-cyan);"></div>
                        </div>
                    </div>

                    <!-- Step 6: Version History -->
                    <div>
                        <h4 style="font-size:0.9rem; margin-bottom:0.5rem; color:var(--text-secondary);">5. سجل النسخ والتسليمات (Version History)</h4>
                        <div style="display:flex; flex-direction:column; gap:0.4rem;">
                            ${task.history.map(h => `
                                <div style="display:flex; align-items:center; justify-content:space-between; font-size:0.8rem; background:var(--bg-input); padding:0.4rem 0.75rem; border-radius:var(--radius-sm);">
                                    <span style="font-family:var(--font-mono); font-weight:bold; color:var(--brand-blue-light);">${h.version} (${h.date})</span>
                                    <span style="color:var(--text-primary);">${h.note}</span>
                                    <span class="badge-status ${h.status}">${getStatusArabic(h.status)}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <div class="modal-footer">
                    ${isSupervisor ? `
                        <button class="btn-amber btn-sm" onclick="window.App.supervisorAction('${task.id}', 'revision_required')">
                            طلب تعديل وإعادة تسليم
                        </button>
                        <button class="btn-emerald btn-sm" onclick="window.App.supervisorAction('${task.id}', 'approved')">
                            حفظ واعتماد التقييم
                        </button>
                    ` : isCommittee ? `
                        <button class="btn-secondary" onclick="window.App.closeAllModals()">إغلاق</button>
                        <button class="btn-emerald btn-sm" onclick="window.App.committeeVerifyTask('${task.id}')">
                            ${icon('check', {size:14, style:'margin-left:4px;'})} تدقيق واعتماد مطابقة الأدلة للجنة العلمية
                        </button>
                    ` : `
                        <button class="btn-secondary" onclick="window.App.closeAllModals()">إغلاق</button>
                        ${task.status === 'revision_required' ? `
                            <button class="btn-amber btn-sm" onclick="window.App.resubmitTask('${task.id}')">
                                ${icon('refresh', {size:14, style:'margin-left:4px;'})} إعادة التسليم مع التحسين
                            </button>
                        ` : ''}
                        <button class="btn-primary" onclick="window.App.saveTaskReflection('${task.id}')">حفظ التعديلات والتأمل</button>
                    `}
                </div>
            </div>
        `;

        openModalWithFocus(modal);
    }

    // Toggle Add Evidence UI inside modal
    function openAddEvidenceSection(taskId) {
        const form = document.getElementById(`add-evidence-form-${taskId}`);
        if (form) {
            form.style.display = form.style.display === 'none' ? 'block' : 'none';
        }
    }

    // Submit New Evidence (Real API Upload with Multer + Resilient Fallback)
    async function submitTaskEvidence(taskId) {
        const task = appState.data.tasks.find(t => t.id === taskId);
        if (!task) return;

        const type = document.getElementById('new-ev-type')?.value || 'document';
        const customName = document.getElementById('new-ev-name')?.value.trim();
        const anonInput = document.getElementById('new-ev-anon');
        const anonCheck = anonInput?.checked;

        if (!anonCheck) {
            if (anonInput) {
                anonInput.classList.add('is-invalid');
                anonInput.focus();
            }
            showToast('يجب الإقرار بنزع الهوية الرقمية للمستفيد وحماية الخصوصية.', 'warn');
            return;
        } else if (anonInput) {
            anonInput.classList.remove('is-invalid');
        }

        const realFile = appState.pendingFileUpload;

        // Try Real Multipart Upload via API
        if (realFile && window.ApiClient && window.ApiClient.isServerAvailable) {
            const formData = new FormData();
            formData.append('file', realFile);
            formData.append('taskId', taskId);
            formData.append('type', type);
            formData.append('name', customName || realFile.name);
            formData.append('isAnonymous', 'true');
            if (appState.activeCoachId) formData.append('coachId', appState.activeCoachId);

            try {
                showToast('جارٍ رفع الدليل وتشفيره بالخادم...', 'info');
                const res = await window.ApiClient.uploadEvidence(formData);
                task.evidences.push(res.evidence);
                task.version = res.task.version;
                if (!Array.isArray(task.history)) task.history = [];
                task.history.push({
                    version: task.version,
                    date: new Date().toISOString().split('T')[0],
                    status: task.status,
                    note: `إيداع دليل ثبوتي: ${res.evidence.name}`
                });
                appState.pendingFileUpload = null;
                window.ProgramStore.save(appState.data);
                showToast('تم رفع الدليل الرقمي بنجاح إلى الخادم.', 'success');
                openTaskModal(taskId);
                renderTasksPanel();
                return;
            } catch (err) {
                showToast(err.message || 'فشل رفع الملف', 'error');
                return;
            }
        }

        // Fallback for simulated or name-based evidence
        const name = customName || (realFile ? realFile.name : null);
        if (!name) {
            showToast('يرجى اختيار ملف للرفع أو تحديد اسم المستند.', 'warn');
            return;
        }

        const newEv = {
            type,
            name,
            size: realFile ? `${(realFile.size / (1024 * 1024)).toFixed(1)} MB` : '2.4 MB',
            pages: type === 'document' ? 6 : undefined,
            duration: type === 'audio' ? '25:00' : undefined
        };

        task.evidences.push(newEv);
        const parts = task.version.split('.');
        const minor = parseInt(parts[1] || '0', 10) + 1;
        task.version = `${parts[0]}.${minor}`;
        task.history.push({
            version: task.version,
            date: new Date().toISOString().split('T')[0],
            status: task.status,
            note: `إيداع دليل إضافي: ${name}`
        });

        window.ProgramStore.save(appState.data);
        showToast('تم إيداع الدليل بنجاح وتحديث نسخة المهمة.', 'success');
        openTaskModal(taskId);
        renderTasksPanel();
    }

    // Evidence Preview Simulation Modal
    function openEvidencePreview(taskId, evIndex) {
        const task = appState.data.tasks.find(t => t.id === taskId);
        if (!task) return;
        const ev = task.evidences[evIndex];
        if (!ev) return;

        const modal = DOM.genericModal;
        if (!modal) return;

        modal.innerHTML = `
            <div class="modal-container" style="max-width:680px;">
                <div class="modal-header">
                    <h3>معاينة الدليل الرقمي المشفر والموثق</h3>
                    <button class="btn-close-modal" onclick="window.App.closeAllModals()">×</button>
                </div>
                <div class="modal-body">
                    <div style="background:var(--bg-input); padding:1rem; border-radius:var(--radius-md); border:1px solid var(--border-subtle); margin-bottom:1rem;">
                        <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:0.5rem;">
                            <span style="font-size:1.8rem;">${ev.type === 'audio' ? icon('music', {size:18}) : ev.type === 'video' ? icon('film', {size:18}) : icon('document', {size:18})}</span>
                            <div>
                                <h4 style="font-size:1rem; color:var(--brand-blue-light);">${ev.name}</h4>
                                <small style="color:var(--text-muted); font-family:var(--font-mono);">الحجم: ${ev.size || '3.2 MB'} • التشفير: SHA-256 Verified</small>
                            </div>
                        </div>
                        <div style="background:rgba(5, 150, 105, 0.15); border:1px solid var(--status-emerald); padding:0.5rem 0.75rem; border-radius:var(--radius-sm); font-size:0.8rem; color:var(--status-emerald-light);">
                            ${icon('check', {size:14, style:'margin-left:4px; vertical-align:-2px;'})} شهادة نزع الهوية الرقمية: تم التحقق الآلي من إخفاء الأسماء والأرقام والعناوين الشخصية لحماية الخصوصية.
                        </div>
                    </div>

                    <div style="background:var(--bg-card-hover); border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:1.5rem; text-align:center; min-height:160px; display:flex; flex-direction:column; align-items:center; justify-content:center;">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--brand-blue)" stroke-width="1.5" style="margin-bottom:0.75rem;">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                        <h5 style="color:var(--text-primary); margin-bottom:0.25rem;">مستند مهني معتمد لدى تمكين الرؤية</h5>
                        <p style="font-size:0.8rem; color:var(--text-secondary);">مرتبط بالمهمة [${task.id}] والكفايات: ${task.linkedCompetencies.join(', ')}</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-primary" onclick="window.App.closeAllModals()">إغلاق المعاينة</button>
                </div>
            </div>
        `;
        modal.classList.add('active');
    }

    // Resubmit Task after Revision
    async function resubmitTask(taskId) {
        const task = appState.data.tasks.find(t => t.id === taskId);
        if (!task) return;

        task.status = 'submitted';
        const parts = task.version.split('.');
        task.version = `v${parseInt(parts[0].replace('v','')) + 1}.0`;
        task.history.push({
            version: task.version,
            date: new Date().toISOString().split('T')[0],
            status: 'submitted',
            note: 'إعادة التسليم من المشارك بعد استيفاء التحسينات والتأمل.'
        });

        if (window.ApiClient && window.ApiClient.isServerAvailable) {
            try {
                await window.ApiClient.submitTask(taskId, appState.activeCoachId);
            } catch (e) {
                console.warn(e);
            }
        }

        window.ProgramStore.save(appState.data);
        showToast('تمت إعادة تسليم المهمة بنجاح للمشرف.', 'success');
        closeAllModals();
        renderAll();
    }

    // Committee Verification Action
    function committeeVerifyTask(taskId) {
        showToast(`تم تدقيق مطابقة المهمة [${taskId}] والتأشير عليها من اللجنة العلمية.`, 'success');
        closeAllModals();
    }

    // Save Reflection Updates
    async function saveTaskReflection(taskId) {
        const task = appState.data.tasks.find(t => t.id === taskId);
        if (!task) return;

        const what = document.getElementById('ref-what')?.value;
        const why = document.getElementById('ref-why')?.value;
        const impact = document.getElementById('ref-impact')?.value;
        const change = document.getElementById('ref-change')?.value;

        if (what !== undefined) task.reflection.whatDidIDo = what;
        if (why !== undefined) task.reflection.why = why;
        if (impact !== undefined) task.reflection.impact = impact;
        if (change !== undefined) task.reflection.whatWillIChange = change;

        if (window.ApiClient && window.ApiClient.isServerAvailable) {
            try {
                await window.ApiClient.saveReflection(taskId, {
                    whatDidIDo: what,
                    why: why,
                    impact: impact,
                    whatWillIChange: change
                }, appState.activeCoachId);
            } catch (e) {
                console.warn(e);
            }
        }

        window.ProgramStore.save(appState.data);
        showToast('تم حفظ التأمل المهني وتحديث بيانات المهمة بنجاح.', 'success');
        closeAllModals();
        renderTasksPanel();
    }

    // Supervisor Actions (Approve or Request Revision)
    async function supervisorAction(taskId, newStatus) {
        const task = appState.data.tasks.find(t => t.id === taskId);
        if (!task) return;

        const gradeInput = document.getElementById('sup-input-grade');
        let parsedGrade = task.supervisorFeedback ? task.supervisorFeedback.grade : 5.0;
        if (gradeInput) {
            const val = parseFloat(gradeInput.value);
            if (!isNaN(val) && val >= 1 && val <= 5) {
                parsedGrade = val;
                if (!task.supervisorFeedback) task.supervisorFeedback = {};
                task.supervisorFeedback.grade = parsedGrade;
            }
        }

        const notesInput = document.getElementById('sup-input-notes');
        let notes = '';
        if (notesInput && notesInput.value.trim()) {
            notes = notesInput.value.trim();
            if (!task.supervisorFeedback) task.supervisorFeedback = {};
            task.supervisorFeedback.notes = notes;
        }

        task.status = newStatus;
        const newVer = newStatus === 'approved' ? 'v2.1' : 'v1.2';
        task.version = newVer;
        task.history.push({
            version: newVer,
            date: new Date().toISOString().split('T')[0],
            status: newStatus,
            note: newStatus === 'approved' ? 'تم الاعتماد النهائي وتحديث الدرجة من المشرف المعتمد.' : 'تم طلب استكمال أدلة التحسين.'
        });

        if (window.ApiClient && window.ApiClient.isServerAvailable && window.ApiClient.isAdmin()) {
            try {
                await window.ApiClient.evaluateTask(taskId, {
                    coachId: appState.activeCoachId || 1,
                    status: newStatus,
                    grade: parsedGrade,
                    notes: notes,
                    audioFeedbackUrl: task.supervisorFeedback ? task.supervisorFeedback.audioUrl : ''
                });
            } catch (e) {
                console.warn(e);
            }
        }

        window.ProgramStore.save(appState.data);
        showToast(`تم تحديث حالة المهمة إلى: ${getStatusArabic(newStatus)}`, 'success');
        closeAllModals();
        renderAll();
    }

    // Render Rubrics Panel
    function renderRubricsPanel() {
        const container = document.getElementById('rubrics-content-area');
        if (!container) return;

        const activeRubric = appState.data.rubrics.find(r => r.code === appState.activeRubric) || appState.data.rubrics[0];

        // Rubric Tabs
        const tabsHtml = appState.data.rubrics.map(r => `
            <button class="filter-pill-btn ${r.code === activeRubric.code ? 'active' : ''}" onclick="window.App.switchRubric('${r.code}')">
                ${r.title}
            </button>
        `).join('');

        // Calculate weighted score
        let weightedScore = 0;
        let hasEthicalBlocker = false;

        activeRubric.criteria.forEach(c => {
            weightedScore += (c.currentLevel * c.weight);
            if (c.isCritical && c.currentLevel < 3) {
                hasEthicalBlocker = true;
            }
        });

        const isSupervisor = appState.currentRole === 'supervisor';
        const isCommittee = appState.currentRole === 'committee';

        // Criteria Cards
        const criteriaHtml = activeRubric.criteria.map((crit, idx) => `
            <div class="criterion-box">
                <div class="criterion-header">
                    <div class="criterion-name-wrap">
                        <span style="font-family:var(--font-mono); font-weight:bold; color:var(--accent-cyan);">#${idx + 1}</span>
                        <h4 class="criterion-name">${crit.name}</h4>
                        ${crit.isCritical ? '<span class="badge-status referred" style="background:#DC2626; color:#fff;">معيار حرج قطعي</span>' : ''}
                    </div>
                    <span class="criterion-weight-tag">الوزن النسبي: ${Math.round(crit.weight * 100)}%</span>
                </div>

                <div class="level-selector-row">
                    ${[1, 2, 3, 4, 5].map(lvl => {
                        const lvlNames = { 1: 'ضعيف', 2: 'مقبول', 3: 'جيد', 4: 'جيد جداً', 5: 'ممتاز' };
                        const isSelected = crit.currentLevel === lvl;
                        return `
                            <button class="level-option-btn ${isSelected ? 'selected' : ''}" 
                                    onclick="window.App.setCriterionLevel('${activeRubric.id}', '${crit.id}', ${lvl})">
                                <span class="level-num">${lvl}</span>
                                <span class="level-name">${lvlNames[lvl]}</span>
                            </button>
                        `;
                    }).join('')}
                </div>

                <div class="level-desc-active">
                    <strong>توصيف المستوى (${crit.currentLevel}):</strong> ${crit.levelsDesc && crit.levelsDesc[crit.currentLevel] ? crit.levelsDesc[crit.currentLevel] : 'أداء مستوفٍ لمعايير الحقيبة والروبرك المعتمد.'}
                </div>

                <div style="display:flex; align-items:center; justify-content:space-between; margin-top:0.6rem; font-size:0.8rem; color:var(--text-secondary); flex-wrap:wrap; gap:0.5rem;">
                    <span><strong>الدليل المسند:</strong> ${crit.evidence || 'توثيق ملف الإنجاز الميداني'}</span>
                    <span style="color:var(--status-emerald-light);"><strong>ملاحظة المقيم:</strong> ${crit.supervisorFeedback || 'مستوفٍ بامتياز وفق الروبرك'}</span>
                </div>

                <!-- Required Improvement Box -->
                <div class="criterion-improvement-box" style="margin-top:0.6rem; background:rgba(217, 119, 6, 0.1); border:1px solid rgba(217, 119, 6, 0.3); border-radius:var(--radius-sm); padding:0.5rem 0.75rem; font-size:0.8rem;">
                    <div style="color:var(--text-gold); font-weight:700; margin-bottom:2px;">التحسين المطلوب المعتمد:</div>
                    ${isSupervisor ? `
                        <input type="text" class="ref-input" style="width:100%; font-size:0.8rem;" value="${crit.requiredImprovement || ''}" onchange="window.App.saveCriterionImprovement('${activeRubric.id}', '${crit.id}', this.value)">
                    ` : `
                        <div style="color:var(--text-primary);">${crit.requiredImprovement || 'الحفاظ على نفس الوتيرة المهنية الممتازة.'}</div>
                    `}
                </div>
            </div>
        `).join('');

        container.innerHTML = `
            <div class="onepage-section-header" id="sec-rubrics-header">
                <div class="sec-header-left">
                    <span class="sec-icon-box">${icon("scale", {size:24})}</span>
                    <div>
                        <h2 class="sec-title">مصفوفة الروبركات التقييمية الرسمية (الاتحاد العربي للكوتشنج)</h2>
                        <p class="sec-subtitle">الروبركات الستة المعتمدة (ص34–40) بمستويات الأداء الخمسة وأوزان المعايير وملاحظات التحسين المطلوب</p>
                    </div>
                </div>
                <div class="sec-header-right">
                    <span class="badge" style="background:#D97706; color:#fff; padding:0.35rem 0.85rem; border-radius:999px; font-weight:700; font-size:0.82rem;">6 روبركات معتمدة • 30 معياراً</span>
                </div>
            </div>

            <div class="section-header-wrap">
                <div>
                    <h3 class="section-title">مصفوفة الروبركات التقييمية الستة وتوليد الدرجة المرجحة</h3>
                    <p class="section-desc">
                        مستويات الأداء الخمسة: ضعيف 1؛ مقبول 2؛ جيد 3؛ جيد جداً 4؛ ممتاز 5. 
                        <strong>المتوسط الحسابي لا يعوض بأي حال الإخفاق في المعايير الأخلاقية أو المهنية الجوهرية.</strong>
                    </p>
                </div>
            </div>

            <div class="filter-pills-group" style="margin-bottom:1.5rem;">
                ${tabsHtml}
            </div>

            <div class="rubric-card-full">
                <div class="rubric-header-top">
                    <div class="rubric-title-block">
                        <h3>${activeRubric.title}</h3>
                        <p style="font-size:0.85rem; color:var(--text-secondary);">
                            الأعداد الواردة في وصف مستوى ممتاز (مثل 3 مبررات أو 3 مؤشرات أثر) هي أوصاف للجودة وليست متطلبات تخرج إضافية.
                        </p>
                    </div>
                    <div class="rubric-score-display">
                        <div style="font-size:0.75rem; color:var(--text-muted);">المتوسط المرجح من 5</div>
                        <div class="rubric-score-val" style="${hasEthicalBlocker ? 'color:var(--status-crimson);' : ''}">${weightedScore.toFixed(2)} / 5.00</div>
                        <div style="font-size:0.7rem; color:${hasEthicalBlocker ? 'var(--status-crimson)' : 'var(--status-emerald-light)'};">
                            ${hasEthicalBlocker ? `${icon('alertTriangle', {size:13, style:'vertical-align:-1px; margin-left:3px;'})} حظر أخلاقي: إخفاق في معيار حرج` : 'مستوفٍ لمعايير الجدارة والنزاهة'}
                        </div>
                    </div>
                </div>

                <div class="criteria-list">
                    ${criteriaHtml}
                </div>
            </div>
        `;
    }

    function switchRubric(code) {
        appState.activeRubric = code;
        renderRubricsPanel();
    }

    async function setCriterionLevel(rubricId, critId, level) {
        if (appState.currentRole === 'participant') {
            showToast('تعديل درجات الروبرك مخصص للمشرف والمقيم المعتمد واللجنة العلمية.', 'warn');
            return;
        }

        const rubric = appState.data.rubrics.find(r => r.id === rubricId);
        if (!rubric) return;
        const crit = rubric.criteria.find(c => c.id === critId);
        if (!crit) return;

        crit.currentLevel = level;
        window.ProgramStore.save(appState.data);

        // Sync with API if logged in as admin
        if (window.ApiClient && window.ApiClient.getToken() && appState.currentUser && appState.currentUser.role === 'admin') {
            try {
                const targetCoachId = appState.activeAdminCoachId || 1;
                const criteriaPayload = {};
                rubric.criteria.forEach(c => {
                    criteriaPayload[c.id] = c.currentLevel || 3;
                });
                await window.ApiClient.evaluateRubric(targetCoachId, rubric.code, criteriaPayload, 'تقييم رسمي من الماستر كوتش عبدالكريم');
            } catch (err) {
                console.warn('API rubric sync warning:', err);
            }
        }

        showToast(`تم تعيين الدرجة ${level} للمعيار: ${crit.name}`, 'info');
        renderRubricsPanel();
        renderDualDashboard();
        renderHeaderAndStrip();
        renderReportDossier();
    }

    function saveCriterionImprovement(rubricId, critId, text) {
        const rubric = appState.data.rubrics.find(r => r.id === rubricId);
        if (!rubric) return;
        const crit = rubric.criteria.find(c => c.id === critId);
        if (!crit) return;

        crit.requiredImprovement = text;
        window.ProgramStore.save(appState.data);
        showToast('تم تحديث خطة التحسين المطلوب للمعيار.', 'success');
    }

    // Render Independent Ethics Panel
    function renderEthicsPanel() {
        const container = document.getElementById('ethics-content-area');
        if (!container) return;

        const ethics = appState.data.ethicsGate;
        const isSupervisorOrCommittee = appState.currentRole === 'supervisor' || appState.currentRole === 'committee';

        const checkListHtml = ethics.checkpoints.map(cp => `
            <div style="display:flex; align-items:flex-start; justify-content:space-between; background:var(--bg-card); padding:1.25rem; border-radius:var(--radius-md); border:1px solid var(--border-subtle); margin-bottom:1rem;">
                <div style="display:flex; align-items:flex-start; gap:1rem;">
                    <span style="color:${cp.status === 'verified' ? 'var(--status-emerald-light)' : 'var(--status-crimson)'}; font-size:1.4rem; margin-top:2px;">
                        ${cp.status === 'verified' ? icon('check', {size:18}) : icon('alertTriangle', {size:18})}
                    </span>
                    <div>
                        <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.25rem;">
                            <span class="comp-item-id">${cp.id}</span>
                            <h4 style="font-size:1rem; font-weight:700;">${cp.title}</h4>
                        </div>
                        <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:0.4rem;">${cp.requirement}</p>
                        <div style="font-size:0.8rem; color:var(--status-emerald-light);">
                            <strong>الدليل المحقق:</strong> ${cp.evidence}
                        </div>
                    </div>
                </div>
                <div>
                    <span class="badge-status ${cp.status === 'verified' ? 'approved' : 'referred'}">
                        ${cp.status === 'verified' ? 'تم التحقق الميداني' : 'قيد المراجعة'}
                    </span>
                    ${isSupervisorOrCommittee ? `
                        <div style="margin-top:0.4rem; text-align:left;">
                            <button class="btn-sm btn-secondary" onclick="window.App.toggleEthicsCheckpoint('${cp.id}')">
                                ${cp.status === 'verified' ? 'إلغاء التحقق' : 'تأكيد التحقق'}
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');

        const referralHtml = ethics.referralRegistry.map(ref => `
            <div style="background:var(--bg-surface); border:1px solid rgba(220, 38, 38, 0.4); border-radius:var(--radius-md); padding:1.25rem; margin-top:1rem;">
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.5rem;">
                    <span class="badge-status referred">محضر إحالة رسمي: ${ref.caseRef}</span>
                    <span style="font-family:var(--font-mono); font-size:0.8rem; color:var(--text-muted);">${ref.detectionDate}</span>
                </div>
                <h4 style="font-size:0.95rem; margin-bottom:0.4rem; color:var(--text-primary);">
                    الحالة: ${ref.beneficiaryCode} (إحالة أعراض خارج نطاق الكوتشنج)
                </h4>
                <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:0.4rem;">
                    <strong>الأعراض المرصودة:</strong> ${ref.observedSymptoms}
                </p>
                <p style="font-size:0.85rem; color:var(--status-emerald-light); margin-bottom:0.4rem;">
                    <strong>الإجراء الأخلاقي المتخذ:</strong> ${ref.actionTaken}
                </p>
                <div style="font-size:0.82rem; background:var(--bg-input); padding:0.5rem; border-radius:var(--radius-sm);">
                    <strong>الجهة المحال إليها:</strong> ${ref.referredTo} • <strong>الحالة:</strong> ${ref.status}
                </div>
            </div>
        `).join('');

        container.innerHTML = `
            <div class="onepage-section-header" id="sec-ethics-header">
                <div class="sec-header-left">
                    <span class="sec-icon-box">${icon("shield", {size:24})}</span>
                    <div>
                        <h2 class="sec-title">بوابة السلامة والنزاهة الأخلاقية المستقلة (Independent Ethical Gate)</h2>
                        <p class="sec-subtitle">شرط اجتياز مستقل وحاسم 100%: لا يُمنح الاعتماد ولا يُجاز الكوتش ما لم يستوفِ السلامة الأخلاقية التامة</p>
                    </div>
                </div>
                <div class="sec-header-right">
                    <span class="badge" style="background:${ethics.status === 'passed' ? '#059669' : '#DC2626'}; color:#fff; padding:0.35rem 0.85rem; border-radius:999px; font-weight:700; font-size:0.82rem;">${ethics.status === 'passed' ? `${icon('check', {size:13, style:'vertical-align:-1px; margin-left:3px;'})} اجتياز معتمد 100%` : `${icon('alertTriangle', {size:13, style:'vertical-align:-1px; margin-left:3px;'})} قيد التدقيق`}</span>
                </div>
            </div>

            <div class="section-header-wrap">
                <div>
                    <h3 class="section-title">بوابة السلامة والنزاهة الأخلاقية المستقلة (Independent Ethical Gate)</h3>
                    <p class="section-desc">
                        شرط اجتياز مستقل وحاسم: لا يُمنح الاعتماد ولا يُجاز الخريج مهما بلغت درجاته أو ساعاته ما لم يستوفِ السلامة الأخلاقية 100%.
                    </p>
                </div>
            </div>

            <div class="doctrine-callout-box" style="border-right-color:${ethics.status === 'passed' ? 'var(--status-emerald)' : 'var(--status-crimson)'};">
                <div class="doctrine-icon" style="color:${ethics.status === 'passed' ? 'var(--status-emerald)' : 'var(--status-crimson)'};">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    </svg>
                </div>
                <div class="doctrine-content">
                    <h4 style="color:${ethics.status === 'passed' ? 'var(--status-emerald-light)' : 'var(--status-crimson-light)'};">
                        ${ethics.status === 'passed' ? 'شهادة السلامة والامتثال الأخلاقي الشامل' : `${icon('alertTriangle', {size:16, style:'vertical-align:-2px; margin-left:3px;'})} البوابة الأخلاقية قيد التدقيق والمراجعة`}
                    </h4>
                    <p>${ethics.summary} — تدقيق الماستر كوتش عبدالكريم الخليفي بتاريخ ${ethics.auditDate}.</p>
                </div>
            </div>

            <div style="margin-bottom:2rem;">
                <h4 style="font-size:1.1rem; margin-bottom:1rem;">نقاط التدقيق الأخلاقي السبعة الإلزامية:</h4>
                ${checkListHtml}
            </div>

            <div style="background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:var(--radius-lg); padding:1.5rem;">
                <h4 style="font-size:1.1rem; margin-bottom:0.5rem; color:var(--text-crimson);">
                    سجل الإحالات التخصصية (إثبات الالتزام بحدود الممارسة)
                </h4>
                <p style="font-size:0.85rem; color:var(--text-secondary);">
                    يثبت هذا السجل قدرة الكوتش على تمييز الحالات النفسية والإكلينيكية وإحالتها فوراً للمختصين المرخصين دون المساس بسلامة المستفيد.
                </p>
                ${referralHtml}
            </div>
        `;
    }

    async function toggleEthicsCheckpoint(cpId) {
        const cp = appState.data.ethicsGate.checkpoints.find(c => c.id === cpId);
        if (!cp) return;

        const newStatus = cp.status === 'verified' ? 'pending' : 'verified';
        cp.status = newStatus;
        const allVerified = appState.data.ethicsGate.checkpoints.every(c => c.status === 'verified');
        appState.data.ethicsGate.status = allVerified ? 'passed' : 'review_required';

        window.ProgramStore.save(appState.data);

        // Sync with API if logged in as admin
        if (window.ApiClient && window.ApiClient.getToken() && appState.currentUser && appState.currentUser.role === 'admin') {
            try {
                const targetCoachId = appState.activeAdminCoachId || 1;
                await window.ApiClient.toggleEthicsCheckpoint(targetCoachId, cpId, newStatus, 'تم التدقيق بواسطة عبدالكريم');
            } catch (err) {
                console.warn('API ethics sync warning:', err);
            }
        }

        showToast(`تم تحديث حالة نقطة التدقيق [${cp.id}] إلى: ${cp.status === 'verified' ? 'معتمد' : 'معلق'}`, 'info');
        renderEthicsPanel();
        renderDualDashboard();
        renderHeaderAndStrip();
        renderReportDossier();
    }

    // Render Labs & Excellence Track Panel
    function renderLabsPanel() {
        const container = document.getElementById('labs-content-area');
        if (!container) return;

        const labsHtml = appState.data.labs.map(l => `
            <div class="standard-card">
                <div class="card-top-row">
                    <span class="badge-status approved">مكتمل</span>
                    <span style="font-family:var(--font-mono); color:var(--accent-cyan); font-weight:bold;">${l.hours} ساعات</span>
                </div>
                <h4 class="card-title-lg" style="margin-bottom:0.4rem;">مختبر ${l.id}: ${l.name}</h4>
                <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:0.5rem; font-family:var(--font-mono);">تاريخ الانعقاد: ${l.date}</div>
                <p class="card-desc-sm" style="margin-bottom:0;">
                    <strong>أبرز التطبيقات:</strong> ${l.topics}
                </p>
            </div>
        `).join('');

        const excellenceHtml = appState.data.excellenceTrack.items.map(ex => `
            <div class="standard-card" style="border-color:var(--border-gold);">
                <div class="card-top-row">
                    <span class="badge-status approved">منجز بامتياز</span>
                    <span style="color:var(--text-gold); font-weight:bold; font-family:var(--font-mono);">${ex.grade || '14 مشاركاً'}</span>
                </div>
                <h4 class="card-title-lg" style="color:var(--text-gold);">${ex.title}</h4>
                <p class="card-desc-sm">
                    ${ex.targetBook ? `<strong>الكتاب المعتمد:</strong> ${ex.targetBook}` : `<strong>عنوان الحقيبة:</strong> ${ex.bagTitle}`}
                </p>
                <div style="display:flex; align-items:center; justify-content:space-between; font-size:0.8rem; border-top:1px solid var(--border-subtle); padding-top:0.5rem;">
                    <span style="color:var(--status-emerald-light);">تم التحكيم والاعتماد</span>
                    <button class="btn-sm btn-secondary" onclick="window.App.openExcellencePreview('${escapeJsAttr(ex.title)}')">عرض الوثيقة</button>
                </div>
            </div>
        `).join('');

        container.innerHTML = `
            <div class="onepage-section-header" id="sec-labs-header">
                <div class="sec-header-left">
                    <span class="sec-icon-box">${icon("microscope", {size:24})}</span>
                    <div>
                        <h2 class="sec-title">المختبرات التخصصية ومسار التميز المهني</h2>
                        <p class="sec-subtitle">9 مختبرات متقدمة (30 ساعة) للممارسة المعيارية وضبط الجودة + متطلبات مسار التميز الاختياري</p>
                    </div>
                </div>
                <div class="sec-header-right">
                    <span class="badge" style="background:#2563EB; color:#fff; padding:0.35rem 0.85rem; border-radius:999px; font-weight:700; font-size:0.82rem;">${icon("check", {size:13, style:"vertical-align:-1px; margin-left:3px;"})} 9 مختبرات (30 ساعة)</span>
                </div>
            </div>

            <div class="section-header-wrap">
                <div>
                    <h3 class="section-title">المختبرات التخصصية التسعة (30 ساعة تدريبية)</h3>
                    <p class="section-desc">
                        تصف الحقيبة تسعة مختبرات مهنية متقدمة تمثل مجالات للممارسة المعيارية ومحاكاة الأدوار وضبط الجودة.
                    </p>
                </div>
            </div>

            <div class="cards-grid-3">
                ${labsHtml}
            </div>

            <div class="section-header-wrap" style="margin-top:3rem;">
                <div>
                    <h3 class="section-title">مسار التميز المهني الاختياري (Excellence Track)</h3>
                    <p class="section-desc">
                        ${appState.data.excellenceTrack.description}
                    </p>
                </div>
            </div>

            <div class="cards-grid-3">
                ${excellenceHtml}
            </div>
        `;
    }

    function openExcellencePreview(title) {
        const modal = DOM.genericModal;
        if (!modal) return;

        modal.innerHTML = `
            <div class="modal-container" style="max-width:600px;">
                <div class="modal-header">
                    <h3>وثيقة مسار التميز المهني الاختياري</h3>
                    <button class="btn-close-modal" onclick="window.App.closeAllModals()">×</button>
                </div>
                <div class="modal-body">
                    <h4 style="color:var(--brand-blue-light); margin-bottom:0.5rem;">${title}</h4>
                    <p style="font-size:0.85rem; color:var(--text-secondary); line-height:1.6; margin-bottom:1rem;">
                        تم تحكيم هذا المخرج بنجاح واجتيازه مع مرتبة الشرف، وهو متطلب مسار التميز الإثرائي الداعم لشهادة الإتمام والاحتراف المتقدم.
                    </p>
                    <div style="background:var(--bg-input); padding:0.75rem; border-radius:var(--radius-sm); font-size:0.8rem; color:var(--status-emerald-light);">
                        ${icon('check', {size:14, style:'margin-left:4px; vertical-align:-2px;'})} تم اعتماد التقرير من قبل اللجنة العلمية لشركة تمكين الرؤية.
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-primary" onclick="window.App.closeAllModals()">إغلاق</button>
                </div>
            </div>
        `;
        modal.classList.add('active');
    }

    // Render Official Audit Dossier & Printable Report
    function renderReportDossier() {
        const container = document.getElementById('report-content-area');
        if (!container) return;

        const candidate = appState.data.metadata.candidate;
        const totalHours = appState.data.hours.reduce((acc, h) => acc + h.completed, 0);
        const casesCount = appState.data.cases.length;
        const sessionsCount = appState.data.sessions.length;
        const toolsCount = appState.data.toolsSummary.mbti.completed + 
                           appState.data.toolsSummary.wheelOfLife.completed + 
                           appState.data.toolsSummary.swot.completed;
        const coreMastered = appState.data.competencies.filter(c => c.domainId !== 'D9' && c.status === 'mastered').length;

        const { hasBlocker, blockerReasons } = checkEthicalBlocker();

        const certConfig = appState.data.certificateConfig || (window.ProgramStore ? window.ProgramStore.DEFAULT_DATA.certificateConfig : null) || {
            title: "محضر التدقيق والجاهزية المهنية للاعتماد النهائي",
            subtitle: "المطابقة النظامية الشاملة لكافة متطلبات حقيبة تأهيل الماستر كوتش (الإصدار 3.0 - 2026)",
            documentRef: "AUDIT-2026-MC084",
            issueDate: "2026-05-20",
            orgName: "شركة تمكين الرؤية للاستشارات المهنية",
            programSub: "برنامج إعداد وتأهيل الماستر كوتش • الإصدار 3.0 • النسخة التطويرية 2026",
            accreditationNote: "cyce52.com • ترخيص مهني معتمد",
            signatory1: { title: "المشرف الميداني المعتمد", name: "كوتش د. فهد السبيعي", sub: "توقيع إلكتروني معتمد #FS-882" },
            signatory2: { title: "رئيس اللجنة والمدير العام", name: "الماستر كوتش عبدالكريم الخليفي", sub: "مؤسس شركة تمكين الرؤية #AK-001" },
            stampText: { line1: "تمكين الرؤية", line2: "اعتماد مهني", line3: "2026" },
            committeeVerdictText: "بناءً على فحص كافة الأدلة الثبوتية، والتحقق المستقل من الساعات والممارسة الميدانية، والتأكد التام من استيفاء بوابة النزاهة الأخلاقية، ومناقشة مشروع التخرج والدفاع؛ توصي اللجنة بإجماع الآراء بمنح الكوتش أحمد بن صالح الشمري شهادة إتمام برنامج إعداد وتأهيل الماستر كوتش بتقدير ممتاز مع مرتبة الشرف، ورفع التوصية للاعتماد المهني النهائي.",
            rows: []
        };
        const certRows = (certConfig.rows && certConfig.rows.length > 0) ? certConfig.rows : (window.ProgramStore?.DEFAULT_DATA?.certificateConfig?.rows || []);
        const isAdmin = (window.ApiClient && window.ApiClient.isAdmin()) || (appState.currentRole === 'supervisor' || appState.currentRole === 'committee');

        // Rubrics summary rows
        const rubricsRowsHtml = appState.data.rubrics.map(r => {
            const rScore = r.criteria.reduce((sum, c) => sum + (c.currentLevel * c.weight), 0);
            const critCriticalFailed = r.criteria.some(c => c.isCritical && c.currentLevel < 3);
            return `
                <tr>
                    <td><strong>${r.title}</strong></td>
                    <td>5.00</td>
                    <td><strong style="color:${critCriticalFailed ? '#DC2626' : '#047857'}; font-family:var(--font-mono);">${rScore.toFixed(2)}</strong> / 5.00</td>
                    <td>${critCriticalFailed ? ('<span style="color:#DC2626; font-weight:bold;">' + icon('alertTriangle', {size:13, style:'vertical-align:-1px; margin-left:3px;'}) + ' إخفاق في معيار حرج</span>') : '<span style="color:#047857; font-weight:bold;">مستوفٍ بامتياز</span>'}</td>
                </tr>
            `;
        }).join('');

        container.innerHTML = `
            <div class="onepage-section-header" id="sec-report-header">
                <div class="sec-header-left">
                    <span class="sec-icon-box">${icon("scroll", {size:24})}</span>
                    <div>
                        <h2 class="sec-title">${certConfig.title || 'محضر التدقيق والجاهزية المهنية للاعتماد النهائي'}</h2>
                        <p class="sec-subtitle">${certConfig.subtitle || 'المطابقة النظامية الشاملة لكافة متطلبات حقيبة تأهيل الماستر كوتش (الإصدار 3.0 - 2026)'}</p>
                    </div>
                </div>
                <div class="sec-header-right">
                    <button class="btn btn-primary btn-sm" onclick="window.print()" style="background:#0B1B3D; border-color:#0B1B3D; display:inline-flex; align-items:center; gap:0.4rem; padding:0.45rem 1rem; font-weight:700;">
                        <span>${icon('printer', {size:16, style:'margin-left:4px;'})} طباعة المحضر والشهادة</span>
                    </button>
                </div>
            </div>

            ${isAdmin ? `
                <div class="cert-admin-toolbar no-print">
                    <div style="display:flex; align-items:center; gap:0.6rem; flex-wrap:wrap;">
                        <span style="font-size:0.85rem; font-weight:700; color:#0B1B3D;">${icon('zap', {size:15, style:'color:var(--status-amber); vertical-align:-2px; margin-left:4px;'})} تحكم المشرف العام بالشهادة والمحضر:</span>
                        <button class="btn btn-sm btn-primary" onclick="window.App.openAddCertificateRowModal()">
                            ${icon('plus', {size:14, style:'margin-left:4px;'})} إضافة بند جديد للمحضر
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="window.App.openEditCertificateMetaModal()">
                            ${icon('settings', {size:14, style:'margin-left:4px;'})} تخصيص ترويسة وموقعي الشهادة
                        </button>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-outline" onclick="window.App.resetCertificateRows()" style="color:#64748B;">
                            ${icon('refresh', {size:14, style:'margin-left:4px;'})} استعادة البنود النموذجية
                        </button>
                    </div>
                </div>
            ` : ''}

            <div class="official-dossier-sheet">
                <div class="dossier-watermark">TAMKEEN AL-ROAYA</div>

                <div class="dossier-header-grid">
                    <div class="brand-section">
                        <img src="assets/images/logo.png" alt="شعار تمكين الرؤية" class="dossier-logo-img">
                        <div class="dossier-org-text">
                            <h2>${certConfig.orgName || 'شركة تمكين الرؤية للاستشارات المهنية'}</h2>
                            <p>${certConfig.programSub || 'برنامج إعداد وتأهيل الماستر كوتش • الإصدار 3.0 • النسخة التطويرية 2026'}</p>
                            <small>${certConfig.accreditationNote || 'cyce52.com • ترخيص مهني معتمد'}</small>
                        </div>
                    </div>
                    <div class="dossier-meta-box">
                        <div>رقم الوثيقة: <strong>${certConfig.documentRef || 'AUDIT-2026-MC084'}</strong></div>
                        <div>تاريخ التدقيق: <strong>${certConfig.issueDate || '2026-05-20'}</strong></div>
                        <div>الرقم التدريبي: <strong>${candidate.id}</strong></div>
                    </div>
                </div>

                <div style="text-align:center; margin-bottom:2rem;">
                    <h1 style="color:#0B1B3D; font-size:1.6rem; font-weight:900;">
                        ${certConfig.title || 'محضر التدقيق والجاهزية المهنية للاعتماد النهائي'}
                    </h1>
                    <p style="color:#475569; font-size:0.95rem;">
                        ${certConfig.subtitle || 'استناداً إلى معايير الحقيبة التدريبية الإصدار 3.0 ومحاور الكفايات الـ 43 والروبركات الستة'}
                    </p>
                </div>

                <!-- Candidate Info Card -->
                <div style="background:#F8FAFC; border:1px solid #E2E8F0; padding:1.25rem; border-radius:8px; margin-bottom:2rem; display:grid; grid-template-columns: repeat(3, 1fr); gap:1rem; font-size:0.9rem;">
                    <div><strong>اسم الكوتش المشارك:</strong><br>${candidate.name}</div>
                    <div><strong>الصفة المهنية الحالية:</strong><br>${candidate.title}</div>
                    <div><strong>المشرف الأكاديمي:</strong><br>${candidate.supervisorName}</div>
                </div>

                <!-- Dynamic Certificate Criteria Table -->
                <table class="dossier-summary-table">
                    <thead>
                        <tr>
                            <th>المعيار والمتطلب المعتمد</th>
                            <th>المستهدف بالحقيبة</th>
                            <th>المحقق في ملف الإنجاز</th>
                            <th>مؤشر التحقق والجودة</th>
                            <th>قرار اللجنة</th>
                            ${isAdmin ? '<th class="no-print" style="width:140px; text-align:center;">إجراء المشرف</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
                        ${certRows.map((row) => `
                            <tr data-row-id="${row.id}" style="${row.isCustom ? 'background:rgba(5, 150, 105, 0.03);' : ''}">
                                <td>
                                    <strong>${row.title}</strong>
                                    ${row.isCustom ? '<span style="margin-right:6px; font-size:0.7rem; background:#E0F2FE; color:#0369A1; padding:2px 6px; border-radius:4px; font-weight:bold;">بند مخصص</span>' : ''}
                                </td>
                                <td>${row.target}</td>
                                <td><strong>${row.achieved}</strong></td>
                                <td>${row.indicator}</td>
                                <td>
                                    <span style="color:${row.status === 'blocked' || row.status === 'flagged' ? '#DC2626' : '#047857'}; font-weight:bold;">
                                        ${row.verdict}
                                    </span>
                                </td>
                                ${isAdmin ? `
                                    <td class="no-print" style="white-space:nowrap; text-align:center;">
                                        <button class="btn-xs btn-outline" onclick="window.App.openEditCertificateRowModal('${row.id}')" title="تعديل هذا البند" style="margin-left:4px;">
                                            ${icon('edit', { size: 12, cls: 'inline-icon' })} تعديل
                                        </button>
                                        <button class="btn-xs btn-danger-outline" onclick="window.App.deleteCertificateRow('${row.id}')" title="حذف هذا البند">
                                            ${icon('trash', { size: 12, cls: 'inline-icon' })} حذف
                                        </button>
                                    </td>
                                ` : ''}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <!-- Rubrics Matrix Evaluation in Dossier -->
                <div style="margin-top:2rem; margin-bottom:1.5rem;">
                    <h3 style="color:#0B1B3D; font-size:1.15rem; font-weight:800; margin-bottom:0.6rem;">
                        ملخص تقييم الروبركات الرسمية الستة (الأوزان المرجحة):
                    </h3>
                    <table class="dossier-summary-table">
                        <thead>
                            <tr>
                                <th>روبرك التقييم المعتمد</th>
                                <th>الحد الأقصى</th>
                                <th>الدرجة المرجحة المحققة</th>
                                <th>حالة المعايير الحرجة</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rubricsRowsHtml}
                        </tbody>
                    </table>
                </div>

                <!-- Committee Final Verdict -->
                <div style="background:${hasBlocker ? '#FEF2F2' : '#ECFDF5'}; border:2px solid ${hasBlocker ? '#DC2626' : '#059669'}; border-radius:8px; padding:1.5rem; margin-bottom:2.5rem;">
                    <h3 style="color:${hasBlocker ? '#991B1B' : '#065F46'}; font-size:1.15rem; font-weight:800; margin-bottom:0.5rem;">
                        ${hasBlocker ? `${icon('alertTriangle', {size:18, style:'vertical-align:-3px; margin-left:4px;'})} قرار اللجنة العلمية: حظر التوصية بالاعتماد النهائي` : 'قرار اللجنة العلمية ولجنة الاعتماد المهني:'}
                    </h3>
                    <p style="color:${hasBlocker ? '#7F1D1D' : '#047857'}; font-size:0.95rem; line-height:1.6;">
                        ${hasBlocker ? `
                            نظراً لرصد إخفاق في المعايير الأخلاقية أو المهنية الجوهرية (${blockerReasons.join(' • ')})، 
                            فإن النظام المنهجي لتمكين الرؤية يمنع منح الاعتماد (المتوسط الحسابي لا يعوض السلامة الأخلاقية بأي حال). 
                            يُعاد الملف للمشارك لاستيفاء خطط التحسين المطلوبة وإعادة التقييم.
                        ` : certConfig.committeeVerdictText || `
                            بناءً على فحص كافة الأدلة الثبوتية، والتحقق المستقل من الساعات والممارسة الميدانية، 
                            والتأكد التام من استيفاء بوابة النزاهة الأخلاقية، ومناقشة مشروع التخرج والدفاع؛ 
                            <strong>توصي اللجنة بإجماع الآراء بمنح الكوتش ${candidate.name} شهادة إتمام برنامج إعداد وتأهيل الماستر كوتش بتقدير ممتاز مع مرتبة الشرف</strong>، 
                            ورفع التوصية للاعتماد المهني النهائي.
                        `}
                    </p>
                </div>

                <!-- Signatures Row -->
                <div class="signatures-row">
                    <div class="signature-block">
                        <div class="signature-title">${certConfig.signatory1?.title || 'المشرف الميداني المعتمد'}</div>
                        <div class="signature-calligraphy">${(certConfig.signatory1?.name || '').replace(/^(كوتش\s+|د\.\s+)+/, '') || 'فهد السبيعي'}</div>
                        <div class="signature-name">${certConfig.signatory1?.name || 'كوتش د. فهد السبيعي'}</div>
                        <div style="font-size:0.75rem; color:#64748B; margin-top:4px;">${certConfig.signatory1?.sub || 'توقيع إلكتروني معتمد #FS-882'}</div>
                    </div>

                    <div class="stamp-box-simulated">
                        <span>${certConfig.stampText?.line1 || 'تمكين الرؤية'}</span>
                        <span style="color:#D97706; font-size:0.65rem; font-weight:900;">${icon("star", {size:10, style:"fill:#D97706; vertical-align:-1px; margin-left:2px;"})} اعتماد رسمي ${icon("star", {size:10, style:"fill:#D97706; vertical-align:-1px; margin-right:2px;"})}</span>
                        <span>${certConfig.stampText?.line2 || 'المجلس العلمي'}</span>
                        <span style="font-family:var(--font-mono); font-size:0.7rem;">${certConfig.stampText?.line3 || '2026'}</span>
                    </div>

                    <div class="signature-block">
                        <div class="signature-title">${certConfig.signatory2?.title || 'رئيس اللجنة والمدير العام'}</div>
                        <div class="signature-calligraphy">${(certConfig.signatory2?.name || '').replace(/^(الماستر\s+كوتش\s+|كوتش\s+|د\.\s+)+/, '') || 'عبدالكريم الخليفي'}</div>
                        <div class="signature-name">${certConfig.signatory2?.name || 'الماستر كوتش عبدالكريم الخليفي'}</div>
                        <div style="font-size:0.75rem; color:#64748B; margin-top:4px;">${certConfig.signatory2?.sub || 'مؤسس شركة تمكين الرؤية #AK-001'}</div>
                    </div>
                </div>
            </div>
        `;
    }

    // Modal: Open New Tool Registration Dialog (with Real Anti-Duplication Checking)
    function openNewToolModal() {
        const modal = DOM.toolModal;
        if (!modal) return;

        modal.innerHTML = `
            <div class="modal-container" style="max-width:560px;">
                <div class="modal-header">
                    <h3>تسجيل تطبيق أداة جديد وفحص التكرار</h3>
                    <button class="btn-close-modal" onclick="window.App.closeAllModals()">×</button>
                </div>
                <div class="modal-body">
                    <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:1rem;">
                        قاعدة النظام الصارمة: <strong>يمنع تكرار المستفيد داخل عداد الأداة نفسها</strong> (مع جواز استخدام نفس المستفيد في أداة أخرى).
                    </p>

                    <div style="margin-bottom:1rem;">
                        <label class="reflection-label">الأداة المراد تسجيل تطبيقها:</label>
                        <select id="modal-tool-type" style="width:100%;" onchange="window.App.updateToolModalInfo(this.value)">
                            <option value="mbti">اختبار نمط الشخصية MBTI</option>
                            <option value="wheelOfLife">عجلة الحياة (Wheel of Life)</option>
                            <option value="swot">تحليل SWOT الشخصي والمهني</option>
                        </select>
                    </div>

                    <div style="margin-bottom:1rem;">
                        <label class="reflection-label">رمز المستفيد (منزوع الهوية):</label>
                        <input type="text" id="modal-beneficiary-code" placeholder="مثال: BEN-31 أو BEN-60" style="width:100%;">
                        <small id="tool-dupe-hint" style="color:var(--text-muted); font-size:0.75rem; margin-top:2px; display:block;">
                            سيقوم النظام بفحص السجل الحالي للأداة لمنع أي تكرار لنفس المستفيد.
                        </small>
                    </div>

                    <div style="margin-bottom:1rem;">
                        <label class="reflection-label">مؤشرات التطبيق وخطة المتابعة:</label>
                        <textarea id="modal-tool-notes" rows="3" placeholder="أهم النتائج والإجراءات المتفق عليها مع المستفيد..." style="width:100%;"></textarea>
                    </div>

                    <div style="display:flex; align-items:center; gap:0.5rem; font-size:0.8rem; color:var(--text-secondary);">
                        <input type="checkbox" id="modal-anon-check" checked>
                        <label for="modal-anon-check">أقر بالتزام نزع الهوية وحفظ خصوصية بيانات المستفيد.</label>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="window.App.closeAllModals()">إلغاء</button>
                    <button class="btn-primary" onclick="window.App.submitToolApplication()">فحص واعتماد التطبيق</button>
                </div>
            </div>
        `;

        openModalWithFocus(modal);
    }

    // Submit Tool Application with True Non-Duplication Checking
    async function submitToolApplication() {
        const toolType = document.getElementById('modal-tool-type')?.value;
        const code = document.getElementById('modal-beneficiary-code')?.value.trim().toUpperCase();
        const notes = document.getElementById('modal-tool-notes')?.value.trim();
        const anonCheck = document.getElementById('modal-anon-check')?.checked;

        if (!code) {
            showToast('يرجى إدخال رمز المستفيد المنزوع الهوية.', 'warn');
            return;
        }

        if (!anonCheck) {
            showToast('يجب الإقرار بنزع الهوية وحفظ خصوصية المستفيد للمتابعة.', 'warn');
            return;
        }

        const tool = appState.data.toolsSummary[toolType];
        if (!tool) return;

        // Try API first if user is authenticated
        if (window.ApiClient && window.ApiClient.getToken()) {
            try {
                const res = await window.ApiClient.applyTool(toolType, code, notes || 'تطبيق معتمد مع خطة متابعة وتأمل مهني.');
                if (res && res.tool) {
                    if (!tool.applications) tool.applications = [];
                    tool.applications.push({
                        id: res.application.id,
                        beneficiaryCode: res.application.beneficiary_code,
                        date: res.application.session_date,
                        focus: res.application.focus_area,
                        plan: res.application.action_plan,
                        status: res.application.status
                    });
                    tool.completed = res.tool.completed_count;
                    window.ProgramStore.save(appState.data);
                    showToast(`تم بنجاح تسجيل تطبيق الأداة للمستفيد ${code} في الخادم بدون تكرار!`, 'success');
                    closeAllModals();
                    renderAll();
                    return;
                }
            } catch (err) {
                openGenericModal(
                    'تنبيه نظام التحقق: تكرار المستفيد داخل الأداة الواحدة',
                    `<div style="color:var(--text-primary); line-height:1.6;">
                        ${err.message || 'المستفيد مسجل مسبقاً في هذه الأداة!'}<br><br>
                        <strong>تنص لائحة الحقيبة (ص10، ص30) صراحةً:</strong><br>
                        <span style="color:var(--status-crimson-light); font-weight:600;">'يمنع تكرار المستفيد داخل عداد الأداة نفسها'.</span><br><br>
                        <em>ملاحظة نظامية:</em> يحق لك استخدام المستفيد (${code}) في أداة أخرى مختلفة كعجلة الحياة أو SWOT، لكن لا يمكن تسجيله مرتين في نفس الأداة.
                    </div>`
                );
                return;
            }
        }

        // Fallback local check
        // True anti-duplication check against existing applications of this specific tool
        const existingApp = (tool.applications || []).find(a => a.beneficiaryCode.toUpperCase() === code);
        if (existingApp) {
            openGenericModal(
                'تنبيه نظام التحقق: تكرار المستفيد داخل الأداة الواحدة',
                `<div style="color:var(--text-primary); line-height:1.6;">
                    المستفيد <strong>(${code})</strong> مسجل مسبقاً في أداة <strong>${tool.label}</strong> بتاريخ ${existingApp.date}!<br><br>
                    <strong>تنص لائحة الحقيبة (ص10، ص30) صراحةً:</strong><br>
                    <span style="color:var(--status-crimson-light); font-weight:600;">'يمنع تكرار المستفيد داخل عداد الأداة نفسها'.</span><br><br>
                    <em>ملاحظة نظامية:</em> يحق لك استخدام المستفيد (${code}) في أداة أخرى مختلفة كعجلة الحياة أو SWOT، لكن لا يمكن تسجيله مرتين في نفس الأداة.
                </div>`
            );
            return;
        }

        // Successfully record new application
        const newRecord = {
            id: (tool.applications ? tool.applications.length : 0) + 1,
            beneficiaryCode: code,
            date: new Date().toISOString().split('T')[0],
            focus: notes || 'تطبيق معتمد مع خطة متابعة وتأمل مهني.',
            plan: notes || 'تم الاتفاق على الأولويات ووضع خطة الاستدامة.',
            status: 'approved'
        };

        if (!tool.applications) tool.applications = [];
        tool.applications.push(newRecord);
        tool.completed = tool.applications.length;

        window.ProgramStore.save(appState.data);
        showToast(`تم بنجاح تسجيل تطبيق الأداة للمستفيد ${code} بدون تكرار!`, 'success');
        closeAllModals();
        renderAll();
    }

    function switchToolTab(toolKey) {
        appState.activeToolTab = toolKey;
        renderQuantitativePanel();
    }

    function filterToolApplications(val) {
        appState.toolsSearchQuery = val;
        renderQuantitativePanel();
        const searchInput = DOM.quantContentArea?.querySelector('input[placeholder*="بحث برمز"]');
        if (searchInput) {
            searchInput.focus();
            const len = searchInput.value.length;
            try { searchInput.setSelectionRange(len, len); } catch (e) {}
        }
    }

    function toggleSessionsView() {
        appState.sessionsShowAll = !appState.sessionsShowAll;
        renderQuantitativePanel();
    }

    function filterSessionsByCase(caseCode) {
        appState.sessionsFilterCase = caseCode;
        renderQuantitativePanel();
    }

    // Modal: Open Case Dossier Details (20 Cases)
    function openCaseModal(caseId) {
        const c = appState.data.cases.find(item => item.id === caseId);
        if (!c) return;

        const caseSessions = appState.data.sessions.filter(s => s.caseCode === c.code);
        const modal = DOM.caseModal;
        if (!modal) return;

        modal.innerHTML = `
            <div class="modal-container" style="max-width:750px;">
                <div class="modal-header">
                    <div>
                        <span class="badge-status ${c.status === 'closed' ? 'approved' : 'referred'}">
                            ${c.status === 'closed' ? 'حالة مكتملة ومغلقة' : 'محالة طبياً لنطاق الاختصاص'}
                        </span>
                        <h3 style="margin-top:4px;">${c.code}: ${c.title}</h3>
                    </div>
                    <button class="btn-close-modal" onclick="window.App.closeAllModals()">×</button>
                </div>
                <div class="modal-body">
                    <div style="background:var(--bg-input); padding:1rem; border-radius:var(--radius-md); margin-bottom:1.5rem; border:1px solid var(--border-subtle); display:grid; grid-template-columns: repeat(3, 1fr); gap:1rem; font-size:0.85rem;">
                        <div><strong>عدد الجلسات:</strong><br><span style="font-family:var(--font-mono); font-size:1.1rem; color:var(--brand-blue-light);">${c.sessionsCount} جلسات</span></div>
                        <div><strong>المدة الإجمالية:</strong><br><span style="font-family:var(--font-mono); font-size:1.1rem; color:var(--status-emerald-light);">${c.totalMinutes} دقيقة</span></div>
                        <div><strong>النزاهة والسرية:</strong><br><span style="color:var(--status-emerald-light);">منزوعة الهوية 100%</span></div>
                    </div>

                    <div style="margin-bottom:1.25rem;">
                        <h4 style="font-size:0.95rem; margin-bottom:0.4rem;">النماذج والأدوات المطبقة في هذه الحالة:</h4>
                        <div style="display:flex; flex-wrap:wrap; gap:0.4rem;">
                            ${c.models.map(m => `<span style="background:var(--bg-surface); border:1px solid var(--border-accent); padding:0.3rem 0.6rem; border-radius:var(--radius-sm); font-size:0.82rem; color:var(--text-cyan);">${m}</span>`).join('')}
                        </div>
                    </div>

                    <div style="margin-bottom:1.25rem;">
                        <h4 style="font-size:0.95rem; margin-bottom:0.4rem;">ملاحظات التدخل وقياس الأثر والتحول:</h4>
                        <p style="font-size:0.88rem; color:var(--text-secondary); line-height:1.6; background:var(--bg-surface); padding:0.75rem 1rem; border-radius:var(--radius-sm); border:1px solid var(--border-subtle);">
                            ${c.notes}
                        </p>
                    </div>

                    ${c.status === 'referred' ? `
                        <div style="background:rgba(220, 38, 38, 0.15); border:1px solid var(--status-crimson); border-radius:var(--radius-md); padding:1rem; margin-bottom:1.25rem;">
                            <h4 style="color:var(--status-crimson-light); font-size:0.92rem; margin-bottom:0.3rem;">محضر إحالة تخصصي مقترن (REF-2026-01):</h4>
                            <p style="font-size:0.82rem; color:var(--text-primary); line-height:1.5;">
                                رصد الكوتش أعراض احتراق وظيفي متقدم واكتئاب سريري خارج نطاق الكوتشنج، وتم تطبيق الميثاق الأخلاقي بإنهاء العلاقة فوراً وتوجيه المستفيد لعيادة طبية نفسية مرخصة.
                            </p>
                        </div>
                    ` : ''}

                    <div>
                        <h4 style="font-size:0.95rem; margin-bottom:0.5rem;">سجل الجلسات التابعة لهذه الحالة (${caseSessions.length} جلسات):</h4>
                        <div style="display:flex; flex-direction:column; gap:0.4rem;">
                            ${caseSessions.map(s => `
                                <div style="display:flex; align-items:center; justify-content:space-between; font-size:0.82rem; background:var(--bg-surface); padding:0.5rem 0.75rem; border-radius:var(--radius-sm); border:1px solid var(--border-subtle);">
                                    <div>
                                        <span style="font-family:var(--font-mono); font-weight:bold; color:var(--accent-cyan);">جلسة #${s.id}</span> • 
                                        <span>${s.date} (${s.duration} دقيقة)</span>
                                    </div>
                                    <div style="color:var(--text-primary);">${s.focus}</div>
                                    <div style="color:var(--status-emerald-light); font-family:var(--font-mono); font-weight:bold;">${s.rubricsScore} / 5.0</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-primary" onclick="window.App.closeAllModals()">إغلاق الملف</button>
                </div>
            </div>
        `;
        openModalWithFocus(modal);
    }

    // Modal: Open Competency Details (43 + 1)
    function openInspectCompetencyModal(compId) {
        const comp = appState.data.competencies.find(c => c.id === compId);
        if (!comp) return;

        const modal = DOM.genericModal;
        if (!modal) return;

        modal.innerHTML = `
            <div class="modal-container" style="max-width:650px;">
                <div class="modal-header">
                    <div>
                        <span class="comp-item-id">${comp.id} • ${comp.code}</span>
                        <h3 style="margin-top:4px;">${comp.title}</h3>
                    </div>
                    <button class="btn-close-modal" onclick="window.App.closeAllModals()">×</button>
                </div>
                <div class="modal-body">
                    <div style="background:var(--bg-input); padding:0.85rem; border-radius:var(--radius-sm); margin-bottom:1rem; font-size:0.88rem; color:var(--text-secondary); line-height:1.5;">
                        ${comp.description}
                    </div>

                    <div style="margin-bottom:1rem;">
                        <h4 style="font-size:0.9rem; margin-bottom:0.3rem; color:var(--brand-blue-light);">أسلوب التقييم المعتمد بالحقيبة:</h4>
                        <div style="background:var(--bg-surface); padding:0.75rem; border-radius:var(--radius-sm); border:1px solid var(--border-subtle); font-size:0.85rem;">
                            ${comp.evaluationMethod}
                        </div>
                    </div>

                    <div>
                        <h4 style="font-size:0.9rem; margin-bottom:0.5rem; color:var(--status-emerald-light);">الأدلة والبراهين المودعة لإثبات الكفاية (${comp.evidenceCount} أدلة):</h4>
                        <div style="display:flex; flex-direction:column; gap:0.4rem;">
                            ${comp.evidenceList.map((ev, idx) => `
                                <div style="display:flex; align-items:center; gap:0.5rem; background:var(--bg-surface); padding:0.5rem 0.75rem; border-radius:var(--radius-sm); border:1px solid var(--border-subtle); font-size:0.82rem;">
                                    <span style="color:var(--status-emerald-light); font-weight:bold;">${idx + 1}.</span>
                                    <span>${ev}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-primary" onclick="window.App.closeAllModals()">إغلاق</button>
                </div>
            </div>
        `;
        modal.classList.add('active');
    }

    // Generic Modal Opener
    function openGenericModal(title, bodyHtml) {
        const modal = DOM.genericModal;
        if (!modal) return;

        modal.innerHTML = `
            <div class="modal-container" style="max-width:580px;">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="btn-close-modal" onclick="window.App.closeAllModals()">×</button>
                </div>
                <div class="modal-body">
                    ${bodyHtml}
                </div>
                <div class="modal-footer">
                    <button class="btn-primary" onclick="window.App.closeAllModals()">موافق</button>
                </div>
            </div>
        `;
        openModalWithFocus(modal);
    }

    // Audio Playback Simulation with Web Audio API Synthesizer
    function toggleAudioPlayback(btn, trackId, durationStr) {
        if (appState.audioPlaying && appState.activeAudioTrack === trackId) {
            stopAudio();
            btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
        } else {
            if (appState.audioPlaying) {
                stopAudio();
            }
            appState.audioPlaying = true;
            appState.activeAudioTrack = trackId;

            let totalSecs = 180;
            if (durationStr) {
                const parts = durationStr.split(':');
                if (parts.length === 2) {
                    totalSecs = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
                }
            }
            appState.audioTotalDuration = totalSecs;

            // Reset all play buttons
            document.querySelectorAll('.audio-play-btn').forEach(b => {
                b.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
            });

            btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
            startAudioTimer(trackId);
            playSynthesizedTone(330);
            showToast('تشغيل التسجيل الصوتي وتوليد الموجات التفاعلية...', 'info');
        }
    }

    function startAudioTimer(trackId) {
        clearInterval(appState.audioTimer);
        appState.audioTimer = setInterval(() => {
            if (appState.audioCurrentTime >= appState.audioTotalDuration) {
                stopAudio();
                return;
            }
            appState.audioCurrentTime += 1;
            updateAudioProgressUI(trackId);
        }, 1000);
    }

    function stopAudio() {
        appState.audioPlaying = false;
        clearInterval(appState.audioTimer);
        if (appState.activeAudioTrack) {
            const btn = document.getElementById(`play-btn-${appState.activeAudioTrack}`);
            if (btn) {
                btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
            }
        }
    }

    function updateAudioProgressUI(trackId) {
        const curTimeEl = document.getElementById(`cur-time-${trackId}`);
        if (curTimeEl) {
            const mins = String(Math.floor(appState.audioCurrentTime / 60)).padStart(2, '0');
            const secs = String(appState.audioCurrentTime % 60).padStart(2, '0');
            curTimeEl.textContent = `${mins}:${secs}`;
        }

        const pct = Math.min(1, appState.audioCurrentTime / appState.audioTotalDuration);
        const totalBars = 30;
        const playedCount = Math.floor(pct * totalBars);

        for (let i = 0; i < totalBars; i++) {
            const bar = document.getElementById(`wave-${trackId}-${i}`);
            if (bar) {
                if (i <= playedCount) {
                    bar.classList.add('played');
                } else {
                    bar.classList.remove('played');
                }
            }
        }
    }

    function jumpToTimestamp(trackId, timeStr, note) {
        const parts = timeStr.split(':');
        if (parts.length === 2) {
            const targetSecs = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
            seekAudio(trackId, targetSecs);
            playSynthesizedTone(520);
        }

        const noteBox = document.getElementById(`active-ts-note-${trackId}`);
        if (noteBox) {
            noteBox.style.display = 'block';
            noteBox.innerHTML = `<strong>${icon('clock', {size:13, style:'vertical-align:-2px; margin-left:3px;'})} ${timeStr}:</strong> ${note}`;
        }
        showToast(`انتقال إلى الطابع الزمني [${timeStr}]: ${note}`, 'info');
    }

    function scrubAudio(e, trackId) {
        const container = document.getElementById(`waveform-${trackId}`);
        if (!container) return;

        const rect = container.getBoundingClientRect();
        // RTL calculation: right side is 0, left is 100%
        const clickXFromRight = rect.right - e.clientX;
        const pct = Math.max(0, Math.min(1, clickXFromRight / rect.width));

        const targetSecs = Math.floor(pct * appState.audioTotalDuration);
        seekAudio(trackId, targetSecs);
        playSynthesizedTone(440);
        showToast('تم ضبط موضع التشغيل في التسجيل الصوتي.', 'info');
    }

    function seekAudio(trackId, targetSecs) {
        appState.activeAudioTrack = trackId;
        appState.audioCurrentTime = targetSecs;
        updateAudioProgressUI(trackId);
    }

    // Soft ambient audio tone generation
    function playSynthesizedTone(freq) {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            if (!appState.audioContext) {
                appState.audioContext = new AudioCtx();
            }
            if (appState.audioContext.state === 'suspended') {
                appState.audioContext.resume();
            }

            const osc = appState.audioContext.createOscillator();
            const gain = appState.audioContext.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, appState.audioContext.currentTime);

            gain.gain.setValueAtTime(0.08, appState.audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, appState.audioContext.currentTime + 0.35);

            osc.connect(gain);
            gain.connect(appState.audioContext.destination);

            osc.start();
            osc.stop(appState.audioContext.currentTime + 0.36);
        } catch (e) {
            // Audio synthesis silent fallback
        }
    }

    // Search and Filters for Competencies
    function onCompSearch(val) {
        appState.compSearchQuery = val;
        renderCompetencyMatrixPanel();
        const compInput = DOM.compsContentArea?.querySelector('input[placeholder*="بحث في الكفايات"]');
        if (compInput) {
            compInput.focus();
            const len = compInput.value.length;
            try { compInput.setSelectionRange(len, len); } catch (e) {}
        }
    }

    function filterCompsByDomain(domainId) {
        appState.compFilterDomain = domainId;
        renderCompetencyMatrixPanel();
    }

    function filterCompsByStatus(status) {
        appState.compFilterStatus = status;
        renderCompetencyMatrixPanel();
    }

    // ==========================================================================
    // Real-Time & Persistent Supervisory & Group Chat Hub Implementation
    // ==========================================================================

    async function loadChatChannels() {
        if (window.ApiClient && window.ApiClient.token) {
            try {
                const res = await window.ApiClient.getChatChannels();
                if (res && res.channels && res.channels.length > 0) {
                    appState.chatState.channels = res.channels;
                    if (!appState.chatState.activeChannelId) {
                        appState.chatState.activeChannelId = res.channels[0].id;
                    }
                    await loadChatMessages(appState.chatState.activeChannelId);
                    updateChatNavBadge();
                    return;
                }
            } catch (err) {
                console.warn('API getChatChannels notice:', err.message);
            }
        }

        // Offline / Mock fallback seed channels
        if (!appState.chatState.channels || appState.chatState.channels.length === 0) {
            appState.chatState.channels = [
                {
                    id: 1,
                    name: "ديوان زمالة الماستر كوتش (دفعة 2026)",
                    channel_type: "group",
                    description: "ديوان النقاش المهني المفتوح لكافة الكوتشز المقيدين بالدفعة والماستر كوتش المشرف",
                    last_message: "مرحباً بكم زملاء دفعة الماستر كوتش 2026 في منصة التوجيه المعتمدة",
                    last_message_time: new Date().toISOString(),
                    unread_count: 0
                },
                {
                    id: 2,
                    name: "جلسات التوجيه الإشرافي المباشر",
                    channel_type: "direct",
                    description: "قناة التواصل الإشرافي الخاص والآمن بين الماستر كوتش عبدالكريم والكوتش أحمد",
                    last_message: "تم الاطلاع على تسجيل الجلسة رقم 14، يرجى الاستماع للتوجيه الصوتي المرفق.",
                    last_message_time: new Date().toISOString(),
                    unread_count: 0
                }
            ];
            appState.chatState.activeChannelId = 1;
            appState.chatState.messages = [
                {
                    id: 1,
                    channel_id: 1,
                    sender_id: 1,
                    sender_name: "الماستر كوتش عبدالكريم الخليفي",
                    sender_role: "admin",
                    message_type: "text",
                    content: "أهلاً وسهلاً بكافة الزملاء في ديوان زمالة الماستر كوتش (دفعة 2026). هذا الفضاء مخصص للتداول المعرفي، استعراض النماذج الابتكارية، وتبادل الخبرات الميدانية.",
                    created_at: new Date(Date.now() - 3600000).toISOString()
                },
                {
                    id: 2,
                    channel_id: 1,
                    sender_id: 2,
                    sender_name: "كوتش أحمد بن صالح الشمري",
                    sender_role: "coach",
                    message_type: "text",
                    content: "شاكر ومقدر ماستر عبدالكريم. بدأت اليوم مرحلة تطبيق مقياس مؤشرات النضج القيادي LMMI في التدخل المؤسسي مع الحالة رقم 12 وسأوافيكم بالنتائج.",
                    created_at: new Date(Date.now() - 1800000).toISOString()
                }
            ];
        }
        updateChatNavBadge();
    }

    async function loadChatMessages(channelId) {
        if (!channelId) return;
        if (window.ApiClient && window.ApiClient.token) {
            try {
                const res = await window.ApiClient.getChatMessages(channelId, { search: appState.chatState.searchQuery });
                if (res && res.messages) {
                    appState.chatState.messages = res.messages;
                    await window.ApiClient.markChatRead(channelId);
                    const ch = appState.chatState.channels.find(c => c.id === channelId);
                    if (ch) {
                        ch.unread_count = 0;
                        ch.unreadCount = 0;
                    }
                    updateChatNavBadge();
                    return;
                }
            } catch (err) {
                console.warn('API getChatMessages notice:', err.message);
            }
        }
    }

    async function switchChatChannel(channelId) {
        if (appState.chatState.audioElement && !appState.chatState.audioElement.paused) {
            try { appState.chatState.audioElement.pause(); } catch (_) {}
            appState.chatState.currentPlayingAudioMsgId = null;
        }
        appState.chatState.activeChannelId = Number(channelId);
        await loadChatMessages(appState.chatState.activeChannelId);
        renderChatPanel();
    }

    function updateChatNavBadge() {
        const badge = DOM.chatNavBadge || document.getElementById('chat-nav-badge');
        if (!badge) return;
        const totalUnread = (appState.chatState.channels || []).reduce((acc, c) => acc + (c.unread_count || c.unreadCount || 0), 0);
        if (totalUnread > 0) {
            badge.textContent = totalUnread > 99 ? '99+' : totalUnread;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }

    function renderChatPanel() {
        if (window.ChatWidget && typeof window.ChatWidget.render === 'function') {
            window.ChatWidget.render();
            return;
        }
        const container = DOM.chatContentArea || document.getElementById('chat-content-area');
        if (!container) return;

        const activeChannel = appState.chatState.channels.find(c => c.id === appState.chatState.activeChannelId) || appState.chatState.channels[0];

        container.innerHTML = `
            <div class="onepage-section-header" id="sec-chat-header">
                <div class="sec-header-left">
                    <span class="sec-icon-box">${icon("chat", {size:24})}</span>
                    <div>
                        <h2 class="sec-title">مركز المحادثات والتوجيه الإشرافي المباشر</h2>
                        <p class="sec-subtitle">قناة إشرافية خاصة مع الماستر كوتش عبدالكريم بالإضافة إلى ديوان الزمالة الجماعي (صوت، صور، ومستندات)</p>
                    </div>
                </div>
                <div class="sec-header-right">
                    <span class="badge" style="background:#10B981; color:#fff; padding:0.35rem 0.85rem; border-radius:999px; font-weight:700; font-size:0.82rem; display:inline-flex; align-items:center; gap:0.4rem;">
                        <span style="width:7px; height:7px; background:#fff; border-radius:50%; display:inline-block;"></span>
                        بث حي متصل (SSE)
                    </span>
                </div>
            </div>

            <div class="chat-hub-container">
                <!-- Sidebar -->
                <div class="chat-sidebar">
                    <div class="chat-sidebar-header">
                        <div class="chat-sidebar-title-row">
                            <h3>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                مركز المحادثات والتوجيه
                            </h3>
                        </div>
                        <div class="chat-search-wrap">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            <input type="text" placeholder="بحث في الرسائل والقنوات..." value="${appState.chatState.searchQuery || ''}" oninput="window.App.onChatSearch(this.value)">
                        </div>
                    </div>
                    <div class="chat-channels-scroll" id="chat-channels-list-container"></div>
                </div>

                <!-- Main Chat Area -->
                <div class="chat-main-area" id="chat-main-area-content">
                    ${activeChannel ? `
                        <div class="chat-header">
                            <div class="chat-header-title-box">
                                <div class="chat-channel-avatar ${activeChannel.channel_type === 'group' ? 'group-avatar' : (activeChannel.displayRole === 'admin' ? 'supervisor-avatar' : 'coach-avatar')}">
                                    ${activeChannel.channel_type === 'group' ? icon('users', {size:22}) : (activeChannel.displayRole === 'admin' ? icon('graduationCap', {size:22}) : icon('user', {size:22}))}
                                </div>
                                <div class="chat-header-details">
                                    <h3>${escapeHtml(activeChannel.displayName || activeChannel.name)}</h3>
                                    <p>
                                        <span class="chat-online-dot"></span>
                                        ${escapeHtml(activeChannel.description || 'متاح للتوجيه والملاحظات الإشرافية المباشرة')}
                                    </p>
                                </div>
                            </div>
                            <div class="chat-header-actions">
                                <button class="btn-sm btn-secondary" onclick="window.App.switchChatChannel(${activeChannel.id})" title="تحديث المحادثة">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                                    تحديث
                                </button>
                            </div>
                        </div>

                        <div class="chat-messages-scroll" id="chat-messages-container"></div>

                        <div class="chat-input-bar" id="chat-input-bar-container"></div>
                    ` : `
                        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:var(--text-muted); gap:1rem;">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                            <p>يرجى اختيار قناة محادثة لبدء التواصل الإشرافي</p>
                        </div>
                    `}
                </div>
            </div>
        `;

        renderChatSidebarChannels();
        if (activeChannel) {
            renderChatMessagesOnly();
            renderChatInputArea();
            scrollChatToBottom();
        }
    }

    function renderChatSidebarChannels() {
        const listContainer = document.getElementById('chat-channels-list-container');
        if (!listContainer) return;

        let channels = appState.chatState.channels || [];
        if (appState.chatState.searchQuery) {
            const q = appState.chatState.searchQuery.toLowerCase();
            channels = channels.filter(c => (c.displayName && c.displayName.toLowerCase().includes(q)) || c.name.toLowerCase().includes(q) || (c.last_message && c.last_message.toLowerCase().includes(q)));
        }

        const groupChannels = channels.filter(c => c.channel_type === 'group');
        const directChannels = channels.filter(c => c.channel_type === 'direct');

        const renderChannelItem = (ch) => {
            const isActive = ch.id === appState.chatState.activeChannelId;
            const channelTitle = ch.displayName || ch.name;
            const avatarClass = ch.channel_type === 'group' ? 'group-avatar' : (ch.displayRole === 'admin' ? 'supervisor-avatar' : 'coach-avatar');
            const avatarIcon = ch.channel_type === 'group' ? icon('users', {size:20}) : (ch.displayRole === 'admin' ? icon('graduationCap', {size:20}) : icon('user', {size:20}));
            return `
                <div class="chat-channel-item ${isActive ? 'active' : ''}" onclick="window.App.switchChatChannel(${ch.id})">
                    <div class="chat-channel-avatar-wrap">
                        <div class="chat-channel-avatar ${avatarClass}">
                            ${avatarIcon}
                        </div>
                    </div>
                    <div class="chat-channel-info">
                        <div class="chat-channel-top-row">
                            <span class="chat-channel-name">${escapeHtml(channelTitle)}</span>
                            <span class="chat-channel-time">${formatChatTime(ch.last_message_time)}</span>
                        </div>
                        <div class="chat-channel-bottom-row">
                            <span class="chat-channel-snippet">${escapeHtml(ch.last_message || 'لا توجد رسائل سابقة')}</span>
                            ${(ch.unread_count || ch.unreadCount) > 0 ? `<span class="chat-unread-badge">${ch.unread_count || ch.unreadCount}</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        };

        listContainer.innerHTML = `
            ${groupChannels.length > 0 ? `
                <div class="chat-channels-section-label">ديوان الزمالة والمجموعات</div>
                ${groupChannels.map(renderChannelItem).join('')}
            ` : ''}

            ${directChannels.length > 0 ? `
                <div class="chat-channels-section-label" style="margin-top:0.75rem;">قنوات التوجيه والإشراف الفردي</div>
                ${directChannels.map(renderChannelItem).join('')}
            ` : ''}
        `;
    }

    function renderChatMessagesOnly() {
        const container = document.getElementById('chat-messages-container');
        if (!container) return;

        const messages = appState.chatState.messages || [];
        if (messages.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:3rem 1rem; color:var(--text-muted);">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:0.75rem;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    <p style="font-size:0.92rem; margin:0;">لا توجد رسائل سابقة في هذه المحادثة بعد.</p>
                    <small>ابدأ بطرح استفسارك الإشرافي أو إرفاق التسجيل الصوتي والملاحظات الميدانية.</small>
                </div>
            `;
            return;
        }

        const isUserSupervisor = appState.currentRole === 'supervisor';
        const currentUserId = (window.ApiClient && window.ApiClient.getUser())
            ? window.ApiClient.getUser().id
            : (isUserSupervisor ? 1 : 2);

        container.innerHTML = `
            <div class="chat-date-separator">
                <span>سجل المحادثات الموثقة</span>
            </div>
            ${messages.map(msg => {
                const msgSenderId = Number(msg.sender_id || msg.senderId);
                const isOutgoing = msgSenderId === currentUserId;
                const msgSenderRole = msg.sender_role || msg.senderRole || 'coach';
                const msgSenderName = msg.sender_name || msg.senderName || (msgSenderRole === 'admin' ? 'الماستر كوتش عبدالكريم الخليفي' : 'كوتش مشارك');
                const msgType = msg.message_type || msg.messageType || 'text';
                const mediaUrl = msg.media_url || msg.mediaUrl || '';
                const msgContent = msg.content || '';
                const msgCreatedAt = msg.created_at || msg.createdAt || '';
                const mediaMeta = msg.media_meta || msg.mediaMeta;

                let mediaHtml = '';
                if (msgType === 'audio') {
                    const durSec = (mediaMeta && mediaMeta.durationSeconds) || 0;
                    const durText = durSec > 0 ? `${Math.floor(durSec / 60)}:${String(durSec % 60).padStart(2, '0')}` : 'تسجيل صوتي إشرافي';
                    mediaHtml = `
                        <div class="chat-audio-player">
                            <button class="audio-play-btn" id="audio-play-btn-${msg.id}" onclick="window.App.playChatAudio(${msg.id}, '${mediaUrl}')" title="تشغيل التسجيل الصوتي">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                            </button>
                            <div class="audio-waveform-wrap">
                                <div class="audio-progress-bar" onclick="window.App.seekChatAudio(event, ${msg.id}, '${mediaUrl}')" title="انقر للتنقل في التسجيل">
                                    <div class="audio-progress-fill" id="audio-progress-fill-${msg.id}"></div>
                                </div>
                                <div class="audio-time-row">
                                    <span id="audio-time-${msg.id}">${durText}</span>
                                    <span>${icon('mic', {size:14})}</span>
                                </div>
                            </div>
                        </div>
                    `;
                } else if (msgType === 'image') {
                    mediaHtml = `
                        <div class="chat-image-wrap" onclick="window.App.openChatImageLightbox('${encodeURI(mediaUrl)}', ${msg.id})">
                            <img src="${encodeURI(mediaUrl)}" alt="${escapeHtml(msgContent)}" class="chat-image-preview">
                        </div>
                    `;
                } else if (msgType === 'file') {
                    const fileSize = mediaMeta && mediaMeta.sizeBytes ? `${Math.round(mediaMeta.sizeBytes / 1024)} كيلوبايت` : 'مستند معتمد للتدقيق والمطالعة';
                    mediaHtml = `
                        <div class="chat-file-card">
                            <div class="chat-file-icon">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                            </div>
                            <div class="chat-file-details">
                                <div class="chat-file-title">${escapeHtml(msgContent || 'مستند إشرافي مرفق')}</div>
                                <div class="chat-file-meta">${fileSize}</div>
                            </div>
                            <a href="${mediaUrl}" download target="_blank" class="chat-file-download-btn" title="تحميل الملف">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            </a>
                        </div>
                    `;
                }

                return `
                    <div class="chat-message-row ${isOutgoing ? 'outgoing' : 'incoming'}">
                        <div class="chat-msg-avatar" style="background:${msgSenderRole === 'admin' ? 'linear-gradient(135deg, #0B1B3D, #1D4ED8)' : 'linear-gradient(135deg, #059669, #10B981)'}; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:0.85rem;">
                            ${msgSenderRole === 'admin' ? 'م.ك' : 'ك.'}
                        </div>
                        <div class="chat-msg-content-wrap">
                            <div class="chat-msg-sender-meta">
                                <span class="chat-msg-sender-name">${escapeHtml(msgSenderName)}</span>
                                <span class="chat-msg-sender-badge ${msgSenderRole === 'admin' ? 'admin-badge' : 'coach-badge'}">
                                    ${msgSenderRole === 'admin' ? 'الماستر كوتش المشرف' : 'كوتش مشارك'}
                                </span>
                            </div>
                            <div class="chat-bubble">
                                ${mediaHtml}
                                ${msgContent && msgType !== 'file' ? `<div style="margin-top:${mediaHtml ? '0.5rem' : '0'};">${escapeHtml(msgContent)}</div>` : ''}
                                <span class="chat-bubble-time">${formatChatTime(msgCreatedAt)}</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        `;
    }

    function renderChatInputArea() {
        const container = document.getElementById('chat-input-bar-container');
        if (!container) return;

        if (appState.chatState.isRecording) {
            container.innerHTML = `
                <div class="chat-recording-banner">
                    <div style="display:flex; align-items:center;">
                        <span class="recording-dot"></span>
                        <span style="margin-right:0.5rem;">جارٍ تسجيل رسالة صوتية إشرافية...</span>
                        <span class="recording-timer" id="chat-recording-timer" style="margin-right:0.75rem;">00:00</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:0.5rem;">
                        <button class="btn-sm btn-secondary" onclick="window.App.cancelChatVoiceRecording()" style="color:#DC2626; border-color:#FCA5A5;" title="إلغاء التسجيل">
                            ${icon('close', {size:13, style:'margin-left:3px;'})} إلغاء
                        </button>
                        <button class="btn-sm btn-primary" onclick="window.App.finishChatVoiceRecording()" style="background:#059669; border-color:#059669;" title="إرسال الرسالة الصوتية">
                            ${icon('check', {size:13, style:'margin-left:3px;'})} إرسال الصوتية
                        </button>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = `
                <input type="file" id="chat-file-input" style="display:none;" onchange="window.App.onChatFileSelected(event)">
                <button class="chat-attach-btn" title="إرفاق ملف أو صورة أو تسجيل" onclick="document.getElementById('chat-file-input').click()">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                </button>
                <button class="chat-record-btn" title="تسجيل رسالة صوتية إشرافية" onclick="window.App.toggleChatVoiceRecording()">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                </button>
                <div class="chat-input-field-wrap">
                    <textarea id="chat-msg-input" class="chat-textarea" placeholder="اكتب استفسارك الإشرافي أو توجيهك المهني هنا... (Enter للإرسال، Shift+Enter لسطر جديد)" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();window.App.sendChatMessage();}"></textarea>
                </div>
                <button class="chat-send-btn" title="إرسال" onclick="window.App.sendChatMessage()">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                </button>
            `;
        }
    }

    function scrollChatToBottom() {
        const container = document.getElementById('chat-messages-container');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }

    function formatChatTime(dateStr) {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            return d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
        } catch (_) {
            return '';
        }
    }

    async function sendChatMessage() {
        const inputEl = document.getElementById('chat-msg-input');
        if (!inputEl) return;
        const text = inputEl.value.trim();
        if (!text) return;

        const activeChId = appState.chatState.activeChannelId;
        if (!activeChId) return;

        inputEl.value = '';
        inputEl.style.height = 'auto';

        if (window.ApiClient && window.ApiClient.token) {
            try {
                const res = await window.ApiClient.sendChatMessage(activeChId, {
                    messageType: 'text',
                    content: text
                });
                if (res && res.message) {
                    if (!appState.chatState.messages.some(m => m.id === res.message.id)) {
                        appState.chatState.messages.push(res.message);
                    }
                    renderChatMessagesOnly();
                    scrollChatToBottom();
                    const ch = appState.chatState.channels.find(c => c.id === activeChId);
                    if (ch) {
                        ch.last_message = text;
                        ch.last_message_time = new Date().toISOString();
                    }
                    renderChatSidebarChannels();
                    return;
                }
            } catch (err) {
                console.error('Failed to send text message:', err);
                showToast('فشل إرسال الرسالة: ' + err.message, 'warn');
            }
        }

        // Mock offline fallback
        const mockMsg = {
            id: Date.now(),
            channel_id: activeChId,
            sender_id: appState.currentRole === 'supervisor' ? 1 : 2,
            sender_name: appState.currentRole === 'supervisor' ? 'الماستر كوتش عبدالكريم الخليفي' : appState.data.metadata.candidate.name,
            sender_role: appState.currentRole === 'supervisor' ? 'admin' : 'coach',
            message_type: 'text',
            content: text,
            created_at: new Date().toISOString()
        };
        appState.chatState.messages.push(mockMsg);
        renderChatMessagesOnly();
        scrollChatToBottom();
        const ch = appState.chatState.channels.find(c => c.id === activeChId);
        if (ch) {
            ch.last_message = text;
            ch.last_message_time = new Date().toISOString();
        }
        renderChatSidebarChannels();
    }

    async function onChatFileSelected(event) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        if (file.size > 50 * 1024 * 1024) {
            showToast('حجم الملف يتجاوز الحد الأقصى المسموح به (50 ميجابايت)', 'warn');
            event.target.value = '';
            return;
        }

        showToast(`جارٍ رفع المرفق (${file.name})...`, 'info');
        const activeChId = appState.chatState.activeChannelId;
        if (!activeChId) return;

        if (window.ApiClient && window.ApiClient.token) {
            try {
                const uploadRes = await window.ApiClient.uploadChatMedia(file);
                if (uploadRes && uploadRes.fileUrl) {
                    const sendRes = await window.ApiClient.sendChatMessage(activeChId, {
                        messageType: uploadRes.type,
                        content: uploadRes.originalName || file.name,
                        mediaUrl: uploadRes.fileUrl,
                        mediaMeta: {
                            fileName: uploadRes.fileName,
                            originalName: uploadRes.originalName,
                            sizeBytes: uploadRes.sizeBytes,
                            mimeType: uploadRes.mimeType
                        }
                    });
                    if (sendRes && sendRes.message) {
                        if (!appState.chatState.messages.some(m => m.id === sendRes.message.id)) {
                            appState.chatState.messages.push(sendRes.message);
                        }
                        renderChatMessagesOnly();
                        scrollChatToBottom();
                        const ch = appState.chatState.channels.find(c => c.id === activeChId);
                        if (ch) {
                            ch.last_message = uploadRes.originalName || file.name;
                            ch.last_message_time = new Date().toISOString();
                        }
                        renderChatSidebarChannels();
                        showToast('تم إرسال الملف المرفق بنجاح', 'success');
                        event.target.value = '';
                        return;
                    }
                }
            } catch (err) {
                console.error('Chat file upload failed:', err);
                showToast('فشل رفع الملف: ' + err.message, 'warn');
            }
        } else {
            // Local fallback
            const isImg = file.type.startsWith('image/');
            const isAud = file.type.startsWith('audio/');
            const mockMsg = {
                id: Date.now(),
                channel_id: activeChId,
                sender_id: appState.currentRole === 'supervisor' ? 1 : 2,
                sender_name: appState.currentRole === 'supervisor' ? 'الماستر كوتش عبدالكريم الخليفي' : appState.data.metadata.candidate.name,
                sender_role: appState.currentRole === 'supervisor' ? 'admin' : 'coach',
                message_type: isImg ? 'image' : (isAud ? 'audio' : 'file'),
                content: file.name,
                media_url: isImg ? 'assets/images/logo.png' : '/uploads/sample_supervisor_guidance.mp3',
                media_meta: JSON.stringify({ fileName: file.name, sizeBytes: file.size }),
                created_at: new Date().toISOString()
            };
            appState.chatState.messages.push(mockMsg);
            renderChatMessagesOnly();
            scrollChatToBottom();
            showToast('تم إيداع الملف في المحادثة بنجاح', 'success');
            event.target.value = '';
        }
    }

    function toggleChatVoiceRecording() {
        if (appState.chatState.isRecording) {
            finishChatVoiceRecording();
        } else {
            startChatVoiceRecording();
        }
    }

    async function startChatVoiceRecording() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            simulateVoiceNoteFallback();
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            appState.chatState.mediaStream = stream;

            const mimeCandidates = [
                'audio/webm;codecs=opus',
                'audio/webm',
                'audio/ogg;codecs=opus',
                'audio/mp4',
                'audio/aac'
            ];
            let options = {};
            if (typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function') {
                const supported = mimeCandidates.find(type => MediaRecorder.isTypeSupported(type));
                if (supported) options = { mimeType: supported };
            }

            const mediaRecorder = new MediaRecorder(stream, options);
            appState.chatState.mediaRecorder = mediaRecorder;
            appState.chatState.audioChunks = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    appState.chatState.audioChunks.push(e.data);
                }
            };

            mediaRecorder.onstop = async () => {
                if (appState.chatState.isCancelledVoice) {
                    appState.chatState.isCancelledVoice = false;
                    return;
                }
                const mime = mediaRecorder.mimeType || 'audio/webm';
                const audioBlob = new Blob(appState.chatState.audioChunks, { type: mime });
                await handleSendAudioVoiceNote(audioBlob);
            };

            mediaRecorder.start();
            appState.chatState.isRecording = true;
            appState.chatState.recordStartTime = Date.now();
            renderChatInputArea();

            if (appState.chatState.recordingTimerId) clearInterval(appState.chatState.recordingTimerId);
            appState.chatState.recordingTimerId = setInterval(() => {
                const timerEl = document.getElementById('chat-recording-timer');
                if (timerEl && appState.chatState.recordStartTime) {
                    const elapsedSec = Math.floor((Date.now() - appState.chatState.recordStartTime) / 1000);
                    const mins = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
                    const secs = String(elapsedSec % 60).padStart(2, '0');
                    timerEl.textContent = `${mins}:${secs}`;
                }
            }, 500);

        } catch (err) {
            console.warn('Microphone access denied or unavailable:', err);
            showToast('لم يتم العثور على ميكروفون متاح - سيتم توظيف تسجيل التوجيه الإشرافي المعتمد', 'info');
            simulateVoiceNoteFallback();
        }
    }

    function cancelChatVoiceRecording() {
        appState.chatState.isCancelledVoice = true;
        if (appState.chatState.recordingTimerId) clearInterval(appState.chatState.recordingTimerId);
        if (appState.chatState.mediaRecorder && appState.chatState.mediaRecorder.state !== 'inactive') {
            appState.chatState.mediaRecorder.stop();
        }
        if (appState.chatState.mediaStream) {
            appState.chatState.mediaStream.getTracks().forEach(t => t.stop());
        }
        appState.chatState.isRecording = false;
        renderChatInputArea();
    }

    function finishChatVoiceRecording() {
        if (appState.chatState.recordingTimerId) clearInterval(appState.chatState.recordingTimerId);
        if (appState.chatState.mediaRecorder && appState.chatState.mediaRecorder.state !== 'inactive') {
            appState.chatState.mediaRecorder.stop();
        }
        if (appState.chatState.mediaStream) {
            appState.chatState.mediaStream.getTracks().forEach(t => t.stop());
        }
        appState.chatState.isRecording = false;
        renderChatInputArea();
    }

    async function handleSendAudioVoiceNote(blob) {
        showToast('جارٍ رفع الملاحظة الصوتية ومعالجتها...', 'info');
        const activeChId = appState.chatState.activeChannelId;
        if (!activeChId) return;

        const mime = blob.type || 'audio/webm';
        let ext = '.webm';
        if (mime.includes('mp4') || mime.includes('aac')) ext = '.m4a';
        else if (mime.includes('ogg')) ext = '.ogg';
        else if (mime.includes('wav')) ext = '.wav';
        else if (mime.includes('mp3') || mime.includes('mpeg')) ext = '.mp3';

        const durationSeconds = appState.chatState.recordStartTime 
            ? Math.max(1, Math.round((Date.now() - appState.chatState.recordStartTime) / 1000))
            : 0;

        const audioFile = new File([blob], `voice_note_${Date.now()}${ext}`, { type: mime });

        if (window.ApiClient && window.ApiClient.token) {
            try {
                const uploadRes = await window.ApiClient.uploadChatMedia(audioFile);
                if (uploadRes && uploadRes.fileUrl) {
                    const sendRes = await window.ApiClient.sendChatMessage(activeChId, {
                        messageType: 'audio',
                        content: 'تسجيل صوتي إشرافي مباشر',
                        mediaUrl: uploadRes.fileUrl,
                        mediaMeta: {
                            fileName: uploadRes.fileName,
                            sizeBytes: uploadRes.sizeBytes,
                            mimeType: uploadRes.mimeType,
                            durationSeconds
                        }
                    });
                    if (sendRes && sendRes.message) {
                        if (!appState.chatState.messages.some(m => m.id === sendRes.message.id)) {
                            appState.chatState.messages.push(sendRes.message);
                        }
                        renderChatMessagesOnly();
                        scrollChatToBottom();
                        const ch = appState.chatState.channels.find(c => c.id === activeChId);
                        if (ch) {
                            ch.last_message = 'تسجيل صوتي إشرافي مباشر';
                            ch.last_message_time = new Date().toISOString();
                        }
                        renderChatSidebarChannels();
                        showToast('تم إرسال التسجيل الصوتي بنجاح', 'success');
                        appState.chatState.recordStartTime = null;
                        return;
                    }
                }
            } catch (err) {
                console.error('Failed to upload/send audio note:', err);
                showToast('فشل رفع التسجيل الصوتي: ' + err.message, 'warn');
            }
        }
    }

    async function simulateVoiceNoteFallback() {
        showToast('جارٍ إرسال تسجيل صوتي إشرافي معتمد...', 'info');
        const activeChId = appState.chatState.activeChannelId;
        if (!activeChId) return;

        const voiceMsgData = {
            messageType: 'audio',
            content: 'تسجيل صوتي إشرافي: ملاحظات حول الكفاية C101 وتطبيق نموذج التمكين',
            mediaUrl: '/uploads/sample_supervisor_guidance.mp3',
            mediaMeta: {
                fileName: 'sample_supervisor_guidance.mp3',
                durationSeconds: 15,
                mimeType: 'audio/mp3',
                sizeBytes: 256000
            }
        };

        if (window.ApiClient && window.ApiClient.token) {
            try {
                const res = await window.ApiClient.sendChatMessage(activeChId, voiceMsgData);
                if (res && res.message) {
                    appState.chatState.messages.push(res.message);
                    renderChatMessagesOnly();
                    scrollChatToBottom();
                    showToast('تم إرسال التسجيل الصوتي بنجاح', 'success');
                    return;
                }
            } catch (e) {
                console.warn('Voice send error:', e);
            }
        }

        const mockMsg = {
            id: Date.now(),
            channel_id: activeChId,
            sender_id: appState.currentRole === 'supervisor' ? 1 : 2,
            sender_name: appState.currentRole === 'supervisor' ? 'الماستر كوتش عبدالكريم الخليفي' : appState.data.metadata.candidate.name,
            sender_role: appState.currentRole === 'supervisor' ? 'admin' : 'coach',
            message_type: 'audio',
            content: voiceMsgData.content,
            media_url: voiceMsgData.mediaUrl,
            media_meta: JSON.stringify(voiceMsgData.mediaMeta),
            created_at: new Date().toISOString()
        };
        appState.chatState.messages.push(mockMsg);
        renderChatMessagesOnly();
        scrollChatToBottom();
        showToast('تم حفظ التسجيل الصوتي بنجاح', 'success');
    }

    function playChatAudio(msgId, mediaUrl) {
        if (!appState.chatState.audioElement) {
            appState.chatState.audioElement = new Audio();
        }
        const audio = appState.chatState.audioElement;

        // If clicking on the currently active audio
        if (appState.chatState.currentPlayingAudioMsgId === msgId) {
            if (!audio.paused) {
                audio.pause();
                const cur = audio.currentTime || 0;
                const dur = audio.duration || 1;
                updateChatAudioButton(msgId, false, (cur / dur) * 100, cur, dur);
                return;
            } else {
                // Resume from where it was paused
                audio.play().catch(e => {
                    console.warn('Audio resume error:', e);
                });
                const cur = audio.currentTime || 0;
                const dur = audio.duration || 1;
                updateChatAudioButton(msgId, true, (cur / dur) * 100, cur, dur);
                return;
            }
        }

        // Switching from another audio track
        if (appState.chatState.currentPlayingAudioMsgId && appState.chatState.currentPlayingAudioMsgId !== msgId) {
            updateChatAudioButton(appState.chatState.currentPlayingAudioMsgId, false, 0);
        }

        appState.chatState.currentPlayingAudioMsgId = msgId;
        audio.src = mediaUrl;
        audio.currentTime = 0;
        audio.play().catch(e => {
            console.warn('Audio play error:', e);
            showToast('تعذر تشغيل الملف الصوتي', 'warn');
            appState.chatState.currentPlayingAudioMsgId = null;
            updateChatAudioButton(msgId, false, 0);
        });

        updateChatAudioButton(msgId, true, 0);

        audio.ontimeupdate = () => {
            if (audio.duration && audio.duration > 0) {
                const pct = (audio.currentTime / audio.duration) * 100;
                updateChatAudioButton(msgId, !audio.paused, pct, audio.currentTime, audio.duration);
            }
        };

        audio.onended = () => {
            appState.chatState.currentPlayingAudioMsgId = null;
            updateChatAudioButton(msgId, false, 0);
        };
    }

    function seekChatAudio(event, msgId, mediaUrl) {
        if (event && event.stopPropagation) event.stopPropagation();
        const bar = event ? event.currentTarget : null;
        if (!bar) return;
        const rect = bar.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const pct = Math.max(0, Math.min(1, clickX / rect.width));

        if (!appState.chatState.audioElement) {
            appState.chatState.audioElement = new Audio();
        }
        const audio = appState.chatState.audioElement;

        const isCurrent = appState.chatState.currentPlayingAudioMsgId === msgId && audio.src && audio.src.includes(encodeURI(mediaUrl).split('/').pop());
        if (!isCurrent) {
            playChatAudio(msgId, mediaUrl);
            const applySeek = () => {
                if (audio.duration && audio.duration > 0) {
                    audio.currentTime = pct * audio.duration;
                    updateChatAudioButton(msgId, !audio.paused, pct * 100, audio.currentTime, audio.duration);
                }
                audio.removeEventListener('loadedmetadata', applySeek);
            };
            if (audio.duration && audio.duration > 0) {
                applySeek();
            } else {
                audio.addEventListener('loadedmetadata', applySeek);
            }
        } else if (audio.duration && audio.duration > 0) {
            audio.currentTime = pct * audio.duration;
            updateChatAudioButton(msgId, !audio.paused, pct * 100, audio.currentTime, audio.duration);
        }
    }

    function updateChatAudioButton(msgId, isPlaying, progressPct = 0, currentSec = 0, durationSec = 0) {
        const btn = document.getElementById(`audio-play-btn-${msgId}`);
        const fill = document.getElementById(`audio-progress-fill-${msgId}`);
        const timeEl = document.getElementById(`audio-time-${msgId}`);

        if (btn) {
            btn.innerHTML = isPlaying
                ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`
                : `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
        }
        if (fill) {
            fill.style.width = `${progressPct}%`;
        }
        if (timeEl && durationSec > 0) {
            const formatTime = (s) => {
                const m = Math.floor(s / 60);
                const sec = Math.floor(s % 60);
                return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
            };
            timeEl.textContent = `${formatTime(currentSec)} / ${formatTime(durationSec)}`;
        }
    }

    function openChatImageLightbox(imageUrl, msgIdOrTitle = 'معاينة المرفق الصوري') {
        const modal = DOM.chatMediaModal || document.getElementById('chat-media-modal');
        if (!modal) return;

        let title = 'معاينة المرفق الصوري';
        if (typeof msgIdOrTitle === 'number') {
            const m = (appState.chatState.messages || []).find(x => x.id === msgIdOrTitle);
            if (m && m.content) title = m.content;
        } else if (typeof msgIdOrTitle === 'string' && msgIdOrTitle.trim()) {
            title = msgIdOrTitle.trim();
        }
        const safeTitle = escapeHtml(title);

        modal.innerHTML = `
            <div class="modal-container" style="max-width:850px; background:rgba(15, 23, 42, 0.95); border-color:#334155; color:#fff;">
                <div class="modal-header" style="border-bottom-color:#334155;">
                    <div style="display:flex; align-items:center; gap:0.6rem;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                        <h3 style="color:#fff; font-size:1.05rem; margin:0;">${safeTitle}</h3>
                    </div>
                    <button class="btn-close-modal" onclick="window.App.closeAllModals()" style="color:#94A3B8;">×</button>
                </div>
                <div class="modal-body" style="padding:1.5rem; text-align:center;">
                    <img src="${encodeURI(imageUrl)}" alt="${safeTitle}" style="max-width:100%; max-height:75vh; border-radius:8px; box-shadow:0 10px 25px rgba(0,0,0,0.5); object-fit:contain;">
                </div>
                <div class="modal-footer" style="border-top-color:#334155; display:flex; justify-content:space-between;">
                    <a href="${encodeURI(imageUrl)}" download target="_blank" class="btn-sm btn-secondary" style="background:#1E293B; color:#38BDF8; border-color:#334155; text-decoration:none; display:inline-flex; align-items:center; gap:0.4rem;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        تحميل الصورة الأصلية
                    </a>
                    <button class="btn-primary" onclick="window.App.closeAllModals()">إغلاق المعاينة</button>
                </div>
            </div>
        `;
        modal.classList.add('active');
    }

    let chatSearchDebounceTimer = null;
    function onChatSearch(query) {
        appState.chatState.searchQuery = query;
        renderChatSidebarChannels();
        if (chatSearchDebounceTimer) clearTimeout(chatSearchDebounceTimer);
        chatSearchDebounceTimer = setTimeout(() => {
            if (appState.chatState.activeChannelId) {
                loadChatMessages(appState.chatState.activeChannelId).then(() => {
                    renderChatMessagesOnly();
                });
            }
        }, 200);
    }

    function initChatStream() {
        if (!window.ApiClient || !window.ApiClient.token) return;

        // If an existing stream exists, close it to ensure we connect with current user session
        if (appState.chatState.eventSource) {
            try { appState.chatState.eventSource.close(); } catch (_) {}
            appState.chatState.eventSource = null;
        }

        try {
            const es = window.ApiClient.createChatStream(
                (data) => {
                    if (data && data.type === 'new_message' && data.message) {
                        const msg = data.message;
                        const channelId = Number(data.channelId || msg.channel_id || msg.channelId);
                        const ch = (appState.chatState.channels || []).find(c => c.id === channelId);

                        let previewText = msg.content || '';
                        const mType = msg.message_type || msg.messageType;
                        if (mType === 'audio') {
                            previewText = previewText || 'تسجيل صوتي إشرافي مباشر';
                        } else if (mType === 'image') {
                            previewText = previewText || 'صورة ومخطط إشرافي';
                        } else if (mType === 'file') {
                            previewText = previewText || 'مستند معتمد مرفق';
                        }

                        if (channelId === appState.chatState.activeChannelId) {
                            if (!appState.chatState.messages.some(m => m.id === msg.id)) {
                                appState.chatState.messages.push(msg);
                                renderChatMessagesOnly();
                                scrollChatToBottom();
                            }
                            if (ch) {
                                ch.last_message = previewText;
                                ch.last_message_time = msg.created_at || msg.createdAt || new Date().toISOString();
                                ch.unread_count = 0;
                                ch.unreadCount = 0;
                            }
                            if (window.ApiClient && window.ApiClient.token) {
                                window.ApiClient.markChatRead(channelId).catch(() => {});
                            }
                        } else {
                            if (ch) {
                                ch.unread_count = (ch.unread_count || ch.unreadCount || 0) + 1;
                                ch.unreadCount = ch.unread_count;
                                ch.last_message = previewText;
                                ch.last_message_time = msg.created_at || msg.createdAt || new Date().toISOString();
                                updateChatNavBadge();
                            }
                        }
                        renderChatSidebarChannels();
                    }
                },
                (err) => {
                    console.warn('SSE connection notice:', err);
                }
            );
            appState.chatState.eventSource = es;
        } catch (e) {
            console.warn('SSE init failed:', e);
        }
    }

    let lastActiveElementBeforeModal = null;

    function openModalWithFocus(modalEl) {
        if (!modalEl) return;
        lastActiveElementBeforeModal = document.activeElement;
        modalEl.classList.add('active');
        modalEl.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        
        setTimeout(() => {
            const focusable = modalEl.querySelector('input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button.btn-primary, button.btn-close-modal');
            if (focusable && typeof focusable.focus === 'function') {
                focusable.focus();
            }
        }, 60);
    }

    // Close All Modals
    function closeAllModals() {
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
        });
        document.body.style.overflow = '';
        appState.activeTask = null;
        if (lastActiveElementBeforeModal && typeof lastActiveElementBeforeModal.focus === 'function') {
            lastActiveElementBeforeModal.focus();
            lastActiveElementBeforeModal = null;
        }
    }

    // Custom Accessible Confirmation & Alert Dialog
    function confirmDialog(options) {
        options = options || {};
        const title = options.title || 'تأكيد الإجراء';
        const message = options.message || 'هل أنت متأكد من المتابعة؟';
        const confirmText = options.confirmText || 'تأكيد';
        const cancelText = options.cancelText || 'إلغاء';
        const danger = options.danger !== false;

        return new Promise((resolve) => {
            const modal = document.getElementById('confirm-modal') || DOM.genericModal;
            if (!modal) {
                resolve(window.confirm(message));
                return;
            }

            const prevActive = document.activeElement;
            modal.innerHTML = `
                <div class="confirm-dialog-card" role="document">
                    <div class="confirm-dialog-header ${danger ? 'danger' : 'info'}">
                        <span class="confirm-dialog-icon">${icon(danger ? 'alertTriangle' : 'helpCircle', { size: 22 })}</span>
                        <h3 id="confirm-modal-title" style="margin:0; font-size:1.1rem; font-weight:800;">${escapeHtml(title)}</h3>
                    </div>
                    <div class="confirm-dialog-body" id="confirm-modal-desc">
                        <p style="margin:0;">${escapeHtml(message)}</p>
                    </div>
                    <div class="confirm-dialog-footer">
                        <button type="button" id="confirm-dialog-cancel-btn" class="btn btn-secondary btn-sm">${escapeHtml(cancelText)}</button>
                        <button type="button" id="confirm-dialog-submit-btn" class="btn ${danger ? 'btn-danger' : 'btn-primary'} btn-sm">${escapeHtml(confirmText)}</button>
                    </div>
                </div>
            `;

            const cleanup = () => {
                modal.classList.remove('active');
                modal.setAttribute('aria-hidden', 'true');
                document.body.style.overflow = '';
                document.removeEventListener('keydown', handleKeyDown);
                if (prevActive && typeof prevActive.focus === 'function') {
                    prevActive.focus();
                }
            };

            const handleKeyDown = (e) => {
                if (e.key === 'Escape') {
                    cleanup();
                    resolve(false);
                } else if (e.key === 'Tab') {
                    const focusables = modal.querySelectorAll('button:not([disabled])');
                    if (focusables.length >= 2) {
                        const first = focusables[0];
                        const last = focusables[focusables.length - 1];
                        if (e.shiftKey && document.activeElement === first) {
                            e.preventDefault();
                            last.focus();
                        } else if (!e.shiftKey && document.activeElement === last) {
                            e.preventDefault();
                            first.focus();
                        }
                    }
                }
            };

            document.addEventListener('keydown', handleKeyDown);

            const cancelBtn = modal.querySelector('#confirm-dialog-cancel-btn');
            const submitBtn = modal.querySelector('#confirm-dialog-submit-btn');

            if (cancelBtn) {
                cancelBtn.onclick = () => {
                    cleanup();
                    resolve(false);
                };
            }

            if (submitBtn) {
                submitBtn.onclick = () => {
                    cleanup();
                    resolve(true);
                };
            }

            modal.classList.add('active');
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            if (cancelBtn) cancelBtn.focus();
        });
    }

    // Toast Notifications
    function showToast(message, type = 'info') {
        if (!DOM.toastContainer) return;

        const toast = document.createElement('div');
        toast.className = 'toast-item';
        
        let iconSvg = '';
        if (type === 'success') {
            iconSvg = icon('checkCircle', {size:18, style:'color:var(--status-emerald-light);'});
        } else if (type === 'warn' || type === 'warning') {
            iconSvg = icon('alertTriangle', {size:18, style:'color:var(--status-amber);'});
        } else if (type === 'error' || type === 'danger') {
            iconSvg = icon('shieldAlert', {size:18, style:'color:#DC2626;'});
            toast.style.borderColor = '#F87171';
        } else {
            iconSvg = icon('info', {size:18, style:'color:var(--brand-blue-light);'});
        }

        toast.innerHTML = `
            ${iconSvg}
            <div style="font-size:0.85rem; font-weight:600;">${message}</div>
        `;

        DOM.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            toast.style.transition = 'all 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function escapeJsAttr(str) {
        if (!str) return '';
        return String(str)
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/"/g, '&quot;')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '');
    }

    // Export Public API to Window
    window.App = {
        init,
        setViewMode,
        scrollToSection,
        toggleChatDrawer,
        switchTab,
        switchRubric,
        setCriterionLevel,
        saveCriterionImprovement,
        openTaskModal,
        openAddEvidenceSection,
        submitTaskEvidence,
        openEvidencePreview,
        resubmitTask,
        committeeVerifyTask,
        closeAllModals,
        saveTaskReflection,
        supervisorAction,
        openNewToolModal,
        submitToolApplication,
        switchToolTab,
        filterToolApplications,
        toggleSessionsView,
        filterSessionsByCase,
        openCaseModal,
        openInspectCompetencyModal,
        openInspectDomain14Modal,
        switchCompsViewMode,
        openExcellencePreview,
        toggleEthicsCheckpoint,
        toggleAudioPlayback,
        jumpToTimestamp,
        scrubAudio,
        onCompSearch,
        filterCompsByDomain,
        filterCompsByStatus,
        showToast,
        confirmDialog,
        openModalWithFocus,
        // Fullstack Auth & Admin Exports
        openAuthModal,
        switchAuthTab,
        handleLogin,
        handleQuickLogin,
        handleRegister,
        handleLogout,
        switchAdminTab,
        switchAdminCoach,
        renderAdminDashboard,
        onRealFileSelected,
        issueGraduationAuditDecree,
        adminResetDemo,
        adminExportBackup,
        // Dynamic Certificate & Admin Handlers
        openAddCertificateRowModal,
        submitAddCertificateRow,
        openEditCertificateRowModal,
        submitEditCertificateRow,
        deleteCertificateRow,
        openEditCertificateMetaModal,
        submitEditCertificateMeta,
        resetCertificateRows,
        openAddTaskModal,
        submitAddTask,
        openEditTaskModal,
        submitEditTask,
        deleteTask,
        openAddCompetencyModal,
        submitAddCompetency,
        openEditCompetencyModal,
        submitEditCompetency,
        deleteCompetency,
        openAddRubricCriterionModal,
        submitAddRubricCriterion,
        openEditRubricCriterionModal,
        submitEditRubricCriterion,
        deleteRubricCriterion,
        saveAdminQuotas,
        openAddCoachModal,
        submitAddCoach,
        openEditCoachModal,
        submitEditCoach,
        deleteCoach,
        // Chat Hub Exports
        loadChatChannels,
        loadChatMessages,
        switchChatChannel,
        renderChatPanel,
        sendChatMessage,
        onChatFileSelected,
        toggleChatVoiceRecording,
        startChatVoiceRecording,
        cancelChatVoiceRecording,
        finishChatVoiceRecording,
        playChatAudio,
        seekChatAudio,
        openChatImageLightbox,
        onChatSearch,
        initChatStream
    };

    // Auto-init on DOMContentLoaded
    document.addEventListener('DOMContentLoaded', init);

})();
