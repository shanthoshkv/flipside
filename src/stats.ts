import { addDays, DAY, dayKey, startOfDay, startOfWeek } from './util.ts';

export interface Seg { task_id: number; start_ts: number; end_ts: number | null; heartbeat_ts: number | null }
const endOf = (s: Seg) => s.end_ts ?? s.heartbeat_ts ?? s.start_ts;
const overlap = (s: Seg, a: number, b: number) => Math.max(0, Math.min(endOf(s), b) - Math.max(s.start_ts, a));

export const totalMs = (ss: Seg[], from: number, to: number) => ss.reduce((n, s) => n + overlap(s, from, to), 0);
export const sessionsIn = (ss: Seg[], a: number, b: number) => ss.filter((s) => overlap(s, a, b) > 0);
export const longestMs = (ss: Seg[]) => ss.reduce((m, s) => Math.max(m, endOf(s) - s.start_ts), 0);

/** n days ending at (and including) the day of `now`, oldest first */
export function dailyTotals(ss: Seg[], now: number, n: number) {
  const first = addDays(startOfDay(now), -(n - 1));
  return Array.from({ length: n }, (_, i) => {
    const d = addDays(first, i);
    return { key: dayKey(d), ts: d, ms: totalMs(ss, d, addDays(d, 1)) };
  });
}

/** local hour boundary (UTC flooring is wrong in +5:30 style zones) */
const hourStart = (ts: number) => new Date(ts).setMinutes(0, 0, 0);

export function hourDist(ss: Seg[]) {
  const h = Array(24).fill(0) as number[];
  for (const s of ss) {
    for (let t = hourStart(s.start_ts); t < endOf(s); t += 3600000) {
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

/**
 * days = oldest-first daily totals ending today. Today with no focus yet never breaks the streak.
 * With `rest`, one zero day per Monday-Sunday week is forgiven (it neither adds to nor breaks the streak).
 */
export function streaks(days: { ms: number; ts?: number }[], rest = false) {
  let best = 0, run = 0;
  const used = new Set<number>();
  days.forEach((d, i) => {
    if (d.ms > 0) run++;
    else if (i === days.length - 1) return;
    else if (rest && d.ts != null && !used.has(startOfWeek(d.ts))) used.add(startOfWeek(d.ts));
    else run = 0;
    best = Math.max(best, run);
  });
  return { current: run, best };
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

/** Sessions clipped to one day, as ms offsets from that day's start (for timeline / Gantt charts). */
export function dayBlocks(ss: Seg[], dayStart: number) {
  const dayEnd = addDays(dayStart, 1);
  return ss
    .filter((s) => s.start_ts < dayEnd && endOf(s) > dayStart)
    .map((s) => ({ task_id: s.task_id, a: Math.max(s.start_ts, dayStart) - dayStart, b: Math.min(endOf(s), dayEnd) - dayStart }))
    .sort((x, y) => x.a - y.a);
}

/** n days from `from`, each with its blocks and total */
export function weekDays(ss: Seg[], from: number, n = 7) {
  return Array.from({ length: n }, (_, i) => {
    const ts = addDays(from, i), blocks = dayBlocks(ss, ts);
    return { ts, key: dayKey(ts), blocks, ms: blocks.reduce((t, b) => t + (b.b - b.a), 0) };
  });
}

/** per-day totals split by task group (rootOf maps a task to its subject); parts sorted by size */
export function stackedDays(ss: Seg[], from: number, n: number, rootOf: (id: number) => number) {
  return Array.from({ length: n }, (_, i) => {
    const ts = addDays(from, i), to = addDays(ts, 1), m = new Map<number, number>();
    for (const s of ss) {
      const o = overlap(s, ts, to);
      if (o > 0) m.set(rootOf(s.task_id), (m.get(rootOf(s.task_id)) ?? 0) + o);
    }
    const parts = [...m].sort((a, b) => b[1] - a[1]);
    return { ts, key: dayKey(ts), parts, ms: parts.reduce((t, p) => t + p[1], 0) };
  });
}

/** n weekly totals, oldest first, the last one starting at `lastWeekStart` */
export const weeklyTotals = (ss: Seg[], lastWeekStart: number, n: number) =>
  Array.from({ length: n }, (_, i) => {
    const ts = addDays(lastWeekStart, (i - (n - 1)) * 7);
    return { ts, ms: totalMs(ss, ts, addDays(ts, 7)) };
  });

/** average focus per weekday (index = Date.getDay()) over the last `weeks` full weeks incl. this one */
export function weekdayAverage(ss: Seg[], now: number, weeks: number) {
  const days = dailyTotals(ss, now, weeks * 7), sum = Array(7).fill(0), cnt = Array(7).fill(0);
  for (const d of days) { const k = new Date(d.ts).getDay(); sum[k] += d.ms; cnt[k]++; }
  return sum.map((v, k) => (cnt[k] ? v / cnt[k] : 0)) as number[];
}

/** biggest `max - 1` entries plus one "other" bucket (id = -1) so a pie never has dozens of slivers */
export function pieData(entries: [number, number][], max = 7) {
  const sorted = entries.filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  if (sorted.length <= max) return sorted.map(([id, ms]) => ({ id, ms }));
  const head = sorted.slice(0, max - 1).map(([id, ms]) => ({ id, ms }));
  return [...head, { id: -1, ms: sorted.slice(max - 1).reduce((t, [, v]) => t + v, 0) }];
}

/**
 * GitHub-style calendar: columns = weeks (oldest left), rows = weekday starting at `startDay` (0 Sun, 1 Mon).
 * Returns cells[col][row] (null for days outside the range) and which columns start a new month.
 */
export function contributionGrid(days: { key: string; ms: number; ts: number }[], startDay: number) {
  if (!days.length) return { cols: [] as ({ key: string; ms: number; ts: number } | null)[][], monthAt: [] as { col: number; month: number }[] };
  const lead = (new Date(days[0].ts).getDay() - startDay + 7) % 7;
  const flat = [...Array(lead).fill(null), ...days] as ({ key: string; ms: number; ts: number } | null)[];
  const cols: typeof flat[] = [];
  for (let i = 0; i < flat.length; i += 7) cols.push(flat.slice(i, i + 7));
  const monthAt: { col: number; month: number }[] = [];
  let last = -1;
  cols.forEach((c, i) => {
    const first = c.find((d) => d);
    if (!first) return;
    const m = new Date(first.ts).getMonth();
    if (m !== last) { monthAt.push({ col: i, month: m }); last = m; }
  });
  return { cols, monthAt };
}

/** 0..4 intensity for a day, relative to the busiest day (GitHub-style quartiles) */
export const level = (ms: number, max: number) => (ms <= 0 || max <= 0 ? 0 : Math.min(4, Math.ceil((ms / max) * 4)));

/** 7×24 grid, [weekday 0=Sun][hour] → ms, over all sessions */
export function hourWeekGrid(ss: Seg[]) {
  const g = Array.from({ length: 7 }, () => Array(24).fill(0) as number[]);
  for (const s of ss) {
    for (let t = hourStart(s.start_ts); t < endOf(s); t += 3600000) {
      const d = new Date(t);
      g[d.getDay()][d.getHours()] += overlap(s, t, t + 3600000);
    }
  }
  return g;
}

/** trailing n-day mean of a daily series */
export const movingAvg = (xs: number[], n = 7) => xs.map((_, i) => {
  const w = xs.slice(Math.max(0, i - n + 1), i + 1);
  return w.reduce((a, b) => a + b, 0) / w.length;
});

/**
 * 0-100 focus score for a set of sessions: 40 from avg rating (unrated = neutral 3),
 * 30 from share of sessions without a pickup, 30 from average length vs 50 min.
 */
export function focusScore(ss: (Seg & { quality?: number | null; breaks?: number })[]) {
  if (!ss.length) return null;
  const q = ss.reduce((n, s) => n + (s.quality ?? 3), 0) / ss.length;
  const clean = ss.filter((s) => !s.breaks).length / ss.length;
  const len = ss.reduce((n, s) => n + endOf(s) - s.start_ts, 0) / ss.length;
  return Math.round(((q - 1) / 4) * 40 + clean * 30 + Math.min(1, len / 3000000) * 30);
}

/** Totals for a "Wrapped" card: [from,to) window, subjects via rootOf. */
export function periodSummary(ss: Seg[], from: number, to: number, rootOf: (id: number) => number) {
  const inside = sessionsIn(ss, from, to), n = Math.round((to - from) / DAY);
  const days = Array.from({ length: n }, (_, i) => { const d = addDays(from, i); return { key: dayKey(d), ms: totalMs(inside, d, addDays(d, 1)) }; });
  let run = 0, streak = 0;
  for (const d of days) { run = d.ms > 0 ? run + 1 : 0; streak = Math.max(streak, run); }
  const hours = hourDist(inside), bestHour = hours.indexOf(Math.max(...hours));
  return {
    total: totalMs(inside, from, to), count: inside.length, activeDays: days.filter((d) => d.ms > 0).length, streak,
    top: perTask(inside.map((s) => ({ ...s, task_id: rootOf(s.task_id) })), from, to).slice(0, 3),
    best: bestDay(days), bestHour: hours[bestHour] > 0 ? bestHour : null,
  };
}
