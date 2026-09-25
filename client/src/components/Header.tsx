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

        {/* Right: Profile Selector, Language Selector & Settings */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          {/* Profile Switcher Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className="btn btn-secondary btn-sm"
              style={{
                minHeight: '44px',
                padding: '0.4rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-medium)',
                cursor: 'pointer',
              }}
              title={`Aktiver Lerner: ${activeProfile?.name || 'Schüler'}`}
              aria-label="Profil auswählen"
            >
              <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{activeProfile?.avatar || '🦊'}</span>
              <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                {activeProfile?.name || 'Schüler 1'}
              </span>
              <ChevronDown size={14} color="var(--text-muted)" style={{ transition: 'transform 0.2s', transform: isProfileDropdownOpen ? 'rotate(180deg)' : 'none' }} />
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
                    minWidth: '230px',
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
                            padding: '0.6rem 0.75rem',
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
                            <span style={{ fontSize: '1.3rem' }}>{p.avatar}</span>
                            <span style={{ fontWeight: isCurrent ? 700 : 500, fontSize: '0.92rem' }}>{p.name}</span>
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
                      padding: '0.6rem 0.75rem',
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
              padding: '0.2rem 0.5rem',
              minHeight: '44px',
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

          {/* Quick Mastery Badge in Learner Mode (Clickable to open Stats & Progress Modal) */}
          <button
            type="button"
            onClick={onOpenStats}
            className="badge"
            style={{
              background: 'var(--success-bg)',
              color: 'var(--success)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              padding: '0.4rem 0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              minHeight: '44px',
              cursor: 'pointer',
              borderRadius: 'var(--radius-full)',
              transition: 'var(--transition-fast)',
              fontFamily: 'var(--font-body)',
              fontWeight: 600,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(16, 185, 129, 0.22)';
              e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.6)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--success-bg)';
              e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.3)';
              e.currentTarget.style.transform = 'none';
            }}
            title={`${masteredWords.length} von ${langWords.length} Vokabeln gemeistert (Kasten 4 & 5) – Klicken für detaillierte Lernstatistik & Kurve`}
            aria-label="Lernstatistik und Fortschrittsgraph öffnen"
          >
            <BookOpen size={16} />
            <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>
              {masteredWords.length} / {langWords.length}
            </span>
          </button>


          {/* Settings Button */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="btn btn-secondary btn-sm"
            style={{
              padding: '0.5rem',
              minWidth: '44px',
              minHeight: '44px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
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
                  top: '4px',
                  right: '4px',
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
