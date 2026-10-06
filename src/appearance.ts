import * as Font from 'expo-font';
import { fontFiles, type FontPref } from './fonts';
import { useSettings } from './store';
import { applyFont } from './theme';

/** Load the family first, then switch, so text never flashes in a missing font. */
export async function loadFont(p: FontPref) {
  try { await Font.loadAsync(fontFiles(p)); } catch { /* falls back to the default family */ }
  applyFont(p);
}
export async function setFontPref(p: FontPref) {
  await loadFont(p);
  useSettings.getState().set('fontPref', p);
}
