import React, { useState } from 'react';
import { Camera, List } from 'lucide-react';
import type { WordItem, Language } from '../../types/vocabulary';
import { WorksheetScanner } from './WorksheetScanner';
import { WordManager } from './WordManager';

interface AdminDashboardProps {
  words: WordItem[];
  language: Language;
  geminiApiKey: string;
  onAddWords: (newWords: WordItem[]) => void;
  onAddWord: (word: WordItem) => void;
  onUpdateWord: (word: WordItem) => void;
  onDeleteWord: (id: string) => void;
  onImportWords: (words: WordItem[]) => void;
  onResetProgress: () => void;
  onOpenSettings: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  words,
  language,
  geminiApiKey,
  onAddWords,
  onAddWord,
  onUpdateWord,
  onDeleteWord,
  onImportWords,
  onResetProgress,
  onOpenSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'scanner' | 'words'>('scanner');

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1.5rem 1rem 4rem 1rem' }}>
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          marginBottom: '2rem',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '0.75rem',
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
          }}
        >
          <Camera size={17} />
          <span>📸 Arbeitsblatt-Scanner (Gemini KI)</span>
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
          }}
        >
          <List size={17} />
          <span>📋 Vokabelliste & Verwaltung ({words.filter(w => w.language === language).length})</span>
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
      ) : (
        <WordManager
          words={words}
          language={language}
          onUpdateWord={onUpdateWord}
          onDeleteWord={onDeleteWord}
          onAddWord={onAddWord}
          onImportWords={onImportWords}
          onResetProgress={onResetProgress}
        />
      )}
    </div>
  );
};
