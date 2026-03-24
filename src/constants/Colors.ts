// PetPal app color palette

export const PetPalColors = {
  // Primary — calm teal/blue
  primary: '#0a7ea4',
  primaryLight: 'rgba(10,126,164,0.15)',

  // Accent — warm green (for feeding / nature)
  accent: '#2e7d32',
  accentLight: 'rgba(46,125,50,0.15)',

  // Mood colors
  thriving: '#f59e0b',   // gold / amber
  happy: '#22c55e',      // green
  okay: '#94a3b8',       // slate
  tired: '#64748b',      // dark slate
  sick: '#ef4444',       // red

  // Streak
  streak: '#f97316',     // orange

  // Stats
  focusBar: '#0a7ea4',
  screenTimeBar: '#f87171', // coral

  // UI neutrals
  background: '#ffffff',
  backgroundDark: '#151718',
  surface: 'rgba(0,0,0,0.05)',
  surfaceDark: 'rgba(255,255,255,0.07)',
  border: 'rgba(0,0,0,0.1)',
  borderDark: 'rgba(255,255,255,0.12)',

  // Text
  text: '#11181C',
  textDark: '#ECEDEE',
  textMuted: 'rgba(17,24,28,0.55)',
  textMutedDark: 'rgba(236,237,238,0.55)',

  // Base
  white: '#ffffff',

  // Tab bar
  tabActive: '#0a7ea4',
  tabInactive: '#687076',
  tabActiveDark: '#ffffff',
  tabInactiveDark: '#9BA1A6',
} as const;
