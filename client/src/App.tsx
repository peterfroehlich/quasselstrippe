import React, { useState, useEffect, useRef } from 'react';
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
  syncOfflineChanges,
} from './services/storage';
import { apiLogin, apiLogout, apiSession } from './services/api';
import { speechService } from './services/speech';
import { Header } from './components/Header';
import { LearnerDashboard } from './components/learner/LearnerDashboard';
import { StatsModal } from './components/learner/StatsModal';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { SettingsModal } from './components/admin/SettingsModal';
import { APP_VERSION } from './version';

const AuthenticatedApp: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
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
  const [error, setError] = useState('');
  const [pending, setPending] = useState(0);
  const revision = useRef(0);
  const scope = useRef<string | undefined>(undefined);
  useEffect(() => {
    speechService.setRate(settings.speechRate);
  }, [settings.speechRate]);
  useEffect(() => {
    const onSync = (event: Event) => setPending((event as CustomEvent<{ pending: number }>).detail.pending);
    const onOnline = () => {
      const version = revision.current;
      syncOfflineChanges().then(() => loadWords(undefined, scope.current)).then(fresh => {
        if (version === revision.current) setWords(fresh);
      }).catch(err => setError(err.message));
    };
    window.addEventListener('quasselstrippe:sync', onSync);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('quasselstrippe:sync', onSync);
      window.removeEventListener('online', onOnline);
      speechService.stop();
    };
  }, []);
  async function changeWords(work: () => Promise<WordItem[]>) {
    const version = revision.current;
    try { const updated = await work(); if (version === revision.current) { setWords(updated); setError(''); } }
    catch (err) { setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.'); throw err; }
  }



  useEffect(() => {
    let cancelled = false;
    async function init() {
      // 1. Load profiles and determine active profile
      const storedProfiles = await loadProfiles();
      setProfiles(storedProfiles);

      const activeId = getActiveProfileId();
      const current = storedProfiles.find(p => p.id === activeId) || storedProfiles[0] || null;
      setActiveProfile(current);
      scope.current = current?.id;
      if (current) {
        setActiveProfileId(current.id);
      }

      // 2. Load settings
      const storedSettings = await loadSettingsAsync();
      setSettings(storedSettings);
      const lang = storedSettings.activeLanguage || 'en';
      setActiveLanguage(lang);

      // 3. Load words for current profile and language
      const storedWords = await loadWords(undefined, current?.id);
      if (cancelled) return;
      setWords(storedWords);

      setIsLoaded(true);
    }
    init().catch(err => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, []);

  const handleLanguageChange = async (lang: Language) => {
    setActiveLanguage(lang);
    const updated = { ...settings, activeLanguage: lang };
    setSettings(updated);
    try { await saveSettings(updated); } catch (err) { setError((err as Error).message); }
  };
  const handleSelectProfile = async (profile: UserProfile) => {
    const version = ++revision.current;
    scope.current = profile.id;
    speechService.stop();
    setWords([]);
    setActiveProfile(profile);
    setActiveProfileId(profile.id);
    try {
      const fresh = await loadWords(undefined, profile.id);
      if (version === revision.current) setWords(fresh);
    } catch (err) { setError((err as Error).message); }
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

  const handleRecordReview = async (wordId: string, wasCorrect: boolean, promote = true) => {
    await changeWords(() => recordReviewProgress(wordId, wasCorrect, activeProfile?.id, promote));
  };
  const handleAddWords = async (items: WordItem[]) => { await changeWords(() => addWords(items, activeProfile?.id)); };
  const handleAddWord = async (item: WordItem) => { await changeWords(() => addWord(item, activeProfile?.id)); };
  const handleUpdateWord = async (item: WordItem) => { await changeWords(() => updateWord(item, activeProfile?.id)); };
  const handleDeleteWord = async (id: string) => { await changeWords(() => deleteWord(id, activeProfile?.id)); };
  const handleDeleteLesson = async (lesson: string, lessonScope?: string) => {
    await changeWords(() => deleteLesson(lesson, activeLanguage, activeProfile?.id, lessonScope));
  };
  const handleImportWords = async (items: WordItem[]) => {
    const sanitized = items.map(item => ({ ...item, id: crypto.randomUUID(),
      profileId: activeProfile?.id, box: 1, correctCount: 0, incorrectCount: 0, lastReviewedAt: undefined }));
    await handleAddWords(sanitized);
  };
  const handleResetProgress = async () => { await changeWords(() => resetReviewProgress(activeProfile?.id)); };
  const handleResetToDefaults = async () => { await changeWords(() => resetToDefaults(activeProfile?.id)); };

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
        <span role="status">{error || 'Lade Quasselstrippe...'}</span>
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
        hasApiKey={Boolean(settings.geminiApiKey || settings.aiAvailable)}
        profiles={profiles}
        activeProfile={activeProfile}
        onSelectProfile={handleSelectProfile}
        onOpenProfileAdmin={handleOpenProfileAdmin}
        onOpenStats={() => setIsStatsOpen(true)}
      />

      <div style={{ maxWidth: '980px', margin: '0 auto', padding: '0.5rem 1rem' }}>
        <button className="btn btn-ghost btn-sm" onClick={onLogout}>Abmelden</button>
        {pending > 0 && <p role="status">{pending} Änderungen auf diesem Gerät gespeichert. Synchronisierung bei Verbindung.</p>}
        {error && <p role="alert" style={{ color: 'var(--danger)' }}>{error}</p>}
      </div>
      <main style={{ flex: 1 }}>
        {mode === 'learner' ? (
          <LearnerDashboard
            key={`${activeProfile?.id}-${activeLanguage}`}
            words={words}
            language={activeLanguage}
            onRecordReview={handleRecordReview}
            autoPlayAudio={settings.autoPlayAudio}
            geminiApiKey={settings.geminiApiKey}
            aiAvailable={settings.aiAvailable}
          />
        ) : (
          <AdminDashboard
            key={`${activeProfile?.id}-${activeLanguage}-${adminTab}`}
            words={words}
            language={activeLanguage}
            geminiApiKey={settings.geminiApiKey}
            aiAvailable={settings.aiAvailable}
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

      {isStatsOpen && <StatsModal
        key={`${activeProfile?.id}-${activeLanguage}`}
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        activeProfile={activeProfile || undefined}
        currentLanguage={activeLanguage}
        onProgressReset={async () => {
          const fresh = await loadWords(undefined, activeProfile?.id);
          setWords(fresh);
        }}
      />}

      {isSettingsOpen && <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onResetToDefaults={handleResetToDefaults}
        currentLanguage={activeLanguage}
      />}

      {/* Release version tag in lower left corner */}
      <aside className="release-version-tag" aria-label="Version">
        <a
          href={`https://github.com/peterfroehlich/quasselstrippe/releases/tag/${APP_VERSION}`}
          target="_blank"
          rel="noopener noreferrer"
          title={`Quasselstrippe ${APP_VERSION} – Release-Informationen`}
        >
          <span className="release-version-dot" />
          <span>{APP_VERSION}</span>
        </a>
      </aside>
    </div>
  );
};


export const App: React.FC = () => {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const session = localStorage.getItem('quasselstrippe_signed_out') === 'true'
      ? apiLogout().catch(() => {}).then(() => false)
      : apiSession();
    session.then(value => {
      if (cancelled) return;
      const allowed = value && localStorage.getItem('quasselstrippe_signed_out') !== 'true';
      setAuthenticated(allowed);
      if (allowed) localStorage.setItem('quasselstrippe_authenticated', 'true');
      else localStorage.removeItem('quasselstrippe_authenticated');
    }).catch(() => {
      if (!cancelled) { setAuthenticated(localStorage.getItem('quasselstrippe_authenticated') === 'true' && localStorage.getItem('quasselstrippe_signed_out') !== 'true'); setError('Server nicht erreichbar. Bereits gespeicherte Daten sind offline verfügbar.'); }
    });
    const onExpired = () => { localStorage.removeItem('quasselstrippe_authenticated'); setAuthenticated(false); setError('Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.'); };
    window.addEventListener('quasselstrippe:unauthorized', onExpired);
    return () => { cancelled = true; window.removeEventListener('quasselstrippe:unauthorized', onExpired); };
  }, []);
  if (authenticated === null) return <p role="status">Lade Quasselstrippe...</p>;
  if (authenticated) return <AuthenticatedApp onLogout={() => {
    localStorage.removeItem('quasselstrippe_authenticated');
    localStorage.setItem('quasselstrippe_signed_out', 'true');
    setAuthenticated(false);
    apiLogout().catch(err => setError(err.message));
  }} />;
  return <main style={{ maxWidth: '440px', margin: '15vh auto', padding: '1rem' }}>
    <h1>Quasselstrippe</h1>
    <p>Melde dich mit dem Passwort deiner Lernapp an.</p>
    <form onSubmit={async event => {
      event.preventDefault(); setBusy(true); setError('');
      try { await apiLogin(password); localStorage.removeItem('quasselstrippe_signed_out'); localStorage.setItem('quasselstrippe_authenticated', 'true'); setPassword(''); setAuthenticated(true); }
      catch (err) { setError(err instanceof Error ? err.message : 'Anmeldung fehlgeschlagen.'); }
      finally { setBusy(false); }
    }}>
      <label htmlFor="app-password">Passwort</label>
      <input id="app-password" className="input-field" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required autoFocus />
      {error && <p role="alert">{error}</p>}
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Anmelden…' : 'Anmelden'}</button>
    </form>
  </main>;
};
export default App;
