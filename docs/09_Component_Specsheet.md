# Component Specsheet (Frontend)

## Shared Components (`/app/shared/components`)

### `LanguagePicker`
- Props: `languages: LanguageOption[]`, `value`, `onChange`
- Renders icon+script grid; Tier-1 languages pinned, others in scrollable "More" section.
- Accessibility: each item has TTS preview of language name on long-press.

### `MicButton`
- Props: `isRecording`, `onStart`, `onStop`, `disabled`
- States: idle / recording (animated waveform) / processing (spinner) / error.
- Uses `useMicPermission` shared hook; falls back to disabled+tooltip if permission denied.

### `ChatBubble`
- Props: `speaker: 'ai' | 'patient'`, `text`, `audioUrl?`
- AI bubbles include an inline play button bound to `audioUrl` (TTS).

### `ConfirmationSummaryCard`
- Props: `fields: IntakeField[]`
- Renders plain-language bullet recap; used on both patient confirmation and doctor
  summary screens (shared component, different edit-permission mode).

### `FlagBadge`
- Props: `type: 'missing' | 'contradiction' | 'priority'`, `severity?`, `label`
- Color-coded (⚠ amber for missing/contradiction, 🔴🟡🟢 for priority).

### `EditableField` (doctor-only)
- Props: `label`, `value`, `source: 'AI_GENERATED' | 'DOCTOR_VERIFIED'`, `onChange`
- Shows a small "AI-generated" tag until edited/verified; on change, fires audit-logged
  PATCH.

### `PatientQueueCard`
- Props: `patient`, `priority`, `waitTime`, `onSelect`
- Sorted list item; priority-colored left border.

### `NextPatientButton`
- Primary CTA on doctor queue screen; pulls highest-priority-then-earliest patient.

### `LanguageTierBadge`
- Small indicator ("Beta accuracy") shown when a Tier-2/3 language is selected, so
  expectations are set transparently (supports "all Indian languages" scope honestly).

## Screen-Level Components

| Screen | Key Components Used |
|---|---|
| `(patient)/index` | LanguagePicker, MicButton (preview), Illustration |
| `(patient)/intake/[sessionId]` | ChatBubble list, MicButton, TextInputFallback, FlagBadge (missing-info nudge) |
| `(patient)/confirm/[sessionId]` | ConfirmationSummaryCard, PrimaryButton x2 |
| `(doctor)/queue` | PatientQueueCard list, NextPatientButton, CampStatsHeader |
| `(doctor)/patient/[intakeId]` | ConfirmationSummaryCard (editable mode), FlagBadge(s), EditableField, VerifyButton |

## Design Tokens (NativeWind theme)
- Color roles: `primary`, `surface`, `flag-high` (red), `flag-medium` (amber),
  `flag-low`/`ok` (green), `text-onLight`, `text-onDark`.
- Type scale tuned for low-literacy readability: minimum body text 16sp, headings 22–28sp.
- Spacing scale: 4/8/12/16/24/32 for consistent large touch-target layout.
