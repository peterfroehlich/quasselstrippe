import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import { gunzipSync } from 'node:zlib';

let server, browser, base;
before(async () => {
  server = await createServer({ root: 'client', server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  base = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); await server?.close(); });

for (const flag of [undefined, false, 'true', true]) {
  test(`telemetry requires literal true; configured value: ${String(flag)}`, async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const sdkRequests = [], payloads = [];
    page.on('request', r => { if (r.url().includes('dash0')) sdkRequests.push(r.url()); });
    await page.route('**/rum-test*', route => route.fulfill({ contentType: 'text/html', body: '<html><head><title>PRIVATE_PUPIL</title></head><body>PRIVATE_HANDWRITING</body></html>' }));
    await page.route('**/api/probe*', route => route.fulfill({ json: { value: 'PRIVATE_RESPONSE' } }));
    await page.route('**/telemetry/v1/*', async route => {
      let body = route.request().postDataBuffer();
      if (route.request().headers()['content-encoding'] === 'gzip') body = gunzipSync(body);
      payloads.push(body.toString());
      await route.fulfill({ json: {} });
    });
    try {
      await page.goto(base + '/rum-test?key=PRIVATE_QUERY#PRIVATE_FRAGMENT');
      await page.evaluate(async flag => {
        window.__QUASSELSTRIPPE_RUM__ = flag;
        const telemetry = await import('/src/telemetry.ts');
        await telemetry.initializeTelemetry();
        telemetry.recordCorrection(1234.6, 'success');
        telemetry.recordPenRecovery();
        telemetry.recordError('runtime');
        console.error('PRIVATE_CONSOLE');
        await fetch('/api/probe?key=PRIVATE_API_KEY');
      }, flag);
      if (flag === true) {
        await page.waitForFunction(() => document.readyState === 'complete');
        await assert.doesNotReject(async () => {
          const deadline = Date.now() + 10000;
          while (!payloads.some(p => p.includes('handwriting.correction')) && Date.now() < deadline) await new Promise(r => setTimeout(r, 100));
          assert.ok(payloads.some(p => p.includes('handwriting.correction')));
        });
        assert.ok(sdkRequests.length);
        assert.ok(payloads.join('').includes('correction.duration_ms'));
        assert.ok(!payloads.join('').includes('PRIVATE_'), 'No pupil, URL, console, or response content in telemetry');
      } else {
        await page.waitForTimeout(500);
        assert.deepEqual(sdkRequests, [], 'Disabled mode never loads SDK');
        assert.deepEqual(payloads, [], 'Disabled mode never exports');
        assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0);
      }
    } finally { await context.close(); }
  });
}
