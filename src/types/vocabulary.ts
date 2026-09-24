export type Language = 'en' | 'la';

export interface LanguageConfig {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
  defaultLocale: string;
  description: string;
}

export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  {
    code: 'en',
    name: 'Englisch',
    nativeName: 'English',
    flag: '🇬🇧',
    defaultLocale: 'en-GB',
    description: 'Für den Englisch-Schulunterricht (Unter- und Mittelstufe)'
  },
  {
    code: 'la',
    name: 'Latein',
    nativeName: 'Latīna',
    flag: '🏛️',
    defaultLocale: 'it-IT', // standard classical pronunciation mapped or it-IT / la fallback
    description: 'Für den Latein-Unterricht (Vokabeln, Stammformen, Kasus)'
  }
];

export type PartOfSpeech =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'phrase'
  | 'preposition'
  | 'conjunction'
  | 'pronoun'
  | 'other';

export const PART_OF_SPEECH_LABELS: Record<PartOfSpeech, { de: string; color: string; badge: string }> = {
  noun: { de: 'Nomen / Substantiv', color: '#3b82f6', badge: 'N' },
  verb: { de: 'Verb / Zeitwort', color: '#10b981', badge: 'V' },
  adjective: { de: 'Adjektiv / Eigenschaftswort', color: '#f59e0b', badge: 'Adj' },
  adverb: { de: 'Adverb / Umstandswort', color: '#8b5cf6', badge: 'Adv' },
  phrase: { de: 'Redewendung / Phrase', color: '#ec4899', badge: 'Phr' },
  preposition: { de: 'Präposition / Verhältniswort', color: '#06b6d4', badge: 'Präp' },
  conjunction: { de: 'Konjunktion / Bindewort', color: '#14b8a6', badge: 'Konj' },
  pronoun: { de: 'Pronomen / Fürwort', color: '#6366f1', badge: 'Pron' },
  other: { de: 'Sonstiges', color: '#64748b', badge: '...' }
};

export interface WordItem {
  id: string;
  word: string; // The foreign word (e.g., "curious", "audire")
  translation: string; // The German translation (e.g., "neugierig", "hören, zuhören")
  language: Language;
  lesson: string; // e.g. "Unit 1: Back to School", "Lektion 3: In the City"
  partOfSpeech: PartOfSpeech;
  exampleSentence?: string; // Foreign example sentence
  exampleTranslation?: string; // German translation of example sentence
  phonetic?: string; // IPA or phonetic spelling hint
  notes?: string; // Grammar notes: plural, irregular verb forms, declension
  box: number; // 1 to 5 (Leitner Leitner box; 1 = new, 5 = mastered)
  correctCount: number;
  incorrectCount: number;
  lastReviewedAt?: number;
  createdAt: number;
}

export type ExtractedWordCandidate = Omit<
  WordItem,
  'id' | 'box' | 'correctCount' | 'incorrectCount' | 'createdAt'
> & {
  selected?: boolean;
};

export interface WorksheetAnalysisResponse {
  words: ExtractedWordCandidate[];
  detectedTopic?: string;
  lessonName: string;
  summary?: string;
}

export type StudyMode = 'flashcards' | 'quiz' | 'spelling' | 'match';

export type AppMode = 'learner' | 'admin';

export interface AppSettings {
  geminiApiKey: string;
  activeLanguage: Language;
  speechRate: number; // 0.8 - 1.2
  autoPlayAudio: boolean;
}
