import { validateWorksheet, validateGrade } from '../validation.js';
import { Router, Request, Response } from 'express';
import { getSettings } from '../db/database.js';
import type { WorksheetAnalysisResponse, HandwritingGradeResponse, LessonReorganizationResponse } from '../types.js';

export const aiRouter = Router();
let activeRequests = 0;
aiRouter.use((_req, res, next) => {
  if (activeRequests >= 4) return void res.status(429).json({ error: 'Die KI ist gerade ausgelastet. Bitte erneut versuchen.' });
  activeRequests++;
  let released = false;
  const release = () => { if (!released) { released = true; activeRequests--; } };
  res.once('finish', release); res.once('close', release);
  next();
});

type ResolvedAiConfig =
  | { provider: 'openai'; baseUrl: string; apiKey: string; models: string[] }
  | { provider: 'gemini'; apiKey: string };

const GEMINI_MODELS = ['gemini-3.5-flash-lite', 'gemini-4-hydrogen'];
const noResponseFormatTargets = new Set<string>();
const NOT_CONFIGURED_ERROR =
  'Kein KI-Endpunkt konfiguriert. Bitte einen OpenAI-kompatiblen Endpunkt (AI_BASE_URL) oder einen Gemini API-Schlüssel (GEMINI_API_KEY) in den Einstellungen oder auf dem Server hinterlegen.';

export function resolveChatCompletionsUrl(rawBaseUrl: string): string {
  const trimmed = rawBaseUrl.trim().replace(/\/+$/, '');
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('Ungültige Modell-Endpunkt-URL.');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Modell-Endpunkt muss http:// oder https:// verwenden.');
  }
  const pathname = parsed.pathname.replace(/\/+$/, '');
  if (pathname.endsWith('/chat/completions')) {
    return `${parsed.origin}${pathname}`;
  }
  if (!pathname) {
    return `${parsed.origin}/v1/chat/completions`;
  }
  return `${parsed.origin}${pathname}/chat/completions`;
}

export function resolveModelsUrl(rawBaseUrl: string): string {
  const completionsUrl = resolveChatCompletionsUrl(rawBaseUrl);
  return completionsUrl.replace(/\/chat\/completions$/, '/models');
}

function parseModelList(raw?: string): string[] {
  if (!raw) return ['default'];
  const models = raw.split(',').map((m) => m.trim()).filter(Boolean);
  return models.length > 0 ? models : ['default'];
}

function extractJsonObject(text: string, parseErrorMessage: string): any {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    return JSON.parse(jsonStr);
  } catch {
    throw new Error(parseErrorMessage);
  }
}

function extractOpenAiContent(data: any): string | undefined {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === 'string' && content.trim()) {
    return content;
  }
  if (Array.isArray(content)) {
    const joined = content
      .filter((part: any) => part && typeof part.text === 'string')
      .map((part: any) => part.text)
      .join('\n')
      .trim();
    if (joined) return joined;
  }
  return undefined;
}

function resolveAiConfig(
  body: Record<string, any>,
  settings: { geminiApiKey: string }
): { config: ResolvedAiConfig | null; validationError?: string } {
  const { apiKey: customApiKey, aiBaseUrl: customBaseUrl, aiModel: customModel, aiApiKey: customOpenAiKey } = body;

  if (customApiKey !== undefined && typeof customApiKey !== 'string') {
    return { config: null, validationError: 'Invalid API key' };
  }
  if (customBaseUrl !== undefined && typeof customBaseUrl !== 'string') {
    return { config: null, validationError: 'Invalid AI base URL' };
  }
  if (customModel !== undefined && typeof customModel !== 'string') {
    return { config: null, validationError: 'Invalid AI model' };
  }
  if (customOpenAiKey !== undefined && typeof customOpenAiKey !== 'string') {
    return { config: null, validationError: 'Invalid AI API key' };
  }

  const envBaseUrl = process.env.AI_BASE_URL?.trim();
  if (envBaseUrl) {
    try {
      const endpointUrl = resolveChatCompletionsUrl(envBaseUrl);
      return {
        config: {
          provider: 'openai',
          baseUrl: endpointUrl,
          apiKey: process.env.AI_API_KEY?.trim() || '',
          models: parseModelList(process.env.AI_MODEL),
        },
      };
    } catch (err) {
      return { config: null, validationError: err instanceof Error ? err.message : 'Invalid AI_BASE_URL' };
    }
  }

  const envGeminiKey = process.env.GEMINI_API_KEY?.trim();
  if (envGeminiKey) {
    return { config: { provider: 'gemini', apiKey: envGeminiKey } };
  }

  const clientBaseUrl = customBaseUrl?.trim();
  if (clientBaseUrl) {
    try {
      const endpointUrl = resolveChatCompletionsUrl(clientBaseUrl);
      return {
        config: {
          provider: 'openai',
          baseUrl: endpointUrl,
          apiKey: customOpenAiKey?.trim() || '',
          models: parseModelList(customModel),
        },
      };
    } catch (err) {
      return { config: null, validationError: err instanceof Error ? err.message : 'Ungültige Modell-Endpunkt-URL.' };
    }
  }

  const geminiKey = customApiKey?.trim() || settings.geminiApiKey?.trim();
  if (geminiKey) {
    return { config: { provider: 'gemini', apiKey: geminiKey } };
  }

  return { config: null };
}

async function callOpenAiCompatible(params: {
  endpointUrl: string;
  apiKey: string;
  models: string[];
  prompt: string;
  mimeType?: string;
  cleanBase64?: string;
  temperature: number;
  maxTokens?: number;
  timeoutMs: number;
  expectJson?: boolean;
}): Promise<{ text: string; model: string }> {
  const { endpointUrl, apiKey, models, prompt, mimeType, cleanBase64, temperature, maxTokens, timeoutMs, expectJson = true } = params;
  let lastError: Error | null = null;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const content: any =
    cleanBase64 && mimeType
      ? [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${cleanBase64}` } },
        ]
      : prompt;

  for (const model of models) {
    try {
      const sendRequest = async (includeResponseFormat: boolean) => {
        const payload: Record<string, any> = {
          model,
          messages: [{ role: 'user', content }],
          temperature,
        };
        if (maxTokens !== undefined) {
          payload.max_tokens = maxTokens;
        }
        if (includeResponseFormat && expectJson) {
          payload.response_format = { type: 'json_object' };
        }
        return fetch(endpointUrl, {
          method: 'POST',
          headers,
          signal: AbortSignal.timeout(timeoutMs),
          body: JSON.stringify(payload),
        });
      };

      const targetKey = `${endpointUrl}|${model}`;
      const tryResponseFormat = expectJson && !noResponseFormatTargets.has(targetKey);
      let response = await sendRequest(tryResponseFormat);
      // Some OpenAI-compatible gateways/models (e.g. Reclopsy ACP) do not support response_format; retry once without it on 400.
      if (response.status === 400 && tryResponseFormat) {
        noResponseFormatTargets.add(targetKey);
        response = await sendRequest(false);
      }

      if (!response.ok) {
        const errorJson = (await response.json().catch(() => null)) as any;
        const errMsg = errorJson?.error?.message || errorJson?.message || `HTTP ${response.status}`;
        throw new Error(`Modell-Endpunkt (${model}): ${errMsg}`);
      }

      const data = (await response.json()) as any;
      const text = extractOpenAiContent(data);
      if (!text) {
        throw new Error('Keine Antwort vom Modell-Endpunkt erhalten.');
      }

      const resolvedModel = typeof data.model === 'string' && data.model.trim() ? data.model.trim() : model;
      return { text, model: resolvedModel };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError || new Error('Anfrage an den Modell-Endpunkt fehlgeschlagen.');
}

// POST /api/ai/models
aiRouter.post('/models', async (req: Request, res: Response) => {
  try {
    const settings = getSettings();
    const { config, validationError } = resolveAiConfig(req.body || {}, settings);
    if (validationError) return void res.status(400).json({ error: validationError });
    if (!config || config.provider !== 'openai') {
      return void res.status(400).json({ error: 'Kein OpenAI-kompatibler Modell-Endpunkt konfiguriert.' });
    }

    const modelsUrl = resolveModelsUrl(config.baseUrl);
    const headers: Record<string, string> = {};
    if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;

    const response = await fetch(modelsUrl, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      const errJson = (await response.json().catch(() => null)) as any;
      const errMsg = errJson?.error?.message || errJson?.message || `HTTP ${response.status}`;
      return void res.status(502).json({ error: `Modellliste konnte nicht geladen werden: ${errMsg}` });
    }

    const data = (await response.json()) as any;
    const rawList = Array.isArray(data?.data) ? data.data : Array.isArray(data?.models) ? data.models : [];
    const models = rawList
      .map((item: any) => (typeof item === 'string' ? item : typeof item?.id === 'string' ? item.id : typeof item?.name === 'string' ? item.name : ''))
      .map((id: string) => id.trim())
      .filter(Boolean);

    res.json({ models });
  } catch (error: any) {
    res.status(502).json({ error: error?.message || 'Modellliste konnte nicht geladen werden.' });
  }
});

// POST /api/ai/test
aiRouter.post('/test', async (req: Request, res: Response) => {
  try {
    const settings = getSettings();
    const { config, validationError } = resolveAiConfig(req.body || {}, settings);
    if (validationError) return void res.status(400).json({ error: validationError });
    if (!config) return void res.status(400).json({ error: NOT_CONFIGURED_ERROR });

    if (config.provider === 'openai') {
      const { model } = await callOpenAiCompatible({
        endpointUrl: config.baseUrl,
        apiKey: config.apiKey,
        models: config.models,
        prompt: 'Antworte nur mit: OK',
        temperature: 0,
        maxTokens: 16,
        timeoutMs: 10000,
        expectJson: false,
      });
      return void res.json({ ok: true, provider: 'openai', model });
    }

    let lastError = '';
    for (const model of GEMINI_MODELS) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(5000),
            body: JSON.stringify({
              contents: [{ parts: [{ text: 'Antworte nur mit: OK' }] }],
              generationConfig: { thinkingConfig: { thinkingLevel: 'low' } },
            }),
          }
        );
        if (response.ok) {
          return void res.json({ ok: true, provider: 'gemini', model });
        }
        const errJson = (await response.json().catch(() => null)) as any;
        lastError = errJson?.error?.message || `HTTP ${response.status}`;
      } catch (err) {
        lastError = err instanceof Error ? err.message : 'Netzwerkfehler';
      }
    }
    res.status(502).json({ error: `Gemini API-Fehler: ${lastError || 'Unbekannter Fehler'}` });
  } catch (error: any) {
    res.status(502).json({ error: error?.message || 'Verbindungstest fehlgeschlagen.' });
  }
});

// POST /api/ai/analyze-worksheet
aiRouter.post('/analyze-worksheet', async (req: Request, res: Response) => {
  try {
    const { base64Data, mimeType = 'image/jpeg', language = 'en', suggestedLesson = '' } = req.body;

    if (typeof base64Data !== 'string' || !base64Data || base64Data.length > 45000000 || !['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(mimeType) || !['en', 'la'].includes(language)) {
      return res.status(400).json({ error: 'base64Data is required' });
    }

    const settings = getSettings();
    const { config, validationError } = resolveAiConfig(req.body || {}, settings);
    if (validationError) return void res.status(400).json({ error: validationError });

    if (!config) {
      return res.status(400).json({ error: NOT_CONFIGURED_ERROR });
    }

    const targetLangName = language === 'en' ? 'Englisch' : 'Latein';

    const systemPrompt = `Du bist ein erfahrener Fremdsprachenlehrer und Vokabeldidaktiker für deutsche Schüler.
Deine Aufgabe ist es, dieses Foto eines Schul-Arbeitsblatts oder einer Schulbuchseite zu analysieren.
Zielgruppe: Ein deutscher Schüler, der ${targetLangName} lernt.

Aufgaben:
1. Erkenne alle neuen Vokabeln, Phrasen, Kollokationen oder Redewendungen auf dem Arbeitsblatt.
2. Wenn Vokabeln bereits eine deutsche Übersetzung auf dem Blatt haben, übernimm diese genau. Wenn keine deutsche Übersetzung dasteht, erstelle eine präzise, schülergerechte deutsche Übersetzung.
3. Extrahiere oder generiere einen anschaulichen Beispielsatz in der Zielsprache (${targetLangName}) sowie dessen deutsche Übersetzung.
4. Gib grammatikalische Zusatzhinweise (z.B. Wortart, unregelmäßige Formen, Plural, Kasus/Deklination bei Latein, Synonyme).
5. Schlage einen passenden Lektions- oder Themennamen vor (z.B. "${suggestedLesson || 'Unit X: Schulvokabeln'}").

Antworte AUSSCHLIESSLICH im folgenden JSON-Format ohne Markdown-Codeblöcke außerhalb des JSON:
{
  "detectedTopic": "Kurzes Thema des Arbeitsblattes",
  "lessonName": "${suggestedLesson || 'Neue Lerneinheit'}",
  "summary": "Kurze Zusammenfassung des Inhalts",
  "words": [
    {
      "word": "foreign word or phrase",
      "translation": "deutsche Übersetzung",
      "language": "${language}",
      "lesson": "${suggestedLesson || 'Neue Lerneinheit'}",
      "partOfSpeech": "noun | verb | adjective | adverb | phrase | preposition | conjunction | pronoun | other",
      "exampleSentence": "Example sentence in foreign language",
      "exampleTranslation": "Deutsche Übersetzung des Beispielsatzes",
      "phonetic": "/aus-sprache/",
      "notes": "Grammatik, unregelmäßige Formen, Deklination etc."
    }
  ]
}`;

    const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;

    if (config.provider === 'openai') {
      const { text } = await callOpenAiCompatible({
        endpointUrl: config.baseUrl,
        apiKey: config.apiKey,
        models: config.models,
        prompt: systemPrompt,
        mimeType,
        cleanBase64,
        temperature: 0.2,
        timeoutMs: 115000,
      });
      const parsed = extractJsonObject(text, 'KI-Antwort konnte nicht als Vokabelliste interpretiert werden.');
      return void res.json(validateWorksheet(parsed, language, suggestedLesson));
    }

    let lastError: Error | null = null;
    let resultData: WorksheetAnalysisResponse | null = null;

    for (const model of GEMINI_MODELS) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(15000),
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [
                    { text: systemPrompt },
                    {
                      inlineData: {
                        mimeType,
                        data: cleanBase64,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                ...(model.startsWith('gemini-4') ? {} : { temperature: 0.2 }),
                thinkingConfig: { thinkingLevel: 'low' },
                responseMimeType: 'application/json',
              },
            }),
          }
        );

        if (!response.ok) {
          const errorJson = (await response.json().catch(() => null)) as any;
          const errMsg = errorJson?.error?.message || `HTTP ${response.status}`;
          throw new Error(`Gemini API (${model}): ${errMsg}`);
        }

        const data = (await response.json()) as any;
        const parts = data.candidates?.[0]?.content?.parts || [];
        const textPart = parts.find((p: any) => !p.thought && typeof p.text === 'string' && p.text.trim())?.text;
        if (!textPart) {
          throw new Error('Keine Antwort von Gemini erhalten.');
        }

        const parsed = extractJsonObject(textPart, 'Gemini-Antwort konnte nicht als Vokabelliste interpretiert werden.');
        resultData = validateWorksheet(parsed, language, suggestedLesson);
        break; // Successfully obtained response!
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }

    if (!resultData) {
      throw lastError || new Error('Arbeitsblatt-Analyse fehlgeschlagen.');
    }

    res.json(resultData);
  } catch (error: any) {
    console.error('Worksheet analysis error:', error);
    res.status(500).json({ error: error.message || 'Worksheet analysis failed' });
  }
});

// POST /api/ai/grade-handwriting
aiRouter.post('/grade-handwriting', async (req: Request, res: Response) => {
  try {
    const { base64Data, mimeType = 'image/jpeg', expectedWord = '', language = 'en' } = req.body;

    if (typeof base64Data !== 'string' || !base64Data || base64Data.length > 45000000 || !['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(mimeType) || !['en', 'la'].includes(language)) {
      return res.status(400).json({ error: 'base64Data is required' });
    }

    if (typeof expectedWord !== 'string' || !expectedWord.trim() || expectedWord.length > 10000) {
      return res.status(400).json({ error: 'expectedWord is required' });
    }

    const settings = getSettings();
    const { config, validationError } = resolveAiConfig(req.body || {}, settings);
    if (validationError) return void res.status(400).json({ error: validationError });

    if (!config) {
      return res.status(400).json({ error: NOT_CONFIGURED_ERROR });
    }

    const targetLangName = language === 'en' ? 'Englisch' : 'Latein';

    const systemPrompt = `Du bist ein erfahrener Fremdsprachenlehrer für ${targetLangName}.
Ein Schüler hat handschriftlich versucht, ein Vokabelwort zu schreiben.

Zielwort: "${expectedWord}"
Zielsprache: ${targetLangName}

Aufgaben:
1. Erkenne das geschriebene Wort auf dem Bild (OCR) exakt so, wie es dasteht (inklusive Groß-/Kleinschreibung des ersten Buchstabens).
2. Vergleiche mit dem Zielwort "${expectedWord}":
- Prüfe die Rechtschreibung aller Buchstaben.
- Ziffern NICHT in Zahlwörter umwandeln: Steht auf dem Bild "4", muss recognizedWord "4" bleiben, nicht "four". Ein Zahlwort muss ausgeschrieben werden; "4" für "four" ist falsch. Keine Übersetzungen oder Bedeutungsäquivalente als richtige Schreibweise akzeptieren.
- Groß- und Kleinschreibung bei ALLEN Buchstaben vollständig ignorieren. Identische Buchstaben unabhängig von ihrer Schreibweise sind richtig (isCorrect: true, score: 100). Keine Abzüge oder Hinweise zur Groß-/Kleinschreibung.
3. Bewerte:
- "recognizedWord": Was hat der Schüler geschrieben? (exakte Groß-/Kleinschreibung beibehalten)
- "isCorrect": true wenn alle Buchstaben unabhängig von Groß-/Kleinschreibung richtig sind, sonst false.
- "score": 0 bis 100 (100 = perfekt, 85-95 = sehr gut, 0-40 = falsch oder unleserlich).
- "feedback": Ein kurzer, motivierender Satz auf Deutsch (maximal 12 Wörter). Nenne bei Fehlern die nötige Korrektur. Keine Schulnoten.
- "capitalizationError": immer false; Groß-/Kleinschreibung wird nicht bewertet.

Antworte AUSSCHLIESSLICH im folgenden JSON-Format ohne Markdown-Codeblöcke außerhalb des JSON:
{
  "recognizedWord": "das erkannte Wort",
  "isCorrect": true,
  "score": 100,
  "feedback": "Klasse gemacht! Fehlerfrei geschrieben.",
  "capitalizationError": false
}`;

    const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;

    if (config.provider === 'openai') {
      const { text, model } = await callOpenAiCompatible({
        endpointUrl: config.baseUrl,
        apiKey: config.apiKey,
        models: config.models,
        prompt: systemPrompt,
        mimeType,
        cleanBase64,
        temperature: 0.1,
        maxTokens: 2048,
        timeoutMs: 60000,
      });
      const parsed = extractJsonObject(text, 'KI-Antwort konnte nicht als JSON interpretiert werden.');
      return void res.json({ ...validateGrade(parsed, expectedWord), model });
    }

    let lastError: Error | null = null;
    let resultData: HandwritingGradeResponse | null = null;

    for (const model of GEMINI_MODELS) {
      try {
        const genConfig: Record<string, any> = {
          ...(model.startsWith('gemini-4') ? {} : { temperature: 0.1 }),
          maxOutputTokens: model.startsWith('gemini-4') ? 65536 : 2048,
          responseMimeType: 'application/json',
        };

        // Low thinking keeps grading responsive; leave room for reasoning and JSON output.
        if (model.startsWith('gemini-4') || model.startsWith('gemini-3')) {
          genConfig.thinkingConfig = { thinkingLevel: 'low' };
        } else if (model.startsWith('gemini-2.5')) {
          genConfig.thinkingConfig = { thinkingBudget: 0 };
        }

        const sendRequest = async (configObj: Record<string, any>) => {
          return fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: AbortSignal.timeout(model === 'gemini-4-hydrogen' ? 6000 : 4000),
              body: JSON.stringify({
                contents: [
                  {
                    role: 'user',
                    parts: [
                      { text: systemPrompt },
                      {
                        inlineData: {
                          mimeType,
                          data: cleanBase64,
                        },
                      },
                    ],
                  },
                ],
                generationConfig: configObj,
              }),
            }
          );
        };

        const response = await sendRequest(genConfig);

        if (!response.ok) {
          const errorJson = (await response.json().catch(() => null)) as any;
          const errMsg = errorJson?.error?.message || `HTTP ${response.status}`;
          throw new Error(`Gemini API (${model}): ${errMsg}`);
        }

        const data = (await response.json()) as any;
        const parts = data.candidates?.[0]?.content?.parts || [];
        const textPart = parts.find((p: any) => !p.thought && typeof p.text === 'string' && p.text.trim())?.text;
        if (!textPart) {
          throw new Error('Keine Antwort von Gemini erhalten.');
        }

        const parsed = extractJsonObject(textPart, 'Gemini-Antwort konnte nicht als JSON interpretiert werden.');
        resultData = { ...validateGrade(parsed, expectedWord), model };
        break;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }

    if (!resultData) {
      throw lastError || new Error('Handschrift-Bewertung fehlgeschlagen.');
    }

    res.json(resultData);
  } catch (error: any) {
    console.error('Handwriting grading error:', error);
    res.status(500).json({ error: error.message || 'Handwriting grading failed' });
  }
});

// POST /api/ai/organize-lessons
aiRouter.post('/organize-lessons', async (req: Request, res: Response) => {
  try {
    const { words, language = 'en', instruction = '', existingLessons = [] } = req.body || {};

    if (!['en', 'la'].includes(language)) {
      return res.status(400).json({ error: 'Invalid language' });
    }
    if (!Array.isArray(words) || words.length === 0 || words.length > 500) {
      return res.status(400).json({ error: 'Zwischen 1 und 500 Vokabeln sind erforderlich.' });
    }
    if (typeof instruction !== 'string' || instruction.length > 2000) {
      return res.status(400).json({ error: 'Invalid instruction' });
    }

    const sanitizedWords: Array<{ id: string; word: string; translation: string; lesson: string; partOfSpeech?: string; notes?: string }> = [];
    for (const w of words) {
      if (!w || typeof w !== 'object' || typeof w.id !== 'string' || !w.id.trim() || typeof w.word !== 'string' || !w.word.trim() || typeof w.translation !== 'string') {
        return res.status(400).json({ error: 'Ungültige Vokabeldaten.' });
      }
      sanitizedWords.push({
        id: w.id.trim(),
        word: w.word.trim().slice(0, 200),
        translation: w.translation.trim().slice(0, 200),
        lesson: typeof w.lesson === 'string' && w.lesson.trim() ? w.lesson.trim().slice(0, 200) : 'Allgemein',
        ...(typeof w.partOfSpeech === 'string' ? { partOfSpeech: w.partOfSpeech.slice(0, 40) } : {}),
        ...(typeof w.notes === 'string' && w.notes.trim() ? { notes: w.notes.trim().slice(0, 150) } : {}),
      });
    }

    const settings = getSettings();
    const { config, validationError } = resolveAiConfig(req.body || {}, settings);
    if (validationError) return void res.status(400).json({ error: validationError });
    if (!config) return void res.status(400).json({ error: NOT_CONFIGURED_ERROR });

    const targetLangName = language === 'en' ? 'Englisch' : 'Latein';
    const existingList = Array.isArray(existingLessons)
      ? existingLessons.filter((l: unknown): l is string => typeof l === 'string' && Boolean(l.trim())).map((l) => l.trim().slice(0, 200))
      : [];
    const userInstruction = instruction.trim() || 'Sortiere die Vokabeln sinnvoll thematisch in übersichtliche Schullektionen (ca. 8–15 Wörter pro Lektion) mit klaren deutschen oder zweisprachigen Lektionsnamen.';

    const wordLines = sanitizedWords
      .map((w) => `- id="${w.id}" | ${w.word} = ${w.translation}${w.partOfSpeech ? ` (${w.partOfSpeech})` : ''} [aktuell: ${w.lesson}]`)
      .join('\n');

    const systemPrompt = `Du bist ein erfahrener Fremdsprachenlehrer (${targetLangName}) für deutsche Schüler.
Deine Aufgabe ist es, die folgende Vokabelliste in sinnvolle, übersichtliche Lektionen umzusortieren.

Anweisung des Nutzers:
"${userInstruction}"
${existingList.length > 0 ? `\nVorhandene Lektionen im Bestand:\n${existingList.map((l) => `- ${l}`).join('\n')}\n` : ''}
Regeln:
1. Ordne JEDE gegebene Vokabel-ID genau einer Lektion zu. Keine ID weglassen, keine neuen IDs erfinden.
2. Verwende konsistente, prägnante Lektionsnamen (maximal 80 Zeichen).
3. Halte dich genau an die Anweisung des Nutzers (z.B. vorgegebene Lektionsnamen, Gruppengröße oder Themen).

Vokabeln (${sanitizedWords.length}):
${wordLines}

Antworte AUSSCHLIESSLICH im folgenden JSON-Format ohne Markdown-Codeblöcke außerhalb des JSON:
{
  "summary": "Kurze deutsche Zusammenfassung der neuen Einteilung (1-2 Sätze)",
  "assignments": [
    { "id": "exakte-id", "lesson": "Neuer Lektionsname" }
  ]
}`;

    const normalizeResponse = (parsed: any, model?: string): LessonReorganizationResponse => {
      const byId = new Map<string, string>();
      const rawAssignments = Array.isArray(parsed?.assignments) ? parsed.assignments : [];
      for (const item of rawAssignments) {
        if (item && typeof item.id === 'string' && typeof item.lesson === 'string' && item.lesson.trim()) {
          byId.set(item.id.trim(), item.lesson.trim().slice(0, 200));
        }
      }
      const assignments = sanitizedWords.map((w) => ({
        id: w.id,
        lesson: byId.get(w.id) || w.lesson,
      }));
      const summary = typeof parsed?.summary === 'string' && parsed.summary.trim()
        ? parsed.summary.trim().slice(0, 400)
        : `${assignments.length} Vokabeln neu zugeordnet.`;
      return { summary, assignments, ...(model ? { model } : {}) };
    };

    if (config.provider === 'openai') {
      const { text, model } = await callOpenAiCompatible({
        endpointUrl: config.baseUrl,
        apiKey: config.apiKey,
        models: config.models,
        prompt: systemPrompt,
        temperature: 0.2,
        timeoutMs: 115000,
      });
      const parsed = extractJsonObject(text, 'KI-Antwort konnte nicht als Lektions-Zuordnung interpretiert werden.');
      return void res.json(normalizeResponse(parsed, model));
    }

    let lastError: Error | null = null;
    let resultData: LessonReorganizationResponse | null = null;

    for (const model of GEMINI_MODELS) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(30000),
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
              generationConfig: {
                ...(model.startsWith('gemini-4') ? {} : { temperature: 0.2 }),
                thinkingConfig: { thinkingLevel: 'low' },
                responseMimeType: 'application/json',
              },
            }),
          }
        );

        if (!response.ok) {
          const errorJson = (await response.json().catch(() => null)) as any;
          const errMsg = errorJson?.error?.message || `HTTP ${response.status}`;
          throw new Error(`Gemini API (${model}): ${errMsg}`);
        }

        const data = (await response.json()) as any;
        const parts = data.candidates?.[0]?.content?.parts || [];
        const textPart = parts.find((p: any) => !p.thought && typeof p.text === 'string' && p.text.trim())?.text;
        if (!textPart) throw new Error('Keine Antwort von Gemini erhalten.');

        const parsed = extractJsonObject(textPart, 'Gemini-Antwort konnte nicht als Lektions-Zuordnung interpretiert werden.');
        resultData = normalizeResponse(parsed, model);
        break;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }

    if (!resultData) {
      throw lastError || new Error('KI-Sortierung fehlgeschlagen.');
    }

    res.json(resultData);
  } catch (error: any) {
    console.error('Lesson organization error:', error);
    res.status(500).json({ error: error.message || 'Lesson organization failed' });
  }
});
