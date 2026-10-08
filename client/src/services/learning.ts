import type { WordItem } from '../types/vocabulary';

export const REVIEW_INTERVAL_DAYS = [0, 1, 3, 7, 14, 30];
export function isReviewDue(word: WordItem, now = Date.now()): boolean {
  return !word.lastReviewedAt || now >= word.lastReviewedAt + REVIEW_INTERVAL_DAYS[word.box] * 86400000;
}
export function nextReviewState(word: WordItem, correct: boolean, now = Date.now(), promote = true): WordItem {
  const outdated = Boolean(word.lastReviewedAt && now < word.lastReviewedAt);
  const advance = correct && promote && isReviewDue(word, now);
  return { ...word, box: outdated ? word.box : !correct ? 1 : advance ? Math.min(5, word.box + 1) : word.box,
    correctCount: word.correctCount + (correct ? 1 : 0),
    incorrectCount: word.incorrectCount + (correct ? 0 : 1),
    lastReviewedAt: !outdated && (!correct || advance) ? Math.max(now, word.lastReviewedAt || 0) : word.lastReviewedAt };
}
