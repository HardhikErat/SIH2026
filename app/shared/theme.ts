/**
 * Premium healthcare design tokens — hospital-grade (Apollo/Fortis inspired).
 */
export const colors = {
  ink: '#0C1B2A',
  inkMuted: '#5A6B78',
  navy900: '#062035',
  navy800: '#0A2E4A',
  navy700: '#124A72',
  navy600: '#1A5F8F',
  teal700: '#0E6B63',
  teal500: '#1A9E8F',
  teal400: '#2DB8A8',
  tealSoft: 'rgba(14, 107, 99, 0.1)',
  gold500: '#C9A227',
  gold400: '#D4B44A',
  goldSoft: 'rgba(201, 162, 39, 0.14)',
  sand100: '#F7F9FC',
  sand200: '#EEF2F7',
  sky50: '#F4F8FC',
  line: '#D8E0EA',
  white: '#FFFFFF',
  statusOk: '#2D7A4F',
  statusWait: '#B98A2D',
  statusUrgent: '#C0392B',
  // Semantic aliases
  surface: '#F7F9FC',
  surfaceAlt: '#EEF2F7',
  surfaceElevated: '#FFFFFF',
  primary: '#0A2E4A',
  primaryDeep: '#062035',
  primarySoft: 'rgba(10, 46, 74, 0.08)',
  accent: '#1A9E8F',
  accentSoft: 'rgba(26, 158, 143, 0.12)',
  border: '#D8E0EA',
  borderStrong: '#B8C5D4',
  flagHigh: '#C0392B',
  flagMedium: '#B98A2D',
  flagLow: '#2D7A4F',
  heroGradientStart: '#062035',
  heroGradientEnd: '#124A72',
} as const;

export const typeScale = {
  label: 12,
  caption: 14,
  body: 16,
  title: 22,
  headline: 32,
  display: 44,
  hero: 56,
} as const;

export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 24,
  6: 32,
  7: 48,
  8: 64,
  9: 80,
  10: 96,
} as const;

export const radius = {
  sm: 8,
  card: 16,
  lg: 20,
  xl: 28,
  mic: 24,
  pill: 999,
} as const;

export const shadow = {
  card: {
    shadowColor: '#062035',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  elevated: {
    shadowColor: '#062035',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  glow: {
    shadowColor: '#1A9E8F',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
} as const;

export const fonts = {
  ui: 'Inter_400Regular',
  uiSemiBold: 'Inter_600SemiBold',
  noto: 'NotoSans_400Regular',
  notoSemiBold: 'NotoSans_600SemiBold',
  data: 'IBMPlexSans_400Regular',
  dataSemiBold: 'IBMPlexSans_600SemiBold',
  body: 'Inter_400Regular',
  bodySemiBold: 'Inter_600SemiBold',
} as const;

export const layout = {
  patientMax: 480,
  contentMax: 480,
  doctorMax: 720,
  landingMax: 1120,
  landingNarrow: 640,
} as const;

export const typography = {
  hero: {
    fontFamily: fonts.uiSemiBold,
    fontSize: typeScale.hero,
    lineHeight: 60,
    color: colors.white,
    letterSpacing: -0.5,
  },
  display: {
    fontFamily: fonts.uiSemiBold,
    fontSize: typeScale.display,
    lineHeight: 52,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  headline: {
    fontFamily: fonts.uiSemiBold,
    fontSize: typeScale.headline,
    lineHeight: 40,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  title: {
    fontFamily: fonts.uiSemiBold,
    fontSize: typeScale.title,
    lineHeight: 30,
    color: colors.ink,
  },
  body: {
    fontFamily: fonts.ui,
    fontSize: typeScale.body,
    lineHeight: 26,
    color: colors.ink,
  },
  bodyMuted: {
    fontFamily: fonts.ui,
    fontSize: typeScale.body,
    lineHeight: 26,
    color: colors.inkMuted,
  },
  caption: {
    fontFamily: fonts.ui,
    fontSize: typeScale.caption,
    lineHeight: 22,
    color: colors.inkMuted,
  },
  label: {
    fontFamily: fonts.uiSemiBold,
    fontSize: typeScale.label,
    lineHeight: 16,
    color: colors.inkMuted,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
  },
  data: {
    fontFamily: fonts.data,
    fontSize: typeScale.body,
    lineHeight: 26,
    color: colors.ink,
  },
  h1: {
    fontFamily: fonts.uiSemiBold,
    fontSize: typeScale.display,
    lineHeight: 52,
    color: colors.ink,
  },
  h2: {
    fontFamily: fonts.uiSemiBold,
    fontSize: typeScale.headline,
    lineHeight: 40,
    color: colors.ink,
  },
  h3: {
    fontFamily: fonts.uiSemiBold,
    fontSize: typeScale.title,
    lineHeight: 30,
    color: colors.ink,
  },
} as const;

export const touchMin = 52;

export type StatusTone = 'ok' | 'wait' | 'urgent' | 'neutral';

export const statusPalette: Record<StatusTone, { fg: string; bg: string }> = {
  ok: { fg: colors.statusOk, bg: 'rgba(45, 122, 79, 0.12)' },
  wait: { fg: colors.statusWait, bg: 'rgba(185, 138, 45, 0.12)' },
  urgent: { fg: colors.statusUrgent, bg: 'rgba(192, 57, 43, 0.12)' },
  neutral: { fg: colors.navy700, bg: colors.primarySoft },
};
