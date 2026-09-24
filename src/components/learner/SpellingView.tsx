import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Check, ArrowRight, Lightbulb, RotateCcw, Award } from 'lucide-react';
import confetti from 'canvas-confetti';
import type { WordItem, Language } from '../../types/vocabulary';
import { speechService } from '../../services/speech';

interface SpellingViewProps {
  words: WordItem[];
  language: Language;
  onRecordReview: (wordId: string, wasCorrect: boolean) => void;
  onRestart: () => void;
}

export const SpellingView: React.FC<SpellingViewProps> = ({
  words,
  language,
  onRecordReview,
  onRestart,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [revealedHints, setRevealedHints] = useState(0);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const currentWord = words[currentIndex];

  useEffect(() => {
    if (currentWord && !isFinished) {
      speechService.speak(currentWord.word, language);
      inputRef.current?.focus();
    }
  }, [currentIndex, currentWord, language, isFinished]);

  const normalize = (str: string) => str.trim().toLowerCase().replace(/[.,!?;:]/g, '');

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isSubmitted || !currentWord || !userInput.trim()) return;

    const correct = normalize(userInput) === normalize(currentWord.word);
    setIsCorrect(correct);
    setIsSubmitted(true);

    if (correct) {
      setScore(prev => prev + 1);
    }
    onRecordReview(currentWord.id, correct);
  };

  const handleNext = () => {
    if (currentIndex + 1 < words.length) {
      setCurrentIndex(prev => prev + 1);
      setUserInput('');
      setIsSubmitted(false);
      setIsCorrect(null);
      setRevealedHints(0);
    } else {
      setIsFinished(true);
      confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });
    }
  };

  const handleRevealHint = () => {
    if (!currentWord) return;
    setRevealedHints(prev => Math.min(currentWord.word.length - 1, prev + 1));
  };

  if (!words || words.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Keine Vokabeln vorhanden.</p>
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
        <h2 style={{ fontSize: '1.85rem', marginBottom: '0.5rem' }}>Schreibtraining abgeschlossen!</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Du hast <strong style={{ color: '#fff' }}>{score}</strong> von{' '}
          <strong style={{ color: '#fff' }}>{words.length}</strong> Wörtern fehlerfrei geschrieben.
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
            setUserInput('');
            setIsSubmitted(false);
            setIsCorrect(null);
            setRevealedHints(0);
            setScore(0);
            setIsFinished(false);
            onRestart();
          }}
          className="btn btn-primary btn-lg"
        >
          <RotateCcw size={18} />
          <span>Noch einmal üben</span>
        </button>
      </div>
    );
  }

  const targetChars = currentWord.word.split('');
  const hintDisplay = targetChars.map((char, i) => {
    if (char === ' ' || char === '-') return char;
    if (i < revealedHints) return char;
    return '_';
  }).join(' ');

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary-light)' }}>
          {currentWord.lesson}
        </span>
        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
          Wort {currentIndex + 1} von {words.length} • Richtig: {score}
        </span>
      </div>

      <div
        className="glass-panel"
        style={{
          padding: '2.5rem 2rem',
          textAlign: 'center',
          marginBottom: '1.5rem',
        }}
      >
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
          Höre das Wort und tippe es auf {language === 'en' ? 'Englisch' : 'Latein'}
        </span>

        <div style={{ margin: '1.25rem 0' }}>
          <button
            type="button"
            onClick={() => speechService.speak(currentWord.word, language)}
            className="speaker-btn is-speaking"
            style={{ width: '64px', height: '64px', margin: '0 auto' }}
            title="Wort noch einmal anhören"
          >
            <Volume2 size={30} />
          </button>
        </div>

        <div
          style={{
            fontSize: '1.4rem',
            fontWeight: 700,
            color: 'var(--primary-light)',
            marginBottom: '0.5rem',
          }}
        >
          🇩🇪 {currentWord.translation}
        </div>

        {currentWord.notes && (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Hinweis: {currentWord.notes}
          </p>
        )}

        {revealedHints > 0 && (
          <div
            className="animate-fade-in"
            style={{
              marginTop: '1rem',
              letterSpacing: '0.25em',
              fontFamily: 'monospace',
              fontSize: '1.3rem',
              color: 'var(--warning)',
              fontWeight: 700,
            }}
          >
            {hintDisplay}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
          <input
            ref={inputRef}
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            disabled={isSubmitted}
            placeholder={`Tippe das Wort auf ${language === 'en' ? 'Englisch' : 'Latein'}...`}
            className="input-field"
            style={{
              fontSize: '1.2rem',
              padding: '0.85rem 1.25rem',
              borderColor: isSubmitted
                ? isCorrect
                  ? 'var(--success)'
                  : 'var(--danger)'
                : undefined,
              boxShadow: isSubmitted && isCorrect ? '0 0 16px rgba(16, 185, 129, 0.3)' : undefined,
            }}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />

          {!isSubmitted ? (
            <button
              type="submit"
              disabled={!userInput.trim()}
              className="btn btn-primary"
              style={{ padding: '0 1.5rem', minWidth: '110px' }}
            >
              <Check size={18} />
              <span>Prüfen</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="btn btn-primary"
              style={{ padding: '0 1.5rem', minWidth: '110px' }}
            >
              <span>Weiter</span>
              <ArrowRight size={18} />
            </button>
          )}
        </div>

        {!isSubmitted && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <button
              type="button"
              onClick={handleRevealHint}
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--warning)', gap: '0.35rem' }}
            >
              <Lightbulb size={15} />
              <span>Buchstaben-Tipp aufdecken ({revealedHints}/{currentWord.word.length})</span>
            </button>
          </div>
        )}
      </form>

      {isSubmitted && (
        <div
          className="animate-fade-in"
          style={{
            marginTop: '1.25rem',
            padding: '1.25rem',
            borderRadius: 'var(--radius-md)',
            background: isCorrect ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${isCorrect ? 'var(--success)' : 'var(--danger)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: isCorrect ? 'var(--success)' : 'var(--danger)', marginBottom: '0.2rem' }}>
              {isCorrect ? '🎉 Perfekt geschrieben!' : '❌ Nicht ganz richtig!'}
            </div>
            {!isCorrect && (
              <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                Richtige Schreibweise: <strong style={{ color: 'var(--success)', fontSize: '1.1rem' }}>{currentWord.word}</strong>
              </div>
            )}
            {currentWord.exampleSentence && (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem', fontStyle: 'italic' }}>
                "{currentWord.exampleSentence}"
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleNext}
            className="btn btn-secondary btn-sm"
          >
            <span>[Enter] Weiter</span>
          </button>
        </div>
      )}
    </div>
  );
};
