import React, { useState, useMemo } from 'react';
import { Sparkles, X, Check, Loader2, ArrowLeft, Layers, AlertCircle } from 'lucide-react';
import type { WordItem, Language, AiClientConfig } from '../../types/vocabulary';
import { organizeLessonsWithAi } from '../../services/gemini';
import { useModal } from '../common/useModal';

interface LessonOrganizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  words: WordItem[];
  lessons: string[];
  language: Language;
  geminiApiKey?: string;
  aiConfig?: AiClientConfig;
  aiAvailable?: boolean;
  onApplyWords: (updatedWords: WordItem[]) => Promise<void>;
  onOpenSettings?: () => void;
}

const PRESETS = [
  {
    label: 'Nach Themen gruppieren',
    prompt: 'Sortiere die Vokabeln thematisch in übersichtliche Schullektionen (ca. 10–15 Wörter pro Lektion) mit klaren Namen.',
  },
  {
    label: 'In ~10er-Lektionen aufteilen',
    prompt: 'Teile die Vokabeln thematisch in kleine, gut lernbare Lektionen mit jeweils etwa 8–12 Wörtern auf.',
  },
  {
    label: 'In bestehende Lektionen einsortieren',
    prompt: 'Ordne alle ausgewählten Wörter möglichst passend den bereits vorhandenen Lektionen zu und lege nur bei Bedarf eine neue Lektion an.',
  },
];

export const LessonOrganizerModal: React.FC<LessonOrganizerModalProps> = ({
  isOpen,
  onClose,
  words,
  lessons,
  language,
  geminiApiKey,
  aiConfig,
  aiAvailable,
  onApplyWords,
  onOpenSettings,
}) => {
  const [selectedSourceLessons, setSelectedSourceLessons] = useState<string[]>(() => [...lessons]);
  const [instruction, setInstruction] = useState(PRESETS[0].prompt);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preview state
  const [previewSummary, setPreviewSummary] = useState<string | null>(null);
  const [previewModel, setPreviewModel] = useState<string | undefined>(undefined);
  const [assignments, setAssignments] = useState<Record<string, string> | null>(null);
  const [includedIds, setIncludedIds] = useState<Set<string>>(new Set());

  const modalRef = useModal(isOpen, onClose);

  const selectedWords = useMemo(
    () => words.filter((w) => selectedSourceLessons.includes(w.lesson)),
    [words, selectedSourceLessons]
  );

  const wordById = useMemo(() => new Map(words.map((w) => [w.id, w])), [words]);

  const previewGroups = useMemo(() => {
    if (!assignments) return [];
    const groups = new Map<string, WordItem[]>();
    for (const [id, lessonName] of Object.entries(assignments)) {
      const word = wordById.get(id);
      if (!word) continue;
      const list = groups.get(lessonName) || [];
      list.push(word);
      groups.set(lessonName, list);
    }
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [assignments, wordById]);

  const proposedLessonNames = useMemo(() => previewGroups.map(([name]) => name), [previewGroups]);

  const changedWords = useMemo(() => {
    if (!assignments) return [];
    const result: WordItem[] = [];
    for (const [id, newLesson] of Object.entries(assignments)) {
      if (!includedIds.has(id)) continue;
      const word = wordById.get(id);
      const trimmed = newLesson.trim();
      if (word && trimmed && trimmed !== word.lesson) {
        result.push({ ...word, lesson: trimmed });
      }
    }
    return result;
  }, [assignments, includedIds, wordById]);

  if (!isOpen) return null;

  const hasAiConfigured = Boolean(aiAvailable || aiConfig?.aiBaseUrl || geminiApiKey || aiConfig?.geminiApiKey);

  const toggleSourceLesson = (lesson: string) => {
    setSelectedSourceLessons((prev) =>
      prev.includes(lesson) ? prev.filter((l) => l !== lesson) : [...prev, lesson]
    );
  };

  const handleGeneratePreview = async () => {
    if (!hasAiConfigured) {
      setError('Kein KI-Endpunkt konfiguriert. Bitte zuerst in den Einstellungen einen Modell-Endpunkt oder API-Key hinterlegen.');
      return;
    }
    if (selectedWords.length === 0) {
      setError('Bitte wähle mindestens eine Lektion mit Vokabeln aus.');
      return;
    }
    if (selectedWords.length > 500) {
      setError('Bitte wähle maximal 500 Vokabeln pro Durchgang aus.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await organizeLessonsWithAi({
        words: selectedWords,
        language,
        instruction,
        existingLessons: lessons,
        apiKey: geminiApiKey,
        aiConfig,
      });

      const nextMap: Record<string, string> = {};
      const nextIncluded = new Set<string>();
      for (const item of result.assignments) {
        nextMap[item.id] = item.lesson;
        nextIncluded.add(item.id);
      }
      setAssignments(nextMap);
      setIncludedIds(nextIncluded);
      setPreviewSummary(result.summary);
      setPreviewModel(result.model);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'KI-Sortierung fehlgeschlagen.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRenamePreviewGroup = (oldName: string, newName: string) => {
    if (!assignments || oldName === newName) return;
    const updated: Record<string, string> = {};
    for (const [id, lesson] of Object.entries(assignments)) {
      updated[id] = lesson === oldName ? newName : lesson;
    }
    setAssignments(updated);
  };

  const handleMovePreviewWord = (id: string, newLesson: string) => {
    if (!assignments) return;
    setAssignments({ ...assignments, [id]: newLesson });
  };

  const handleToggleIncludeWord = (id: string) => {
    setIncludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleApply = async () => {
    if (changedWords.length === 0 || isApplying) return;
    setIsApplying(true);
    setError(null);
    try {
      await onApplyWords(changedWords);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.');
    } finally {
      setIsApplying(false);
    }
  };

  const isPreview = assignments !== null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10, 15, 29, 0.82)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1002,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Lektionen mit KI umsortieren"
        tabIndex={-1}
        className="glass-panel animate-scale-up"
        style={{
          maxWidth: isPreview ? '780px' : '600px',
          width: '100%',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.5rem',
          border: '1px solid var(--border-medium)',
          background: 'var(--bg-surface)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.65)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Sparkles size={20} color="var(--primary-light)" />
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>
              {isPreview ? 'Vorschau: Neue Lektionen' : 'Vokabeln mit KI umsortieren'}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm" aria-label="Schließen">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              padding: '0.65rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--danger-bg)',
              color: 'var(--danger)',
              fontSize: '0.84rem',
              marginBottom: '1rem',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              {error}
            </span>
            {!hasAiConfigured && onOpenSettings && (
              <button type="button" onClick={onOpenSettings} className="btn btn-secondary btn-sm" style={{ flexShrink: 0 }}>
                Einstellungen
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.25rem', marginBottom: '1.25rem' }}>
          {!isPreview ? (
            <>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginBottom: '1rem' }}>
                Die KI schlägt neue Lektionen für deine ausgewählten {language === 'en' ? 'Englisch' : 'Latein'}-Vokabeln vor. Vor dem Speichern kannst du alles in der Vorschau prüfen und anpassen.
              </p>

              {/* Source lessons */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>
                    Quell-Lektionen ({selectedWords.length} Vokabeln ausgewählt)
                  </span>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedSourceLessons([...lessons])}
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: '0.76rem', padding: '0.2rem 0.5rem' }}
                    >
                      Alle
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSourceLessons([])}
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: '0.76rem', padding: '0.2rem 0.5rem' }}
                    >
                      Keine
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    maxHeight: '170px',
                    overflowY: 'auto',
                    padding: '0.5rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {lessons.map((l) => {
                    const count = words.filter((w) => w.lesson === l).length;
                    const checked = selectedSourceLessons.includes(l);
                    return (
                      <label
                        key={l}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.5rem',
                          padding: '0.35rem 0.5rem',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          background: checked ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                          fontSize: '0.86rem',
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSourceLesson(l)}
                          />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            📁 {l}
                          </span>
                        </span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                          {count} Wörter
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Instruction */}
              <div>
                <label htmlFor="ai-lesson-instruction" style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Wie soll die KI sortieren?
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.5rem' }}>
                  {PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setInstruction(p.prompt)}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.76rem', padding: '0.28rem 0.6rem' }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <textarea
                  id="ai-lesson-instruction"
                  rows={3}
                  maxLength={2000}
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  placeholder="z.B. Sortiere nach Themen (Schule, Familie, Freizeit) oder teile in Unit 1–3 auf..."
                  className="input-field"
                  style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
            </>
          ) : (
            <>
              {/* Preview Summary */}
              <div
                style={{
                  padding: '0.75rem 0.95rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(99, 102, 241, 0.12)',
                  border: '1px solid rgba(99, 102, 241, 0.35)',
                  marginBottom: '1rem',
                  fontSize: '0.85rem',
                }}
              >
                {previewSummary && (
                  <div style={{ color: '#fff', fontWeight: 500, marginBottom: '0.35rem' }}>
                    ✨ {previewSummary}
                  </div>
                )}
                <div style={{ color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
                  <span>
                    <strong>{changedWords.length}</strong> von <strong>{selectedWords.length}</strong> Wörtern werden in{' '}
                    <strong>{previewGroups.length}</strong> Lektionen einsortiert (Lernfortschritte bleiben erhalten).
                  </span>
                  {previewModel && (
                    <span className="badge" style={{ fontSize: '0.72rem', background: 'var(--bg-surface-elevated)', color: 'var(--text-muted)' }}>
                      {previewModel}
                    </span>
                  )}
                </div>
              </div>

              {/* Proposed Lesson Groups */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {previewGroups.map(([lessonName, groupWords]) => {
                  const movedCount = groupWords.filter((w) => includedIds.has(w.id) && w.lesson !== lessonName).length;
                  return (
                    <div
                      key={lessonName}
                      style={{
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-surface-elevated)',
                        border: '1px solid var(--border-subtle)',
                        padding: '0.85rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.65rem', flexWrap: 'wrap' }}>
                        <Layers size={16} color="var(--primary-light)" style={{ flexShrink: 0 }} />
                        <input
                          type="text"
                          value={lessonName}
                          onChange={(e) => handleRenamePreviewGroup(lessonName, e.target.value)}
                          className="input-field"
                          aria-label="Lektionsname in Vorschau bearbeiten"
                          style={{ flex: 1, minWidth: '180px', fontWeight: 600, padding: '0.35rem 0.6rem', fontSize: '0.92rem' }}
                        />
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {groupWords.length} Wörter{movedCount > 0 ? ` (${movedCount} neu)` : ''}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {groupWords.map((w) => {
                          const isIncluded = includedIds.has(w.id);
                          const isMoved = w.lesson !== lessonName;
                          return (
                            <div
                              key={w.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '0.6rem',
                                padding: '0.4rem 0.55rem',
                                borderRadius: 'var(--radius-sm)',
                                background: isIncluded ? 'rgba(255, 255, 255, 0.03)' : 'transparent',
                                opacity: isIncluded ? 1 : 0.45,
                                fontSize: '0.84rem',
                                flexWrap: 'wrap',
                              }}
                            >
                              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', flex: '1 1 220px', minWidth: 0 }}>
                                <input
                                  type="checkbox"
                                  checked={isIncluded}
                                  onChange={() => handleToggleIncludeWord(w.id)}
                                />
                                <span style={{ fontWeight: 600, color: '#fff' }}>{w.word}</span>
                                <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  – {w.translation}
                                </span>
                              </label>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
                                {isMoved ? (
                                  <span style={{ fontSize: '0.74rem', color: 'var(--primary-light)' }} title={`Aktuelle Lektion: ${w.lesson}`}>
                                    vorher: {w.lesson}
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                                    unverändert
                                  </span>
                                )}
                                {proposedLessonNames.length > 1 && (
                                  <select
                                    aria-label={`Zielliste für ${w.word}`}
                                    value={lessonName}
                                    onChange={(e) => handleMovePreviewWord(w.id, e.target.value)}
                                    className="input-field"
                                    style={{ fontSize: '0.76rem', padding: '0.2rem 0.4rem', maxWidth: '150px' }}
                                  >
                                    {proposedLessonNames.map((opt) => (
                                      <option key={opt} value={opt}>
                                        {opt}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div>
            {isPreview && (
              <button
                type="button"
                onClick={() => { setAssignments(null); setError(null); }}
                className="btn btn-ghost btn-sm"
                disabled={isApplying}
              >
                <ArrowLeft size={15} />
                <span>Zurück</span>
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isLoading || isApplying}>
              Abbrechen
            </button>
            {!isPreview ? (
              <button
                type="button"
                onClick={handleGeneratePreview}
                disabled={isLoading || selectedWords.length === 0}
                className="btn btn-primary"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>KI sortiert…</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Vorschau erstellen</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleApply}
                disabled={isApplying || changedWords.length === 0}
                className="btn btn-primary"
              >
                {isApplying ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                <span>
                  {changedWords.length === 0
                    ? 'Keine Änderungen'
                    : `${changedWords.length} ${changedWords.length === 1 ? 'Wort' : 'Wörter'} umsortieren`}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
