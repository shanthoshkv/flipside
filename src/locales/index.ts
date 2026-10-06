import { rows } from './strings';
import { rows2 } from './strings2';

const LANG_ORDER = ['hi', 'es', 'pt', 'id', 'fr', 'de'] as const;
export type LocaleCode = (typeof LANG_ORDER)[number];

/** { hi: { 'Timer': 'टाइमर', ... }, es: {...}, ... } built from the one table, English text is the key */
export const locales: Record<LocaleCode, Record<string, string>> = { hi: {}, es: {}, pt: {}, id: {}, fr: {}, de: {} };
for (const r of [...rows, ...rows2]) {
  LANG_ORDER.forEach((code, i) => { if (r[i + 1]) locales[code][r[0]] = r[i + 1]; });
}
export const localeRows = [...rows, ...rows2];
