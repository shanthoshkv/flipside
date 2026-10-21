// Pure converters between app rows and plain-text formats (CSV, Anki TSV, iCalendar, Markdown). No I/O here.
import { dayKey, fmtDur, pad2 } from './util.ts';

interface T { id: number; name: string; parent_id: number | null }
interface S { task_id: number; start_ts: number; end_ts: number | null; heartbeat_ts: number | null; mode: string; quality: number | null; note: string }
interface C { front: string; back: string; task_id: number }

const endOf = (s: S) => s.end_ts ?? s.heartbeat_ts ?? s.start_ts;
const cell = (v: unknown) => { const x = String(v ?? ''); return /[",\n\r]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x; };
const iso = (ts: number) => { const d = new Date(ts); return `${dayKey(ts)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
const pathOf = (tasks: T[], id: number) => {
  const t = tasks.find((k) => k.id === id), p = t?.parent_id != null ? tasks.find((k) => k.id === t.parent_id) : null;
  return { subject: p?.name ?? t?.name ?? '', topic: p ? t!.name : '' };
};

export function sessionsCsv(ss: S[], tasks: T[]) {
  const head = 'start,end,minutes,subject,topic,mode,quality,note';
  return [head, ...ss.map((s) => {
    const { subject, topic } = pathOf(tasks, s.task_id);
    return [iso(s.start_ts), iso(endOf(s)), Math.round((endOf(s) - s.start_ts) / 60000), subject, topic, s.mode, s.quality ?? '', s.note].map(cell).join(',');
  })].join('\n');
}

/** RFC 4180 parser: quoted fields, escaped quotes, newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const out: string[][] = []; let row: string[] = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { f += '"'; i++; } else if (ch === '"') q = false; else f += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',' || ch === ';' || ch === '\t') { row.push(f); f = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(f); out.push(row); row = []; f = ''; }
    else f += ch;
  }
  if (f || row.length) { row.push(f); out.push(row); }
  return out.filter((r) => r.some((c) => c.trim()));
}

const toTs = (date: string, time = '') => {
  const s = `${date.trim()} ${time.trim()}`.trim().replace('T', ' ').replace(/Z$/, '');
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0)).getTime();
  const t = Date.parse(s);
  return Number.isNaN(t) ? NaN : t;
};

/** Sessions from our own CSV, Toggl ("Start date","Start time","End date","End time","Project") or Forest ("Start Time","End Time","Tag"). */
export function parseSessionsCsv(text: string) {
  const [head, ...rows] = parseCsv(text);
  if (!head) return [];
  const h = head.map((x) => x.trim().toLowerCase());
  const col = (...names: string[]) => names.map((n) => h.indexOf(n)).find((i) => i >= 0) ?? -1;
  const sd = col('start date', 'start', 'start time', 'started at'), st = col('start time');
  const ed = col('end date', 'end', 'end time', 'ended at'), et = col('end time');
  const subj = col('subject', 'project', 'tag', 'task'), top = col('topic', 'description', 'note');
  const note = col('note'), qual = col('quality');
  if (sd < 0 || ed < 0) throw new Error('Need start and end columns');
  return rows.map((r) => {
    const start = sd === st ? toTs(r[sd]) : toTs(r[sd], st >= 0 ? r[st] : '');
    const end = ed === et ? toTs(r[ed]) : toTs(r[ed], et >= 0 ? r[et] : '');
    const q = qual >= 0 ? Number(r[qual]) : NaN;
    return { start, end, subject: (r[subj] ?? '').trim(), topic: top >= 0 && top !== note ? (r[top] ?? '').trim() : '', note: note >= 0 ? r[note] ?? '' : '', quality: q >= 1 && q <= 5 ? q : null };
  }).filter((x) => x.end - x.start >= 10000);
}

/** Anki "Notes in plain text": front<TAB>back[<TAB>tags]. HTML stripped on import. */
export const cardsTsv = (cards: C[], tasks: T[]) =>
  ['#separator:tab', '#html:false', '#tags column:3', ...cards.map((c) =>
    [c.front, c.back, (pathOf(tasks, c.task_id).subject || '').replace(/\s+/g, '_')].map((x) => x.replace(/[\t\n]/g, ' ')).join('\t'))].join('\n');

const strip = (s: string) => s.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').trim();
// entities decoded before splitting so "&amp;" is not read as a ";" separator
const unescape = (s: string) => s.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
export function parseCardsText(text: string) {
  const lines = unescape(text).split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#'));
  const sep = lines.some((l) => l.includes('\t')) ? '\t' : lines.some((l) => l.includes(';')) ? ';' : ',';
  return lines.map((l) => (sep === '\t' ? l.split('\t') : parseCsv(l)[0] ?? [])).filter((p) => p.length >= 2 && p[0].trim() && p[1].trim())
    .map((p) => ({ front: strip(p[0]), back: strip(p[1]), tag: (p[2] ?? '').trim().split(/\s+/)[0]?.replace(/_/g, ' ') ?? '' }));
}

const icsTs = (ts: number) => new Date(ts).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const icsEsc = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
export function sessionsIcs(ss: S[], tasks: T[], now = Date.now()) {
  const ev = ss.map((s, i) => {
    const { subject, topic } = pathOf(tasks, s.task_id);
    return ['BEGIN:VEVENT', `UID:flipside-${s.start_ts}-${i}@local`, `DTSTAMP:${icsTs(now)}`, `DTSTART:${icsTs(s.start_ts)}`, `DTEND:${icsTs(endOf(s))}`,
      `SUMMARY:${icsEsc(`Focus: ${[subject, topic].filter(Boolean).join(' / ') || 'No task'}`)}`, s.note ? `DESCRIPTION:${icsEsc(s.note)}` : '', 'END:VEVENT'].filter(Boolean).join('\r\n');
  });
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Flipside//EN', ...ev, 'END:VCALENDAR'].join('\r\n');
}

/** Human-readable summary: totals per subject, per week, best day. */
export function reportMd(ss: S[], tasks: T[], now = Date.now()) {
  const tot = ss.reduce((n, s) => n + endOf(s) - s.start_ts, 0);
  const by = new Map<string, number>(), days = new Map<string, number>();
  for (const s of ss) {
    const k = pathOf(tasks, s.task_id).subject || 'No task', ms = endOf(s) - s.start_ts;
    by.set(k, (by.get(k) ?? 0) + ms); days.set(dayKey(s.start_ts), (days.get(dayKey(s.start_ts)) ?? 0) + ms);
  }
  const best = [...days].sort((a, b) => b[1] - a[1])[0];
  const rated = ss.filter((s) => s.quality != null);
  return [`# Flipside report · ${dayKey(now)}`, '',
    `- Total focus: **${fmtDur(tot)}** in ${ss.length} sessions over ${days.size} days`,
    best ? `- Best day: ${best[0]} (${fmtDur(best[1])})` : '',
    rated.length ? `- Avg focus quality: ${(rated.reduce((n, s) => n + s.quality!, 0) / rated.length).toFixed(1)} / 5` : '',
    '', '## By subject', '', '| Subject | Time | Share |', '|---|---|---|',
    ...[...by].sort((a, b) => b[1] - a[1]).map(([k, v]) => `| ${k.replace(/\|/g, '/')} | ${fmtDur(v)} | ${Math.round((v / (tot || 1)) * 100)}% |`),
  ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');
}
