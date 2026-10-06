import { dailyTotals, totalMs, type Seg } from './stats.ts';
import { addDays, DAY, startOfDay } from './util.ts';

export interface RSession extends Seg { quality?: number | null; breaks?: number }
export interface WeeklyInput {
  sessions: RSession[]; now: number; weeklyGoalMs: number; rootOf: (id: number) => number;
  subjects: { id: number; name: string }[]; exams: { subjectId: number; days: number; name: string }[]; cardsReviewed: number;
}

const end = (s: Seg) => s.end_ts ?? s.heartbeat_ts ?? s.start_ts;
const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);

/** Rolling 7 days ending today vs the 7 before it. Pure, so the logic is checkable. */
export function weeklyReview(o: WeeklyInput) {
  const to = addDays(startOfDay(o.now), 1), from = addDays(to, -7), prevFrom = addDays(to, -14);
  const inWin = (s: RSession, a: number, b: number) => s.start_ts < b && end(s) > a;
  const cur = totalMs(o.sessions, from, to), prev = totalMs(o.sessions, prevFrom, from);
  const days = dailyTotals(o.sessions, o.now, 7);
  const best = days.reduce((b, d) => (d.ms > b.ms ? d : b), days[0]);
  const week = o.sessions.filter((s) => inWin(s, from, to));
  const bySub = new Map<number, number>();
  for (const s of week) bySub.set(o.rootOf(s.task_id), (bySub.get(o.rootOf(s.task_id)) ?? 0) + totalMs([s], from, to));
  const top = [...bySub].sort((a, b) => b[1] - a[1])[0] ?? null;
  const q = avg(week.map((s) => s.quality).filter((x): x is number => x != null));
  const qPrev = avg(o.sessions.filter((s) => inWin(s, prevFrom, from)).map((s) => s.quality).filter((x): x is number => x != null));

  // a subject with an exam inside 30 days that has had no focus for 3+ days
  const neglected = o.exams
    .filter((e) => e.days >= 0 && e.days <= 30)
    .map((e) => {
      const last = Math.max(0, ...o.sessions.filter((s) => o.rootOf(s.task_id) === e.subjectId).map(end));
      return { ...e, since: last ? Math.floor((to - last) / DAY) : Infinity };
    })
    .filter((e) => e.since >= 3)
    .sort((a, b) => a.days - b.days)[0];
  const subName = (id: number) => o.subjects.find((s) => s.id === id)?.name ?? 'A subject';

  const goalPct = o.weeklyGoalMs ? cur / o.weeklyGoalMs : 1;
  const delta = prev > 0 ? (cur - prev) / prev : null;
  let suggestion: string;
  if (neglected) suggestion = `${subName(neglected.subjectId)} has had no focus for ${neglected.since === Infinity ? 'a while' : `${neglected.since} days`} and ${neglected.name} is in ${neglected.days} day${neglected.days === 1 ? '' : 's'}. Plan a block for it soon.`;
  else if (goalPct < 0.7) suggestion = `You reached ${Math.round(goalPct * 100)}% of your weekly goal. About ${Math.max(5, Math.ceil((o.weeklyGoalMs - cur) / 7 / 300000) * 5)} more minutes a day closes the gap.`;
  else if (delta != null && delta >= 0.1) suggestion = `Up ${Math.round(delta * 100)}% on last week. Keep that rhythm.`;
  else suggestion = 'A steady week. Keep it going.';

  return {
    cur, prev, delta, goalPct, activeDays: days.filter((d) => d.ms > 0).length, best: best.ms > 0 ? best : null,
    top: top ? { id: top[0], ms: top[1] } : null, quality: q, qualityPrev: qPrev,
    pickups: week.reduce((n, s) => n + (s.breaks ?? 0), 0), sessions: week.length, cardsReviewed: o.cardsReviewed, suggestion,
  };
}
