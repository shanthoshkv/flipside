import { create } from 'zustand';
import { getSettings, setSetting } from './db';
import type { Sound } from './engine/ambient';
import type { Thresh } from './engine/detect';

export type Sensitivity = 'low' | 'medium' | 'high';
export type ThemePref = 'auto' | 'dark' | 'light';
export interface Settings {
  goalMin: number; weeklyGoalMin: number; sensitivity: Sensitivity; calib: Thresh | null;
  focusMin: number; breakMin: number; cycles: number;
  touchToStart: boolean; pauseMode: boolean; pauseGraceMin: number; restDay: boolean;
  theme: ThemePref; lang: string; lastTaskId: number | null; onboarded: boolean;
  planStart: number; planEnd: number; planBlock: number;
  ambient: Sound; ambientVolume: number; bgService: boolean; strictFocus: boolean;
  scheduler: 'fsrs' | 'sm2'; retention: number; newPerDay: number; reviewsPerDay: number;
  remindPlan: boolean; remindStreak: boolean; remindWeekly: boolean; quietStart: number; quietEnd: number;
  backupDir: string | null; lastBackup: number;
  loaded: boolean;
}
const defaults: Settings = {
  goalMin: 240, weeklyGoalMin: 0, sensitivity: 'medium', calib: null,
  focusMin: 25, breakMin: 5, cycles: 4,
  touchToStart: false, pauseMode: false, pauseGraceMin: 5, restDay: true,
  theme: 'auto', lang: 'auto', lastTaskId: null, onboarded: false,
  planStart: 17, planEnd: 22, planBlock: 50,
  ambient: 'off', ambientVolume: 50, bgService: true, strictFocus: false,
  scheduler: 'fsrs', retention: 90, newPerDay: 20, reviewsPerDay: 200,
  remindPlan: false, remindStreak: false, remindWeekly: false, quietStart: 22, quietEnd: 7,
  backupDir: null, lastBackup: 0,
  loaded: false,
};
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
  },
  set(k, v) {
    set({ [k]: v } as Partial<Store>);
    if (k !== 'loaded') setSetting(k, JSON.stringify(v));
  },
}));

/** weekly goal falls back to 7x the daily goal */
export const weeklyGoal = (s: Settings) => (s.weeklyGoalMin > 0 ? s.weeklyGoalMin : s.goalMin * 7);
