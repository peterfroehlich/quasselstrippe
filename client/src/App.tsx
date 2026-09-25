import React, { useState, useEffect } from 'react';
import type { AppMode, Language, WordItem, AppSettings, UserProfile } from './types/vocabulary';
import { 
  loadWords, 
  loadSettings, 
  loadSettingsAsync,
  saveSettings, 
  loadProfiles,
  createProfile,
  updateProfile,
  deleteProfile,
  getActiveProfileId,
  setActiveProfileId,
  addWord,
  addWords,
  updateWord,
  deleteWord,
  deleteLesson,
  recordReviewProgress,
  resetReviewProgress,
  resetToDefaults,
} from './services/storage';
import { Header } from './components/Header';
import { LearnerDashboard } from './components/learner/LearnerDashboard';
import { StatsModal } from './components/learner/StatsModal';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { SettingsModal } from './components/admin/SettingsModal';

export const App: React.FC = () => {
  const [words, setWords] = useState<WordItem[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<UserProfile | null>(null);
  const [mode, setMode] = useState<AppMode>('learner');
  const [adminTab, setAdminTab] = useState<'scanner' | 'words' | 'profiles'>('scanner');
  const [activeLanguage, setActiveLanguage] = useState<Language>('en');
  const [settings, setSettings] = useState<AppSettings>(loadSettings());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);


  useEffect(() => {
    async function init() {
      // 1. Load profiles and determine active profile
      const storedProfiles = await loadProfiles();
      setProfiles(storedProfiles);

      const activeId = getActiveProfileId();
      const current = storedProfiles.find(p => p.id === activeId) || storedProfiles[0] || null;
      setActiveProfile(current);
      if (current) {
        setActiveProfileId(current.id);
      }

      // 2. Load settings
      const storedSettings = await loadSettingsAsync();
      setSettings(storedSettings);
      const lang = storedSettings.activeLanguage || 'en';
      setActiveLanguage(lang);

      // 3. Load words for current profile and language
      const storedWords = await loadWords(lang, current?.id);
      setWords(storedWords);

      setIsLoaded(true);
    }
    init();
  }, []);

  const handleLanguageChange = async (lang: Language) => {
    setActiveLanguage(lang);
    const updated = { ...settings, activeLanguage: lang };
    setSettings(updated);
    await saveSettings(updated);
    const currentWords = await loadWords(lang, activeProfile?.id);
    setWords(currentWords);
  };

  const handleSelectProfile = async (profile: UserProfile) => {
    setActiveProfile(profile);
    setActiveProfileId(profile.id);
    const updatedWords = await loadWords(activeLanguage, profile.id);
    setWords(updatedWords);
  };

  const handleCreateProfile = async (data: { name: string; avatar: string; color: string }) => {
    const updatedProfiles = await createProfile(data);
    setProfiles(updatedProfiles);
    const created = updatedProfiles[updatedProfiles.length - 1];
    if (created) {
      await handleSelectProfile(created);
    }
  };

  const handleUpdateProfile = async (profile: UserProfile) => {
    const updatedProfiles = await updateProfile(profile);
    setProfiles(updatedProfiles);
    if (activeProfile?.id === profile.id) {
      setActiveProfile(profile);
    }
  };

  const handleDeleteProfile = async (id: string) => {
    const updatedProfiles = await deleteProfile(id);
    setProfiles(updatedProfiles);
    if (activeProfile?.id === id) {
      const nextActive = updatedProfiles[0] || null;
      if (nextActive) {
        await handleSelectProfile(nextActive);
      }
    }
  };

  const handleOpenProfileAdmin = () => {
    setAdminTab('profiles');
    setMode('admin');
  };

  const handleSaveSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  const handleRecordReview = async (wordId: string, wasCorrect: boolean) => {
    const updated = await recordReviewProgress(wordId, wasCorrect, activeProfile?.id);
    setWords(updated);
  };

  const handleAddWords = async (newWords: WordItem[]) => {
    const updated = await addWords(newWords, activeProfile?.id);
    setWords(updated);
  };

  const handleAddWord = async (newWord: WordItem) => {
    const updated = await addWord(newWord, activeProfile?.id);
    setWords(updated);
  };

  const handleUpdateWord = async (updatedWord: WordItem) => {
    const updated = await updateWord(updatedWord, activeProfile?.id);
    setWords(updated);
  };

  const handleDeleteWord = async (id: string) => {
    const updated = await deleteWord(id, activeProfile?.id);
    setWords(updated);
  };

  const handleDeleteLesson = async (lessonName: string) => {
    const updated = await deleteLesson(lessonName, activeLanguage, activeProfile?.id);
    setWords(updated);
  };

  const handleImportWords = async (importedList: WordItem[]) => {
    const existingIds = new Set(words.map(w => w.id));
    const sanitized = importedList.map(item => {
      if (existingIds.has(item.id)) {
        return { ...item, id: `${item.id}-imported-${Date.now()}` };
      }
      return item;
    });
    const updated = await addWords(sanitized, activeProfile?.id);
    setWords(updated);
  };

  const handleResetProgress = async () => {
    const updated = await resetReviewProgress(activeProfile?.id);
    setWords(updated);
  };

  const handleResetToDefaults = async () => {
    const updated = await resetToDefaults(activeProfile?.id);
    setWords(updated);
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
        profiles={profiles}
        activeProfile={activeProfile}
        onSelectProfile={handleSelectProfile}
        onOpenProfileAdmin={handleOpenProfileAdmin}
        onOpenStats={() => setIsStatsOpen(true)}
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
            profiles={profiles}
            activeProfile={activeProfile}
            initialTab={adminTab}
            onSelectProfile={handleSelectProfile}
            onCreateProfile={handleCreateProfile}
            onUpdateProfile={handleUpdateProfile}
            onDeleteProfile={handleDeleteProfile}
            onAddWords={handleAddWords}
            onAddWord={handleAddWord}
            onUpdateWord={handleUpdateWord}
            onDeleteWord={handleDeleteWord}
            onDeleteLesson={handleDeleteLesson}
            onImportWords={handleImportWords}
            onResetProgress={handleResetProgress}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        )}
      </main>

      <StatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        activeProfile={activeProfile || undefined}
        currentLanguage={activeLanguage}
        onProgressReset={async () => {
          const fresh = await loadWords(activeLanguage, activeProfile?.id);
          setWords(fresh);
        }}
      />

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
