const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const WebSocket = require('ws');

const viewports = [
    { name: 'iPhone SE / Mini (375px)', width: 375, height: 667 },
    { name: 'iPhone 12/13/14 Pro (390px)', width: 390, height: 844 },
    { name: 'iPhone Plus / Pro Max (414px)', width: 414, height: 896 }
];

const indexPath = path.resolve(__dirname, '../../../index.html');
const fileUrl = 'file://' + indexPath;

async function testViewport(vp) {
    const port = 9400 + Math.floor(Math.random() * 500);
    const chrome = spawn('google-chrome', [
        '--headless=new',
        `--remote-debugging-port=${port}`,
        '--user-data-dir=/tmp/chrome_vp_' + Date.now(),
        '--disable-gpu',
        '--no-sandbox',
        `--window-size=${vp.width},${vp.height}`,
        fileUrl
    ]);

    try {
        let pageTarget = null;
        for (let i = 0; i < 20; i++) {
            await new Promise(r => setTimeout(r, 200));
            try {
                const list = await new Promise((resolve, reject) => {
                    http.get(`http://localhost:${port}/json`, res => {
                        let data = '';
                        res.on('data', chunk => data += chunk);
                        res.on('end', () => resolve(JSON.parse(data)));
                    }).on('error', reject);
                });
                pageTarget = list.find(t => t.type === 'page');
                if (pageTarget) break;
            } catch (_) {}
        }

        if (!pageTarget) throw new Error('Could not find chrome target');

        const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
        await new Promise(r => ws.on('open', r));

        let msgId = 1;
        function send(method, params = {}) {
            return new Promise((resolve, reject) => {
                const id = msgId++;
                const handler = (data) => {
                    const msg = JSON.parse(data);
                    if (msg.id === id) {
                        ws.removeListener('message', handler);
                        if (msg.error) reject(msg.error);
                        else resolve(msg.result);
                    }
                };
                ws.on('message', handler);
                ws.send(JSON.stringify({ id, method, params }));
            });
        }

        await send('Emulation.setDeviceMetricsOverride', {
            width: vp.width,
            height: vp.height,
            deviceScaleFactor: 2,
            mobile: true
        });

        await new Promise(r => setTimeout(r, 1000));

        const res = await send('Runtime.evaluate', {
            expression: `(() => {
                const winW = window.innerWidth;
                const docScrollW = document.documentElement.scrollWidth;
                const bodyScrollW = document.body.scrollWidth;
                const overflowingElements = [];
                document.querySelectorAll('*').forEach(el => {
                    const rect = el.getBoundingClientRect();
                    if (rect.width > winW + 1 || el.scrollWidth > winW + 1) {
                        // Allow horizontal scrollbars only in explicitly intended scroll containers
                        const overflowX = window.getComputedStyle(el).overflowX;
                        if (overflowX !== 'auto' && overflowX !== 'scroll') {
                            overflowingElements.push({
                                tag: el.tagName,
                                id: el.id,
                                className: el.className,
                                width: Math.round(rect.width),
                                scrollWidth: el.scrollWidth,
                                overflowX
                            });
                        }
                    }
                });
                return { winW, docScrollW, bodyScrollW, overflowingElements };
            })()`,
            returnByValue: true
        });

        ws.close();
        chrome.kill();
        return res.result.value;
    } catch (e) {
        chrome.kill();
        throw e;
    }
}

async function main() {
    console.log('=== Checking Mobile Responsive Layout & Horizontal Overflow ===\n');
    let allPassed = true;
    for (const vp of viewports) {
        console.log(`Checking ${vp.name}...`);
        const result = await testViewport(vp);
        const hasOverflow = result.docScrollW > result.winW || result.bodyScrollW > result.winW;
        console.log(`  Window Width: ${result.winW}px`);
        console.log(`  Document ScrollWidth: ${result.docScrollW}px`);
        console.log(`  Body ScrollWidth: ${result.bodyScrollW}px`);
        console.log(`  Horizontal Canvas Overflow: ${hasOverflow ? 'DETECTED ❌' : '0px (SEAMLESS) ✓'}`);
        if (result.overflowingElements.length > 0) {
            console.log(`  Uncontained overflowing elements:`, result.overflowingElements.slice(0, 5));
        }
        if (hasOverflow) allPassed = false;
        console.log('');
    }
    console.log(`Overall Viewport Verdict: ${allPassed ? '100% PASS ✓' : 'FAIL ❌'}`);
}

main().catch(console.error);
