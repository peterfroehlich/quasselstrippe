export type Language = 'en' | 'la';

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

export interface WordItem {
  id: string;
  word: string;
  translation: string;
  language: Language;
  lesson: string;
  partOfSpeech: PartOfSpeech;
  exampleSentence?: string;
  exampleTranslation?: string;
  phonetic?: string;
  notes?: string;
  box: number;
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

export interface AppSettings {
  geminiApiKey: string;
  activeLanguage: Language;
  speechRate: number;
  autoPlayAudio: boolean;
}
