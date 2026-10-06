import { addDays, keyToTs, startOfDay } from './util.ts';

export interface PlanRow { task_id: number; date: string; slot: number }
export interface Block { date: string; startSlot: number; taskId: number }

/** Consecutive 10-minute slots of the same task on the same day become one block. */
export function planBlocks(plans: PlanRow[]): Block[] {
  const sorted = [...plans].sort((a, b) => (a.date === b.date ? a.slot - b.slot : a.date < b.date ? -1 : 1));
  const out: Block[] = [];
  let prev: PlanRow | null = null;
  for (const p of sorted) {
    if (!prev || prev.date !== p.date || prev.task_id !== p.task_id || p.slot !== prev.slot + 1) out.push({ date: p.date, startSlot: p.slot, taskId: p.task_id });
    prev = p;
  }
  return out;
}

/** Quiet hours may wrap midnight (22 → 7). start === end means no quiet hours. */
export const inQuiet = (hour: number, start: number, end: number) =>
  start === end ? false : start < end ? hour >= start && hour < end : hour >= start || hour < end;

/** When to remind for each block: `lead` minutes before it starts. Past times and quiet hours are dropped. */
export function blockTimes(blocks: Block[], now: number, lead: number, quiet: { start: number; end: number }) {
  return blocks
    .map((b) => ({ ...b, at: keyToTs(b.date) + b.startSlot * 600000 - lead * 60000 }))
    .filter((b) => b.at > now && !inQuiet(new Date(b.at).getHours(), quiet.start, quiet.end));
}

/** The next `count` Sundays (including today if still ahead) at `hour`:00. */
export function nextSundays(now: number, hour: number, count: number) {
  const out: number[] = [];
  let d = startOfDay(now);
  for (let i = 0; i < 21 && out.length < count; i++, d = addDays(d, 1)) {
    if (new Date(d).getDay() !== 0) continue;
    const at = d + hour * 3600000;
    if (at > now) out.push(at);
  }
  return out;
}
