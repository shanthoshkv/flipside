import { create } from 'zustand';

interface Undo { msg: string | null; undo: (() => Promise<unknown>) | null; commit: (() => void) | null; show(msg: string, undo: () => Promise<unknown>, commit?: () => void): void; run(): Promise<void>; clear(): void }
let timer: ReturnType<typeof setTimeout> | null = null;

/** One pending undo at a time. `commit` runs when the bar times out or is replaced (e.g. delete card images for real). */
export const useUndo = create<Undo>((set, get) => ({
  msg: null, undo: null, commit: null,
  show(msg, undo, commit) {
    get().clear();
    set({ msg, undo, commit: commit ?? null });
    timer = setTimeout(() => get().clear(), 6000);
  },
  async run() {
    const u = get().undo;
    if (timer) clearTimeout(timer);
    set({ msg: null, undo: null, commit: null });
    await u?.();
  },
  clear() {
    if (timer) clearTimeout(timer);
    get().commit?.();
    set({ msg: null, undo: null, commit: null });
  },
}));
