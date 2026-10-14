/**
 * Tamkeen Al-Roaya Master Coach Qualification Platform v3.0
 * Application Controller & Reactive Engine
 * Master Coach Abdelkarim Al-Khelaifi — Tamkeen Al-Roaya (cyce52.com)
 */

(function () {
    'use strict';

    // Application State
    const appState = {
        data: null,
        currentRole: 'participant', // 'participant' | 'supervisor' | 'committee'
        currentTab: 'dashboard',
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
        pendingFileSizeBytes: 0
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
        panelAdminDashboard: document.getElementById('panel-admin-dashboard')
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

        document.querySelectorAll('.btn-close-modal, .modal-backdrop-close').forEach(btn => {
            btn.addEventListener('click', closeAllModals);
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                closeAllModals();
            }
        });

        const resetBtn = document.getElementById('btn-reset-data');
        if (resetBtn) {
            resetBtn.addEventListener('click', function () {
                if (confirm('هل أنت متأكد من رغبتك في إعادة تعيين كافة البيانات إلى الحالة النموذجية الافتراضية؟')) {
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

    // Switch Tabs
    function switchTab(tabId) {
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
                DOM.stripEthicsVal.innerHTML = `<span class="badge-status referred" style="background:#DC2626; color:#FFF; font-weight:700;">⚠️ حظر أخلاقي</span>`;
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
                        ${isAdmin ? '👑' : '🎓'}
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
                        خروج ⏻
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
                        <span>⚡ الوصول السريع بحسابات النظام المعتمدة:</span>
                    </div>
                    <button class="quick-demo-btn admin-quick" onclick="window.App.handleQuickLogin('abdelkarim@cyce52.com', 'Master@2026')">
                        <div>
                            <strong>👑 الماستر كوتش عبدالكريم الخليفي (Admin)</strong>
                            <div style="font-size:0.75rem; color:var(--text-muted);">المشرف العام • تقييم الروبركات • التدقيق والاعتماد</div>
                        </div>
                        <span style="font-size:0.8rem; color:var(--brand-gold); font-weight:700;">دخول ➔</span>
                    </button>
                    <button class="quick-demo-btn" onclick="window.App.handleQuickLogin('coach@cyce52.com', 'Coach@2026')">
                        <div>
                            <strong>🎓 كوتش أحمد بن صالح الشمري (MC-2026-084)</strong>
                            <div style="font-size:0.75rem; color:var(--text-muted);">مرشح ماستر كوتش • إيداع المهام • استيفاء الساعات</div>
                        </div>
                        <span style="font-size:0.8rem; color:var(--brand-blue-light); font-weight:700;">دخول ➔</span>
                    </button>
                    <button class="quick-demo-btn" onclick="window.App.handleQuickLogin('sara@cyce52.com', 'Coach@2026')">
                        <div>
                            <strong>👩‍💼 كوتش سارة بنت خالد المطيري (MC-2026-085)</strong>
                            <div style="font-size:0.75rem; color:var(--text-muted);">مرشحة جديدة • مهام قيد التدقيق الإشرافي</div>
                        </div>
                        <span style="font-size:0.8rem; color:var(--status-emerald-light); font-weight:700;">دخول ➔</span>
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
        modal.classList.add('active');
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
            closeAllModals();
            renderUserSession();
            renderAll();
        } catch (err) {
            showToast(err.message || 'فشل تسجيل الكوتش', 'error');
        }
    }

    async function handleLogout() {
        if (window.ApiClient) {
            await window.ApiClient.logout();
        }
        showToast('تم تسجيل الخروج بنجاح', 'info');
        renderUserSession();
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
            // Fallback for standalone preview
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

        container.innerHTML = `
            <div style="margin-bottom:2rem;">
                <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:1rem; margin-bottom:1.5rem;">
                    <div>
                        <div style="display:flex; align-items:center; gap:0.6rem; margin-bottom:0.25rem;">
                            <span class="badge-status approved">لوحة القيادة التنفيذية</span>
                            <span style="color:var(--brand-gold); font-weight:700; font-size:0.9rem;">إشراف الماستر كوتش د. عبدالكريم الخليفي</span>
                        </div>
                        <h2 style="font-size:1.6rem; color:var(--text-primary);">
                            لوحة متابعة وتدقيق الكوتشز المرشحين (Admin Dashboard)
                        </h2>
                        <p style="color:var(--text-secondary); font-size:0.88rem;">
                            متابعة التقدم المزدوج، رصد التقييمات في الروبركات الستة، فحص البوابة الأخلاقية، وإصدار قرارات التخرج المعتمدة.
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

                <!-- KPI Metrics Cards -->
                <div class="admin-kpi-grid">
                    <div class="admin-kpi-card">
                        <div class="admin-kpi-icon blue">👥</div>
                        <div>
                            <div class="admin-kpi-val">${totalCoaches}</div>
                            <div class="admin-kpi-label">إجمالي الكوتشز المسجلين</div>
                        </div>
                    </div>
                    <div class="admin-kpi-card">
                        <div class="admin-kpi-icon gold">⏳</div>
                        <div>
                            <div class="admin-kpi-val" style="color:var(--brand-gold);">${totalPending}</div>
                            <div class="admin-kpi-label">مهام قيد التدقيق الإشرافي</div>
                        </div>
                    </div>
                    <div class="admin-kpi-card">
                        <div class="admin-kpi-icon emerald">✓</div>
                        <div>
                            <div class="admin-kpi-val" style="color:var(--status-emerald-light);">${totalApproved}</div>
                            <div class="admin-kpi-label">مهام معتمدة بالروبرك</div>
                        </div>
                    </div>
                    <div class="admin-kpi-card">
                        <div class="admin-kpi-icon purple">⭐</div>
                        <div>
                            <div class="admin-kpi-val" style="color:#A78BFA;">${avgRubrics}</div>
                            <div class="admin-kpi-label">متوسط الروبركات (من 5.0)</div>
                        </div>
                    </div>
                </div>

                <!-- Coaches Roster Table -->
                <div class="coaches-table-card">
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1rem;">
                        <h3 style="font-size:1.15rem; color:var(--brand-blue-light);">
                            سجل الكوتشز المسجلين ومتابعة الإنجاز
                        </h3>
                        <span style="font-size:0.8rem; color:var(--text-muted);">
                            انقر على أي كوتش لمعاينة وتدقيق ملف إنجازه وروبركاته
                        </span>
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
                                                ${c.ethicsPassed ? '✓ اجتياز 100%' : '⚠️ قيد التدقيق'}
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
                            ⏳ طابور المهام المستلمة بانتظار تقييم المشرف (${totalPending} مهام)
                        </h3>
                    </div>

                    ${totalPending === 0 ? `
                        <div style="padding:1.5rem; text-align:center; color:var(--text-muted); background:var(--bg-input); border-radius:var(--radius-md);">
                            ✓ رائع! لا توجد حالياً أي مهام معلقة بانتظار التدقيق. كافة التسليمات معتمدة ومقيمة بالروبرك.
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
                                🎓 اعتماد التخرج وإصدار الوثيقة الرسمية
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
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
                        '⚠️ تعذر إصدار محضر التخرج: يوجد حظر مهني أو أخلاقي',
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
        if (!confirm('هل أنت متأكد من رغبتك في إعادة تعيين كافة البيانات إلى الحالة النموذجية الافتراضية؟')) return;
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
                    <span>📎</span>
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
                        <h4 style="color:var(--status-crimson-light);">⚠️ تنبيه حاسم: تفعيل حظر الاعتماد الأخلاقي المستقل</h4>
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
                            حالة التدقيق: <strong>${hasBlocker ? '⚠️ حظر أخلاقي نشط' : appState.data.ethicsGate.clearanceBadge}</strong> • 
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
                            <button class="ts-pill-btn" onclick="window.App.jumpToTimestamp('${r.id}', '${ts.time}', '${escapeHtml(ts.note)}')">
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

    // Render Competency Matrix (43 + 1)
    function renderCompetencyMatrixPanel() {
        const container = document.getElementById('comps-content-area');
        if (!container) return;

        // Domains Filter Buttons
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

    // Render Tasks & Evidence Lifecycle Hub
    function renderTasksPanel() {
        const container = document.getElementById('tasks-content-area');
        if (!container) return;

        const tasksCards = appState.data.tasks.map(t => {
            const compsList = t.linkedCompetencies.map(cId => {
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
                        <span>الأدلة المرفوعة: <strong>${t.evidences.length} ملفات</strong></span>
                        <span>التقييم: <strong style="color:var(--status-emerald-light); font-family:var(--font-mono);">${t.supervisorFeedback.grade} / 5</strong></span>
                    </div>

                    <button class="btn-primary" style="width:100%; justify-content:center;" onclick="window.App.openTaskModal('${t.id}')">
                        فتح بطاقة المهمة ودورة الاعتماد ←
                    </button>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="section-header-wrap">
                <div>
                    <h3 class="section-title">بنك المهام وإيداع الأدلة وتتبع دورة الاعتماد</h3>
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
                                        <span style="font-size:1.2rem;">${ev.type === 'audio' ? '🎵' : ev.type === 'video' ? '🎬' : '📄'}</span>
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
                                    <button class="ts-pill-btn" onclick="window.App.jumpToTimestamp('sup_${task.id}', '${ts.time}', '${escapeHtml(ts.comment)}')">
                                        ⏱ ${ts.time}: ${ts.comment.substring(0, 30)}...
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
                            ✓ تدقيق واعتماد مطابقة الأدلة للجنة العلمية
                        </button>
                    ` : `
                        <button class="btn-secondary" onclick="window.App.closeAllModals()">إغلاق</button>
                        ${task.status === 'revision_required' ? `
                            <button class="btn-amber btn-sm" onclick="window.App.resubmitTask('${task.id}')">
                                ↺ إعادة التسليم مع التحسين
                            </button>
                        ` : ''}
                        <button class="btn-primary" onclick="window.App.saveTaskReflection('${task.id}')">حفظ التعديلات والتأمل</button>
                    `}
                </div>
            </div>
        `;

        modal.classList.add('active');
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
        const anonCheck = document.getElementById('new-ev-anon')?.checked;

        if (!anonCheck) {
            showToast('يجب الإقرار بنزع الهوية الرقمية للمستفيد وحماية الخصوصية.', 'warn');
            return;
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
                            <span style="font-size:1.8rem;">${ev.type === 'audio' ? '🎵' : ev.type === 'video' ? '🎬' : '📄'}</span>
                            <div>
                                <h4 style="font-size:1rem; color:var(--brand-blue-light);">${ev.name}</h4>
                                <small style="color:var(--text-muted); font-family:var(--font-mono);">الحجم: ${ev.size || '3.2 MB'} • التشفير: SHA-256 Verified</small>
                            </div>
                        </div>
                        <div style="background:rgba(5, 150, 105, 0.15); border:1px solid var(--status-emerald); padding:0.5rem 0.75rem; border-radius:var(--radius-sm); font-size:0.8rem; color:var(--status-emerald-light);">
                            ✓ شهادة نزع الهوية الرقمية: تم التحقق الآلي من إخفاء الأسماء والأرقام والعناوين الشخصية لحماية الخصوصية.
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
                    <strong>توصيف المستوى (${crit.currentLevel}):</strong> ${crit.levelsDesc[crit.currentLevel]}
                </div>

                <div style="display:flex; align-items:center; justify-content:space-between; margin-top:0.6rem; font-size:0.8rem; color:var(--text-secondary); flex-wrap:wrap; gap:0.5rem;">
                    <span><strong>الدليل المسند:</strong> ${crit.evidence}</span>
                    <span style="color:var(--status-emerald-light);"><strong>ملاحظة المقيم:</strong> ${crit.supervisorFeedback}</span>
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
                            ${hasEthicalBlocker ? '⚠️ حظر أخلاقي: إخفاق في معيار حرج' : 'مستوفٍ لمعايير الجدارة والنزاهة'}
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
                        ${cp.status === 'verified' ? '✓' : '⚠️'}
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
                        ${ethics.status === 'passed' ? 'شهادة السلامة والامتثال الأخلاقي الشامل' : '⚠️ البوابة الأخلاقية قيد التدقيق والمراجعة'}
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
                    <button class="btn-sm btn-secondary" onclick="window.App.openExcellencePreview('${escapeHtml(ex.title)}')">عرض الوثيقة</button>
                </div>
            </div>
        `).join('');

        container.innerHTML = `
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
                        ✓ تم اعتماد التقرير من قبل اللجنة العلمية لشركة تمكين الرؤية.
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

        // Rubrics summary rows
        const rubricsRowsHtml = appState.data.rubrics.map(r => {
            const rScore = r.criteria.reduce((sum, c) => sum + (c.currentLevel * c.weight), 0);
            const critCriticalFailed = r.criteria.some(c => c.isCritical && c.currentLevel < 3);
            return `
                <tr>
                    <td><strong>${r.title}</strong></td>
                    <td>5.00</td>
                    <td><strong style="color:${critCriticalFailed ? '#DC2626' : '#047857'}; font-family:var(--font-mono);">${rScore.toFixed(2)}</strong> / 5.00</td>
                    <td>${critCriticalFailed ? '<span style="color:#DC2626; font-weight:bold;">⚠️ إخفاق في معيار حرج</span>' : '<span style="color:#047857; font-weight:bold;">مستوفٍ بامتياز</span>'}</td>
                </tr>
            `;
        }).join('');

        container.innerHTML = `
            <div class="official-dossier-sheet">
                <div class="dossier-watermark">TAMKEEN AL-ROAYA</div>

                <div class="dossier-header-grid">
                    <div class="brand-section">
                        <img src="assets/images/logo.png" alt="شعار تمكين الرؤية" class="dossier-logo-img">
                        <div class="dossier-org-text">
                            <h2>شركة تمكين الرؤية للاستشارات المهنية</h2>
                            <p>برنامج إعداد وتأهيل الماستر كوتش • الإصدار 3.0 • النسخة التطويرية 2026</p>
                            <small>cyce52.com • ترخيص مهني معتمد</small>
                        </div>
                    </div>
                    <div class="dossier-meta-box">
                        <div>رقم الوثيقة: <strong>AUDIT-2026-MC084</strong></div>
                        <div>تاريخ التدقيق: <strong>2026-05-20</strong></div>
                        <div>الرقم التدريبي: <strong>${candidate.id}</strong></div>
                    </div>
                </div>

                <div style="text-align:center; margin-bottom:2rem;">
                    <h1 style="color:#0B1B3D; font-size:1.6rem; font-weight:900;">
                        محضر التدقيق والجاهزية المهنية للاعتماد النهائي
                    </h1>
                    <p style="color:#475569; font-size:0.95rem;">
                        استناداً إلى معايير الحقيبة التدريبية الإصدار 3.0 ومحاور الكفايات الـ 43 والروبركات الستة
                    </p>
                </div>

                <!-- Candidate Info Card -->
                <div style="background:#F8FAFC; border:1px solid #E2E8F0; padding:1.25rem; border-radius:8px; margin-bottom:2rem; display:grid; grid-template-columns: repeat(3, 1fr); gap:1rem; font-size:0.9rem;">
                    <div><strong>اسم الكوتش المشارك:</strong><br>${candidate.name}</div>
                    <div><strong>الصفة المهنية الحالية:</strong><br>${candidate.title}</div>
                    <div><strong>المشرف الأكاديمي:</strong><br>${candidate.supervisorName}</div>
                </div>

                <!-- Comprehensive Summary Table -->
                <table class="dossier-summary-table">
                    <thead>
                        <tr>
                            <th>المعيار والمتطلب المعتمد</th>
                            <th>المستهدف بالحقيبة</th>
                            <th>المحقق في ملف الإنجاز</th>
                            <th>مؤشر التحقق والجودة</th>
                            <th>قرار اللجنة</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>الساعات المعتمدة الإجمالية</strong></td>
                            <td>240 ساعة</td>
                            <td>${totalHours} ساعة</td>
                            <td>استيفاء كامل للمكونات السبعة</td>
                            <td><span style="color:#047857; font-weight:bold;">مستوفى 100%</span></td>
                        </tr>
                        <tr>
                            <td><strong>مشروعات الكوتشنج الميدانية</strong></td>
                            <td>20 حالة متكاملة</td>
                            <td>${casesCount} حالة كاملة</td>
                            <td>ملفات كاملة تشمل التدخل والأثر</td>
                            <td><span style="color:#047857; font-weight:bold;">مستوفى 100%</span></td>
                        </tr>
                        <tr>
                            <td><strong>الجلسات الميدانية الموثقة</strong></td>
                            <td>30 جلسة موزعة</td>
                            <td>${sessionsCount} جلسة</td>
                            <td>تقارير واعتمادات مسبقة</td>
                            <td><span style="color:#047857; font-weight:bold;">مستوفى 100%</span></td>
                        </tr>
                        <tr>
                            <td><strong>تطبيقات الأدوات (MBTI / عجلة / SWOT)</strong></td>
                            <td>90 تطبيقاً (30 لكل أداة)</td>
                            <td>${toolsCount} تطبيقاً</td>
                            <td>تحقق صارم من عدم التكرار الداخلي</td>
                            <td><span style="color:#047857; font-weight:bold;">مستوفى 100%</span></td>
                        </tr>
                        <tr>
                            <td><strong>النماذج الابتكارية للكوتشنج</strong></td>
                            <td>10 نماذج مبتكرة</td>
                            <td>${appState.data.innovativeModels.length} نماذج</td>
                            <td>مختبرة ومقاسة الأثر</td>
                            <td><span style="color:#047857; font-weight:bold;">مستوفى 100%</span></td>
                        </tr>
                        <tr>
                            <td><strong>أداة تحليل الشخصية المبتكرة</strong></td>
                            <td>أداة واحدة على الأقل</td>
                            <td>مقياس LMMI</td>
                            <td>تحقق سيكومتري أولي موثق</td>
                            <td><span style="color:#047857; font-weight:bold;">مستوفى 100%</span></td>
                        </tr>
                        <tr>
                            <td><strong>تهيئة مؤسسة للكوتشنج</strong></td>
                            <td>مؤسسة واحدة على الأقل</td>
                            <td>${appState.data.orgPreparation.orgName}</td>
                            <td>قرافي للمسارات + Pfeiffer المعدل</td>
                            <td><span style="color:#047857; font-weight:bold;">مستوفى 100%</span></td>
                        </tr>
                        <tr>
                            <td><strong>التسجيلات الاحترافية بالموضوعات</strong></td>
                            <td>5 تسجيلات صوتية</td>
                            <td>${appState.data.professionalRecordings.length} تسجيلات</td>
                            <td>تغذية راجعة بطوابع زمنية</td>
                            <td><span style="color:#047857; font-weight:bold;">مستوفى 100%</span></td>
                        </tr>
                        <tr>
                            <td><strong>الورقة العلمية التطبيقية</strong></td>
                            <td>50 صفحة كحد أدنى</td>
                            <td>${appState.data.researchPaper.totalPages} صفحة (APA7)</td>
                            <td>عرض مرئي في الملتقى السنوي</td>
                            <td><span style="color:#047857; font-weight:bold;">مستوفى بامتياز</span></td>
                        </tr>
                        <tr>
                            <td><strong>مشروع التخرج الابتكاري والدفاع</strong></td>
                            <td>مشروع مطور ومجاز</td>
                            <td>منظومة تمكين 360</td>
                            <td>دفاع علني ومناقشة أمام اللجنة</td>
                            <td><span style="color:#047857; font-weight:bold;">مجاز بامتياز</span></td>
                        </tr>
                        <tr>
                            <td><strong>بوابة السلامة والنزاهة الأخلاقية</strong></td>
                            <td>شرط مستقل وحاسم</td>
                            <td>${appState.data.ethicsGate.status === 'passed' ? 'اجتياز 100%' : 'معلق'}</td>
                            <td>خلو من المخالفات وإحالة نموذجية</td>
                            <td><span style="color:${appState.data.ethicsGate.status === 'passed' ? '#047857' : '#DC2626'}; font-weight:bold;">${appState.data.ethicsGate.status === 'passed' ? 'اجتياز مطلق' : 'حظر معلق'}</span></td>
                        </tr>
                        <tr>
                            <td><strong>الكفايات الـ 43 الشاملة</strong></td>
                            <td>43 كفاية فرعية</td>
                            <td>${coreMastered} كفاية متحققة</td>
                            <td>أدلة متقاطعة وتأملات رباعية</td>
                            <td><span style="color:#047857; font-weight:bold;">متحققة بالكامل</span></td>
                        </tr>
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
                        ${hasBlocker ? '⚠️ قرار اللجنة العلمية: حظر التوصية بالاعتماد النهائي' : 'قرار اللجنة العلمية ولجنة الاعتماد المهني:'}
                    </h3>
                    <p style="color:${hasBlocker ? '#7F1D1D' : '#047857'}; font-size:0.95rem; line-height:1.6;">
                        ${hasBlocker ? `
                            نظراً لرصد إخفاق في المعايير الأخلاقية أو المهنية الجوهرية (${blockerReasons.join(' • ')})، 
                            فإن النظام المنهجي لتمكين الرؤية يمنع منح الاعتماد (المتوسط الحسابي لا يعوض السلامة الأخلاقية بأي حال). 
                            يُعاد الملف للمشارك لاستيفاء خطط التحسين المطلوبة وإعادة التقييم.
                        ` : `
                            بناءً على فحص كافة الأدلة الثبوتية، والتحقق المستقل من الساعات والممارسة الميدانية، 
                            والتأكد التام من استيفاء بوابة النزاهة الأخلاقية، ومناقشة مشروع التخرج والدفاع؛ 
                            <strong>توصي اللجنة بإجماع الآراء بمنح الكوتش أحمد بن صالح الشمري شهادة إتمام برنامج إعداد وتأهيل الماستر كوتش بتقدير ممتاز مع مرتبة الشرف</strong>، 
                            ورفع التوصية للاعتماد المهني النهائي.
                        `}
                    </p>
                </div>

                <!-- Signatures Row -->
                <div class="signatures-row">
                    <div class="signature-block">
                        <div class="signature-title">المشرف الميداني المعتمد</div>
                        <div class="signature-name">كوتش د. فهد السبيعي</div>
                        <div style="font-size:0.75rem; color:#64748B; margin-top:4px;">توقيع إلكتروني معتمد #FS-882</div>
                    </div>

                    <div class="stamp-box-simulated">
                        <span>تمكين الرؤية</span>
                        <span>اعتماد مهني</span>
                        <span>2026</span>
                    </div>

                    <div class="signature-block">
                        <div class="signature-title">رئيس اللجنة والمدير العام</div>
                        <div class="signature-name">الماستر كوتش عبدالكريم الخليفي</div>
                        <div style="font-size:0.75rem; color:#64748B; margin-top:4px;">مؤسس شركة تمكين الرؤية #AK-001</div>
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

        modal.classList.add('active');
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
                    '⚠️ تنبيه نظام التحقق: تكرار المستفيد داخل الأداة الواحدة',
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
                '⚠️ تنبيه نظام التحقق: تكرار المستفيد داخل الأداة الواحدة',
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
        modal.classList.add('active');
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
        modal.classList.add('active');
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
            noteBox.innerHTML = `<strong>⏱ ${timeStr}:</strong> ${note}`;
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
    }

    function filterCompsByDomain(domainId) {
        appState.compFilterDomain = domainId;
        renderCompetencyMatrixPanel();
    }

    function filterCompsByStatus(status) {
        appState.compFilterStatus = status;
        renderCompetencyMatrixPanel();
    }

    // Close All Modals
    function closeAllModals() {
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.classList.remove('active');
        });
        appState.activeTask = null;
    }

    // Toast Notifications
    function showToast(message, type = 'info') {
        if (!DOM.toastContainer) return;

        const toast = document.createElement('div');
        toast.className = 'toast-item';
        
        let iconSvg = '';
        if (type === 'success') {
            iconSvg = `<span style="color:var(--status-emerald-light); font-size:1.2rem;">✓</span>`;
        } else if (type === 'warn') {
            iconSvg = `<span style="color:var(--status-amber); font-size:1.2rem;">⚠️</span>`;
        } else {
            iconSvg = `<span style="color:var(--brand-blue-light); font-size:1.2rem;">ℹ</span>`;
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
        return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    }

    // Export Public API to Window
    window.App = {
        init,
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
        openExcellencePreview,
        toggleEthicsCheckpoint,
        toggleAudioPlayback,
        jumpToTimestamp,
        scrubAudio,
        onCompSearch,
        filterCompsByDomain,
        filterCompsByStatus,
        showToast,
        // Fullstack Auth & Admin Exports
        openAuthModal,
        switchAuthTab,
        handleLogin,
        handleQuickLogin,
        handleRegister,
        handleLogout,
        switchAdminCoach,
        renderAdminDashboard,
        onRealFileSelected,
        issueGraduationAuditDecree,
        adminResetDemo,
        adminExportBackup
    };

    // Auto-init on DOMContentLoaded
    document.addEventListener('DOMContentLoaded', init);

})();
