import { get, set } from 'idb-keyval';
import type { WordItem, AppSettings } from '../types/vocabulary';

const WORDS_STORAGE_KEY = 'quasselstrippe_words_v1';
const SETTINGS_STORAGE_KEY = 'quasselstrippe_settings_v1';

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
    exampleSentence: 'Don\'t forget to pack your English books into your backpack.',
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

export async function loadWords(): Promise<WordItem[]> {
  try {
    const saved = await get<WordItem[]>(WORDS_STORAGE_KEY);
    if (saved && Array.isArray(saved) && saved.length > 0) {
      return saved;
    }
    await set(WORDS_STORAGE_KEY, INITIAL_WORDS);
    return INITIAL_WORDS;
  } catch (error) {
    console.warn('Failed to load words from IndexedDB, falling back to localStorage or initial words', error);
    try {
      const local = localStorage.getItem(WORDS_STORAGE_KEY);
      if (local) {
        return JSON.parse(local);
      }
    } catch {}
    return INITIAL_WORDS;
  }
}

export async function saveWords(words: WordItem[]): Promise<void> {
  try {
    await set(WORDS_STORAGE_KEY, words);
  } catch (error) {
    console.error('Failed to save to IndexedDB', error);
  }
  try {
    localStorage.setItem(WORDS_STORAGE_KEY, JSON.stringify(words));
  } catch {}
}

export async function recordReviewProgress(wordId: string, wasCorrect: boolean): Promise<WordItem[]> {
  const words = await loadWords();
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
  await saveWords(updated);
  return updated;
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('Could not read settings from localStorage', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Could not save settings', e);
  }
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
