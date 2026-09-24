import React from 'react';
import { 
  GraduationCap, 
  Settings, 
  Sparkles, 
  BookOpen, 
  Wrench,
  Globe
} from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../types/vocabulary';
import type { AppMode, Language, WordItem } from '../types/vocabulary';

interface HeaderProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  activeLanguage: Language;
  onLanguageChange: (lang: Language) => void;
  onOpenSettings: () => void;
  words: WordItem[];
  hasApiKey: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  mode,
  onModeChange,
  activeLanguage,
  onLanguageChange,
  onOpenSettings,
  words,
  hasApiKey,
}) => {
  const langWords = words.filter(w => w.language === activeLanguage);
  const masteredWords = langWords.filter(w => w.box >= 4);

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(13, 17, 23, 0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '0.85rem 1.5rem',
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        {/* Brand / Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'var(--primary-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-glow)',
              color: '#ffffff',
            }}
          >
            <Sparkles size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: '1.35rem',
                  letterSpacing: '-0.02em',
                  background: 'linear-gradient(to right, #ffffff, #c7d2fe)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Quasselstrippe
              </span>
              <span
                className="badge"
                style={{
                  background: 'rgba(99, 102, 241, 0.2)',
                  color: 'var(--primary-light)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                }}
              >
                School Ed.
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Intelligenter Schul-Vokabeltrainer mit Gemini KI
            </p>
          </div>
        </div>

        {/* Center: Learner vs Admin Mode Toggle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-surface-elevated)',
            padding: '4px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border-medium)',
          }}
        >
          <button
            type="button"
            onClick={() => onModeChange('learner')}
            className="btn btn-sm"
            style={{
              borderRadius: 'var(--radius-full)',
              background: mode === 'learner' ? 'var(--primary-gradient)' : 'transparent',
              color: mode === 'learner' ? '#ffffff' : 'var(--text-secondary)',
              boxShadow: mode === 'learner' ? '0 2px 8px rgba(99, 102, 241, 0.4)' : 'none',
              padding: '0.45rem 1rem',
            }}
          >
            <GraduationCap size={16} />
            <span>Lernmodus</span>
          </button>

          <button
            type="button"
            onClick={() => onModeChange('admin')}
            className="btn btn-sm"
            style={{
              borderRadius: 'var(--radius-full)',
              background: mode === 'admin' ? 'var(--primary-gradient)' : 'transparent',
              color: mode === 'admin' ? '#ffffff' : 'var(--text-secondary)',
              boxShadow: mode === 'admin' ? '0 2px 8px rgba(99, 102, 241, 0.4)' : 'none',
              padding: '0.45rem 1rem',
            }}
          >
            <Wrench size={15} />
            <span>Admin & Scanner</span>
          </button>
        </div>

        {/* Right: Language Selector & Settings */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Language Switcher */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--bg-surface-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              padding: '0.2rem 0.5rem',
            }}
          >
            <Globe size={15} color="var(--text-muted)" style={{ marginRight: '0.4rem' }} />
            <select
              value={activeLanguage}
              onChange={(e) => onLanguageChange(e.target.value as Language)}
              style={{
                background: 'transparent',
                color: 'var(--text-primary)',
                border: 'none',
                fontFamily: 'var(--font-body)',
                fontSize: '0.85rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code} style={{ background: '#1e242c', color: '#fff' }}>
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Mastery Badge in Learner Mode */}
          <div
            className="badge"
            style={{
              background: 'var(--success-bg)',
              color: 'var(--success)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              padding: '0.4rem 0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
            title={`${masteredWords.length} von ${langWords.length} Vokabeln gemeistert (Kasten 4 & 5)`}
          >
            <BookOpen size={13} />
            <span>{masteredWords.length} / {langWords.length}</span>
          </div>

          {/* Settings Button */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="btn btn-secondary btn-sm"
            style={{
              padding: '0.5rem',
              borderRadius: 'var(--radius-md)',
              position: 'relative',
            }}
            title="Einstellungen & Gemini API"
            aria-label="Einstellungen"
          >
            <Settings size={18} />
            {!hasApiKey && (
              <span
                style={{
                  position: 'absolute',
                  top: '-3px',
                  right: '-3px',
                  width: '9px',
                  height: '9px',
                  borderRadius: '50%',
                  background: 'var(--warning)',
                  border: '2px solid var(--bg-primary)',
                }}
                title="Kein Gemini API-Key hinterlegt (Demo-Modus aktiv)"
              />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
