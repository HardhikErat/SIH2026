import { colors } from '../theme';

const API = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

export class ApiError extends Error {
  code: string;
  details: Record<string, unknown>;
  status: number;
  constructor(status: number, code: string, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request<T>(path: string, init: RequestInit = {}, token?: string | null): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = data.error ?? {};
    throw new ApiError(res.status, err.code ?? 'HTTP_ERROR', err.message ?? 'Request failed', err.details ?? {});
  }
  return data as T;
}

export type LanguageOption = {
  code: string;
  name: string;
  native_name: string;
  script: string;
  tier: number;
  asr_supported: boolean;
  tts_supported: boolean;
};

export const api = {
  health: () => request<{ status: string; llm: string; llm_live: boolean; asr_live: boolean }>('/health'),
  languages: () => request<{ languages: LanguageOption[] }>('/languages'),
  startSession: (body: {
    language: string;
    dialect_hint?: string;
    display_name?: string;
    audio_consent?: boolean;
    camp_id?: string;
  }) =>
    request<{
      session_id: string;
      patient_id: string;
      token: string;
      language: LanguageOption;
      ai_message: string;
    }>('/session/start', { method: 'POST', body: JSON.stringify(body) }),
  turn: (sessionId: string, token: string, body: Record<string, unknown>) =>
    request<TurnResponse>(`/conversation/${sessionId}/turn`, { method: 'POST', body: JSON.stringify(body) }, token),
  state: (sessionId: string, token: string) =>
    request<{ collected_fields: Record<string, unknown>; turn_history: unknown[] }>(
      `/conversation/${sessionId}/state`,
      {},
      token,
    ),
  summary: (sessionId: string, token: string) =>
    request<{ recap: string; fields: Record<string, unknown>; missing_fields: string[]; source: string }>(
      `/intake/${sessionId}/summary`,
      {},
      token,
    ),
  confirm: (sessionId: string, token: string) =>
    request<{ intake_id: string; status: string; session_status: string }>(
      `/intake/${sessionId}/confirm`,
      { method: 'POST', body: JSON.stringify({ confirmed: true }) },
      token,
    ),
  doctorLogin: (email: string, password: string) =>
    request<{ token: string; role: string; user_id: string }>(
      '/doctor/login',
      { method: 'POST', body: JSON.stringify({ email, password }) },
    ),
  queue: (token: string) => request<{ queue: QueueItem[]; next_patient: QueueItem | null }>('/doctor/queue', {}, token),
  doctorIntake: (id: string, token: string) => request<DoctorIntake>(`/doctor/intake/${id}`, {}, token),
  patchIntake: (id: string, token: string, fields: Record<string, unknown>) =>
    request(`/doctor/intake/${id}`, { method: 'PATCH', body: JSON.stringify({ fields }) }, token),
  verify: (id: string, token: string, acknowledge_high_priority: boolean) =>
    request(`/doctor/intake/${id}/verify`, {
      method: 'POST',
      body: JSON.stringify({ acknowledge_high_priority }),
    }, token),
  createCamp: (token: string, body: Record<string, string>) =>
    request<{ id: string; name: string }>('/admin/camp', { method: 'POST', body: JSON.stringify(body) }, token),
  campStats: (token: string, campId: string) => request(`/admin/camp/${campId}/stats`, {}, token),
  metrics: (token: string) => request('/metrics/summary', {}, token),
  transcribe: (token: string, audio_base64: string, language: string) =>
    request<{ text: string; confidence: number }>(
      '/speech/transcribe',
      { method: 'POST', body: JSON.stringify({ audio_base64, language }) },
      token,
    ),
  synthesize: (text: string, language: string) =>
    request<{ audio_url?: string; audio_base64?: string }>('/speech/synthesize', {
      method: 'POST',
      body: JSON.stringify({ text, language }),
    }),
};

export type TurnResponse = {
  ai_message: string;
  audio_url?: string;
  updated_fields: Record<string, unknown>;
  missing_fields: string[];
  contradictions: unknown[];
  priority_flag: string;
  next_question: unknown;
  ready_for_confirm: boolean;
  fact_chips: { label: string; field: string }[];
  model_version?: string;
  llm_live?: boolean;
};

export type QueueItem = {
  intake_id: string;
  display_name: string;
  priority_flag: string;
  chief_complaint?: string;
  wait_seconds?: number;
  status: string;
};

export type DoctorIntake = {
  id: string;
  status: string;
  priority_flag: string;
  ai_summary?: string;
  missing_information?: string[];
  contradictions?: unknown[];
  structured_fields?: Record<string, unknown>;
  chief_complaint?: string;
  duration?: string;
  medications?: unknown;
  allergies?: string;
  symptoms?: unknown;
  medical_history?: unknown;
  source_tag?: string;
  audit_log?: { field_name: string; old_value: unknown; new_value: unknown; changed_at: string }[];
};

export { colors };
