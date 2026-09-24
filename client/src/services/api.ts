import type { WordItem, AppSettings, Language, WorksheetAnalysisResponse } from '../types/vocabulary';

const API_BASE = '/api';

export async function checkServerHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(2500) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function apiGetWords(language?: Language): Promise<WordItem[]> {
  const url = language ? `${API_BASE}/words?language=${encodeURIComponent(language)}` : `${API_BASE}/words`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch words from server: ${res.statusText}`);
  }
  return res.json();
}

export async function apiCreateWord(word: Partial<WordItem>): Promise<WordItem> {
  const res = await fetch(`${API_BASE}/words`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(word),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to create word');
  }
  return res.json();
}

export async function apiBatchCreateWords(words: WordItem[]): Promise<WordItem[]> {
  const res = await fetch(`${API_BASE}/words/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ words }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to batch create words');
  }
  const data = await res.json();
  return data.words;
}

export async function apiUpdateWord(word: WordItem): Promise<WordItem> {
  const res = await fetch(`${API_BASE}/words/${encodeURIComponent(word.id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(word),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to update word');
  }
  return res.json();
}

export async function apiDeleteWord(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/words/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to delete word');
  }
}

export async function apiDeleteLesson(lesson: string, language?: Language): Promise<{ deletedCount: number }> {
  const res = await fetch(`${API_BASE}/words/delete-lesson`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lesson, language }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to delete lesson');
  }
  return res.json();
}

export async function apiRecordReview(wordId: string, wasCorrect: boolean): Promise<WordItem> {
  const res = await fetch(`${API_BASE}/words/${encodeURIComponent(wordId)}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wasCorrect }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to record review');
  }
  return res.json();
}

export async function apiResetProgress(): Promise<WordItem[]> {
  const res = await fetch(`${API_BASE}/words/reset-progress`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to reset progress');
  }
  const data = await res.json();
  return data.words;
}

export async function apiResetToDefaults(): Promise<WordItem[]> {
  const res = await fetch(`${API_BASE}/words/reset-defaults`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to reset to defaults');
  }
  const data = await res.json();
  return data.words;
}

export async function apiGetSettings(): Promise<AppSettings> {
  const res = await fetch(`${API_BASE}/settings`);
  if (!res.ok) {
    throw new Error(`Failed to fetch settings: ${res.statusText}`);
  }
  return res.json();
}

export async function apiSaveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to save settings');
  }
  return res.json();
}

export async function apiAnalyzeWorksheet(params: {
  base64Data: string;
  mimeType: string;
  language: Language;
  suggestedLesson: string;
  apiKey?: string;
}): Promise<WorksheetAnalysisResponse> {
  const res = await fetch(`${API_BASE}/ai/analyze-worksheet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Worksheet analysis failed on server');
  }
  return res.json();
}
