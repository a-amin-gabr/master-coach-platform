/**
 * WebSocket Integration Test Suite for Master Coach Platform v3.0
 * Verifies:
 * 1. Connection & pre-handshake JWT authentication (?token=... and Sec-WebSocket-Protocol)
 * 2. Handshake rejection with invalid or missing tokens (401 Unauthorized) & invalid paths (404)
 * 3. Ping/Pong heartbeat (both application-level frame and low-level WS ping/pong)
 * 4. Bidirectional real-time message delivery & SQLite database persistence
 * 5. Dual-broadcast bridge: REST POST message broadcasting to connected WS clients
 * 6. Real-time typing indicators with sender suppression
 * 7. Channel segregation & privacy enforcement (supervisory 1-on-1 vs cohort group)
 * 8. Real-time read receipts & database last_read_message_id synchronization
 */

const assert = require('assert');
const http = require('http');
const { WebSocket } = require('ws');
const { app, initWebSocketServer } = require('../server/server');
const db = require('../server/database');

const TEST_PORT = 3198;
const BASE_HTTP_URL = `http://127.0.0.1:${TEST_PORT}`;
const BASE_WS_URL = `ws://127.0.0.1:${TEST_PORT}/ws`;

let server = null;
let adminToken = '';
let coachToken = '';
let saraToken = '';

let adminUser = null;
let coachUser = null;
let saraUser = null;

// Helper HTTP request function
async function httpRequest(endpoint, options = {}) {
    const url = `${BASE_HTTP_URL}${endpoint}`;
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
    return { status: res.status, body };
}

// Helper: Open WebSocket and wait for connection acknowledgement
function openAuthenticatedClient(url, options = {}) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(url, options.protocols, options);
        let ackReceived = false;

        const timer = setTimeout(() => {
            if (!ackReceived) {
                ws.close();
                reject(new Error('Timeout waiting for connection:ack from WebSocket server'));
            }
        }, 5000);

        ws.on('open', () => {
            // Wait for connection:ack frame
        });

        ws.on('message', function onInitMessage(data) {
            try {
                const msg = JSON.parse(data.toString());
                if (msg.type === 'connection:ack') {
                    ackReceived = true;
                    clearTimeout(timer);
                    ws.removeListener('message', onInitMessage);
                    resolve({ ws, ack: msg });
                }
            } catch (err) {
                clearTimeout(timer);
                reject(err);
            }
        });

        ws.on('error', (err) => {
            clearTimeout(timer);
            reject(err);
        });
    });
}

// Helper: Wait for next message of a specific type
function waitForEvent(ws, eventType, timeoutMs = 5000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            ws.removeListener('message', listener);
            reject(new Error(`Timeout waiting for event '${eventType}'`));
        }, timeoutMs);

        function listener(data) {
            try {
                const msg = JSON.parse(data.toString());
                if (msg.type === eventType) {
                    clearTimeout(timer);
                    ws.removeListener('message', listener);
                    resolve(msg);
                }
            } catch (_) {}
        }

        ws.on('message', listener);
    });
}

async function runWebSocketTests() {
    console.log('=== بدء الفحص الآلي الشامل لمحرك الويب سوكت (WebSocket Integration Suite) ===\n');

    // Initialize clean database state
    db.initializeDatabase(true);

    // Create and start dedicated test server
    server = http.createServer(app);
    initWebSocketServer(server);

    await new Promise((resolve) => {
        server.listen(TEST_PORT, resolve);
    });
    console.log(`✓ خادم الويب سوكت التجريبي يعمل بنجاح على المنفذ: ${TEST_PORT}`);

    const activeSockets = [];
    const track = (ws) => {
        activeSockets.push(ws);
        return ws;
    };

    try {
        // ----------------------------------------------------
        // Step 1: Authentication & Token Retrieval
        // ----------------------------------------------------
        console.log('\n--- 1. تسجيل الدخول واستخراج رموز JWT الحقيقية ---');

        const adminLogin = await httpRequest('/api/auth/login', {
            method: 'POST',
            json: { email: 'abdelkarim@cyce52.com', password: 'Master@2026' }
        });
        assert.strictEqual(adminLogin.status, 200, 'Admin login must succeed');
        adminToken = adminLogin.body.token;
        adminUser = adminLogin.body.user;

        const coachLogin = await httpRequest('/api/auth/login', {
            method: 'POST',
            json: { email: 'coach@cyce52.com', password: 'Coach@2026' }
        });
        assert.strictEqual(coachLogin.status, 200, 'Coach Ahmed login must succeed');
        coachToken = coachLogin.body.token;
        coachUser = coachLogin.body.user;

        const saraLogin = await httpRequest('/api/auth/login', {
            method: 'POST',
            json: { email: 'sara@cyce52.com', password: 'Coach@2026' }
        });
        assert.strictEqual(saraLogin.status, 200, 'Coach Sara login must succeed');
        saraToken = saraLogin.body.token;
        saraUser = saraLogin.body.user;

        console.log('• تم استخراج رموز JWT الصالحة لجميع الأدوار (مشرف + كوتش أحمد + كوتش سارة) ✓');

        // ----------------------------------------------------
        // Step 2: Successful Connection & Pre-handshake JWT Auth
        // ----------------------------------------------------
        console.log('\n--- 2. فحص المصافحة والتوثيق المسبق (Pre-Handshake JWT Authentication) ---');

        // 2a. Connect via URL Query Parameter (?token=...)
        const { ws: coachWs, ack: coachAck } = await openAuthenticatedClient(`${BASE_WS_URL}?token=${coachToken}`);
        track(coachWs);
        assert.strictEqual(coachAck.type, 'connection:ack');
        assert.strictEqual(coachAck.userId, coachUser.id);
        assert.strictEqual(coachAck.role, 'coach');
        assert.ok(Array.isArray(coachAck.channels), 'Channels list must be attached to ack');
        console.log('• اتصال الكوتش بنجاح عبر استعلام URL (?token=...) واستلام connection:ack ✓');

        // 2b. Connect via Sec-WebSocket-Protocol header
        const { ws: adminWs, ack: adminAck } = await openAuthenticatedClient(BASE_WS_URL, {
            protocols: ['Bearer', adminToken]
        });
        track(adminWs);
        assert.strictEqual(adminAck.type, 'connection:ack');
        assert.strictEqual(adminAck.userId, adminUser.id);
        assert.strictEqual(adminAck.role, 'admin');
        console.log('• اتصال الماستر كوتش بنجاح عبر ترويسة Sec-WebSocket-Protocol ✓');

        // ----------------------------------------------------
        // Step 3: Rejection with Missing / Invalid Tokens & Paths
        // ----------------------------------------------------
        console.log('\n--- 3. فحص الحظر الأمني: رفض الاتصالات غير الموثقة (401 Unauthorized) ---');

        // 3a. Missing token
        const rejectNoToken = await new Promise((resolve) => {
            const ws = new WebSocket(BASE_WS_URL);
            ws.on('unexpected-response', (req, res) => {
                resolve({ rejected: true, statusCode: res.statusCode });
            });
            ws.on('error', () => {
                resolve({ rejected: true });
            });
        });
        assert.strictEqual(rejectNoToken.rejected, true);
        if (rejectNoToken.statusCode) {
            assert.strictEqual(rejectNoToken.statusCode, 401);
        }
        console.log('• حظر الاتصال بدون رمز توثيق (401 Unauthorized Rejection) ✓');

        // 3b. Invalid/Forged JWT token
        const rejectBadToken = await new Promise((resolve) => {
            const ws = new WebSocket(`${BASE_WS_URL}?token=eyInvalidToken12345.bad.signature`);
            ws.on('unexpected-response', (req, res) => {
                resolve({ rejected: true, statusCode: res.statusCode });
            });
            ws.on('error', () => {
                resolve({ rejected: true });
            });
        });
        assert.strictEqual(rejectBadToken.rejected, true);
        if (rejectBadToken.statusCode) {
            assert.strictEqual(rejectBadToken.statusCode, 401);
        }
        console.log('• حظر الاتصال برمز توثيق مزور أو منتهي الصلاحية ✓');

        // 3c. Invalid path rejection (404)
        const rejectBadPath = await new Promise((resolve) => {
            const ws = new WebSocket(`ws://127.0.0.1:${TEST_PORT}/invalid/path?token=${coachToken}`);
            ws.on('unexpected-response', (req, res) => {
                resolve({ rejected: true, statusCode: res.statusCode });
            });
            ws.on('error', () => {
                resolve({ rejected: true });
            });
        });
        assert.strictEqual(rejectBadPath.rejected, true);
        if (rejectBadPath.statusCode) {
            assert.strictEqual(rejectBadPath.statusCode, 404);
        }
        console.log('• حظر ترقية المسارات غير المعرفة (404 Not Found) ✓');

        // ----------------------------------------------------
        // Step 4: Heartbeat Ping / Pong
        // ----------------------------------------------------
        console.log('\n--- 4. فحص نبضات القلب ومراقبة الاتصال (Heartbeat Ping / Pong) ---');

        // 4a. Application-level ping frame
        const pongPromise = waitForEvent(coachWs, 'pong');
        coachWs.send(JSON.stringify({ type: 'ping', correlationId: 'ping-101' }));
        const pongEvent = await pongPromise;
        assert.strictEqual(pongEvent.type, 'pong');
        assert.strictEqual(pongEvent.correlationId, 'ping-101');
        assert.ok(pongEvent.timestamp, 'Pong must include server timestamp');
        console.log('• استجابة نبضة القلب التطبيقية ({ type: "ping" } -> { type: "pong" }) بنجاح ✓');

        // 4b. Low-level protocol WebSocket ping frame
        const protocolPong = await new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Timeout on protocol pong')), 3000);
            coachWs.once('pong', () => {
                clearTimeout(timer);
                resolve(true);
            });
            coachWs.ping();
        });
        assert.strictEqual(protocolPong, true);
        console.log('• استجابة نبضة بروتوكول الويب سوكت الأساسي (WS Frame Level Ping/Pong) ✓');

        // ----------------------------------------------------
        // Step 5: Bidirectional Message Delivery & DB Persistence
        // ----------------------------------------------------
        console.log('\n--- 5. إرسال واستلام الرسائل الفورية وحفظها في قاعدة البيانات ---');

        // Direct Supervisory Channel (Channel 2: Ahmed & Abdelkarim)
        const directChannelId = 2;
        const msgText = `رسالة إشرافية عبر الويب سوكت [${Date.now()}]`;

        const adminMsgPromise = waitForEvent(adminWs, 'chat:message');
        coachWs.send(JSON.stringify({
            type: 'chat:send',
            payload: {
                channelId: directChannelId,
                messageType: 'text',
                content: msgText
            }
        }));

        const receivedEvent = await adminMsgPromise;
        assert.strictEqual(receivedEvent.channelId, directChannelId);
        assert.strictEqual(receivedEvent.message.content, msgText);
        assert.strictEqual(receivedEvent.message.sender_id, coachUser.id);
        assert.strictEqual(receivedEvent.message.sender_name, coachUser.name);
        console.log('• استلام الماستر كوتش للرسالة الفورية من الكوتش المتدرب في الزمن الحقيقي ✓');

        // Verify SQLite database persistence
        const sqlite = db.getDb();
        const persisted = sqlite.prepare('SELECT * FROM chat_messages WHERE id = ?').get(receivedEvent.message.id);
        assert.ok(persisted, 'Message must be persisted in SQLite table');
        assert.strictEqual(persisted.channel_id, directChannelId);
        assert.strictEqual(persisted.content, msgText);
        assert.strictEqual(persisted.sender_id, coachUser.id);
        console.log(`• التحقق من حفظ الرسالة في قاعدة البيانات (ID: ${persisted.id}): مطابق 100% ✓`);

        // ----------------------------------------------------
        // Step 6: Dual-Broadcast Bridge (REST POST -> WS Broadcast)
        // ----------------------------------------------------
        console.log('\n--- 6. فحص جسر المزامنة المزدوج (Dual-Broadcast Bridge: REST to WS) ---');

        const restMsgText = `رسالة عبر واجهة REST مع بث متزامن للويب سوكت [${Date.now()}]`;
        const coachReceiveFromRestPromise = waitForEvent(coachWs, 'chat:message');

        const restPostRes = await httpRequest(`/api/chat/channels/${directChannelId}/messages`, {
            method: 'POST',
            token: adminToken,
            json: {
                messageType: 'text',
                content: restMsgText
            }
        });
        assert.strictEqual(restPostRes.status, 201);

        const bridgeEvent = await coachReceiveFromRestPromise;
        assert.strictEqual(bridgeEvent.channelId, directChannelId);
        assert.strictEqual(bridgeEvent.message.content, restMsgText);
        assert.strictEqual(bridgeEvent.message.sender_id, adminUser.id);
        console.log('• استلام رسالة REST بنجاح في عميل الويب سوكت عبر جسر البث المتزامن ✓');

        // ----------------------------------------------------
        // Step 7: Real-Time Typing Indicators
        // ----------------------------------------------------
        console.log('\n--- 7. فحص مؤشرات الكتابة الحية (Typing Indicators) ---');

        let coachSawSelfTyping = false;
        const coachSelfTypingListener = (data) => {
            try {
                const parsed = JSON.parse(data.toString());
                if (parsed.type === 'chat:typing' && parsed.userId === coachUser.id) {
                    coachSawSelfTyping = true;
                }
            } catch (_) {}
        };
        coachWs.on('message', coachSelfTypingListener);

        const adminTypingPromise = waitForEvent(adminWs, 'chat:typing');
        coachWs.send(JSON.stringify({
            type: 'chat:typing',
            payload: {
                channelId: directChannelId,
                isTyping: true
            }
        }));

        const typingEvent = await adminTypingPromise;
        assert.strictEqual(typingEvent.channelId, directChannelId);
        assert.strictEqual(typingEvent.userId, coachUser.id);
        assert.strictEqual(typingEvent.userName, coachUser.name);
        assert.strictEqual(typingEvent.isTyping, true);

        await new Promise(r => setTimeout(r, 100));
        assert.strictEqual(coachSawSelfTyping, false, 'Sender must not receive their own typing indicator');
        coachWs.removeListener('message', coachSelfTypingListener);
        console.log('• بث مؤشر الكتابة للمستقبل وحجبه عن المرسل: تم بنجاح تام ✓');

        // ----------------------------------------------------
        // Step 8: Channel Segregation & Privacy Isolation
        // ----------------------------------------------------
        console.log('\n--- 8. فحص عزل القنوات وحماية خصوصية الإشراف الفردي (Channel Segregation) ---');

        // Connect Coach Sara to WebSocket
        const { ws: saraWs } = await openAuthenticatedClient(`${BASE_WS_URL}?token=${saraToken}`);
        track(saraWs);

        // Verify Sara cannot overhear Ahmed's private direct channel (Channel 2)
        let saraReceivedPrivateLeak = false;
        const saraLeakListener = (data) => {
            try {
                const parsed = JSON.parse(data.toString());
                if (parsed.channelId === directChannelId || (parsed.payload && parsed.payload.channelId === directChannelId)) {
                    saraReceivedPrivateLeak = true;
                }
            } catch (_) {}
        };
        saraWs.on('message', saraLeakListener);

        // Coach Ahmed sends private supervisory message
        const privateSecretMsg = `سر إشرافي خاص بين أحمد والماستر كوتش [${Date.now()}]`;
        const adminPrivatePromise = waitForEvent(adminWs, 'chat:message');

        coachWs.send(JSON.stringify({
            type: 'chat:send',
            payload: {
                channelId: directChannelId,
                messageType: 'text',
                content: privateSecretMsg
            }
        }));

        await adminPrivatePromise;
        await new Promise(r => setTimeout(r, 200));

        assert.strictEqual(saraReceivedPrivateLeak, false, 'Coach Sara must never receive messages from Ahmed supervisory channel');
        saraWs.removeListener('message', saraLeakListener);
        console.log('• حماية الخصوصية: الكوتش سارة معزولة تماماً ولا تستلم أي رسائل من قناة الإشراف الفردي ✓');

        // Unauthorized send rejection: Sara tries to send to Channel 2
        const saraErrorPromise = waitForEvent(saraWs, 'error');
        saraWs.send(JSON.stringify({
            type: 'chat:send',
            payload: {
                channelId: directChannelId,
                messageType: 'text',
                content: 'محاولة اختراق غير مصرح بها'
            }
        }));
        const saraError = await saraErrorPromise;
        assert.strictEqual(saraError.code, 'FORBIDDEN');
        console.log('• رفض إرسال الكوتش غير المصرح له في قناة إشراف فردي (FORBIDDEN 403 Error Frame) ✓');

        // Group Cohort Channel (Channel 1: ديوان زمالة الماستر كوتش)
        // Master Coach broadcasts decree to all cohort members
        const groupChannelId = 1;
        const cohortDecree = `توجيه إشرافي عام لجميع كوتشز الدفعة [${Date.now()}]`;

        const ahmedCohortPromise = waitForEvent(coachWs, 'chat:message');
        const saraCohortPromise = waitForEvent(saraWs, 'chat:message');

        adminWs.send(JSON.stringify({
            type: 'chat:send',
            payload: {
                channelId: groupChannelId,
                messageType: 'text',
                content: cohortDecree
            }
        }));

        const [ahmedReceived, saraReceived] = await Promise.all([ahmedCohortPromise, saraCohortPromise]);
        assert.strictEqual(ahmedReceived.channelId, groupChannelId);
        assert.strictEqual(ahmedReceived.message.content, cohortDecree);
        assert.strictEqual(saraReceived.channelId, groupChannelId);
        assert.strictEqual(saraReceived.message.content, cohortDecree);
        console.log('• بث تعميم ديوان الزمالة الجماعي: استلمه الكوتش أحمد والكوتش سارة بالتزامن ✓');

        // ----------------------------------------------------
        // Step 9: Read Receipts & Synchronization
        // ----------------------------------------------------
        console.log('\n--- 9. فحص إشعارات القراءة وتحديث المعرف الأخير (Read Receipts) ---');

        const readReceiptPromise = waitForEvent(adminWs, 'chat:read_receipt');
        coachWs.send(JSON.stringify({
            type: 'chat:read',
            payload: {
                channelId: directChannelId,
                messageId: persisted.id
            }
        }));

        const receiptEvent = await readReceiptPromise;
        assert.strictEqual(receiptEvent.channelId, directChannelId);
        assert.strictEqual(receiptEvent.userId, coachUser.id);
        assert.strictEqual(receiptEvent.messageId, persisted.id);

        // Verify DB update
        const memberRow = sqlite.prepare('SELECT last_read_message_id FROM chat_channel_members WHERE channel_id = ? AND user_id = ?').get(directChannelId, coachUser.id);
        assert.ok(memberRow.last_read_message_id >= persisted.id, 'last_read_message_id must be updated');
        console.log(`• تحديث حالة القراءة في قاعدة البيانات (last_read_message_id: ${memberRow.last_read_message_id}) وبث إشعار chat:read_receipt ✓`);

        console.log('\n================================================================');
        console.log('✅ جميع اختبارات خادم الويب سوكت (WebSocket Integration Suite) اجتازت بنجاح 100%');
        console.log('================================================================\n');

    } finally {
        for (const ws of activeSockets) {
            try {
                if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                    ws.terminate();
                }
            } catch (_) {}
        }
        if (server) {
            await new Promise((resolve) => server.close(resolve));
            console.log('✓ تم إغلاق خادم اختبار الويب سوكت بنجاح.');
        }
    }
}

// Execute when invoked directly
if (require.main === module) {
    runWebSocketTests().then(() => {
        process.exit(0);
    }).catch((err) => {
        console.error('❌ فشل في اختبارات الويب سوكت:', err);
        process.exit(1);
    });
}

module.exports = { runWebSocketTests };
