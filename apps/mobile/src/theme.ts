export const colors = {
  surface: '#10131b',
  surfaceDim: '#10131b',
  surfaceContainerLow: '#181c23',
  surfaceContainer: '#1c2028',
  surfaceContainerHigh: '#272a32',
  surfaceContainerHighest: '#31353d',
  onSurface: '#e0e2ed',
  onSurfaceVariant: '#c1c6d7',
  primary: '#adc6ff',
  primaryContainer: '#4b8eff',
  primaryAction: '#007AFF',
  outline: '#8b90a0',
  outlineVariant: '#414755',
  background: '#10131b',
  onBackground: '#e0e2ed',
} as const;

export const fonts = {
  light: 'PlusJakartaSans_300Light',
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semiBold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
} as const;

export const typography = {
  displayHero: { fontFamily: fonts.light, fontSize: 48, letterSpacing: -1.9, lineHeight: 56 },
  headlineLg: { fontFamily: fonts.semiBold, fontSize: 34, letterSpacing: -0.68, lineHeight: 41 },
  headlineMd: { fontFamily: fonts.semiBold, fontSize: 22, letterSpacing: -0.44, lineHeight: 28 },
  bodyLg: { fontFamily: fonts.regular, fontSize: 17, letterSpacing: -0.17, lineHeight: 22 },
  bodySm: { fontFamily: fonts.regular, fontSize: 15, letterSpacing: -0.15, lineHeight: 20 },
  labelCaps: { fontFamily: fonts.semiBold, fontSize: 12, letterSpacing: 0.6, lineHeight: 16 },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  cardPadding: 16,
  screenMargin: 20,
} as const;

export const radii = {
  sm: 4,
  DEFAULT: 8,
  md: 12,
  lg: 20,
  xl: 24,
  full: 9999,
} as const;
