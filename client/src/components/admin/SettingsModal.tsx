import { useModal } from '../common/useModal';
import React, { useState } from 'react';
import {
  X,
  Key,
  Volume2,
  ShieldCheck,
  Check,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Server,
} from 'lucide-react';
import type { AppSettings, Language } from '../../types/vocabulary';
import { speechService } from '../../services/speech';
import { testAiConnection, listAiModels } from '../../services/gemini';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => Promise<void>;
  onResetToDefaults: () => Promise<void>;
  currentLanguage: Language;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onResetToDefaults,
  currentLanguage,
}) => {
  const [aiTab, setAiTab] = useState<'openai' | 'gemini'>(() =>
    settings.geminiApiKey && !settings.aiBaseUrl ? 'gemini' : 'openai'
  );
  const [aiBaseUrl, setAiBaseUrl] = useState(settings.aiBaseUrl || '');
  const [aiModel, setAiModel] = useState(settings.aiModel || '');
  const [aiApiKey, setAiApiKey] = useState(settings.aiApiKey || '');
  const [apiKey, setApiKey] = useState(settings.geminiApiKey || '');
  const [speechRate, setSpeechRate] = useState(settings.speechRate || 0.9);
  const [autoPlayAudio, setAutoPlayAudio] = useState(settings.autoPlayAudio);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string>('');
  const [discoveredModels, setDiscoveredModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  const modalRef = useModal(isOpen, onClose);

  if (!isOpen) return null;

  const handleLoadModels = async () => {
    setLoadingModels(true);
    setTestMessage('');
    setTestStatus('idle');
    try {
      const models = await listAiModels({
        aiBaseUrl: aiBaseUrl.trim() || undefined,
        aiApiKey: aiApiKey.trim() || undefined,
      });
      setDiscoveredModels(models);
      if (models.length === 0) {
        setTestStatus('error');
        setTestMessage('Keine Modelle vom Endpunkt gemeldet. Modellname bitte manuell eintragen.');
      } else {
        if (!aiModel.trim()) setAiModel(models[0]);
        setTestStatus('success');
        setTestMessage(`✅ ${models.length} Modell${models.length === 1 ? '' : 'e'} geladen.`);
      }
    } catch (err: unknown) {
      setTestStatus('error');
      setTestMessage(`❌ ${err instanceof Error ? err.message : 'Modelle konnten nicht geladen werden.'}`);
    } finally {
      setLoadingModels(false);
    }
  };

  const handleTestConnection = async () => {
    const trimmedBaseUrl = aiBaseUrl.trim();
    const trimmedModel = aiModel.trim();
    const trimmedAiKey = aiApiKey.trim();
    const trimmedGeminiKey = apiKey.trim();

    if (!trimmedBaseUrl && !trimmedGeminiKey && !settings.aiAvailable) {
      setTestStatus('error');
      setTestMessage(
        aiTab === 'openai'
          ? 'Bitte gib zuerst eine Modell-Endpunkt-URL ein (oder konfiguriere AI_BASE_URL auf dem Server).'
          : 'Bitte gib zuerst einen Gemini API-Key ein.'
      );
      return;
    }

    setTestStatus('testing');
    setTestMessage('Verbindung zum KI-Modell wird geprüft...');

    try {
      const result = await testAiConnection(
        aiTab === 'openai'
          ? {
              aiBaseUrl: trimmedBaseUrl || undefined,
              aiModel: trimmedModel || undefined,
              aiApiKey: trimmedAiKey || undefined,
              geminiApiKey: !trimmedBaseUrl ? trimmedGeminiKey || undefined : undefined,
            }
          : {
              geminiApiKey: trimmedGeminiKey || undefined,
            }
      );
      setTestStatus('success');
      const providerLabel = result.provider === 'openai' ? 'Modell-Endpunkt' : 'Google Gemini';
      setTestMessage(`✅ Verbindung erfolgreich (${providerLabel}, Modell: ${result.model})!`);
    } catch (err: unknown) {
      setTestStatus('error');
      setTestMessage(`❌ ${err instanceof Error ? err.message : 'Verbindung fehlgeschlagen.'}`);
    }
  };

  const handleSave = async () => {
    try {
      await onSaveSettings({
        ...settings,
        aiBaseUrl: aiBaseUrl.trim(),
        aiModel: aiModel.trim(),
        aiApiKey: aiApiKey.trim(),
        geminiApiKey: apiKey.trim(),
        speechRate,
        autoPlayAudio,
      });
      onClose();
    } catch (error) {
      setTestStatus('error');
      setTestMessage((error as Error).message);
    }
  };

  const handleTestSpeech = () => {
    const testText =
      currentLanguage === 'en'
        ? 'Welcome to Quasselstrippe! Practice makes perfect.'
        : 'Salvete discipuli! Repetitio est mater studiorum.';
    speechService.speak(testText, currentLanguage, { rate: speechRate });
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Einstellungen"
        tabIndex={-1}
        className="glass-panel animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '580px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: 'clamp(1.1rem, 4vw, 2rem)',
          position: 'relative',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-medium)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Sparkles size={22} color="var(--primary-light)" />
            <h3 style={{ fontSize: '1.35rem' }}>Einstellungen & KI-Verbindung</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            aria-label="Schließen"
            style={{ padding: '0.4rem' }}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          {settings.aiAvailable && (
            <div
              style={{
                fontSize: '0.82rem',
                padding: '0.55rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--success-bg)',
                color: 'var(--success)',
                marginBottom: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <ShieldCheck size={15} />
              <span>Auf dem Server ist bereits ein KI-Endpunkt konfiguriert und aktiv.</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.9rem' }}>
            <button
              type="button"
              onClick={() => { setAiTab('openai'); setTestMessage(''); setTestStatus('idle'); }}
              className={`btn btn-sm ${aiTab === 'openai' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1 }}
            >
              <Server size={14} />
              <span>Modell-Endpunkt (OpenAI)</span>
            </button>
            <button
              type="button"
              onClick={() => { setAiTab('gemini'); setTestMessage(''); setTestStatus('idle'); }}
              className={`btn btn-sm ${aiTab === 'gemini' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1 }}
            >
              <Key size={14} />
              <span>Google Gemini API</span>
            </button>
          </div>

          {aiTab === 'openai' ? (
            <div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                Verbinde einen OpenAI-kompatiblen Endpunkt (z.B. Reclopsy, LiteLLM, vLLM oder Ollama). Bleibt lokal in diesem Browser gespeichert; auf dem Server konfigurierte Werte (<code style={{ fontFamily: 'monospace' }}>AI_BASE_URL</code>) haben Vorrang.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '0.75rem' }}>
                <div>
                  <label htmlFor="ai-base-url" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                    Endpunkt-URL
                  </label>
                  <input
                    id="ai-base-url"
                    type="url"
                    value={aiBaseUrl}
                    onChange={(e) => { setAiBaseUrl(e.target.value); setDiscoveredModels([]); }}
                    placeholder="http://localhost:11435/v1"
                    className="input-field"
                    style={{ fontFamily: 'monospace', width: '100%' }}
                  />
                </div>

                <div>
                  <label htmlFor="ai-model" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                    Modellname (z.B. virtueller Reclopsy-Name, kommagetrennt für Fallback)
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      id="ai-model"
                      type="text"
                      value={aiModel}
                      onChange={(e) => setAiModel(e.target.value)}
                      placeholder="z.B. vision-llm oder general-llm"
                      className="input-field"
                      style={{ fontFamily: 'monospace', flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={handleLoadModels}
                      disabled={loadingModels || (!aiBaseUrl.trim() && !settings.aiAvailable)}
                      className="btn btn-secondary btn-sm"
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      {loadingModels ? <RefreshCw size={14} className="animate-spin" /> : 'Modelle laden'}
                    </button>
                  </div>
                  {discoveredModels.length > 0 && (
                    <select
                      aria-label="Verfügbares Modell auswählen"
                      value={discoveredModels.includes(aiModel) ? aiModel : ''}
                      onChange={(e) => { if (e.target.value) setAiModel(e.target.value); }}
                      className="input-field"
                      style={{ fontFamily: 'monospace', width: '100%', marginTop: '0.4rem' }}
                    >
                      <option value="">Modell aus Katalog wählen…</option>
                      {discoveredModels.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label htmlFor="ai-api-key" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                    API-Key / Bearer Token (optional)
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      id="ai-api-key"
                      type="password"
                      value={aiApiKey}
                      onChange={(e) => setAiApiKey(e.target.value)}
                      placeholder="Optional – leer lassen, wenn kein Token nötig"
                      className="input-field"
                      style={{ fontFamily: 'monospace', flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={testStatus === 'testing'}
                      className="btn btn-secondary btn-sm"
                      style={{ minWidth: '95px' }}
                    >
                      {testStatus === 'testing' ? <RefreshCw size={14} className="animate-spin" /> : 'Testen'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                <Key size={16} color="var(--primary-light)" />
                <span>Google Gemini API-Key</span>
              </label>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                Wird für die automatische Erkennung von Schul-Arbeitsblättern und Handschrift benötigt, falls kein generischer Modell-Endpunkt genutzt wird. Bleibt in diesem Browser gespeichert.
              </p>

              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="input-field"
                  style={{ fontFamily: 'monospace' }}
                />
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testStatus === 'testing'}
                  className="btn btn-secondary btn-sm"
                  style={{ minWidth: '95px' }}
                >
                  {testStatus === 'testing' ? <RefreshCw size={14} className="animate-spin" /> : 'Testen'}
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <ShieldCheck size={14} color="var(--success)" />
                  Persönlicher Schlüssel in diesem Browser
                </span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--primary-light)', display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none' }}
                >
                  <span>Kostenlosen Key holen</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          )}

          {testMessage && (
            <div
              style={{
                fontSize: '0.82rem',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                background: testStatus === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
                color: testStatus === 'success' ? 'var(--success)' : 'var(--danger)',
                marginTop: '0.5rem',
              }}
            >
              {testMessage}
            </div>
          )}
        </div>

        <div style={{ marginBottom: '2rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', fontWeight: 600 }}>
              <Volume2 size={16} color="var(--primary-light)" />
              <span>Sprechgeschwindigkeit (Aussprache)</span>
            </label>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {Math.round(speechRate * 100)}%
            </span>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Langsamere Aussprache (z.B. 80-90%) erleichtert Schulkindern das Verstehen und Nachsprechen.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
            <input
              type="range"
              min="0.6"
              max="1.2"
              step="0.05"
              value={speechRate}
              onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: 'var(--primary)', cursor: 'pointer' }}
            />
            <button
              type="button"
              onClick={handleTestSpeech}
              className="btn btn-secondary btn-sm"
            >
              <Volume2 size={14} />
              <span>Probe hören</span>
            </button>
          </div>
        </div>

        <label style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.5rem' }}>
          <input type="checkbox" checked={autoPlayAudio} onChange={event => setAutoPlayAudio(event.target.checked)} />
          Wörter automatisch vorlesen
        </label>
        <div style={{ marginBottom: '2rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Beispiel-Vokabeln wiederherstellen
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Setzt die Vokabeln auf die Standard-Schullektionen zurück.
              </div>
            </div>
            <button
              type="button"
              onClick={async () => {
                if (confirm('Alle Vokabeln und Lernfortschritte ALLER Profile löschen und durch die Beispiellektionen ersetzen?')) {
                  try { await onResetToDefaults(); onClose(); } catch (error) { setTestStatus('error'); setTestMessage((error as Error).message); }
                }
              }}
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--warning)' }}
            >
              Zurücksetzen
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="btn btn-primary"
          >
            <Check size={16} />
            <span>Einstellungen speichern</span>
          </button>
        </div>
      </div>
    </div>
  );
};
