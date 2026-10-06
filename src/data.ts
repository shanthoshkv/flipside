import { create } from 'zustand';
import { listCards, listExams, listTasks, sessionsBetween, type Card, type Exam, type Session, type Task } from './db';

interface Data { tasks: Task[]; sessions: Session[]; exams: Exam[]; cards: Card[]; reload(): Promise<void> }

export const useData = create<Data>((set) => ({
  tasks: [], sessions: [], exams: [], cards: [],
  async reload() {
    const now = Date.now();
    const [tasks, sessions, exams, cards] = await Promise.all([listTasks(), sessionsBetween(0, now + 86400000), listExams(), listCards()]);
    set({ tasks, sessions, exams, cards });
  },
}));
