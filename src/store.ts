import { create } from 'zustand';
import { getSettings, setSetting } from './db';

export type Sensitivity = 'low' | 'medium' | 'high';
export type ThemePref = 'auto' | 'dark' | 'light';
export interface Settings {
  goalMin: number; sensitivity: Sensitivity; focusMin: number; breakMin: number; cycles: number;
  touchToStart: boolean; theme: ThemePref; lastTaskId: number | null; loaded: boolean;
}
const defaults: Settings = {
  goalMin: 240, sensitivity: 'medium', focusMin: 25, breakMin: 5, cycles: 4,
  touchToStart: false, theme: 'auto', lastTaskId: null, loaded: false,
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
