/**
 * SpecWeave Remotion Design System
 * Unified theme for all video compositions (hero, youtube B-Roll, promos)
 * Colors aligned with --sw-* design tokens from tokens.css
 */

export const COLORS = {
  // Core brand
  surfaceDark: '#0b0816',
  primary500: '#6b58b8',
  primary400: '#8f7dce',
  primary300: '#b0a3de',
  primary200: '#d1c9ed',

  // Semantic
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',

  // Accents
  accentCyan: '#06b6d4',
  accentBlue: '#3b82f6',
  accentPurple: '#a855f7',
  gold: '#f59e0b',

  // Neutrals
  white: '#ffffff',
  textPrimary: '#ffffff',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',

  // Terminal
  bg: '#000000',
  bgDark: '#0a0a0a',
  bgTerminal: '#1a1a1a',
  bgElevated: '#252525',
  terminalBorder: '#333333',
  terminalPrompt: '#22c55e',
  terminalCursor: '#22c55e',
  dotRed: '#ff5f57',
  dotYellow: '#febc2e',
  dotGreen: '#28c840',
} as const;

export const CONFIG = {
  width: 1920,
  height: 1080,
  fps: 30,
  durationInFrames: 1350,
} as const;

/** Standard transition durations in frames */
export const TIMING = {
  fadeIn: 15,
  fadeOut: 15,
  transitionOverlap: 15,
  springEntrance: 20,
  staggerDelay: 12,
} as const;

/** Standard radial gradient backgrounds */
export const BACKGROUNDS = {
  dark: COLORS.bgDark,
  purpleGlow: `radial-gradient(ellipse at 50% 40%, ${COLORS.primary500}15, ${COLORS.bgDark} 70%)`,
  subtleGlow: `radial-gradient(ellipse at 50% 60%, ${COLORS.primary500}10, ${COLORS.bgDark} 70%)`,
} as const;
