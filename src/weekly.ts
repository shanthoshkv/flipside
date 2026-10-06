import { dailyTotals, totalMs, type Seg } from './stats.ts';
import { addDays, DAY, startOfDay } from './util.ts';

export interface RSession extends Seg { quality?: number | null; breaks?: number }
export interface WeeklyInput {
  sessions: RSession[]; now: number; weeklyGoalMs: number; rootOf: (id: number) => number;
  range?: { from: number; to: number }; // calendar week to review; default is the 7 days ending today
  subjects: { id: number; name: string }[]; exams: { subjectId: number; days: number; name: string }[]; cardsReviewed: number;
}

const end = (s: Seg) => s.end_ts ?? s.heartbeat_ts ?? s.start_ts;
const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);

/** Rolling 7 days ending today vs the 7 before it. Pure, so the logic is checkable. */
export function weeklyReview(o: WeeklyInput) {
  const to = o.range?.to ?? addDays(startOfDay(o.now), 1), from = o.range?.from ?? addDays(to, -7), prevFrom = addDays(from, -7);
  const inWin = (s: RSession, a: number, b: number) => s.start_ts < b && end(s) > a;
  const cur = totalMs(o.sessions, from, to), prev = totalMs(o.sessions, prevFrom, from);
  const days = dailyTotals(o.sessions, to - 1, 7);
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
  // English text for tests; key + vars let the UI translate it
  let key: string, vars: Record<string, string | number>;
  if (neglected) {
    const lonely = neglected.since === Infinity;
    key = lonely ? '{subject} has had no focus for a while and {exam} is in {days} days. Plan a block for it soon.' : '{subject} has had no focus for {since} days and {exam} is in {days} days. Plan a block for it soon.';
    vars = { subject: subName(neglected.subjectId), since: neglected.since, exam: neglected.name, days: neglected.days };
  } else if (goalPct < 0.7) {
    key = 'You reached {pct}% of your weekly goal. About {min} more minutes a day closes the gap.';
    vars = { pct: Math.round(goalPct * 100), min: Math.max(5, Math.ceil((o.weeklyGoalMs - cur) / 7 / 300000) * 5) };
  } else if (delta != null && delta >= 0.1) {
    key = 'Up {pct}% on last week. Keep that rhythm.'; vars = { pct: Math.round(delta * 100) };
  } else { key = 'A steady week. Keep it going.'; vars = {}; }
  const suggestion = key.replace(/\{(\w+)\}/g, (_, k) => String(vars[k]));

  return {
    cur, prev, delta, goalPct, activeDays: days.filter((d) => d.ms > 0).length, best: best.ms > 0 ? best : null,
    top: top ? { id: top[0], ms: top[1] } : null, quality: q, qualityPrev: qPrev,
    pickups: week.reduce((n, s) => n + (s.breaks ?? 0), 0), sessions: week.length, cardsReviewed: o.cardsReviewed, suggestion, suggestionKey: key, suggestionVars: vars,
  };
}
