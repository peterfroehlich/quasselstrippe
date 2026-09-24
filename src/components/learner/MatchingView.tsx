import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, RotateCcw, Clock } from 'lucide-react';
import confetti from 'canvas-confetti';
import type { WordItem, Language } from '../../types/vocabulary';
import { speechService } from '../../services/speech';

interface MatchingViewProps {
  words: WordItem[];
  language: Language;
  onRecordReview: (wordId: string, wasCorrect: boolean) => void;
  onRestart: () => void;
}

interface MatchCard {
  id: string;
  wordId: string;
  text: string;
  type: 'word' | 'translation';
  isMatched: boolean;
}

export const MatchingView: React.FC<MatchingViewProps> = ({
  words,
  language,
  onRecordReview,
  onRestart,
}) => {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
  const [wrongPair, setWrongPair] = useState<[string, string] | null>(null);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  const gameWords = useMemo(() => {
    return [...words].sort(() => 0.5 - Math.random()).slice(0, 6);
  }, [words]);

  const cards: MatchCard[] = useMemo(() => {
    const list: MatchCard[] = [];
    gameWords.forEach(w => {
      list.push({
        id: `word-${w.id}`,
        wordId: w.id,
        text: w.word,
        type: 'word',
        isMatched: false,
      });
      list.push({
        id: `trans-${w.id}`,
        wordId: w.id,
        text: w.translation,
        type: 'translation',
        isMatched: false,
      });
    });
    return list.sort(() => 0.5 - Math.random());
  }, [gameWords]);

  useEffect(() => {
    let interval: number;
    if (isTimerRunning && matchedIds.size < gameWords.length) {
      interval = window.setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, matchedIds.size, gameWords.length]);

  const handleCardClick = (card: MatchCard) => {
    if (matchedIds.has(card.wordId) || card.id === selectedCardId || wrongPair) return;

    if (card.type === 'word') {
      speechService.speak(card.text, language);
    }

    if (!selectedCardId) {
      setSelectedCardId(card.id);
    } else {
      setMoves(m => m + 1);
      const firstCard = cards.find(c => c.id === selectedCardId);
      if (!firstCard) return;

      if (firstCard.wordId === card.wordId && firstCard.type !== card.type) {
        const newMatched = new Set(matchedIds);
        newMatched.add(card.wordId);
        setMatchedIds(newMatched);
        setSelectedCardId(null);
        onRecordReview(card.wordId, true);

        if (newMatched.size === gameWords.length) {
          setIsTimerRunning(false);
          confetti({ particleCount: 110, spread: 85, origin: { y: 0.6 } });
        }
      } else {
        setWrongPair([firstCard.id, card.id]);
        setTimeout(() => {
          setWrongPair(null);
          setSelectedCardId(null);
        }, 900);
      }
    }
  };

  const isCompleted = gameWords.length > 0 && matchedIds.size === gameWords.length;

  if (gameWords.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Nicht genügend Vokabeln für das Paare-Spiel.</p>
      </div>
    );
  }

  if (isCompleted) {
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
          <Sparkles size={36} />
        </div>
        <h2 style={{ fontSize: '1.85rem', marginBottom: '0.5rem' }}>Hervorragend!</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Du hast alle {gameWords.length} Paare in <strong style={{ color: '#fff' }}>{seconds} Sekunden</strong> und{' '}
          <strong style={{ color: '#fff' }}>{moves} Zügen</strong> gefunden.
        </p>

        <button
          type="button"
          onClick={() => {
            setMatchedIds(new Set());
            setSelectedCardId(null);
            setMoves(0);
            setSeconds(0);
            setIsTimerRunning(true);
            onRestart();
          }}
          className="btn btn-primary btn-lg"
        >
          <RotateCcw size={18} />
          <span>Neue Runde spielen</span>
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          background: 'var(--bg-surface-elevated)',
          padding: '0.75rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Gefunden: <strong style={{ color: 'var(--success)' }}>{matchedIds.size} / {gameWords.length} Paaren</strong>
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            <Clock size={16} />
            <span>{seconds}s</span>
          </span>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Züge: <strong style={{ color: '#fff' }}>{moves}</strong>
          </span>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '1rem',
        }}
      >
        {cards.map(card => {
          const isMatched = matchedIds.has(card.wordId);
          const isSelected = card.id === selectedCardId;
          const isWrong = wrongPair?.includes(card.id);

          let bg = 'var(--bg-surface-glass)';
          let border = '1px solid var(--border-medium)';
          let textColor = 'var(--text-primary)';
          let shadow = 'var(--shadow-sm)';

          if (isMatched) {
            bg = 'rgba(16, 185, 129, 0.15)';
            border = '1px solid var(--success)';
            textColor = '#6ee7b7';
          } else if (isSelected) {
            bg = 'rgba(99, 102, 241, 0.25)';
            border = '2px solid var(--primary)';
            textColor = '#ffffff';
            shadow = '0 0 15px rgba(99, 102, 241, 0.4)';
          } else if (isWrong) {
            bg = 'rgba(239, 68, 68, 0.2)';
            border = '1px solid var(--danger)';
            textColor = '#fca5a5';
          }

          return (
            <button
              key={card.id}
              type="button"
              onClick={() => handleCardClick(card)}
              disabled={isMatched}
              style={{
                background: bg,
                border: border,
                borderRadius: 'var(--radius-md)',
                color: textColor,
                boxShadow: shadow,
                minHeight: '100px',
                padding: '1.25rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                fontSize: card.type === 'word' ? '1.15rem' : '0.98rem',
                fontWeight: card.type === 'word' ? 700 : 500,
                cursor: isMatched ? 'default' : 'pointer',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                transform: isSelected ? 'scale(1.03)' : 'none',
                opacity: isMatched ? 0.6 : 1,
              }}
            >
              {card.text}
            </button>
          );
        })}
      </div>
    </div>
  );
};
