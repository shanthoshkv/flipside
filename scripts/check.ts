import assert from 'node:assert/strict';
import { Detector, THRESH } from '../src/engine/detect.ts';
import { streaks, totalMs, actualSlots, hourDist } from '../src/stats.ts';

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
console.log('pass');
