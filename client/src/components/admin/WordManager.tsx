import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  Download, 
  Upload, 
  RefreshCw, 
  Check, 
  X,
  Layers,
  Filter
} from 'lucide-react';
import { PART_OF_SPEECH_LABELS } from '../../types/vocabulary';
import type { WordItem, Language, PartOfSpeech } from '../../types/vocabulary';
import { AudioButton } from '../common/AudioButton';
import { exportWordsToJson } from '../../services/storage';

interface WordManagerProps {
  words: WordItem[];
  language: Language;
  onUpdateWord: (word: WordItem) => void;
  onDeleteWord: (id: string) => void;
  onAddWord: (word: WordItem) => void;
  onImportWords: (words: WordItem[]) => void;
  onResetProgress: () => void;
}

export const WordManager: React.FC<WordManagerProps> = ({
  words,
  language,
  onUpdateWord,
  onDeleteWord,
  onAddWord,
  onImportWords,
  onResetProgress,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLesson, setSelectedLesson] = useState<string>('all');
  const [editingWordId, setEditingWordId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<WordItem>>({});
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newWordData, setNewWordData] = useState<Partial<WordItem>>({
    word: '',
    translation: '',
    language,
    lesson: language === 'en' ? 'Unit 1: Back to School' : 'Lektion 1: Amici et Schola',
    partOfSpeech: 'noun',
    exampleSentence: '',
    exampleTranslation: '',
    notes: '',
  });

  const languageWords = useMemo(() => {
    return words.filter(w => w.language === language);
  }, [words, language]);

  const lessons = useMemo(() => {
    return Array.from(new Set(languageWords.map(w => w.lesson))).filter(Boolean).sort();
  }, [languageWords]);

  const filteredWords = useMemo(() => {
    return languageWords.filter(w => {
      const matchLesson = selectedLesson === 'all' || w.lesson === selectedLesson;
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        w.word.toLowerCase().includes(term) ||
        w.translation.toLowerCase().includes(term) ||
        w.notes?.toLowerCase().includes(term) ||
        w.lesson.toLowerCase().includes(term);
      return matchLesson && matchSearch;
    });
  }, [languageWords, selectedLesson, searchTerm]);

  const handleStartEdit = (word: WordItem) => {
    setEditingWordId(word.id);
    setEditFormData({ ...word });
  };

  const handleSaveEdit = () => {
    if (!editingWordId || !editFormData.word || !editFormData.translation) return;

    const original = words.find(w => w.id === editingWordId);
    if (!original) return;

    onUpdateWord({
      ...original,
      word: editFormData.word.trim(),
      translation: editFormData.translation.trim(),
      lesson: editFormData.lesson?.trim() || original.lesson,
      partOfSpeech: editFormData.partOfSpeech || original.partOfSpeech,
      exampleSentence: editFormData.exampleSentence?.trim(),
      exampleTranslation: editFormData.exampleTranslation?.trim(),
      notes: editFormData.notes?.trim(),
      phonetic: editFormData.phonetic?.trim(),
    });

    setEditingWordId(null);
    setEditFormData({});
  };

  const handleCreateNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWordData.word?.trim() || !newWordData.translation?.trim()) return;

    const newItem: WordItem = {
      id: `${language}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      word: newWordData.word.trim(),
      translation: newWordData.translation.trim(),
      language,
      lesson: newWordData.lesson?.trim() || (language === 'en' ? 'Unit 1: Back to School' : 'Lektion 1'),
      partOfSpeech: newWordData.partOfSpeech || 'noun',
      exampleSentence: newWordData.exampleSentence?.trim(),
      exampleTranslation: newWordData.exampleTranslation?.trim(),
      notes: newWordData.notes?.trim(),
      phonetic: newWordData.phonetic?.trim(),
      box: 1,
      correctCount: 0,
      incorrectCount: 0,
      createdAt: Date.now(),
    };

    onAddWord(newItem);
    setIsAddingNew(false);
    setNewWordData({
      word: '',
      translation: '',
      language,
      lesson: newWordData.lesson,
      partOfSpeech: 'noun',
      exampleSentence: '',
      exampleTranslation: '',
      notes: '',
    });
  };

  const handleExport = () => {
    const jsonStr = exportWordsToJson(languageWords);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quasselstrippe_${language}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const importedList = parsed.words || parsed;
        if (Array.isArray(importedList)) {
          onImportWords(importedList);
          alert(`Erfolgreich ${importedList.length} Vokabeln importiert!`);
        }
      } catch (err) {
        alert('Fehler beim Lesen der JSON-Datei: Ungültiges Format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1.75rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.2rem' }}>
            Vokabelsammlung verwalten ({languageWords.length} Wörter)
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Vokabeln manuell anlegen, bearbeiten, Lektionen strukturieren oder als Backup exportieren.
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
          <button
            type="button"
            onClick={() => setIsAddingNew(true)}
            className="btn btn-primary btn-sm"
          >
            <Plus size={16} />
            <span>Vokabel hinzufügen</span>
          </button>

          <button
            type="button"
            onClick={handleExport}
            className="btn btn-secondary btn-sm"
            title="Alle Vokabeln dieser Sprache als JSON exportieren"
          >
            <Download size={15} />
            <span>Exportieren</span>
          </button>

          <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
            <Upload size={15} />
            <span>Importieren</span>
            <input
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleImportFile}
            />
          </label>

          <button
            type="button"
            onClick={() => {
              if (confirm('Möchtest du wirklich den Lernfortschritt aller Vokabeln auf Kasten 1 zurücksetzen?')) {
                onResetProgress();
              }
            }}
            className="btn btn-ghost btn-sm"
            style={{ color: 'var(--text-muted)' }}
            title="Alle Vokabeln wieder in Kasten 1 legen"
          >
            <RefreshCw size={14} />
            <span>Fortschritt zurücksetzen</span>
          </button>
        </div>
      </div>

      {isAddingNew && (
        <div className="glass-panel animate-fade-in" style={{ padding: '1.75rem', marginBottom: '2rem', border: '1px solid var(--primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#fff' }}>Neue Vokabel manuell eintragen</h3>
            <button
              type="button"
              onClick={() => setIsAddingNew(false)}
              className="btn btn-ghost btn-sm"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleCreateNew}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Fremdwort ({language === 'en' ? 'Englisch' : 'Latein'}) *
                </label>
                <input
                  type="text"
                  required
                  value={newWordData.word || ''}
                  onChange={(e) => setNewWordData({ ...newWordData, word: e.target.value })}
                  placeholder="z.B. challenge"
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Deutsche Bedeutung *
                </label>
                <input
                  type="text"
                  required
                  value={newWordData.translation || ''}
                  onChange={(e) => setNewWordData({ ...newWordData, translation: e.target.value })}
                  placeholder="z.B. die Herausforderung"
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Lektion / Schul-Einheit
                </label>
                <input
                  type="text"
                  value={newWordData.lesson || ''}
                  onChange={(e) => setNewWordData({ ...newWordData, lesson: e.target.value })}
                  placeholder="z.B. Unit 1: Back to School"
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Wortart
                </label>
                <select
                  value={newWordData.partOfSpeech || 'noun'}
                  onChange={(e) => setNewWordData({ ...newWordData, partOfSpeech: e.target.value as PartOfSpeech })}
                  className="input-field"
                >
                  {Object.entries(PART_OF_SPEECH_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.badge} - {v.de}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Beispielsatz (Fremdsprache)
                </label>
                <input
                  type="text"
                  value={newWordData.exampleSentence || ''}
                  onChange={(e) => setNewWordData({ ...newWordData, exampleSentence: e.target.value })}
                  placeholder="z.B. This test is a big challenge."
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Deutsche Übersetzung des Beispielsatzes
                </label>
                <input
                  type="text"
                  value={newWordData.exampleTranslation || ''}
                  onChange={(e) => setNewWordData({ ...newWordData, exampleTranslation: e.target.value })}
                  placeholder="z.B. Dieser Test ist eine große Herausforderung."
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Zusatzhinweis / Grammatik
                </label>
                <input
                  type="text"
                  value={newWordData.notes || ''}
                  onChange={(e) => setNewWordData({ ...newWordData, notes: e.target.value })}
                  placeholder="z.B. Plural: challenges"
                  className="input-field"
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="btn btn-secondary"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                className="btn btn-primary"
              >
                <Plus size={16} />
                <span>Vokabel speichern</span>
              </button>
            </div>
          </form>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 280px' }}>
          <Search size={17} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Nach Vokabel, Übersetzung oder Notiz suchen..."
            className="input-field"
            style={{ paddingLeft: '2.4rem' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '0 1 240px' }}>
          <Filter size={16} color="var(--text-muted)" />
          <select
            value={selectedLesson}
            onChange={(e) => setSelectedLesson(e.target.value)}
            className="input-field"
          >
            <option value="all">Alle Lektionen ({languageWords.length})</option>
            {lessons.map(l => (
              <option key={l} value={l}>
                {l} ({languageWords.filter(w => w.lesson === l).length})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.92rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '0.85rem 1rem', width: '50px' }}>Audio</th>
                <th style={{ padding: '0.85rem 1rem' }}>Fremdwort</th>
                <th style={{ padding: '0.85rem 1rem' }}>Bedeutung (Deutsch)</th>
                <th style={{ padding: '0.85rem 1rem' }}>Wortart & Lektion</th>
                <th style={{ padding: '0.85rem 1rem' }}>Kasten</th>
                <th style={{ padding: '0.85rem 1rem', width: '90px', textAlign: 'right' }}>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {filteredWords.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Keine Vokabeln für diesen Filter gefunden.
                  </td>
                </tr>
              ) : (
                filteredWords.map((item) => {
                  const isEditing = editingWordId === item.id;
                  const pos = PART_OF_SPEECH_LABELS[item.partOfSpeech] || PART_OF_SPEECH_LABELS.other;

                  if (isEditing) {
                    return (
                      <tr key={item.id} style={{ background: 'rgba(99, 102, 241, 0.08)', borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <AudioButton text={editFormData.word || item.word} language={language} size="sm" />
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <input
                            type="text"
                            value={editFormData.word || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, word: e.target.value })}
                            className="input-field"
                            style={{ padding: '0.35rem 0.6rem' }}
                          />
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <input
                            type="text"
                            value={editFormData.translation || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, translation: e.target.value })}
                            className="input-field"
                            style={{ padding: '0.35rem 0.6rem' }}
                          />
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <input
                            type="text"
                            value={editFormData.lesson || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, lesson: e.target.value })}
                            className="input-field"
                            style={{ padding: '0.35rem 0.6rem', marginBottom: '0.3rem' }}
                          />
                          <select
                            value={editFormData.partOfSpeech || 'noun'}
                            onChange={(e) => setEditFormData({ ...editFormData, partOfSpeech: e.target.value as PartOfSpeech })}
                            className="input-field"
                            style={{ padding: '0.35rem 0.6rem' }}
                          >
                            {Object.entries(PART_OF_SPEECH_LABELS).map(([k, v]) => (
                              <option key={k} value={k}>{v.badge} - {v.de}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          Kasten {item.box}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                            <button
                              type="button"
                              onClick={handleSaveEdit}
                              className="btn btn-success btn-sm"
                              style={{ padding: '0.4rem' }}
                              title="Speichern"
                            >
                              <Check size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingWordId(null)}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '0.4rem' }}
                              title="Abbrechen"
                            >
                              <X size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <AudioButton text={item.word} language={language} size="sm" />
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#fff' }}>
                        <div>{item.word}</div>
                        {item.phonetic && (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                            {item.phonetic}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div>{item.translation}</div>
                        {item.notes && (
                          <span style={{ fontSize: '0.78rem', color: 'var(--primary-light)' }}>
                            💡 {item.notes}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                          <span
                            className="badge"
                            style={{
                              background: `${pos.color}20`,
                              color: pos.color,
                              fontSize: '0.7rem',
                            }}
                          >
                            {pos.badge}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {item.lesson}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Layers size={13} color="var(--text-muted)" />
                          <span style={{ fontWeight: 600, color: item.box >= 4 ? 'var(--success)' : item.box <= 2 ? 'var(--warning)' : '#fff' }}>
                            {item.box}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(item)}
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '0.4rem', color: 'var(--text-secondary)' }}
                            title="Bearbeiten"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Vokabel "${item.word}" wirklich löschen?`)) {
                                onDeleteWord(item.id);
                              }
                            }}
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '0.4rem', color: 'var(--danger)' }}
                            title="Löschen"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
