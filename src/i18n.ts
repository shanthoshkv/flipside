import { locales } from './locales';

export const LANGS = [
  { code: 'auto', label: 'Auto' }, { code: 'en', label: 'English' }, { code: 'hi', label: 'हिन्दी' }, { code: 'es', label: 'Español' },
  { code: 'pt', label: 'Português' }, { code: 'id', label: 'Bahasa Indonesia' }, { code: 'fr', label: 'Français' }, { code: 'de', label: 'Deutsch' },
] as const;

let current = 'en';
const detect = () => { try { return Intl.DateTimeFormat().resolvedOptions().locale.slice(0, 2).toLowerCase(); } catch { return 'en'; } };

/** pref is 'auto' or a language code. Unknown languages fall back to English. */
export function setLang(pref: string) {
  const c = pref === 'auto' ? detect() : pref;
  current = c in locales ? c : 'en';
}

/** English text is the key. Missing translations show the English text. {name} placeholders are filled from vars. */
export function tr(key: string, vars?: Record<string, string | number>) {
  const s = (locales as Record<string, Record<string, string>>)[current]?.[key] ?? key;
  return vars ? s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? '')) : s;
}

/** 'today', 'yesterday', '3d ago' */
export function agoLabel(ts: number, now = Date.now()) {
  const d = Math.floor((new Date(new Date(now).setHours(0, 0, 0, 0)).getTime() - new Date(new Date(ts).setHours(0, 0, 0, 0)).getTime()) / 86400000);
  return d <= 0 ? tr('today') : d === 1 ? tr('yesterday') : tr('{n}d ago', { n: d });
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const monthName = (m: number) => { try { return new Date(2021, m, 1).toLocaleDateString(current, { month: 'long' }); } catch { return MONTHS[m]; } };
/** dow 0 = Sunday */
export const weekdayLetter = (dow: number) => { try { return new Date(2021, 7, 1 + dow).toLocaleDateString(current, { weekday: 'narrow' }); } catch { return 'SMTWTFS'[dow]; } };
export const weekdayShort = (dow: number) => { try { return new Date(2021, 7, 1 + dow).toLocaleDateString(current, { weekday: 'short' }); } catch { return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dow]; } };
