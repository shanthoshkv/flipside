import { useColorScheme } from 'react-native';
import { useSettings } from './store';

import { dark, light } from './palette';
export { dark, light };
export type Theme = typeof dark & { isDark: boolean };

export const categoryColors = ['#E8A55A', '#E57373', '#D98AB5', '#9B8CE0', '#6FA8DC', '#5CC1B0', '#86C06C', '#C9B458'];
export const space = (n: number) => n * 4;
export const radius = { sm: 12, md: 16, lg: 24, pill: 999 };
export const font = {
  head: 'SpaceGrotesk_600SemiBold', headBold: 'SpaceGrotesk_700Bold',
  body: 'Inter_400Regular', bodyMed: 'Inter_500Medium', bodyBold: 'Inter_600SemiBold',
};

export function useTheme(): Theme {
  const sys = useColorScheme();
  const pref = useSettings((s) => s.theme);
  const isDark = pref === 'auto' ? sys !== 'light' : pref === 'dark';
  return { ...(isDark ? dark : light), isDark };
}
