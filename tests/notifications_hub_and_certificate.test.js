/**
 * Comprehensive Automated Test Suite for Live Notifications Hub,
 * Interactive Official Certificate Generator, Digital QR Verification,
 * Real-Time Cloud Network Status Monitor, and Data Table Search & Filters.
 *
 * Master Coach Qualification Platform v3.0 - Tamkeen Al-Roaya (cyce52.com)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { WebSocket } = require('ws');
const { app, initWebSocketServer } = require('../server/server');
const db = require('../server/database');
const { broadcastNotificationViaWS } = require('../server/websocket');

// Fresh database initialization with notifications seed
db.initializeDatabase(true);

const TEST_PORT = 3205;
let server = null;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const WS_URL = `ws://127.0.0.1:${TEST_PORT}/ws`;

let adminToken = '';
let coachToken = '';
let coachUser = null;
let coachRecord = null;
let testNotifId = null;

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
    console.log('=== بدء الفحص الآلي لمركز الإشعارات الحية والشهادة الرقمية والـ QR ===');
    console.log('================================================================\n');

    server = http.createServer(app);
    initWebSocketServer(server);
    await new Promise((resolve) => {
        server.listen(TEST_PORT, resolve);
    });
    console.log(`✓ خادم الفحص يعمل بنجاح على المنفذ: ${TEST_PORT}\n`);

    try {
        // ----------------------------------------------------
        // 1. تسجيل دخول الماستر كوتش الإداري والكوتش المرشح
        // ----------------------------------------------------
        console.log('--- 1. تسجيل دخول الإدارة والكوتش ---');
        const adminLogin = await request('/api/auth/login', {
            method: 'POST',
            json: { email: 'abdelkarim@cyce52.com', password: 'admin123' }
        });
        assert.strictEqual(adminLogin.status, 200, 'Admin login status');
        adminToken = adminLogin.body.token;

        const coachLogin = await request('/api/auth/login', {
            method: 'POST',
            json: { email: 'coach@cyce52.com', password: 'coach123' }
        });
        assert.strictEqual(coachLogin.status, 200, 'Coach login status');
        coachToken = coachLogin.body.token;
        coachUser = coachLogin.body.user;
        coachRecord = coachLogin.body.user.coach;
        console.log(`• تم تسجيل الدخول بنجاح للكوتش: ${coachUser.name} (ID: ${coachUser.id}, CoachID: ${coachRecord ? coachRecord.id : 'N/A'}) ✓`);

        // ----------------------------------------------------
        // 2. فحص قاعدة البيانات وتأصيل جدول الإشعارات
        // ----------------------------------------------------
        console.log('\n--- 2. فحص دوال قاعدة البيانات وجدول الإشعارات ---');
        const seededNotifs = db.getNotifications(coachUser.id);
        assert.ok(Array.isArray(seededNotifs), 'Seeded notifications should be an array');
        assert.ok(seededNotifs.length >= 3, 'Should have at least 3 seeded notifications for the coach');
        console.log(`• عدد الإشعارات الأولية المسترجعة من DB: ${seededNotifs.length} إشعاراً ✓`);

        const unreadCountBefore = db.getUnreadNotificationsCount(coachUser.id);
        assert.ok(unreadCountBefore > 0, 'Unread count should be greater than zero');
        console.log(`• عدد الإشعارات غير المقروءة: ${unreadCountBefore} إشعاراً ✓`);

        // Create new notification via DB
        const created = db.createNotification({
            userId: coachUser.id,
            type: 'voice_note',
            title: 'ملاحظة صوتية اختبارية على المهمة TASK-03',
            message: 'توجيه إشرافي صوتي من الماستر كوتش عبدالكريم.',
            linkAction: 'task:TASK-03',
            meta: { taskId: 'TASK-03' }
        });
        assert.ok(created && created.id, 'Notification should be created in DB');
        testNotifId = created.id;
        console.log(`• تم إنشاء إشعار جديد في DB بالمعرف: ${testNotifId} ✓`);

        // Mark as read in DB
        const markRes = db.markNotificationAsRead(testNotifId, coachUser.id);
        assert.strictEqual(markRes, true, 'Mark notification as read should return true');
        const unreadAfter = db.getUnreadNotificationsCount(coachUser.id);
        assert.strictEqual(unreadAfter, unreadCountBefore, 'Unread count should return to prior count');
        console.log('• تم وسم الإشعار كمقروء بنجاح في قاعدة البيانات ✓');

        // ----------------------------------------------------
        // 3. فحص نقاط الـ REST API لمركز الإشعارات
        // ----------------------------------------------------
        console.log('\n--- 3. فحص مسارات REST API لمركز الإشعارات والتنبيهات ---');

        // GET /api/notifications
        const getNotifsRes = await request('/api/notifications', { token: coachToken });
        assert.strictEqual(getNotifsRes.status, 200, 'GET /api/notifications should return 200');
        assert.ok(Array.isArray(getNotifsRes.body.notifications), 'Response notifications must be an array');
        assert.ok(getNotifsRes.body.notifications.length > 0, 'Must contain notifications');
        console.log(`• استرجاع قائمة الإشعارات عبر API: ${getNotifsRes.body.notifications.length} إشعاراً ✓`);

        // GET /api/notifications/unread-count
        const getUnreadRes = await request('/api/notifications/unread-count', { token: coachToken });
        assert.strictEqual(getUnreadRes.status, 200, 'GET /api/notifications/unread-count should return 200');
        assert.strictEqual(typeof getUnreadRes.body.unreadCount, 'number', 'unreadCount must be number');
        console.log(`• عداد الإشعارات غير المقروءة عبر API: ${getUnreadRes.body.unreadCount} ✓`);

        // Filter notifications by type
        const filterTypeRes = await request('/api/notifications?type=task_review', { token: coachToken });
        assert.strictEqual(filterTypeRes.status, 200);
        assert.ok(filterTypeRes.body.notifications.every(n => n.type === 'task_review'), 'All must match type');
        console.log('• تصفية الإشعارات حسب التصنيف (task_review) تعمل بدقة ✓');

        // POST /api/notifications (Create by supervisor/admin)
        const createNotifRes = await request('/api/notifications', {
            method: 'POST',
            token: adminToken,
            json: {
                userId: coachUser.id,
                type: 'rubric_update',
                title: 'تحديث روبرك كفايات القيادة RUB-EXEC إلى (5.0)',
                message: 'تم تدقيق كافة الشواهد وإجازة المستوى الخامس بنجاح.',
                linkAction: 'rubric:leadership'
            }
        });
        assert.strictEqual(createNotifRes.status, 201, 'POST /api/notifications should return 201');
        assert.ok(createNotifRes.body.notification && createNotifRes.body.notification.id, 'Created notif ID present');
        const adminCreatedId = createNotifRes.body.notification.id;
        console.log(`• إنشاء إشعار إشرافي جديد عبر الـ API بنجاح: ${adminCreatedId} ✓`);

        // Mark single as read
        const markSingleRes = await request(`/api/notifications/${adminCreatedId}/read`, {
            method: 'POST',
            token: coachToken
        });
        assert.strictEqual(markSingleRes.status, 200, 'POST /api/notifications/:id/read should return 200');
        assert.strictEqual(markSingleRes.body.success, true);
        console.log('• تحديد إشعار فردي كمقروء عبر الـ API بنجاح ✓');

        // Mark all as read
        const markAllRes = await request('/api/notifications/read-all', {
            method: 'POST',
            token: coachToken
        });
        assert.strictEqual(markAllRes.status, 200, 'POST /api/notifications/read-all should return 200');
        assert.strictEqual(markAllRes.body.success, true);

        const checkZeroUnread = await request('/api/notifications/unread-count', { token: coachToken });
        assert.strictEqual(checkZeroUnread.body.unreadCount, 0, 'Unread count should be 0 after read-all');
        console.log('• وسم الكل كمقروء (markAllRead) عبر API أعاد العداد لـ 0 بنجاح ✓');

        // Delete notification
        const deleteRes = await request(`/api/notifications/${adminCreatedId}`, {
            method: 'DELETE',
            token: coachToken
        });
        assert.strictEqual(deleteRes.status, 200, 'DELETE /api/notifications/:id should return 200');
        console.log('• حذف إشعار عبر الـ API يعمل بنجاح ✓');

        // ----------------------------------------------------
        // 4. فحص بوابة التحقق الرقمي العامة للشهادة ورمز QR
        // ----------------------------------------------------
        console.log('\n--- 4. فحص بوابة التحقق الرقمي العامة للشهادة ورمز QR ---');

        // Public verification for certified / enrolled coach
        const verifyRes = await request('/api/audit/verify?code=MC-2026-084');
        assert.strictEqual(verifyRes.status, 200, 'Public verify endpoint must return 200');
        assert.strictEqual(verifyRes.body.valid, true, 'Verification must be valid');
        assert.strictEqual(verifyRes.body.candidateCode, 'MC-2026-084', 'Candidate code matches');
        assert.strictEqual(verifyRes.body.candidateName, 'كوتش أحمد بن صالح الشمري', 'Candidate name matches');
        assert.ok(verifyRes.body.accreditationTitle, 'Must include accreditation title');
        assert.ok(Array.isArray(verifyRes.body.issuingBodies), 'Must include issuing bodies array');
        assert.ok(verifyRes.body.issuingBodies.some(b => b.includes('تمكين الرؤية')), 'Must mention Tamkeen Al-Roaya');
        assert.ok(verifyRes.body.issuingBodies.some(b => b.includes('الاتحاد العربي للكوتشنج')), 'Must mention Arab Coaching Federation');
        assert.strictEqual(verifyRes.body.digitalSealVerified, true, 'Digital seal verified flag');
        assert.strictEqual(verifyRes.body.metricsSummary.trainingAndPracticeHours, 240, 'Hours requirement');
        assert.strictEqual(verifyRes.body.metricsSummary.toolsApplicationsCompleted, 90, 'Tools requirement');
        assert.strictEqual(verifyRes.body.metricsSummary.integratedCasesLogged, 20, 'Cases requirement');
        assert.strictEqual(verifyRes.body.metricsSummary.fieldSessionsLogged, 30, 'Sessions requirement');
        assert.strictEqual(verifyRes.body.metricsSummary.competenciesMastered, 44, 'Competencies requirement');
        console.log(`• تم التحقق من شهادة [${verifyRes.body.candidateCode}]: ${verifyRes.body.candidateName} معتمدة رسمياً بنسبة 100% ✓`);
        console.log(`• المحضر الرقمي يتضمن الختم الإلكتروني، الساعات (240)، الأدوات (90)، الحالات (20)، والجلسات (30) ✓`);

        // Public verification for invalid code
        const invalidVerifyRes = await request('/api/audit/verify?code=INVALID-CODE-999');
        assert.strictEqual(invalidVerifyRes.status, 404, 'Invalid verification code must return 404');
        assert.strictEqual(invalidVerifyRes.body.valid, false, 'Invalid code valid flag must be false');
        console.log('• فحص رمز تحقق غير صحيح أعاد 404 و valid: false بنجاح ✓');

        // ----------------------------------------------------
        // 5. فحص تكامل WebSocket لبث الإشعارات الحية
        // ----------------------------------------------------
        console.log('\n--- 5. فحص تكامل WebSocket لبث الإشعارات الحية عبر الـ API ---');

        // 5.1 Direct WS helper broadcast
        await new Promise((resolve, reject) => {
            const ws = new WebSocket(`${WS_URL}?token=${coachToken}`);
            const timer = setTimeout(() => {
                ws.terminate();
                reject(new Error('WebSocket manual broadcast timeout'));
            }, 6000);

            ws.on('open', () => {
                setTimeout(() => {
                    broadcastNotificationViaWS(coachUser.id, {
                        id: 'ws-notif-manual',
                        type: 'task_review',
                        title: 'إشعار فوري حي يدوي عبر WebSocket',
                        message: 'تم استلام التغذية الراجعة اللحظية بنجاح.',
                        timestamp: new Date().toISOString()
                    });
                }, 100);
            });

            ws.on('message', (data) => {
                try {
                    const msg = JSON.parse(data.toString());
                    if (msg.type === 'NOTIFICATION_NEW' && msg.notification.id === 'ws-notif-manual') {
                        assert.strictEqual(msg.notification.title, 'إشعار فوري حي يدوي عبر WebSocket');
                        console.log('• 5.1 استلم العميل رسالة NOTIFICATION_NEW عبر البث اليدوي بنجاح ✓');
                        clearTimeout(timer);
                        ws.close();
                        resolve();
                    }
                } catch (e) {
                    clearTimeout(timer);
                    ws.terminate();
                    reject(e);
                }
            });

            ws.on('error', (err) => {
                clearTimeout(timer);
                reject(err);
            });
        });

        // 5.2 POST /api/notifications triggers WS push automatically
        await new Promise((resolve, reject) => {
            const ws = new WebSocket(`${WS_URL}?token=${coachToken}`);
            const timer = setTimeout(() => {
                ws.terminate();
                reject(new Error('WebSocket push via POST /api/notifications timeout'));
            }, 6000);

            ws.on('open', async () => {
                try {
                    const res = await request('/api/notifications', {
                        method: 'POST',
                        token: adminToken,
                        json: {
                            userId: coachUser.id,
                            type: 'ethics_alert',
                            title: 'تنبيه أخلاقي إشرافي مباشر',
                            message: 'يرجى مراجعة ميثاق السرية مع المستفيد BEN-12.',
                            linkAction: 'rubric:R1-SESSIONS'
                        }
                    });
                    assert.strictEqual(res.status, 201, 'POST /api/notifications must return 201');
                } catch (err) {
                    clearTimeout(timer);
                    ws.terminate();
                    reject(err);
                }
            });

            ws.on('message', (data) => {
                try {
                    const msg = JSON.parse(data.toString());
                    if (msg.type === 'NOTIFICATION_NEW' && msg.notification.title === 'تنبيه أخلاقي إشرافي مباشر') {
                        assert.strictEqual(msg.notification.type, 'ethics_alert');
                        console.log('• 5.2 إرسال POST /api/notifications أطلق بثاً لحظياً تلقائياً عبر WS واستلمه الكوتش ✓');
                        clearTimeout(timer);
                        ws.close();
                        resolve();
                    }
                } catch (e) {
                    clearTimeout(timer);
                    ws.terminate();
                    reject(e);
                }
            });

            ws.on('error', (err) => {
                clearTimeout(timer);
                reject(err);
            });
        });

        // 5.3 POST /api/tasks/:id/evaluate triggers WS push automatically
        await new Promise((resolve, reject) => {
            const ws = new WebSocket(`${WS_URL}?token=${coachToken}`);
            const timer = setTimeout(() => {
                ws.terminate();
                reject(new Error('WebSocket push via task evaluation timeout'));
            }, 6000);

            ws.on('open', async () => {
                try {
                    const res = await request('/api/tasks/TASK-01/evaluate', {
                        method: 'POST',
                        token: adminToken,
                        json: {
                            coachId: coachRecord.id,
                            status: 'approved',
                            grade: 5.0,
                            notes: 'اعتماد رسمي للمهمة الأولى مع ثناء إشرافي.'
                        }
                    });
                    assert.strictEqual(res.status, 200, 'POST /api/tasks/:id/evaluate must return 200');
                } catch (err) {
                    clearTimeout(timer);
                    ws.terminate();
                    reject(err);
                }
            });

            ws.on('message', (data) => {
                try {
                    const msg = JSON.parse(data.toString());
                    if (msg.type === 'NOTIFICATION_NEW' && msg.notification.type === 'task_review') {
                        assert.ok(msg.notification.title.includes('TASK-01'), 'Title mentions task id');
                        console.log('• 5.3 تقييم المهمة POST /api/tasks/:id/evaluate أطلق إشعاراً حياً تلقائياً عبر WS ✓');
                        clearTimeout(timer);
                        ws.close();
                        resolve();
                    }
                } catch (e) {
                    clearTimeout(timer);
                    ws.terminate();
                    reject(e);
                }
            });

            ws.on('error', (err) => {
                clearTimeout(timer);
                reject(err);
            });
        });

        // 5.4 POST /api/rubrics/evaluate triggers WS push automatically
        await new Promise((resolve, reject) => {
            const ws = new WebSocket(`${WS_URL}?token=${coachToken}`);
            const timer = setTimeout(() => {
                ws.terminate();
                reject(new Error('WebSocket push via rubric evaluation timeout'));
            }, 6000);

            ws.on('open', async () => {
                try {
                    const res = await request('/api/rubrics/evaluate', {
                        method: 'POST',
                        token: adminToken,
                        json: {
                            coachId: coachRecord.id,
                            rubricCode: 'sessions',
                            criterionId: 'R1-C1',
                            level: 5,
                            notes: 'مستوى استثنائي في بناء العلاقة والثقة.'
                        }
                    });
                    assert.strictEqual(res.status, 200, 'POST /api/rubrics/evaluate must return 200');
                } catch (err) {
                    clearTimeout(timer);
                    ws.terminate();
                    reject(err);
                }
            });

            ws.on('message', (data) => {
                try {
                    const msg = JSON.parse(data.toString());
                    if (msg.type === 'NOTIFICATION_NEW' && msg.notification.type === 'rubric_eval') {
                        assert.ok(msg.notification.title.includes('الروبرك') || msg.notification.title.includes('الجلسات'), 'Title mentions rubric');
                        console.log('• 5.4 تقييم الروبرك POST /api/rubrics/evaluate أطلق إشعاراً حياً تلقائياً عبر WS ✓');
                        clearTimeout(timer);
                        ws.close();
                        resolve();
                    }
                } catch (e) {
                    clearTimeout(timer);
                    ws.terminate();
                    reject(e);
                }
            });

            ws.on('error', (err) => {
                clearTimeout(timer);
                reject(err);
            });
        });

        // ----------------------------------------------------
        // 6. فحص سلامة واجهات HTML وتوافق عناصر الواجهة الجديدة
        // ----------------------------------------------------
        console.log('\n--- 6. فحص بنية index.html وملفات العرض للميزات الجديدة ---');
        const htmlPath = path.resolve(__dirname, '../index.html');
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');

        const newRequiredIds = [
            'network-status-badge',
            'network-status-text',
            'notification-hub-wrapper',
            'btn-notifications',
            'notification-badge',
            'notification-dropdown',
            'btn-certificate-viewer',
            'certificate-modal',
            'verify-modal'
        ];

        newRequiredIds.forEach(id => {
            assert.ok(htmlContent.includes(`id="${id}"`), `Element ID #${id} must exist in index.html`);
        });
        console.log(`• جميع معرفات DOM الجديدة (${newRequiredIds.length} عنصر) موجودة في index.html ✓`);

        // Check CSS classes
        const cssPath = path.resolve(__dirname, '../css/styles.css');
        const cssContent = fs.readFileSync(cssPath, 'utf8');
        const requiredClasses = [
            '.network-status-badge',
            '.notification-dropdown',
            '.notif-filter-tab',
            '.modal-dialog',
            '.cert-modal-dialog',
            '.royal-cert-frame',
            '.royal-cert-gold-seal',
            '.data-table-toolbar',
            '@media print'
        ];
        requiredClasses.forEach(cls => {
            assert.ok(cssContent.includes(cls), `CSS class/rule ${cls} must exist in styles.css`);
        });
        console.log(`• جميع قواعد CSS الفاخرة وأنماط الطباعة والشهادة الملكية وفئات المودال (${requiredClasses.length} فئة) موجودة في styles.css ✓`);

        // Check js/app.js exports
        const appJsPath = path.resolve(__dirname, '../js/app.js');
        const appJsContent = fs.readFileSync(appJsPath, 'utf8');
        const requiredExports = [
            'initNotificationsHub',
            'loadNotifications',
            'toggleNotificationHub',
            'markNotificationRead',
            'markAllNotificationsRead',
            'generateSvgQrCode',
            'openCertificateModal',
            'printCertificate',
            'copyCertificateVerifyLink',
            'openVerificationModal',
            'initNetworkStatusMonitor',
            'checkNetworkConnection',
            'updateNetworkStatus',
            'filterTasksTable',
            'filterCasesTable',
            'filterSessionsTable',
            'filterAdminRosterTable',
            'filterToolApplications',
            'runDebouncedSearch',
            'preserveFocusAndRender'
        ];
        requiredExports.forEach(fn => {
            assert.ok(appJsContent.includes(fn), `Exported function ${fn} must exist in js/app.js`);
        });
        console.log(`• جميع دوال التحكم والتصدير البرمجي والبحث الحي (${requiredExports.length} دالة) موجودة ومصدرة في window.App ✓`);

        console.log('\n================================================================');
        console.log('=== ✅ جميع اختبارات مركز الإشعارات والشهادة و QR اجتازت بنجاح 100% ===');
        console.log('================================================================\n');

    } finally {
        if (server) {
            await new Promise(resolve => server.close(resolve));
            console.log('✓ تم إغلاق خادم الفحص بنجاح.');
        }
    }
}

runTests().then(() => {
    process.exit(0);
}).catch(err => {
    console.error('❌ فشل في فحص مركز الإشعارات والشهادة الرقمية:', err);
    process.exit(1);
});
