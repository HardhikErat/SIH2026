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
  setLanguage: (code: string) => void;
  setAudioConsent: (v: boolean) => void;
  start: (sessionId: string, token: string, greeting: string) => void;
  addTurns: (patient: string, ai: string, chips?: { label: string; field: string }[]) => void;
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
  setLanguage: (language) => set({ language }),
  setAudioConsent: (audioConsent) => set({ audioConsent }),
  start: (sessionId, token, greeting) =>
    set({ sessionId, token, turns: [{ speaker: 'ai', text: greeting }], chips: [] }),
  addTurns: (patient, ai, chips) =>
    set((s) => ({
      turns: [...s.turns, { speaker: 'patient', text: patient }, { speaker: 'ai', text: ai }],
      chips: chips ?? s.chips,
    })),
  setDoctorToken: (doctorToken) => set({ doctorToken }),
  reset: () => set({ sessionId: null, token: null, chips: [], turns: [] }),
}));
