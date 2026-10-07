import { Router, Request, Response } from 'express';
import { getSettings } from '../db/database.js';
import type { Language, WorksheetAnalysisResponse, ExtractedWordCandidate, HandwritingGradeResponse } from '../types.js';

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
    const models = [
      'gemini-3.8-flash',
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-2.5-flash',
    ];
    let lastError: Error | null = null;
    let resultData: WorksheetAnalysisResponse | null = null;

    for (const model of models) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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

// POST /api/ai/grade-handwriting
aiRouter.post('/grade-handwriting', async (req: Request, res: Response) => {
  try {
    const { base64Data, mimeType = 'image/jpeg', expectedWord = '', language = 'en', apiKey: customApiKey } = req.body;

    if (!base64Data) {
      return res.status(400).json({ error: 'base64Data is required' });
    }

    if (!expectedWord) {
      return res.status(400).json({ error: 'expectedWord is required' });
    }

    const settings = getSettings();
    const apiKey = process.env.GEMINI_API_KEY || customApiKey || settings.geminiApiKey;

    if (!apiKey) {
      return res.status(400).json({
        error: 'Kein Gemini API-Schlüssel konfiguriert. Bitte in den Einstellungen hinterlegen oder als GEMINI_API_KEY im Docker-Container angeben.',
      });
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
- WICHTIG: Achte zwingend auf die Groß-/Kleinschreibung des Anfangsbuchstabens!
  - Stimmt die Groß-/Kleinschreibung des ersten Buchstabens nicht mit "${expectedWord}" überein (z.B. klein statt groß oder groß statt klein geschrieben), werte dies als Fehler ("isCorrect": false, "score": maximal 70, "capitalizationError": true).
  - Weise im Feedback explizit auf den falschen Anfangsbuchstaben hin (z.B. 'Achte auf die Großschreibung am Wortanfang' bzw. 'Dieses Wort wird am Anfang kleingeschrieben').
3. Bewerte:
- "recognizedWord": Was hat der Schüler geschrieben? (exakte Groß-/Kleinschreibung beibehalten)
- "isCorrect": true wenn richtig geschrieben UND Anfangsbuchstabe korrekt groß/kleingeschrieben, sonst false.
- "score": 0 bis 100 (100 = perfekt, 85-95 = sehr gut, 65-75 = richtige Buchstaben aber falsche Groß-/Kleinschreibung am Anfang, 0-40 = falsch oder unleserlich).
- "schoolGrade": Deutsche Schulnote (z.B. "1 (Sehr gut)", "2 (Gut)", "3 (Befriedigend)", "4 (Ausreichend)", "5 (Mangelhaft)", "6 (Ungenügend)").
- "feedback": Maximal 1 bis 2 kurze, motivierende Sätze auf Deutsch. Erkläre bei Fehlern genau, was falsch ist.
- "capitalizationError": true, falls der Anfangsbuchstabe die falsche Groß-/Kleinschreibung hat, sonst false.

Antworte AUSSCHLIESSLICH im folgenden JSON-Format ohne Markdown-Codeblöcke außerhalb des JSON:
{
  "recognizedWord": "das erkannte Wort",
  "isCorrect": true,
  "score": 100,
  "schoolGrade": "1 (Sehr gut)",
  "feedback": "Klasse gemacht! Fehlerfrei geschrieben.",
  "capitalizationError": false
}`;

    const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const models = [
      'gemini-3.8-flash',
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-2.5-flash',
    ];
    let lastError: Error | null = null;
    let resultData: HandwritingGradeResponse | null = null;

    for (const model of models) {
      try {
        const genConfig: Record<string, any> = {
          temperature: 0.1,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
        };

        // Suppress reasoning thinking tokens to achieve sub-second grading
        if (model.startsWith('gemini-3')) {
          genConfig.thinkingConfig = { thinkingLevel: 'low' };
        } else if (model.startsWith('gemini-2.5')) {
          genConfig.thinkingConfig = { thinkingBudget: 0 };
        }

        const sendRequest = async (config: Record<string, any>) => {
          return fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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
                generationConfig: config,
              }),
            }
          );
        };

        let response = await sendRequest(genConfig);

        // Gracefully retry without thinkingConfig if the model endpoint rejects thinking parameters
        if (!response.ok && response.status === 400 && genConfig.thinkingConfig) {
          const { thinkingConfig, ...plainConfig } = genConfig;
          response = await sendRequest(plainConfig);
        }

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
          throw new Error('Gemini-Antwort konnte nicht als JSON interpretiert werden.');
        }

        // Deterministic validation of initial letter capitalization
        const expLetter = expectedWord.trim().match(/^\p{L}/u)?.[0];
        const recLetter = (parsed.recognizedWord || '').trim().match(/^\p{L}/u)?.[0];
        let hasCapitalizationMismatch = false;
        let capNotice = '';

        if (expLetter && recLetter) {
          const isExpUpper = expLetter === expLetter.toUpperCase() && expLetter !== expLetter.toLowerCase();
          const isRecUpper = recLetter === recLetter.toUpperCase() && recLetter !== recLetter.toLowerCase();
          if (isExpUpper !== isRecUpper) {
            hasCapitalizationMismatch = true;
            capNotice = isExpUpper
              ? `Achte auf den Wortanfang: "${expectedWord}" beginnt mit einem Großbuchstaben ("${expLetter}").`
              : `Achte auf den Wortanfang: "${expectedWord}" beginnt mit einem Kleinbuchstaben ("${expLetter}").`;
          }
        }

        const capitalizationError = Boolean(parsed.capitalizationError || hasCapitalizationMismatch);
        let isCorrect = Boolean(parsed.isCorrect);
        let score = typeof parsed.score === 'number' ? parsed.score : isCorrect ? 100 : 40;
        let schoolGrade = parsed.schoolGrade || (isCorrect ? '1 (Sehr gut)' : '5 (Mangelhaft)');
        let feedback = parsed.feedback || (isCorrect ? 'Super gemacht!' : 'Übe dieses Wort noch einmal.');

        if (capitalizationError) {
          isCorrect = false;
          score = Math.min(score, 70);
          if (schoolGrade.startsWith('1') || schoolGrade.startsWith('2')) {
            schoolGrade = '3 (Befriedigend)';
          }
          if (capNotice && !feedback.toLowerCase().includes('groß') && !feedback.toLowerCase().includes('klein')) {
            feedback = `${feedback} ${capNotice}`.trim();
          }
        }

        resultData = {
          recognizedWord: parsed.recognizedWord || '(unbekannt)',
          isCorrect,
          score,
          schoolGrade,
          feedback,
          capitalizationError,
          model,
        };
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

