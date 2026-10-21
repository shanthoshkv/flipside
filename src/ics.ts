// Minimal iCalendar reader for busy blocks: timed VEVENTs, DAILY/WEEKLY RRULE (COUNT, UNTIL, INTERVAL, BYDAY), EXDATE. All-day events are skipped.
const DOW: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

/** "20260105T090000Z" is UTC; without Z (or with TZID) it is read as phone-local time. Date-only returns null. */
function when(v: string) {
  const m = v.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z?)/);
  if (!m) return null;
  const a = [+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] ?? 0)] as const;
  return m[7] ? Date.UTC(...a) : new Date(...a).getTime();
}

export function parseIcs(text: string, from: number, to: number) {
  const lines = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
  const out: { start_ts: number; end_ts: number; title: string }[] = [];
  let ev: Record<string, string> | null = null, ex: number[] = [];
  for (const l of lines) {
    if (l === 'BEGIN:VEVENT') { ev = {}; ex = []; continue; }
    if (l === 'END:VEVENT' && ev) {
      const s = when(ev.DTSTART ?? ''), e = when(ev.DTEND ?? '') ?? (s != null ? s + 3600000 : null);
      if (s != null && e != null && e > s) {
        const title = (ev.SUMMARY ?? '').replace(/\\([,;\\])/g, '$1').replace(/\\n/gi, ' ');
        for (const st of expand(s, ev.RRULE, to)) {
          if (ex.includes(st)) continue;
          if (st + (e - s) > from && st < to) out.push({ start_ts: st, end_ts: st + (e - s), title });
        }
      }
      ev = null; continue;
    }
    if (!ev) continue;
    const i = l.indexOf(':');
    if (i < 0) continue;
    const key = l.slice(0, i).split(';')[0], val = l.slice(i + 1);
    if (key === 'EXDATE') ex.push(...val.split(',').map(when).filter((x): x is number => x != null));
    else ev[key] = val;
  }
  return out.sort((a, b) => a.start_ts - b.start_ts);
}

function expand(start: number, rule: string | undefined, to: number) {
  if (!rule) return [start];
  const r = Object.fromEntries(rule.split(';').map((p) => p.split('=')));
  const step = Math.max(1, Number(r.INTERVAL ?? 1)), count = r.COUNT ? Number(r.COUNT) : Infinity;
  const until = r.UNTIL ? when(r.UNTIL.length === 8 ? `${r.UNTIL}T235959` : r.UNTIL) ?? to : to;
  const end = Math.min(until, to), out: number[] = [];
  if (r.FREQ !== 'DAILY' && r.FREQ !== 'WEEKLY') return [start];
  const days = r.FREQ === 'WEEKLY' && r.BYDAY ? r.BYDAY.split(',').map((d: string) => DOW[d.slice(-2)]).filter((d: number) => d != null) : null;
  const d0 = new Date(start);
  // walk day by day (local dates keep wall-clock time across DST); 2 years max
  for (let i = 0; i < 731 && out.length < count; i++) {
    const d = new Date(d0); d.setDate(d0.getDate() + i);
    const t = d.getTime();
    if (t > end) break;
    const ok = r.FREQ === 'DAILY' ? i % step === 0
      : Math.floor((i + d0.getDay()) / 7) % step === 0 && (days ? days.includes(d.getDay()) : d.getDay() === d0.getDay());
    if (ok) out.push(t);
  }
  return out;
}

/** 10-minute plan slots (0..143) of `dayStart` that overlap any busy block */
export function busySlots(busy: { start_ts: number; end_ts: number }[], dayStart: number) {
  const s = new Set<number>();
  for (const b of busy) {
    const a = Math.max(0, Math.floor((b.start_ts - dayStart) / 600000)), z = Math.min(144, Math.ceil((b.end_ts - dayStart) / 600000));
    for (let k = a; k < z; k++) s.add(k);
  }
  return s;
}
