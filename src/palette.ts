export const dark = {
  bg: '#0D0D0F', surface: '#1C1C1E', surface2: '#2C2C2E', text: '#F5F5F7', muted: '#98989F',
  border: 'rgba(84,84,88,0.45)', accentA: '#FFB547', accentB: '#FF6B6B', accentText: '#FFB547', danger: '#FF6B6B', success: '#4ADE80', dotOff: '#3A3A3C',
};
export const light: typeof dark = {
  bg: '#F2F2F7', surface: '#FFFFFF', surface2: '#EBEBF0', text: '#1C1C1E', muted: '#636366',
  border: 'rgba(60,60,67,0.18)', accentA: '#F59E0B', accentB: '#EF5350', accentText: '#9A4A06', danger: '#C62828', success: '#16A34A', dotOff: '#D1D1D6',
};

/** AMOLED: true black background, same text colours as dark */
export const black: typeof dark = { ...dark, bg: '#000000', surface: '#141416', surface2: '#232326', dotOff: '#2C2C2E' };

const lum = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
/** WCAG contrast ratio between two #rrggbb colours */
export const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/** Accent presets. `text` is the accent used for words, so it is darker in the light theme to stay readable. */
export const ACCENTS = {
  amber: { label: 'Amber', a: '#FFB547', b: '#FF6B6B', textDark: '#FFB547', textLight: '#9A4A06' },
  ocean: { label: 'Ocean', a: '#60A5FA', b: '#818CF8', textDark: '#60A5FA', textLight: '#1D4ED8' },
  mint: { label: 'Mint', a: '#34D399', b: '#2DD4BF', textDark: '#34D399', textLight: '#047857' },
  rose: { label: 'Rose', a: '#FB7185', b: '#F472B6', textDark: '#FB7185', textLight: '#BE123C' },
  violet: { label: 'Violet', a: '#A78BFA', b: '#E879F9', textDark: '#A78BFA', textLight: '#6D28D9' },
} as const;
export type AccentPref = keyof typeof ACCENTS;
