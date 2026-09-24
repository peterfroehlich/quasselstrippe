import type { Language, WorksheetAnalysisResponse, ExtractedWordCandidate } from '../types/vocabulary';
import { apiAnalyzeWorksheet } from './api';

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

export async function analyzeWorksheetWithGemini(
  base64Data: string,
  mimeType: string,
  language: Language,
  suggestedLesson: string,
  apiKey: string
): Promise<WorksheetAnalysisResponse> {
  // 1. Try server-side analysis first
  try {
    const serverResult = await apiAnalyzeWorksheet({
      base64Data,
      mimeType,
      language,
      suggestedLesson,
      apiKey,
    });
    if (serverResult && Array.isArray(serverResult.words)) {
      return serverResult;
    }
  } catch (serverErr) {
    console.warn('[Gemini] Server analysis unavailable or failed, falling back to direct client call', serverErr);
  }

  // 2. Direct client fallback
  if (!apiKey) {
    throw new Error('Kein API-Schlüssel für die Analyse angegeben.');
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
  const models = ['gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-3.8-flash'];
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
        const errorJson = await response.json().catch(() => null);
        const errMsg = errorJson?.error?.message || `HTTP ${response.status}`;
        throw new Error(`Gemini API (${model}): ${errMsg}`);
      }

      const data = await response.json();
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
      } catch (jsonErr) {
        console.error('Failed to parse Gemini JSON output', textPart, jsonErr);
        throw new Error('Gemini-Antwort konnte nicht als Vokabelliste interpretiert werden.');
      }

      const wordsWithSelection = (parsed.words || []).map((w: ExtractedWordCandidate) => ({
        ...w,
        language,
        lesson: suggestedLesson || parsed.lessonName || 'Neue Lektion',
        selected: true,
      }));

      return {
        detectedTopic: parsed.detectedTopic || 'Arbeitsblatt Vokabeln',
        lessonName: suggestedLesson || parsed.lessonName || 'Neue Lektion',
        summary: parsed.summary,
        words: wordsWithSelection,
      };
    } catch (err: unknown) {
      console.warn(`Model ${model} failed, trying fallback if available`, err);
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError || new Error('Arbeitsblatt-Analyse fehlgeschlagen.');
}
