import { isReviewDue } from '../../services/learning';
import React, { useState, useMemo } from 'react';
import { 
  Layers, 
  HelpCircle, 
  Pencil,
  Keyboard,
  Grid, 
  Filter, 
  Shuffle, 
  Flame 
} from 'lucide-react';
import type { WordItem, Language, StudyMode } from '../../types/vocabulary';
import { FlashcardView } from './FlashcardView';
import { QuizView } from './QuizView';
import { SpellingView } from './SpellingView';
import { MatchingView } from './MatchingView';
import { WritingView } from './WritingView';

interface LearnerDashboardProps {
  words: WordItem[];
  language: Language;
  onRecordReview: (wordId: string, wasCorrect: boolean, promote?: boolean) => Promise<void>;
  autoPlayAudio: boolean;
  geminiApiKey?: string;
  aiAvailable?: boolean;
}

export const LearnerDashboard: React.FC<LearnerDashboardProps> = ({
  words,
  language,
  onRecordReview,
  autoPlayAudio,
  geminiApiKey,
}) => {
  const [activeTab, setActiveTab] = useState<StudyMode>('flashcards');
  const [selectedLesson, setSelectedLesson] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<'all' | 'difficult'>('all');
  const [reviewFilter, setReviewFilter] = useState<'due' | 'all'>('due');
  const [shuffleKey, setShuffleKey] = useState(0);

  const languageWords = useMemo(() => {
    return words.filter(w => w.language === language);
  }, [words, language]);

  const lessons = useMemo(() => {
    const list = Array.from(new Set(languageWords.map(w => w.lesson))).filter(Boolean);
    return list.sort();
  }, [languageWords]);

  const activeWordIds = useMemo(() => {
    let pool = reviewFilter === 'due' ? languageWords.filter(w => isReviewDue(w)) : languageWords;
    if (selectedLesson !== 'all') {
      pool = pool.filter(w => w.lesson === selectedLesson);
    }
    if (filterDifficulty === 'difficult') {
      pool = pool.filter(w => w.box <= 2);
    }
    return [...pool].sort(() => 0.5 - Math.random()).map(w => w.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, selectedLesson, filterDifficulty, reviewFilter, shuffleKey, languageWords.map(w => w.id).sort().join(',')]);

  const activeWords = useMemo(() => {
    const wordMap = new Map(languageWords.map(w => [w.id, w]));
    return activeWordIds.map(id => wordMap.get(id)).filter(Boolean) as WordItem[];
  }, [activeWordIds, languageWords]);

  const totalInLanguage = languageWords.length;
  const needPractice = languageWords.filter(w => w.box <= 2).length;

  const handleShuffle = () => {
    setShuffleKey(k => k + 1);
  };

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto', padding: '1.25rem 0.85rem calc(3rem + env(safe-area-inset-bottom, 0px)) 0.85rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <button className={`btn btn-sm ${reviewFilter === 'due' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setReviewFilter('due')}>Heute fällig ({languageWords.filter(w => isReviewDue(w)).length})</button>
        <button className={`btn btn-sm ${reviewFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setReviewFilter('all')}>Alle Wörter üben</button>
      </div>
      <div className="learner-filter-bar">
        <div className="learner-filter-select-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: '1 1 280px' }}>
          <Filter size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          <select
            value={selectedLesson}
            onChange={(e) => setSelectedLesson(e.target.value)}
            className="input-field"
            style={{ padding: '0.55rem 0.85rem', fontSize: '0.9rem', width: '100%' }}
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

        <div className="learner-filter-buttons-row">
          <button
            type="button"
            onClick={() => setFilterDifficulty(prev => prev === 'all' ? 'difficult' : 'all')}
            className={`btn btn-sm ${filterDifficulty === 'difficult' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ minHeight: '40px', padding: '0.5rem 0.85rem', whiteSpace: 'nowrap' }}
            title="Nur Vokabeln anzeigen, die noch im Kasten 1 oder 2 liegen"
          >
            <Flame size={15} color={filterDifficulty === 'difficult' ? '#fff' : 'var(--warning)'} />
            <span>Problemwörter ({needPractice})</span>
          </button>

          <button
            type="button"
            onClick={handleShuffle}
            className="btn btn-secondary btn-sm"
            style={{ minHeight: '40px', padding: '0.5rem 0.85rem', whiteSpace: 'nowrap' }}
            title="Karten neu mischen"
          >
            <Shuffle size={15} />
            <span>Mischen</span>
          </button>
        </div>
      </div>

      <div className="scrollable-tabs-bar">
        <button
          type="button"
          onClick={() => setActiveTab('flashcards')}
          className="learner-tab-btn"
          style={{
            background: activeTab === 'flashcards' ? 'var(--primary-gradient)' : 'var(--bg-surface-elevated)',
            color: activeTab === 'flashcards' ? '#fff' : 'var(--text-secondary)',
            border: activeTab === 'flashcards' ? 'none' : '1px solid var(--border-subtle)',
            boxShadow: activeTab === 'flashcards' ? '0 2px 10px rgba(99, 102, 241, 0.4)' : 'none',
          }}
        >
          <Layers size={16} />
          <span>Karteikarten</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('quiz')}
          className="learner-tab-btn"
          style={{
            background: activeTab === 'quiz' ? 'var(--primary-gradient)' : 'var(--bg-surface-elevated)',
            color: activeTab === 'quiz' ? '#fff' : 'var(--text-secondary)',
            border: activeTab === 'quiz' ? 'none' : '1px solid var(--border-subtle)',
            boxShadow: activeTab === 'quiz' ? '0 2px 10px rgba(99, 102, 241, 0.4)' : 'none',
          }}
        >
          <HelpCircle size={16} />
          <span>Vokabeltest</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('writing')}
          className="learner-tab-btn"
          style={{
            background: activeTab === 'writing' ? 'var(--primary-gradient)' : 'var(--bg-surface-elevated)',
            color: activeTab === 'writing' ? '#fff' : 'var(--text-secondary)',
            border: activeTab === 'writing' ? 'none' : '1px solid var(--border-subtle)',
            boxShadow: activeTab === 'writing' ? '0 2px 10px rgba(99, 102, 241, 0.4)' : 'none',
          }}
        >
          <Pencil size={16} />
          <span>Schreiben</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('spelling')}
          className="learner-tab-btn"
          style={{
            background: activeTab === 'spelling' ? 'var(--primary-gradient)' : 'var(--bg-surface-elevated)',
            color: activeTab === 'spelling' ? '#fff' : 'var(--text-secondary)',
            border: activeTab === 'spelling' ? 'none' : '1px solid var(--border-subtle)',
            boxShadow: activeTab === 'spelling' ? '0 2px 10px rgba(99, 102, 241, 0.4)' : 'none',
          }}
        >
          <Keyboard size={16} />
          <span>Tastatur-Training</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('match')}
          className="learner-tab-btn"
          style={{
            background: activeTab === 'match' ? 'var(--primary-gradient)' : 'var(--bg-surface-elevated)',
            color: activeTab === 'match' ? '#fff' : 'var(--text-secondary)',
            border: activeTab === 'match' ? 'none' : '1px solid var(--border-subtle)',
            boxShadow: activeTab === 'match' ? '0 2px 10px rgba(99, 102, 241, 0.4)' : 'none',
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
              setReviewFilter('all');
            }}
            className="btn btn-secondary"
          >
            Filter zurücksetzen
          </button>
        </div>
      ) : (
        <div key={`${activeTab}-${shuffleKey}-${selectedLesson}-${filterDifficulty}-${reviewFilter}-${activeWordIds.join(",")}`}>
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
              autoPlayAudio={autoPlayAudio}
              words={activeWords}
              allWords={languageWords}
              language={language}
              onRecordReview={onRecordReview}
              onRestart={handleShuffle}
            />
          )}

          {activeTab === 'writing' && (
            <WritingView
              autoPlayAudio={autoPlayAudio}
              words={activeWords}
              allWords={languageWords}
              language={language}
              onRecordReview={onRecordReview}
              onRestart={handleShuffle}
              apiKey={geminiApiKey}
              selectedLesson={selectedLesson}
              availableLessons={lessons}
              onSelectLesson={setSelectedLesson}
            />
          )}

          {activeTab === 'spelling' && (
            <SpellingView
              autoPlayAudio={autoPlayAudio}
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
