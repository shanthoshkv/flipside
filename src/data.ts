import { create } from 'zustand';
import { listTasks, sessionsBetween, type Session, type Task } from './db';

interface Data { tasks: Task[]; sessions: Session[]; reload(): Promise<void> }

export const useData = create<Data>((set) => ({
  tasks: [], sessions: [],
  async reload() {
    const now = Date.now();
    const [tasks, sessions] = await Promise.all([listTasks(), sessionsBetween(0, now + 86400000)]);
    set({ tasks, sessions });
  },
}));
