import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircle2, XCircle, RotateCcw, Award } from 'lucide-react';
import confetti from 'canvas-confetti';
import type { WordItem, Language } from '../../types/vocabulary';
import { AudioButton } from '../common/AudioButton';
import { speechService } from '../../services/speech';

interface QuizViewProps {
  words: WordItem[];
  allWords: WordItem[];
  language: Language;
  onRecordReview: (wordId: string, wasCorrect: boolean) => void;
  onRestart: () => void;
}

export const QuizView: React.FC<QuizViewProps> = ({
  words,
  allWords,
  language,
  onRecordReview,
  onRestart,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const currentWord = words[currentIndex];

  const options = useMemo(() => {
    if (!currentWord) return [];

    const pool = allWords.filter(w => w.id !== currentWord.id && w.language === language);
    const shuffledPool = [...pool].sort(() => 0.5 - Math.random());
    const distractors = shuffledPool.slice(0, 3).map(w => w.translation);

    const allChoices = [...distractors, currentWord.translation];
    return allChoices.sort(() => 0.5 - Math.random());
  }, [currentWord, allWords, language]);

  useEffect(() => {
    if (currentWord && !isAnswered && !isFinished) {
      speechService.speak(currentWord.word, language);
    }
  }, [currentIndex, currentWord, language, isAnswered, isFinished]);

  const handleSelectOption = (option: string) => {
    if (isAnswered || !currentWord) return;

    setSelectedOption(option);
    setIsAnswered(true);

    const isCorrect = option === currentWord.translation;
    if (isCorrect) {
      setScore(prev => prev + 1);
    }
    onRecordReview(currentWord.id, isCorrect);
  };

  const handleNext = () => {
    if (currentIndex + 1 < words.length) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setIsFinished(true);
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
      });
    }
  };

  if (!words || words.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Keine Vokabeln zum Abfragen verfügbar.</p>
      </div>
    );
  }

  if (isFinished) {
    const percentage = Math.round((score / words.length) * 100);
    return (
      <div className="glass-panel animate-fade-in" style={{ padding: '3.5rem 2rem', textAlign: 'center', maxWidth: '580px', margin: '0 auto' }}>
        <div
          style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            background: 'var(--primary-gradient)',
            color: '#fff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.25rem',
          }}
        >
          <Award size={36} />
        </div>
        <h2 style={{ fontSize: '1.85rem', marginBottom: '0.5rem' }}>Vokabeltest abgeschlossen!</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Du hast <strong style={{ color: '#fff' }}>{score}</strong> von{' '}
          <strong style={{ color: '#fff' }}>{words.length}</strong> Vokabeln richtig beantwortet.
        </p>

        <div
          style={{
            fontSize: '2.5rem',
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            color: percentage >= 80 ? 'var(--success)' : percentage >= 50 ? 'var(--warning)' : 'var(--danger)',
            marginBottom: '2rem',
          }}
        >
          {percentage}%
        </div>

        <button
          type="button"
          onClick={() => {
            setCurrentIndex(0);
            setSelectedOption(null);
            setIsAnswered(false);
            setScore(0);
            setIsFinished(false);
            onRestart();
          }}
          className="btn btn-primary btn-lg"
        >
          <RotateCcw size={18} />
          <span>Test wiederholen</span>
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary-light)' }}>
          {currentWord.lesson}
        </span>
        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
          Frage {currentIndex + 1} von {words.length} • Punkte: {score}
        </span>
      </div>

      <div
        className="glass-panel"
        style={{
          padding: '2.5rem 2rem',
          textAlign: 'center',
          marginBottom: '1.5rem',
          border: '1px solid var(--border-medium)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <h2
            style={{
              fontSize: '2.4rem',
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-0.02em',
            }}
          >
            {currentWord.word}
          </h2>
          <AudioButton text={currentWord.word} language={language} size="md" />
        </div>

        {currentWord.phonetic && (
          <p style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.95rem' }}>
            {currentWord.phonetic}
          </p>
        )}

        <p style={{ color: 'var(--primary-light)', fontSize: '0.9rem', marginTop: '1rem' }}>
          Was bedeutet dieses Wort auf Deutsch?
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {options.map((option, idx) => {
          let btnStyle: React.CSSProperties = {
            width: '100%',
            padding: '1.1rem 1.25rem',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            fontSize: '1.05rem',
            fontWeight: 500,
            cursor: isAnswered ? 'default' : 'pointer',
            transition: 'all 0.15s ease',
          };

          const isCurrentCorrect = option === currentWord.translation;
          const isCurrentSelected = option === selectedOption;

          if (isAnswered) {
            if (isCurrentCorrect) {
              btnStyle = {
                ...btnStyle,
                background: 'rgba(16, 185, 129, 0.15)',
                borderColor: 'var(--success)',
                color: '#ffffff',
                fontWeight: 600,
              };
            } else if (isCurrentSelected && !isCurrentCorrect) {
              btnStyle = {
                ...btnStyle,
                background: 'rgba(239, 68, 68, 0.15)',
                borderColor: 'var(--danger)',
                color: '#fca5a5',
              };
            } else {
              btnStyle = {
                ...btnStyle,
                opacity: 0.45,
              };
            }
          }

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectOption(option)}
              disabled={isAnswered}
              style={btnStyle}
            >
              <span>{option}</span>
              {isAnswered && isCurrentCorrect && (
                <CheckCircle2 size={20} color="var(--success)" />
              )}
              {isAnswered && isCurrentSelected && !isCurrentCorrect && (
                <XCircle size={20} color="var(--danger)" />
              )}
            </button>
          );
        })}
      </div>

      {isAnswered && (
        <div className="animate-fade-in" style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          {currentWord.exampleSentence && (
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem', fontStyle: 'italic' }}>
              💡 "{currentWord.exampleSentence}"
            </p>
          )}

          <button
            type="button"
            onClick={handleNext}
            className="btn btn-primary btn-lg"
            style={{ width: '100%' }}
          >
            <span>{currentIndex + 1 < words.length ? 'Nächste Frage' : 'Ergebnis anzeigen'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
