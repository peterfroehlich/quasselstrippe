import { test, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const disk = new Map();
const local = new Map();
globalThis.window = new EventTarget();
globalThis.localStorage = { getItem: k => local.get(k) ?? null, setItem: (k, v) => local.set(k, v), removeItem: k => local.delete(k) };
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true } });
globalThis.testDisk = disk;
let storage, server, offline, rejectReview, loseReviewResponse, acceptedReviews;
const encode = code => 'data:text/javascript;base64,' + Buffer.from(code).toString('base64');
const compile = code => ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const fixture = (id, language = 'en', profileId = null) => ({ id, word: id, translation: 'Wort', language,
  profileId, lesson: 'Test', partOfSpeech: 'noun', box: 1, correctCount: 0, incorrectCount: 0, createdAt: Date.now() });
const response = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
const journal = () => disk.get('quasselstrippe_sync_v2');
before(async () => {
  const idb = encode(`export async function get(key) { return structuredClone(globalThis.testDisk.get(key)); }
    export async function set(key, value) { globalThis.testDisk.set(key, structuredClone(value)); }`);
  const modules = {};
  for (const name of ['api', 'learning', 'validation']) modules[name] = encode(compile(await readFile(`client/src/services/${name}.ts`, 'utf8')));
  let code = compile(await readFile('client/src/services/storage.ts', 'utf8'));
  code = code.replace(/from ['"]idb-keyval['"]/g, `from '${idb}'`);
  for (const [name, url] of Object.entries(modules)) code = code.replace(new RegExp(`from ['"]\\./${name}['"]`, 'g'), `from '${url}'`);
  storage = await import(encode(code));
});
beforeEach(() => {
  disk.clear(); local.clear(); navigator.onLine = true; offline = false; rejectReview = false; loseReviewResponse = false; acceptedReviews = 0;
  server = { words: [fixture('english'), fixture('latin', 'la'), fixture('private-b', 'en', 'b')],
    profiles: [{ id: 'default', name: 'A', avatar: '🦊', createdAt: 0 }, { id: 'b', name: 'B', avatar: '🦊', createdAt: 0 }],
    progress: new Map(), reviews: new Set(), settings: { geminiApiKey: '', aiAvailable: true, activeLanguage: 'en', speechRate: 1, autoPlayAudio: true } };
  globalThis.fetch = async (url, options = {}) => {
    if (offline) throw new Error('Network down');
    const parsed = new URL(url, 'http://localhost'); const path = parsed.pathname;
    const body = options.body ? JSON.parse(options.body) : {}; const method = options.method || 'GET';
    const profileId = parsed.searchParams.get('profileId') || body.profileId;
    if (path === '/api/profiles' && method === 'GET') return response(server.profiles);
    if (path === '/api/profiles' && method === 'POST') { if (!server.profiles.some(p => p.id === body.id)) server.profiles.push(body); return response(body); }
    if (path.startsWith('/api/profiles/') && method === 'DELETE') { server.profiles = server.profiles.filter(p => p.id !== path.split('/').at(-1)); return response({ success: true }); }
    if (path === '/api/words' && method === 'GET') return response(server.words.filter(w => !w.profileId || w.profileId === profileId).map(w => ({ ...w, ...(server.progress.get(`${profileId}:${w.id}`) || {}) })));
    if (path.endsWith('/review')) {
      if (rejectReview) return response({ error: 'Review rejected' }, 400);
      const id = path.split('/').at(-2);
      if (!server.reviews.has(body.eventId)) {
        server.reviews.add(body.eventId); acceptedReviews++;
        const prior = server.progress.get(`${profileId}:${id}`) || {};
        server.progress.set(`${profileId}:${id}`, { box: 2, correctCount: (prior.correctCount || 0) + 1, incorrectCount: 0, lastReviewedAt: body.reviewedAt });
      }
      if (loseReviewResponse) { loseReviewResponse = false; throw new Error('Response lost after commit'); }
      return response({ ...server.words.find(w => w.id === id), ...server.progress.get(`${profileId}:${id}`) });
    }
    if (path === '/api/words/batch') {
      for (const w of body.words) { const index = server.words.findIndex(item => item.id === w.id); if (index < 0) server.words.push(w); else server.words[index] = w; }
      return response({ words: body.words });
    }
    if (path.startsWith('/api/words/') && method === 'DELETE') {
      server.words = server.words.filter(w => w.id !== path.split('/').at(-1)); return response({ success: true });
    }
    if (path === '/api/settings') { if (method === 'PUT') server.settings = { ...server.settings, ...body }; return response(server.settings); }
    return response({ error: 'Missing test endpoint' }, 404);
  };
});

test('successful empty collections remain empty and deleted words do not return', async () => {
  await storage.loadWords(undefined, 'default'); server.words = [];
  assert.deepEqual(await storage.loadWords(undefined, 'default'), []);
  offline = true; assert.deepEqual(await storage.loadWords(undefined, 'default'), []);
});
test('language and profile caches never fall back to another collection', async () => {
  await storage.loadWords(undefined, 'default'); await storage.loadWords(undefined, 'b'); offline = true;
  assert.deepEqual((await storage.loadWords('la', 'default')).map(w => w.id), ['latin']);
  assert.ok(!(await storage.loadWords(undefined, 'default')).some(w => w.id === 'private-b'));
  assert.deepEqual(await storage.loadWords(undefined, 'never-loaded'), []);
});
test('offline reviews survive reconnect and are replayed exactly once as reviews', async () => {
  await storage.loadWords(undefined, 'default'); offline = true;
  const localWords = await storage.recordReviewProgress('english', true, 'default');
  assert.equal(localWords.find(w => w.id === 'english').correctCount, 1);
  assert.equal(journal().pending.length, 1); assert.equal(journal().pending[0].kind, 'review');
  offline = false;
  const remote = await storage.loadWords(undefined, 'default');
  assert.equal(remote.find(w => w.id === 'english').correctCount, 1);
  assert.equal(journal().pending.length, 0); assert.equal(acceptedReviews, 1);
  await storage.loadWords(undefined, 'default'); assert.equal(acceptedReviews, 1);
});
test('losing a response after commit does not count the review twice', async () => {
  await storage.loadWords(undefined, 'default'); loseReviewResponse = true;
  const words = await storage.recordReviewProgress('english', true, 'default');
  assert.equal(words.find(w => w.id === 'english').correctCount, 1); assert.equal(acceptedReviews, 1); assert.equal(journal().pending.length, 0);
});
test('concurrent offline reviews are serialized without losing either event', async () => {
  await storage.loadWords(undefined, 'default'); offline = true;
  await Promise.all([storage.recordReviewProgress('english', true, 'default'), storage.recordReviewProgress('english', true, 'default')]);
  assert.equal(journal().pending.length, 2);
  assert.equal((await storage.loadWords(undefined, 'default')).find(w => w.id === 'english').correctCount, 2);
  assert.equal((await storage.loadWords(undefined, 'default')).find(w => w.id === 'english').box, 2);
});
test('server rejection is surfaced and does not become a queued success', async () => {
  await storage.loadWords(undefined, 'default'); rejectReview = true;
  await assert.rejects(storage.recordReviewProgress('english', true, 'default'), /Review rejected/);
  assert.equal(journal().pending.length, 0); assert.equal(acceptedReviews, 0);
});
test('authentication expiry preserves pending changes until the next login', async () => {
  await storage.loadWords(undefined, 'default'); offline = true;
  await storage.recordReviewProgress('english', true, 'default'); offline = false;
  const fetchBefore = globalThis.fetch; globalThis.fetch = async () => response({ error: 'Session expired' }, 401);
  await assert.rejects(storage.syncOfflineChanges(), /Session expired/); assert.equal(journal().pending.length, 1);
  globalThis.fetch = fetchBefore; await storage.syncOfflineChanges(); assert.equal(journal().pending.length, 0); assert.equal(acceptedReviews, 1);
});
test('offline statistics have real summary counts and explicitly unavailable history', async () => {
  await storage.loadWords(undefined, 'default'); offline = true;
  await storage.recordReviewProgress('english', true, 'default');
  const stats = await storage.getLearnerStats('default'); assert.equal(stats.correctReviews, 1);
  assert.equal(stats.historyAvailable, false); assert.deepEqual(stats.history, []); assert.equal(stats.streakDays, 0);
});
test('browser keys remain local and capability survives loading shared settings', async () => {
  await storage.saveSettings({ ...server.settings, geminiApiKey: 'personal-browser-key' });
  assert.equal(server.settings.geminiApiKey, '');
  const settings = await storage.loadSettingsAsync(); assert.equal(settings.geminiApiKey, 'personal-browser-key'); assert.equal(settings.aiAvailable, true);
});
test('offline add then delete is retained in order and does not resurrect vocabulary', async () => {
  await storage.loadWords(undefined, 'default'); offline = true;
  await storage.addWord(fixture('temporary'), 'default'); await storage.deleteWord('temporary', 'default');
  assert.deepEqual(journal().pending.map(op => op.kind), ['addWords', 'deleteWord']);
  offline = false; const words = await storage.loadWords(undefined, 'default'); assert.ok(!words.some(w => w.id === 'temporary')); assert.equal(journal().pending.length, 0);
});
test('invalid offline imports never enter the journal', async () => {
  await storage.loadWords(undefined, 'default'); offline = true;
  await assert.rejects(storage.addWords([fixture('valid'), { ...fixture('bad'), partOfSpeech: 'unknown' }], 'default'), /part of speech/);
  assert.equal(journal().pending.length, 0); assert.ok(!journal().words.default.some(w => w.id === 'valid'));
});
test('profile creation can be queued and replayed without duplicate profiles', async () => {
  await storage.loadProfiles(); await storage.loadWords(undefined, 'default'); offline = true;
  const profiles = await storage.createProfile({ name: 'New pupil', avatar: '🐱' });
  assert.equal(profiles.length, 3); offline = false;
  assert.equal((await storage.loadProfiles()).length, 3); assert.equal(server.profiles.filter(p => p.name === 'New pupil').length, 1);
});

test('offline shared vocabulary changes propagate to cached profiles without copying their progress', async () => {
  await storage.loadWords(undefined, 'default'); await storage.loadWords(undefined, 'b'); offline = true;
  await storage.recordReviewProgress('english', true, 'default');
  await storage.addWord(fixture('shared-new'), 'default');
  const other = await storage.loadWords(undefined, 'b'); assert.ok(other.some(w => w.id === 'shared-new'));
  assert.equal(other.find(w => w.id === 'english').correctCount, 0);
  await storage.deleteWord('english', 'default'); assert.ok(!(await storage.loadWords(undefined, 'b')).some(w => w.id === 'english'));
});
test('offline settings survive reconnect and never include the personal key in queued payloads', async () => {
  offline = true;
  await storage.saveSettings({ ...server.settings, speechRate: 0.6, geminiApiKey: 'local-only-key' });
  assert.equal(journal().pending[0].kind, 'settings'); assert.ok(!JSON.stringify(journal()).includes('local-only-key'));
  assert.equal((await storage.loadSettingsAsync()).speechRate, 0.6);
  offline = false; const settings = await storage.loadSettingsAsync(); assert.equal(settings.speechRate, 0.6);
  assert.equal(settings.geminiApiKey, 'local-only-key'); assert.equal(server.settings.geminiApiKey, '');
});
