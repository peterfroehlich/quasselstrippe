import { get, set } from 'idb-keyval';
import { validateWord } from './validation';
import { nextReviewState } from './learning';
import type {
  WordItem,
  AppSettings,
  Language,
  UserProfile,
  LearnerStats,
} from '../types/vocabulary';
import {
  ApiError,
  apiGetProfiles,
  apiCreateProfile,
  apiUpdateProfile,
  apiDeleteProfile,
  apiGetLearnerStats,
  apiGetWords,
  apiBatchCreateWords,
  apiUpdateWord,
  apiDeleteWord,
  apiDeleteLesson,
  apiRecordReview,
  apiResetProgress,
  apiResetToDefaults,
  apiGetSettings,
  apiSaveSettings,
} from './api';


const SETTINGS_STORAGE_KEY = 'quasselstrippe_settings_v1';
const ACTIVE_PROFILE_KEY = 'quasselstrippe_active_profile_id_v1';

export const DEFAULT_PROFILE: UserProfile = {
  id: 'default',
  name: 'Schüler 1',
  avatar: '🦊',
  color: '#6366f1',
  createdAt: 0,
  isDefault: true,
};

export const DEFAULT_SETTINGS: AppSettings = {
  geminiApiKey: '',
  activeLanguage: 'en',
  speechRate: 1.0,
  autoPlayAudio: true,
};

export const INITIAL_WORDS: WordItem[] = [
  // English - Unit 1: School & Daily Life
  {
    id: 'en-1',
    word: 'timetable',
    translation: 'der Stundenplan',
    language: 'en',
    lesson: 'Unit 1: Back to School',
    partOfSpeech: 'noun',
    exampleSentence: 'Look at the timetable to see which classroom we have next.',
    exampleTranslation: 'Schau auf den Stundenplan, um zu sehen, welches Klassenzimmer wir als Nächstes haben.',
    phonetic: '/ˈtaɪmˌteɪ.bəl/',
    notes: 'Plural: timetables',
    box: 1,
    correctCount: 0,
    incorrectCount: 0,
    createdAt: Date.now() - 86400000 * 4,
  },
  {
    id: 'en-2',
    word: 'backpack',
    translation: 'der Rucksack / die Schultasche',
    language: 'en',
    lesson: 'Unit 1: Back to School',
    partOfSpeech: 'noun',
    exampleSentence: "Don't forget to pack your English books into your backpack.",
    exampleTranslation: 'Vergiss nicht, deine Englischbücher in deinen Rucksack zu packen.',
    phonetic: '/ˈbæk.pæk/',
    notes: 'Synonym: schoolbag',
    box: 2,
    correctCount: 2,
    incorrectCount: 0,
    createdAt: Date.now() - 86400000 * 4,
  },
  {
    id: 'en-3',
    word: 'curious',
    translation: 'neugierig / wissbegierig',
    language: 'en',
    lesson: 'Unit 1: Back to School',
    partOfSpeech: 'adjective',
    exampleSentence: 'Children are naturally curious about the world around them.',
    exampleTranslation: 'Kinder sind von Natur aus neugierig auf die Welt um sie herum.',
    phonetic: '/ˈkjʊə.ri.əs/',
    notes: 'Gegenteil: indifferent / uninterested',
    box: 1,
    correctCount: 0,
    incorrectCount: 1,
    createdAt: Date.now() - 86400000 * 3,
  },
  {
    id: 'en-4',
    word: 'explain',
    translation: 'erklären / erläutern',
    language: 'en',
    lesson: 'Unit 1: Back to School',
    partOfSpeech: 'verb',
    exampleSentence: 'Could you please explain that grammar rule once more?',
    exampleTranslation: 'Könntest du diese Grammatikregel bitte noch einmal erklären?',
    phonetic: '/ɪkˈspleɪn/',
    notes: 'Substantiv: explanation',
    box: 3,
    correctCount: 3,
    incorrectCount: 0,
    createdAt: Date.now() - 86400000 * 4,
  },
  {
    id: 'en-5',
    word: 'look after',
    translation: 'sich kümmern um / aufpassen auf',
    language: 'en',
    lesson: 'Unit 1: Back to School',
    partOfSpeech: 'phrase',
    exampleSentence: 'Ben has to look after his little brother after school.',
    exampleTranslation: 'Ben muss nach der Schule auf seinen kleinen Bruder aufpassen.',
    phonetic: '/lʊk ˈɑːf.tər/',
    notes: 'Phrasal verb: look after someone/something',
    box: 1,
    correctCount: 1,
    incorrectCount: 1,
    createdAt: Date.now() - 86400000 * 2,
  },
  {
    id: 'en-6',
    word: 'borrow',
    translation: 'sich (aus)leihen / borgen',
    language: 'en',
    lesson: 'Unit 1: Back to School',
    partOfSpeech: 'verb',
    exampleSentence: 'Can I borrow your pencil for the math test?',
    exampleTranslation: 'Kann ich mir deinen Bleistift für den Mathetest leihen?',
    phonetic: '/ˈbɒr.əʊ/',
    notes: 'Achtung: borrow = leihen VON jemandem; lend = jemandem etwas leihen',
    box: 2,
    correctCount: 2,
    incorrectCount: 1,
    createdAt: Date.now() - 86400000 * 3,
  },
  {
    id: 'en-7',
    word: 'exciting',
    translation: 'aufregend / spannend',
    language: 'en',
    lesson: 'Unit 1: Back to School',
    partOfSpeech: 'adjective',
    exampleSentence: 'Our science experiment was very exciting today!',
    exampleTranslation: 'Unser Naturwissenschafts-Experiment war heute sehr spannend!',
    phonetic: '/ɪkˈsaɪ.tɪŋ/',
    notes: 'Unterschied: exciting (die Sache ist spannend) vs excited (ich bin aufgeregt)',
    box: 4,
    correctCount: 4,
    incorrectCount: 0,
    createdAt: Date.now() - 86400000 * 5,
  },

  // English - Unit 2: Free Time & Hobbies
  {
    id: 'en-8',
    word: 'achieve',
    translation: 'erreichen / erzielen / schaffen',
    language: 'en',
    lesson: 'Unit 2: Hobbies & Goals',
    partOfSpeech: 'verb',
    exampleSentence: 'With regular practice, you can achieve your goals.',
    exampleTranslation: 'Mit regelmäßiger Übung kannst du deine Ziele erreichen.',
    phonetic: '/əˈtʃiːv/',
    notes: 'Substantiv: achievement (Leistung / Erfolg)',
    box: 1,
    correctCount: 0,
    incorrectCount: 0,
    createdAt: Date.now() - 86400000 * 2,
  },
  {
    id: 'en-9',
    word: 'exhausted',
    translation: 'erschöpft / völlig fertig',
    language: 'en',
    lesson: 'Unit 2: Hobbies & Goals',
    partOfSpeech: 'adjective',
    exampleSentence: 'After the football tournament, all players were exhausted.',
    exampleTranslation: 'Nach dem Fußballturnier waren alle Spieler erschöpft.',
    phonetic: '/ɪɡˈzɔː.stɪd/',
    notes: 'Stärker als "tired"',
    box: 2,
    correctCount: 2,
    incorrectCount: 0,
    createdAt: Date.now() - 86400000 * 2,
  },
  {
    id: 'en-10',
    word: 'hang out with',
    translation: 'Zeit verbringen mit / herumhängen mit',
    language: 'en',
    lesson: 'Unit 2: Hobbies & Goals',
    partOfSpeech: 'phrase',
    exampleSentence: 'On Friday afternoons, I like to hang out with my friends in the park.',
    exampleTranslation: 'Freitagnachmittags verbringe ich gerne Zeit mit meinen Freunden im Park.',
    phonetic: '/hæŋ aʊt wɪð/',
    notes: 'Umgangssprachlich, sehr häufig im Schulbuch',
    box: 3,
    correctCount: 3,
    incorrectCount: 1,
    createdAt: Date.now() - 86400000 * 3,
  },

  // Latin - Lektion 1: Amici et Schola
  {
    id: 'la-1',
    word: 'amicus',
    translation: 'der Freund',
    language: 'la',
    lesson: 'Lektion 1: Amici et Schola',
    partOfSpeech: 'noun',
    exampleSentence: 'Amicus meus in horto ambulat.',
    exampleTranslation: 'Mein Freund spaziert im Garten.',
    phonetic: 'a-MI-kus',
    notes: 'amīcus, -ī m. (o-Deklination); feminin: amīca',
    box: 2,
    correctCount: 2,
    incorrectCount: 0,
    createdAt: Date.now() - 86400000 * 5,
  },
  {
    id: 'la-2',
    word: 'audire',
    translation: 'hören / zuhören',
    language: 'la',
    lesson: 'Lektion 1: Amici et Schola',
    partOfSpeech: 'verb',
    exampleSentence: 'Discipuli magistrum attente audiunt.',
    exampleTranslation: 'Die Schüler hören dem Lehrer aufmerksam zu.',
    phonetic: 'au-DI-re',
    notes: 'audiō, audīvī, audītum (i-Konjugation)',
    box: 1,
    correctCount: 1,
    incorrectCount: 1,
    createdAt: Date.now() - 86400000 * 4,
  },
  {
    id: 'la-3',
    word: 'pulcher',
    translation: 'schön / hübsch',
    language: 'la',
    lesson: 'Lektion 1: Amici et Schola',
    partOfSpeech: 'adjective',
    exampleSentence: 'Roma urbs pulchra et clara est.',
    exampleTranslation: 'Rom ist eine schöne und berühmte Stadt.',
    phonetic: 'PUL-cher',
    notes: 'pulcher, pulchra, pulchrum (a/o-Deklination)',
    box: 3,
    correctCount: 3,
    incorrectCount: 0,
    createdAt: Date.now() - 86400000 * 4,
  },
  {
    id: 'la-4',
    word: 'clamare',
    translation: 'rufen / schreien',
    language: 'la',
    lesson: 'Lektion 1: Amici et Schola',
    partOfSpeech: 'verb',
    exampleSentence: 'Pueri in foro magna voce clamant.',
    exampleTranslation: 'Die Jungen rufen auf dem Marktplatz mit lauter Stimme.',
    phonetic: 'kla-MA-re',
    notes: 'clāmō, clāmāvī, clāmātum (a-Konjugation)',
    box: 2,
    correctCount: 2,
    incorrectCount: 1,
    createdAt: Date.now() - 86400000 * 3,
  },
  {
    id: 'la-5',
    word: 'discipulus',
    translation: 'der Schüler',
    language: 'la',
    lesson: 'Lektion 1: Amici et Schola',
    partOfSpeech: 'noun',
    exampleSentence: 'Discipulus novus libros suos aperit.',
    exampleTranslation: 'Der neue Schüler öffnet seine Bücher.',
    phonetic: 'dis-KI-pu-lus',
    notes: 'discipulus, -ī m.; feminin: discipula',
    box: 4,
    correctCount: 4,
    incorrectCount: 0,
    createdAt: Date.now() - 86400000 * 5,
  }
];

// One atomic IndexedDB record contains pending operations and snapshots scoped by profile.
// Legacy generic caches are intentionally never used: they have no ownership information.
const JOURNAL_KEY = 'quasselstrippe_sync_v2';
type Operation = {
  id: string;
  kind: 'createProfile' | 'updateProfile' | 'deleteProfile' | 'addWords' | 'updateWord' |
    'deleteWord' | 'deleteLesson' | 'review' | 'resetProgress' | 'resetDefaults' | 'settings';
  profileId: string;
  words?: WordItem[];
  word?: WordItem;
  profile?: UserProfile;
  targetId?: string;
  lesson?: string;
  language?: Language;
  scope?: string;
  wasCorrect?: boolean;
  reviewedAt?: number;
  promote?: boolean;
  settings?: Partial<AppSettings>;
};
interface Journal {
  pending: Operation[];
  words: Record<string, WordItem[]>;
  profiles?: UserProfile[];
  stats: Record<string, LearnerStats>;
}
let tail: Promise<unknown> = Promise.resolve();
function serial<T>(work: () => Promise<T>): Promise<T> {
  const locked = () => typeof navigator !== 'undefined' && navigator.locks ? navigator.locks.request('quasselstrippe-sync', work) : work();
  const result = tail.then(locked, locked);
  tail = result.catch(() => {});
  return result;
}
async function readJournal(): Promise<Journal> {
  return await get<Journal>(JOURNAL_KEY) || { pending: [], words: {}, stats: {} };
}
async function persist(state: Journal): Promise<void> {
  await set(JOURNAL_KEY, state);
  window.dispatchEvent(new CustomEvent('quasselstrippe:sync', { detail: { pending: state.pending.length } }));
}
const retryable = (error: unknown) => error instanceof ApiError && error.retryable;
const visible = (word: WordItem, id: string) => !word.profileId || word.profileId === id;

async function execute(op: Operation): Promise<void> {
  switch (op.kind) {
    case 'createProfile': await apiCreateProfile(op.profile!, op.id); break;
    case 'updateProfile': await apiUpdateProfile(op.profile!, op.id); break;
    case 'deleteProfile': await apiDeleteProfile(op.targetId!, op.id); break;
    case 'addWords': await apiBatchCreateWords(op.words!, op.id); break;
    case 'updateWord': await apiUpdateWord(op.word!, op.profileId, op.id); break;
    case 'deleteWord':
      try { await apiDeleteWord(op.targetId!, op.profileId, op.id); }
      catch (error) { if (!(error instanceof ApiError && error.status === 404)) throw error; }
      break;
    case 'deleteLesson': await apiDeleteLesson(op.lesson!, op.language, op.scope || op.profileId, op.id); break;
    case 'review':
      await apiRecordReview(op.targetId!, op.wasCorrect!, op.profileId, op.id, op.reviewedAt!, op.promote!); break;
    case 'resetProgress': await apiResetProgress(op.profileId, op.id); break;
    case 'resetDefaults': await apiResetToDefaults(op.id); break;
    case 'settings': await apiSaveSettings(op.settings!); break;
  }
}
async function flush(state: Journal): Promise<boolean> {
  while (state.pending.length) {
    const op = state.pending[0];
    try { await execute(op); }
    catch (error) {
      if (retryable(error)) return false;
      // Rejected writes are reported, never converted into apparent offline success.
      // Authentication expiry leaves the queue intact for the next login.
      if (!(error instanceof ApiError && error.status === 401)) {
        state.pending.shift();
        state.words = {};
        state.profiles = undefined;
        state.stats = {};
        await persist(state);
      }
      throw error;
    }
    state.pending.shift();
    await persist(state);
  }
  return true;
}
function apply(state: Journal, op: Operation) {
  let words = state.words[op.profileId] || [];
  const clean = (w: WordItem): WordItem => ({ ...w, box: 1, correctCount: 0, incorrectCount: 0, lastReviewedAt: undefined });
  switch (op.kind) {
    case 'settings': return;
    case 'createProfile':
      state.profiles = [...(state.profiles || []), op.profile!];
      state.words[op.profile!.id] = words.filter(w => !w.profileId).map(clean);
      break;
    case 'updateProfile': state.profiles = (state.profiles || []).map(p => p.id === op.profile!.id ? op.profile! : p); break;
    case 'deleteProfile':
      state.profiles = (state.profiles || []).filter(p => p.id !== op.targetId);
      delete state.words[op.targetId!]; break;
    case 'addWords': {
      const map = new Map(words.map(w => [w.id, w]));
      for (const w of op.words!) {
        const existing = map.get(w.id);
        map.set(w.id, existing ? { ...w, box: existing.box, correctCount: existing.correctCount,
          incorrectCount: existing.incorrectCount, lastReviewedAt: existing.lastReviewedAt } : clean(w));
      }
      words = [...map.values()].filter(w => visible(w, op.profileId)); break;
    }
    case 'updateWord': words = words.map(w => w.id === op.word!.id ? { ...op.word!, box: w.box,
      correctCount: w.correctCount, incorrectCount: w.incorrectCount, lastReviewedAt: w.lastReviewedAt } : w).filter(w => visible(w, op.profileId)); break;
    case 'deleteWord': words = words.filter(w => w.id !== op.targetId); break;
    case 'deleteLesson': words = words.filter(w => !(w.lesson === op.lesson && (!op.language || w.language === op.language) &&
      (op.scope === 'shared' ? !w.profileId : w.profileId === op.profileId))); break;
    case 'review': words = words.map(w => w.id === op.targetId ? nextReviewState(w, op.wasCorrect!, op.reviewedAt, op.promote) : w); break;
    case 'resetProgress': words = words.map(clean); break;
    case 'resetDefaults':
      state.words = Object.fromEntries(Object.keys(state.words).map(id => [id, INITIAL_WORDS.map(clean)]));
      words = INITIAL_WORDS.map(clean); break;
  }
  state.words[op.profileId] = words;
  for (const [profileId, snapshot] of Object.entries(state.words)) {
    if (profileId === op.profileId) continue;
    if (op.kind === 'addWords' || op.kind === 'updateWord') {
      const updates = op.words || (op.word ? [op.word] : []);
      const map = new Map(snapshot.map(w => [w.id, w]));
      for (const w of updates) {
        if (!visible(w, profileId)) { map.delete(w.id); continue; }
        const progress = map.get(w.id);
        map.set(w.id, progress ? { ...w, box: progress.box, correctCount: progress.correctCount,
          incorrectCount: progress.incorrectCount, lastReviewedAt: progress.lastReviewedAt } : clean(w));
      }
      state.words[profileId] = [...map.values()];
    } else if (op.kind === 'deleteWord') state.words[profileId] = snapshot.filter(w => w.id !== op.targetId);
    else if (op.kind === 'deleteLesson') state.words[profileId] = snapshot.filter(w => !(w.lesson === op.lesson &&
      (!op.language || w.language === op.language) && (op.scope === 'shared' ? !w.profileId : w.profileId === op.profileId)));
    else if (op.kind === 'deleteProfile') state.words[profileId] = snapshot.filter(w => w.profileId !== op.targetId);
  }
  state.stats = {};
}
async function loadWordsUnlocked(state: Journal, profileId: string): Promise<WordItem[]> {
  if (await flush(state)) {
    try {
      const words = await apiGetWords(undefined, profileId);
      state.words[profileId] = words;
      await persist(state);
      return words;
    } catch (error) { if (!retryable(error)) throw error; }
  }
  return (state.words[profileId] || []).filter(w => visible(w, profileId));
}
async function mutate(op: Operation): Promise<WordItem[]> {
  return serial(async () => {
    const state = await readJournal();
    await loadWordsUnlocked(state, op.profileId);
    // Persist the operation together with the optimistic snapshot before sending it.
    apply(state, op);
    state.pending.push(op);
    await persist(state);
    await flush(state);
    if (op.kind === 'deleteProfile' && op.targetId === op.profileId) return [];
    return loadWordsUnlocked(state, op.profileId);
  });
}
export async function syncOfflineChanges(): Promise<void> {
  await serial(async () => { const state = await readJournal(); await flush(state); await persist(state); });
}
export function getActiveProfileId(): string {
  return localStorage.getItem(ACTIVE_PROFILE_KEY) || 'default';
}
export function setActiveProfileId(id: string): void { localStorage.setItem(ACTIVE_PROFILE_KEY, id); }
export async function loadProfiles(): Promise<UserProfile[]> {
  return serial(async () => {
    const state = await readJournal();
    if (await flush(state)) {
      try { state.profiles = await apiGetProfiles(); await persist(state); }
      catch (error) { if (!retryable(error)) throw error; }
    }
    return state.profiles || [];
  });
}
export async function createProfile(data: { name: string; avatar?: string; color?: string }): Promise<UserProfile[]> {
  const profiles = await loadProfiles();
  const profile: UserProfile = { id: crypto.randomUUID(), name: data.name.trim(), avatar: data.avatar || '🦊', color: data.color || '#6366f1', createdAt: Date.now() };
  if (!profile.name) throw new Error('Bitte gib einen Namen ein.');
  await mutate({ id: crypto.randomUUID(), kind: 'createProfile', profileId: profiles[0]?.id || profile.id, profile });
  return loadProfiles();
}
export async function updateProfile(profile: UserProfile): Promise<UserProfile[]> {
  if (!profile.name.trim()) throw new Error('Bitte gib einen Namen ein.');
  await mutate({ id: crypto.randomUUID(), kind: 'updateProfile', profileId: profile.id, profile });
  return loadProfiles();
}
export async function deleteProfile(id: string): Promise<UserProfile[]> {
  const profiles = await loadProfiles();
  if (profiles.length <= 1) throw new Error('Das letzte Profil kann nicht gelöscht werden.');
  await mutate({ id: crypto.randomUUID(), kind: 'deleteProfile', profileId: getActiveProfileId(), targetId: id });
  const updated = await loadProfiles();
  if (getActiveProfileId() === id && updated[0]) setActiveProfileId(updated[0].id);
  return updated;
}
export async function loadWords(language?: Language, profileId = getActiveProfileId()): Promise<WordItem[]> {
  return serial(async () => {
    const words = await loadWordsUnlocked(await readJournal(), profileId);
    return language ? words.filter(w => w.language === language) : words;
  });
}
export async function addWord(word: WordItem, profileId = getActiveProfileId()): Promise<WordItem[]> { return addWords([word], profileId); }
export async function addWords(words: WordItem[], profileId = getActiveProfileId()): Promise<WordItem[]> {
  words = words.map(validateWord);
  if (new Set(words.map(w => w.id)).size !== words.length) throw new Error('Doppelte Vokabel-IDs.');
  return mutate({ id: crypto.randomUUID(), kind: 'addWords', profileId, words });
}
export async function updateWord(word: WordItem, profileId = getActiveProfileId()): Promise<WordItem[]> {
  return mutate({ id: crypto.randomUUID(), kind: 'updateWord', profileId, word: validateWord(word) });
}
export async function deleteWord(id: string, profileId = getActiveProfileId()): Promise<WordItem[]> {
  return mutate({ id: crypto.randomUUID(), kind: 'deleteWord', profileId, targetId: id });
}
export async function deleteLesson(lesson: string, language?: Language, profileId = getActiveProfileId(), scope = profileId): Promise<WordItem[]> {
  return mutate({ id: crypto.randomUUID(), kind: 'deleteLesson', profileId, lesson, language, scope });
}
export async function recordReviewProgress(wordId: string, wasCorrect: boolean, profileId = getActiveProfileId(), promote = true): Promise<WordItem[]> {
  return mutate({ id: crypto.randomUUID(), kind: 'review', profileId, targetId: wordId, wasCorrect, promote, reviewedAt: Date.now() });
}
export async function resetReviewProgress(profileId = getActiveProfileId()): Promise<WordItem[]> {
  return mutate({ id: crypto.randomUUID(), kind: 'resetProgress', profileId });
}
export async function resetToDefaults(profileId = getActiveProfileId()): Promise<WordItem[]> {
  return mutate({ id: crypto.randomUUID(), kind: 'resetDefaults', profileId });
}
export function loadSettings(): AppSettings {
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || '{}') }; }
  catch { return { ...DEFAULT_SETTINGS }; }
}
export async function loadSettingsAsync(): Promise<AppSettings> {
  return serial(async () => {
    const local = loadSettings();
    const state = await readJournal();
    if (!(await flush(state))) return local;
    try {
      const remote = await apiGetSettings();
      const settings = { ...remote, geminiApiKey: local.geminiApiKey };
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      return settings;
    } catch (error) { if (!retryable(error)) throw error; return local; }
  });
}
export async function saveSettings(settings: AppSettings): Promise<void> {
  return serial(async () => {
    const state = await readJournal();
    await flush(state);
    const { geminiApiKey: _key, aiAvailable: _available, ...preferences } = settings;
    state.pending.push({ id: crypto.randomUUID(), kind: 'settings', profileId: getActiveProfileId(), settings: preferences });
    await persist(state);
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    await flush(state);
  });
}
export function exportWordsToJson(words: WordItem[]): string {
  return JSON.stringify({ app: 'quasselstrippe', version: 1, exportedAt: new Date().toISOString(), wordCount: words.length, words }, null, 2);
}
export async function getLearnerStats(profileId = getActiveProfileId(), language?: Language): Promise<LearnerStats> {
  return serial(async () => {
    const state = await readJournal();
    const words = (await loadWordsUnlocked(state, profileId)).filter(w => !language || w.language === language);
    const key = `${profileId}:${language || 'all'}`;
    if (!state.pending.length) {
      try {
        const stats = await apiGetLearnerStats(profileId, language);
        state.stats[key] = stats; await persist(state); return stats;
      } catch (error) { if (!retryable(error)) throw error; }
      if (state.stats[key]) return state.stats[key];
    }
    const boxDistribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let correct = 0, incorrect = 0;
    for (const w of words) { boxDistribution[w.box as 1 | 2 | 3 | 4 | 5]++; correct += w.correctCount; incorrect += w.incorrectCount; }
    return { profileId, language, totalWords: words.length, masteredWords: boxDistribution[4] + boxDistribution[5],
      learningWords: boxDistribution[2] + boxDistribution[3], newWords: boxDistribution[1], boxDistribution,
      totalReviews: correct + incorrect, correctReviews: correct, incorrectReviews: incorrect,
      accuracyRate: correct + incorrect ? Math.round(correct / (correct + incorrect) * 100) : 0,
      streakDays: 0, history: [], historyAvailable: false,
      difficultWords: words.filter(w => w.incorrectCount > 0).sort((a, b) => b.incorrectCount - a.incorrectCount).slice(0, 6) };
  });
}
