import type { WordItem, AppSettings, Language, WorksheetAnalysisResponse, UserProfile, LearnerStats } from '../types/vocabulary';

const API_BASE = '/api';


export async function checkServerHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(2500) });
    return res.ok;
  } catch {
    return false;
  }
}

// --- Profiles API ---

export async function apiGetProfiles(): Promise<UserProfile[]> {
  const res = await fetch(`${API_BASE}/profiles`);
  if (!res.ok) {
    throw new Error(`Failed to fetch profiles: ${res.statusText}`);
  }
  return res.json();
}

export async function apiCreateProfile(profile: { name: string; avatar?: string; color?: string }): Promise<UserProfile> {
  const res = await fetch(`${API_BASE}/profiles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to create profile');
  }
  return res.json();
}

export async function apiUpdateProfile(profile: UserProfile): Promise<UserProfile> {
  const res = await fetch(`${API_BASE}/profiles/${encodeURIComponent(profile.id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to update profile');
  }
  return res.json();
}

export async function apiDeleteProfile(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/profiles/${encodeURIComponent(id)}`, {
    method: 'DELETE',
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
  const res = await fetch(url);
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

export async function apiDeleteLesson(lesson: string, language?: Language, profileId?: string): Promise<{ deletedCount: number }> {
  const res = await fetch(`${API_BASE}/words/delete-lesson`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lesson, language, profileId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to delete lesson');
  }
  return res.json();
}

export async function apiRecordReview(wordId: string, wasCorrect: boolean, profileId?: string): Promise<WordItem> {
  const res = await fetch(`${API_BASE}/words/${encodeURIComponent(wordId)}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wasCorrect, profileId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to record review');
  }
  return res.json();
}

export async function apiResetProgress(profileId?: string): Promise<WordItem[]> {
  const res = await fetch(`${API_BASE}/words/reset-progress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profileId }),
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
