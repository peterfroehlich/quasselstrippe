import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express from 'express';
import * as db from '../server/dist/db/database.js';
import { createAuth } from '../server/dist/auth.js';
import { wordsRouter } from '../server/dist/routes/words.js';
import { profilesRouter } from '../server/dist/routes/profiles.js';
import { settingsRouter } from '../server/dist/routes/settings.js';
import { nextReviewState, isReviewDue } from '../server/dist/learning.js';

let directory, server, base, cookie;
const word = (id, profileId = null, lesson = 'Test') => ({ id, profileId, lesson, word: id,
  translation: 'Übersetzung', language: 'en', partOfSpeech: 'noun', box: 1,
  correctCount: 0, incorrectCount: 0, createdAt: Date.now() });
const profile = id => ({ id, name: id, avatar: '🦊', createdAt: Date.now() });
async function call(path, { method = 'GET', body, authenticated = true, operationId, headers = {} } = {}) {
  return fetch(base + path, { method, headers: { ...(authenticated ? { Cookie: cookie } : {}),
    ...(body ? { 'Content-Type': 'application/json' } : {}), ...(operationId ? { 'X-Operation-Id': operationId } : {}), ...headers },
    ...(body ? { body: JSON.stringify(body) } : {}) });
}
before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'quasselstrippe-tests-'));
  process.env.DATABASE_PATH = join(directory, 'test.db');
  db.getDatabase();
  const app = express(); app.use(express.json());
  const auth = createAuth('a-private-test-password');
  app.use('/api/auth', auth.router);
  app.use('/api', auth.sameOrigin, auth.requireAuth);
  app.use('/api/words', wordsRouter); app.use('/api/profiles', profilesRouter); app.use('/api/settings', settingsRouter);
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
  const response = await call('/auth/login', { method: 'POST', body: { password: 'a-private-test-password' }, authenticated: false });
  assert.equal(response.status, 200); cookie = response.headers.get('set-cookie').split(';')[0];
});
beforeEach(() => {
  if (!db.getProfileById('default')) db.insertProfile(profile('default'));
  for (const p of db.getAllProfiles()) if (p.id !== 'default') db.deleteProfile(p.id);
  db.resetToDefaults();
  db.getDatabase().exec('DELETE FROM operation_receipts;');
  db.insertProfile(profile('b'));
});
after(async () => { await new Promise(resolve => server.close(resolve)); db.closeDatabase(); await rm(directory, { recursive: true, force: true }); });

test('all data APIs require login; sessions cannot be forged; writes reject foreign origins', async () => {
  for (const path of ['/words', '/profiles', '/settings']) assert.equal((await call(path, { authenticated: false })).status, 401);
  assert.equal((await call('/words', { authenticated: false, headers: { Cookie: 'quasselstrippe_session=9999999999999.fake.fake' } })).status, 401);
  assert.equal((await call('/words/reset-defaults', { method: 'POST', headers: { Origin: 'https://elsewhere.example' } })).status, 403);
  assert.equal((await call('/auth/login', { method: 'POST', body: { password: 'wrong' }, authenticated: false })).status, 401);
});
test('new profiles have no demo progress and reset clears every counter', () => {
  for (const w of db.getAllWords(undefined, 'b')) assert.deepEqual([w.box, w.correctCount, w.incorrectCount, w.lastReviewedAt], [1, 0, 0, undefined]);
  db.recordReview('en-2', true, 'b');
  db.resetReviewProgress('b');
  assert.deepEqual([db.getWordById('en-2', 'b').box, db.getWordById('en-2', 'b').correctCount], [1, 0]);
  assert.equal(db.getLearnerStats('b').totalReviews, 0);
});
test('word upserts retain progress for every learner', () => {
  db.recordReview('en-1', true, 'default'); db.recordReview('en-1', true, 'b');
  db.insertWords([{ ...db.getWordById('en-1'), translation: 'Geändert' }]);
  for (const id of ['default', 'b']) {
    const w = db.getWordById('en-1', id); assert.equal(w.box, 2); assert.equal(w.correctCount, 1); assert.equal(w.translation, 'Geändert');
  }
});
test('invalid batches do not partially update words or progress', async () => {
  const original = db.getWordById('en-1').translation;
  const response = await call('/words/batch', { method: 'POST', body: { words: [{ ...db.getWordById('en-1'), translation: 'Should roll back' }, word('missing-owner', 'does-not-exist')] } });
  assert.equal(response.status, 400); assert.equal(db.getWordById('en-1').translation, original); assert.equal(db.getWordById('missing-owner'), null);
  const bad = await call('/words/batch', { method: 'POST', body: { words: [word('first'), { id: 'invalid' }] } });
  assert.equal(bad.status, 400); assert.equal(db.getWordById('first'), null);
});
test('private vocabulary cannot be read, reviewed, edited or deleted using another profile', async () => {
  db.insertWord(word('private', 'b'));
  assert.equal(db.getWordById('private', 'default'), null);
  assert.equal((await call('/words/private?profileId=default')).status, 404);
  assert.equal((await call('/words/private/review', { method: 'POST', body: { profileId: 'default', wasCorrect: true } })).status, 404);
  assert.equal((await call('/words/private?profileId=default', { method: 'PUT', body: { translation: 'Changed' } })).status, 404);
  assert.equal((await call('/words/private?profileId=default', { method: 'DELETE' })).status, 404);
  assert.ok(db.getWordById('private', 'b'));
});
test('lesson deletion requires a scope and preserves other profiles and shared words', async () => {
  for (const owner of ['default', 'b', null]) db.insertWord(word(`owner-${owner}`, owner, 'Collision'));
  assert.equal((await call('/words/delete-lesson', { method: 'POST', body: { lesson: 'Collision', language: 'en' } })).status, 400);
  const response = await call('/words/delete-lesson', { method: 'POST', body: { lesson: 'Collision', language: 'en', profileId: 'default' } });
  assert.equal((await response.json()).deletedCount, 1); assert.ok(db.getWordById('owner-b')); assert.ok(db.getWordById('owner-null'));
  await call('/words/delete-lesson', { method: 'POST', body: { lesson: 'Collision', profileId: 'shared' } });
  assert.equal(db.getWordById('owner-null'), null); assert.ok(db.getWordById('owner-b'));
});
test('replayed review events count once and do not leak to other learners', async () => {
  const body = { profileId: 'b', wasCorrect: true, eventId: 'lost-response', reviewedAt: Date.now(), promote: true };
  for (let i = 0; i < 2; i++) assert.equal((await call('/words/en-1/review', { method: 'POST', body })).status, 200);
  assert.equal(db.getWordById('en-1', 'b').correctCount, 1); assert.equal(db.getWordById('en-1', 'default').correctCount, 0);
  assert.equal(db.getDatabase().prepare('SELECT COUNT(*) AS n FROM review_logs WHERE id = ?').get('lost-response').n, 1);
});
test('a replayed defaults reset does not delete words created after its first commit', async () => {
  const options = { method: 'POST', operationId: 'reset-once' };
  assert.equal((await call('/words/reset-defaults', options)).status, 200);
  db.insertWord(word('new-after-reset', 'b'));
  assert.equal((await call('/words/reset-defaults', options)).status, 200);
  assert.ok(db.getWordById('new-after-reset'));
  assert.equal((await call('/words/reset-progress', { ...options, body: { profileId: 'b' } })).status, 400);
});
test('restoring defaults works after the original profile has been deleted', () => {
  db.deleteProfile('default'); assert.doesNotThrow(() => db.resetToDefaults());
  assert.ok(db.getAllWords(undefined, 'b').length); assert.equal(db.getLearnerStats('b').totalReviews, 0);
});
test('settings expose AI capability without exposing or accepting browser secrets', async () => {
  db.updateSettings({ geminiApiKey: 'private-server-key' });
  let response = await call('/settings'); let data = await response.json();
  assert.equal(data.geminiApiKey, ''); assert.equal(data.aiAvailable, true); assert.ok(!JSON.stringify(data).includes('private-server-key'));
  response = await call('/settings', { method: 'PUT', body: { geminiApiKey: 'browser-key', speechRate: 0.7 } });
  assert.equal(response.status, 200); assert.equal(db.getSettings().geminiApiKey, 'private-server-key');
  assert.equal(db.getSettings().speechRate, 0.7);
  assert.equal((await call('/settings', { method: 'PUT', body: { speechRate: 9 } })).status, 400);
});
test('due dates, assisted practice, repeated answers and errors follow the scheduling rules', () => {
  const now = Date.now(); let w = word('learning');
  assert.equal(isReviewDue(w, now), true);
  assert.equal(nextReviewState(w, true, now, false).box, 1);
  w = nextReviewState(w, true, now); assert.equal(w.box, 2);
  assert.equal(isReviewDue(w, now + 86400000), false);
  const assisted = nextReviewState(w, true, now + 86400000, false);
  assert.equal(assisted.box, 2); assert.equal(assisted.lastReviewedAt, now);
  assert.equal(nextReviewState(w, true, now + 86400000).box, 2);
  assert.equal(nextReviewState(w, true, now + 3 * 86400000).box, 3);
  assert.equal(nextReviewState({ ...w, box: 5 }, false, now).box, 1);
});

test('late offline errors count as history without undoing more recent learning', () => {
  const now = Date.now(); const w = { ...word('late'), box: 4, lastReviewedAt: now };
  const late = nextReviewState(w, false, now - 86400000);
  assert.equal(late.box, 4); assert.equal(late.lastReviewedAt, now); assert.equal(late.incorrectCount, 1);
});
test('AI grade validation rejects string booleans and contradictory correct answers', async () => {
  const { validateGrade } = await import('../server/dist/validation.js');
  assert.throws(() => validateGrade({ recognizedWord: 'word', isCorrect: 'false', score: 100 }, 'word'));
  const result = validateGrade({ recognizedWord: 'wrong', isCorrect: true, score: 100 }, 'word');
  assert.equal(result.isCorrect, false); assert.equal(result.score, 70);
  const capitalization = validateGrade({ recognizedWord: 'Word', isCorrect: true, score: 100,
    schoolGrade: '1 (Sehr gut)', feedback: 'Gut!', model: 'test-model' }, 'word');
  assert.equal(capitalization.isCorrect, false);
  assert.equal(capitalization.capitalizationError, true);
  assert.equal(capitalization.score, 70);
  assert.equal(capitalization.schoolGrade, '3 (Befriedigend)');
  assert.match(capitalization.feedback, /Kleinbuchstaben/);
  assert.equal(capitalization.model, 'test-model');
  const valid = validateGrade({ recognizedWord: 'word', isCorrect: true, score: 100, model: 'test-model' }, 'word');
  assert.equal(valid.isCorrect, true);
  assert.equal(validateGrade(valid, 'word').model, 'test-model');
});

test('logout revokes a signed token rather than only clearing its browser cookie', async () => {
  const login = await call('/auth/login', { method: 'POST', body: { password: 'a-private-test-password' }, authenticated: false });
  const token = login.headers.get('set-cookie').split(';')[0];
  assert.equal((await call('/words', { headers: { Cookie: token } })).status, 200);
  await call('/auth/logout', { method: 'POST', headers: { Cookie: token } });
  assert.equal((await call('/words', { headers: { Cookie: token } })).status, 401);
});

test('worksheet metadata and extracted words are validated before reaching the UI', async () => {
  const { validateWorksheet } = await import('../server/dist/validation.js');
  const result = validateWorksheet({ lessonName: { bad: true }, words: [{ word: 'test', translation: 'Test', language: 'invalid' }] }, 'en');
  assert.equal(result.lessonName, 'Neue Lektion'); assert.equal(result.words[0].language, 'en');
  assert.throws(() => validateWorksheet({ words: [{ word: 42, translation: 'Test' }] }, 'en'));
});
