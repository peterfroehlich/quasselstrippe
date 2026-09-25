import React, { useState, useEffect } from 'react';
import { Camera, List, Users } from 'lucide-react';
import type { WordItem, Language, UserProfile } from '../../types/vocabulary';
import { WorksheetScanner } from './WorksheetScanner';
import { WordManager } from './WordManager';
import { ProfileManager } from './ProfileManager';

interface AdminDashboardProps {
  words: WordItem[];
  language: Language;
  geminiApiKey: string;
  profiles: UserProfile[];
  activeProfile: UserProfile | null;
  initialTab?: 'scanner' | 'words' | 'profiles';
  onSelectProfile: (profile: UserProfile) => void;
  onCreateProfile: (profile: { name: string; avatar: string; color: string }) => Promise<void>;
  onUpdateProfile: (profile: UserProfile) => Promise<void>;
  onDeleteProfile: (id: string) => Promise<void>;
  onAddWords: (newWords: WordItem[]) => void;
  onAddWord: (word: WordItem) => void;
  onUpdateWord: (word: WordItem) => void;
  onDeleteWord: (id: string) => void;
  onDeleteLesson: (lesson: string) => void;
  onImportWords: (words: WordItem[]) => void;
  onResetProgress: () => void;
  onOpenSettings: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  words,
  language,
  geminiApiKey,
  profiles,
  activeProfile,
  initialTab = 'scanner',
  onSelectProfile,
  onCreateProfile,
  onUpdateProfile,
  onDeleteProfile,
  onAddWords,
  onAddWord,
  onUpdateWord,
  onDeleteWord,
  onDeleteLesson,
  onImportWords,
  onResetProgress,
  onOpenSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'scanner' | 'words' | 'profiles'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1.5rem 1rem 4rem 1rem' }}>
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          marginBottom: '2rem',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('scanner')}
          className="btn btn-sm"
          style={{
            background: activeTab === 'scanner' ? 'var(--primary-gradient)' : 'var(--bg-surface-elevated)',
            color: activeTab === 'scanner' ? '#fff' : 'var(--text-secondary)',
            borderRadius: 'var(--radius-md)',
            border: activeTab === 'scanner' ? 'none' : '1px solid var(--border-subtle)',
            padding: '0.65rem 1.25rem',
            fontSize: '0.95rem',
            minHeight: '44px',
          }}
        >
          <Camera size={17} />
          <span>📸 Arbeitsblatt-Scanner</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('words')}
          className="btn btn-sm"
          style={{
            background: activeTab === 'words' ? 'var(--primary-gradient)' : 'var(--bg-surface-elevated)',
            color: activeTab === 'words' ? '#fff' : 'var(--text-secondary)',
            borderRadius: 'var(--radius-md)',
            border: activeTab === 'words' ? 'none' : '1px solid var(--border-subtle)',
            padding: '0.65rem 1.25rem',
            fontSize: '0.95rem',
            minHeight: '44px',
          }}
        >
          <List size={17} />
          <span>📋 Vokabelliste & Verwaltung ({words.filter(w => w.language === language).length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('profiles')}
          className="btn btn-sm"
          style={{
            background: activeTab === 'profiles' ? 'var(--primary-gradient)' : 'var(--bg-surface-elevated)',
            color: activeTab === 'profiles' ? '#fff' : 'var(--text-secondary)',
            borderRadius: 'var(--radius-md)',
            border: activeTab === 'profiles' ? 'none' : '1px solid var(--border-subtle)',
            padding: '0.65rem 1.25rem',
            fontSize: '0.95rem',
            minHeight: '44px',
          }}
        >
          <Users size={17} />
          <span>👥 Schüler & Profile ({profiles.length})</span>
        </button>
      </div>

      {activeTab === 'scanner' ? (
        <WorksheetScanner
          language={language}
          geminiApiKey={geminiApiKey}
          onAddWords={(newWords) => {
            onAddWords(newWords);
          }}
          onOpenSettings={onOpenSettings}
        />
      ) : activeTab === 'words' ? (
        <WordManager
          words={words}
          language={language}
          profiles={profiles}
          activeProfile={activeProfile}
          onUpdateWord={onUpdateWord}
          onDeleteWord={onDeleteWord}
          onDeleteLesson={onDeleteLesson}
          onAddWord={onAddWord}
          onImportWords={onImportWords}
          onResetProgress={onResetProgress}
        />
      ) : (
        <ProfileManager
          profiles={profiles}
          activeProfile={activeProfile}
          onSelectProfile={onSelectProfile}
          onCreateProfile={onCreateProfile}
          onUpdateProfile={onUpdateProfile}
          onDeleteProfile={onDeleteProfile}
          words={words}
        />
      )}
    </div>
  );
};
