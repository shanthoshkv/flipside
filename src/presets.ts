export const PRESETS = [
  { label: '25 / 5', focus: 25, brk: 5 },
  { label: '50 / 10', focus: 50, brk: 10 },
  { label: '52 / 17', focus: 52, brk: 17 },
  { label: '90 / 20', focus: 90, brk: 20 },
] as const;

/** Break after focus cycle `cycle` (1-based): a long break every `longEvery` cycles when that is on. */
export const breakLen = (c: { breakMin: number; longBreakMin: number; longEvery: number }, cycle: number) =>
  c.longEvery > 0 && cycle % c.longEvery === 0 ? c.longBreakMin : c.breakMin;

/** Built-in presets followed by the user's own. */
export const allPresets = (mine: { focus: number; brk: number }[]) =>
  [...PRESETS, ...mine.map((p) => ({ label: `${p.focus} / ${p.brk}`, focus: p.focus, brk: p.brk, mine: true }))];
