import * as SQLite from 'expo-sqlite';

export interface Task { id: number; name: string; category: string; color: string; created_at: number; archived: number }
export interface Session { id: number; task_id: number; start_ts: number; end_ts: number | null; heartbeat_ts: number | null; mode: string }
export interface Plan { id: number; task_id: number; date: string; slot: number }
export interface Diary { date: string; l1: string; l2: string; l3: string }

let dbp: Promise<SQLite.SQLiteDatabase> | null = null;
const db = () => (dbp ??= SQLite.openDatabaseAsync('flipside.db'));

const MIGRATIONS = [
  `CREATE TABLE tasks(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT NOT NULL DEFAULT '', color TEXT NOT NULL, created_at INTEGER NOT NULL, archived INTEGER NOT NULL DEFAULT 0);
   CREATE TABLE sessions(id INTEGER PRIMARY KEY AUTOINCREMENT, task_id INTEGER NOT NULL, start_ts INTEGER NOT NULL, end_ts INTEGER, heartbeat_ts INTEGER, mode TEXT NOT NULL DEFAULT 'stopwatch');
   CREATE INDEX idx_sessions_start ON sessions(start_ts);
   CREATE TABLE plans(id INTEGER PRIMARY KEY AUTOINCREMENT, task_id INTEGER NOT NULL, date TEXT NOT NULL, slot INTEGER NOT NULL, UNIQUE(date, slot));
   CREATE TABLE diary(date TEXT PRIMARY KEY, l1 TEXT NOT NULL DEFAULT '', l2 TEXT NOT NULL DEFAULT '', l3 TEXT NOT NULL DEFAULT '');
   CREATE TABLE settings(key TEXT PRIMARY KEY, value TEXT NOT NULL);`,
];

export async function migrate() {
  const d = await db();
  const row = await d.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let v = row?.user_version ?? 0;
  for (; v < MIGRATIONS.length; v++) {
    await d.execAsync(MIGRATIONS[v]);
    await d.execAsync(`PRAGMA user_version = ${v + 1}`);
  }
}
export async function initDb() {
  await migrate();
  await closeOrphans();
}

// tasks
export const listTasks = async () => (await db()).getAllAsync<Task>('SELECT * FROM tasks WHERE archived=0 ORDER BY id');
export async function addTask(name: string, category: string, color: string) {
  const r = await (await db()).runAsync('INSERT INTO tasks(name,category,color,created_at) VALUES(?,?,?,?)', name, category, color, Date.now());
  return r.lastInsertRowId;
}
export const archiveTask = async (id: number) => void (await (await db()).runAsync('UPDATE tasks SET archived=1 WHERE id=?', id));

// sessions
export async function openSession(taskId: number, mode: string, ts: number) {
  const r = await (await db()).runAsync('INSERT INTO sessions(task_id,start_ts,heartbeat_ts,mode) VALUES(?,?,?,?)', taskId, ts, ts, mode);
  return r.lastInsertRowId;
}
export const heartbeat = async (id: number, ts: number) => void (await (await db()).runAsync('UPDATE sessions SET heartbeat_ts=? WHERE id=?', ts, id));
export const closeSession = async (id: number, ts: number) => void (await (await db()).runAsync('UPDATE sessions SET end_ts=?, heartbeat_ts=? WHERE id=?', ts, ts, id));
export const deleteSession = async (id: number) => void (await (await db()).runAsync('DELETE FROM sessions WHERE id=?', id));
export async function closeOrphans() {
  const d = await db();
  await d.runAsync('UPDATE sessions SET end_ts=COALESCE(heartbeat_ts,start_ts) WHERE end_ts IS NULL');
  await d.runAsync('DELETE FROM sessions WHERE end_ts - start_ts < 10000');
}
/** sessions overlapping [from,to); open sessions use heartbeat as end */
export const sessionsBetween = async (from: number, to: number) => (await db()).getAllAsync<Session>(
  'SELECT * FROM sessions WHERE start_ts < ? AND COALESCE(end_ts,heartbeat_ts,start_ts) > ? ORDER BY start_ts', to, from);

// plans
export const plansForDate = async (date: string) => (await db()).getAllAsync<Plan>('SELECT * FROM plans WHERE date=?', date);
export async function setPlan(taskId: number, date: string, slot: number, on: boolean) {
  const d = await db();
  if (on) await d.runAsync('INSERT OR REPLACE INTO plans(task_id,date,slot) VALUES(?,?,?)', taskId, date, slot);
  else await d.runAsync('DELETE FROM plans WHERE date=? AND slot=?', date, slot);
}

// diary
export const getDiary = async (date: string) =>
  (await (await db()).getFirstAsync<Diary>('SELECT * FROM diary WHERE date=?', date)) ?? { date, l1: '', l2: '', l3: '' };
export const saveDiary = async (x: Diary) =>
  void (await (await db()).runAsync('INSERT OR REPLACE INTO diary(date,l1,l2,l3) VALUES(?,?,?,?)', x.date, x.l1, x.l2, x.l3));

// settings
export async function getSettings() {
  const rows = await (await db()).getAllAsync<{ key: string; value: string }>('SELECT * FROM settings');
  return Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, string>;
}
export const setSetting = async (k: string, v: string) =>
  void (await (await db()).runAsync('INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)', k, v));

// export / import / reset
const TABLES = ['tasks', 'sessions', 'plans', 'diary', 'settings'] as const;
export async function exportAll() {
  const d = await db();
  const out: Record<string, unknown[]> = {};
  for (const t of TABLES) out[t] = await d.getAllAsync(`SELECT * FROM ${t}`);
  return JSON.stringify({ app: 'flipside', version: 1, data: out });
}
export async function importAll(json: string) {
  const parsed = JSON.parse(json);
  if (parsed?.app !== 'flipside' || !parsed.data) throw new Error('Not a Flipside export');
  const d = await db();
  await d.withTransactionAsync(async () => {
    for (const t of TABLES) {
      await d.runAsync(`DELETE FROM ${t}`);
      for (const row of parsed.data[t] ?? []) {
        const cols = Object.keys(row);
        await d.runAsync(`INSERT INTO ${t}(${cols.join(',')}) VALUES(${cols.map(() => '?').join(',')})`, ...cols.map((c) => row[c]));
      }
    }
  });
}
export async function resetAll() {
  const d = await db();
  for (const t of TABLES) await d.runAsync(`DELETE FROM ${t}`);
}
