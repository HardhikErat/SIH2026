import { create } from 'zustand';

type ChatTurn = { speaker: 'ai' | 'patient'; text: string; audioUrl?: string };

type SessionState = {
  sessionId: string | null;
  token: string | null;
  language: string;
  audioConsent: boolean;
  chips: { label: string; field: string }[];
  turns: ChatTurn[];
  doctorToken: string | null;
  phase: 'basic_details' | 'consultation' | 'completed';
  patientDetails: { name: string; age: string; gender: string } | null;
  consultationSummary: Record<string, unknown> | null;
  setLanguage: (code: string) => void;
  setAudioConsent: (v: boolean) => void;
  start: (sessionId: string, token: string, greeting: string, patientDetails?: { name: string; age: string; gender: string }) => void;
  addTurns: (patient: string, ai: string, chips?: { label: string; field: string }[], phase?: 'basic_details' | 'consultation' | 'completed', summary?: Record<string, unknown> | null) => void;
  setDoctorToken: (token: string | null) => void;
  reset: () => void;
};

export const useSession = create<SessionState>((set) => ({
  sessionId: null,
  token: null,
  language: 'en',
  audioConsent: false,
  chips: [],
  turns: [],
  doctorToken: null,
  phase: 'basic_details',
  patientDetails: null,
  consultationSummary: null,
  setLanguage: (language) => set({ language }),
  setAudioConsent: (audioConsent) => set({ audioConsent }),
  start: (sessionId, token, greeting, patientDetails) =>
    set({ sessionId, token, turns: [{ speaker: 'ai', text: greeting }], chips: [], patientDetails, phase: 'basic_details', consultationSummary: null }),
  addTurns: (patient, ai, chips, phase, summary) =>
    set((s) => ({
      turns: [...s.turns, { speaker: 'patient', text: patient }, { speaker: 'ai', text: ai }],
      chips: chips ?? s.chips,
      phase: phase ?? s.phase,
      consultationSummary: summary ?? s.consultationSummary,
    })),
  setDoctorToken: (doctorToken) => set({ doctorToken }),
  reset: () => set({ sessionId: null, token: null, chips: [], turns: [], phase: 'basic_details', patientDetails: null, consultationSummary: null }),
}));
