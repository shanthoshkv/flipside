import { create } from 'zustand';
import { getSettings, setSetting } from './db';
import type { Sound } from './engine/ambient';
import type { Thresh } from './engine/detect';
import type { FontPref } from './fonts';
import type { AccentPref } from './palette';
import { set24h, setWeekStart } from './util';

export type Sensitivity = 'low' | 'medium' | 'high';
export type ThemePref = 'auto' | 'dark' | 'black' | 'light';
export interface Settings {
  goalMin: number; weeklyGoalMin: number; sensitivity: Sensitivity; calib: Thresh | null;
  focusMin: number; breakMin: number; cycles: number;
  touchToStart: boolean; pauseMode: boolean; pauseGraceMin: number; restDay: boolean;
  theme: ThemePref; lang: string; lastTaskId: number | null; onboarded: boolean;
  planStart: number; planEnd: number; planBlock: number;
  ambient: Sound; ambientVolume: number; ambient2: Sound; ambient2Volume: number; bgService: boolean; strictFocus: boolean;
  scheduler: 'fsrs' | 'sm2'; retention: number; newPerDay: number; reviewsPerDay: number;
  remindPlan: boolean; remindStreak: boolean; remindWeekly: boolean; quietStart: number; quietEnd: number;
  backupDir: string | null; lastBackup: number;
  fontPref: FontPref; accent: AccentPref; textScale: number; pomoBeep: boolean;
  vibrate: boolean; haptics: boolean; keepAwake: boolean; weekStart: 'mon' | 'sun'; clock24: boolean; lastError: string; secureScreen: boolean;
  longBreakMin: number; longEvery: number; myPresets: { focus: number; brk: number }[]; flipReveal: boolean; widgetPrivate: boolean;
  loaded: boolean;
}
const defaults: Settings = {
  goalMin: 240, weeklyGoalMin: 0, sensitivity: 'medium', calib: null,
  focusMin: 25, breakMin: 5, cycles: 4,
  touchToStart: false, pauseMode: false, pauseGraceMin: 5, restDay: true,
  theme: 'auto', lang: 'auto', lastTaskId: null, onboarded: false,
  planStart: 17, planEnd: 22, planBlock: 50,
  ambient: 'off', ambientVolume: 50, ambient2: 'off', ambient2Volume: 30, bgService: true, strictFocus: false,
  scheduler: 'fsrs', retention: 90, newPerDay: 20, reviewsPerDay: 200,
  remindPlan: false, remindStreak: false, remindWeekly: false, quietStart: 22, quietEnd: 7,
  backupDir: null, lastBackup: 0,
  fontPref: 'default', accent: 'amber', textScale: 1, pomoBeep: true,
  vibrate: true, haptics: true, keepAwake: true, weekStart: 'mon', clock24: true, lastError: '', secureScreen: false,
  longBreakMin: 15, longEvery: 0, myPresets: [], flipReveal: false, widgetPrivate: false,
  loaded: false,
};
/** Settings the pure helpers in util.ts need to know about. */
function applyUtil(s: Partial<Settings>) {
  if (s.weekStart) setWeekStart(s.weekStart === 'sun' ? 0 : 1);
  if (s.clock24 !== undefined) set24h(s.clock24);
}
interface Store extends Settings { load(): Promise<void>; set<K extends keyof Settings>(k: K, v: Settings[K]): void }

export const useSettings = create<Store>((set) => ({
  ...defaults,
  async load() {
    const raw = await getSettings();
    const next: Record<string, unknown> = {};
    for (const k of Object.keys(defaults) as (keyof Settings)[]) {
      if (k in raw) next[k] = JSON.parse(raw[k]);
    }
    set({ ...next, loaded: true });
    applyUtil(next as Partial<Settings>);
  },
  set(k, v) {
    set({ [k]: v } as Partial<Store>);
    applyUtil({ [k]: v } as Partial<Settings>);
    if (k !== 'loaded') setSetting(k, JSON.stringify(v));
  },
}));

/** weekly goal falls back to 7x the daily goal */
export const weeklyGoal = (s: Settings) => (s.weeklyGoalMin > 0 ? s.weeklyGoalMin : s.goalMin * 7);
