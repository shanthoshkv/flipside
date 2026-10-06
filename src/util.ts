export const DAY = 86400000;
export const pad2 = (n: number) => String(n).padStart(2, '0');
export const startOfDay = (ts: number) => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
export const dayKey = (ts: number) => { const d = new Date(ts); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
export const keyToTs = (k: string) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d).getTime(); };
export const addDays = (ts: number, n: number) => { const d = new Date(ts); d.setDate(d.getDate() + n); return d.getTime(); };
export const daysUntil = (key: string, now = Date.now()) => Math.round((keyToTs(key) - startOfDay(now)) / DAY);
export const ago = (ts: number, now = Date.now()) => {
  const d = Math.floor((startOfDay(now) - startOfDay(ts)) / DAY);
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d}d ago`;
};
export const fmtClock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h > 0 ? `${h}:${pad2(m)}:${pad2(sec)}` : `${pad2(m)}:${pad2(sec)}`;
};
export const fmtDur = (ms: number) => {
  const m = Math.round(ms / 60000);
  return m >= 60 ? `${Math.floor(m / 60)}h ${pad2(m % 60)}m` : `${m}m`;
};
export const fmtDate = (key: string) => key.split('-').reverse().join('-');
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** Monday 00:00 of the week containing ts */
export const startOfWeek = (ts: number) => { const d = startOfDay(ts); const dow = (new Date(d).getDay() + 6) % 7; return addDays(d, -dow); };
