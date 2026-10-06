import { addDays, DAY, dayKey, startOfDay } from './util.ts';

export interface Seg { task_id: number; start_ts: number; end_ts: number | null; heartbeat_ts: number | null }
const endOf = (s: Seg) => s.end_ts ?? s.heartbeat_ts ?? s.start_ts;
const overlap = (s: Seg, a: number, b: number) => Math.max(0, Math.min(endOf(s), b) - Math.max(s.start_ts, a));

export const totalMs = (ss: Seg[], from: number, to: number) => ss.reduce((n, s) => n + overlap(s, from, to), 0);
export const coinsFor = (ss: Seg[]) => Math.floor(totalMs(ss, 0, Infinity) / 600000);

/** n days ending at (and including) the day of `now`, oldest first */
export function dailyTotals(ss: Seg[], now: number, n: number) {
  const first = addDays(startOfDay(now), -(n - 1));
  return Array.from({ length: n }, (_, i) => {
    const d = addDays(first, i);
    return { key: dayKey(d), ts: d, ms: totalMs(ss, d, addDays(d, 1)) };
  });
}

export function hourDist(ss: Seg[]) {
  const h = Array(24).fill(0) as number[];
  for (const s of ss) {
    for (let t = Math.floor(s.start_ts / 3600000) * 3600000; t < endOf(s); t += 3600000) {
      h[new Date(t).getHours()] += overlap(s, t, t + 3600000);
    }
  }
  return h;
}

export function perTask(ss: Seg[], from: number, to: number) {
  const m = new Map<number, number>();
  for (const s of ss) m.set(s.task_id, (m.get(s.task_id) ?? 0) + overlap(s, from, to));
  return [...m].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
}

/** days = oldest-first daily totals ending today. Today with no focus yet doesn't break the current streak. */
export function streaks(days: { ms: number }[]) {
  let best = 0, run = 0;
  for (const d of days) { run = d.ms > 0 ? run + 1 : 0; best = Math.max(best, run); }
  let cur = 0, i = days.length - 1;
  if (i >= 0 && days[i].ms === 0) i--;
  for (; i >= 0 && days[i].ms > 0; i--) cur++;
  return { current: cur, best };
}

export const bestDay = (days: { key: string; ms: number }[]) =>
  days.reduce<{ key: string; ms: number } | null>((b, d) => (d.ms > (b?.ms ?? 0) ? d : b), null);

/** slot (0..143, 10 min each) → task_id of the task with most time in that slot (≥150 s) */
export function actualSlots(ss: Seg[], dayStart: number) {
  const acc = new Map<number, Map<number, number>>();
  for (const s of ss) {
    for (let k = 0; k < 144; k++) {
      const a = dayStart + k * 600000, o = overlap(s, a, a + 600000);
      if (o <= 0) continue;
      const m = acc.get(k) ?? acc.set(k, new Map()).get(k)!;
      m.set(s.task_id, (m.get(s.task_id) ?? 0) + o);
    }
  }
  const out = new Map<number, number>();
  for (const [k, m] of acc) {
    const [id, ms] = [...m].sort((a, b) => b[1] - a[1])[0];
    if (ms >= 150000) out.set(k, id);
  }
  return out;
}

export const WEEKDAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export { DAY };
