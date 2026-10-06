import assert from 'node:assert/strict';
import { Detector, THRESH } from '../src/engine/detect.ts';
import { streaks, totalMs, actualSlots, hourDist, dayBlocks, weekDays, stackedDays, weeklyTotals, weekdayAverage, pieData, contributionGrid, level, dailyTotals } from '../src/stats.ts';
import { schedule, previews, buildQueue, clozeCards } from '../src/engine/srs.ts';
import { weeklyReview } from '../src/weekly.ts';
import { planBlocks, blockTimes, inQuiet, nextSundays } from '../src/remindCore.ts';
import { rows } from '../src/locales/strings.ts';
import { rows2 } from '../src/locales/strings2.ts';
import { planDay } from '../src/engine/planner.ts';
import { ACCENTS, contrast, dark, light } from '../src/palette.ts';
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
assert.ok(w1.suggestion.includes('Plan a block') && w1.suggestion.includes('Chem exam') && !w1.suggestion.includes('{'), 'neglected subject with near exam');
const w2 = weeklyReview({ ...base, sessions: [mkS(0, 100, 1)], exams: [] });
assert.ok(w2.suggestion.includes('more minutes a day'), 'goal gap');
const w3 = weeklyReview({ ...base, sessions: [mkS(0, 700, 1), mkS(9, 100, 1)], exams: [] });
assert.ok(w3.suggestion.startsWith('Up '), 'growth');
assert.equal(w1.top?.id, 1);
assert.equal(weeklyReview({ ...base, sessions: [mkS(0, 60, 1, { quality: 4 }), mkS(1, 60, 1, { quality: 2, breaks: 1 })], exams: [] }).quality, 3);

// reminders: blocks, quiet hours (wrapping midnight), Sundays
const blocks = planBlocks([{ task_id: 1, date: '2026-06-10', slot: 110 }, { task_id: 1, date: '2026-06-10', slot: 111 }, { task_id: 1, date: '2026-06-10', slot: 112 }, { task_id: 2, date: '2026-06-10', slot: 113 }, { task_id: 1, date: '2026-06-11', slot: 60 }]);
assert.deepEqual(blocks.map((b) => [b.date, b.startSlot, b.taskId]), [['2026-06-10', 110, 1], ['2026-06-10', 113, 2], ['2026-06-11', 60, 1]], 'consecutive slots merge, task change splits');
assert.ok(inQuiet(23, 22, 7) && inQuiet(3, 22, 7) && !inQuiet(12, 22, 7) && !inQuiet(7, 22, 7) && !inQuiet(5, 5, 5), 'quiet hours wrap');
const bt = blockTimes(blocks, new Date(2026, 5, 10, 8).getTime(), 10, { start: 22, end: 7 });
assert.equal(bt.length, 3, 'future blocks kept');
assert.equal(new Date(bt[0].at).getHours() * 60 + new Date(bt[0].at).getMinutes(), 18 * 60 + 20 - 10, 'lead time applied (slot 110 = 18:20)');
assert.equal(blockTimes(blocks, new Date(2026, 5, 10, 19).getTime(), 10, { start: 22, end: 7 }).length, 1, 'past blocks dropped');
assert.equal(blockTimes(blocks, 0, 10, { start: 9, end: 11 }).filter((b) => b.date === '2026-06-11').length, 0, 'block at 10:00 inside quiet hours dropped');
const sundays = nextSundays(new Date(2026, 5, 10, 12).getTime(), 19, 2);
assert.deepEqual(sundays.map((d) => new Date(d).getDay()), [0, 0]);
assert.equal(new Date(sundays[0]).getDate(), 14);

// timeline / pie / contribution helpers
const H = 3600000, base0 = new Date(2026, 5, 8).getTime(); // a Monday
const sess = [
  { task_id: 1, start_ts: base0 + 9 * H, end_ts: base0 + 10.5 * H, heartbeat_ts: null },
  { task_id: 2, start_ts: base0 + 23 * H, end_ts: base0 + 25 * H, heartbeat_ts: null }, // crosses midnight
  { task_id: 1, start_ts: base0 + 2 * 24 * H + 8 * H, end_ts: base0 + 2 * 24 * H + 9 * H, heartbeat_ts: null },
];
const wd = weekDays(sess, base0);
assert.equal(wd[0].blocks.length, 2); assert.equal(wd[1].blocks.length, 1, 'midnight-crossing session is split');
assert.equal(wd[0].ms, 2.5 * H); assert.equal(wd[1].ms, 1 * H);
assert.equal(dayBlocks(sess, base0)[1].b, 24 * H, 'clipped to the day end');
const sd = stackedDays(sess, base0, 3, (id) => id);
assert.deepEqual(sd[0].parts.map((p) => p[0]), [1, 2]);
assert.equal(sd[0].parts[0][1], 1.5 * H);
assert.equal(weeklyTotals(sess, base0, 2)[1].ms, 4.5 * H, 'this week total');
assert.equal(weeklyTotals(sess, base0, 2)[0].ms, 0, 'previous week empty');
const pie = pieData([[1, 50], [2, 40], [3, 30], [4, 20], [5, 10], [6, 5]], 4);
assert.equal(pie.length, 4); assert.deepEqual(pie[3], { id: -1, ms: 35 }, 'rest grouped as other');
assert.equal(pieData([[1, 5], [2, 0]]).length, 1, 'zeros dropped');
const dt = dailyTotals(sess, base0 + 6 * 24 * H, 14).map((d) => ({ ...d }));
const grid = contributionGrid(dt, 1);
assert.ok(grid.cols.every((c) => c.length === 7 || c === grid.cols[grid.cols.length - 1]), 'full weeks except the last');
assert.equal(grid.cols[0].findIndex((d) => d), (new Date(dt[0].ts).getDay() + 6) % 7, 'first column padded to the week start');
assert.deepEqual([level(0, 10), level(1, 10), level(5, 10), level(10, 10)], [0, 1, 2, 4]);
assert.equal(weekdayAverage(sess, base0 + 6 * 24 * H, 1)[1] > 0, true);

// explicit calendar-week window
const wkFrom = new Date(2026, 5, 8).getTime(), ww = weeklyReview({ ...base, now: wkFrom + 3 * D, range: { from: wkFrom, to: wkFrom + 7 * D }, sessions: [{ task_id: 1, start_ts: wkFrom + 2 * D + 3600000, end_ts: wkFrom + 2 * D + 7200000, heartbeat_ts: null }, { task_id: 1, start_ts: wkFrom - 2 * D, end_ts: wkFrom - 2 * D + 1800000, heartbeat_ts: null }], exams: [] });
assert.equal(ww.cur, 60 * 60000, 'only sessions inside the calendar week count');
assert.equal(ww.prev, 30 * 60000, 'previous calendar week');

// translations: every row has all 6 languages and keeps the {placeholders} of the English text
const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).filter((x) => !/^\{\{/.test(x)).sort().join(',');
for (const r of [...rows, ...rows2]) {
  assert.equal(r.length, 7, `row needs 7 columns: ${r[0]}`);
  for (let i = 1; i < 7; i++) {
    assert.ok(r[i].trim().length > 0, `empty translation ${i} for: ${r[0]}`);
    assert.equal(ph(r[i].replace(/\{\{.*?\}\}/g, '')), ph(r[0].replace(/\{\{.*?\}\}/g, '')), `placeholders differ (col ${i}) for: ${r[0]}`);
  }
}

// WCAG AA (4.5:1) for every text colour on every surface it is drawn on, both themes
for (const [name, p] of Object.entries({ dark, light })) {
  for (const fg of ['text', 'muted', 'accentText', 'danger'] as const) {
    for (const bg of ['bg', 'surface', 'surface2'] as const) {
      assert.ok(contrast(p[fg], p[bg]) >= 4.5, `${name}: ${fg} on ${bg} = ${contrast(p[fg], p[bg]).toFixed(2)}`);
    }
  }
  for (const bg of ['accentA', 'accentB'] as const) assert.ok(contrast('#1A1206', p[bg]) >= 4.5, `${name}: button text on ${bg}`);
}

// every accent preset stays readable in both themes
for (const [id, a] of Object.entries(ACCENTS)) {
  for (const bg of ['bg', 'surface', 'surface2'] as const) {
    assert.ok(contrast(a.textDark, dark[bg]) >= 4.5, `${id}: text on dark ${bg}`);
    assert.ok(contrast(a.textLight, light[bg]) >= 4.5, `${id}: text on light ${bg} = ${contrast(a.textLight, light[bg]).toFixed(2)}`);
  }
  assert.ok(contrast('#1A1206', a.a) >= 4.5 && contrast('#1A1206', a.b) >= 4.5, `${id}: button text`);
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
