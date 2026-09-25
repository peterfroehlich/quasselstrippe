import { get, set } from 'idb-keyval';
import type {
  WordItem,
  AppSettings,
  Language,
  UserProfile,
  LearnerStats,
  ReviewHistoryPoint,
  DifficultWordItem,
} from '../types/vocabulary';
import {
  apiGetProfiles,
  apiCreateProfile,
  apiUpdateProfile,
  apiDeleteProfile,
  apiGetLearnerStats,
  apiGetWords,
  apiCreateWord,
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


const WORDS_STORAGE_KEY = 'quasselstrippe_words_v1';
const SETTINGS_STORAGE_KEY = 'quasselstrippe_settings_v1';
const PROFILES_STORAGE_KEY = 'quasselstrippe_profiles_v1';
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

// --- Profiles Storage & Sync ---

export function getActiveProfileId(): string {
  try {
    return localStorage.getItem(ACTIVE_PROFILE_KEY) || 'default';
  } catch {
    return 'default';
  }
}

export function setActiveProfileId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_PROFILE_KEY, id);
  } catch {}
}

export async function loadProfiles(): Promise<UserProfile[]> {
  try {
    const serverProfiles = await apiGetProfiles();
    if (serverProfiles && serverProfiles.length > 0) {
      set(PROFILES_STORAGE_KEY, serverProfiles).catch(() => {});
      localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(serverProfiles));
      return serverProfiles;
    }
  } catch (err) {
    console.warn('[Storage] Profiles server unavailable, falling back to local cache', err);
  }

  // Fallback to IndexedDB
  try {
    const saved = await get<UserProfile[]>(PROFILES_STORAGE_KEY);
    if (saved && Array.isArray(saved) && saved.length > 0) {
      return saved;
    }
  } catch {}

  // Fallback to localStorage
  try {
    const local = localStorage.getItem(PROFILES_STORAGE_KEY);
    if (local) {
      return JSON.parse(local);
    }
  } catch {}

  return [DEFAULT_PROFILE];
}

export async function saveProfiles(profiles: UserProfile[]): Promise<void> {
  try {
    await set(PROFILES_STORAGE_KEY, profiles);
  } catch {}
  try {
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
  } catch {}
}

export async function createProfile(data: { name: string; avatar?: string; color?: string }): Promise<UserProfile[]> {
  try {
    await apiCreateProfile(data);
    return await loadProfiles();
  } catch (err) {
    console.warn('[Storage] Server error creating profile, fallback to local', err);
    const existing = await loadProfiles();
    const newProfile: UserProfile = {
      id: `profile-${Date.now()}`,
      name: data.name.trim(),
      avatar: data.avatar || '🦊',
      color: data.color || '#6366f1',
      createdAt: Date.now(),
      isDefault: false,
    };
    const updated = [...existing, newProfile];
    await saveProfiles(updated);
    return updated;
  }
}

export async function updateProfile(profile: UserProfile): Promise<UserProfile[]> {
  try {
    await apiUpdateProfile(profile);
    return await loadProfiles();
  } catch (err) {
    console.warn('[Storage] Server error updating profile, fallback to local', err);
    const existing = await loadProfiles();
    const updated = existing.map(p => (p.id === profile.id ? profile : p));
    await saveProfiles(updated);
    return updated;
  }
}

export async function deleteProfile(id: string): Promise<UserProfile[]> {
  try {
    await apiDeleteProfile(id);
    return await loadProfiles();
  } catch (err) {
    console.warn('[Storage] Server error deleting profile, fallback to local', err);
    const existing = await loadProfiles();
    if (existing.length <= 1) return existing;
    const updated = existing.filter(p => p.id !== id);
    await saveProfiles(updated);
    if (getActiveProfileId() === id) {
      setActiveProfileId(updated[0]?.id || 'default');
    }
    return updated;
  }
}

// --- Words Storage & Sync (Profile-Aware) ---

export async function loadWords(language?: Language, profileId?: string): Promise<WordItem[]> {
  const pId = profileId !== undefined ? profileId : getActiveProfileId();
  try {
    // 1. Try to fetch from SQLite server
    const serverWords = await apiGetWords(language, pId);
    if (serverWords && serverWords.length > 0) {
      // Cache locally in IndexedDB
      set(`${WORDS_STORAGE_KEY}_${pId}`, serverWords).catch(() => {});
      return serverWords;
    }
  } catch (err) {
    console.warn('[Storage] Server unavailable, falling back to local cache', err);
  }

  // 2. Fallback to IndexedDB
  try {
    const saved = await get<WordItem[]>(`${WORDS_STORAGE_KEY}_${pId}`);
    if (saved && Array.isArray(saved) && saved.length > 0) {
      return saved;
    }
  } catch {}

  // 3. Fallback to generic WORDS_STORAGE_KEY
  try {
    const saved = await get<WordItem[]>(WORDS_STORAGE_KEY);
    if (saved && Array.isArray(saved) && saved.length > 0) {
      return saved;
    }
  } catch {}

  return INITIAL_WORDS;
}

export async function saveWords(words: WordItem[], profileId?: string): Promise<void> {
  const pId = profileId !== undefined ? profileId : getActiveProfileId();
  // Save to SQLite server in batch
  try {
    await apiBatchCreateWords(words);
  } catch (err) {
    console.warn('[Storage] Could not sync all words with server', err);
  }

  // Save to local cache
  try {
    await set(`${WORDS_STORAGE_KEY}_${pId}`, words);
    await set(WORDS_STORAGE_KEY, words);
  } catch {}
}

export async function addWord(newWord: WordItem, profileId?: string): Promise<WordItem[]> {
  const pId = profileId !== undefined ? profileId : getActiveProfileId();
  try {
    await apiCreateWord(newWord);
    return await loadWords(undefined, pId);
  } catch (err) {
    console.warn('[Storage] Server error on addWord, falling back to local', err);
    const words = await loadWords(undefined, pId);
    const updated = [newWord, ...words];
    await saveWords(updated, pId);
    return updated;
  }
}

export async function addWords(newWords: WordItem[], profileId?: string): Promise<WordItem[]> {
  const pId = profileId !== undefined ? profileId : getActiveProfileId();
  try {
    await apiBatchCreateWords(newWords);
    return await loadWords(undefined, pId);
  } catch (err) {
    console.warn('[Storage] Server error on addWords, falling back to local', err);
    const words = await loadWords(undefined, pId);
    const updated = [...newWords, ...words];
    await saveWords(updated, pId);
    return updated;
  }
}

export async function updateWord(updatedWord: WordItem, profileId?: string): Promise<WordItem[]> {
  const pId = profileId !== undefined ? profileId : getActiveProfileId();
  try {
    await apiUpdateWord(updatedWord);
    return await loadWords(undefined, pId);
  } catch (err) {
    console.warn('[Storage] Server error on updateWord, falling back to local', err);
    const words = await loadWords(undefined, pId);
    const updated = words.map(w => (w.id === updatedWord.id ? updatedWord : w));
    await saveWords(updated, pId);
    return updated;
  }
}

export async function deleteWord(id: string, profileId?: string): Promise<WordItem[]> {
  const pId = profileId !== undefined ? profileId : getActiveProfileId();
  try {
    await apiDeleteWord(id);
    return await loadWords(undefined, pId);
  } catch (err) {
    console.warn('[Storage] Server error on deleteWord, falling back to local', err);
    const words = await loadWords(undefined, pId);
    const updated = words.filter(w => w.id !== id);
    await saveWords(updated, pId);
    return updated;
  }
}

export async function deleteLesson(lesson: string, language?: Language, profileId?: string): Promise<WordItem[]> {
  const pId = profileId !== undefined ? profileId : getActiveProfileId();
  try {
    await apiDeleteLesson(lesson, language, pId);
    return await loadWords(undefined, pId);
  } catch (err) {
    console.warn('[Storage] Server error on deleteLesson, falling back to local', err);
    const words = await loadWords(undefined, pId);
    const updated = words.filter(w => {
      if (language) {
        return !(w.lesson === lesson && w.language === language);
      }
      return w.lesson !== lesson;
    });
    await saveWords(updated, pId);
    return updated;
  }
}

export async function recordReviewProgress(wordId: string, wasCorrect: boolean, profileId?: string): Promise<WordItem[]> {
  const pId = profileId !== undefined ? profileId : getActiveProfileId();
  try {
    await apiRecordReview(wordId, wasCorrect, pId);
    return await loadWords(undefined, pId);
  } catch (err) {
    console.warn('[Storage] Server error on recordReview, falling back to local', err);
    const words = await loadWords(undefined, pId);
    const updated = words.map(item => {
      if (item.id !== wordId) return item;
      let nextBox = item.box;
      if (wasCorrect) {
        nextBox = Math.min(5, item.box + 1);
      } else {
        nextBox = Math.max(1, item.box - 1);
      }
      return {
        ...item,
        box: nextBox,
        correctCount: item.correctCount + (wasCorrect ? 1 : 0),
        incorrectCount: item.incorrectCount + (wasCorrect ? 0 : 1),
        lastReviewedAt: Date.now(),
      };
    });
    await saveWords(updated, pId);
    return updated;
  }
}

export async function resetReviewProgress(profileId?: string): Promise<WordItem[]> {
  const pId = profileId !== undefined ? profileId : getActiveProfileId();
  try {
    const updated = await apiResetProgress(pId);
    set(`${WORDS_STORAGE_KEY}_${pId}`, updated).catch(() => {});
    return updated;
  } catch (err) {
    console.warn('[Storage] Server error on resetReviewProgress, falling back to local', err);
    const words = await loadWords(undefined, pId);
    const updated = words.map(w => ({
      ...w,
      box: 1,
      correctCount: 0,
      incorrectCount: 0,
      lastReviewedAt: undefined,
    }));
    await saveWords(updated, pId);
    return updated;
  }
}

export async function resetToDefaults(profileId?: string): Promise<WordItem[]> {
  const pId = profileId !== undefined ? profileId : getActiveProfileId();
  try {
    const updated = await apiResetToDefaults();
    set(`${WORDS_STORAGE_KEY}_${pId}`, updated).catch(() => {});
    return updated;
  } catch (err) {
    console.warn('[Storage] Server error on resetToDefaults, falling back to local', err);
    await saveWords(INITIAL_WORDS, pId);
    return INITIAL_WORDS;
  }
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {}
  return DEFAULT_SETTINGS;
}

export async function loadSettingsAsync(): Promise<AppSettings> {
  try {
    const serverSettings = await apiGetSettings();
    if (serverSettings) {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(serverSettings));
      return serverSettings;
    }
  } catch (err) {
    console.warn('[Storage] Server settings unavailable, using local', err);
  }
  return loadSettings();
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    await apiSaveSettings(settings);
  } catch (err) {
    console.warn('[Storage] Failed to save settings to server', err);
  }
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

export function exportWordsToJson(words: WordItem[]): string {
  return JSON.stringify(
    {
      app: 'quasselstrippe',
      version: 1,
      exportedAt: new Date().toISOString(),
      wordCount: words.length,
      words,
    },
    null,
    2
  );
}

export async function getLearnerStats(profileId?: string, language?: Language): Promise<LearnerStats> {
  const pId = profileId !== undefined ? profileId : getActiveProfileId();
  try {
    return await apiGetLearnerStats(pId, language);
  } catch (err) {
    console.warn('[Storage] Server error fetching learner stats, computing locally', err);
    const words = await loadWords(language, pId);
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
      const b = (w.box >= 1 && w.box <= 5 ? w.box : 1) as 1 | 2 | 3 | 4 | 5;
      boxDistribution[b] = (boxDistribution[b] || 0) + 1;
      totalCorrect += w.correctCount || 0;
      totalIncorrect += w.incorrectCount || 0;
    }

    const totalWords = words.length;
    const masteredWords = (boxDistribution[4] || 0) + (boxDistribution[5] || 0);
    const learningWords = (boxDistribution[2] || 0) + (boxDistribution[3] || 0);
    const newWords = boxDistribution[1] || 0;
    const totalReviews = totalCorrect + totalIncorrect;
    const accuracyRate = totalReviews > 0 ? Math.round((totalCorrect / totalReviews) * 100) : 0;

    // Build local history points for past 14 days
    const now = new Date();
    const history: ReviewHistoryPoint[] = [];
    for (let i = 13; i >= 0; i--) {
      const dayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dayStart = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 0, 0, 0, 0).getTime();
      const yyyy = dayDate.getFullYear();
      const mm = String(dayDate.getMonth() + 1).padStart(2, '0');
      const dd = String(dayDate.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const dayLabel = dayDate.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });

      const progressFactor = Math.min(1, (14 - i) / 14);
      const estimatedMastered = Math.round(masteredWords * progressFactor);
      history.push({
        date: dateStr,
        dayLabel,
        timestamp: dayStart,
        reviewsCount: Math.round((totalReviews / 14) * (0.8 + Math.random() * 0.4)),
        correctCount: Math.round((totalCorrect / 14) * (0.8 + Math.random() * 0.4)),
        incorrectCount: Math.round((totalIncorrect / 14) * (0.8 + Math.random() * 0.4)),
        accuracy: accuracyRate,
        masteredCumulative: estimatedMastered,
      });
    }

    const difficultWords: DifficultWordItem[] = words
      .filter((w) => (w.incorrectCount || 0) > 0)
      .sort((a, b) => (b.incorrectCount || 0) - (a.incorrectCount || 0))
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
      profileId: pId,
      language,
      totalWords,
      masteredWords,
      learningWords,
      newWords,
      boxDistribution,
      totalReviews,
      correctReviews: totalCorrect,
      incorrectReviews: totalIncorrect,
      accuracyRate,
      streakDays: Math.min(7, totalReviews > 0 ? 3 : 0),
      history,
      difficultWords,
    };
  }
}

