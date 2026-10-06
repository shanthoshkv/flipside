export const dark = {
  bg: '#0B0B10', surface: '#14141C', surface2: '#1C1C27', text: '#F4F4F8', muted: '#8B8BA0',
  border: 'rgba(255,255,255,0.06)', accentA: '#FFB547', accentB: '#FF6B6B', accentText: '#FFB547', danger: '#FF6B6B', success: '#4ADE80', dotOff: '#262633',
};
export const light: typeof dark = {
  bg: '#FAF8F5', surface: '#FFFFFF', surface2: '#F0EDE8', text: '#14141C', muted: '#5F5F72',
  border: 'rgba(0,0,0,0.07)', accentA: '#F59E0B', accentB: '#EF5350', accentText: '#9A4A06', danger: '#C62828', success: '#16A34A', dotOff: '#D9D4CC',
};

const lum = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
/** WCAG contrast ratio between two #rrggbb colours */
export const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
