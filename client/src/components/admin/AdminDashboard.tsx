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
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1.25rem 0.85rem calc(3rem + env(safe-area-inset-bottom, 0px)) 0.85rem' }}>
      <div className="scrollable-tabs-bar">
        <button
          type="button"
          onClick={() => setActiveTab('scanner')}
          className="learner-tab-btn"
          style={{
            background: activeTab === 'scanner' ? 'var(--primary-gradient)' : 'var(--bg-surface-elevated)',
            color: activeTab === 'scanner' ? '#fff' : 'var(--text-secondary)',
            border: activeTab === 'scanner' ? 'none' : '1px solid var(--border-subtle)',
            boxShadow: activeTab === 'scanner' ? '0 2px 10px rgba(99, 102, 241, 0.4)' : 'none',
            minHeight: '42px',
          }}
        >
          <Camera size={16} />
          <span className="desktop-only">📸 Arbeitsblatt-Scanner</span>
          <span className="mobile-only">📸 Scanner</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('words')}
          className="learner-tab-btn"
          style={{
            background: activeTab === 'words' ? 'var(--primary-gradient)' : 'var(--bg-surface-elevated)',
            color: activeTab === 'words' ? '#fff' : 'var(--text-secondary)',
            border: activeTab === 'words' ? 'none' : '1px solid var(--border-subtle)',
            boxShadow: activeTab === 'words' ? '0 2px 10px rgba(99, 102, 241, 0.4)' : 'none',
            minHeight: '42px',
          }}
        >
          <List size={16} />
          <span className="desktop-only">📋 Vokabelliste & Verwaltung ({words.filter(w => w.language === language).length})</span>
          <span className="mobile-only">📋 Vokabeln ({words.filter(w => w.language === language).length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('profiles')}
          className="learner-tab-btn"
          style={{
            background: activeTab === 'profiles' ? 'var(--primary-gradient)' : 'var(--bg-surface-elevated)',
            color: activeTab === 'profiles' ? '#fff' : 'var(--text-secondary)',
            border: activeTab === 'profiles' ? 'none' : '1px solid var(--border-subtle)',
            boxShadow: activeTab === 'profiles' ? '0 2px 10px rgba(99, 102, 241, 0.4)' : 'none',
            minHeight: '42px',
          }}
        >
          <Users size={16} />
          <span className="desktop-only">👥 Schüler & Profile ({profiles.length})</span>
          <span className="mobile-only">👥 Profile ({profiles.length})</span>
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
