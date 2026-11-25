import { validateWorksheet, validateGrade } from './validation';
import type { Language, WorksheetAnalysisResponse, ExtractedWordCandidate, HandwritingGradeResponse, AiClientConfig, LessonReorganizationResponse, WordItem } from '../types/vocabulary';
import { ApiError, apiAnalyzeWorksheet, apiGradeHandwriting, apiTestAiConnection, apiListAiModels, apiOrganizeLessons } from './api';

export interface SampleWorksheet {
  id: string;
  title: string;
  language: Language;
  suggestedLesson: string;
  description: string;
  previewSvg: string; // SVG data or graphic representation
  simulatedResults: ExtractedWordCandidate[];
}

export const SAMPLE_WORKSHEETS: SampleWorksheet[] = [
  {
    id: 'sample-en-safari',
    title: 'Englisch Klasse 6: Unit 3 – Wildlife & Nature',
    language: 'en',
    suggestedLesson: 'Unit 3: Wildlife & Nature',
    description: 'Schulbuchseite mit Textabschnitt und Vokabelkasten über Umweltschutz und Tierwelt.',
    previewSvg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="100%" height="100%" fill="%23f8fafc" stroke="%23cbd5e1" stroke-width="4"/><rect x="20" y="20" width="360" height="40" rx="8" fill="%23e0e7ff"/><text x="35" y="46" font-family="sans-serif" font-weight="bold" font-size="16" fill="%234338ca">Unit 3: Exploring the Wild (Worksheet 2)</text><text x="35" y="85" font-family="sans-serif" font-size="13" fill="%23334155">1. Match the words with their German meanings:</text><rect x="35" y="100" width="330" height="175" rx="6" fill="%23ffffff" stroke="%23e2e8f0"/><text x="50" y="125" font-family="sans-serif" font-size="12" fill="%231e293b">• protect (v.) - beschützen, schützen</text><text x="50" y="150" font-family="sans-serif" font-size="12" fill="%231e293b">• endangered species (n.) - bedrohte Tierarten</text><text x="50" y="175" font-family="sans-serif" font-size="12" fill="%231e293b">• shelter (n.) - die Unterkunft, der Schutzraum</text><text x="50" y="200" font-family="sans-serif" font-size="12" fill="%231e293b">• take care of (phr.) - sich kümmern um</text><text x="50" y="225" font-family="sans-serif" font-size="12" fill="%231e293b">• breathtaking (adj.) - atemberaubend</text><text x="50" y="250" font-family="sans-serif" font-size="12" fill="%231e293b">• volunteer (n./v.) - Freiwillige(r) / ehrenamtlich arbeiten</text></svg>`,
    simulatedResults: [
      {
        word: 'protect',
        translation: 'beschützen / schützen',
        language: 'en',
        lesson: 'Unit 3: Wildlife & Nature',
        partOfSpeech: 'verb',
        exampleSentence: 'We must protect wild animals and their natural habitats.',
        exampleTranslation: 'Wir müssen wilde Tiere und ihre natürlichen Lebensräume schützen.',
        phonetic: '/prəˈtekt/',
        notes: 'Nomen: protection (der Schutz)',
        selected: true,
      },
      {
        word: 'endangered species',
        translation: 'bedrohte Tierarten',
        language: 'en',
        lesson: 'Unit 3: Wildlife & Nature',
        partOfSpeech: 'phrase',
        exampleSentence: 'The mountain gorilla is an endangered species.',
        exampleTranslation: 'Der Berggorilla ist eine bedrohte Tierart.',
        phonetic: '/ɪnˈdeɪn.dʒəd ˈspiː.ʃiːz/',
        notes: 'species bleibt im Plural und Singular gleich',
        selected: true,
      },
      {
        word: 'shelter',
        translation: 'die Unterkunft / der Schutzraum',
        language: 'en',
        lesson: 'Unit 3: Wildlife & Nature',
        partOfSpeech: 'noun',
        exampleSentence: 'During the storm, the hikers found shelter in a wooden hut.',
        exampleTranslation: 'Während des Sturms fanden die Wanderer Schutz in einer Holzhütte.',
        phonetic: '/ˈʃel.tər/',
        notes: 'Plural: shelters',
        selected: true,
      },
      {
        word: 'take care of',
        translation: 'sich kümmern um / sorgen für',
        language: 'en',
        lesson: 'Unit 3: Wildlife & Nature',
        partOfSpeech: 'phrase',
        exampleSentence: 'Who will take care of your pet hamster when you are on holiday?',
        exampleTranslation: 'Wer wird sich um deinen Hamster kümmern, wenn du im Urlaub bist?',
        phonetic: '/teɪk keər əv/',
        notes: 'Synonym: look after',
        selected: true,
      },
      {
        word: 'breathtaking',
        translation: 'atemberaubend / faszinierend',
        language: 'en',
        lesson: 'Unit 3: Wildlife & Nature',
        partOfSpeech: 'adjective',
        exampleSentence: 'The view from the top of the mountain was breathtaking.',
        exampleTranslation: 'Die Aussicht von der Bergspitze war atemberaubend.',
        phonetic: '/ˈbreθˌteɪ.kɪŋ/',
        notes: 'Zusammengesetzt aus: breath (Atem) + taking (nehmend)',
        selected: true,
      },
      {
        word: 'volunteer',
        translation: 'Freiwillige(r) / ehrenamtlich arbeiten',
        language: 'en',
        lesson: 'Unit 3: Wildlife & Nature',
        partOfSpeech: 'noun',
        exampleSentence: 'Sarah works as a volunteer at the local animal rescue center.',
        exampleTranslation: 'Sarah arbeitet als Freiwillige im örtlichen Tierheim.',
        phonetic: '/ˌvɒl.ənˈtɪər/',
        notes: 'Kann Nomen oder Verb sein (to volunteer)',
        selected: true,
      },
    ]
  },
  {
    id: 'sample-la-forum',
    title: 'Latein Lektion 2: In Foro Romano',
    language: 'la',
    suggestedLesson: 'Lektion 2: In Foro Romano',
    description: 'Arbeitsblatt mit Vokabelangaben zu Handel und Markttreiben im antiken Rom.',
    previewSvg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="100%" height="100%" fill="%23fdfbf7" stroke="%23e2d9cc" stroke-width="4"/><rect x="20" y="20" width="360" height="40" rx="8" fill="%23fef3c7"/><text x="35" y="46" font-family="serif" font-weight="bold" font-size="16" fill="%2392400e">Lektion 2: In Foro Romano (Tabula Vocabulorum)</text><text x="35" y="85" font-family="serif" font-size="13" fill="%23451a03">Vokabeln zur Lektion:</text><rect x="35" y="100" width="330" height="175" rx="6" fill="%23ffffff" stroke="%23e2d9cc"/><text x="50" y="125" font-family="serif" font-size="12" fill="%231e293b">• mercator, mercatoris m. - der Kaufmann, Händler</text><text x="50" y="150" font-family="serif" font-size="12" fill="%231e293b">• emere, emo, emi, emptum - kaufen, erwerben</text><text x="50" y="175" font-family="serif" font-size="12" fill="%231e293b">• vendere, vendo, vendidi, venditum - verkaufen</text><text x="50" y="200" font-family="serif" font-size="12" fill="%231e293b">• pretium, pretii n. - der Preis, der Wert</text><text x="50" y="225" font-family="serif" font-size="12" fill="%231e293b">• spectare, specto, spectavi - anschauen, betrachten</text><text x="50" y="250" font-family="serif" font-size="12" fill="%231e293b">• magnus, magna, magnum - groß, bedeutend</text></svg>`,
    simulatedResults: [
      {
        word: 'mercator',
        translation: 'der Kaufmann / der Händler',
        language: 'la',
        lesson: 'Lektion 2: In Foro Romano',
        partOfSpeech: 'noun',
        exampleSentence: 'Mercatores multas merces in foro vendunt.',
        exampleTranslation: 'Die Händler verkaufen viele Waren auf dem Forum.',
        phonetic: 'mer-KA-tor',
        notes: 'mercātor, mercātōris m. (3. Deklination)',
        selected: true,
      },
      {
        word: 'emere',
        translation: 'kaufen / erwerben',
        language: 'la',
        lesson: 'Lektion 2: In Foro Romano',
        partOfSpeech: 'verb',
        exampleSentence: 'Femina togam novam emit.',
        exampleTranslation: 'Die Frau kauft eine neue Toga.',
        phonetic: 'E-me-re',
        notes: 'emō, ēmī, ēmptum (konsonantische Konjugation)',
        selected: true,
      },
      {
        word: 'vendere',
        translation: 'verkaufen',
        language: 'la',
        lesson: 'Lektion 2: In Foro Romano',
        partOfSpeech: 'verb',
        exampleSentence: 'Quid hodie vendis, amice?',
        exampleTranslation: 'Was verkaufst du heute, mein Freund?',
        phonetic: 'VEN-de-re',
        notes: 'vēndō, vēndidī, vēnditum',
        selected: true,
      },
      {
        word: 'pretium',
        translation: 'der Preis / der Wert',
        language: 'la',
        lesson: 'Lektion 2: In Foro Romano',
        partOfSpeech: 'noun',
        exampleSentence: 'Pretium huius equi magnum est.',
        exampleTranslation: 'Der Preis dieses Pferdes ist hoch.',
        phonetic: 'PRE-ti-um',
        notes: 'pretium, pretiī n. (o-Deklination)',
        selected: true,
      },
      {
        word: 'spectare',
        translation: 'anschauen / betrachten',
        language: 'la',
        lesson: 'Lektion 2: In Foro Romano',
        partOfSpeech: 'verb',
        exampleSentence: 'Populus ludos in amphitheatro spectat.',
        exampleTranslation: 'Das Volk schaut die Spiele im Amphitheater an.',
        phonetic: 'spek-TA-re',
        notes: 'spectō, spectāvī, spectātum (a-Konjugation)',
        selected: true,
      },
      {
        word: 'magnus',
        translation: 'groß / bedeutend',
        language: 'la',
        lesson: 'Lektion 2: In Foro Romano',
        partOfSpeech: 'adjective',
        exampleSentence: 'Roma magnum imperium habebat.',
        exampleTranslation: 'Rom hatte ein großes Reich.',
        phonetic: 'MAG-nus',
        notes: 'magnus, magna, magnum (Komparativ: maior, Superlativ: maximus)',
        selected: true,
      }
    ]
  }
];

function resolveChatCompletionsUrl(rawBaseUrl: string): string {
  const trimmed = rawBaseUrl.trim().replace(/\/+$/, '');
  const parsed = new URL(trimmed);
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

function parseModelList(raw?: string): string[] {
  if (!raw) return ['default'];
  const models = raw.split(',').map((m) => m.trim()).filter(Boolean);
  return models.length > 0 ? models : ['default'];
}

function extractOpenAiContent(data: any): string | undefined {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === 'string' && content.trim()) return content;
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

async function callOpenAiCompatibleDirect(params: {
  baseUrl: string;
  apiKey?: string;
  modelList?: string;
  prompt: string;
  mimeType?: string;
  cleanBase64?: string;
  temperature: number;
  maxTokens?: number;
  timeoutMs: number;
  expectJson?: boolean;
}): Promise<{ text: string; model: string }> {
  const endpointUrl = resolveChatCompletionsUrl(params.baseUrl);
  const models = parseModelList(params.modelList);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (params.apiKey?.trim()) {
    headers.Authorization = `Bearer ${params.apiKey.trim()}`;
  }
  const content: any =
    params.cleanBase64 && params.mimeType
      ? [
          { type: 'text', text: params.prompt },
          { type: 'image_url', image_url: { url: `data:${params.mimeType};base64,${params.cleanBase64}` } },
        ]
      : params.prompt;

  let lastError: Error | null = null;
  for (const model of models) {
    try {
      const sendRequest = async (includeResponseFormat: boolean) => {
        const payload: Record<string, any> = {
          model,
          messages: [{ role: 'user', content }],
          temperature: params.temperature,
        };
        if (params.maxTokens !== undefined) payload.max_tokens = params.maxTokens;
        if (includeResponseFormat && params.expectJson !== false) {
          payload.response_format = { type: 'json_object' };
        }
        return fetch(endpointUrl, {
          method: 'POST',
          headers,
          signal: AbortSignal.timeout(params.timeoutMs),
          body: JSON.stringify(payload),
        });
      };

      let response = await sendRequest(true);
      if (response.status === 400 && params.expectJson !== false) {
        response = await sendRequest(false);
      }
      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        const errMsg = errJson?.error?.message || errJson?.message || `HTTP ${response.status}`;
        throw new Error(`Modell-Endpunkt (${model}): ${errMsg}`);
      }
      const data = await response.json();
      const text = extractOpenAiContent(data);
      if (!text) throw new Error('Keine Antwort vom Modell-Endpunkt erhalten.');
      const resolvedModel = typeof data.model === 'string' && data.model.trim() ? data.model.trim() : model;
      return { text, model: resolvedModel };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw lastError || new Error('Anfrage an den Modell-Endpunkt fehlgeschlagen.');
}

export async function listAiModels(config: Pick<AiClientConfig, 'aiBaseUrl' | 'aiApiKey'>): Promise<string[]> {
  try {
    const res = await apiListAiModels({
      aiBaseUrl: config.aiBaseUrl?.trim() || undefined,
      aiApiKey: config.aiApiKey?.trim() || undefined,
    });
    return Array.isArray(res.models) ? res.models : [];
  } catch (serverErr) {
    if (serverErr instanceof ApiError && !serverErr.retryable) throw serverErr;
  }

  if (!config.aiBaseUrl?.trim()) {
    throw new Error('Bitte gib zuerst eine Modell-Endpunkt-URL ein.');
  }
  const modelsUrl = resolveChatCompletionsUrl(config.aiBaseUrl.trim()).replace(/\/chat\/completions$/, '/models');
  const headers: Record<string, string> = {};
  if (config.aiApiKey?.trim()) headers.Authorization = `Bearer ${config.aiApiKey.trim()}`;
  const response = await fetch(modelsUrl, { method: 'GET', headers, signal: AbortSignal.timeout(10000) });
  if (!response.ok) {
    const errJson = await response.json().catch(() => null);
    throw new Error(errJson?.error?.message || `HTTP ${response.status}`);
  }
  const data = await response.json();
  const rawList = Array.isArray(data?.data) ? data.data : Array.isArray(data?.models) ? data.models : [];
  return rawList
    .map((item: any) => (typeof item === 'string' ? item : typeof item?.id === 'string' ? item.id : typeof item?.name === 'string' ? item.name : ''))
    .map((id: string) => id.trim())
    .filter(Boolean);
}

export async function testAiConnection(
  config: AiClientConfig
): Promise<{ ok: boolean; provider: 'openai' | 'gemini'; model: string }> {
  try {
    return await apiTestAiConnection({
      apiKey: config.geminiApiKey?.trim() || undefined,
      aiBaseUrl: config.aiBaseUrl?.trim() || undefined,
      aiModel: config.aiModel?.trim() || undefined,
      aiApiKey: config.aiApiKey?.trim() || undefined,
    });
  } catch (serverErr) {
    if (serverErr instanceof ApiError && !serverErr.retryable) throw serverErr;
    // Fallback to direct browser test if server is unreachable
  }

  if (config.aiBaseUrl?.trim()) {
    const { model } = await callOpenAiCompatibleDirect({
      baseUrl: config.aiBaseUrl.trim(),
      apiKey: config.aiApiKey,
      modelList: config.aiModel,
      prompt: 'Antworte nur mit: OK',
      temperature: 0,
      maxTokens: 16,
      timeoutMs: 10000,
      expectJson: false,
    });
    return { ok: true, provider: 'openai', model };
  }

  const apiKey = config.geminiApiKey?.trim();
  if (!apiKey) {
    throw new Error('Bitte gib zuerst einen Modell-Endpunkt oder einen Gemini API-Key ein.');
  }

  const modelsToTry = ['gemini-3.5-flash-lite', 'gemini-4-hydrogen'];
  let lastErrorMsg = '';
  for (const model of modelsToTry) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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
      if (response.ok) return { ok: true, provider: 'gemini', model };
      const errJson = await response.json().catch(() => null);
      lastErrorMsg = errJson?.error?.message || `HTTP ${response.status}`;
    } catch (err: unknown) {
      lastErrorMsg = err instanceof Error ? err.message : 'Netzwerkfehler';
    }
  }
  throw new Error(`API-Fehler: ${lastErrorMsg || 'Verbindung fehlgeschlagen'}`);
}

export async function analyzeWorksheetWithGemini(
  base64Data: string,
  mimeType: string,
  language: Language,
  suggestedLesson: string,
  apiKey: string,
  aiConfig?: AiClientConfig
): Promise<WorksheetAnalysisResponse> {
  const aiBaseUrl = aiConfig?.aiBaseUrl?.trim() || undefined;
  const aiModel = aiConfig?.aiModel?.trim() || undefined;
  const aiApiKey = aiConfig?.aiApiKey?.trim() || undefined;

  // 1. Try server-side analysis first
  try {
    const serverResult = await apiAnalyzeWorksheet({
      base64Data,
      mimeType,
      language,
      suggestedLesson,
      apiKey,
      aiBaseUrl,
      aiModel,
      aiApiKey,
    });
    if (serverResult && Array.isArray(serverResult.words)) {
      return validateWorksheet(serverResult, language, suggestedLesson);
    }
  } catch (serverErr) {
    if (serverErr instanceof ApiError && serverErr.status !== 0) throw serverErr;
    console.warn('[AI] Server analysis unavailable, falling back to direct client call', serverErr);
  }

  // 2. Direct client fallback
  if (!aiBaseUrl && !apiKey) {
    throw new Error('Kein Modell-Endpunkt oder API-Schlüssel für die Analyse angegeben.');
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

  if (aiBaseUrl) {
    const { text } = await callOpenAiCompatibleDirect({
      baseUrl: aiBaseUrl,
      apiKey: aiApiKey,
      modelList: aiModel,
      prompt: systemPrompt,
      mimeType,
      cleanBase64,
      temperature: 0.2,
      timeoutMs: 30000,
    });
    let parsed: any;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
      parsed = JSON.parse(jsonStr);
    } catch (jsonErr) {
      console.error('Failed to parse AI JSON output', text, jsonErr);
      throw new Error('KI-Antwort konnte nicht als Vokabelliste interpretiert werden.');
    }
    return validateWorksheet(parsed, language, suggestedLesson);
  }

  const models = ['gemini-3.5-flash-lite', 'gemini-4-hydrogen'];
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
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
        const errorJson = await response.json().catch(() => null);
        const errMsg = errorJson?.error?.message || `HTTP ${response.status}`;
        throw new Error(`Gemini API (${model}): ${errMsg}`);
      }

      const data = await response.json();
      const parts = data.candidates?.[0]?.content?.parts || [];
      const textPart = parts.find((p: any) => !p.thought && typeof p.text === 'string' && p.text.trim())?.text;
      if (!textPart) {
        throw new Error('Keine Antwort von Gemini erhalten.');
      }

      let parsed: any;
      try {
        const jsonMatch = textPart.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : textPart.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
        parsed = JSON.parse(jsonStr);
      } catch (jsonErr) {
        console.error('Failed to parse Gemini JSON output', textPart, jsonErr);
        throw new Error('Gemini-Antwort konnte nicht als Vokabelliste interpretiert werden.');
      }

      return validateWorksheet(parsed, language, suggestedLesson);
    } catch (err: unknown) {
      console.warn(`Model ${model} failed, trying fallback if available`, err);
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError || new Error('Arbeitsblatt-Analyse fehlgeschlagen.');
}

export async function gradeHandwriting(params: {
  base64Data: string;
  expectedWord: string;
  language: Language;
  mimeType?: string;
  apiKey?: string;
  aiBaseUrl?: string;
  aiModel?: string;
  aiApiKey?: string;
}): Promise<HandwritingGradeResponse> {
  const { base64Data, expectedWord, language, mimeType = 'image/jpeg', apiKey } = params;
  const aiBaseUrl = params.aiBaseUrl?.trim() || undefined;
  const aiModel = params.aiModel?.trim() || undefined;
  const aiApiKey = params.aiApiKey?.trim() || undefined;

  // 1. Try server proxy first
  try {
    const serverResult = await apiGradeHandwriting({
      base64Data,
      mimeType,
      expectedWord,
      language,
      apiKey,
      aiBaseUrl,
      aiModel,
      aiApiKey,
    });
    return validateGrade(serverResult, expectedWord);
  } catch (serverErr) {
    if (serverErr instanceof ApiError && serverErr.status !== 0) throw serverErr;
    console.warn('[AI] Server handwriting grading unavailable, falling back to direct client call', serverErr);
  }

  // 2. Direct client fallback
  if (!aiBaseUrl && !apiKey) {
    throw new Error('Kein Modell-Endpunkt oder API-Schlüssel für die Korrektur konfiguriert.');
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

  if (aiBaseUrl) {
    const { text, model } = await callOpenAiCompatibleDirect({
      baseUrl: aiBaseUrl,
      apiKey: aiApiKey,
      modelList: aiModel,
      prompt: systemPrompt,
      mimeType,
      cleanBase64,
      temperature: 0.1,
      maxTokens: 2048,
      timeoutMs: 15000,
    });
    let parsed: any;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
      parsed = JSON.parse(jsonStr);
    } catch (jsonErr) {
      console.error('Failed to parse AI JSON output', text, jsonErr);
      throw new Error('KI-Antwort konnte nicht ausgewertet werden.');
    }
    return { ...validateGrade(parsed, expectedWord), model };
  }

  const models = ['gemini-3.5-flash-lite', 'gemini-4-hydrogen'];
  let lastError: Error | null = null;

  for (const model of models) {
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

      const sendRequest = async (config: Record<string, any>) => {
        return fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
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
              generationConfig: config,
            }),
          }
        );
      };

      const response = await sendRequest(genConfig);

      if (!response.ok) {
        const errorJson = await response.json().catch(() => null);
        const errMsg = errorJson?.error?.message || `HTTP ${response.status}`;
        throw new Error(`Gemini API (${model}): ${errMsg}`);
      }

      const data = await response.json();
      const parts = data.candidates?.[0]?.content?.parts || [];
      const textPart = parts.find((p: any) => !p.thought && typeof p.text === 'string' && p.text.trim())?.text;
      if (!textPart) {
        throw new Error('Keine Antwort von Gemini erhalten.');
      }

      let parsed: any;
      try {
        const jsonMatch = textPart.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : textPart.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
        parsed = JSON.parse(jsonStr);
      } catch (jsonErr) {
        console.error('Failed to parse Gemini JSON output', textPart, jsonErr);
        throw new Error('Gemini-Antwort konnte nicht ausgewertet werden.');
      }

      return { ...validateGrade(parsed, expectedWord), model };
    } catch (err: unknown) {
      console.warn(`Model ${model} failed, trying fallback if available`, err);
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError || new Error('Handschrift-Bewertung fehlgeschlagen.');
}

export async function organizeLessonsWithAi(params: {
  words: WordItem[];
  language: Language;
  instruction?: string;
  existingLessons?: string[];
  apiKey?: string;
  aiConfig?: AiClientConfig;
}): Promise<LessonReorganizationResponse> {
  const payloadWords = params.words.map((w) => ({
    id: w.id,
    word: w.word,
    translation: w.translation,
    lesson: w.lesson,
    partOfSpeech: w.partOfSpeech,
    notes: w.notes,
  }));

  return apiOrganizeLessons({
    words: payloadWords,
    language: params.language,
    instruction: params.instruction,
    existingLessons: params.existingLessons,
    apiKey: params.apiKey || params.aiConfig?.geminiApiKey,
    aiBaseUrl: params.aiConfig?.aiBaseUrl?.trim() || undefined,
    aiModel: params.aiConfig?.aiModel?.trim() || undefined,
    aiApiKey: params.aiConfig?.aiApiKey?.trim() || undefined,
  });
}

