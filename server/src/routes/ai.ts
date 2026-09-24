import { Router, Request, Response } from 'express';
import { getSettings } from '../db/database.js';
import type { Language, WorksheetAnalysisResponse, ExtractedWordCandidate } from '../types.js';

export const aiRouter = Router();

// POST /api/ai/analyze-worksheet
aiRouter.post('/analyze-worksheet', async (req: Request, res: Response) => {
  try {
    const { base64Data, mimeType = 'image/jpeg', language = 'en', suggestedLesson = '', apiKey: customApiKey } = req.body;

    if (!base64Data) {
      return res.status(400).json({ error: 'base64Data is required' });
    }

    const settings = getSettings();
    const apiKey = process.env.GEMINI_API_KEY || customApiKey || settings.geminiApiKey;

    if (!apiKey) {
      return res.status(400).json({
        error: 'Kein Gemini API-Schlüssel konfiguriert. Bitte in den Einstellungen hinterlegen oder als GEMINI_API_KEY im Docker-Container angeben.',
      });
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
    const models = ['gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-3.8-flash', 'gemini-2.5-flash'];
    let lastError: Error | null = null;
    let resultData: WorksheetAnalysisResponse | null = null;

    for (const model of models) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [
                    { text: systemPrompt },
                    {
                      inline_data: {
                        mime_type: mimeType,
                        data: cleanBase64,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.2,
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
        const textPart = parts.find((p: any) => typeof p.text === 'string' && p.text.trim())?.text;
        if (!textPart) {
          throw new Error('Keine Antwort von Gemini erhalten.');
        }

        let parsed: any;
        try {
          const jsonMatch = textPart.match(/\{[\s\S]*\}/);
          const jsonStr = jsonMatch ? jsonMatch[0] : textPart.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
          parsed = JSON.parse(jsonStr);
        } catch {
          throw new Error('Gemini-Antwort konnte nicht als Vokabelliste interpretiert werden.');
        }

        const wordsWithSelection = (parsed.words || []).map((w: ExtractedWordCandidate) => ({
          ...w,
          language: (w.language as Language) || language,
          lesson: suggestedLesson || parsed.lessonName || 'Neue Lektion',
          selected: true,
        }));

        resultData = {
          detectedTopic: parsed.detectedTopic || 'Arbeitsblatt Vokabeln',
          lessonName: suggestedLesson || parsed.lessonName || 'Neue Lektion',
          summary: parsed.summary,
          words: wordsWithSelection,
        };
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
