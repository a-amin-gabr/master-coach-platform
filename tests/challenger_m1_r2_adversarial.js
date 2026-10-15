/**
 * Challenger Round 2 Adversarial Stress Harness
 * Milestone 1 (Iteration 2) Deep Empirical Challenge
 */

const assert = require('assert');
const http = require('http');
const { WebSocket } = require('ws');
const { app, initWebSocketServer } = require('../server/server');
const db = require('../server/database');

const HARNESS_PORT = 3399;
const WS_URL = `ws://127.0.0.1:${HARNESS_PORT}/ws`;
const HTTP_URL = `http://127.0.0.1:${HARNESS_PORT}`;

async function runAdversarialHarness() {
    console.log('================================================================');
    console.log('⚔️  CHALLENGER R2: DEEP ADVERSARIAL & CHAOS STRESS HARNESS');
    console.log('================================================================\n');

    db.initializeDatabase(true);
    const server = http.createServer(app);
    const { channelManager } = initWebSocketServer(server);

    await new Promise(r => server.listen(HARNESS_PORT, r));
    console.log(`✓ Test server running on port ${HARNESS_PORT}`);

    // Track uncaught exceptions
    const uncaught = [];
    const onUncaught = (err) => {
        uncaught.push({ message: err.message, stack: err.stack });
        console.error('🔥 UNCAUGHT EXCEPTION CAUGHT:', err.message);
    };
    process.on('uncaughtException', onUncaught);

    const testResults = [];
    function record(name, passed, details = '') {
        testResults.push({ name, passed, details });
        const tag = passed ? '✅ PASS' : '❌ FAIL';
        console.log(`  [${tag}] ${name} ${details ? '(' + details + ')' : ''}`);
    }

    try {
        // Authenticate coach & admin
        const coachRes = await fetch(`${HTTP_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'coach@cyce52.com', password: 'Coach@2026' })
        });
        const { token: coachToken, user: coachUser } = await coachRes.json();

        const adminRes = await fetch(`${HTTP_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'abdelkarim@cyce52.com', password: 'Master@2026' })
        });
        const { token: adminToken, user: adminUser } = await adminRes.json();

        // Helper to connect client
        function openClient(token) {
            return new Promise((resolve, reject) => {
                const ws = new WebSocket(`${WS_URL}?token=${token}`);
                const timer = setTimeout(() => {
                    try { ws.close(); } catch (_) {}
                    reject(new Error('Connect timeout'));
                }, 5000);
                ws.on('message', function init(d) {
                    try {
                        const m = JSON.parse(d.toString());
                        if (m.type === 'connection:ack') {
                            clearTimeout(timer);
                            ws.removeListener('message', init);
                            resolve(ws);
                        }
                    } catch (_) {}
                });
                ws.on('error', (e) => {
                    clearTimeout(timer);
                    reject(e);
                });
            });
        }

        // Helper to send payload and wait for response
        async function testPayload(ws, name, payload) {
            return new Promise((resolve) => {
                const timer = setTimeout(() => resolve({ timeout: true }), 800);
                const handler = (data) => {
                    try {
                        const msg = JSON.parse(data.toString());
                        if (msg.type === 'error' || msg.type === 'chat:message') {
                            clearTimeout(timer);
                            ws.removeListener('message', handler);
                            resolve({ msg });
                        }
                    } catch (_) {}
                };
                ws.on('message', handler);
                ws.send(JSON.stringify(payload));
            });
        }

        // =====================================================================
        // SECTION 1: Binary Frame Handling (Non-UTF8, Raw Buffers, Zero Bytes)
        // =====================================================================
        console.log('\n--- 1. فحص التعامل مع الإطارات الثنائية (Binary Frames & Raw Buffers) ---');
        {
            const ws = await openClient(coachToken);

            // Send raw binary buffer containing non-UTF8 garbage
            const binaryGarbage = Buffer.from([0x00, 0xFF, 0xFE, 0xAA, 0xBB, 0xCC, 0xDD]);
            let receivedError = null;
            const errWait = new Promise((res) => {
                ws.on('message', function onMsg(d) {
                    try {
                        const m = JSON.parse(d.toString());
                        if (m.type === 'error') {
                            receivedError = m;
                            ws.removeListener('message', onMsg);
                            res(m);
                        }
                    } catch (_) {}
                });
            });

            ws.send(binaryGarbage);
            const errRes = await Promise.race([errWait, new Promise(r => setTimeout(r, 800))]);
            const binaryPassed = errRes && errRes.code === 'BAD_REQUEST';
            record('Binary garbage buffer rejected with BAD_REQUEST', !!binaryPassed, errRes ? errRes.code : 'no error frame');

            // Send empty buffer
            const emptyBuffer = Buffer.alloc(0);
            ws.send(emptyBuffer);
            await new Promise(r => setTimeout(r, 200));
            record('Empty buffer handled without crash', ws.readyState === WebSocket.OPEN, 'Socket remained alive');

            ws.close();
            await new Promise(r => setTimeout(r, 100));
        }

        // =====================================================================
        // SECTION 2: Prototype Pollution & Special Object Keys
        // =====================================================================
        console.log('\n--- 2. فحص حقن تلوث النموذج الأولي (Prototype Pollution & Reserved Keys) ---');
        {
            const ws = await openClient(coachToken);

            const p1 = await testPayload(ws, 'Proto type override', { type: '__proto__', payload: { foo: 'bar' } });
            record('__proto__ as event type rejected as UNKNOWN_EVENT', p1.msg?.code === 'UNKNOWN_EVENT', p1.msg?.code);

            const p2 = await testPayload(ws, 'Constructor override', { type: 'constructor', payload: {} });
            record('constructor as event type rejected as UNKNOWN_EVENT', p2.msg?.code === 'UNKNOWN_EVENT', p2.msg?.code);

            const p3 = await testPayload(ws, 'Payload with proto injection', {
                type: 'chat:send',
                payload: {
                    __proto__: { isAdmin: true },
                    channelId: 1,
                    content: 'Proto test'
                }
            });
            const p3Passed = p3.msg?.type === 'chat:message' && ({}).isAdmin === undefined;
            record('Payload with __proto__ safely contained without polluting global Object', p3Passed, 'Object.prototype clean');

            ws.close();
            await new Promise(r => setTimeout(r, 100));
        }

        // =====================================================================
        // SECTION 3: Deep Parameter Fuzzing on channelId, messageId, isTyping
        // =====================================================================
        console.log('\n--- 3. فحص المعاملات الشاذة والحدود القصوى (Parameter Fuzzing) ---');
        {
            const ws = await openClient(coachToken);

            async function sendAndExpect(payload, expectedCode) {
                return new Promise((resolve) => {
                    const timer = setTimeout(() => resolve({ pass: false, error: 'TIMEOUT' }), 800);
                    const handler = (d) => {
                        try {
                            const m = JSON.parse(d.toString());
                            if (m.type === 'error') {
                                clearTimeout(timer);
                                ws.removeListener('message', handler);
                                resolve({ pass: m.code === expectedCode, actual: m.code });
                            }
                        } catch (_) {}
                    };
                    ws.on('message', handler);
                    ws.send(JSON.stringify(payload));
                });
            }

            // channelId fuzzing
            const f1 = await sendAndExpect({ type: 'chat:send', channelId: 0, content: 'test' }, 'INVALID_CHANNEL_ID');
            record('channelId = 0 rejected with INVALID_CHANNEL_ID', f1.pass, f1.actual);

            const f2 = await sendAndExpect({ type: 'chat:send', channelId: -5, content: 'test' }, 'CHANNEL_NOT_FOUND');
            record('channelId = -5 rejected with CHANNEL_NOT_FOUND', f2.pass, f2.actual);

            // Float channelId (1.75) parses to 1 in parseInt
            const f3 = await testPayload(ws, 'Float channelId 1.75', { type: 'chat:send', channelId: 1.75, content: 'Float test' });
            record('Float channelId (1.75) safely handled without crash', f3.msg?.type === 'chat:message', f3.msg?.type);

            // Array channelId [1, 2] parses to 1 in parseInt
            const f4 = await testPayload(ws, 'Array channelId [1, 2]', { type: 'chat:send', channelId: [1, 2], content: 'Array test' });
            record('Array channelId safely handled without crash', f4.msg?.type === 'chat:message', f4.msg?.type);

            const f5 = await sendAndExpect({ type: 'chat:send', channelId: { id: 1 }, content: 'test' }, 'INVALID_CHANNEL_ID');
            record('Object channelId rejected with INVALID_CHANNEL_ID', f5.pass, f5.actual);

            // chat:typing fuzzing
            ws.send(JSON.stringify({ type: 'chat:typing', channelId: 1, isTyping: 'NOT_A_BOOLEAN' }));
            ws.send(JSON.stringify({ type: 'chat:typing', channelId: 1, isTyping: { nested: true } }));
            ws.send(JSON.stringify({ type: 'chat:typing', channelId: null, isTyping: true }));
            await new Promise(r => setTimeout(r, 200));
            record('chat:typing fuzzing handled safely without uncaught exception', ws.readyState === WebSocket.OPEN);

            // chat:read fuzzing
            ws.send(JSON.stringify({ type: 'chat:read', channelId: 1, messageId: 'INVALID_ID' }));
            ws.send(JSON.stringify({ type: 'chat:read', channelId: 1, messageId: -99 }));
            ws.send(JSON.stringify({ type: 'chat:read', channelId: 1, messageId: {} }));
            await new Promise(r => setTimeout(r, 200));
            record('chat:read fuzzing handled safely without uncaught exception', ws.readyState === WebSocket.OPEN);

            ws.close();
            await new Promise(r => setTimeout(r, 100));
        }

        // =====================================================================
        // SECTION 4: Chaos Burst: High Concurrency Interleaved with Hostile Payloads
        // =====================================================================
        console.log('\n--- 4. اختبار الفوضى الإجهادية المتزامنة (Chaos Burst: 20 عميلاً + 200 حمولة فوضوية) ---');
        {
            const NUM_CHAOS_CLIENTS = 20;
            const chaosClients = [];
            for (let i = 0; i < NUM_CHAOS_CLIENTS; i++) {
                chaosClients.push(await openClient(i % 2 === 0 ? coachToken : adminToken));
            }

            const memBefore = process.memoryUsage();
            const chaosStart = Date.now();
            const hostileVectors = [
                'null',
                '12345',
                'true',
                '[]',
                '{}',
                '{"type": "fake"}',
                '{"type": "chat:send", "payload": null}',
                '{"type": "chat:send", "channelId": 1, "content": 9999}',
                '{"type": "chat:send", "channelId": 1, "content": true}',
                '{"type": "chat:send", "channelId": 1, "content": {"a": 1}}',
                '{"type": "chat:send", "channelId": 1, "content": "    "}',
                '{"type": "chat:send", "channelId": 9999, "content": "Ghost channel"}',
                '{"type": "chat:typing", "channelId": 1, "isTyping": 1}',
                '{"type": "chat:read", "channelId": 1, "messageId": "abc"}',
                Buffer.from([0x01, 0x02, 0x03]),
                JSON.stringify({ type: 'chat:send', channelId: 1, content: 'Valid message in chaos' })
            ];

            let sentCount = 0;
            for (let round = 0; round < 10; round++) {
                for (let c = 0; c < NUM_CHAOS_CLIENTS; c++) {
                    const vector = hostileVectors[sentCount % hostileVectors.length];
                    try {
                        chaosClients[c].send(vector);
                        sentCount++;
                    } catch (_) {}
                }
            }

            await new Promise(r => setTimeout(r, 600));
            const chaosElapsed = Date.now() - chaosStart;
            const memAfter = process.memoryUsage();
            const heapDiffMB = ((memAfter.heapUsed - memBefore.heapUsed) / (1024 * 1024)).toFixed(2);

            console.log(`• تم إرسال ${sentCount} إطار فوضوي عبر ${NUM_CHAOS_CLIENTS} عميلاً في ${chaosElapsed}ms`);
            console.log(`• استهلاك الذاكرة (Heap Delta): ${heapDiffMB} MB`);

            // Verify all sockets still alive or gracefully handled
            const survivingSockets = chaosClients.filter(ws => ws.readyState === WebSocket.OPEN).length;
            console.log(`• المقابس النشطة بعد الاندفاع الفوضوي: ${survivingSockets}/${NUM_CHAOS_CLIENTS}`);
            record('Chaos burst completed with zero server crash', uncaught.length === 0, `Uncaught exceptions: ${uncaught.length}`);
            record('Surviving client connections healthy', survivingSockets === NUM_CHAOS_CLIENTS, `${survivingSockets}/${NUM_CHAOS_CLIENTS} open`);

            chaosClients.forEach(ws => ws.close());
            await new Promise(r => setTimeout(r, 200));
        }

        // =====================================================================
        // SUMMARY
        // =====================================================================
        console.log('\n================================================================');
        console.log('📊 حصيلة الفحص الإجهادي الإضافي (Challenger R2 Summary):');
        const passedCount = testResults.filter(t => t.passed).length;
        console.log(`• النتائج: ${passedCount}/${testResults.length} اختبار اجتاز بنجاح`);
        console.log(`• الاستثناءات غير المعالجة: ${uncaught.length}`);
        console.log('================================================================\n');

        assert.strictEqual(uncaught.length, 0, 'Zero uncaught exceptions allowed');
        assert.strictEqual(passedCount, testResults.length, 'All adversarial tests must pass');

    } finally {
        process.removeListener('uncaughtException', onUncaught);
        await new Promise(r => server.close(r));
        console.log('✓ تم إغلاق خادم الفحص الإجهادي بنجاح.');
    }
}

if (require.main === module) {
    runAdversarialHarness()
        .then(() => process.exit(0))
        .catch((e) => {
            console.error('Fatal harness error:', e);
            process.exit(1);
        });
}

module.exports = { runAdversarialHarness };
