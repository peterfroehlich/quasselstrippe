import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  RotateCw, 
  Check, 
  X, 
  HelpCircle, 
  Sparkles, 
  Layers
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PART_OF_SPEECH_LABELS } from '../../types/vocabulary';
import type { WordItem, Language } from '../../types/vocabulary';
import { AudioButton } from '../common/AudioButton';
import { speechService } from '../../services/speech';

interface FlashcardViewProps {
  words: WordItem[];
  language: Language;
  onRecordReview: (wordId: string, wasCorrect: boolean) => void;
  onRestart: () => void;
  autoPlayAudio?: boolean;
}

export const FlashcardView: React.FC<FlashcardViewProps> = ({
  words,
  language,
  onRecordReview,
  onRestart,
  autoPlayAudio = true,
}) => {
  // Session queue (deck): contains words that still need to be mastered in this session
  const [deck, setDeck] = useState<WordItem[]>(() => [...words]);
  const [initialTotal, setInitialTotal] = useState(() => words.length);
  const [masteredCount, setMasteredCount] = useState(0);

  const [isFlipped, setIsFlipped] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [sessionStats, setSessionStats] = useState({ correct: 0, reviewAgain: 0 });

  const currentWord = deck[0] || null;
  // backWord holds the content displayed on the back of the card.
  // When flipping back after answering, it remains the previous word until the card faces front,
  // preventing the user from seeing the new word's answer!
  const [backWord, setBackWord] = useState<WordItem | null>(() => words[0] || null);

  const wordsIdFingerprint = useMemo(() => {
    return words.map(w => w.id).sort().join(',');
  }, [words]);

  // Synchronize deck only if the incoming pool of word IDs changes (e.g. lesson filter change)
  useEffect(() => {
    setDeck([...words]);
    setInitialTotal(words.length);
    setMasteredCount(0);
    setBackWord(words[0] || null);
    setIsFlipped(false);
    setIsTransitioning(false);
    setShowHint(false);
    setCompleted(false);
    setSessionStats({ correct: 0, reviewAgain: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordsIdFingerprint]);

  // Auto-play audio when new card appears facing front and transition is done
  useEffect(() => {
    if (autoPlayAudio && currentWord && !isFlipped && !completed && !isTransitioning) {
      speechService.speak(currentWord.word, language);
    }
  }, [currentWord, language, autoPlayAudio, isFlipped, completed, isTransitioning]);

  const handleFlip = useCallback(() => {
    if (isTransitioning || !currentWord) return;
    setIsFlipped(prev => {
      const next = !prev;
      if (next) {
        // Flipping to back: ensure back face displays currentWord
        setBackWord(currentWord);
      }
      return next;
    });
  }, [isTransitioning, currentWord]);

  const handleResponse = useCallback((wasCorrect: boolean) => {
    if (!currentWord || isTransitioning) return;

    onRecordReview(currentWord.id, wasCorrect);

    setSessionStats(prev => ({
      correct: prev.correct + (wasCorrect ? 1 : 0),
      reviewAgain: prev.reviewAgain + (wasCorrect ? 0 : 1),
    }));

    if (wasCorrect) {
      // 1. "Gewusst!": Card is mastered in this session -> DO NOT REPEAT!
      const nextMasteredCount = masteredCount + 1;
      setMasteredCount(nextMasteredCount);

      const nextDeck = deck.slice(1);

      if (nextDeck.length === 0) {
        // All cards in session mastered!
        if (isFlipped) {
          setIsTransitioning(true);
          setIsFlipped(false);
          setTimeout(() => {
            setCompleted(true);
            setIsTransitioning(false);
            confetti({
              particleCount: 80,
              spread: 70,
              origin: { y: 0.6 },
            });
          }, 380);
        } else {
          setCompleted(true);
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
        }
        return;
      }

      const nextWord = nextDeck[0];

      if (isFlipped) {
        // Card is currently flipped: animate back to front (0°)
        setIsTransitioning(true);
        setIsFlipped(false);
        setShowHint(false);
        // Update front of card to next question
        setDeck(nextDeck);
        // Keep back face showing currentWord during flip (380ms) so next answer is hidden!
        setTimeout(() => {
          setBackWord(nextWord);
          setIsTransitioning(false);
        }, 380);
      } else {
        // Not flipped: advance immediately
        setDeck(nextDeck);
        setBackWord(nextWord);
        setShowHint(false);
      }
    } else {
      // 2. "Noch üben": This card was NOT known -> MUST REPEAT in this session!
      if (deck.length === 1) {
        // Only 1 card left: repeats itself
        if (isFlipped) {
          setIsTransitioning(true);
          setIsFlipped(false);
          setShowHint(false);
          setTimeout(() => {
            setIsTransitioning(false);
          }, 380);
        } else {
          setShowHint(false);
        }
      } else {
        // Move currentWord to the back of the queue so it comes up again later
        const nextDeck = [...deck.slice(1), currentWord];
        const nextWord = nextDeck[0];

        if (isFlipped) {
          setIsTransitioning(true);
          setIsFlipped(false);
          setShowHint(false);
          setDeck(nextDeck);
          // Keep back face showing currentWord during flip (380ms)
          setTimeout(() => {
            setBackWord(nextWord);
            setIsTransitioning(false);
          }, 380);
        } else {
          setDeck(nextDeck);
          setBackWord(nextWord);
          setShowHint(false);
        }
      }
    }
  }, [currentWord, isTransitioning, onRecordReview, masteredCount, deck, isFlipped]);

  // Keyboard navigation: Space to flip, 1 for retry, 2 for correct
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (completed || isTransitioning) return;
      if (e.code === 'Space') {
        e.preventDefault();
        handleFlip();
      } else if (e.key === '1') {
        e.preventDefault();
        handleResponse(false);
      } else if (e.key === '2') {
        e.preventDefault();
        handleResponse(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [completed, isTransitioning, handleFlip, handleResponse]);

  const handleRestartSession = () => {
    setDeck([...words]);
    setInitialTotal(words.length);
    setMasteredCount(0);
    setBackWord(words[0] || null);
    setIsFlipped(false);
    setIsTransitioning(false);
    setShowHint(false);
    setCompleted(false);
    setSessionStats({ correct: 0, reviewAgain: 0 });
    onRestart();
  };

  if (!words || words.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Keine Vokabeln für diese Lektion gefunden.
        </p>
      </div>
    );
  }

  if (completed) {
    const totalAttempts = sessionStats.correct + sessionStats.reviewAgain;
    const percentage = totalAttempts > 0 ? Math.round((sessionStats.correct / totalAttempts) * 100) : 100;
    return (
      <div className="glass-panel animate-fade-in" style={{ padding: '3.5rem 2rem', textAlign: 'center', maxWidth: '580px', margin: '0 auto' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--success-bg)',
            color: 'var(--success)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.25rem',
            border: '2px solid rgba(16, 185, 129, 0.4)',
          }}
        >
          <Sparkles size={32} />
        </div>
        <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Lernsession abgeschlossen! 🎉</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.75rem' }}>
          Du hast alle {initialTotal} Karteikarten dieser Einheit erfolgreich gemeistert!
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            marginBottom: '2rem',
          }}
        >
          <div style={{ background: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--success)' }}>
              {sessionStats.correct}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Sofort gewusst</div>
          </div>
          <div style={{ background: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--warning)' }}>
              {sessionStats.reviewAgain}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Wiederholungen geübt</div>
          </div>
        </div>

        <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '2rem', color: 'var(--primary-light)' }}>
          Erfolgsquote: {percentage}%
        </div>

        <button
          type="button"
          onClick={handleRestartSession}
          className="btn btn-primary btn-lg"
        >
          <RotateCw size={18} />
          <span>Noch einmal üben</span>
        </button>
      </div>
    );
  }

  if (!currentWord) {
    return null;
  }

  const posConfig = PART_OF_SPEECH_LABELS[currentWord.partOfSpeech] || PART_OF_SPEECH_LABELS.other;
  const cardBackData = backWord || currentWord;

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      {/* Progress & Meta Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
          padding: '0 0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span
            className="badge"
            style={{
              background: 'rgba(99, 102, 241, 0.15)',
              color: 'var(--primary-light)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
            }}
          >
            {currentWord.lesson}
          </span>
          <span
            className="badge"
            style={{
              background: `${posConfig.color}20`,
              color: posConfig.color,
              border: `1px solid ${posConfig.color}40`,
            }}
          >
            {posConfig.de}
          </span>
        </div>

        {/* Leitner Box Level */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }} title={`Leitner Kasten ${currentWord.box} von 5`}>
          <Layers size={14} color="var(--text-muted)" />
          <div style={{ display: 'flex', gap: '3px' }}>
            {[1, 2, 3, 4, 5].map(b => (
              <div
                key={b}
                style={{
                  width: '8px',
                  height: '14px',
                  borderRadius: '2px',
                  background: b <= currentWord.box ? 'var(--primary)' : 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.2rem' }}>
            Kasten {currentWord.box}
          </span>
        </div>
      </div>

      {/* 3D Flip Card */}
      <div className="perspective-container">
        <div
          className={`flip-card-inner ${isFlipped ? 'is-flipped' : ''}`}
          onClick={handleFlip}
          role="button"
          tabIndex={0}
          aria-label="Karteikarte anklicken zum Umdrehen"
        >
          {/* Card Front (Target Language) */}
          <div className="flip-card-face">
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                {language === 'en' ? 'Englisch' : 'Latein'}
              </span>
              <AudioButton
                text={currentWord.word}
                language={language}
                size="md"
              />
            </div>

            <div style={{ margin: 'auto 0', padding: '1.5rem 0' }}>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '2.5rem',
                  fontWeight: 800,
                  color: '#ffffff',
                  marginBottom: '0.5rem',
                  letterSpacing: '-0.02em',
                }}
              >
                {currentWord.word}
              </div>

              {currentWord.phonetic && (
                <div style={{ fontSize: '1rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  {currentWord.phonetic}
                </div>
              )}

              {/* Optional hint: Example sentence in English */}
              {showHint && currentWord.exampleSentence && (
                <div
                  className="animate-fade-in"
                  style={{
                    marginTop: '1.25rem',
                    padding: '0.75rem 1rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.95rem',
                    color: 'var(--text-secondary)',
                    fontStyle: 'italic',
                    maxWidth: '460px',
                  }}
                >
                  "{currentWord.exampleSentence}"
                </div>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '1rem',
              }}
            >
              {currentWord.exampleSentence ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowHint(prev => !prev);
                  }}
                  className="btn btn-ghost btn-sm"
                  style={{ color: showHint ? 'var(--primary-light)' : 'var(--text-muted)' }}
                >
                  <HelpCircle size={15} />
                  <span>{showHint ? 'Beispielsatz verbergen' : 'Beispielsatz anzeigen'}</span>
                </button>
              ) : <div />}

              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <RotateCw size={13} />
                <span>Klicken zum Umdrehen</span>
              </span>
            </div>
          </div>

          {/* Card Back (German Meaning) */}
          <div
            className="flip-card-face flip-card-back"
            style={{
              opacity: isTransitioning ? 0 : 1,
              transition: isTransitioning ? 'opacity 0.15s ease' : 'opacity 0.25s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--primary-light)', fontWeight: 600 }}>
                Bedeutung auf Deutsch
              </span>
              <AudioButton
                text={cardBackData.word}
                language={language}
                size="md"
              />
            </div>

            <div style={{ margin: 'auto 0', padding: '1rem 0' }}>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '2.1rem',
                  fontWeight: 800,
                  color: '#ffffff',
                  marginBottom: '0.75rem',
                  lineHeight: 1.25,
                }}
              >
                {cardBackData.translation}
              </div>

              {cardBackData.notes && (
                <div
                  style={{
                    display: 'inline-block',
                    background: 'rgba(99, 102, 241, 0.15)',
                    color: 'var(--primary-light)',
                    padding: '0.35rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem',
                    marginBottom: '1rem',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                  }}
                >
                  💡 {cardBackData.notes}
                </div>
              )}

              {cardBackData.exampleSentence && (
                <div
                  style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    padding: '0.85rem 1.1rem',
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'left',
                    maxWidth: '480px',
                    margin: '0 auto',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <p style={{ fontSize: '0.95rem', color: '#ffffff', marginBottom: '0.25rem', fontStyle: 'italic' }}>
                    "{cardBackData.exampleSentence}"
                  </p>
                  {cardBackData.exampleTranslation && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      🇩🇪 {cardBackData.exampleTranslation}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '0.85rem',
                fontSize: '0.85rem',
                color: 'var(--text-muted)',
              }}
            >
              Original: <strong style={{ color: '#fff', marginLeft: '0.35rem' }}>{cardBackData.word}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Response Buttons */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          gap: '1rem',
          marginTop: '1.5rem',
          alignItems: 'center',
        }}
      >
        <button
          type="button"
          onClick={() => handleResponse(false)}
          disabled={isTransitioning}
          className="btn btn-secondary btn-lg"
          style={{
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#fca5a5',
            opacity: isTransitioning ? 0.6 : 1,
            cursor: isTransitioning ? 'not-allowed' : 'pointer',
          }}
          title="Taste 1 drücken"
        >
          <X size={20} />
          <span>Noch üben (1)</span>
        </button>

        <button
          type="button"
          onClick={handleFlip}
          disabled={isTransitioning}
          className="btn btn-secondary"
          style={{
            padding: '0.85rem 1rem',
            opacity: isTransitioning ? 0.6 : 1,
            cursor: isTransitioning ? 'not-allowed' : 'pointer',
          }}
          title="Leertaste drücken"
          aria-label="Umdrehen"
        >
          <RotateCw size={19} />
        </button>

        <button
          type="button"
          onClick={() => handleResponse(true)}
          disabled={isTransitioning}
          className="btn btn-success btn-lg"
          style={{
            opacity: isTransitioning ? 0.6 : 1,
            cursor: isTransitioning ? 'not-allowed' : 'pointer',
          }}
          title="Taste 2 drücken"
        >
          <Check size={20} />
          <span>Gewusst! (2)</span>
        </button>
      </div>

      {/* Step Indicator */}
      <div
        style={{
          marginTop: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
          padding: '0 0.5rem',
        }}
      >
        <span>
          {masteredCount} von {initialTotal} gemeistert {deck.length > 0 ? `(${deck.length} im Stapel)` : ''}
        </span>
        <div style={{ flex: 1, margin: '0 1rem', background: 'var(--bg-surface-elevated)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
          <div
            style={{
              width: `${Math.min(100, Math.round((masteredCount / (initialTotal || 1)) * 100))}%`,
              height: '100%',
              background: 'var(--primary-gradient)',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        <span>Tipp: [Leertaste] = Umdrehen</span>
      </div>
    </div>
  );
};
