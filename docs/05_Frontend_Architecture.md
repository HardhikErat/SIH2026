# Frontend Architecture

## 1. Framework & Tooling
- **React Native + Expo (Expo Router, TypeScript)** — single codebase for Web, Android,
  iOS, iPadOS.
- Styling: **NativeWind** (Tailwind classes on RN) for consistent, low-literacy-friendly,
  large-touch-target UI across platforms.
- State/data-fetching: **TanStack Query** (server cache, retries — important on flaky rural
  networks) + **Zustand** (local session/UI state).
- Forms/validation: **Zod** schemas mirrored from backend Pydantic models.
- Audio: `expo-av` / `expo-audio` for mic capture and TTS playback.
- i18n shell: `expo-localization` + custom translation loader (see Localization doc) for UI
  chrome text (buttons, labels) in the patient's selected language; clinical content itself
  is handled by ASR/LLM/TTS, not static i18n strings.
- Offline cache: `expo-sqlite` / `AsyncStorage` for local session queue (Should-Have,
  architecture reserved from day one).

## 2. App Structure (Expo Router)
```
/app
 ├─ (patient)/
 │   ├─ index.tsx            # language selection / entry
 │   ├─ intake/[sessionId].tsx  # voice/text conversation screen
 │   └─ confirm/[sessionId].tsx # patient confirmation summary
 ├─ (doctor)/
 │   ├─ login.tsx
 │   ├─ queue.tsx             # next-patient queue
 │   ├─ patient/[intakeId].tsx # structured summary + flags + edit/verify
 │   └─ dashboard.tsx          # camp-level stats (post-MVP)
 ├─ (admin)/
 │   └─ camp-setup.tsx         # session/camp management
 ├─ _layout.tsx                # root layout, theme, providers
 └─ shared/
     ├─ components/
     ├─ hooks/
     ├─ api/                   # typed API client (generated from OpenAPI)
     └─ i18n/
```

## 3. Two Primary Surfaces
### 3.1 Patient Experience (`/patient`)
- Large icon + voice-first UI; minimal text; big mic button; language picker with
  flag/script icons for low-literacy recognition (not just text names).
- Conversation screen: turn-based chat bubbles + live waveform while recording + TTS
  auto-playback of AI question.
- Confirmation screen: plain-language recap ("You told me: Fever — 3 days...") with
  Yes/Go-Back actions before any submission.

### 3.2 Doctor Experience (`/doctor`)
- Optimized for tablet/desktop (PHC front desk, iPad-class screens) but responsive down to
  phone.
- Queue view: card list sorted by priority flag color + arrival time; "Next Patient" primary
  action per source doc's simplified V1 workflow.
- Patient detail view: structured summary grouped by (Chief Complaint / Symptoms /
  History / Medications / Allergies), missing-field badges, contradiction warnings,
  inline edit fields, single "Verify & Save" action that calls the audit-logged verify
  endpoint.

## 4. Cross-Platform Considerations
- Responsive breakpoints (NativeWind) for phone / tablet / web-desktop layouts from the
  same components — no platform-forked screens.
- Platform-specific audio permission handling (`expo-av` permission flow) abstracted in a
  shared `useMicPermission` hook.
- Web build served statically from Vercel (Expo Web export) with PWA manifest so patient
  kiosks can "install" it without an app store, matching the PPT's "React PWA, low-literacy
  UI" requirement.

## 5. Accessibility & UX Guardrails
- All interactive elements ≥44x44pt touch targets.
- High-contrast theme option; large-font mode.
- Every AI text prompt has a paired TTS audio button.
- No screen requires reading more than ~2 short sentences before an action is available.
