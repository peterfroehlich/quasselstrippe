import React, { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { speechService } from '../../services/speech';
import type { Language } from '../../types/vocabulary';

interface AudioButtonProps {
  text: string;
  language: Language;
  size?: 'sm' | 'md' | 'lg';
  iconSize?: number;
  variant?: 'circle' | 'pill';
  label?: string;
  className?: string;
  rate?: number;
  style?: React.CSSProperties;
  title?: string;
}

export const AudioButton: React.FC<AudioButtonProps> = ({
  text,
  language,
  size = 'md',
  iconSize,
  variant = 'circle',
  label,
  className = '',
  rate,
  style,
  title,
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSpeaking) {
      speechService.stop();
      setIsSpeaking(false);
      return;
    }

    setHasError(false);
    speechService.speak(text, language, {
      rate,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: (err) => {
        console.warn('Audio playback error', err);
        setIsSpeaking(false);
        setHasError(true);
      },
    });
  };

  const defaultIconSizes = {
    sm: 18,
    md: 22,
    lg: 26,
  };

  const resolvedIconSize = iconSize ?? defaultIconSizes[size];

  const icon = hasError ? (
    <VolumeX size={resolvedIconSize} color="#ef4444" />
  ) : (
    <Volume2 size={resolvedIconSize} />
  );

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`btn btn-secondary ${size === 'sm' ? 'btn-sm' : ''} ${className}`}
        style={{
          borderColor: isSpeaking ? 'var(--primary)' : undefined,
          color: isSpeaking ? 'var(--primary-light)' : undefined,
          gap: '0.4rem',
          minHeight: '44px',
          minWidth: '44px',
        }}
        title={`Anhören (${language === 'en' ? 'Englisch' : 'Latein'})`}
        aria-label={`Aussprache für ${text}`}
      >
        <span style={{ display: 'inline-flex', animation: isSpeaking ? 'pulse-ring 1s infinite' : 'none' }}>
          {icon}
        </span>
        {label && <span>{label}</span>}
      </button>
    );
  }

  const dimensionStyles = {
    sm: { width: '34px', height: '34px', minWidth: '34px', minHeight: '34px' },
    md: { width: '44px', height: '44px', minWidth: '44px', minHeight: '44px' },
    lg: { width: '54px', height: '54px', minWidth: '54px', minHeight: '54px' },
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`speaker-btn ${isSpeaking ? 'is-speaking' : ''} ${className}`}
      style={{ ...dimensionStyles[size], ...style }}
      title={title || `Anhören (${language === 'en' ? 'Englisch' : 'Latein'})`}
      aria-label={`Aussprache für ${text}`}
    >
      {icon}
    </button>
  );
};
