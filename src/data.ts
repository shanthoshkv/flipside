import { create } from 'zustand';
import { listTasks, sessionsBetween, totalFocusMs, type Session, type Task } from './db';
import { addDays, startOfDay } from './util';

interface Data { tasks: Task[]; sessions: Session[]; allMs: number; reload(): Promise<void> }

export const useData = create<Data>((set) => ({
  tasks: [], sessions: [], allMs: 0,
  async reload() {
    const now = Date.now();
    const [tasks, sessions, allMs] = await Promise.all([
      listTasks(), sessionsBetween(addDays(startOfDay(now), -105), now + 86400000), totalFocusMs(),
    ]);
    set({ tasks, sessions, allMs });
  },
}));
