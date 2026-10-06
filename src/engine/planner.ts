export interface PTopic { id: number; subjectId: number; done: boolean; last: number }
export interface PExam { subjectId: number; days: number }
export interface PlanOpts { startSlot: number; endSlot: number; blockSlots: number; budgetSlots: number }

/**
 * Greedy day planner. Per block picks the least-planned, most exam-urgent, least-recently-studied topic,
 * avoiding the same subject twice in a row. `counts` is mutated so multi-day planning rotates topics.
 * Blocks are blockSlots 10-min slots separated by one break slot; slots in `taken` are never used.
 */
export function planDay(topics: PTopic[], exams: PExam[], counts: Map<number, number>, taken: Set<number>, o: PlanOpts) {
  const urgency = (sid: number) => Math.min(Infinity, ...exams.filter((e) => e.subjectId === sid && e.days >= 0).map((e) => e.days));
  const key = (t: PTopic) => (counts.get(t.id) ?? 0) + (t.done ? 2 : 0);
  const out: { slot: number; taskId: number }[] = [];
  let prev = -1, s = o.startSlot;
  while (out.length < o.budgetSlots && s + o.blockSlots <= o.endSlot && topics.length) {
    const free = Array.from({ length: o.blockSlots }, (_, i) => s + i).every((x) => !taken.has(x));
    if (!free) { s++; continue; }
    const sorted = [...topics].sort((a, b) => key(a) - key(b) || urgency(a.subjectId) - urgency(b.subjectId) || a.last - b.last);
    const pick = sorted.find((t) => t.subjectId !== prev) ?? sorted[0];
    for (let i = 0; i < o.blockSlots; i++) out.push({ slot: s + i, taskId: pick.id });
    counts.set(pick.id, (counts.get(pick.id) ?? 0) + 1);
    prev = pick.subjectId;
    s += o.blockSlots + 1;
  }
  return out;
}
