import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { aiRouter } from '../server/dist/routes/ai.js';
import { closeDatabase } from '../server/dist/db/database.js';

test('handwriting uses Flash-Lite, ignores thought text, and falls back on API failure', async (t) => {
  const previousPath = process.env.DATABASE_PATH;
  process.env.DATABASE_PATH = ':memory:';
  const app = express();
  app.use(express.json()); app.use(aiRouter);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const originalFetch = globalThis.fetch;
  const calls = [];
  let failDefault = false;
  let recognizedWord = 'cat';
  let providerCorrect = true;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const model = String(url).match(/models\/([^:]+):/)[1];
    calls.push({ model, config: JSON.parse(options.body).generationConfig });
    if (failDefault && model === 'gemini-3.5-flash-lite') {
      return Response.json({ error: { message: 'unavailable' } }, { status: 503 });
    }
    return Response.json({ candidates: [{ content: { parts: [
      { thought: true, text: 'Internal reasoning is not the JSON answer.' },
      { text: JSON.stringify({ recognizedWord, isCorrect: providerCorrect, score: providerCorrect ? 100 : 70, schoolGrade: '1', feedback: 'Gut!', capitalizationError: !providerCorrect }) },
    ] } }] });
  });
  try {
    for (const fallback of [false, true]) {
      failDefault = fallback; calls.length = 0;
      const response = await originalFetch(`http://127.0.0.1:${server.address().port}/grade-handwriting`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64Data: 'dGVzdA==', expectedWord: 'cat', apiKey: 'test-only-key', language: 'en' }),
      });
      assert.equal(response.status, 200);
      const result = await response.json();
      assert.equal(result.recognizedWord, 'cat');
      assert.equal('schoolGrade' in result, false);
      assert.equal(result.model, fallback ? 'gemini-4-hydrogen' : 'gemini-3.5-flash-lite');
      assert.deepEqual(calls.map(c => c.model), fallback ? ['gemini-3.5-flash-lite', 'gemini-4-hydrogen'] : ['gemini-3.5-flash-lite']);
      assert.equal(calls[0].config.thinkingConfig.thinkingLevel, 'low');
      assert.equal(calls[0].config.temperature, 0.1);
      assert.equal(calls[0].config.maxOutputTokens, 2048);
      if (fallback) {
        assert.equal(calls[1].config.temperature, undefined);
        assert.equal(calls[1].config.maxOutputTokens, 65536);
      }
    }
    for (const [written, expected, correct] of [['CAT', 'cat', true], ['cAt', 'Cat', true], ['cat', 'CAT', true], ['DOG', 'cat', false], ['4', 'four', false], ['14', 'fourteen', false], ['FOUR', 'four', true]]) {
      recognizedWord = written; providerCorrect = false; failDefault = false;
      const response = await originalFetch(`http://127.0.0.1:${server.address().port}/grade-handwriting`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64Data: 'dGVzdA==', expectedWord: expected, apiKey: 'test-only-key', language: 'en' }),
      });
      assert.equal(response.status, 200);
      const result = await response.json();
      assert.equal(result.isCorrect, correct, `${written} vs ${expected}`);
      assert.equal(result.capitalizationError, false);
      if (correct) assert.equal(result.score, 100);
    }
  } finally {
    await new Promise(resolve => server.close(resolve)); closeDatabase();
    if (previousPath === undefined) delete process.env.DATABASE_PATH; else process.env.DATABASE_PATH = previousPath;
  }
});
