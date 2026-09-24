import React, { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { speechService } from '../../services/speech';
import type { Language } from '../../types/vocabulary';

interface AudioButtonProps {
  text: string;
  language: Language;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'circle' | 'pill';
  label?: string;
  className?: string;
  rate?: number;
}

export const AudioButton: React.FC<AudioButtonProps> = ({
  text,
  language,
  size = 'md',
  variant = 'circle',
  label,
  className = '',
  rate = 0.88,
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

  const iconSizes = {
    sm: 15,
    md: 19,
    lg: 24,
  };

  const icon = hasError ? (
    <VolumeX size={iconSizes[size]} color="#ef4444" />
  ) : (
    <Volume2 size={iconSizes[size]} />
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
    sm: { width: '32px', height: '32px' },
    md: { width: '42px', height: '42px' },
    lg: { width: '52px', height: '52px' },
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`speaker-btn ${isSpeaking ? 'is-speaking' : ''} ${className}`}
      style={dimensionStyles[size]}
      title={`Anhören (${language === 'en' ? 'Englisch' : 'Latein'})`}
      aria-label={`Aussprache für ${text}`}
    >
      {icon}
    </button>
  );
};
