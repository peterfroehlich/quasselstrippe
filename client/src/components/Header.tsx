import React, { useState } from 'react';
import { 
  GraduationCap, 
  Settings, 
  Sparkles, 
  BookOpen, 
  Wrench,
  Globe,
  ChevronDown,
  Check,
  UserPlus
} from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../types/vocabulary';
import type { AppMode, Language, WordItem, UserProfile } from '../types/vocabulary';

interface HeaderProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  activeLanguage: Language;
  onLanguageChange: (lang: Language) => void;
  onOpenSettings: () => void;
  words: WordItem[];
  hasApiKey: boolean;
  profiles: UserProfile[];
  activeProfile: UserProfile | null;
  onSelectProfile: (profile: UserProfile) => void;
  onOpenProfileAdmin: () => void;
  onOpenStats?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  mode,
  onModeChange,
  activeLanguage,
  onLanguageChange,
  onOpenSettings,
  words,
  hasApiKey,
  profiles,
  activeProfile,
  onSelectProfile,
  onOpenProfileAdmin,
  onOpenStats,
}) => {

  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const langWords = words.filter(w => w.language === activeLanguage);
  const masteredWords = langWords.filter(w => w.box >= 4);

  return (
    <header className="app-header">
      <div className="app-header-inner">
        {/* Desktop Layout: Single Row */}
        {/* Mobile Layout Row 1: Brand on Left, Actions on Right */}
        <div className="app-header-row-top">
          {/* Brand / Logo */}
          <div className="header-brand-group">
            <div className="header-brand-logo">
              <Sparkles size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span className="header-brand-title">
                  Quasselstrippe
                </span>
                <span
                  className="badge desktop-only"
                  style={{
                    background: 'rgba(99, 102, 241, 0.2)',
                    color: 'var(--primary-light)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    fontSize: '0.7rem',
                  }}
                >
                  School Ed.
                </span>
              </div>
              <p className="header-brand-subtitle" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Intelligenter Schul-Vokabeltrainer mit Gemini KI
              </p>
            </div>
          </div>

          {/* Desktop Center: Mode Switcher */}
          <div className="header-mode-toggle desktop-only">
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

          {/* Actions: Profile, Language, (Mastery on desktop), Settings */}
          <div className="header-actions-group">
            {/* Quick Mastery Badge in Learner Mode (Desktop placement) */}
            <button
              type="button"
              onClick={onOpenStats}
              className="badge desktop-only"
              style={{
                background: 'var(--success-bg)',
                color: 'var(--success)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '0.4rem 0.8rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                minHeight: '40px',
                cursor: 'pointer',
                borderRadius: 'var(--radius-full)',
                transition: 'var(--transition-fast)',
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
              title={`${masteredWords.length} von ${langWords.length} Vokabeln gemeistert – Klicken für Statistik`}
              aria-label="Lernstatistik öffnen"
            >
              <BookOpen size={15} />
              <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>
                {masteredWords.length} / {langWords.length}
              </span>
            </button>

            {/* Profile Switcher Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="btn btn-secondary btn-sm"
                style={{
                  minHeight: '40px',
                  padding: '0.35rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-medium)',
                  cursor: 'pointer',
                }}
                title={`Aktiver Lerner: ${activeProfile?.name || 'Schüler'}`}
                aria-label="Profil auswählen"
              >
                <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{activeProfile?.avatar || '🦊'}</span>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  {activeProfile?.name || 'Schüler'}
                </span>
                <ChevronDown size={13} color="var(--text-muted)" style={{ transition: 'transform 0.2s', transform: isProfileDropdownOpen ? 'rotate(180deg)' : 'none' }} />
              </button>

              {isProfileDropdownOpen && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 90 }}
                    onClick={() => setIsProfileDropdownOpen(false)}
                  />
                  <div
                    className="glass-panel animate-scale-up"
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      right: 0,
                      minWidth: '220px',
                      maxWidth: 'calc(100vw - 20px)',
                      zIndex: 91,
                      padding: '0.5rem',
                      boxShadow: 'var(--shadow-lg)',
                      border: '1px solid var(--border-medium)',
                      background: 'var(--bg-surface)',
                    }}
                  >
                    <div
                      style={{
                        padding: '0.4rem 0.6rem',
                        fontSize: '0.72rem',
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                      }}
                    >
                      Lernprofil auswählen
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      {profiles.map((p) => {
                        const isCurrent = p.id === activeProfile?.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              onSelectProfile(p);
                              setIsProfileDropdownOpen(false);
                            }}
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0.55rem 0.7rem',
                              minHeight: '44px',
                              borderRadius: 'var(--radius-sm)',
                              background: isCurrent ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                              border: isCurrent ? '1px solid rgba(99, 102, 241, 0.35)' : '1px solid transparent',
                              color: isCurrent ? 'var(--primary-light)' : 'var(--text-primary)',
                              cursor: 'pointer',
                              textAlign: 'left',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <span style={{ fontSize: '1.25rem' }}>{p.avatar}</span>
                              <span style={{ fontWeight: isCurrent ? 700 : 500, fontSize: '0.9rem' }}>{p.name}</span>
                            </div>
                            {isCurrent && <Check size={16} color="var(--primary-light)" />}
                          </button>
                        );
                      })}
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '0.4rem 0' }} />

                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        onOpenProfileAdmin();
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        padding: '0.55rem 0.7rem',
                        minHeight: '44px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: '0.85rem',
                      }}
                    >
                      <UserPlus size={16} />
                      <span>Profile & Schüler verwalten...</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Language Switcher */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'var(--bg-surface-elevated)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-medium)',
                padding: '0.2rem 0.45rem',
                minHeight: '40px',
              }}
            >
              <Globe size={14} color="var(--text-muted)" style={{ marginRight: '0.3rem' }} />
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

            {/* Settings Button */}
            <button
              type="button"
              onClick={onOpenSettings}
              className="btn btn-secondary btn-sm"
              style={{
                padding: '0.45rem',
                minWidth: '40px',
                minHeight: '40px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 'var(--radius-md)',
                position: 'relative',
              }}
              title="Einstellungen & Gemini API"
              aria-label="Einstellungen"
            >
              <Settings size={17} />
              {!hasApiKey && (
                <span
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    width: '8px',
                    height: '8px',
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

        {/* Mobile Layout Row 2: Full-width Mode Switcher + Mastery Badge */}
        <div className="app-header-row-bottom mobile-only">
          <div className="header-mode-toggle" style={{ flex: 1 }}>
            <button
              type="button"
              onClick={() => onModeChange('learner')}
              className="btn btn-sm"
              style={{
                borderRadius: 'var(--radius-full)',
                background: mode === 'learner' ? 'var(--primary-gradient)' : 'transparent',
                color: mode === 'learner' ? '#ffffff' : 'var(--text-secondary)',
                boxShadow: mode === 'learner' ? '0 2px 8px rgba(99, 102, 241, 0.4)' : 'none',
                padding: '0.45rem 0.75rem',
                minHeight: '38px',
              }}
            >
              <GraduationCap size={15} />
              <span>Lernen</span>
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
                padding: '0.45rem 0.75rem',
                minHeight: '38px',
              }}
            >
              <Wrench size={14} />
              <span>Admin</span>
            </button>
          </div>

          {/* Mobile Mastery Badge (placed in Row 2 next to mode toggle) */}
          {mode === 'learner' && (
            <button
              type="button"
              onClick={onOpenStats}
              className="badge"
              style={{
                background: 'var(--success-bg)',
                color: 'var(--success)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '0.35rem 0.7rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                minHeight: '38px',
                cursor: 'pointer',
                borderRadius: 'var(--radius-full)',
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
              title={`${masteredWords.length} von ${langWords.length} Vokabeln gemeistert – Klicken für Statistik`}
              aria-label="Lernstatistik öffnen"
            >
              <BookOpen size={14} />
              <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                {masteredWords.length}/{langWords.length}
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

