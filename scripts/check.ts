import assert from 'node:assert/strict';
import { Detector, THRESH } from '../src/engine/detect.ts';
import { streaks, totalMs, actualSlots, hourDist } from '../src/stats.ts';
import { schedule, previews } from '../src/engine/srs.ts';
import { planDay } from '../src/engine/planner.ts';

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
const now = Date.now(), card = { due: now, ease: 2.5, interval: 0, reps: 0, lapses: 0 };
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
console.log('pass');
