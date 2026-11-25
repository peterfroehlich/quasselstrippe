import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { aiRouter, resolveChatCompletionsUrl, resolveModelsUrl } from '../server/dist/routes/ai.js';
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

test('resolveChatCompletionsUrl normalizes OpenAI-compatible base URLs and rejects invalid ones', () => {
  assert.equal(resolveChatCompletionsUrl('http://reclopsy:8080'), 'http://reclopsy:8080/v1/chat/completions');
  assert.equal(resolveChatCompletionsUrl('http://reclopsy:8080/'), 'http://reclopsy:8080/v1/chat/completions');
  assert.equal(resolveChatCompletionsUrl('http://reclopsy:8080/v1'), 'http://reclopsy:8080/v1/chat/completions');
  assert.equal(resolveChatCompletionsUrl('http://reclopsy:8080/v1/'), 'http://reclopsy:8080/v1/chat/completions');
  assert.equal(resolveChatCompletionsUrl('https://proxy.example/openai/v1'), 'https://proxy.example/openai/v1/chat/completions');
  assert.equal(resolveChatCompletionsUrl('https://proxy.example/v1/chat/completions'), 'https://proxy.example/v1/chat/completions');
  assert.equal(resolveModelsUrl('http://reclopsy:11435'), 'http://reclopsy:11435/v1/models');
  assert.equal(resolveModelsUrl('http://reclopsy:11435/v1'), 'http://reclopsy:11435/v1/models');
  assert.equal(resolveModelsUrl('http://reclopsy:11435/v1/chat/completions'), 'http://reclopsy:11435/v1/models');
  assert.throws(() => resolveChatCompletionsUrl('ftp://reclopsy:8080'));
  assert.throws(() => resolveChatCompletionsUrl('not-a-url'));
});

test('generic OpenAI-compatible endpoint works via env vars (optional auth) and client config with fallback', async (t) => {
  const previousEnv = {
    DATABASE_PATH: process.env.DATABASE_PATH,
    AI_BASE_URL: process.env.AI_BASE_URL,
    AI_MODEL: process.env.AI_MODEL,
    AI_API_KEY: process.env.AI_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  };
  process.env.DATABASE_PATH = ':memory:';
  delete process.env.GEMINI_API_KEY;
  process.env.AI_BASE_URL = 'http://reclopsy:8080/v1';
  process.env.AI_MODEL = 'reclopsy-fast, reclopsy-fallback';
  delete process.env.AI_API_KEY;

  const app = express();
  app.use(express.json());
  app.use(aiRouter);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const originalFetch = globalThis.fetch;
  const calls = [];
  let rejectResponseFormat = false;
  let failPrimaryModel = false;

  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (String(url).endsWith('/models')) {
      calls.push({ url: String(url), headers: options.headers, method: options.method });
      return Response.json({ object: 'list', data: [{ id: 'vision-llm' }, { id: 'general-llm' }] });
    }
    const body = JSON.parse(options.body);
    calls.push({ url: String(url), headers: options.headers, body });
    if (failPrimaryModel && body.model === 'reclopsy-fast') {
      return Response.json({ error: { message: 'overloaded' } }, { status: 503 });
    }
    if (rejectResponseFormat && body.response_format) {
      return Response.json({ error: { message: 'response_format unsupported' } }, { status: 400 });
    }
    if (body.messages[0].content === 'Antworte nur mit: OK') {
      return Response.json({ model: body.model, choices: [{ message: { content: 'OK' } }] });
    }
    if (Array.isArray(body.messages[0].content) && body.messages[0].content[0].text.includes('Arbeitsblatts')) {
      return Response.json({
        model: body.model,
        choices: [{
          message: {
            content: JSON.stringify({
              lessonName: 'Unit 1',
              words: [{ word: 'apple', translation: 'Apfel', language: 'en', lesson: 'Unit 1', partOfSpeech: 'noun' }],
            }),
          },
        }],
      });
    }
    return Response.json({
      model: body.model,
      choices: [{
        message: {
          content: JSON.stringify({ recognizedWord: 'cat', isCorrect: true, score: 100, feedback: 'Super!', capitalizationError: false }),
        },
      }],
    });
  });

  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  try {
    // 1. Server env AI_BASE_URL without AI_API_KEY (no Authorization header)
    const modelsRes = await originalFetch(`${baseUrl}/models`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(modelsRes.status, 200);
    assert.deepEqual(await modelsRes.json(), { models: ['vision-llm', 'general-llm'] });
    assert.equal(calls[0].url, 'http://reclopsy:8080/v1/models');
    assert.equal(calls[0].headers.Authorization, undefined);
    calls.length = 0;

    const testRes = await originalFetch(`${baseUrl}/test`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(testRes.status, 200);
    assert.deepEqual(await testRes.json(), { ok: true, provider: 'openai', model: 'reclopsy-fast' });
    assert.equal(calls[0].url, 'http://reclopsy:8080/v1/chat/completions');
    assert.equal(calls[0].headers.Authorization, undefined);

    // 2. Handwriting grading with fallback model and response_format retry
    calls.length = 0;
    failPrimaryModel = true;
    rejectResponseFormat = true;
    process.env.AI_API_KEY = 'secret-reclopsy-token';
    const gradeRes = await originalFetch(`${baseUrl}/grade-handwriting`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Data: 'dGVzdA==', expectedWord: 'cat', language: 'en' }),
    });
    assert.equal(gradeRes.status, 200);
    const graded = await gradeRes.json();
    assert.equal(graded.isCorrect, true);
    assert.equal(graded.model, 'reclopsy-fallback');
    assert.equal(calls[0].headers.Authorization, 'Bearer secret-reclopsy-token');
    assert.equal(calls[0].body.messages[0].content[1].image_url.url, 'data:image/jpeg;base64,dGVzdA==');
    assert.equal(calls.length, 3); // primary 503 -> fallback 400 (with response_format) -> fallback 200 (without response_format)
    assert.equal(calls[2].body.response_format, undefined);

    // 3. Worksheet analysis using client-supplied aiBaseUrl when env vars are unset
    delete process.env.AI_BASE_URL;
    delete process.env.AI_MODEL;
    delete process.env.AI_API_KEY;
    calls.length = 0;
    failPrimaryModel = false;
    rejectResponseFormat = false;
    const wsRes = await originalFetch(`${baseUrl}/analyze-worksheet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base64Data: 'dGVzdA==',
        mimeType: 'image/png',
        language: 'en',
        suggestedLesson: 'Unit 1',
        aiBaseUrl: 'https://reclopsy.local',
        aiModel: 'vision-1',
        aiApiKey: 'client-token',
      }),
    });
    assert.equal(wsRes.status, 200);
    const ws = await wsRes.json();
    assert.equal(ws.words.length, 1);
    assert.equal(ws.words[0].word, 'apple');
    assert.equal(calls[0].url, 'https://reclopsy.local/v1/chat/completions');
    assert.equal(calls[0].headers.Authorization, 'Bearer client-token');
    assert.equal(calls[0].body.model, 'vision-1');

    // 4. Invalid client aiBaseUrl returns 400
    const badRes = await originalFetch(`${baseUrl}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aiBaseUrl: 'javascript:alert(1)' }),
    });
    assert.equal(badRes.status, 400);
  } finally {
    await new Promise(resolve => server.close(resolve));
    closeDatabase();
    for (const [k, v] of Object.entries(previousEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
});
