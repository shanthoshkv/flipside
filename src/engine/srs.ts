import { addDays, startOfDay } from '../util.ts';

export interface Sched { due: number; ease: number; interval: number; reps: number; lapses: number }
export type Grade = 0 | 1 | 2 | 3; // again, hard, good, easy
export const GRADES = ['Again', 'Hard', 'Good', 'Easy'] as const;

/** SM-2 variant. interval in days; 0 = relearning (due in 10 min). Graduated cards are day-aligned. */
export function schedule(c: Sched, g: Grade, now: number): Sched {
  let { ease, interval } = c;
  const { reps, lapses } = c;
  if (g === 0) return { due: now + 600000, ease: Math.max(1.3, ease - 0.2), interval: 0, reps: 0, lapses: lapses + 1 };
  if (g === 1) { ease = Math.max(1.3, ease - 0.15); interval = reps === 0 ? 1 : interval * 1.2; }
  else if (g === 2) interval = reps === 0 ? 1 : reps === 1 ? 3 : interval * ease;
  else { ease += 0.15; interval = reps === 0 ? 4 : Math.max(reps === 1 ? 6 : interval * ease * 1.3, interval + 1); }
  interval = Math.max(1, Math.round(interval));
  return { due: addDays(startOfDay(now), interval), ease, interval, reps: reps + 1, lapses };
}

export const isDue = (c: { due: number }, now: number) => c.due <= now;

export function fmtInterval(days: number) {
  return days === 0 ? '10m' : days < 30 ? `${days}d` : days < 365 ? `${Math.round(days / 30)}mo` : `${(days / 365).toFixed(1)}y`;
}
export const previews = (c: Sched, now: number) => ([0, 1, 2, 3] as Grade[]).map((g) => fmtInterval(schedule(c, g, now).interval));
