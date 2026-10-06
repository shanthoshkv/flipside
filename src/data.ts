import { create } from 'zustand';
import { listExams, listTasks, sessionsBetween, type Exam, type Session, type Task } from './db';

interface Data { tasks: Task[]; sessions: Session[]; exams: Exam[]; reload(): Promise<void> }

export const useData = create<Data>((set) => ({
  tasks: [], sessions: [], exams: [],
  async reload() {
    const now = Date.now();
    const [tasks, sessions, exams] = await Promise.all([listTasks(), sessionsBetween(0, now + 86400000), listExams()]);
    set({ tasks, sessions, exams });
  },
}));
