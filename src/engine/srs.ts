import { addDays, startOfDay } from '../util.ts';

export interface Sched { due: number; ease: number; interval: number; reps: number; lapses: number; stability: number | null; difficulty: number | null; last_review?: number | null }
export type Grade = 0 | 1 | 2 | 3; // again, hard, good, easy
export type Algo = 'fsrs' | 'sm2';
export const GRADES = ['Again', 'Hard', 'Good', 'Easy'] as const;

const DAY = 86400000, MIN10 = 600000;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** SM-2 variant. interval in days; 0 = relearning (due in 10 min). Graduated cards are day-aligned. */
function sm2(c: Sched, g: Grade, now: number): Sched {
  let { ease, interval } = c;
  const { reps, lapses } = c;
  if (g === 0) return { ...c, due: now + MIN10, ease: Math.max(1.3, ease - 0.2), interval: 0, reps: 0, lapses: lapses + 1 };
  if (g === 1) { ease = Math.max(1.3, ease - 0.15); interval = reps === 0 ? 1 : interval * 1.2; }
  else if (g === 2) interval = reps === 0 ? 1 : reps === 1 ? 3 : interval * ease;
  else { ease += 0.15; interval = reps === 0 ? 4 : Math.max(reps === 1 ? 6 : interval * ease * 1.3, interval + 1); }
  interval = Math.max(1, Math.round(interval));
  return { ...c, due: addDays(startOfDay(now), interval), ease, interval, reps: reps + 1, lapses };
}

// FSRS-4.5 with its published default weights. Stability = days until recall probability falls to 90%.
const W = [0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755];
const DECAY = -0.5, FACTOR = 19 / 81;
const retrievability = (days: number, s: number) => (1 + (FACTOR * days) / s) ** DECAY;
const intervalFor = (s: number, retention: number) => (s / FACTOR) * (retention ** (1 / DECAY) - 1);
const initD = (r: number) => clamp(W[4] - (r - 3) * W[5], 1, 10);

function fsrs(c: Sched, g: Grade, now: number, retention: number): Sched {
  const r = g + 1; // FSRS rating 1..4
  let s: number, d: number;
  const fresh = c.stability == null && c.reps === 0 && !c.last_review;
  if (fresh) { s = W[r - 1]; d = initD(r); }
  else {
    const s0 = c.stability ?? Math.max(1, c.interval), d0 = c.difficulty ?? 5; // SM-2 cards migrate on first FSRS review
    const elapsed = c.last_review ? Math.max(0, (now - c.last_review) / DAY) : s0;
    const R = retrievability(elapsed, s0);
    d = clamp(W[7] * W[4] + (1 - W[7]) * (d0 - W[6] * (r - 3)), 1, 10);
    if (r === 1) s = Math.min(s0, W[11] * d0 ** -W[12] * ((s0 + 1) ** W[13] - 1) * Math.exp(W[14] * (1 - R)));
    else s = s0 * (1 + Math.exp(W[8]) * (11 - d0) * s0 ** -W[9] * (Math.exp(W[10] * (1 - R)) - 1) * (r === 2 ? W[15] : 1) * (r === 4 ? W[16] : 1));
  }
  s = Math.max(0.1, s);
  if (g === 0) return { ...c, stability: s, difficulty: d, due: now + MIN10, interval: 0, reps: 0, lapses: c.lapses + 1 };
  const interval = Math.max(1, Math.round(intervalFor(s, retention)));
  return { ...c, stability: s, difficulty: d, interval, due: addDays(startOfDay(now), interval), reps: c.reps + 1 };
}

/** retention is a fraction, e.g. 0.9 */
export function schedule(c: Sched, g: Grade, now: number, algo: Algo = 'sm2', retention = 0.9): Sched {
  return algo === 'fsrs' ? fsrs(c, g, now, retention) : sm2(c, g, now);
}

export const isDue = (c: { due: number }, now: number) => c.due <= now;

export function fmtInterval(days: number) {
  return days === 0 ? '10m' : days < 30 ? `${days}d` : days < 365 ? `${Math.round(days / 30)}mo` : `${(days / 365).toFixed(1)}y`;
}
export const previews = (c: Sched, now: number, algo: Algo = 'sm2', retention = 0.9) =>
  ([0, 1, 2, 3] as Grade[]).map((g) => fmtInterval(schedule(c, g, now, algo, retention).interval));

/** A card the user has never answered. */
export const isNew = (c: { last_review?: number | null; reps: number }) => !c.last_review && c.reps === 0;

/**
 * Today's study queue: due reviews first (oldest due first), then new cards, each capped by the daily limits.
 * `reviewsToday` / `newToday` are what you already did today.
 */
export function buildQueue<T extends { id: number; due: number; last_review?: number | null; reps: number }>(
  cards: T[], now: number, lim: { newPerDay: number; reviewsPerDay: number }, done: { reviewsToday: number; newToday: number },
) {
  const due = cards.filter((c) => isDue(c, now));
  const rev = due.filter((c) => !isNew(c)).sort((a, b) => a.due - b.due).slice(0, Math.max(0, lim.reviewsPerDay - done.reviewsToday));
  const fresh = due.filter(isNew).sort((a, b) => a.id - b.id).slice(0, Math.max(0, lim.newPerDay - done.newToday));
  return [...rev, ...fresh];
}

/**
 * Cloze text: "The {{c1::mitochondria}} makes {{c2::ATP}}" or plain "{{answer}}".
 * One card per cloze index; the active blank shows as [...], others stay visible.
 */
export function clozeCards(text: string, extra = '') {
  const re = /\{\{(?:c(\d+)::)?(.+?)\}\}/g;
  const hits: { idx: number; ans: string }[] = [];
  let n = 0, m: RegExpExecArray | null;
  while ((m = re.exec(text))) hits.push({ idx: m[1] ? Number(m[1]) : ++n, ans: m[2] });
  const ids = [...new Set(hits.map((h) => h.idx))];
  const reveal = (t: string) => t.replace(re, (_, __, a) => a);
  return ids.map((id) => {
    let k = 0;
    const front = text.replace(re, (_, c, a) => ((c ? Number(c) : ++k) === id ? '[...]' : a));
    return { front, back: reveal(text) + (extra ? `\n\n${extra}` : '') };
  });
}
