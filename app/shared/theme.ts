/** Design tokens — 15_Design_Principles_UIUX.md §1 */
export const colors = {
  surface: '#FBF9F6',
  surfaceAlt: '#F1EFE9',
  surfaceElevated: '#FFFFFF',
  ink: '#1E2422',
  inkMuted: '#5B655F',
  primary: '#1F6E5C',
  primaryDeep: '#134A3E',
  primarySoft: '#E6F2EF',
  accent: '#D98F4E',
  accentSoft: '#FDF3E8',
  flagHigh: '#C4453D',
  flagMedium: '#D9A63E',
  flagLow: '#3E8F63',
  border: '#DEDACF',
  borderStrong: '#C8C2B4',
  overlay: 'rgba(30, 36, 34, 0.04)',
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
  8: 64,
} as const;

export const radius = {
  sm: 8,
  card: 12,
  lg: 16,
  mic: 24,
  pill: 999,
} as const;

export const shadow = {
  card: {
    shadowColor: '#1E2422',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  elevated: {
    shadowColor: '#1E2422',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
} as const;

export const fonts = {
  display: 'Fraunces_600SemiBold',
  displayRegular: 'Fraunces_400Regular',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_600SemiBold',
  bodySemiBold: 'Inter_600SemiBold',
} as const;

export const layout = {
  contentMax: 720,
  doctorMax: 960,
  landingMax: 1080,
} as const;

export const typography = {
  display: {
    fontFamily: fonts.display,
    fontSize: typeScale.display,
    lineHeight: 44,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  h1: {
    fontFamily: fonts.display,
    fontSize: typeScale.xl,
    lineHeight: 34,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  h2: {
    fontFamily: fonts.display,
    fontSize: typeScale.lg,
    lineHeight: 28,
    color: colors.ink,
  },
  h3: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.md,
    lineHeight: 24,
    color: colors.ink,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: typeScale.body,
    lineHeight: 24,
    color: colors.ink,
  },
  bodyMuted: {
    fontFamily: fonts.body,
    fontSize: typeScale.body,
    lineHeight: 24,
    color: colors.inkMuted,
  },
  caption: {
    fontFamily: fonts.body,
    fontSize: typeScale.sm,
    lineHeight: 20,
    color: colors.inkMuted,
  },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.sm,
    lineHeight: 18,
    color: colors.inkMuted,
    letterSpacing: 0.2,
    textTransform: 'uppercase' as const,
  },
} as const;

export const touchMin = 48;
