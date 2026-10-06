import { useColorScheme } from 'react-native';
import { FONT_SETS, type FontPref, type FontSet } from './fonts';
import { ACCENTS, dark, light } from './palette';
import { useSettings } from './store';

export { dark, light };
export type Theme = typeof dark & { isDark: boolean };

export const categoryColors = ['#E8A55A', '#E57373', '#D98AB5', '#9B8CE0', '#6FA8DC', '#5CC1B0', '#86C06C', '#C9B458'];
export const space = (n: number) => n * 4;
export const radius = { sm: 12, md: 16, lg: 24, pill: 999 };

/** Mutated in place when the font preference changes; components re-render because useTheme() subscribes to it. */
export const font: FontSet = { ...FONT_SETS.default };
export const applyFont = (p: FontPref) => Object.assign(font, FONT_SETS[p] ?? FONT_SETS.default);

export function useTheme(): Theme {
  const sys = useColorScheme();
  const pref = useSettings((s) => s.theme);
  const accent = useSettings((s) => s.accent);
  useSettings((s) => s.fontPref); // re-render when the font changes
  useSettings((s) => s.lang); // re-render when the language changes
  const isDark = pref === 'auto' ? sys !== 'light' : pref === 'dark';
  const base = isDark ? dark : light, a = ACCENTS[accent] ?? ACCENTS.amber;
  return { ...base, accentA: a.a, accentB: a.b, accentText: isDark ? a.textDark : a.textLight, isDark };
}
