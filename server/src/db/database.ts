import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import type {
  WordItem,
  AppSettings,
  Language,
  PartOfSpeech,
  UserProfile,
  LearnerStats,
  ReviewHistoryPoint,
  DifficultWordItem,
} from '../types.js';

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
  profile_id: string | null;
}

interface ProfileRow {
  id: string;
  name: string;
  avatar: string;
  color: string;
  created_at: number;
  is_default: number;
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
      created_at INTEGER NOT NULL,
      profile_id TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_words_language ON words(language);
    CREATE INDEX IF NOT EXISTS idx_words_lesson ON words(lesson);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatar TEXT NOT NULL DEFAULT '🦊',
      color TEXT NOT NULL DEFAULT '#6366f1',
      created_at INTEGER NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS learner_progress (
      profile_id TEXT NOT NULL,
      word_id TEXT NOT NULL,
      box INTEGER NOT NULL DEFAULT 1,
      correct_count INTEGER NOT NULL DEFAULT 0,
      incorrect_count INTEGER NOT NULL DEFAULT 0,
      last_reviewed_at INTEGER,
      PRIMARY KEY (profile_id, word_id),
      FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE,
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_progress_profile ON learner_progress(profile_id);

    CREATE TABLE IF NOT EXISTS review_logs (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL,
      word_id TEXT NOT NULL,
      language TEXT NOT NULL,
      was_correct INTEGER NOT NULL,
      box_before INTEGER NOT NULL,
      box_after INTEGER NOT NULL,
      reviewed_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_review_logs_profile ON review_logs(profile_id, reviewed_at);
    CREATE INDEX IF NOT EXISTS idx_review_logs_lang ON review_logs(language, reviewed_at);
  `);

  // Ensure profile_id column exists if table was previously created without it
  const tableInfo = db.prepare('PRAGMA table_info(words);').all() as unknown as { name: string }[];
  const hasProfileId = tableInfo.some((col) => col.name === 'profile_id');
  if (!hasProfileId) {
    db.exec('ALTER TABLE words ADD COLUMN profile_id TEXT;');
  }

  db.exec('CREATE INDEX IF NOT EXISTS idx_words_profile ON words(profile_id);');

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
    profileId: row.profile_id ?? undefined,
  };
}

function initSeedsIfEmpty(db: DatabaseSync): void {
  // Check if profiles exist
  const profileCount = db.prepare('SELECT COUNT(*) as count FROM profiles').get() as { count: number };
  if (profileCount.count === 0) {
    console.log('[DB] Seeding default learner profile...');
    db.prepare(`
      INSERT INTO profiles (id, name, avatar, color, created_at, is_default)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run('default', 'Schüler 1', '🦊', '#6366f1', Date.now());
  }

  // Check if words exist
  const countRow = db.prepare('SELECT COUNT(*) as count FROM words').get() as { count: number };
  if (countRow.count === 0) {
    console.log('[DB] Seeding initial vocabulary words...');
    const insert = db.prepare(`
      INSERT INTO words (
        id, word, translation, language, lesson, part_of_speech,
        example_sentence, example_translation, phonetic, notes,
        box, correct_count, incorrect_count, last_reviewed_at, created_at, profile_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
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

    // Seed progress for default profile
    db.exec(`
      INSERT OR IGNORE INTO learner_progress (profile_id, word_id, box, correct_count, incorrect_count, last_reviewed_at)
      SELECT 'default', id, box, correct_count, incorrect_count, last_reviewed_at FROM words;
    `);
  }

  // Check if settings exist
  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM settings').get() as { count: number };
  if (settingsCount.count === 0) {
    console.log('[DB] Seeding default settings...');
    const setSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    setSetting.run('settings', JSON.stringify(DEFAULT_SETTINGS));
  }
}

// --- Profiles API ---

export function getAllProfiles(): UserProfile[] {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM profiles ORDER BY is_default DESC, created_at ASC').all() as unknown as ProfileRow[];
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    avatar: r.avatar,
    color: r.color,
    createdAt: r.created_at,
    isDefault: Boolean(r.is_default),
  }));
}

export function getProfileById(id: string): UserProfile | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM profiles WHERE id = ?').get(id) as unknown as ProfileRow | undefined;
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    avatar: row.avatar,
    color: row.color,
    createdAt: row.created_at,
    isDefault: Boolean(row.is_default),
  };
}

export function insertProfile(profile: UserProfile): UserProfile {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO profiles (id, name, avatar, color, created_at, is_default)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    profile.id,
    profile.name.trim(),
    profile.avatar || '🦊',
    profile.color || '#6366f1',
    profile.createdAt || Date.now(),
    profile.isDefault ? 1 : 0
  );
  return getProfileById(profile.id)!;
}

export function updateProfile(profile: UserProfile): UserProfile | null {
  const db = getDatabase();
  const stmt = db.prepare(`
    UPDATE profiles SET name = ?, avatar = ?, color = ? WHERE id = ?
  `);
  const res = stmt.run(profile.name.trim(), profile.avatar || '🦊', profile.color || '#6366f1', profile.id);
  if (res.changes === 0) return null;
  return getProfileById(profile.id);
}

export function deleteProfile(id: string): { success: boolean; error?: string } {
  const db = getDatabase();
  const countRow = db.prepare('SELECT COUNT(*) as count FROM profiles').get() as { count: number };
  if (countRow.count <= 1) {
    return { success: false, error: 'Das letzte verbleibende Profil kann nicht gelöscht werden.' };
  }
  db.prepare('DELETE FROM learner_progress WHERE profile_id = ?').run(id);
  db.prepare('DELETE FROM review_logs WHERE profile_id = ?').run(id);
  db.prepare('DELETE FROM words WHERE profile_id = ?').run(id);
  const res = db.prepare('DELETE FROM profiles WHERE id = ?').run(id);
  return { success: res.changes > 0 };
}

// --- Words API (Multi-Profile & Progress Aware) ---

export function getAllWords(language?: string, profileId?: string): WordItem[] {
  const db = getDatabase();
  let query = `
    SELECT 
      w.id, w.word, w.translation, w.language, w.lesson, w.part_of_speech,
      w.example_sentence, w.example_translation, w.phonetic, w.notes,
      ${profileId ? 'COALESCE(lp.box, w.box, 1)' : 'w.box'} AS box,
      ${profileId ? 'COALESCE(lp.correct_count, w.correct_count, 0)' : 'w.correct_count'} AS correct_count,
      ${profileId ? 'COALESCE(lp.incorrect_count, w.incorrect_count, 0)' : 'w.incorrect_count'} AS incorrect_count,
      ${profileId ? 'COALESCE(lp.last_reviewed_at, w.last_reviewed_at)' : 'w.last_reviewed_at'} AS last_reviewed_at,
      w.created_at,
      w.profile_id
    FROM words w
    ${profileId ? 'LEFT JOIN learner_progress lp ON w.id = lp.word_id AND lp.profile_id = ?' : ''}
  `;

  const conditions: string[] = [];
  const params: (string | number | null)[] = [];

  if (profileId) {
    params.push(profileId);
    // Words visible: shared words (profile_id is NULL) OR words assigned specifically to this profile
    conditions.push('(w.profile_id IS NULL OR w.profile_id = ?)');
    params.push(profileId);
  }

  if (language) {
    conditions.push('w.language = ?');
    params.push(language);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY w.created_at DESC';

  const rows = db.prepare(query).all(...params) as unknown as WordRow[];
  return rows.map(rowToWord);
}

export function getWordById(id: string, profileId?: string): WordItem | null {
  const db = getDatabase();
  let query = `
    SELECT 
      w.id, w.word, w.translation, w.language, w.lesson, w.part_of_speech,
      w.example_sentence, w.example_translation, w.phonetic, w.notes,
      ${profileId ? 'COALESCE(lp.box, w.box, 1)' : 'w.box'} AS box,
      ${profileId ? 'COALESCE(lp.correct_count, w.correct_count, 0)' : 'w.correct_count'} AS correct_count,
      ${profileId ? 'COALESCE(lp.incorrect_count, w.incorrect_count, 0)' : 'w.incorrect_count'} AS incorrect_count,
      ${profileId ? 'COALESCE(lp.last_reviewed_at, w.last_reviewed_at)' : 'w.last_reviewed_at'} AS last_reviewed_at,
      w.created_at,
      w.profile_id
    FROM words w
    ${profileId ? 'LEFT JOIN learner_progress lp ON w.id = lp.word_id AND lp.profile_id = ?' : ''}
    WHERE w.id = ?
  `;

  const params: (string | number | null)[] = profileId ? [profileId, id] : [id];
  const row = db.prepare(query).get(...params) as unknown as WordRow | undefined;
  if (!row) return null;
  return rowToWord(row);
}

export function insertWord(word: WordItem): WordItem {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO words (
      id, word, translation, language, lesson, part_of_speech,
      example_sentence, example_translation, phonetic, notes,
      box, correct_count, incorrect_count, last_reviewed_at, created_at, profile_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    word.createdAt ?? Date.now(),
    word.profileId ?? null
  );

  return getWordById(word.id, word.profileId ?? undefined)!;
}

export function insertWords(words: WordItem[]): WordItem[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO words (
      id, word, translation, language, lesson, part_of_speech,
      example_sentence, example_translation, phonetic, notes,
      box, correct_count, incorrect_count, last_reviewed_at, created_at, profile_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      word.createdAt ?? Date.now(),
      word.profileId ?? null
    );
    inserted.push(getWordById(word.id, word.profileId ?? undefined)!);
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
      last_reviewed_at = ?,
      profile_id = ?
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
    word.profileId ?? null,
    word.id
  );

  if (result.changes === 0) return null;
  return getWordById(word.id, word.profileId ?? undefined);
}

export function deleteWord(id: string): boolean {
  const db = getDatabase();
  db.prepare('DELETE FROM learner_progress WHERE word_id = ?').run(id);
  const stmt = db.prepare('DELETE FROM words WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

export function deleteWordsByLesson(lesson: string, language?: string, profileId?: string): number {
  const db = getDatabase();
  let query = 'DELETE FROM words WHERE lesson = ?';
  const params: (string | number | null)[] = [lesson];

  if (language) {
    query += ' AND language = ?';
    params.push(language);
  }

  if (profileId) {
    query += ' AND profile_id = ?';
    params.push(profileId);
  }

  const stmt = db.prepare(query);
  const result = stmt.run(...params);
  return Number(result.changes);
}

export function recordReview(id: string, wasCorrect: boolean, profileId?: string): WordItem | null {
  const db = getDatabase();
  const existing = getWordById(id, profileId);
  if (!existing) return null;

  let nextBox = existing.box;
  if (wasCorrect) {
    nextBox = Math.min(5, existing.box + 1);
  } else {
    nextBox = Math.max(1, existing.box - 1);
  }

  const nextCorrect = existing.correctCount + (wasCorrect ? 1 : 0);
  const nextIncorrect = existing.incorrectCount + (wasCorrect ? 0 : 1);
  const now = Date.now();

  const pId = profileId || 'default';
  const logStmt = db.prepare(`
    INSERT INTO review_logs (id, profile_id, word_id, language, was_correct, box_before, box_after, reviewed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  logStmt.run(
    `log-${now}-${Math.random().toString(36).substring(2, 8)}`,
    pId,
    id,
    existing.language,
    wasCorrect ? 1 : 0,
    existing.box,
    nextBox,
    now
  );

  if (profileId) {
    const stmt = db.prepare(`
      INSERT INTO learner_progress (profile_id, word_id, box, correct_count, incorrect_count, last_reviewed_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(profile_id, word_id) DO UPDATE SET
        box = excluded.box,
        correct_count = excluded.correct_count,
        incorrect_count = excluded.incorrect_count,
        last_reviewed_at = excluded.last_reviewed_at
    `);
    stmt.run(profileId, id, nextBox, nextCorrect, nextIncorrect, now);
    return getWordById(id, profileId);
  } else {
    const updated: WordItem = {
      ...existing,
      box: nextBox,
      correctCount: nextCorrect,
      incorrectCount: nextIncorrect,
      lastReviewedAt: now,
    };
    return updateWord(updated);
  }
}

export function resetReviewProgress(profileId?: string): WordItem[] {
  const db = getDatabase();
  if (profileId) {
    db.prepare('DELETE FROM learner_progress WHERE profile_id = ?').run(profileId);
    db.prepare('DELETE FROM review_logs WHERE profile_id = ?').run(profileId);
    return getAllWords(undefined, profileId);
  } else {
    db.exec(`
      UPDATE words SET
        box = 1,
        correct_count = 0,
        incorrect_count = 0,
        last_reviewed_at = NULL
    `);
    db.exec('DELETE FROM learner_progress');
    db.exec('DELETE FROM review_logs');
    return getAllWords();
  }
}

export function resetToDefaults(): WordItem[] {
  const db = getDatabase();
  db.exec('DELETE FROM words');
  db.exec('DELETE FROM learner_progress');
  db.exec('DELETE FROM review_logs');

  const insert = db.prepare(`
    INSERT INTO words (
      id, word, translation, language, lesson, part_of_speech,
      example_sentence, example_translation, phonetic, notes,
      box, correct_count, incorrect_count, last_reviewed_at, created_at, profile_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
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

  // Reseed progress for default profile
  db.exec(`
    INSERT OR IGNORE INTO learner_progress (profile_id, word_id, box, correct_count, incorrect_count, last_reviewed_at)
    SELECT 'default', id, box, correct_count, incorrect_count, last_reviewed_at FROM words;
  `);

  // Reseed review logs if empty
  const countLogs = (db.prepare('SELECT COUNT(*) as c FROM review_logs').get() as { c: number }).c;
  if (countLogs === 0) {
    const wordsWithReviews = db.prepare('SELECT * FROM words WHERE correct_count > 0 OR incorrect_count > 0').all() as unknown as WordRow[];
    const now = Date.now();
    const insertLog = db.prepare(`
      INSERT INTO review_logs (id, profile_id, word_id, language, was_correct, box_before, box_after, reviewed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const w of wordsWithReviews) {
      const totalR = w.correct_count + w.incorrect_count;
      for (let i = 0; i < totalR; i++) {
        const wasCorrect = i < w.correct_count ? 1 : 0;
        const daysAgo = Math.floor(Math.random() * 8) + 1;
        const timestamp = now - daysAgo * 86400000 + Math.floor(Math.random() * 3600000);
        insertLog.run(
          `seed-log-${w.id}-${i}`,
          'default',
          w.id,
          w.language,
          wasCorrect,
          Math.max(1, w.box - 1),
          w.box,
          timestamp
        );
      }
    }
  }

  return getAllWords();
}

export function getLearnerStats(profileId: string, language?: Language): LearnerStats {
  const db = getDatabase();
  const words = getAllWords(language, profileId);

  const boxDistribution: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  let totalCorrect = 0;
  let totalIncorrect = 0;

  for (const w of words) {
    const box = (w.box >= 1 && w.box <= 5 ? w.box : 1) as 1 | 2 | 3 | 4 | 5;
    boxDistribution[box] = (boxDistribution[box] || 0) + 1;
    totalCorrect += w.correctCount || 0;
    totalIncorrect += w.incorrectCount || 0;
  }

  const totalWords = words.length;
  const masteredWords = (boxDistribution[4] || 0) + (boxDistribution[5] || 0);
  const learningWords = (boxDistribution[2] || 0) + (boxDistribution[3] || 0);
  const newWords = boxDistribution[1] || 0;
  const totalReviews = totalCorrect + totalIncorrect;
  const correctReviews = totalCorrect;
  const incorrectReviews = totalIncorrect;
  const accuracyRate = totalReviews > 0 ? Math.round((totalCorrect / totalReviews) * 100) : 0;


  // History for past 14 days
  let logsQuery = 'SELECT * FROM review_logs WHERE profile_id = ?';
  const logsParams: (string | number)[] = [profileId];
  if (language) {
    logsQuery += ' AND language = ?';
    logsParams.push(language);
  }
  logsQuery += ' ORDER BY reviewed_at ASC';
  const logs = db.prepare(logsQuery).all(...logsParams) as unknown as Array<{
    id: string;
    profile_id: string;
    word_id: string;
    language: string;
    was_correct: number;
    box_before: number;
    box_after: number;
    reviewed_at: number;
  }>;

  const now = new Date();
  const history: ReviewHistoryPoint[] = [];

  // Generate 14 day buckets
  for (let i = 13; i >= 0; i--) {
    const dayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dayStart = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 0, 0, 0, 0).getTime();
    const dayEnd = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 23, 59, 59, 999).getTime();

    const dayLogs = logs.filter((l) => l.reviewed_at >= dayStart && l.reviewed_at <= dayEnd);
    const dayCorrect = dayLogs.filter((l) => l.was_correct === 1).length;
    const dayIncorrect = dayLogs.filter((l) => l.was_correct === 0).length;
    const dayTotal = dayCorrect + dayIncorrect;
    const dayAccuracy = dayTotal > 0 ? Math.round((dayCorrect / dayTotal) * 100) : 0;

    // Calculate cumulative mastered words up to this dayEnd
    const logsUpToDay = logs.filter((l) => l.reviewed_at <= dayEnd);
    const latestBoxByWord = new Map<string, number>();
    for (const l of logsUpToDay) {
      latestBoxByWord.set(l.word_id, l.box_after);
    }
    let masteredCount = 0;
    for (const box of latestBoxByWord.values()) {
      if (box >= 4) masteredCount++;
    }

    if (i === 0) {
      masteredCount = Math.max(masteredCount, masteredWords);
    } else if (masteredCount > masteredWords) {
      masteredCount = masteredWords;
    }

    const yyyy = dayDate.getFullYear();
    const mm = String(dayDate.getMonth() + 1).padStart(2, '0');
    const dd = String(dayDate.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const dayLabel = dayDate.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });

    history.push({
      date: dateStr,
      dayLabel,
      timestamp: dayStart,
      reviewsCount: dayTotal,
      correctCount: dayCorrect,
      incorrectCount: dayIncorrect,
      accuracy: dayAccuracy,
      masteredCumulative: masteredCount,
    });
  }

  // Calculate streak: consecutive days with reviews ending today or yesterday
  let streakDays = 0;
  const reviewDatesSet = new Set(
    logs.map((l) => {
      const d = new Date(l.reviewed_at);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })
  );

  const checkDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;

  if (!reviewDatesSet.has(todayStr)) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
    const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
    if (reviewDatesSet.has(dateStr)) {
      streakDays++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Difficult words: incorrectCount > 0, highest error rate
  const difficultWords = words
    .filter((w) => (w.incorrectCount || 0) > 0)
    .sort((a, b) => (b.incorrectCount || 0) - (a.incorrectCount || 0) || a.box - b.box)
    .slice(0, 6)
    .map((w) => ({
      id: w.id,
      word: w.word,
      translation: w.translation,
      language: w.language,
      box: w.box,
      incorrectCount: w.incorrectCount,
      correctCount: w.correctCount,
    }));

  return {
    profileId,
    language,
    totalWords,
    masteredWords,
    learningWords,
    newWords,
    boxDistribution,
    totalReviews,
    correctReviews,
    incorrectReviews,
    accuracyRate,
    streakDays,
    history,
    difficultWords,
  };
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

/**
 * Health check verification for Kubernetes readiness probes.
 * Verifies that SQLite is reachable and responding to queries.
 */
export function checkDatabaseHealth(): boolean {
  try {
    const db = getDatabase();
    const result = db.prepare('SELECT 1 AS ok').get() as { ok: number } | undefined;
    return result?.ok === 1;
  } catch (err) {
    console.error('[Database] Readiness health check failed:', err);
    return false;
  }
}

/**
 * Gracefully checkpoint WAL log and close database connection on SIGTERM/SIGINT.
 */
export function closeDatabase(): void {
  if (dbInstance) {
    try {
      console.log('[Database] Checkpointing WAL and closing database connection...');
      dbInstance.exec('PRAGMA wal_checkpoint(TRUNCATE);');
      dbInstance.close();
      console.log('[Database] Database closed cleanly.');
    } catch (err) {
      console.error('[Database] Error while closing database:', err);
    } finally {
      dbInstance = null;
    }
  }
}
