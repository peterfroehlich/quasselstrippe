import React, { useState } from 'react';
import { 
  X, 
  Key, 
  Volume2, 
  ShieldCheck, 
  Check, 
  ExternalLink,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import type { AppSettings, Language } from '../../types/vocabulary';
import { speechService } from '../../services/speech';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  onResetToDefaults: () => void;
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
  const [apiKey, setApiKey] = useState(settings.geminiApiKey || '');
  const [speechRate, setSpeechRate] = useState(settings.speechRate || 0.9);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string>('');

  if (!isOpen) return null;

  const handleTestApiKey = async () => {
    if (!apiKey.trim()) {
      setTestStatus('error');
      setTestMessage('Bitte gib zuerst einen Gemini API-Key ein.');
      return;
    }

    setTestStatus('testing');
    setTestMessage('Verbindung zu Google Gemini wird geprüft...');

    const modelsToTry = ['gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-3.8-flash'];
    let connected = false;
    let lastErrorMsg = '';

    for (const model of modelsToTry) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: 'Antworte nur mit: OK' }] }],
            }),
          }
        );

        if (response.ok) {
          connected = true;
          setTestStatus('success');
          setTestMessage(`✅ Verbindung erfolgreich mit ${model}! Gemini ist einsatzbereit.`);
          break;
        } else {
          const errJson = await response.json().catch(() => null);
          lastErrorMsg = errJson?.error?.message || `HTTP ${response.status}`;
        }
      } catch (err: unknown) {
        lastErrorMsg = err instanceof Error ? err.message : 'Netzwerkfehler';
      }
    }

    if (!connected) {
      // Also try general models endpoint as verification
      try {
        const modelsRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`
        );
        if (modelsRes.ok) {
          setTestStatus('success');
          setTestMessage('✅ API-Key ist gültig und autorisiert!');
          return;
        } else {
          const errJson = await modelsRes.json().catch(() => null);
          lastErrorMsg = errJson?.error?.message || lastErrorMsg;
        }
      } catch {}

      setTestStatus('error');
      setTestMessage(`❌ API-Fehler: ${lastErrorMsg}`);
    }
  };

  const handleSave = () => {
    onSaveSettings({
      ...settings,
      geminiApiKey: apiKey.trim(),
      speechRate,
    });
    onClose();
  };

  const handleTestSpeech = () => {
    const testText = currentLanguage === 'en' 
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
        className="glass-panel animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '2rem',
          position: 'relative',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-medium)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Sparkles size={22} color="var(--primary-light)" />
            <h3 style={{ fontSize: '1.35rem' }}>Einstellungen & Gemini KI</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            style={{ padding: '0.4rem' }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.4rem' }}>
            <Key size={16} color="var(--primary-light)" />
            <span>Google Gemini API-Key</span>
          </label>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Wird für die automatische Erkennung von Schul-Arbeitsblättern benötigt. Bleibt ausschließlich lokal in deinem Browser gespeichert.
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
              onClick={handleTestApiKey}
              disabled={testStatus === 'testing'}
              className="btn btn-secondary btn-sm"
              style={{ minWidth: '95px' }}
            >
              {testStatus === 'testing' ? <RefreshCw size={14} className="animate-spin" /> : 'Testen'}
            </button>
          </div>

          {testMessage && (
            <div
              style={{
                fontSize: '0.82rem',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                background: testStatus === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
                color: testStatus === 'success' ? 'var(--success)' : 'var(--danger)',
                marginBottom: '0.5rem',
              }}
            >
              {testMessage}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <ShieldCheck size={14} color="var(--success)" />
              Sicher im Browser (localStorage)
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
              onClick={() => {
                if (confirm('Möchtest du die Vokabelsammlung wirklich auf die Werkseinstellungen mit den Schul-Beispiellektionen zurücksetzen?')) {
                  onResetToDefaults();
                  onClose();
                }
              }}
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--warning)' }}
            >
              Zurücksetzen
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
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
