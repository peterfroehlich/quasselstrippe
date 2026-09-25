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

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  color?: string;
  createdAt: number;
  isDefault?: boolean;
}

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
  profileId?: string | null; // null or undefined means shared across all profiles
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

export interface ReviewLogItem {
  id: string;
  profileId: string;
  wordId: string;
  language: Language;
  wasCorrect: boolean;
  boxBefore: number;
  boxAfter: number;
  reviewedAt: number;
}

export interface ReviewHistoryPoint {
  date: string; // 'YYYY-MM-DD'
  dayLabel: string; // '23. Sep' or 'Mo'
  timestamp: number;
  reviewsCount: number;
  correctCount: number;
  incorrectCount: number;
  accuracy: number; // 0 to 100
  masteredCumulative: number; // count of words in Box 4 & 5
}

export interface DifficultWordItem {
  id: string;
  word: string;
  translation: string;
  language: Language;
  box: number;
  incorrectCount: number;
  correctCount: number;
}

export interface LearnerStats {
  profileId: string;
  language?: Language | 'all';
  totalWords: number;
  masteredWords: number; // Box 4 & 5
  learningWords: number; // Box 2 & 3
  newWords: number; // Box 1
  boxDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
  totalReviews: number;
  correctReviews: number;
  incorrectReviews: number;
  accuracyRate: number; // 0 to 100
  streakDays: number;
  history: ReviewHistoryPoint[];
  difficultWords: DifficultWordItem[];
}

