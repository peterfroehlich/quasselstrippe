import React, { useState, useEffect } from 'react';
import type { AppMode, Language, WordItem, AppSettings } from './types/vocabulary';
import { 
  loadWords, 
  saveWords, 
  recordReviewProgress, 
  loadSettings, 
  saveSettings, 
  INITIAL_WORDS 
} from './services/storage';
import { Header } from './components/Header';
import { LearnerDashboard } from './components/learner/LearnerDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { SettingsModal } from './components/admin/SettingsModal';

export const App: React.FC = () => {
  const [words, setWords] = useState<WordItem[]>([]);
  const [mode, setMode] = useState<AppMode>('learner');
  const [activeLanguage, setActiveLanguage] = useState<Language>('en');
  const [settings, setSettings] = useState<AppSettings>(loadSettings());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function init() {
      const storedWords = await loadWords();
      setWords(storedWords);
      const storedSettings = loadSettings();
      setSettings(storedSettings);
      if (storedSettings.activeLanguage) {
        setActiveLanguage(storedSettings.activeLanguage);
      }
      setIsLoaded(true);
    }
    init();
  }, []);

  const handleLanguageChange = (lang: Language) => {
    setActiveLanguage(lang);
    const updated = { ...settings, activeLanguage: lang };
    setSettings(updated);
    saveSettings(updated);
  };

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const handleRecordReview = async (wordId: string, wasCorrect: boolean) => {
    const updated = await recordReviewProgress(wordId, wasCorrect);
    setWords(updated);
  };

  const handleAddWords = async (newWords: WordItem[]) => {
    const updated = [...newWords, ...words];
    setWords(updated);
    await saveWords(updated);
  };

  const handleAddWord = async (newWord: WordItem) => {
    const updated = [newWord, ...words];
    setWords(updated);
    await saveWords(updated);
  };

  const handleUpdateWord = async (updatedWord: WordItem) => {
    const updated = words.map(w => w.id === updatedWord.id ? updatedWord : w);
    setWords(updated);
    await saveWords(updated);
  };

  const handleDeleteWord = async (id: string) => {
    const updated = words.filter(w => w.id !== id);
    setWords(updated);
    await saveWords(updated);
  };

  const handleImportWords = async (importedList: WordItem[]) => {
    const existingIds = new Set(words.map(w => w.id));
    const sanitized = importedList.map(item => {
      if (existingIds.has(item.id)) {
        return { ...item, id: `${item.id}-imported-${Date.now()}` };
      }
      return item;
    });
    const updated = [...sanitized, ...words];
    setWords(updated);
    await saveWords(updated);
  };

  const handleResetProgress = async () => {
    const updated = words.map(w => ({
      ...w,
      box: 1,
      correctCount: 0,
      incorrectCount: 0,
      lastReviewedAt: undefined,
    }));
    setWords(updated);
    await saveWords(updated);
  };

  const handleResetToDefaults = async () => {
    setWords(INITIAL_WORDS);
    await saveWords(INITIAL_WORDS);
  };

  if (!isLoaded) {
    return (
      <div
        style={{
          display: 'flex',
          height: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary)',
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-body)',
        }}
      >
        <span>Lade Quasselstrippe...</span>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header
        mode={mode}
        onModeChange={setMode}
        activeLanguage={activeLanguage}
        onLanguageChange={handleLanguageChange}
        onOpenSettings={() => setIsSettingsOpen(true)}
        words={words}
        hasApiKey={Boolean(settings.geminiApiKey)}
      />

      <main style={{ flex: 1 }}>
        {mode === 'learner' ? (
          <LearnerDashboard
            words={words}
            language={activeLanguage}
            onRecordReview={handleRecordReview}
            autoPlayAudio={settings.autoPlayAudio}
          />
        ) : (
          <AdminDashboard
            words={words}
            language={activeLanguage}
            geminiApiKey={settings.geminiApiKey}
            onAddWords={handleAddWords}
            onAddWord={handleAddWord}
            onUpdateWord={handleUpdateWord}
            onDeleteWord={handleDeleteWord}
            onImportWords={handleImportWords}
            onResetProgress={handleResetProgress}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        )}
      </main>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onResetToDefaults={handleResetToDefaults}
        currentLanguage={activeLanguage}
      />
    </div>
  );
};

export default App;
