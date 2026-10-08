import { randomUUID } from 'node:crypto';
import type { WordItem, HandwritingGradeResponse, WorksheetAnalysisResponse, Language } from './types.js';

const parts = new Set(['noun', 'verb', 'adjective', 'adverb', 'phrase', 'preposition', 'conjunction', 'pronoun', 'other']);
export function validateWord(value: unknown): WordItem {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid vocabulary item');
  const w = value as Record<string, unknown>;
  for (const key of ['word', 'translation', 'language']) {
    if (typeof w[key] !== 'string' || !(w[key] as string).trim() || (w[key] as string).length > 10000) throw new Error(`${key} is required`);
  }
  if (w.language !== 'en' && w.language !== 'la') throw new Error('Invalid language');
  if (w.partOfSpeech !== undefined && !parts.has(String(w.partOfSpeech))) throw new Error('Invalid part of speech');
  for (const key of ['id', 'lesson', 'exampleSentence', 'exampleTranslation', 'phonetic', 'notes', 'profileId']) {
    if (w[key] != null && (typeof w[key] !== 'string' || (w[key] as string).length > 10000)) throw new Error(`Invalid ${key}`);
  }
  for (const key of ['box', 'correctCount', 'incorrectCount', 'createdAt', 'lastReviewedAt']) {
    if (w[key] !== undefined && (typeof w[key] !== 'number' || !Number.isSafeInteger(w[key]) || (w[key] as number) < 0)) throw new Error(`Invalid ${key}`);
  }
  if (w.box !== undefined && ((w.box as number) < 1 || (w.box as number) > 5)) throw new Error('Invalid box');
  return { ...w, id: w.id || randomUUID(), word: (w.word as string).trim(), translation: (w.translation as string).trim(),
    lesson: w.lesson || 'Lerneinheit', partOfSpeech: w.partOfSpeech || 'other', box: w.box ?? 1,
    correctCount: w.correctCount ?? 0, incorrectCount: w.incorrectCount ?? 0, createdAt: w.createdAt ?? Date.now() } as WordItem;
}

export function validateGrade(value: unknown, expectedWord: string): HandwritingGradeResponse {
  if (!value || typeof value !== 'object') throw new Error('Invalid handwriting response');
  const grade = value as Record<string, unknown>;
  if (typeof grade.recognizedWord !== 'string' || !grade.recognizedWord.trim() ||
      typeof grade.isCorrect !== 'boolean' || typeof grade.score !== 'number' || !Number.isFinite(grade.score)) throw new Error('Invalid handwriting response');
  const normalize = (text: string) => text.normalize('NFKC').trim().toLowerCase().replace(/[.,!?;:'"’‘`´]/g, '').replace(/\s+/g, ' ');
  const expLetter = expectedWord.trim().match(/^\p{L}/u)?.[0];
  const recLetter = grade.recognizedWord.trim().match(/^\p{L}/u)?.[0];
  const isUpper = (letter: string) => letter === letter.toUpperCase() && letter !== letter.toLowerCase();
  const capitalizationError = grade.capitalizationError === true || Boolean(expLetter && recLetter && isUpper(expLetter) !== isUpper(recLetter));
  const isCorrect = grade.isCorrect && !capitalizationError && normalize(grade.recognizedWord) === normalize(expectedWord);
  let schoolGrade = typeof grade.schoolGrade === 'string' ? grade.schoolGrade : '';
  let feedback = typeof grade.feedback === 'string' ? grade.feedback : '';
  if (capitalizationError) {
    if (/^[12]/.test(schoolGrade)) schoolGrade = '3 (Befriedigend)';
    if (expLetter && !/groß|klein/i.test(feedback)) {
      feedback = `${feedback} Achte auf den Wortanfang: "${expectedWord}" beginnt mit einem ${isUpper(expLetter) ? 'Großbuchstaben' : 'Kleinbuchstaben'} ("${expLetter}").`.trim();
    }
  }
  return { recognizedWord: grade.recognizedWord.trim(), isCorrect,
    score: Math.max(0, Math.min(isCorrect ? 100 : 70, grade.score)),
    schoolGrade, feedback, capitalizationError,
    ...(typeof grade.model === 'string' ? { model: grade.model } : {}) };
}

export function validateWorksheet(value: unknown, language: Language, suggestedLesson = ''): WorksheetAnalysisResponse {
  if (!value || typeof value !== 'object' || typeof suggestedLesson !== 'string') throw new Error('Invalid worksheet response');
  const result = value as Record<string, unknown>;
  if (!Array.isArray(result.words) || result.words.length > 10000) throw new Error('Invalid worksheet vocabulary');
  const lessonName = suggestedLesson.trim() || (typeof result.lessonName === 'string' && result.lessonName.trim()) || 'Neue Lektion';
  return { lessonName, detectedTopic: typeof result.detectedTopic === 'string' ? result.detectedTopic : 'Arbeitsblatt Vokabeln',
    summary: typeof result.summary === 'string' ? result.summary : undefined,
    words: result.words.map(w => {
      if (!w || typeof w !== 'object' || Array.isArray(w)) throw new Error('Invalid extracted word');
      return { ...validateWord({ ...w, language, lesson: lessonName, profileId: null, box: 1,
        correctCount: 0, incorrectCount: 0, lastReviewedAt: undefined }), selected: true };
    }) };
}
