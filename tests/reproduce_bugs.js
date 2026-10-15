/**
 * Targeted Vulnerability Reproduction Script
 * Empirical Challenger M1.1
 */

const assert = require('assert');
const http = require('http');
const { WebSocket } = require('ws');
const { app, initWebSocketServer } = require('../server/server');
const db = require('../server/database');

const TEST_PORT = 3388;
const WS_URL = `ws://127.0.0.1:${TEST_PORT}/ws`;

async function testVulnerabilities() {
    console.log('=== فحص الثغرات البرمجية والانهيارات غير المعالجة (Vulnerability Reproduction) ===\n');

    db.initializeDatabase(true);
    const server = http.createServer(app);
    const { channelManager } = initWebSocketServer(server);

    await new Promise((resolve) => server.listen(TEST_PORT, resolve));

    // Get coach token
    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'coach@cyce52.com', password: 'Coach@2026' })
    });
    const { token } = await res.json();

    const vulnerabilities = [];

    // Helper to run a test on a dedicated fresh socket
    async function runCase(name, payloadToSend) {
        return new Promise((resolve) => {
            const ws = new WebSocket(`${WS_URL}?token=${token}`);
            let responded = false;

            const timeout = setTimeout(() => {
                if (!responded) {
                    try { ws.close(); } catch (_) {}
                    resolve({ name, crashed: false, timeout: true });
                }
            }, 1500);

            ws.on('open', () => {
                // Wait for connection:ack then send payload
            });

            ws.on('message', (data) => {
                const msg = JSON.parse(data.toString());
                if (msg.type === 'connection:ack') {
                    // Send test payload
                    const raw = typeof payloadToSend === 'string' ? payloadToSend : JSON.stringify(payloadToSend);
                    try {
                        ws.send(raw);
                    } catch (e) {
                        clearTimeout(timeout);
                        resolve({ name, sendError: e.message });
                    }
                } else if (msg.type === 'error' || msg.type === 'chat:message' || msg.type === 'pong') {
                    responded = true;
                    clearTimeout(timeout);
                    try { ws.close(); } catch (_) {}
                    resolve({ name, handled: true, response: msg });
                }
            });

            ws.on('close', (code, reason) => {
                if (!responded) {
                    clearTimeout(timeout);
                    resolve({ name, closedUnexpectedly: true, code, reason: reason.toString() });
                }
            });

            ws.on('error', (err) => {
                if (!responded) {
                    clearTimeout(timeout);
                    resolve({ name, socketError: err.message });
                }
            });
        });
    }

    // Capture uncaught exceptions
    const uncaught = [];
    const uncaughtHandler = (err) => {
        uncaught.push({ message: err.message, stack: err.stack });
    };
    process.on('uncaughtException', uncaughtHandler);

    try {
        // Case 1: Send JSON null
        console.log('1. اختبار إرسال JSON null ("null")...');
        const c1 = await runCase('JSON null', 'null');
        console.log('  النتيجة:', c1);

        // Case 2: Send chat:send with payload: null
        console.log('\n2. اختبار إرسال chat:send بحمولة null ({ "type": "chat:send", "payload": null })...');
        const c2 = await runCase('chat:send payload null', { type: 'chat:send', payload: null });
        console.log('  النتيجة:', c2);

        // Case 3: Send chat:typing with payload: null
        console.log('\n3. اختبار إرسال chat:typing بحمولة null ({ "type": "chat:typing", "payload": null })...');
        const c3 = await runCase('chat:typing payload null', { type: 'chat:typing', payload: null });
        console.log('  النتيجة:', c3);

        // Case 4: Send chat:read with payload: null
        console.log('\n4. اختبار إرسال chat:read بحمولة null ({ "type": "chat:read", "payload": null })...');
        const c4 = await runCase('chat:read payload null', { type: 'chat:read', payload: null });
        console.log('  النتيجة:', c4);

        // Case 5: Send chat:send with numeric content
        console.log('\n5. اختبار إرسال chat:send بمحتوى رقمي ({ type: "chat:send", channelId: 1, content: 12345 })...');
        const c5 = await runCase('chat:send numeric content', { type: 'chat:send', channelId: 1, content: 12345 });
        console.log('  النتيجة:', c5);

        // Case 6: Send chat:send with boolean content
        console.log('\n6. اختبار إرسال chat:send بمحتوى منطقي ({ type: "chat:send", channelId: 1, content: true })...');
        const c6 = await runCase('chat:send boolean content', { type: 'chat:send', channelId: 1, content: true });
        console.log('  النتيجة:', c6);

        // Case 7: Send chat:send with object content
        console.log('\n7. اختبار إرسال chat:send بمحتوى كائن ({ type: "chat:send", channelId: 1, content: { foo: "bar" } })...');
        const c7 = await runCase('chat:send object content', { type: 'chat:send', channelId: 1, content: { foo: 'bar' } });
        console.log('  النتيجة:', c7);

        // Case 8: Abrupt TCP socket destroy without WS close
        console.log('\n8. اختبار تدمير مقبس TCP مباغت بدون إرسال إطار الإغلاق...');
        const abruptWs = new WebSocket(`${WS_URL}?token=${token}`);
        await new Promise((res) => {
            abruptWs.on('message', (d) => {
                if (JSON.parse(d.toString()).type === 'connection:ack') res();
            });
        });
        const countBefore = channelManager.userSockets.get(2)?.size || 0;
        abruptWs._socket.destroy();
        await new Promise(r => setTimeout(r, 200));
        const countAfter = channelManager.userSockets.get(2)?.size || 0;
        console.log(`  المقابس قبل التدمير: ${countBefore}، بعد التدمير: ${countAfter}`);

        console.log('\n================================================================');
        console.log(`🔥 إجمالي الاستثناءات غير المعالجة المرصودة (Uncaught Exceptions): ${uncaught.length}`);
        uncaught.forEach((u, i) => {
            console.log(`\n[${i+1}] ${u.message}\n${u.stack.split('\n').slice(0, 3).join('\n')}`);
        });
        console.log('================================================================');

    } finally {
        process.removeListener('uncaughtException', uncaughtHandler);
        await new Promise(r => server.close(r));
    }
}

testVulnerabilities().catch(console.error);
