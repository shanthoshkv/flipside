import assert from 'node:assert/strict';
import { Detector, THRESH } from '../src/engine/detect.ts';
import { streaks, totalMs, actualSlots, hourDist } from '../src/stats.ts';
import { schedule, previews, buildQueue, clozeCards } from '../src/engine/srs.ts';
import { weeklyReview } from '../src/weekly.ts';
import { planDay } from '../src/engine/planner.ts';
import { contrast, dark, light } from '../src/palette.ts';
import { calibrate } from '../src/engine/detect.ts';

// flip start after 1s flat face-down, then stop on lift
const d = new Detector(THRESH.medium);
let ev: string | null = null, t = 0;
for (; t < 1300 && ev !== 'start'; t += 100) ev = d.feed(t, 0.01, 0.02, -0.98, false);
assert.equal(ev, 'start', 'flip start');
assert.equal(d.feed(t, 0.5, 0.5, -0.1, false), null, 'no start when up');
ev = null;
for (let i = 0; i < 20 && !ev; i++, t += 100) ev = d.feed(t, 0, 0, -0.98, true);
assert.equal(ev, null, 'steady stays running');
for (let i = 0; i < 10 && !ev; i++, t += 100) ev = d.feed(t, 0, 0, 0.2, true);
assert.equal(ev, 'stop', 'lift stops');

// jitter stop
const j = new Detector(THRESH.medium); ev = null; t = 0;
for (let i = 0; i < 30 && !ev; i++, t += 100) ev = j.feed(t, (i % 2 ? 1 : -1) * 0.3, 0, -0.9, true);
assert.equal(ev, 'stop', 'jitter stops');

// stats
assert.deepEqual(streaks([{ ms: 1 }, { ms: 1 }, { ms: 0 }, { ms: 1 }, { ms: 1 }, { ms: 0 }]), { current: 2, best: 2 });
assert.deepEqual(streaks([{ ms: 1 }, { ms: 0 }]), { current: 1, best: 1 });
const ss = [{ task_id: 1, start_ts: 0, end_ts: 3600000, heartbeat_ts: null }];
assert.equal(totalMs(ss, 0, 1800000), 1800000);
assert.equal(hourDist(ss).reduce((a, b) => a + b, 0), 3600000);
assert.equal(actualSlots(ss, 0).size, 6);
// srs
const now = Date.now(), card = { due: now, ease: 2.5, interval: 0, reps: 0, lapses: 0, stability: null, difficulty: null };
assert.equal(schedule(card, 0, now).due, now + 600000, 'again = 10m');
assert.equal(schedule(card, 2, now).interval, 1, 'new good = 1d');
const g1 = schedule(card, 2, now), g2 = schedule(g1, 2, now), g3 = schedule(g2, 2, now);
assert.deepEqual([g1.interval, g2.interval, g3.interval], [1, 3, 8], 'good ladder');
assert.equal(schedule(g3, 0, now).reps, 0, 'lapse resets');
assert.ok(schedule(g3, 0, now).ease < g3.ease, 'lapse lowers ease');
assert.deepEqual(previews(card, now), ['10m', '1d', '1d', '4d']);

// planner: interleaves subjects, respects taken slots + budget
const topics = [{ id: 1, subjectId: 10, done: false, last: 0 }, { id: 2, subjectId: 10, done: false, last: 0 }, { id: 3, subjectId: 20, done: false, last: 0 }];
const plan = planDay(topics, [{ subjectId: 20, days: 3 }], new Map(), new Set([102]), { startSlot: 102, endSlot: 132, blockSlots: 5, budgetSlots: 15 });
assert.equal(plan.length, 15, 'budget respected');
assert.ok(plan.every((p) => p.slot !== 102), 'taken slot skipped');
assert.equal(plan[0].taskId, 3, 'urgent subject first');
assert.notEqual(plan[0].taskId, plan[5].taskId, 'no repeat back-to-back subject');
// fsrs: published first-review ladder at 90% retention, then growth and lapse behaviour
assert.deepEqual(previews(card, now, 'fsrs'), ['10m', '1d', '4d', '14d'], 'fsrs first review');
const f1 = schedule(card, 2, now, 'fsrs'), later = now + f1.interval * 86400000;
const f2 = schedule({ ...f1, last_review: now }, 2, later, 'fsrs'), f3 = schedule({ ...f2, last_review: later }, 2, later + f2.interval * 86400000, 'fsrs');
assert.ok(f2.interval > f1.interval && f3.interval > f2.interval, 'fsrs intervals grow when recalled on time');
const lapse = schedule({ ...f3, last_review: later }, 0, later + f3.interval * 86400000, 'fsrs');
assert.ok((lapse.stability ?? 99) < (f3.stability ?? 0) && lapse.interval === 0, 'fsrs lapse drops stability');
assert.ok(schedule({ ...f3, last_review: later }, 3, later + f3.interval * 86400000, 'fsrs').interval > f3.interval, 'easy grows more');
assert.ok(schedule({ ...f1, last_review: now }, 2, now + 3600000, 'fsrs').interval >= 1, 'early review stays valid');

// daily limits: reviews first, then new, each capped
const mk = (id: number, due: number, last: number | null, reps: number) => ({ id, due, last_review: last, reps });
const q = buildQueue([mk(1, now - 5, now - 1e6, 2), mk(2, now - 9, now - 1e6, 1), mk(3, now - 1, null, 0), mk(4, now - 2, null, 0), mk(5, now + 1e9, null, 0)], now, { newPerDay: 1, reviewsPerDay: 5 }, { reviewsToday: 0, newToday: 0 });
assert.deepEqual(q.map((c) => c.id), [2, 1, 3], 'oldest due first, new capped at 1, future excluded');
assert.equal(buildQueue([mk(1, now - 5, now - 1e6, 2)], now, { newPerDay: 5, reviewsPerDay: 3 }, { reviewsToday: 3, newToday: 0 }).length, 0, 'review cap reached');

// cloze
const cl = clozeCards('The {{c1::mitochondria}} makes {{c2::ATP}}', 'cell bio');
assert.equal(cl.length, 2);
assert.equal(cl[0].front, 'The [...] makes ATP');
assert.equal(cl[1].front, 'The mitochondria makes [...]');
assert.ok(cl[0].back.startsWith('The mitochondria makes ATP') && cl[0].back.endsWith('cell bio'));
assert.equal(clozeCards('Capital of France is {{Paris}}').length, 1);
assert.equal(clozeCards('no blanks here').length, 0);

// weekly review: neglected subject near an exam wins, then goal gap, then growth
const D = 86400000, nowT = new Date(2026, 5, 10, 12).getTime();
const mkS = (daysAgo: number, mins: number, task: number, extra = {}) => ({ task_id: task, start_ts: nowT - daysAgo * D, end_ts: nowT - daysAgo * D + mins * 60000, heartbeat_ts: null, ...extra });
const base = { now: nowT, weeklyGoalMs: 600 * 60000, rootOf: (id: number) => id, subjects: [{ id: 1, name: 'Maths' }, { id: 2, name: 'Physics' }], cardsReviewed: 0 };
const w1 = weeklyReview({ ...base, sessions: [mkS(0, 120, 1), mkS(1, 60, 1), mkS(2, 90, 2), mkS(9, 60, 1)], exams: [{ subjectId: 3, days: 5, name: 'Chem exam' }] });
assert.equal(w1.cur, 270 * 60000);
assert.equal(w1.prev, 60 * 60000);
assert.ok(w1.suggestion.includes('Plan a block'), 'neglected subject with near exam');
const w2 = weeklyReview({ ...base, sessions: [mkS(0, 100, 1)], exams: [] });
assert.ok(w2.suggestion.includes('more minutes a day'), 'goal gap');
const w3 = weeklyReview({ ...base, sessions: [mkS(0, 700, 1), mkS(9, 100, 1)], exams: [] });
assert.ok(w3.suggestion.startsWith('Up '), 'growth');
assert.equal(w1.top?.id, 1);
assert.equal(weeklyReview({ ...base, sessions: [mkS(0, 60, 1, { quality: 4 }), mkS(1, 60, 1, { quality: 2, breaks: 1 })], exams: [] }).quality, 3);

// WCAG AA (4.5:1) for every text colour on every surface it is drawn on, both themes
for (const [name, p] of Object.entries({ dark, light })) {
  for (const fg of ['text', 'muted', 'accentText', 'danger'] as const) {
    for (const bg of ['bg', 'surface', 'surface2'] as const) {
      assert.ok(contrast(p[fg], p[bg]) >= 4.5, `${name}: ${fg} on ${bg} = ${contrast(p[fg], p[bg]).toFixed(2)}`);
    }
  }
  for (const bg of ['accentA', 'accentB'] as const) assert.ok(contrast('#1A1206', p[bg]) >= 4.5, `${name}: button text on ${bg}`);
}

// calibration
const still = (z: number) => Array.from({ length: 30 }, (_, i) => ({ x: 0.02, y: -0.03, z: z + (i % 2 ? 0.002 : -0.002) }));
const cal = calibrate(still(-0.93), still(0.4));
assert.ok(typeof cal === 'object' && cal.zStart > -0.95 && cal.zStart < -0.7 && cal.zStop > -0.5 && cal.zStop < 0.1, 'calibration thresholds sane');
assert.equal(typeof calibrate(still(0.1), still(0.4)), 'string', 'rejects not-face-down');
assert.equal(typeof calibrate(still(-0.95), still(-0.9)), 'string', 'rejects no lift');

// streak rest day: one zero day per week is forgiven
const wk = (ms: number[]) => ms.map((v, i) => ({ ms: v, ts: new Date(2026, 0, 5 + i).getTime() })); // starts on a Monday
assert.deepEqual(streaks(wk([1, 1, 0, 1, 1, 1, 1]), true), { current: 6, best: 6 }, 'one rest day forgiven');
assert.deepEqual(streaks(wk([1, 1, 0, 0, 1, 1, 1]), true), { current: 3, best: 3 }, 'second zero breaks');
assert.deepEqual(streaks(wk([1, 1, 0, 1, 1, 1, 1]), false), { current: 4, best: 4 }, 'rest off = plain');
console.log('pass');
