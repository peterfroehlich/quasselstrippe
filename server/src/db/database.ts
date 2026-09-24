import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import type { WordItem, AppSettings, Language, PartOfSpeech } from '../types.js';
import { INITIAL_WORDS, DEFAULT_SETTINGS } from './seed.js';

interface WordRow {
  id: string;
  word: string;
  translation: string;
  language: string;
  lesson: string;
  part_of_speech: string;
  example_sentence: string | null;
  example_translation: string | null;
  phonetic: string | null;
  notes: string | null;
  box: number;
  correct_count: number;
  incorrect_count: number;
  last_reviewed_at: number | null;
  created_at: number;
}

let dbInstance: DatabaseSync | null = null;

export function getDatabase(): DatabaseSync {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = process.env.DATABASE_PATH || path.resolve(process.cwd(), 'data', 'quasselstrippe.db');
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  // Initialize schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS words (
      id TEXT PRIMARY KEY,
      word TEXT NOT NULL,
      translation TEXT NOT NULL,
      language TEXT NOT NULL,
      lesson TEXT NOT NULL,
      part_of_speech TEXT NOT NULL,
      example_sentence TEXT,
      example_translation TEXT,
      phonetic TEXT,
      notes TEXT,
      box INTEGER NOT NULL DEFAULT 1,
      correct_count INTEGER NOT NULL DEFAULT 0,
      incorrect_count INTEGER NOT NULL DEFAULT 0,
      last_reviewed_at INTEGER,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_words_language ON words(language);
    CREATE INDEX IF NOT EXISTS idx_words_lesson ON words(lesson);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  dbInstance = db;
  initSeedsIfEmpty(db);

  return db;
}

function rowToWord(row: WordRow): WordItem {
  return {
    id: row.id,
    word: row.word,
    translation: row.translation,
    language: row.language as Language,
    lesson: row.lesson,
    partOfSpeech: row.part_of_speech as PartOfSpeech,
    exampleSentence: row.example_sentence || undefined,
    exampleTranslation: row.example_translation || undefined,
    phonetic: row.phonetic || undefined,
    notes: row.notes || undefined,
    box: row.box,
    correctCount: row.correct_count,
    incorrectCount: row.incorrect_count,
    lastReviewedAt: row.last_reviewed_at || undefined,
    createdAt: row.created_at,
  };
}

function initSeedsIfEmpty(db: DatabaseSync): void {
  // Check if words exist
  const countRow = db.prepare('SELECT COUNT(*) as count FROM words').get() as { count: number };
  if (countRow.count === 0) {
    console.log('[DB] Seeding initial vocabulary words...');
    const insert = db.prepare(`
      INSERT INTO words (
        id, word, translation, language, lesson, part_of_speech,
        example_sentence, example_translation, phonetic, notes,
        box, correct_count, incorrect_count, last_reviewed_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const w of INITIAL_WORDS) {
      insert.run(
        w.id,
        w.word,
        w.translation,
        w.language,
        w.lesson,
        w.partOfSpeech,
        w.exampleSentence ?? null,
        w.exampleTranslation ?? null,
        w.phonetic ?? null,
        w.notes ?? null,
        w.box,
        w.correctCount,
        w.incorrectCount,
        w.lastReviewedAt ?? null,
        w.createdAt
      );
    }
  }

  // Check if settings exist
  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM settings').get() as { count: number };
  if (settingsCount.count === 0) {
    console.log('[DB] Seeding default settings...');
    const setSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    setSetting.run('settings', JSON.stringify(DEFAULT_SETTINGS));
  }
}

export function getAllWords(language?: string): WordItem[] {
  const db = getDatabase();
  let rows: WordRow[];
  if (language) {
    const stmt = db.prepare('SELECT * FROM words WHERE language = ? ORDER BY created_at DESC');
    rows = stmt.all(language) as unknown as WordRow[];
  } else {
    const stmt = db.prepare('SELECT * FROM words ORDER BY created_at DESC');
    rows = stmt.all() as unknown as WordRow[];
  }
  return rows.map(rowToWord);
}

export function getWordById(id: string): WordItem | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM words WHERE id = ?').get(id) as unknown as WordRow | undefined;
  if (!row) return null;
  return rowToWord(row);
}

export function insertWord(word: WordItem): WordItem {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO words (
      id, word, translation, language, lesson, part_of_speech,
      example_sentence, example_translation, phonetic, notes,
      box, correct_count, incorrect_count, last_reviewed_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    word.id,
    word.word,
    word.translation,
    word.language,
    word.lesson,
    word.partOfSpeech,
    word.exampleSentence ?? null,
    word.exampleTranslation ?? null,
    word.phonetic ?? null,
    word.notes ?? null,
    word.box ?? 1,
    word.correctCount ?? 0,
    word.incorrectCount ?? 0,
    word.lastReviewedAt ?? null,
    word.createdAt ?? Date.now()
  );

  return getWordById(word.id)!;
}

export function insertWords(words: WordItem[]): WordItem[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO words (
      id, word, translation, language, lesson, part_of_speech,
      example_sentence, example_translation, phonetic, notes,
      box, correct_count, incorrect_count, last_reviewed_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const inserted: WordItem[] = [];
  for (const word of words) {
    stmt.run(
      word.id,
      word.word,
      word.translation,
      word.language,
      word.lesson,
      word.partOfSpeech,
      word.exampleSentence ?? null,
      word.exampleTranslation ?? null,
      word.phonetic ?? null,
      word.notes ?? null,
      word.box ?? 1,
      word.correctCount ?? 0,
      word.incorrectCount ?? 0,
      word.lastReviewedAt ?? null,
      word.createdAt ?? Date.now()
    );
    inserted.push(getWordById(word.id)!);
  }

  return inserted;
}

export function updateWord(word: WordItem): WordItem | null {
  const db = getDatabase();
  const stmt = db.prepare(`
    UPDATE words SET
      word = ?,
      translation = ?,
      language = ?,
      lesson = ?,
      part_of_speech = ?,
      example_sentence = ?,
      example_translation = ?,
      phonetic = ?,
      notes = ?,
      box = ?,
      correct_count = ?,
      incorrect_count = ?,
      last_reviewed_at = ?
    WHERE id = ?
  `);

  const result = stmt.run(
    word.word,
    word.translation,
    word.language,
    word.lesson,
    word.partOfSpeech,
    word.exampleSentence ?? null,
    word.exampleTranslation ?? null,
    word.phonetic ?? null,
    word.notes ?? null,
    word.box,
    word.correctCount,
    word.incorrectCount,
    word.lastReviewedAt ?? null,
    word.id
  );

  if (result.changes === 0) return null;
  return getWordById(word.id);
}

export function deleteWord(id: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM words WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

export function deleteWordsByLesson(lesson: string, language?: string): number {
  const db = getDatabase();
  if (language) {
    const stmt = db.prepare('DELETE FROM words WHERE lesson = ? AND language = ?');
    const result = stmt.run(lesson, language);
    return Number(result.changes);
  } else {
    const stmt = db.prepare('DELETE FROM words WHERE lesson = ?');
    const result = stmt.run(lesson);
    return Number(result.changes);
  }
}

export function recordReview(id: string, wasCorrect: boolean): WordItem | null {
  const existing = getWordById(id);
  if (!existing) return null;

  let nextBox = existing.box;
  if (wasCorrect) {
    nextBox = Math.min(5, existing.box + 1);
  } else {
    nextBox = Math.max(1, existing.box - 1);
  }

  const updated: WordItem = {
    ...existing,
    box: nextBox,
    correctCount: existing.correctCount + (wasCorrect ? 1 : 0),
    incorrectCount: existing.incorrectCount + (wasCorrect ? 0 : 1),
    lastReviewedAt: Date.now(),
  };

  return updateWord(updated);
}

export function resetReviewProgress(): WordItem[] {
  const db = getDatabase();
  db.exec(`
    UPDATE words SET
      box = 1,
      correct_count = 0,
      incorrect_count = 0,
      last_reviewed_at = NULL
  `);
  return getAllWords();
}

export function resetToDefaults(): WordItem[] {
  const db = getDatabase();
  db.exec('DELETE FROM words');
  const insert = db.prepare(`
    INSERT INTO words (
      id, word, translation, language, lesson, part_of_speech,
      example_sentence, example_translation, phonetic, notes,
      box, correct_count, incorrect_count, last_reviewed_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const w of INITIAL_WORDS) {
    insert.run(
      w.id,
      w.word,
      w.translation,
      w.language,
      w.lesson,
      w.partOfSpeech,
      w.exampleSentence ?? null,
      w.exampleTranslation ?? null,
      w.phonetic ?? null,
      w.notes ?? null,
      w.box,
      w.correctCount,
      w.incorrectCount,
      w.lastReviewedAt ?? null,
      w.createdAt
    );
  }

  return getAllWords();
}

export function getSettings(): AppSettings {
  const db = getDatabase();
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('settings') as { value: string } | undefined;
  if (!row) {
    return DEFAULT_SETTINGS;
  }
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(row.value) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function updateSettings(newSettings: Partial<AppSettings>): AppSettings {
  const db = getDatabase();
  const current = getSettings();
  const merged: AppSettings = { ...current, ...newSettings };
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  stmt.run('settings', JSON.stringify(merged));
  return merged;
}
