/** Design tokens — 15_Design_Principles_UIUX.md §1. No colors outside this file. */
export const colors = {
  surface: '#FBF9F6',
  surfaceAlt: '#F1EFE9',
  ink: '#1E2422',
  inkMuted: '#5B655F',
  primary: '#1F6E5C',
  primaryDeep: '#134A3E',
  accent: '#D98F4E',
  flagHigh: '#C4453D',
  flagMedium: '#D9A63E',
  flagLow: '#3E8F63',
  border: '#DEDACF',
} as const;

export const typeScale = {
  xs: 12,
  sm: 14,
  body: 16,
  md: 18,
  lg: 22,
  xl: 28,
  display: 36,
} as const;

export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 24,
  6: 32,
  7: 48,
} as const;

export const radius = {
  card: 12,
  mic: 24,
} as const;

export const shadow = {
  card: {
    shadowColor: '#1E2422',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
} as const;

export const fonts = {
  display: 'Fraunces_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_600SemiBold',
} as const;

export const touchMin = 48;
