import type { WordItem, AppSettings, Language, WorksheetAnalysisResponse, UserProfile, LearnerStats, HandwritingGradeResponse } from '../types/vocabulary';

const API_BASE = '/api';
export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
  get retryable() { return this.status === 0 || this.status >= 500 || this.status === 429; }
}
async function request(url: string, options: RequestInit = {}): Promise<Response> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new ApiError('Keine Verbindung zum Server.', 0);
  let response: Response;
  try { response = await fetch(url, { credentials: 'same-origin', signal: AbortSignal.timeout(10000), ...options }); }
  catch { throw new ApiError('Keine Verbindung zum Server.', 0); }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) window.dispatchEvent(new Event('quasselstrippe:unauthorized'));
    throw new ApiError(data.error || `Serverfehler (${response.status})`, response.status);
  }
  return response;
}
export async function apiSession(): Promise<boolean> {
  const res = await fetch(`${API_BASE}/auth/session`, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new ApiError('Anmeldung nicht erreichbar.', res.status);
  return (await res.json()).authenticated === true;
}
export async function apiLogin(password: string): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }), signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error((await res.json()).error || 'Anmeldung fehlgeschlagen.');
}
export async function apiLogout(): Promise<void> { await request(`${API_BASE}/auth/logout`, { method: 'POST' }); }



export async function checkServerHealth(): Promise<boolean> {
  try {
    const res = await request(`${API_BASE}/health`, { signal: AbortSignal.timeout(2500) });
    return res.ok;
  } catch {
    return false;
  }
}

// --- Profiles API ---

export async function apiGetProfiles(): Promise<UserProfile[]> {
  const res = await request(`${API_BASE}/profiles`);
  if (!res.ok) {
    throw new Error(`Failed to fetch profiles: ${res.statusText}`);
  }
  return res.json();
}

export async function apiCreateProfile(profile: { id?: string; name: string; avatar?: string; color?: string }, operationId?: string): Promise<UserProfile> {
  const res = await request(`${API_BASE}/profiles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(operationId ? { 'X-Operation-Id': operationId } : {}) },
    body: JSON.stringify(profile),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to create profile');
  }
  return res.json();
}

export async function apiUpdateProfile(profile: UserProfile, operationId?: string): Promise<UserProfile> {
  const res = await request(`${API_BASE}/profiles/${encodeURIComponent(profile.id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(operationId ? { 'X-Operation-Id': operationId } : {}) },
    body: JSON.stringify(profile),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to update profile');
  }
  return res.json();
}

export async function apiDeleteProfile(id: string, operationId?: string): Promise<void> {
  const res = await request(`${API_BASE}/profiles/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: operationId ? { 'X-Operation-Id': operationId } : {},
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to delete profile');
  }
}

export async function apiGetLearnerStats(profileId: string, language?: Language): Promise<LearnerStats> {
  const params = new URLSearchParams();
  if (language) params.append('language', language);
  const qs = params.toString();
  const url = qs
    ? `${API_BASE}/profiles/${encodeURIComponent(profileId)}/stats?${qs}`
    : `${API_BASE}/profiles/${encodeURIComponent(profileId)}/stats`;
  const res = await request(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to fetch learner stats');
  }
  return res.json();
}


// --- Words API ---

export async function apiGetWords(language?: Language, profileId?: string): Promise<WordItem[]> {
  const params = new URLSearchParams();
  if (language) params.append('language', language);
  if (profileId) params.append('profileId', profileId);
  const qs = params.toString();
  const url = qs ? `${API_BASE}/words?${qs}` : `${API_BASE}/words`;
  const res = await request(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch words from server: ${res.statusText}`);
  }
  return res.json();
}

export async function apiCreateWord(word: Partial<WordItem>, operationId?: string): Promise<WordItem> {
  const res = await request(`${API_BASE}/words`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(operationId ? { 'X-Operation-Id': operationId } : {}) },
    body: JSON.stringify(word),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to create word');
  }
  return res.json();
}

export async function apiBatchCreateWords(words: WordItem[], operationId?: string): Promise<WordItem[]> {
  const res = await request(`${API_BASE}/words/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(operationId ? { 'X-Operation-Id': operationId } : {}) },
    body: JSON.stringify({ words }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to batch create words');
  }
  const data = await res.json();
  return data.words;
}

export async function apiUpdateWord(word: WordItem, profileId: string, operationId?: string): Promise<WordItem> {
  const res = await request(`${API_BASE}/words/${encodeURIComponent(word.id)}?profileId=${encodeURIComponent(profileId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(operationId ? { 'X-Operation-Id': operationId } : {}) },
    body: JSON.stringify(word),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to update word');
  }
  return res.json();
}

export async function apiDeleteWord(id: string, profileId: string, operationId?: string): Promise<void> {
  const res = await request(`${API_BASE}/words/${encodeURIComponent(id)}?profileId=${encodeURIComponent(profileId)}`, {
    method: 'DELETE',
    headers: operationId ? { 'X-Operation-Id': operationId } : {},
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to delete word');
  }
}

export async function apiDeleteLesson(lesson: string, language?: Language, profileId?: string, operationId?: string): Promise<{ deletedCount: number }> {
  const res = await request(`${API_BASE}/words/delete-lesson`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(operationId ? { 'X-Operation-Id': operationId } : {}) },
    body: JSON.stringify({ lesson, language, profileId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to delete lesson');
  }
  return res.json();
}

export async function apiRecordReview(wordId: string, wasCorrect: boolean, profileId: string, eventId: string, reviewedAt: number, promote: boolean): Promise<WordItem> {
  const res = await request(`${API_BASE}/words/${encodeURIComponent(wordId)}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wasCorrect, profileId, eventId, reviewedAt, promote }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to record review');
  }
  return res.json();
}

export async function apiResetProgress(profileId?: string, operationId?: string): Promise<WordItem[]> {
  const res = await request(`${API_BASE}/words/reset-progress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(operationId ? { 'X-Operation-Id': operationId } : {}) },
    body: JSON.stringify({ profileId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to reset progress');
  }
  const data = await res.json();
  return data.words;
}

export async function apiResetToDefaults(operationId?: string): Promise<WordItem[]> {
  const res = await request(`${API_BASE}/words/reset-defaults`, {
    method: 'POST',
    headers: operationId ? { 'X-Operation-Id': operationId } : {},
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to reset to defaults');
  }
  const data = await res.json();
  return data.words;
}

export async function apiGetSettings(): Promise<AppSettings> {
  const res = await request(`${API_BASE}/settings`);
  if (!res.ok) {
    throw new Error(`Failed to fetch settings: ${res.statusText}`);
  }
  return res.json();
}

export async function apiSaveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  const res = await request(`${API_BASE}/settings`, {
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
  const res = await request(`${API_BASE}/ai/analyze-worksheet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    signal: AbortSignal.timeout(90000),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Worksheet analysis failed on server');
  }
  return res.json();
}

export async function apiGradeHandwriting(params: {
  base64Data: string;
  mimeType?: string;
  expectedWord: string;
  language: Language;
  apiKey?: string;
}): Promise<HandwritingGradeResponse> {
  const res = await request(`${API_BASE}/ai/grade-handwriting`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(75000),
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Handwriting grading failed on server');
  }
  return res.json();
}


