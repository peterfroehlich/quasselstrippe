import React, { useState, useMemo } from 'react';
import { 
  Layers, 
  HelpCircle, 
  PenTool, 
  Grid, 
  Filter, 
  Shuffle, 
  Flame, 
  CheckCircle, 
  BookOpen 
} from 'lucide-react';
import type { WordItem, Language, StudyMode } from '../../types/vocabulary';
import { FlashcardView } from './FlashcardView';
import { QuizView } from './QuizView';
import { SpellingView } from './SpellingView';
import { MatchingView } from './MatchingView';

interface LearnerDashboardProps {
  words: WordItem[];
  language: Language;
  onRecordReview: (wordId: string, wasCorrect: boolean) => void;
  autoPlayAudio: boolean;
}

export const LearnerDashboard: React.FC<LearnerDashboardProps> = ({
  words,
  language,
  onRecordReview,
  autoPlayAudio,
}) => {
  const [activeTab, setActiveTab] = useState<StudyMode>('flashcards');
  const [selectedLesson, setSelectedLesson] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<'all' | 'difficult'>('all');
  const [shuffleKey, setShuffleKey] = useState(0);

  const languageWords = useMemo(() => {
    return words.filter(w => w.language === language);
  }, [words, language]);

  const lessons = useMemo(() => {
    const list = Array.from(new Set(languageWords.map(w => w.lesson))).filter(Boolean);
    return list.sort();
  }, [languageWords]);

  const activeWords = useMemo(() => {
    let pool = languageWords;
    if (selectedLesson !== 'all') {
      pool = pool.filter(w => w.lesson === selectedLesson);
    }
    if (filterDifficulty === 'difficult') {
      pool = pool.filter(w => w.box <= 2);
    }
    return [...pool].sort(() => 0.5 - Math.random());
  }, [languageWords, selectedLesson, filterDifficulty, shuffleKey]);

  const totalInLanguage = languageWords.length;
  const masteredInLanguage = languageWords.filter(w => w.box >= 4).length;
  const needPractice = languageWords.filter(w => w.box <= 2).length;

  const handleShuffle = () => {
    setShuffleKey(k => k + 1);
  };

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto', padding: '1.5rem 1rem 4rem 1rem' }}>
      <div
        className="glass-panel"
        style={{
          padding: '1.5rem 2rem',
          marginBottom: '2rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem',
          background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.7) 0%, rgba(22, 27, 34, 0.85) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.6rem', marginBottom: '0.35rem' }}>
            {language === 'en' ? '🇬🇧 Englisch lernen' : '🏛️ Latein lernen'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            Wähle deine Lektion aus dem Schulunterricht und trainiere mit Karteikarten, Tests oder Diktat.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.35rem', justifyContent: 'center' }}>
              <BookOpen size={18} color="var(--primary-light)" />
              <span>{totalInLanguage}</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Gesamt</span>
          </div>

          <div style={{ width: '1px', height: '32px', background: 'var(--border-subtle)' }} />

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.35rem', justifyContent: 'center' }}>
              <CheckCircle size={18} />
              <span>{masteredInLanguage}</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Gemeistert</span>
          </div>

          <div style={{ width: '1px', height: '32px', background: 'var(--border-subtle)' }} />

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.35rem', justifyContent: 'center' }}>
              <Flame size={18} />
              <span>{needPractice}</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Üben</span>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: '1 1 280px' }}>
          <Filter size={16} color="var(--text-muted)" />
          <select
            value={selectedLesson}
            onChange={(e) => setSelectedLesson(e.target.value)}
            className="input-field"
            style={{ padding: '0.55rem 0.85rem', fontSize: '0.9rem' }}
          >
            <option value="all">📚 Alle Lektionen ({totalInLanguage} Wörter)</option>
            {lessons.map(l => {
              const count = languageWords.filter(w => w.lesson === l).length;
              return (
                <option key={l} value={l}>
                  {l} ({count} Wörter)
                </option>
              );
            })}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button
            type="button"
            onClick={() => setFilterDifficulty(prev => prev === 'all' ? 'difficult' : 'all')}
            className={`btn btn-sm ${filterDifficulty === 'difficult' ? 'btn-primary' : 'btn-secondary'}`}
            title="Nur Vokabeln anzeigen, die noch im Kasten 1 oder 2 liegen"
          >
            <Flame size={15} color={filterDifficulty === 'difficult' ? '#fff' : 'var(--warning)'} />
            <span>Nur Problemwörter ({needPractice})</span>
          </button>

          <button
            type="button"
            onClick={handleShuffle}
            className="btn btn-secondary btn-sm"
            title="Karten neu mischen"
          >
            <Shuffle size={15} />
            <span>Mischen</span>
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '0.75rem',
          marginBottom: '2rem',
          overflowX: 'auto',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('flashcards')}
          className="btn btn-sm"
          style={{
            background: activeTab === 'flashcards' ? 'var(--primary-gradient)' : 'var(--bg-surface-elevated)',
            color: activeTab === 'flashcards' ? '#fff' : 'var(--text-secondary)',
            borderRadius: 'var(--radius-md)',
            border: activeTab === 'flashcards' ? 'none' : '1px solid var(--border-subtle)',
            padding: '0.6rem 1.1rem',
          }}
        >
          <Layers size={16} />
          <span>Karteikarten</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('quiz')}
          className="btn btn-sm"
          style={{
            background: activeTab === 'quiz' ? 'var(--primary-gradient)' : 'var(--bg-surface-elevated)',
            color: activeTab === 'quiz' ? '#fff' : 'var(--text-secondary)',
            borderRadius: 'var(--radius-md)',
            border: activeTab === 'quiz' ? 'none' : '1px solid var(--border-subtle)',
            padding: '0.6rem 1.1rem',
          }}
        >
          <HelpCircle size={16} />
          <span>Vokabeltest (Quiz)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('spelling')}
          className="btn btn-sm"
          style={{
            background: activeTab === 'spelling' ? 'var(--primary-gradient)' : 'var(--bg-surface-elevated)',
            color: activeTab === 'spelling' ? '#fff' : 'var(--text-secondary)',
            borderRadius: 'var(--radius-md)',
            border: activeTab === 'spelling' ? 'none' : '1px solid var(--border-subtle)',
            padding: '0.6rem 1.1rem',
          }}
        >
          <PenTool size={16} />
          <span>Schreib- & Hörtraining</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('match')}
          className="btn btn-sm"
          style={{
            background: activeTab === 'match' ? 'var(--primary-gradient)' : 'var(--bg-surface-elevated)',
            color: activeTab === 'match' ? '#fff' : 'var(--text-secondary)',
            borderRadius: 'var(--radius-md)',
            border: activeTab === 'match' ? 'none' : '1px solid var(--border-subtle)',
            padding: '0.6rem 1.1rem',
          }}
        >
          <Grid size={16} />
          <span>Paare finden</span>
        </button>
      </div>

      {activeWords.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '1.05rem' }}>
            Keine Vokabeln mit den aktuellen Filtern gefunden.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedLesson('all');
              setFilterDifficulty('all');
            }}
            className="btn btn-secondary"
          >
            Filter zurücksetzen
          </button>
        </div>
      ) : (
        <div key={`${activeTab}-${shuffleKey}-${selectedLesson}-${filterDifficulty}`}>
          {activeTab === 'flashcards' && (
            <FlashcardView
              words={activeWords}
              language={language}
              onRecordReview={onRecordReview}
              onRestart={handleShuffle}
              autoPlayAudio={autoPlayAudio}
            />
          )}

          {activeTab === 'quiz' && (
            <QuizView
              words={activeWords}
              allWords={languageWords}
              language={language}
              onRecordReview={onRecordReview}
              onRestart={handleShuffle}
            />
          )}

          {activeTab === 'spelling' && (
            <SpellingView
              words={activeWords}
              language={language}
              onRecordReview={onRecordReview}
              onRestart={handleShuffle}
            />
          )}

          {activeTab === 'match' && (
            <MatchingView
              words={activeWords}
              language={language}
              onRecordReview={onRecordReview}
              onRestart={handleShuffle}
            />
          )}
        </div>
      )}
    </div>
  );
};
