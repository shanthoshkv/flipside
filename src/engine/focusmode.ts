import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

// Local Android module (modules/focus-mode). Absent elsewhere, so every call is a safe no-op.
interface Native { isGranted(): boolean; openSettings(): void; setEnabled(on: boolean): boolean }
const M = Platform.OS === 'android' ? requireOptionalNativeModule<Native>('FocusMode') : null;

export const dndAvailable = !!M;
export const dndGranted = () => { try { return M?.isGranted() ?? false; } catch { return false; } };
export const openDndSettings = () => { try { M?.openSettings(); } catch { /* settings screen unavailable */ } };
/** on = alarms-only during focus; off restores whatever filter the user had before. */
export const setDnd = (on: boolean) => { try { M?.setEnabled(on); } catch { /* not permitted */ } };
