import React, { useState, useRef } from 'react';
import { 
  Camera, 
  UploadCloud, 
  Sparkles, 
  Check, 
  Trash2, 
  AlertCircle, 
  FileText, 
  Plus,
  RefreshCw,
  Eye
} from 'lucide-react';
import { PART_OF_SPEECH_LABELS } from '../../types/vocabulary';
import type { 
  Language, 
  WordItem, 
  ExtractedWordCandidate,
  PartOfSpeech
} from '../../types/vocabulary';
import { 
  analyzeWorksheetWithGemini, 
  SAMPLE_WORKSHEETS
} from '../../services/gemini';
import type { SampleWorksheet } from '../../services/gemini';
import { AudioButton } from '../common/AudioButton';

interface WorksheetScannerProps {
  language: Language;
  geminiApiKey: string;
  onAddWords: (newWords: WordItem[]) => void;
  onOpenSettings: () => void;
}

export const WorksheetScanner: React.FC<WorksheetScannerProps> = ({
  language,
  geminiApiKey,
  onAddWords,
  onOpenSettings,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [lessonName, setLessonName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<{
    words: ExtractedWordCandidate[];
    detectedTopic?: string;
    summary?: string;
  } | null>(null);
  const [addedSuccessCount, setAddedSuccessCount] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableSamples = SAMPLE_WORKSHEETS.filter(s => s.language === language);

  const handleFileChange = (file: File) => {
    setError(null);
    setAddedSuccessCount(null);
    setAnalysisResult(null);

    if (!file.type.startsWith('image/')) {
      setError('Bitte wähle eine gültige Bilddatei (JPEG, PNG, WEBP).');
      return;
    }

    setSelectedFile(file);
    setMimeType(file.type);

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleLoadSample = (sample: SampleWorksheet) => {
    setError(null);
    setAddedSuccessCount(null);
    setSelectedFile(null);
    setImagePreview(sample.previewSvg);
    setLessonName(sample.suggestedLesson);
    setMimeType('image/svg+xml');

    setIsLoading(true);
    setTimeout(() => {
      setAnalysisResult({
        words: sample.simulatedResults.map(w => ({ ...w, selected: true })),
        detectedTopic: sample.title,
        summary: sample.description,
      });
      setIsLoading(false);
    }, 800);
  };

  const handleAnalyze = async () => {
    if (!imagePreview) {
      setError('Bitte lade zuerst ein Foto oder Bild eines Arbeitsblatts hoch.');
      return;
    }

    if (!geminiApiKey) {
      setError('Für die automatische Foto-Erkennung mit deiner eigenen Kamera/Datei wird ein Gemini API-Key benötigt. Klicke auf "Einstellungen", um deinen Key einzugeben, oder teste die Erkennung mit einem unserer Beispiel-Arbeitsblätter!');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAddedSuccessCount(null);

    try {
      const result = await analyzeWorksheetWithGemini(
        imagePreview,
        mimeType,
        language,
        lessonName,
        geminiApiKey
      );

      setAnalysisResult(result);
      if (result.lessonName && !lessonName) {
        setLessonName(result.lessonName);
      }
    } catch (err: unknown) {
      console.error('Worksheet analysis failed', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Fehler bei der Analyse des Arbeitsblatts. Bitte prüfe deinen API-Key und die Bildqualität.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSelectWord = (index: number) => {
    if (!analysisResult) return;
    const updated = [...analysisResult.words];
    updated[index] = { ...updated[index], selected: !updated[index].selected };
    setAnalysisResult({ ...analysisResult, words: updated });
  };

  const handleSelectAll = (select: boolean) => {
    if (!analysisResult) return;
    const updated = analysisResult.words.map(w => ({ ...w, selected: select }));
    setAnalysisResult({ ...analysisResult, words: updated });
  };

  const handleWordChange = (index: number, field: keyof ExtractedWordCandidate, value: any) => {
    if (!analysisResult) return;
    const updated = [...analysisResult.words];
    updated[index] = { ...updated[index], [field]: value };
    setAnalysisResult({ ...analysisResult, words: updated });
  };

  const handleRemoveWord = (index: number) => {
    if (!analysisResult) return;
    const updated = analysisResult.words.filter((_, i) => i !== index);
    setAnalysisResult({ ...analysisResult, words: updated });
  };

  const handleSaveToCollection = () => {
    if (!analysisResult) return;

    const selectedWords = analysisResult.words.filter(w => w.selected !== false);
    if (selectedWords.length === 0) {
      setError('Bitte wähle mindestens eine Vokabel zum Hinzufügen aus.');
      return;
    }

    const finalLesson = lessonName.trim() || analysisResult.detectedTopic || (language === 'en' ? 'Unit 3: New Vocabulary' : 'Lektion 2: Neue Vokabeln');

    const newItems: WordItem[] = selectedWords.map((candidate, idx) => ({
      id: `${language}-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      word: candidate.word.trim(),
      translation: candidate.translation.trim(),
      language,
      lesson: finalLesson,
      partOfSpeech: candidate.partOfSpeech || 'noun',
      exampleSentence: candidate.exampleSentence?.trim(),
      exampleTranslation: candidate.exampleTranslation?.trim(),
      phonetic: candidate.phonetic?.trim(),
      notes: candidate.notes?.trim(),
      box: 1,
      correctCount: 0,
      incorrectCount: 0,
      createdAt: Date.now(),
    }));

    onAddWords(newItems);
    setAddedSuccessCount(newItems.length);
    setAnalysisResult(null);
    setSelectedFile(null);
    setImagePreview(null);
  };

  const selectedCount = analysisResult?.words.filter(w => w.selected !== false).length ?? 0;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div
        className="glass-panel"
        style={{
          padding: '1.75rem 2rem',
          marginBottom: '1.75rem',
          border: '1px solid rgba(99, 102, 241, 0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <Sparkles size={24} color="var(--primary-light)" />
          <h2 style={{ fontSize: '1.5rem' }}>
            Arbeitsblatt fotografieren & Vokabeln scannen
          </h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Fotografiere das Schul-Arbeitsblatt, Buchseiten oder Vokabellisten deines Kindes. 
          Die <strong>Gemini KI</strong> erkennt automatisch neue Vokabeln und Wendungen, liefert deutsche Übersetzungen sowie Beispielsätze und bereitet alles für das Karteikartentraining vor.
        </p>
      </div>

      {addedSuccessCount !== null && (
        <div
          className="animate-fade-in"
          style={{
            background: 'var(--success-bg)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            padding: '1.25rem 1.5rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Check size={22} color="var(--success)" />
            <span style={{ color: '#ffffff', fontWeight: 600, fontSize: '1rem' }}>
              🎉 Erfolgreich {addedSuccessCount} neue Vokabeln zur Sammlung hinzugefügt!
            </span>
          </div>
          <button
            type="button"
            onClick={() => setAddedSuccessCount(null)}
            className="btn btn-secondary btn-sm"
          >
            Schließen
          </button>
        </div>
      )}

      {!analysisResult && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: imagePreview ? '1fr 1fr' : '1fr',
            gap: '1.5rem',
            marginBottom: '2rem',
          }}
        >
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed var(--border-medium)',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--bg-surface-elevated)',
              padding: '2.5rem 1.5rem',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileChange(e.target.files[0]);
                }
              }}
            />

            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'rgba(99, 102, 241, 0.15)',
                color: 'var(--primary-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
              }}
            >
              <UploadCloud size={30} />
            </div>

            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>
              {selectedFile ? selectedFile.name : 'Foto oder Arbeitsblatt hochladen'}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', maxWidth: '380px', marginBottom: '1.25rem' }}>
              Ziehe ein Foto hierher oder klicke, um ein Bild (JPG, PNG, Foto vom Smartphone) auszuwählen.
            </p>

            <button type="button" className="btn btn-secondary btn-sm">
              <Camera size={16} />
              <span>Datei / Foto auswählen</span>
            </button>
          </div>

          {imagePreview && (
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Vorschau des Arbeitsblatts
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(null);
                      setSelectedFile(null);
                    }}
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--danger)' }}
                  >
                    Entfernen
                  </button>
                </div>

                <div
                  style={{
                    maxHeight: '220px',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    background: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1.25rem',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <img
                    src={imagePreview}
                    alt="Arbeitsblatt Vorschau"
                    style={{ maxWidth: '100%', maxHeight: '220px', objectFit: 'contain' }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                    Lektionsname / Einheit (optional)
                  </label>
                  <input
                    type="text"
                    value={lessonName}
                    onChange={(e) => setLessonName(e.target.value)}
                    placeholder={language === 'en' ? 'z.B. Unit 3: Wildlife & Nature' : 'z.B. Lektion 2: In Foro Romano'}
                    className="input-field"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isLoading}
                className="btn btn-primary btn-lg"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {isLoading ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    <span>Gemini analysiert Arbeitsblatt...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    <span>Mit Gemini analysieren & Vokabeln extrahieren</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {!analysisResult && (
        <div style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <FileText size={18} color="var(--primary-light)" />
            <h3 style={{ fontSize: '1.1rem' }}>
              Kein Arbeitsblatt zur Hand? Teste mit einem Beispiel-Schulblatt:
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {availableSamples.map(sample => (
              <div
                key={sample.id}
                onClick={() => handleLoadSample(sample)}
                className="glass-panel"
                style={{
                  padding: '1.25rem',
                  cursor: 'pointer',
                  border: '1px solid var(--border-subtle)',
                  transition: 'transform 0.18s ease, border-color 0.18s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--primary)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                  <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary-light)' }}>
                    {sample.suggestedLesson}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {sample.simulatedResults.length} Vokabeln
                  </span>
                </div>
                <h4 style={{ fontSize: '1rem', marginBottom: '0.35rem' }}>{sample.title}</h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.85rem' }}>
                  {sample.description}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary-light)', fontSize: '0.85rem', fontWeight: 600 }}>
                  <Eye size={15} />
                  <span>Beispiel laden & analysieren</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div
          className="animate-fade-in"
          style={{
            background: 'var(--danger-bg)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-md)',
            marginTop: '1.5rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
          }}
        >
          <AlertCircle size={20} color="var(--danger)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ flex: 1 }}>
            <p style={{ color: '#fca5a5', fontSize: '0.92rem', marginBottom: '0.5rem' }}>{error}</p>
            {!geminiApiKey && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="btn btn-secondary btn-sm"
              >
                Gemini API-Key jetzt eintragen
              </button>
            )}
          </div>
        </div>
      )}

      {analysisResult && (
        <div className="glass-panel animate-fade-in" style={{ padding: '2rem', marginTop: '1.5rem' }}>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem',
              marginBottom: '1.5rem',
              borderBottom: '1px solid var(--border-subtle)',
              paddingBottom: '1.25rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                <Sparkles size={20} color="var(--primary-light)" />
                <h3 style={{ fontSize: '1.4rem' }}>
                  Erkannte Vokabeln überprüfen ({analysisResult.words.length})
                </h3>
              </div>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                Thema: <strong>{analysisResult.detectedTopic || lessonName}</strong> • {selectedCount} Vokabeln ausgewählt
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => handleSelectAll(true)}
                className="btn btn-ghost btn-sm"
              >
                Alle auswählen
              </button>
              <button
                type="button"
                onClick={() => handleSelectAll(false)}
                className="btn btn-ghost btn-sm"
              >
                Keine
              </button>
              <button
                type="button"
                onClick={handleSaveToCollection}
                disabled={selectedCount === 0}
                className="btn btn-success"
              >
                <Plus size={16} />
                <span>{selectedCount} Vokabeln übernehmen</span>
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem', maxWidth: '400px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              Lektion für diese Vokabeln:
            </label>
            <input
              type="text"
              value={lessonName}
              onChange={(e) => setLessonName(e.target.value)}
              placeholder="z.B. Unit 3: Wildlife & Nature"
              className="input-field"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {analysisResult.words.map((item, index) => {
              return (
                <div
                  key={index}
                  style={{
                    background: item.selected !== false ? 'var(--bg-surface-elevated)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${item.selected !== false ? 'var(--border-medium)' : 'var(--border-subtle)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '1.1rem',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '1rem',
                    opacity: item.selected !== false ? 1 : 0.5,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={item.selected !== false}
                    onChange={() => handleToggleSelectWord(index)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                  />

                  <AudioButton text={item.word} language={language} size="sm" />

                  <div style={{ flex: '1 1 200px' }}>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Fremdwort ({language === 'en' ? 'Englisch' : 'Latein'})
                    </label>
                    <input
                      type="text"
                      value={item.word}
                      onChange={(e) => handleWordChange(index, 'word', e.target.value)}
                      className="input-field"
                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.95rem', fontWeight: 600 }}
                    />
                  </div>

                  <div style={{ flex: '1 1 220px' }}>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Deutsche Übersetzung
                    </label>
                    <input
                      type="text"
                      value={item.translation}
                      onChange={(e) => handleWordChange(index, 'translation', e.target.value)}
                      className="input-field"
                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.95rem' }}
                    />
                  </div>

                  <div style={{ width: '130px' }}>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Wortart
                    </label>
                    <select
                      value={item.partOfSpeech}
                      onChange={(e) => handleWordChange(index, 'partOfSpeech', e.target.value as PartOfSpeech)}
                      className="input-field"
                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                    >
                      {Object.entries(PART_OF_SPEECH_LABELS).map(([key, val]) => (
                        <option key={key} value={key}>
                          {val.badge} - {val.de}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ flex: '1 1 180px' }}>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Grammatik / Notiz
                    </label>
                    <input
                      type="text"
                      value={item.notes || ''}
                      onChange={(e) => handleWordChange(index, 'notes', e.target.value)}
                      placeholder="z.B. unregelm. Verb"
                      className="input-field"
                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveWord(index)}
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--danger)', padding: '0.4rem' }}
                    title="Vokabel verwerfen"
                  >
                    <Trash2 size={16} />
                  </button>

                  {item.exampleSentence && (
                    <div style={{ width: '100%', paddingLeft: '2.5rem', fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
                      💬 <em>"{item.exampleSentence}"</em>
                      {item.exampleTranslation && <span> — {item.exampleTranslation}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button
              type="button"
              onClick={() => setAnalysisResult(null)}
              className="btn btn-secondary"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={handleSaveToCollection}
              disabled={selectedCount === 0}
              className="btn btn-success btn-lg"
            >
              <Check size={18} />
              <span>{selectedCount} Vokabeln zur Sammlung hinzufügen</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
