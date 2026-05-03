/**
 * Design tokens — consistent with the web app's PharmaCare theme
 */
export const colors = {
  // Primary brand
  primary: '#4f8cff',
  primaryDark: '#2563eb',
  primaryLight: '#93bbff',

  // Dark backgrounds (matching web CSS)
  background: '#0a1628',
  surface: '#111d33',
  surfaceLight: '#18283f',
  surfaceHover: '#1e3250',
  card: '#162036',

  // Text
  textPrimary: '#f0f4fa',
  textSecondary: '#8fa3bf',
  textMuted: '#5a6f8a',

  // Accents
  success: '#22c55e',
  successLight: '#16a34a',
  warning: '#f59e0b',
  warningLight: '#d97706',
  error: '#ef4444',
  errorLight: '#dc2626',
  info: '#3b82f6',

  // Borders
  border: '#233550',
  borderLight: '#2a4060',

  // White / transparent
  white: '#ffffff',
  black: '#000000',
  overlay: 'rgba(0, 0, 0, 0.6)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
};

export const fontSizes = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  hero: 40,
};

export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 999,
};

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
};
