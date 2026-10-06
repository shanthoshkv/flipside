import { useColorScheme } from 'react-native';
import { useSettings } from './store';

export const dark = {
  bg: '#0B0B10', surface: '#14141C', surface2: '#1C1C27', text: '#F4F4F8', muted: '#8B8BA0',
  border: 'rgba(255,255,255,0.06)', accentA: '#FFB547', accentB: '#FF6B6B', success: '#4ADE80', dotOff: '#262633',
};
export const light: typeof dark = {
  bg: '#FAF8F5', surface: '#FFFFFF', surface2: '#F0EDE8', text: '#14141C', muted: '#6B6B7E',
  border: 'rgba(0,0,0,0.07)', accentA: '#F59E0B', accentB: '#EF5350', success: '#16A34A', dotOff: '#E4E0DA',
};
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
