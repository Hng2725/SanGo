export const palette = {
  light: { primary: '#1E7A4F', primaryStrong: '#155C3B', ink: '#1B2420', stone: '#5F6B66', line: '#DCE3DF', base: '#F4F7F5', surface: '#FFFFFF', night: '#0E3B28' },
  dark: { primary: '#3AA36F', primaryStrong: '#1E7A4F', ink: '#E4EBE7', stone: '#9AA6A0', line: '#26312C', base: '#0F1513', surface: '#161E1A', night: '#0B2A1D' },
  lime: '#C6F06A', warning: '#B7791F', error: '#C2410C', info: '#3B6EA8', muted: '#8A9690',
} as const;
export type ThemeMode = 'light' | 'dark';
