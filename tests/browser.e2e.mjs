import { test, before, beforeEach, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { chromium, webkit, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let browser, context, page, processHandle, directory, base;
const errors = [];
before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'quasselstrippe-browser-'));
  const reservation = createServer().listen(0, '127.0.0.1'); await new Promise(resolve => reservation.once('listening', resolve));
  const port = reservation.address().port; await new Promise(resolve => reservation.close(resolve));
  base = `http://127.0.0.1:${port}`;
  processHandle = spawn(process.execPath, ['server/dist/index.js'], { cwd: process.cwd(),
    env: { ...process.env, PORT: String(port), DATABASE_PATH: join(directory, 'browser.db'), NODE_ENV: 'production', APP_PASSWORD: 'private-browser-test-password', GEMINI_API_KEY: 'test-only-key', COOKIE_SECURE: 'false' }, stdio: 'pipe' });
  let logs = ''; processHandle.stdout.on('data', chunk => logs += chunk); processHandle.stderr.on('data', chunk => logs += chunk);
  await new Promise((resolve, reject) => {
    const deadline = setTimeout(() => reject(new Error(`Server did not start: ${logs}`)), 10000);
    processHandle.stdout.on('data', () => { if (logs.includes('server listening')) { clearTimeout(deadline); resolve(); } });
    processHandle.once('exit', () => { clearTimeout(deadline); reject(new Error(logs)); });
  });
  browser = await (process.env.TEST_BROWSER === 'webkit' ? webkit : chromium).launch({ headless: true });
});
beforeEach(async () => {
  errors.length = 0;
  context = await browser.newContext({ viewport: { width: 1100, height: 850 } });
  // Deterministic browser speech, with the actual app rate observable in tests.
  await context.addInitScript(() => {
    window.__speechRates = [];
    speechSynthesis.speak = utterance => { window.__speechRates.push(utterance.rate); utterance.onstart?.(); utterance.onend?.(); };
  });
  page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
  await page.goto(base);
  await page.getByLabel('Passwort', { exact: true }).fill('private-browser-test-password');
  await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Profil auswählen' })).toBeVisible();
  await context.request.post(base + '/api/words/reset-defaults');
  const existing = await (await context.request.get(base + '/api/profiles')).json();
  for (const p of existing) if (p.id !== 'default') await context.request.delete(base + '/api/profiles/' + p.id);
  await context.request.post(base + '/api/profiles', { data: { id: 'second-pupil', name: 'Schüler 2', avatar: '🐱' } });
  await page.reload();
  await expect(page.getByRole('button', { name: 'Profil auswählen' })).toBeVisible();
});
afterEach(async () => {
  assert.deepEqual(errors, [], 'No browser runtime errors');
  await context.close();
});
after(async () => {
  await browser?.close();
  if (processHandle && processHandle.exitCode === null) { processHandle.kill('SIGTERM'); await new Promise(resolve => processHandle.once('exit', resolve)); }
  await rm(directory, { recursive: true, force: true });
});

test('login protects data, settings trap focus, Escape restores focus, and saved speech rate is used', async () => {
  const unauthenticated = await fetch(base + '/api/words'); assert.equal(unauthenticated.status, 401);
  const opener = page.getByRole('button', { name: 'Einstellungen', exact: true }); await opener.click();
  const dialog = page.getByRole('dialog', { name: 'Einstellungen' }); await expect(dialog).toBeVisible();
  await page.keyboard.press('Shift+Tab');
  assert.ok(await dialog.evaluate(el => el.contains(document.activeElement)));
  await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0); await expect(opener).toBeFocused();
  await opener.click();
  await dialog.locator('input[type=range]').fill('0.65');
  await dialog.getByRole('button', { name: /speichern/i }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole('button', { name: 'Vokabeltest', exact: true }).click();
  await expect.poll(() => page.evaluate(() => Math.round(window.__speechRates.at(-1) * 100) / 100)).toBe(0.65);
  const settings = await (await context.request.get(base + '/api/settings')).json(); assert.equal(settings.geminiApiKey, ''); assert.equal(settings.aiAvailable, true);
});
test('switching pupils clears the previous quiz score and answer state', async () => {
  await page.getByRole('button', { name: 'Vokabeltest', exact: true }).click();
  const prompt = await page.locator('main h2').innerText();
  const words = await (await context.request.get(base + '/api/words?profileId=default')).json();
  const answer = words.find(w => w.word === prompt).translation;
  await page.getByRole('button', { name: answer, exact: true }).click();
  await expect(page.getByText(/Punkte: 1/)).toBeVisible();
  await page.getByRole('button', { name: 'Profil auswählen' }).click();
  await page.getByRole('button', { name: /Schüler 2/ }).click();
  await expect(page.getByRole('button', { name: 'Profil auswählen' })).toHaveAttribute('title', 'Aktiver Lerner: Schüler 2');
  await page.getByRole('button', { name: 'Vokabeltest', exact: true }).click();
  await expect(page.getByText(/Frage 1 von.*Punkte: 0/)).toBeVisible();
  assert.equal(await page.getByRole('button', { name: 'Nächste Frage' }).count(), 0);
});
test('offline answers are visible locally and survive reconnection without duplicate reviews', async () => {
  await page.getByRole('button', { name: 'Vokabeltest', exact: true }).click();
  const prompt = await page.locator('main h2').innerText();
  const words = await (await context.request.get(base + '/api/words?profileId=default')).json();
  const target = words.find(w => w.word === prompt);
  await context.setOffline(true);
  await page.getByRole('button', { name: target.translation, exact: true }).click();
  await expect(page.getByText('1 Änderungen auf diesem Gerät gespeichert. Synchronisierung bei Verbindung.')).toBeVisible();
  await expect(page.getByText(/Punkte: 1/)).toBeVisible();
  await context.setOffline(false);
  await expect.poll(async () => (await (await context.request.get(base + `/api/words/${target.id}?profileId=default`)).json()).correctCount).toBe(1);
  await expect(page.getByText('1 Änderungen auf diesem Gerät gespeichert. Synchronisierung bei Verbindung.')).toHaveCount(0);
});
test('handwriting survives resize and undo restores a cleared drawing', async () => {
  await page.getByRole('button', { name: 'Schreiben', exact: true }).click();
  const canvas = page.locator('#root canvas'); await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + 70, box.y + 80); await page.mouse.down(); await page.mouse.move(box.x + 230, box.y + 100, { steps: 12 }); await page.mouse.up();
  const ink = () => canvas.evaluate(el => el.getContext('2d').getImageData(0, 0, el.width, el.height).data.some((value, index) => index % 4 === 3 && value > 0));
  assert.equal(await ink(), true);
  await page.setViewportSize({ width: 850, height: 1000 }); await expect.poll(ink).toBe(true);
  await page.getByRole('button', { name: 'Leeren', exact: true }).click(); assert.equal(await ink(), false);
  await page.getByRole('button', { name: 'Rückgängig', exact: true }).click(); assert.equal(await ink(), true);
  let receivedDrawing = false;
  await page.route('**/api/ai/grade-handwriting', async route => {
    const data = route.request().postDataJSON(); receivedDrawing = Boolean(data.base64Data);
    await route.fulfill({ json: { recognizedWord: data.expectedWord, isCorrect: true, score: 100, schoolGrade: '1', feedback: 'Gut!' } });
  });
  await page.getByRole('button', { name: /Fertig & Prüfen/ }).click();
  await expect(page.getByRole('button', { name: 'Nächstes Wort' })).toBeVisible(); assert.equal(receivedDrawing, true);
  await expect(page.getByText(/^Note:/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Nächstes Wort' }).click();
  await expect(canvas).toBeVisible();
  assert.equal(await canvas.evaluate(el => el.width >= el.getBoundingClientRect().width), true);
  assert.equal(await ink(), false);
});
test('server AI capability enables worksheet scanning without entering a browser key', async () => {
  await page.getByRole('button', { name: 'Admin & Scanner', exact: true }).click();
  const upload = page.locator('input[type=file]');
  await upload.setInputFiles({ name: 'worksheet.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nGQAAAAASUVORK5CYII=', 'base64') });
  let called = false;
  await page.route('**/api/ai/analyze-worksheet', async route => {
    called = true;
    await route.fulfill({ json: { lessonName: 'Scan', detectedTopic: 'Test', words: [{ word: 'scanned', translation: 'gescannt', language: 'en', lesson: 'Scan', partOfSpeech: 'verb', selected: true }] } });
  });
  await page.getByRole('button', { name: /Analysieren|analysieren|erkennen|Erkennen/ }).click();
  await expect(page.locator('input[value=scanned]')).toBeVisible(); assert.equal(called, true);
  let imports = 0;
  await page.route('**/api/words/batch', async route => { imports++; await new Promise(resolve => setTimeout(resolve, 200)); await route.continue(); });
  await page.getByRole('button', { name: /Vokabeln zur Sammlung hinzufügen/ }).click({ clickCount: 2, delay: 20 });
  await expect.poll(async () => (await (await context.request.get(base + '/api/words?profileId=default')).json()).filter(w => w.word === 'scanned').length).toBe(1);
  assert.equal(imports, 1);
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Abmelden', exact: true }).click();
  await expect(page.getByLabel('Passwort', { exact: true })).toBeVisible();
  await context.setOffline(false);
  await page.reload();
  await expect(page.getByLabel('Passwort', { exact: true })).toBeVisible();
  await page.getByLabel('Passwort', { exact: true }).fill('private-browser-test-password');
  await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Profil auswählen' })).toBeVisible();
  await context.clearCookies();
  await page.getByRole('button', { name: 'Lernstatistik öffnen' }).first().click();
  await expect(page.getByLabel('Passwort', { exact: true })).toBeVisible();
});

test('sparse pen samples form continuous ink through the final lift point', async () => {
  await page.getByRole('button', { name: 'Schreiben', exact: true }).click();
  const canvas = page.locator('#root canvas'); await expect(canvas).toBeVisible();
  const gaps = await canvas.evaluate(el => {
    const box = el.getBoundingClientRect();
    const fire = (type, x, buttons) => el.dispatchEvent(new PointerEvent(type, {
      bubbles: true, pointerId: 71, pointerType: 'pen', isPrimary: true,
      clientX: box.left + x, clientY: box.top + 80, buttons, pressure: buttons ? 0.5 : 0,
    }));
    fire('pointerdown', 80, 1);
    fire('pointermove', 120, 1);
    fire('pointermove', 160, 1);
    fire('pointermove', 200, 1);
    fire('pointerup', 240, 0);
    const ctx = el.getContext('2d');
    const scale = el.width / box.width;
    const missing = [];
    for (let x = 80; x <= 240; x++) {
      if (!ctx.getImageData(Math.floor(x * scale), Math.floor(80 * scale), 1, 1).data[3]) missing.push(x);
    }
    return missing;
  });
  assert.deepEqual(gaps, [], 'No blank pixels between pen samples or before the lift point');
});

test('rapid pen re-contact survives delayed capture loss and unrelated pen events', async () => {
  await page.getByRole('button', { name: 'Schreiben', exact: true }).click();
  const canvas = page.locator('#root canvas'); await expect(canvas).toBeVisible();
  const result = await canvas.evaluate(el => {
    const box = el.getBoundingClientRect();
    const fire = (type, x, y, buttons, id = 71, pressure = buttons ? 0.5 : 0, timestamp) => {
      const event = new PointerEvent(type, { bubbles: true, pointerId: id, pointerType: 'pen',
        isPrimary: true, clientX: box.left + x, clientY: box.top + y, buttons, pressure });
      if (timestamp !== undefined) Object.defineProperty(event, 'timeStamp', { value: timestamp });
      el.dispatchEvent(event);
    };
    const oldTime = performance.now() - 100;
    fire('pointerdown', 80, 80, 1); fire('pointermove', 120, 80, 1); fire('pointerup', 140, 80, 0);
    fire('pointerdown', 80, 120, 1);
    fire('lostpointercapture', 140, 80, 0); // previous stroke, reused pen ID
    fire('pointerup', 140, 80, 0, 71, 0, oldTime); // delayed old lift
    fire('pointercancel', 140, 80, 0, 72); // another pointer
    fire('pointerup', 140, 80, 0, 72);
    fire('pointermove', 80, 120, 0); // transient hover
    fire('pointermove', 120, 120, 1);
    fire('pointermove', 160, 120, 0, 71, 0.5); // contact with pressure
    fire('pointerup', 180, 120, 0);
    fire('pointermove', 220, 120, 0); // real post-lift hover must not draw
    const ctx = el.getContext('2d'); const scale = el.width / box.width;
    const ink = (x, y) => ctx.getImageData(Math.floor(x * scale), Math.floor(y * scale), 1, 1).data[3] > 0;
    return { first: ink(110, 80), second: ink(130, 120), pressure: ink(150, 120),
      end: ink(175, 120), hover: ink(210, 120), bridge: ink(110, 100) };
  });
  assert.deepEqual(result, { first: true, second: true, pressure: true, end: true, hover: false, bridge: false });
});

test('pen contact resumes after a lift or cancellation without a new pointerdown', async () => {
  await page.getByRole('button', { name: 'Schreiben', exact: true }).click();
  const canvas = page.locator('#root canvas'); await expect(canvas).toBeVisible();
  const result = await canvas.evaluate(el => {
    const box = el.getBoundingClientRect();
    const fire = (type, x, y, buttons, pointerType = 'pen') => el.dispatchEvent(new PointerEvent(type, {
      bubbles: true, pointerId: pointerType === 'pen' ? 71 : 72, pointerType, isPrimary: true,
      clientX: box.left + x, clientY: box.top + y, buttons, pressure: buttons ? 0.5 : 0,
    }));
    fire('pointerdown', 80, 60, 1); fire('pointermove', 160, 60, 1); fire('pointerup', 180, 60, 0);
    // Actual pen contact must recover, even if the browser omitted pointerdown.
    fire('pointermove', 80, 100, 1); fire('pointermove', 160, 100, 1);
    fire('pointercancel', 160, 100, 0);
    fire('pointermove', 80, 140, 1); fire('pointermove', 160, 140, 1);
    // A hover-only lift must separate strokes, not connect the next letter.
    fire('pointermove', 180, 140, 0);
    fire('pointermove', 80, 180, 1); fire('pointermove', 160, 180, 1); fire('pointerup', 180, 180, 0);
    fire('pointermove', 220, 180, 0);
    fire('pointermove', 80, 220, 1, 'touch'); fire('pointermove', 160, 220, 1, 'touch');
    const ctx = el.getContext('2d'); const scale = el.width / box.width;
    const ink = (x,y) => ctx.getImageData(Math.floor(x*scale),Math.floor(y*scale),1,1).data[3] > 0;
    return { first: ink(120,60), afterLift: ink(120,100), afterCancel: ink(120,140),
      afterHover: ink(120,180), bridge: ink(120,160), hover: ink(210,180), palm: ink(120,220) };
  });
  assert.deepEqual(result, { first:true,afterLift:true,afterCancel:true,afterHover:true,bridge:false,hover:false,palm:false });
  await page.getByRole('button', { name: 'Rückgängig', exact: true }).click();
  const undo = await canvas.evaluate(el => {
    const scale = el.width/el.getBoundingClientRect().width; const ctx=el.getContext('2d');
    const ink=y=>ctx.getImageData(Math.floor(120*scale),Math.floor(y*scale),1,1).data[3]>0;
    return { previous:ink(140),last:ink(180) };
  });
  assert.deepEqual(undo,{previous:true,last:false});
});
