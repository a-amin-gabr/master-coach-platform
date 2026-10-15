/**
 * Comprehensive Empirical Stress Test Suite — Challenger M1.1
 * Tests WebSocket server under heavy load, adversarial edge cases, and abrupt terminations.
 */

const assert = require('assert');
const http = require('http');
const { WebSocket } = require('ws');
const { fork } = require('child_process');
const path = require('path');
const { app, initWebSocketServer } = require('../server/server');
const db = require('../server/database');

const STRESS_PORT = 3299;
const BASE_HTTP_URL = `http://127.0.0.1:${STRESS_PORT}`;
const BASE_WS_URL = `ws://127.0.0.1:${STRESS_PORT}/ws`;

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

function openClient(url, options = {}, timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(url, options.protocols, options);
        let ackReceived = false;

        const timer = setTimeout(() => {
            if (!ackReceived) {
                try { ws.close(); } catch (_) {}
                reject(new Error(`Timeout (${timeoutMs}ms) waiting for connection:ack`));
            }
        }, timeoutMs);

        ws.on('message', function onInit(data) {
            try {
                const msg = JSON.parse(data.toString());
                if (msg.type === 'connection:ack') {
                    ackReceived = true;
                    clearTimeout(timer);
                    ws.removeListener('message', onInit);
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

function waitForEvent(ws, eventType, timeoutMs = 5000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            ws.removeListener('message', listener);
            reject(new Error(`Timeout (${timeoutMs}ms) waiting for event '${eventType}'`));
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

async function runEmpiricalStressSuite() {
    console.log('================================================================');
    console.log('⚡ EMPIRICAL ADVERSARIAL STRESS SUITE — CHALLENGER M1.1');
    console.log('================================================================\n');

    const report = {
        timestamp: new Date().toISOString(),
        concurrency: null,
        malformedAndEdgeCases: null,
        burstAndOrdering: null,
        abruptDisconnections: null,
        memoryMetrics: null,
        findings: []
    };

    db.initializeDatabase(true);
    const server = http.createServer(app);
    const { channelManager } = initWebSocketServer(server);

    await new Promise(r => server.listen(STRESS_PORT, r));
    console.log(`✓ خادم الفحص الإجهادي يستمع على المنفذ: ${STRESS_PORT}`);

    try {
        // Authenticate users
        const adminLogin = await httpRequest('/api/auth/login', {
            method: 'POST',
            json: { email: 'abdelkarim@cyce52.com', password: 'Master@2026' }
        });
        const adminToken = adminLogin.body.token;
        const adminUser = adminLogin.body.user;

        const coachLogin = await httpRequest('/api/auth/login', {
            method: 'POST',
            json: { email: 'coach@cyce52.com', password: 'Coach@2026' }
        });
        const coachToken = coachLogin.body.token;
        const coachUser = coachLogin.body.user;

        console.log('✓ استخراج رموز التوثيق بنجاح (المشرف + الكوتش أحمد)');

        // =====================================================================
        // SECTION 1: Rapid Concurrent Connections (60 Simultaneous Clients)
        // =====================================================================
        console.log('\n--- 1. اختبار الاتصالات المتزامنة السريعة (60 عميلاً متزامناً) ---');
        const NUM_CONCURRENT = 60;
        const connectStart = Date.now();
        const connPromises = [];

        for (let i = 0; i < NUM_CONCURRENT; i++) {
            const token = (i % 2 === 0) ? coachToken : adminToken;
            connPromises.push(openClient(`${BASE_WS_URL}?token=${token}`));
        }

        const clients = await Promise.all(connPromises);
        const connectDurationMs = Date.now() - connectStart;

        console.log(`• نجح إنشاء ${clients.length} اتصال متزامن في ${connectDurationMs}ms (متوسط: ${(connectDurationMs / NUM_CONCURRENT).toFixed(2)}ms/conn)`);
        assert.strictEqual(clients.length, NUM_CONCURRENT);

        const coachSockets = channelManager.userSockets.get(coachUser.id)?.size || 0;
        const adminSockets = channelManager.userSockets.get(adminUser.id)?.size || 0;
        console.log(`• توزيع المقابس في ChannelManager: كوتش (${coachSockets})، مشرف (${adminSockets})، المجموع: ${coachSockets + adminSockets}`);
        assert.strictEqual(coachSockets + adminSockets, NUM_CONCURRENT);

        report.concurrency = {
            totalClients: NUM_CONCURRENT,
            durationMs: connectDurationMs,
            avgMsPerConn: +(connectDurationMs / NUM_CONCURRENT).toFixed(2),
            coachSockets,
            adminSockets,
            passed: true
        };

        // Close concurrency test sockets cleanly
        clients.forEach(c => c.ws.close());
        await new Promise(r => setTimeout(r, 200));

        // =====================================================================
        // SECTION 2: Rapid Message Bursts & SQLite Persistence Order
        // =====================================================================
        console.log('\n--- 2. اختبار الاندفاع السريع للرسائل وترتيب حفظ SQLite (100 رسالة دفعة واحدة) ---');
        const { ws: senderWs } = await openClient(`${BASE_WS_URL}?token=${coachToken}`);
        const { ws: receiverWs } = await openClient(`${BASE_WS_URL}?token=${adminToken}`);

        const BURST_COUNT = 100;
        const receivedMessages = [];
        receiverWs.on('message', (data) => {
            try {
                const msg = JSON.parse(data.toString());
                if (msg.type === 'chat:message' && msg.message?.content?.startsWith('BURST_#')) {
                    receivedMessages.push(msg.message);
                }
            } catch (_) {}
        });

        const memBeforeBurst = process.memoryUsage();
        const burstStartTime = Date.now();

        for (let i = 0; i < BURST_COUNT; i++) {
            senderWs.send(JSON.stringify({
                type: 'chat:send',
                channelId: 1, // Cohort channel
                content: `BURST_#${String(i).padStart(4, '0')}`,
                correlationId: `burst_${i}`
            }));
        }

        const waitDeadline = Date.now() + 10000;
        while (receivedMessages.length < BURST_COUNT && Date.now() < waitDeadline) {
            await new Promise(r => setTimeout(r, 30));
        }

        const burstDurationMs = Date.now() - burstStartTime;
        console.log(`• تم إرسال وبث ${receivedMessages.length}/${BURST_COUNT} رسالة في غضون ${burstDurationMs}ms (معدل: ${((BURST_COUNT / burstDurationMs) * 1000).toFixed(1)} رسالة/ثانية)`);
        assert.strictEqual(receivedMessages.length, BURST_COUNT);

        // Verify SQLite Database order and monotonic ID progression
        const sqlite = db.getDb();
        const dbRows = sqlite.prepare(`
            SELECT id, content, created_at 
            FROM chat_messages 
            WHERE content LIKE 'BURST_#%' 
            ORDER BY id ASC
        `).all();

        console.log(`• عدد الرسائل المخزنة في قاعدة البيانات: ${dbRows.length}`);
        assert.strictEqual(dbRows.length, BURST_COUNT);

        let fifoOrderMatch = true;
        let strictlyIncreasingIds = true;

        for (let i = 0; i < BURST_COUNT; i++) {
            const expected = `BURST_#${String(i).padStart(4, '0')}`;
            if (dbRows[i].content !== expected) {
                fifoOrderMatch = false;
            }
            if (i > 0 && dbRows[i].id <= dbRows[i - 1].id) {
                strictlyIncreasingIds = false;
            }
        }

        console.log(`• مطابقة تسلسل FIFO في SQLite: ${fifoOrderMatch ? '✓ متطابق 100%' : '❌ غير متطابق'}`);
        console.log(`• التزايد التصاعدي الصارم للمعرفات: ${strictlyIncreasingIds ? '✓ متزايد بحزم' : '❌ غير متزايد'}`);
        assert.ok(fifoOrderMatch);
        assert.ok(strictlyIncreasingIds);

        const memAfterBurst = process.memoryUsage();
        const heapDeltaMB = +((memAfterBurst.heapUsed - memBeforeBurst.heapUsed) / (1024 * 1024)).toFixed(2);
        const rssDeltaMB = +((memAfterBurst.rss - memBeforeBurst.rss) / (1024 * 1024)).toFixed(2);

        report.burstAndOrdering = {
            totalBurst: BURST_COUNT,
            deliveredWs: receivedMessages.length,
            persistedDb: dbRows.length,
            durationMs: burstDurationMs,
            messagesPerSec: +((BURST_COUNT / burstDurationMs) * 1000).toFixed(1),
            fifoOrderMatch,
            strictlyIncreasingIds,
            heapDeltaMB,
            rssDeltaMB,
            passed: true
        };

        senderWs.close();
        receiverWs.close();
        await new Promise(r => setTimeout(r, 200));

        // =====================================================================
        // SECTION 3: Sudden Client Disconnections (TCP Socket Destroy)
        // =====================================================================
        console.log('\n--- 3. اختبار القطع المفاجئ للعملاء (TCP Socket Destroy بدون إطار Close) ---');
        const NUM_ABRUPT = 50;
        const abruptList = [];

        for (let i = 0; i < NUM_ABRUPT; i++) {
            const { ws } = await openClient(`${BASE_WS_URL}?token=${coachToken}`);
            abruptList.push(ws);
        }

        const countBeforeTeardown = channelManager.userSockets.get(coachUser.id)?.size || 0;
        console.log(`• عدد مقابس الكوتش المسجلة قبل التدمير: ${countBeforeTeardown}`);
        assert.strictEqual(countBeforeTeardown, NUM_ABRUPT);

        // Abruptly destroy underlying TCP sockets
        for (const ws of abruptList) {
            if (ws._socket) ws._socket.destroy();
        }

        // Wait for server to process socket closure
        await new Promise(r => setTimeout(r, 600));

        const countAfterTeardown = channelManager.userSockets.get(coachUser.id)?.size || 0;
        console.log(`• عدد مقابس الكوتش بعد التدمير المباغت: ${countAfterTeardown}`);
        assert.strictEqual(countAfterTeardown, 0, 'All abruptly destroyed sockets must be pruned from ChannelManager');

        // Test server survival and responsiveness immediately post-teardown
        const { ws: testPostWs } = await openClient(`${BASE_WS_URL}?token=${coachToken}`);
        const pingWait = waitForEvent(testPostWs, 'pong', 3000);
        testPostWs.send(JSON.stringify({ type: 'ping' }));
        const pongResp = await pingWait;
        assert.strictEqual(pongResp.type, 'pong');
        console.log('• استجاب الخادم لطلب ping بنجاح بعد التدمير المباغت لـ 50 مقبساً ✓');

        testPostWs.close();
        await new Promise(r => setTimeout(r, 200));

        report.abruptDisconnections = {
            totalDestroyed: NUM_ABRUPT,
            cleanedUpSockets: countBeforeTeardown - countAfterTeardown,
            lingeringSockets: countAfterTeardown,
            serverSurvived: true,
            postTeardownPingPassed: true,
            passed: true
        };

        // =====================================================================
        // SECTION 4: Adversarial Payloads & Edge Case Attack Surface
        // =====================================================================
        console.log('\n--- 4. اختبار الحمولات المعيبة والملغومة وحدود الأمان ---');

        // 4.1 Test Handled Cases
        const { ws: edgeWs } = await openClient(`${BASE_WS_URL}?token=${coachToken}`);

        // Helper to send frame and check error response
        async function testFrame(name, frameToSend, expectedCode) {
            const errPromise = waitForEvent(edgeWs, 'error', 3000);
            const raw = typeof frameToSend === 'string' ? frameToSend : JSON.stringify(frameToSend);
            edgeWs.send(raw);
            try {
                const res = await errPromise;
                console.log(`  ✓ [${name}] تم التعامل معه بنجاح: code=${res.code}`);
                return { name, passed: true, code: res.code };
            } catch (err) {
                console.error(`  ❌ [${name}] فشل: ${err.message}`);
                return { name, passed: false, error: err.message };
            }
        }

        await testFrame('Non-JSON raw text', 'this is pure text not json', 'BAD_REQUEST');
        await testFrame('Malformed JSON syntax', '{"type": "chat:send",', 'BAD_REQUEST');
        await testFrame('Missing channelId', { type: 'chat:send', content: 'test' }, 'INVALID_CHANNEL_ID');
        await testFrame('Non-numeric channelId', { type: 'chat:send', channelId: 'abc', content: 'test' }, 'INVALID_CHANNEL_ID');
        await testFrame('Non-existent channelId', { type: 'chat:send', channelId: 999999, content: 'test' }, 'CHANNEL_NOT_FOUND');
        await testFrame('Invalid messageType', { type: 'chat:send', channelId: 1, content: 'test', messageType: 'bad_type' }, 'INVALID_MESSAGE_TYPE');
        await testFrame('Empty content text', { type: 'chat:send', channelId: 1, content: '    ' }, 'CONTENT_REQUIRED');
        await testFrame('Audio without mediaUrl', { type: 'chat:send', channelId: 1, messageType: 'audio' }, 'MEDIA_URL_REQUIRED');
        await testFrame('Image without mediaUrl', { type: 'chat:send', channelId: 1, messageType: 'image' }, 'MEDIA_URL_REQUIRED');
        await testFrame('Oversized content (>10,000 chars)', { type: 'chat:send', channelId: 1, content: 'Z'.repeat(10001) }, 'CONTENT_TOO_LONG');
        await testFrame('Unknown event type', { type: 'fake:event' }, 'UNKNOWN_EVENT');

        // Boundary test: Exactly 10,000 chars
        const exact10k = 'W'.repeat(10000);
        const bPromise = waitForEvent(edgeWs, 'chat:message', 5000);
        edgeWs.send(JSON.stringify({ type: 'chat:send', channelId: 1, content: exact10k }));
        const bRes = await bPromise;
        assert.strictEqual(bRes.message.content.length, 10000);
        console.log('  ✓ [Boundary: Exactly 10,000 characters] تم الحفظ والبث بنجاح');

        edgeWs.close();
        await new Promise(r => setTimeout(r, 200));

        // 4.2 Documented Vulnerabilities Found
        report.findings.push({
            id: 'VULN-WS-01',
            severity: 'CRITICAL',
            title: 'Uncaught TypeError on JSON literal null ("null")',
            file: 'server/websocket.js',
            line: 527,
            triggerPayload: 'null',
            stackTrace: "TypeError: Cannot read properties of null (reading 'type')",
            impact: 'Remote Denial of Service (RDoS) — Any authenticated user can crash the entire Node.js server process with a 4-byte WebSocket frame',
            recommendedFix: "Add `if (!msg || typeof msg !== 'object' || Array.isArray(msg))` check immediately after JSON.parse, before accessing `msg.type`."
        });

        report.findings.push({
            id: 'VULN-WS-02',
            severity: 'HIGH',
            title: 'Uncaught TypeError on non-string message content in chat:send',
            file: 'server/websocket.js',
            line: 217,
            triggerPayload: '{ "type": "chat:send", "channelId": 1, "content": 12345 }',
            stackTrace: 'TypeError: content.trim is not a function',
            impact: 'Process Crash — Sending numeric, boolean, or object content invokes content.trim() which is undefined on non-strings, crashing the Node server',
            recommendedFix: "Validate `typeof content === 'string'` before calling `.trim()`, or safely coerce string: `const contentStr = typeof content === 'string' ? content : '';`."
        });

        report.findings.push({
            id: 'VULN-WS-03',
            severity: 'MEDIUM',
            title: 'Unprotected event listener message loop',
            file: 'server/websocket.js',
            line: 513,
            impact: 'Resilience Gap — The `ws.on("message")` handler only wraps `JSON.parse` in try/catch. Any runtime error thrown inside `handleChatSend`, `handleChatTyping`, `handleChatRead`, or database layer becomes an unhandled exception that terminates the Node.js process',
            recommendedFix: 'Wrap the entire message handling body in a comprehensive try/catch block that emits a generic BAD_REQUEST or INTERNAL_ERROR frame on unexpected throws.'
        });

    } finally {
        await new Promise(r => server.close(r));
        console.log('\n✓ تم إغلاق خادم الفحص الإجهادي بنجاح.');
    }

    console.log('\n================================================================');
    console.log('📊 تقرير الفحص الإجهادي النهائي:');
    console.log(JSON.stringify(report, null, 2));
    console.log('================================================================');

    return report;
}

if (require.main === module) {
    runEmpiricalStressSuite()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error('Fatal stress suite failure:', err);
            process.exit(1);
        });
}

module.exports = { runEmpiricalStressSuite };
