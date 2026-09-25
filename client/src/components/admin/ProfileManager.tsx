import React, { useState } from 'react';
import { 
  User, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  Sparkles,
  AlertCircle
} from 'lucide-react';
import type { UserProfile, WordItem } from '../../types/vocabulary';

interface ProfileManagerProps {
  profiles: UserProfile[];
  activeProfile: UserProfile | null;
  onSelectProfile: (profile: UserProfile) => void;
  onCreateProfile: (profile: { name: string; avatar: string; color: string }) => Promise<void>;
  onUpdateProfile: (profile: UserProfile) => Promise<void>;
  onDeleteProfile: (id: string) => Promise<void>;
  words: WordItem[];
}

const AVATAR_OPTIONS = [
  '🦊', '🦁', '🐼', '🦉', '🚀', '🦄', '⚽', '🎸',
  '🎮', '🎨', '🏎️', '🏄', '🐯', '🐬', '🦖', '🌟'
];

const COLOR_OPTIONS = [
  '#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'
];

export const ProfileManager: React.FC<ProfileManagerProps> = ({
  profiles,
  activeProfile,
  onSelectProfile,
  onCreateProfile,
  onUpdateProfile,
  onDeleteProfile,
  words,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);

  // New profile state
  const [newName, setNewName] = useState('');
  const [newAvatar, setNewAvatar] = useState('🦊');
  const [newColor, setNewColor] = useState('#6366f1');

  // Edit profile state
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('🦊');
  const [editColor, setEditColor] = useState('#6366f1');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStartCreate = () => {
    setIsCreating(true);
    setEditingProfileId(null);
    setNewName('');
    setNewAvatar(AVATAR_OPTIONS[Math.floor(Math.random() * AVATAR_OPTIONS.length)]);
    setNewColor(COLOR_OPTIONS[Math.floor(Math.random() * COLOR_OPTIONS.length)]);
    setErrorMessage(null);
  };

  const handleStartEdit = (profile: UserProfile) => {
    setEditingProfileId(profile.id);
    setIsCreating(false);
    setEditName(profile.name);
    setEditAvatar(profile.avatar || '🦊');
    setEditColor(profile.color || '#6366f1');
    setErrorMessage(null);
  };

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setErrorMessage('Bitte gib einen Namen für den Schüler ein.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await onCreateProfile({
        name: newName.trim(),
        avatar: newAvatar,
        color: newColor,
      });
      setIsCreating(false);
      setNewName('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fehler beim Erstellen des Profils';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfileId) return;
    if (!editName.trim()) {
      setErrorMessage('Der Name darf nicht leer sein.');
      return;
    }

    const current = profiles.find((p) => p.id === editingProfileId);
    if (!current) return;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await onUpdateProfile({
        ...current,
        name: editName.trim(),
        avatar: editAvatar,
        color: editColor,
      });
      setEditingProfileId(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fehler beim Speichern des Profils';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (profile: UserProfile) => {
    if (profiles.length <= 1) {
      alert('Das letzte verbleibende Profil kann nicht gelöscht werden.');
      return;
    }

    const confirmed = confirm(
      `Möchtest du das Profil von "${profile.name}" wirklich löschen?\n\nDie individuellen Lernstatistiken dieses Schülers werden gelöscht. Gemeinsame Vokabeln bleiben für andere Profile erhalten.`
    );
    if (!confirmed) return;

    try {
      await onDeleteProfile(profile.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fehler beim Löschen des Profils';
      alert(msg);
    }
  };

  // Helper to count words for a profile
  const getProfileStats = (profileId: string) => {
    // Individual words assigned exclusively to this profile
    const individualWords = words.filter((w) => w.profileId === profileId);
    // Shared words accessible
    const sharedWords = words.filter((w) => !w.profileId);
    return {
      individualCount: individualWords.length,
      sharedCount: sharedWords.length,
      totalCount: individualWords.length + sharedWords.length,
    };
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner / Explanation */}
      <div
        className="glass-panel"
        style={{
          padding: '1.25rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          borderLeft: '4px solid var(--primary)',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <User size={22} color="var(--primary-light)" />
            <span>Schüler-Profile verwalten</span>
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Jeder Schüler lernt mit eigenem Leitner-Kasten-Fortschritt. Vokabeln können entweder gemeinsam geteilt oder individuell zugewiesen werden.
          </p>
        </div>

        {!isCreating && (
          <button
            type="button"
            onClick={handleStartCreate}
            className="btn btn-primary"
            style={{
              padding: '0.65rem 1.25rem',
              minHeight: '44px',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <Plus size={18} />
            <span>Neues Schüler-Profil</span>
          </button>
        )}
      </div>

      {/* Error alert if any */}
      {errorMessage && (
        <div
          style={{
            background: 'var(--danger-bg)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#fca5a5',
            padding: '0.85rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.9rem',
          }}
        >
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Create New Profile Form */}
      {isCreating && (
        <div
          className="glass-panel animate-scale-up"
          style={{
            padding: '1.5rem',
            border: '1px solid var(--primary)',
            background: 'rgba(99, 102, 241, 0.06)',
          }}
        >
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} color="var(--primary-light)" />
            <span>Neues Schüler-Profil anlegen</span>
          </h3>

          <form onSubmit={handleSaveNew} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                Name des Schülers / Lerners *
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="z.B. Emma, Jonas, Paul..."
                className="input-field"
                autoFocus
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                Avatar-Symbol wählen
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {AVATAR_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setNewAvatar(emoji)}
                    style={{
                      width: '44px',
                      height: '44px',
                      fontSize: '1.4rem',
                      borderRadius: 'var(--radius-md)',
                      background: newAvatar === emoji ? 'var(--primary-gradient)' : 'var(--bg-surface-elevated)',
                      border: newAvatar === emoji ? '2px solid #ffffff' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transform: newAvatar === emoji ? 'scale(1.1)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                Farbe
              </label>
              <div style={{ display: 'flex', gap: '0.65rem' }}>
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: c,
                      border: newColor === c ? '3px solid #ffffff' : '2px solid transparent',
                      cursor: 'pointer',
                      transform: newColor === c ? 'scale(1.15)' : 'none',
                      transition: 'all 0.15s ease',
                      boxShadow: newColor === c ? `0 0 12px ${c}` : 'none',
                    }}
                  />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="btn btn-ghost"
                style={{ minHeight: '44px' }}
                disabled={isSubmitting}
              >
                Abbrechen
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ minHeight: '44px', padding: '0 1.5rem' }}
                disabled={isSubmitting}
              >
                <Check size={18} />
                <span>{isSubmitting ? 'Wird gespeichert...' : 'Profil anlegen'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Profiles Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {profiles.map((profile) => {
          const isActive = activeProfile?.id === profile.id;
          const isEditing = editingProfileId === profile.id;
          const stats = getProfileStats(profile.id);

          if (isEditing) {
            return (
              <div
                key={profile.id}
                className="glass-panel animate-scale-up"
                style={{
                  padding: '1.25rem',
                  border: '1px solid var(--primary)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--primary-light)' }}>
                  Profil bearbeiten
                </div>

                <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="input-field"
                    required
                  />

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {AVATAR_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setEditAvatar(emoji)}
                        style={{
                          width: '38px',
                          height: '38px',
                          fontSize: '1.2rem',
                          borderRadius: 'var(--radius-sm)',
                          background: editAvatar === emoji ? 'var(--primary-gradient)' : 'var(--bg-surface-elevated)',
                          border: editAvatar === emoji ? '2px solid #ffffff' : '1px solid var(--border-subtle)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditColor(c)}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: c,
                          border: editColor === c ? '2px solid #ffffff' : 'none',
                          cursor: 'pointer',
                        }}
                      />
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => setEditingProfileId(null)}
                      className="btn btn-ghost btn-sm"
                      style={{ minHeight: '44px' }}
                      disabled={isSubmitting}
                    >
                      Abbrechen
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm"
                      style={{ minHeight: '44px' }}
                      disabled={isSubmitting}
                    >
                      <Check size={16} />
                      <span>Speichern</span>
                    </button>
                  </div>
                </form>
              </div>
            );
          }

          return (
            <div
              key={profile.id}
              className="glass-panel"
              style={{
                padding: '1.25rem 1.5rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '1rem',
                border: isActive ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                background: isActive ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-surface)',
                boxShadow: isActive ? '0 0 20px rgba(99, 102, 241, 0.2)' : 'none',
                position: 'relative',
              }}
            >
              {/* Header with Avatar & Name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '16px',
                    background: profile.color || '#6366f1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.8rem',
                    boxShadow: `0 4px 12px ${profile.color || '#6366f1'}40`,
                    flexShrink: 0,
                  }}
                >
                  {profile.avatar || '🦊'}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h3
                      style={{
                        fontSize: '1.15rem',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {profile.name}
                    </h3>
                    {isActive && (
                      <span
                        className="badge"
                        style={{
                          background: 'var(--primary)',
                          color: '#ffffff',
                          fontSize: '0.7rem',
                        }}
                      >
                        Aktiv
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    {stats.individualCount > 0
                      ? `${stats.individualCount} eigene Vokabeln (+${stats.sharedCount} geteilt)`
                      : `Gemeinsame Vokabelliste (${stats.sharedCount})`}
                  </p>
                </div>
              </div>

              {/* Action buttons with 44x44 minimum touch target */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '0.85rem',
                  gap: '0.5rem',
                }}
              >
                {!isActive ? (
                  <button
                    type="button"
                    onClick={() => onSelectProfile(profile)}
                    className="btn btn-secondary btn-sm"
                    style={{
                      minHeight: '44px',
                      padding: '0 1rem',
                      color: 'var(--primary-light)',
                    }}
                  >
                    <span>Als aktiv auswählen</span>
                  </button>
                ) : (
                  <span
                    style={{
                      fontSize: '0.82rem',
                      color: 'var(--success)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontWeight: 600,
                    }}
                  >
                    <Check size={16} /> Aktiver Lerner
                  </span>
                )}

                <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                  <button
                    type="button"
                    onClick={() => handleStartEdit(profile)}
                    className="btn btn-ghost btn-sm"
                    style={{
                      minWidth: '44px',
                      minHeight: '44px',
                      padding: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title="Profil bearbeiten"
                    aria-label="Profil bearbeiten"
                  >
                    <Edit2 size={16} />
                  </button>

                  {profiles.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDelete(profile)}
                      className="btn btn-ghost btn-sm"
                      style={{
                        minWidth: '44px',
                        minHeight: '44px',
                        padding: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--danger)',
                      }}
                      title="Profil löschen"
                      aria-label="Profil löschen"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
