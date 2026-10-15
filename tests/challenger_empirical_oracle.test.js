/**
 * CHALLENGER 2 EMPIRICAL VERIFICATION ORACLE & RACE RESILIENCE HARNESS
 * Milestone 1 (Iteration 2) Post-Remediation Deep Audit
 *
 * Verifies:
 * 1. Multi-Tenant Channel Privacy & 0 Cross-Tenant Leaks
 * 2. Race Resilience & High-Contention Concurrency (REST + WS Burst)
 * 3. Hostile Fuzzing & Malformed Frame Exception Immunity
 * 4. Boundary Escalation & SQL Injection Resistance
 * 5. SSE & WebSocket Dual-Bridge Isolation
 */

const assert = require('assert');
const http = require('http');
const { WebSocket } = require('ws');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { app, initWebSocketServer } = require('../server/server');
const db = require('../server/database');
const config = require('../server/config');

const TEST_PORT = 3388;
const BASE_HTTP_URL = `http://127.0.0.1:${TEST_PORT}`;
const BASE_WS_URL = `ws://127.0.0.1:${TEST_PORT}/ws`;

let server = null;
let uncaughtExceptionsCaught = [];

process.on('uncaughtException', (err) => {
    uncaughtExceptionsCaught.push(err);
    console.error('CRITICAL: Uncaught Exception intercepted in process:', err);
});

const results = [];

function logTest(id, name, passed, details = {}) {
    results.push({ id, name, passed, details });
    const symbol = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`[${symbol}] ${id}: ${name}`);
    if (!passed || details.note) {
        console.log(`       Details:`, JSON.stringify(details));
    }
}

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
    return { status: res.status, body, headers: res.headers };
}

function openClient(token) {
    return new Promise((resolve, reject) => {
        const url = `${BASE_WS_URL}?token=${token}`;
        const ws = new WebSocket(url);
        let ackReceived = false;

        const timer = setTimeout(() => {
            if (!ackReceived) {
                try { ws.close(); } catch (_) {}
                reject(new Error('Timeout waiting for connection:ack'));
            }
        }, 5000);

        ws.on('message', function onInit(data) {
            try {
                const msg = JSON.parse(data.toString());
                if (msg.type === 'connection:ack') {
                    ackReceived = true;
                    clearTimeout(timer);
                    ws.removeListener('message', onInit);
                    resolve({ ws, ack: msg });
                }
            } catch (e) {
                clearTimeout(timer);
                reject(e);
            }
        });

        ws.on('error', (err) => {
            clearTimeout(timer);
            reject(err);
        });
    });
}

function waitForEvent(ws, eventType, timeoutMs = 4000) {
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

async function runEmpiricalHarness() {
    console.log('================================================================');
    console.log('  CHALLENGER 2: DEEP EMPIRICAL ORACLE & RACE RESILIENCE HARNESS  ');
    console.log('================================================================\n');

    db.initializeDatabase(true);

    server = http.createServer(app);
    initWebSocketServer(server);

    await new Promise((resolve) => server.listen(TEST_PORT, resolve));
    console.log(`✓ Test server running on port ${TEST_PORT}\n`);

    const openSockets = [];
    const track = (ws) => {
        openSockets.push(ws);
        return ws;
    };

    try {
        // Authenticate users
        const adminLogin = await httpRequest('/api/auth/login', {
            method: 'POST',
            json: { email: 'abdelkarim@cyce52.com', password: 'Master@2026' }
        });
        const adminToken = adminLogin.body.token;

        const ahmedLogin = await httpRequest('/api/auth/login', {
            method: 'POST',
            json: { email: 'coach@cyce52.com', password: 'Coach@2026' }
        });
        const ahmedToken = ahmedLogin.body.token;

        const saraLogin = await httpRequest('/api/auth/login', {
            method: 'POST',
            json: { email: 'sara@cyce52.com', password: 'Coach@2026' }
        });
        const saraToken = saraLogin.body.token;

        // Open WS connections
        const { ws: adminWs } = await openClient(adminToken);
        track(adminWs);
        const { ws: ahmedWs } = await openClient(ahmedToken);
        track(ahmedWs);
        const { ws: saraWs } = await openClient(saraToken);
        track(saraWs);

        console.log('--- 1. MULTI-TENANT PRIVACY & ZERO CROSS-TENANT LEAKS ---');

        // Test 1.1: High-entropy secret in Ahmed's supervision channel (ID 2).
        // Sara must receive 0 WebSocket frames containing this secret.
        const secretSupervisionToken = `SUPERVISION_SECRET_${crypto.randomBytes(16).toString('hex')}`;
        let saraLeakedFrames = [];
        const saraSpyListener = (data) => {
            try {
                const text = data.toString();
                if (text.includes(secretSupervisionToken)) {
                    saraLeakedFrames.push(text);
                }
            } catch (_) {}
        };
        saraWs.on('message', saraSpyListener);

        const adminRecvSecret = waitForEvent(adminWs, 'chat:message');
        ahmedWs.send(JSON.stringify({
            type: 'chat:send',
            payload: {
                channelId: 2,
                messageType: 'text',
                content: `Classified supervision message: ${secretSupervisionToken}`
            }
        }));
        await adminRecvSecret;

        // Wait a buffer window to allow any erroneous broadcast to deliver
        await new Promise(r => setTimeout(r, 200));
        saraWs.removeListener('message', saraSpyListener);

        logTest('1.1', 'WS Zero Cross-Tenant Leak (Private Supervision Channel)', saraLeakedFrames.length === 0, {
            saraLeakedCount: saraLeakedFrames.length,
            note: 'Sara received 0 frames containing Ahmed private supervision token'
        });

        // Test 1.2: Cross-Tenant Message Search Leak
        // Sara searches for Ahmed's secret supervision token via REST GET /api/chat/search?q=...
        const saraSearchResult = await httpRequest(`/api/chat/search?q=${secretSupervisionToken}`, {
            token: saraToken
        });
        const adminSearchResult = await httpRequest(`/api/chat/search?q=${secretSupervisionToken}`, {
            token: adminToken
        });
        const ahmedSearchResult = await httpRequest(`/api/chat/search?q=${secretSupervisionToken}`, {
            token: ahmedToken
        });

        const searchIsolationPassed = (
            saraSearchResult.body.results.length === 0 &&
            adminSearchResult.body.results.length === 1 &&
            ahmedSearchResult.body.results.length === 1
        );
        logTest('1.2', 'Cross-Tenant Search Isolation (REST /api/chat/search)', searchIsolationPassed, {
            saraResults: saraSearchResult.body.results.length,
            adminResults: adminSearchResult.body.results.length,
            ahmedResults: ahmedSearchResult.body.results.length,
            note: 'Only Ahmed and Admin can find private supervision message in search index'
        });

        // Test 1.3: Cross-Tenant Read State Sabotage
        // Sara attempts to mark Ahmed's private channel (2) as read
        const saraMarkReadRes = await httpRequest('/api/chat/channels/2/read', {
            method: 'POST',
            token: saraToken,
            json: { messageId: 9999 }
        });
        const dbMemberCheck = db.getDb().prepare('SELECT last_read_message_id FROM chat_channel_members WHERE channel_id = 2 AND user_id = 3').get();
        logTest('1.3', 'Cross-Tenant Read State Sabotage Rejection', saraMarkReadRes.status === 403 && !dbMemberCheck, {
            status: saraMarkReadRes.status,
            dbMemberExists: !!dbMemberCheck,
            note: 'Sara is blocked with 403 and cannot alter read pointers on foreign channel'
        });

        // Test 1.4: Cross-Tenant SSE Leak Isolation
        let sseLeakedSara = false;
        const sseSecret = `SSE_SECRET_${crypto.randomBytes(16).toString('hex')}`;
        const sseController = new AbortController();
        const sseStreamPromise = (async () => {
            try {
                const res = await fetch(`${BASE_HTTP_URL}/api/chat/stream?token=${saraToken}`, {
                    signal: sseController.signal
                });
                const reader = res.body.getReader();
                const decoder = new TextDecoder();
                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    const text = decoder.decode(value);
                    if (text.includes(sseSecret)) {
                        sseLeakedSara = true;
                    }
                }
            } catch (_) {}
        })();

        await new Promise(r => setTimeout(r, 200));

        // Admin posts message to Channel 2 via REST
        await httpRequest('/api/chat/channels/2/messages', {
            method: 'POST',
            token: adminToken,
            json: { messageType: 'text', content: `SSE private note: ${sseSecret}` }
        });

        await new Promise(r => setTimeout(r, 250));
        sseController.abort();
        await sseStreamPromise;

        logTest('1.4', 'SSE Zero Cross-Tenant Stream Leak', !sseLeakedSara, {
            leaked: sseLeakedSara,
            note: 'Sara received 0 SSE events from Channel 2'
        });

        console.log('\n--- 2. CONCURRENCY & RACE RESILIENCE UNDER HIGH CONTENTION ---');

        // Test 2.1: 100 Concurrent Messages Burst (50 REST + 50 WS) across 2 channels simultaneously
        const burstTag = `RACE_TEST_${Date.now()}`;
        const totalBurst = 100;
        let receivedByAdminWS = 0;

        const adminBurstListener = (data) => {
            try {
                const msg = JSON.parse(data.toString());
                if (msg.type === 'chat:message' && msg.message && msg.message.content && msg.message.content.includes(burstTag)) {
                    receivedByAdminWS++;
                }
            } catch (_) {}
        };
        adminWs.on('message', adminBurstListener);

        const tStart = Date.now();
        const burstPromises = [];

        // 25 REST in Channel 1 (cohort)
        for (let i = 0; i < 25; i++) {
            burstPromises.push(httpRequest('/api/chat/channels/1/messages', {
                method: 'POST',
                token: ahmedToken,
                json: { messageType: 'text', content: `${burstTag} Ch1 REST ${i}` }
            }));
        }

        // 25 REST in Channel 2 (direct)
        for (let i = 0; i < 25; i++) {
            burstPromises.push(httpRequest('/api/chat/channels/2/messages', {
                method: 'POST',
                token: ahmedToken,
                json: { messageType: 'text', content: `${burstTag} Ch2 REST ${i}` }
            }));
        }

        // 25 WS in Channel 1 (cohort)
        for (let i = 0; i < 25; i++) {
            burstPromises.push(new Promise((res) => {
                ahmedWs.send(JSON.stringify({
                    type: 'chat:send',
                    payload: { channelId: 1, messageType: 'text', content: `${burstTag} Ch1 WS ${i}` }
                }));
                res(true);
            }));
        }

        // 25 WS in Channel 2 (direct)
        for (let i = 0; i < 25; i++) {
            burstPromises.push(new Promise((res) => {
                ahmedWs.send(JSON.stringify({
                    type: 'chat:send',
                    payload: { channelId: 2, messageType: 'text', content: `${burstTag} Ch2 WS ${i}` }
                }));
                res(true);
            }));
        }

        await Promise.all(burstPromises);
        await new Promise(r => setTimeout(r, 800));
        const elapsedBurst = Date.now() - tStart;
        adminWs.removeListener('message', adminBurstListener);

        const sqlite = db.getDb();
        const persistedBurst = sqlite.prepare('SELECT id, channel_id, content FROM chat_messages WHERE content LIKE ? ORDER BY id ASC').all(`%${burstTag}%`);
        
        // Check for collisions and monotonicity
        let monotonic = true;
        for (let i = 1; i < persistedBurst.length; i++) {
            if (persistedBurst[i].id <= persistedBurst[i - 1].id) {
                monotonic = false;
                break;
            }
        }

        const racePassed = (persistedBurst.length === totalBurst) && monotonic && (receivedByAdminWS === totalBurst);
        logTest('2.1', '100 Concurrent Messages Burst (50 REST + 50 WS) Across Multiple Channels', racePassed, {
            persisted: persistedBurst.length,
            target: totalBurst,
            receivedByAdminWS,
            monotonic,
            elapsedMs: elapsedBurst,
            rateMsgSec: Math.round((totalBurst / (elapsedBurst / 1000)) * 10) / 10,
            note: 'All 100 messages written and broadcast without dropped frames or ID collisions'
        });

        // Test 2.2: Event Loop Liveness Post-Burst
        const tPing = Date.now();
        const pingPromise = waitForEvent(ahmedWs, 'pong', 1000);
        ahmedWs.send(JSON.stringify({ type: 'ping' }));
        const pong = await pingPromise;
        const pingLatency = Date.now() - tPing;

        logTest('2.2', 'Event Loop Responsiveness & Zero Starvation Post-Burst', pong.type === 'pong' && pingLatency < 50, {
            latencyMs: pingLatency,
            note: `Ping/Pong replied in ${pingLatency}ms immediately following 100-msg race burst`
        });

        console.log('\n--- 3. ADVERSARIAL FUZZING & EXCEPTION IMMUNITY ---');

        // Test 3.1: Hostile Frame Variations
        const hostileFrames = [
            'null',
            'undefined',
            '{}',
            '[]',
            '12345',
            '"hello"',
            'true',
            'false',
            '{"type": null}',
            '{"type": 1234}',
            '{"type": {}}',
            '{"type": "chat:send", "payload": null}',
            '{"type": "chat:send", "payload": "string"}',
            '{"type": "chat:send", "payload": 1234}',
            '{"type": "chat:send", "payload": []}',
            '{"type": "chat:send", "channelId": null}',
            '{"type": "chat:send", "channelId": "not_a_number"}',
            '{"type": "chat:send", "channelId": -1}',
            '{"type": "chat:send", "channelId": 1, "content": null}',
            '{"type": "chat:send", "channelId": 1, "content": 9999}',
            '{"type": "chat:send", "channelId": 1, "content": true}',
            '{"type": "chat:send", "channelId": 1, "content": ["nested", "array"]}',
            '{"type": "chat:send", "channelId": 1, "content": {"nested": "obj"}}',
            '{"type": "chat:typing", "payload": null}',
            '{"type": "chat:typing", "channelId": null}',
            '{"type": "chat:typing", "channelId": "invalid"}',
            '{"type": "chat:typing", "channelId": 1, "isTyping": "yes"}',
            '{"type": "chat:read", "payload": null}',
            '{"type": "chat:read", "channelId": null}',
            '{"type": "chat:read", "channelId": "invalid"}',
            '{"type": "chat:read", "channelId": 1, "messageId": "invalid"}'
        ];

        let errorFramesReceived = 0;
        const errCollector = (data) => {
            try {
                const msg = JSON.parse(data.toString());
                if (msg.type === 'error') {
                    errorFramesReceived++;
                }
            } catch (_) {}
        };
        ahmedWs.on('message', errCollector);

        for (const frame of hostileFrames) {
            ahmedWs.send(frame);
        }

        await new Promise(r => setTimeout(r, 500));
        ahmedWs.removeListener('message', errCollector);

        // Verify socket survived and answers ping
        const ping2Promise = waitForEvent(ahmedWs, 'pong', 1000);
        ahmedWs.send(JSON.stringify({ type: 'ping' }));
        const pong2 = await ping2Promise;

        const fuzzingPassed = (pong2.type === 'pong') && (uncaughtExceptionsCaught.length === 0);
        logTest('3.1', 'Hostile Frame Fuzzing (31 Malformed Variations)', fuzzingPassed, {
            fuzzedVariations: hostileFrames.length,
            errorFramesReceived,
            uncaughtExceptions: uncaughtExceptionsCaught.length,
            note: '0 unhandled exceptions; socket stayed open and responsive'
        });

        console.log('\n--- 4. BOUNDARY DEFENSE & SQL INJECTION RESISTANCE ---');

        // Test 4.1: SQL injection & Unauthorized Probes on Channel 2
        // Sara (who is NOT in channel 2) attempts various SQL injection / boundary probes targeting channel 2
        const sqliProbes = [
            '2 OR 1=1',
            '2; DROP TABLE chat_messages;--',
            '2 UNION SELECT * FROM users',
            '2.5',
            '2abc'
        ];

        let allUnauthorizedBlocked = true;
        for (const probe of sqliProbes) {
            const res = await httpRequest(`/api/chat/channels/${encodeURIComponent(probe)}/messages`, {
                token: saraToken
            });
            if (res.status !== 403) {
                allUnauthorizedBlocked = false;
                console.log(`Unexpected status for Sara probe '${probe}': ${res.status}`);
            }
        }

        // Test non-existent and invalid channel IDs
        const resNonExistent = await httpRequest('/api/chat/channels/9999999/messages', { token: ahmedToken });
        const resInvalidStr = await httpRequest('/api/chat/channels/invalid_string/messages', { token: ahmedToken });

        // Verify table integrity
        const tableCheck = db.getDb().prepare("SELECT COUNT(*) as count FROM chat_messages").get();
        const sqliSafe = allUnauthorizedBlocked && resNonExistent.status === 404 && resInvalidStr.status === 400 && tableCheck && tableCheck.count >= 0;

        logTest('4.1', 'Channel ID SQL Injection & Unauthorized Access Immunity', sqliSafe, {
            saraProbesBlocked: allUnauthorizedBlocked,
            nonExistentStatus: resNonExistent.status,
            invalidStringStatus: resInvalidStr.status,
            chatMessagesCount: tableCheck ? tableCheck.count : null,
            note: 'All foreign channel probes blocked with 403, non-existent 404, invalid string 400; DB intact'
        });

        // Test 4.2: SQL injection in search endpoint
        const searchSqli = "' UNION SELECT password, email, null, null, null, null, null FROM users --";
        const searchRes = await httpRequest(`/api/chat/search?q=${encodeURIComponent(searchSqli)}`, {
            token: ahmedToken
        });
        const noPasswordLeak = searchRes.status === 200 && Array.isArray(searchRes.body.results) && searchRes.body.results.every(r => !r.content.includes('$2a$'));

        logTest('4.2', 'Chat Search SQL Injection Immunity', noPasswordLeak, {
            status: searchRes.status,
            resultsCount: searchRes.body.results.length,
            note: 'Parameterized search query safely escapes UNION SELECT injections'
        });

        console.log('\n================================================================');
        console.log('                 EMPIRICAL ORACLE SUMMARY                       ');
        console.log('================================================================');

        const total = results.length;
        const passed = results.filter(r => r.passed).length;
        console.log(`TOTAL TESTS: ${total} | PASSED: ${passed} | FAILED: ${total - passed}`);
        console.log(`UNCAUGHT EXCEPTIONS: ${uncaughtExceptionsCaught.length}`);

        if (passed === total && uncaughtExceptionsCaught.length === 0) {
            console.log('\n🏆 ALL EMPIRICAL CHALLENGES PASSED (100% SUCCESS RATE).');
            return true;
        } else {
            console.error('\n⚠️ EMPIRICAL CHALLENGE DETECTED FAILURES OR UNCAUGHT EXCEPTIONS.');
            return false;
        }

    } finally {
        for (const ws of openSockets) {
            try {
                if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                    ws.terminate();
                }
            } catch (_) {}
        }
        if (server) {
            await new Promise((resolve) => server.close(resolve));
            console.log('✓ Test server closed.');
        }
    }
}

runEmpiricalHarness().then((success) => {
    process.exit(success ? 0 : 1);
}).catch((err) => {
    console.error('Fatal Oracle Error:', err);
    process.exit(1);
});
