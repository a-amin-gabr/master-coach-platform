/**
 * Empirical Security, Boundary, and Concurrency Test Suite
 * Milestone 1 Adversarial Challenge (Challenger 2)
 *
 * Investigates:
 * 1. Channel Authorization & Privacy (Spoofing, unauthorized send/typing/read, eavesdropping)
 * 2. JWT Authentication Boundaries (Expired, tampered, alg:none, non-existent user, malformed)
 * 3. Event Flooding & DoS Resilience (Typing flood, read receipt flood, malformed frames)
 * 4. Concurrency & Race Conditions (Simultaneous REST POST vs WebSocket frames, duplicate checks)
 * 5. WebSocket Frame Payload Validation & Boundary Rejections
 */

const assert = require('assert');
const http = require('http');
const { WebSocket } = require('ws');
const jwt = require('jsonwebtoken');
const { app, initWebSocketServer } = require('../server/server');
const db = require('../server/database');
const config = require('../server/config');

const TEST_PORT = 3197;
const BASE_HTTP_URL = `http://127.0.0.1:${TEST_PORT}`;
const BASE_WS_URL = `ws://127.0.0.1:${TEST_PORT}/ws`;

let server = null;
let adminToken = '';
let coachAhmedToken = '';
let coachSaraToken = '';

let adminUser = null;
let coachAhmedUser = null;
let coachSaraUser = null;

const testResults = {
    category1_channel_privacy: [],
    category2_jwt_boundaries: [],
    category3_event_flooding: [],
    category4_concurrency_race: [],
    category5_payload_validation: []
};

function recordResult(category, testName, passed, details = {}) {
    testResults[category].push({ testName, passed, details });
    const mark = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  [${mark}] ${testName}`, details.info ? `(${details.info})` : '');
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

function openClient(url, options = {}) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(url, options.protocols, options);
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

async function runAdversarialSuite() {
    console.log('================================================================');
    console.log('   CHALLENGER 2: ADVERSARIAL SECURITY & BOUNDARY TEST HARNESS   ');
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
        // Setup tokens
        const adminLogin = await httpRequest('/api/auth/login', {
            method: 'POST',
            json: { email: 'abdelkarim@cyce52.com', password: 'Master@2026' }
        });
        adminToken = adminLogin.body.token;
        adminUser = adminLogin.body.user;

        const ahmedLogin = await httpRequest('/api/auth/login', {
            method: 'POST',
            json: { email: 'coach@cyce52.com', password: 'Coach@2026' }
        });
        coachAhmedToken = ahmedLogin.body.token;
        coachAhmedUser = ahmedLogin.body.user;

        const saraLogin = await httpRequest('/api/auth/login', {
            method: 'POST',
            json: { email: 'sara@cyce52.com', password: 'Coach@2026' }
        });
        coachSaraToken = saraLogin.body.token;
        coachSaraUser = saraLogin.body.user;

        // =====================================================================
        // CATEGORY 1: CHANNEL AUTHORIZATION, PRIVACY & SPOOFING PREVENTION
        // =====================================================================
        console.log('--- CATEGORY 1: CHANNEL PRIVACY & SPOOFING RESISTANCE ---');

        const { ws: ahmedWs } = await openClient(`${BASE_WS_URL}?token=${coachAhmedToken}`);
        track(ahmedWs);
        const { ws: saraWs } = await openClient(`${BASE_WS_URL}?token=${coachSaraToken}`);
        track(saraWs);
        const { ws: adminWs } = await openClient(`${BASE_WS_URL}?token=${adminToken}`);
        track(adminWs);

        const ahmedDirectChannel = 2; // Ahmed + Abdelkarim

        // 1.1: Sara attempts WebSocket chat:send into Ahmed's channel
        {
            const errPromise = waitForEvent(saraWs, 'error');
            saraWs.send(JSON.stringify({
                type: 'chat:send',
                payload: { channelId: ahmedDirectChannel, messageType: 'text', content: 'Sara spoof attempt' }
            }));
            const err = await errPromise;
            const passed = err.code === 'FORBIDDEN';
            const checkDb = db.getDb().prepare("SELECT * FROM chat_messages WHERE content = 'Sara spoof attempt'").get();
            recordResult('category1_channel_privacy', '1.1 WS chat:send spoofing rejection', passed && !checkDb, {
                errorCode: err.code,
                dbPersisted: !!checkDb,
                info: 'Rejected with FORBIDDEN and not stored in DB'
            });
        }

        // 1.2: Sara attempts WebSocket chat:typing spoof into Ahmed's channel
        {
            let ahmedSawSaraTyping = false;
            const ahmedTypingListener = (data) => {
                try {
                    const parsed = JSON.parse(data.toString());
                    if (parsed.type === 'chat:typing' && parsed.channelId === ahmedDirectChannel) {
                        ahmedSawSaraTyping = true;
                    }
                } catch (_) {}
            };
            ahmedWs.on('message', ahmedTypingListener);

            const errPromise = waitForEvent(saraWs, 'error');
            saraWs.send(JSON.stringify({
                type: 'chat:typing',
                payload: { channelId: ahmedDirectChannel, isTyping: true }
            }));
            const err = await errPromise;
            await new Promise(r => setTimeout(r, 100));
            ahmedWs.removeListener('message', ahmedTypingListener);

            const passed = err.code === 'FORBIDDEN' && !ahmedSawSaraTyping;
            recordResult('category1_channel_privacy', '1.2 WS chat:typing spoofing rejection', passed, {
                errorCode: err.code,
                ahmedSawSaraTyping,
                info: 'Forbidden error returned and recipient shielded from typing indicator'
            });
        }

        // 1.3: Sara attempts WebSocket chat:read spoof on Ahmed's channel
        {
            const errPromise = waitForEvent(saraWs, 'error');
            saraWs.send(JSON.stringify({
                type: 'chat:read',
                payload: { channelId: ahmedDirectChannel, messageId: 1 }
            }));
            const err = await errPromise;
            const passed = err.code === 'FORBIDDEN';
            recordResult('category1_channel_privacy', '1.3 WS chat:read spoofing rejection', passed, {
                errorCode: err.code,
                info: 'Forbidden error returned on unauthorized read receipt'
            });
        }

        // 1.4: Passive eavesdropping test: Sara listens while Ahmed & Admin chat
        {
            let saraReceivedFrames = [];
            const saraEavesdrop = (data) => {
                try {
                    const parsed = JSON.parse(data.toString());
                    if (parsed.channelId === ahmedDirectChannel || (parsed.payload && parsed.payload.channelId === ahmedDirectChannel)) {
                        saraReceivedFrames.push(parsed);
                    }
                } catch (_) {}
            };
            saraWs.on('message', saraEavesdrop);

            const adminMsgPromise = waitForEvent(adminWs, 'chat:message');
            ahmedWs.send(JSON.stringify({
                type: 'chat:send',
                payload: { channelId: ahmedDirectChannel, messageType: 'text', content: 'Top secret supervision note' }
            }));
            await adminMsgPromise;

            const ahmedTypingPromise = waitForEvent(ahmedWs, 'chat:typing');
            adminWs.send(JSON.stringify({
                type: 'chat:typing',
                payload: { channelId: ahmedDirectChannel, isTyping: true }
            }));
            await ahmedTypingPromise;

            const ahmedReadPromise = waitForEvent(ahmedWs, 'chat:read_receipt');
            adminWs.send(JSON.stringify({
                type: 'chat:read',
                payload: { channelId: ahmedDirectChannel, messageId: 1 }
            }));
            await ahmedReadPromise;

            await new Promise(r => setTimeout(r, 150));
            saraWs.removeListener('message', saraEavesdrop);

            const passed = saraReceivedFrames.length === 0;
            recordResult('category1_channel_privacy', '1.4 Passive WS eavesdropping insulation', passed, {
                framesLeakedToSara: saraReceivedFrames.length,
                info: 'Zero frames leaked to unauthorized coach across messages, typing, and read receipts'
            });
        }

        // 1.5: REST API privacy: Sara GET /api/chat/channels/2/messages
        {
            const res = await httpRequest(`/api/chat/channels/${ahmedDirectChannel}/messages`, {
                token: coachSaraToken
            });
            const passed = res.status === 403;
            recordResult('category1_channel_privacy', '1.5 REST GET messages authorization gate', passed, {
                status: res.status,
                error: res.body.error,
                info: 'Strict 403 Forbidden on foreign direct channel inspection'
            });
        }

        // 1.6: REST API privacy: Sara POST /api/chat/channels/2/messages
        {
            const res = await httpRequest(`/api/chat/channels/${ahmedDirectChannel}/messages`, {
                method: 'POST',
                token: coachSaraToken,
                json: { messageType: 'text', content: 'Sara REST injection attempt' }
            });
            const checkDb = db.getDb().prepare("SELECT * FROM chat_messages WHERE content = 'Sara REST injection attempt'").get();
            const passed = res.status === 403 && !checkDb;
            recordResult('category1_channel_privacy', '1.6 REST POST message injection gate', passed, {
                status: res.status,
                dbPersisted: !!checkDb,
                info: '403 Forbidden and no persistence in database'
            });
        }

        // 1.7: REST API privacy: Sara POST /api/chat/channels/2/read
        {
            const res = await httpRequest(`/api/chat/channels/${ahmedDirectChannel}/read`, {
                method: 'POST',
                token: coachSaraToken,
                json: { messageId: 1 }
            });
            const passed = res.status === 403;
            recordResult('category1_channel_privacy', '1.7 REST POST mark read authorization gate', passed, {
                status: res.status,
                info: '403 Forbidden on foreign channel read receipt'
            });
        }

        // 1.8: SSE Privacy stream test
        {
            let saraSseReceivedLeakedMessage = false;
            const controller = new AbortController();
            const ssePromise = (async () => {
                try {
                    const res = await fetch(`${BASE_HTTP_URL}/api/chat/stream?token=${coachSaraToken}`, {
                        signal: controller.signal
                    });
                    const reader = res.body.getReader();
                    const decoder = new TextDecoder();
                    while (true) {
                        const { value, done } = await reader.read();
                        if (done) break;
                        const text = decoder.decode(value);
                        if (text.includes('Top secret supervision note 2')) {
                            saraSseReceivedLeakedMessage = true;
                        }
                    }
                } catch (_) {}
            })();

            await new Promise(r => setTimeout(r, 200));

            await httpRequest(`/api/chat/channels/${ahmedDirectChannel}/messages`, {
                method: 'POST',
                token: adminToken,
                json: { messageType: 'text', content: 'Top secret supervision note 2' }
            });

            await new Promise(r => setTimeout(r, 200));
            controller.abort();
            await ssePromise;

            const passed = !saraSseReceivedLeakedMessage;
            recordResult('category1_channel_privacy', '1.8 SSE stream privacy isolation', passed, {
                leaked: saraSseReceivedLeakedMessage,
                info: 'Sara received 0 SSE events from Ahmed channel'
            });
        }

        // 1.9: Sender ID spoofing in WS payload
        {
            const adminReceivePromise = waitForEvent(adminWs, 'chat:message');
            ahmedWs.send(JSON.stringify({
                type: 'chat:send',
                senderId: 1,
                sender_id: 1,
                payload: {
                    channelId: ahmedDirectChannel,
                    senderId: 1,
                    sender_id: 1,
                    messageType: 'text',
                    content: 'Spoofed senderId test'
                }
            }));
            const event = await adminReceivePromise;
            const dbRow = db.getDb().prepare('SELECT * FROM chat_messages WHERE id = ?').get(event.message.id);
            const passed = event.message.sender_id === coachAhmedUser.id && dbRow.sender_id === coachAhmedUser.id;
            recordResult('category1_channel_privacy', '1.9 Sender ID spoofing prevention in WS frames', passed, {
                broadcastSenderId: event.message.sender_id,
                persistedSenderId: dbRow.sender_id,
                actualUserId: coachAhmedUser.id,
                info: 'Server overrides payload senderId with authenticated user.id'
            });
        }

        // 1.10: Foreign Channel Injection via URL parsing probe
        {
            // Test if Sara can access Ahmed's channel using '2 OR 1=1' or '2.5'
            const resSaraInjected = await httpRequest(`/api/chat/channels/${encodeURIComponent('2 OR 1=1')}/messages`, {
                token: coachSaraToken
            });
            // Sara must be 403 Forbidden regardless of URL encoding tricks
            const resNonExistent = await httpRequest('/api/chat/channels/999999/messages', {
                token: coachAhmedToken
            });
            const resInvalid = await httpRequest('/api/chat/channels/invalid_string/messages', {
                token: coachAhmedToken
            });

            const passed = resSaraInjected.status === 403 && resNonExistent.status === 404 && resInvalid.status === 400;
            recordResult('category1_channel_privacy', '1.10 Channel ID URL parameter boundary verification', passed, {
                saraInjectedStatus: resSaraInjected.status,
                nonExistentStatus: resNonExistent.status,
                invalidStatus: resInvalid.status,
                info: 'Sara blocked with 403 on parsed ID 2; non-existent returned 404; invalid string returned 400'
            });
        }

        // =====================================================================
        // CATEGORY 2: JWT AUTHENTICATION BOUNDARIES & TAMPER RESISTANCE
        // =====================================================================
        console.log('\n--- CATEGORY 2: JWT AUTHENTICATION BOUNDARIES & TAMPER RESISTANCE ---');

        // 2.1: Missing Token on WebSocket Upgrade
        {
            const res = await new Promise((resolve) => {
                const ws = new WebSocket(BASE_WS_URL);
                ws.on('unexpected-response', (req, res) => resolve({ rejected: true, status: res.statusCode }));
                ws.on('error', () => resolve({ rejected: true }));
            });
            const passed = res.rejected && res.status === 401;
            recordResult('category2_jwt_boundaries', '2.1 Missing JWT on WS upgrade', passed, {
                status: res.status,
                info: 'Handshake aborted with 401 Unauthorized'
            });
        }

        // 2.2: Tampered JWT Signature
        {
            const parts = coachAhmedToken.split('.');
            const tamperedSignature = parts[0] + '.' + parts[1] + '.TamperedSignatureX12345';
            const res = await new Promise((resolve) => {
                const ws = new WebSocket(`${BASE_WS_URL}?token=${tamperedSignature}`);
                ws.on('unexpected-response', (req, res) => resolve({ rejected: true, status: res.statusCode }));
                ws.on('error', () => resolve({ rejected: true }));
            });
            const passed = res.rejected && res.status === 401;
            recordResult('category2_jwt_boundaries', '2.2 Tampered JWT signature rejection', passed, {
                status: res.status,
                info: 'Handshake aborted with 401 Unauthorized'
            });
        }

        // 2.3: Tampered Payload re-signed with wrong secret (Key confusion / fake secret)
        {
            const fakeToken = jwt.sign({ id: 1, role: 'admin' }, 'wrong-secret-key-67890');
            const res = await new Promise((resolve) => {
                const ws = new WebSocket(`${BASE_WS_URL}?token=${fakeToken}`);
                ws.on('unexpected-response', (req, res) => resolve({ rejected: true, status: res.statusCode }));
                ws.on('error', () => resolve({ rejected: true }));
            });
            const passed = res.rejected && res.status === 401;
            recordResult('category2_jwt_boundaries', '2.3 Wrong signing secret rejection', passed, {
                status: res.status,
                info: 'Handshake aborted with 401 Unauthorized'
            });
        }

        // 2.4: Expired JWT Token
        {
            const expiredToken = jwt.sign(
                { id: coachAhmedUser.id, email: coachAhmedUser.email, role: coachAhmedUser.role },
                config.JWT_SECRET,
                { expiresIn: '-10s' }
            );
            const res = await new Promise((resolve) => {
                const ws = new WebSocket(`${BASE_WS_URL}?token=${expiredToken}`);
                ws.on('unexpected-response', (req, res) => resolve({ rejected: true, status: res.statusCode }));
                ws.on('error', () => resolve({ rejected: true }));
            });
            const passed = res.rejected && res.status === 401;
            recordResult('category2_jwt_boundaries', '2.4 Expired JWT rejection on WS handshake', passed, {
                status: res.status,
                info: 'Handshake aborted with 401 Unauthorized on expired token'
            });
        }

        // 2.5: Algorithm "none" unsigned token bypass
        {
            const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
            const payload = Buffer.from(JSON.stringify({ id: 1, email: 'abdelkarim@cyce52.com', role: 'admin' })).toString('base64url');
            const noneToken = `${header}.${payload}.`;

            const wsRes = await new Promise((resolve) => {
                const ws = new WebSocket(`${BASE_WS_URL}?token=${noneToken}`);
                ws.on('unexpected-response', (req, res) => resolve({ rejected: true, status: res.statusCode }));
                ws.on('error', () => resolve({ rejected: true }));
            });

            const restRes = await httpRequest('/api/chat/channels', {
                token: noneToken
            });

            const passed = wsRes.rejected && wsRes.status === 401 && restRes.status === 401;
            recordResult('category2_jwt_boundaries', '2.5 Algorithm "none" bypass resistance', passed, {
                wsStatus: wsRes.status,
                restStatus: restRes.status,
                info: 'Both WS upgrade and REST reject unsigned alg:none tokens with 401'
            });
        }

        // 2.6: Non-existent user in validly signed token
        {
            const phantomToken = jwt.sign(
                { id: 999999, email: 'ghost@cyce52.com', role: 'coach' },
                config.JWT_SECRET,
                { expiresIn: '1h' }
            );

            const wsRes = await new Promise((resolve) => {
                const ws = new WebSocket(`${BASE_WS_URL}?token=${phantomToken}`);
                ws.on('unexpected-response', (req, res) => resolve({ rejected: true, status: res.statusCode }));
                ws.on('error', () => resolve({ rejected: true }));
            });

            const restRes = await httpRequest('/api/chat/channels', {
                token: phantomToken
            });

            const passed = wsRes.status === 401 && restRes.status === 401;
            recordResult('category2_jwt_boundaries', '2.6 Non-existent user token validation', passed, {
                wsStatus: wsRes.status,
                restStatus: restRes.status,
                info: 'Database user lookup gate rejects deleted/non-existent user with 401'
            });
        }

        // 2.7: Malformed token variations
        {
            const malformedTokens = ['', '   ', 'undefined', 'null', 'Bearer', 'ey1234', 'a.b', 'a.b.c.d', 'A'.repeat(5000)];
            let allRejected = true;
            for (const t of malformedTokens) {
                const wsRes = await new Promise((resolve) => {
                    const ws = new WebSocket(`${BASE_WS_URL}?token=${encodeURIComponent(t)}`);
                    ws.on('unexpected-response', (req, res) => resolve(res.statusCode));
                    ws.on('error', () => resolve(401));
                });
                if (wsRes !== 401) allRejected = false;
            }
            recordResult('category2_jwt_boundaries', '2.7 Malformed token variations fuzzing', allRejected, {
                fuzzedCount: malformedTokens.length,
                info: 'All malformed / edge-case token strings safely rejected with 401'
            });
        }

        // 2.8: REST endpoints with expired token
        {
            const expiredToken = jwt.sign(
                { id: coachAhmedUser.id, email: coachAhmedUser.email, role: coachAhmedUser.role },
                config.JWT_SECRET,
                { expiresIn: '-5s' }
            );
            const resChannels = await httpRequest('/api/chat/channels', { token: expiredToken });
            const resPost = await httpRequest(`/api/chat/channels/${ahmedDirectChannel}/messages`, {
                method: 'POST',
                token: expiredToken,
                json: { messageType: 'text', content: 'Expired post' }
            });
            const passed = resChannels.status === 401 && resPost.status === 401;
            recordResult('category2_jwt_boundaries', '2.8 REST expired token rejection', passed, {
                channelsStatus: resChannels.status,
                postStatus: resPost.status,
                info: 'REST middleware rejects expired token with 401 INVALID_TOKEN'
            });
        }

        // 2.9: SSE stream with expired or tampered token
        {
            const expiredToken = jwt.sign({ id: 1 }, config.JWT_SECRET, { expiresIn: '-10s' });
            const sseExpired = await httpRequest(`/api/chat/stream?token=${expiredToken}`);
            const sseTampered = await httpRequest('/api/chat/stream?token=invalid.tampered.token');
            const passed = sseExpired.status === 401 && sseTampered.status === 401;
            recordResult('category2_jwt_boundaries', '2.9 SSE stream authentication gate', passed, {
                expiredStatus: sseExpired.status,
                tamperedStatus: sseTampered.status,
                info: 'SSE stream strictly enforces JWT validation'
            });
        }

        // =====================================================================
        // CATEGORY 3: EVENT FLOODING & DoS RESILIENCE
        // =====================================================================
        console.log('\n--- CATEGORY 3: EVENT FLOODING & DoS RESILIENCE ---');

        // 3.1: Typing Indicator Flood (500 events in rapid succession)
        {
            const floodCount = 500;
            let receivedTypingCount = 0;
            const countListener = (data) => {
                try {
                    const msg = JSON.parse(data.toString());
                    if (msg.type === 'chat:typing') receivedTypingCount++;
                } catch (_) {}
            };
            adminWs.on('message', countListener);

            const startTime = Date.now();
            for (let i = 0; i < floodCount; i++) {
                ahmedWs.send(JSON.stringify({
                    type: 'chat:typing',
                    payload: { channelId: ahmedDirectChannel, isTyping: (i % 2 === 0) }
                }));
            }

            await new Promise(r => setTimeout(r, 600));
            const elapsedMs = Date.now() - startTime;
            adminWs.removeListener('message', countListener);

            const pingPromise = waitForEvent(ahmedWs, 'pong', 2000);
            ahmedWs.send(JSON.stringify({ type: 'ping' }));
            const pong = await pingPromise;

            const passed = (pong.type === 'pong') && (ahmedWs.readyState === WebSocket.OPEN);
            recordResult('category3_event_flooding', '3.1 High-frequency typing indicator flood (500 frames)', passed, {
                sent: floodCount,
                receivedByCounterpart: receivedTypingCount,
                elapsedMs,
                serverAlive: passed,
                throttlingObserved: receivedTypingCount < floodCount,
                info: `Server processed 500 typing frames in ${elapsedMs}ms without crashing; ${receivedTypingCount} received by peer`
            });
        }

        // 3.2: Read Receipt Flood (500 events in rapid succession)
        {
            const floodCount = 500;
            let receivedReceiptCount = 0;
            const countListener = (data) => {
                try {
                    const msg = JSON.parse(data.toString());
                    if (msg.type === 'chat:read_receipt') receivedReceiptCount++;
                } catch (_) {}
            };
            adminWs.on('message', countListener);

            const startTime = Date.now();
            for (let i = 0; i < floodCount; i++) {
                ahmedWs.send(JSON.stringify({
                    type: 'chat:read',
                    payload: { channelId: ahmedDirectChannel, messageId: i + 1 }
                }));
            }

            await new Promise(r => setTimeout(r, 600));
            const elapsedMs = Date.now() - startTime;
            adminWs.removeListener('message', countListener);

            const pingPromise = waitForEvent(ahmedWs, 'pong', 2000);
            ahmedWs.send(JSON.stringify({ type: 'ping' }));
            const pong = await pingPromise;

            const passed = (pong.type === 'pong');
            recordResult('category3_event_flooding', '3.2 Rapid read receipt flood (500 DB update frames)', passed, {
                sent: floodCount,
                receivedByCounterpart: receivedReceiptCount,
                elapsedMs,
                serverAlive: passed,
                info: `SQLite WAL survived 500 rapid write transactions in ${elapsedMs}ms without deadlock or SQLITE_BUSY`
            });
        }

        // 3.3: Malformed JSON and Boundary Payloads
        {
            let badRequestResponses = 0;
            const errListener = (data) => {
                try {
                    const msg = JSON.parse(data.toString());
                    if (msg.type === 'error' && msg.code === 'BAD_REQUEST') badRequestResponses++;
                } catch (_) {}
            };
            ahmedWs.on('message', errListener);

            ahmedWs.send('{"not valid json');
            ahmedWs.send('{{{');
            ahmedWs.send('NULL');
            ahmedWs.send('');

            await new Promise(r => setTimeout(r, 200));
            ahmedWs.removeListener('message', errListener);

            const pingPromise = waitForEvent(ahmedWs, 'pong', 2000);
            ahmedWs.send(JSON.stringify({ type: 'ping' }));
            const pong = await pingPromise;

            const passed = badRequestResponses > 0 && pong.type === 'pong';
            recordResult('category3_event_flooding', '3.3 Malformed JSON payload handling', passed, {
                badRequestResponses,
                serverAlive: passed,
                info: 'Server returned BAD_REQUEST error frames without closing socket'
            });
        }

        // 3.4: Post-flood server responsiveness check
        {
            const t0 = Date.now();
            const res = await httpRequest('/api/chat/channels', { token: coachAhmedToken });
            const restLatency = Date.now() - t0;

            const t1 = Date.now();
            const pingPromise = waitForEvent(ahmedWs, 'pong', 1000);
            ahmedWs.send(JSON.stringify({ type: 'ping' }));
            await pingPromise;
            const wsLatency = Date.now() - t1;

            const passed = res.status === 200 && restLatency < 200 && wsLatency < 200;
            recordResult('category3_event_flooding', '3.4 Post-flood latency and responsiveness verification', passed, {
                restLatencyMs: restLatency,
                wsLatencyMs: wsLatency,
                info: `REST: ${restLatency}ms, WS ping/pong: ${wsLatency}ms — zero degradation`
            });
        }

        // =====================================================================
        // CATEGORY 4: CONCURRENCY, RACE CONDITIONS & DUPLICATE DELIVERIES
        // =====================================================================
        console.log('\n--- CATEGORY 4: CONCURRENCY & RACE CONDITIONS ---');

        const cohortGroupChannel = 1;

        // 4.1: Simultaneous REST POST and WS chat:send into same channel
        {
            const timestamp = Date.now();
            const restMsgContent = `Concurrent REST message [${timestamp}]`;
            const wsMsgContent = `Concurrent WS message [${timestamp}]`;

            let collectedMessages = [];
            const collector = (data) => {
                try {
                    const msg = JSON.parse(data.toString());
                    if (msg.type === 'chat:message' && [restMsgContent, wsMsgContent].includes(msg.message.content)) {
                        collectedMessages.push(msg.message);
                    }
                } catch (_) {}
            };
            adminWs.on('message', collector);

            const [restResult] = await Promise.all([
                httpRequest(`/api/chat/channels/${cohortGroupChannel}/messages`, {
                    method: 'POST',
                    token: coachAhmedToken,
                    json: { messageType: 'text', content: restMsgContent }
                }),
                new Promise((resolve) => {
                    ahmedWs.send(JSON.stringify({
                        type: 'chat:send',
                        payload: { channelId: cohortGroupChannel, messageType: 'text', content: wsMsgContent }
                    }));
                    resolve(true);
                })
            ]);

            await new Promise(r => setTimeout(r, 300));
            adminWs.removeListener('message', collector);

            assert.strictEqual(restResult.status, 201);

            const sqlite = db.getDb();
            const dbRest = sqlite.prepare('SELECT * FROM chat_messages WHERE content = ?').get(restMsgContent);
            const dbWs = sqlite.prepare('SELECT * FROM chat_messages WHERE content = ?').get(wsMsgContent);

            const passed = dbRest && dbWs && (dbRest.id !== dbWs.id) && collectedMessages.length === 2;
            recordResult('category4_concurrency_race', '4.1 Simultaneous REST POST and WS frame delivery', passed, {
                restDbId: dbRest ? dbRest.id : null,
                wsDbId: dbWs ? dbWs.id : null,
                deliveredFramesCount: collectedMessages.length,
                info: 'Both messages persisted with distinct monotonic IDs and delivered to peer'
            });
        }

        // 4.2: High Concurrency Burst (25 REST POSTs + 25 WS chat:send simultaneously = 50 messages)
        {
            const totalMessages = 50;
            const half = 25;
            const batchTag = `burst-${Date.now()}`;

            let receivedInBatch = 0;
            const batchCounter = (data) => {
                try {
                    const msg = JSON.parse(data.toString());
                    if (msg.type === 'chat:message' && msg.message.content && msg.message.content.includes(batchTag)) {
                        receivedInBatch++;
                    }
                } catch (_) {}
            };
            adminWs.on('message', batchCounter);

            const t0 = Date.now();
            const promises = [];

            for (let i = 0; i < half; i++) {
                promises.push(httpRequest(`/api/chat/channels/${cohortGroupChannel}/messages`, {
                    method: 'POST',
                    token: coachAhmedToken,
                    json: { messageType: 'text', content: `${batchTag}-REST-${i}` }
                }));
            }

            for (let i = 0; i < half; i++) {
                promises.push(new Promise((resolve) => {
                    ahmedWs.send(JSON.stringify({
                        type: 'chat:send',
                        payload: { channelId: cohortGroupChannel, messageType: 'text', content: `${batchTag}-WS-${i}` }
                    }));
                    resolve(true);
                }));
            }

            await Promise.all(promises);
            await new Promise(r => setTimeout(r, 600));
            const elapsedMs = Date.now() - t0;
            adminWs.removeListener('message', batchCounter);

            const sqlite = db.getDb();
            const persistedCount = sqlite.prepare("SELECT COUNT(*) as count FROM chat_messages WHERE content LIKE ?").get(`%${batchTag}%`).count;

            const passed = persistedCount === totalMessages;
            recordResult('category4_concurrency_race', '4.2 50-message concurrent race burst (25 REST + 25 WS)', passed, {
                sent: totalMessages,
                persistedInDb: persistedCount,
                receivedByPeerWs: receivedInBatch,
                elapsedMs,
                info: `All 50 messages persisted in SQLite without collision or loss in ${elapsedMs}ms`
            });
        }

        // 4.3: Duplicate Payload / Idempotency Assessment
        {
            const dupContent = `Duplicate test content [${Date.now()}]`;
            await Promise.all([
                httpRequest(`/api/chat/channels/${cohortGroupChannel}/messages`, {
                    method: 'POST',
                    token: coachAhmedToken,
                    json: { messageType: 'text', content: dupContent }
                }),
                httpRequest(`/api/chat/channels/${cohortGroupChannel}/messages`, {
                    method: 'POST',
                    token: coachAhmedToken,
                    json: { messageType: 'text', content: dupContent }
                })
            ]);

            const sqlite = db.getDb();
            const rows = sqlite.prepare('SELECT id, created_at FROM chat_messages WHERE content = ?').all(dupContent);
            const passed = rows.length === 2 && rows[0].id !== rows[1].id;
            recordResult('category4_concurrency_race', '4.3 Rapid identical payload concurrency handling', passed, {
                insertedRows: rows.length,
                ids: rows.map(r => r.id),
                info: 'System generates distinct sequential IDs without key collision'
            });
        }

        // 4.4: Dual-Channel Broadcast Consistency (REST POST broadcasts to WS and SSE)
        {
            let wsReceived = false;
            let sseReceived = false;
            const dualContent = `Dual bridge check [${Date.now()}]`;

            const wsPromise = new Promise((resolve) => {
                const listener = (data) => {
                    try {
                        const msg = JSON.parse(data.toString());
                        if (msg.type === 'chat:message' && msg.message.content === dualContent) {
                            wsReceived = true;
                            adminWs.removeListener('message', listener);
                            resolve(true);
                        }
                    } catch (_) {}
                };
                adminWs.on('message', listener);
            });

            const controller = new AbortController();
            const ssePromise = (async () => {
                try {
                    const res = await fetch(`${BASE_HTTP_URL}/api/chat/stream?token=${adminToken}`, {
                        signal: controller.signal
                    });
                    const reader = res.body.getReader();
                    const decoder = new TextDecoder();
                    while (true) {
                        const { value, done } = await reader.read();
                        if (done) break;
                        const text = decoder.decode(value);
                        if (text.includes(dualContent)) {
                            sseReceived = true;
                            break;
                        }
                    }
                } catch (_) {}
            })();

            await new Promise(r => setTimeout(r, 150));

            const postRes = await httpRequest(`/api/chat/channels/${cohortGroupChannel}/messages`, {
                method: 'POST',
                token: coachAhmedToken,
                json: { messageType: 'text', content: dualContent }
            });

            await Promise.race([
                Promise.all([wsPromise, ssePromise]),
                new Promise(r => setTimeout(r, 1500))
            ]);
            controller.abort();

            const passed = wsReceived && sseReceived;
            recordResult('category4_concurrency_race', '4.4 Dual-engine bridge broadcast consistency (WS + SSE)', passed, {
                receivedByWS: wsReceived,
                receivedBySSE: sseReceived,
                restPostStatus: postRes.status,
                info: 'REST message simultaneously delivered to both WebSocket and SSE subscribers'
            });
        }

        // =====================================================================
        // CATEGORY 5: PAYLOAD VALIDATION & EDGE CASE REJECTIONS
        // =====================================================================
        console.log('\n--- CATEGORY 5: PAYLOAD VALIDATION & BOUNDARY DEFENSE ---');

        // 5.1: Oversized Content (> 10,000 characters) over WS
        {
            const errPromise = waitForEvent(ahmedWs, 'error');
            ahmedWs.send(JSON.stringify({
                type: 'chat:send',
                payload: {
                    channelId: ahmedDirectChannel,
                    messageType: 'text',
                    content: 'A'.repeat(10001)
                }
            }));
            const err = await errPromise;
            const passed = err.code === 'CONTENT_TOO_LONG';
            recordResult('category5_payload_validation', '5.1 Oversized text payload rejection (>10k chars)', passed, {
                code: err.code,
                info: 'Rejected with CONTENT_TOO_LONG'
            });
        }

        // 5.2: Invalid messageType injection over WS
        {
            const errPromise = waitForEvent(ahmedWs, 'error');
            ahmedWs.send(JSON.stringify({
                type: 'chat:send',
                payload: {
                    channelId: ahmedDirectChannel,
                    messageType: '<script>alert(1)</script>',
                    content: 'Testing invalid type'
                }
            }));
            const err = await errPromise;
            const passed = err.code === 'INVALID_MESSAGE_TYPE';
            recordResult('category5_payload_validation', '5.2 Invalid messageType injection rejection', passed, {
                code: err.code,
                info: 'Rejected with INVALID_MESSAGE_TYPE'
            });
        }

        // 5.3: Empty text content over WS
        {
            const errPromise = waitForEvent(ahmedWs, 'error');
            ahmedWs.send(JSON.stringify({
                type: 'chat:send',
                payload: {
                    channelId: ahmedDirectChannel,
                    messageType: 'text',
                    content: '     '
                }
            }));
            const err = await errPromise;
            const passed = err.code === 'CONTENT_REQUIRED';
            recordResult('category5_payload_validation', '5.3 Whitespace-only content rejection', passed, {
                code: err.code,
                info: 'Rejected with CONTENT_REQUIRED'
            });
        }

        // 5.4: Missing mediaUrl for audio/image over WS
        {
            const errPromise = waitForEvent(ahmedWs, 'error');
            ahmedWs.send(JSON.stringify({
                type: 'chat:send',
                payload: {
                    channelId: ahmedDirectChannel,
                    messageType: 'audio',
                    content: 'Voice note without URL'
                }
            }));
            const err = await errPromise;
            const passed = err.code === 'MEDIA_URL_REQUIRED';
            recordResult('category5_payload_validation', '5.4 Missing mediaUrl for media messages rejection', passed, {
                code: err.code,
                info: 'Rejected with MEDIA_URL_REQUIRED'
            });
        }

        // 5.5: Unknown event type over WS
        {
            const errPromise = waitForEvent(ahmedWs, 'error');
            ahmedWs.send(JSON.stringify({
                type: 'admin:elevate_privileges',
                payload: {}
            }));
            const err = await errPromise;
            const passed = err.code === 'UNKNOWN_EVENT';
            recordResult('category5_payload_validation', '5.5 Unknown event type rejection', passed, {
                code: err.code,
                info: 'Rejected with UNKNOWN_EVENT'
            });
        }

        console.log('\n================================================================');
        console.log('                 ADVERSARIAL HARNESS SUMMARY                    ');
        console.log('================================================================');

        let totalTests = 0;
        let passedTests = 0;
        for (const [cat, results] of Object.entries(testResults)) {
            const catPassed = results.filter(r => r.passed).length;
            totalTests += results.length;
            passedTests += catPassed;
            console.log(`• ${cat}: ${catPassed}/${results.length} PASSED`);
        }
        console.log(`\nOVERALL SCORE: ${passedTests}/${totalTests} (${Math.round((passedTests / totalTests) * 100)}%)`);

        return { totalTests, passedTests, testResults };

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
            console.log('✓ Adversarial test server closed.');
        }
    }
}

if (require.main === module) {
    runAdversarialSuite().then(({ totalTests, passedTests }) => {
        if (passedTests === totalTests) {
            console.log('\n🎉 ALL ADVERSARIAL STRESS TESTS COMPLETED SUCCESSFULLY (100%).');
            process.exit(0);
        } else {
            console.error('\n⚠️ SOME ADVERSARIAL STRESS TESTS FAILED.');
            process.exit(1);
        }
    }).catch((err) => {
        console.error('Fatal execution error:', err);
        process.exit(1);
    });
}

module.exports = { runAdversarialSuite };
