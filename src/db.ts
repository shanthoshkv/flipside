import * as SQLite from 'expo-sqlite';

export interface Task { id: number; name: string; category: string; color: string; created_at: number; archived: number; parent_id: number | null; done: number; weekly_goal_min: number }
export interface Session { id: number; task_id: number; start_ts: number; end_ts: number | null; heartbeat_ts: number | null; mode: string; quality: number | null; note: string; breaks: number }
export interface Card { id: number; task_id: number; front: string; back: string; due: number; ease: number; interval: number; reps: number; lapses: number; created_at: number; last_review: number | null; stability: number | null; difficulty: number | null; front_img: string | null; back_img: string | null }
export interface Exam { id: number; name: string; date: string; task_id: number }
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
  `ALTER TABLE tasks ADD COLUMN parent_id INTEGER;
   ALTER TABLE tasks ADD COLUMN done INTEGER NOT NULL DEFAULT 0;
   ALTER TABLE sessions ADD COLUMN quality INTEGER;
   ALTER TABLE sessions ADD COLUMN note TEXT NOT NULL DEFAULT '';
   CREATE TABLE exams(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, date TEXT NOT NULL, task_id INTEGER NOT NULL);`,
  `CREATE TABLE cards(id INTEGER PRIMARY KEY AUTOINCREMENT, task_id INTEGER NOT NULL DEFAULT 0, front TEXT NOT NULL, back TEXT NOT NULL, due INTEGER NOT NULL, ease REAL NOT NULL DEFAULT 2.5, interval REAL NOT NULL DEFAULT 0, reps INTEGER NOT NULL DEFAULT 0, lapses INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, last_review INTEGER);
   CREATE INDEX idx_cards_due ON cards(due);
   CREATE TABLE reviews(id INTEGER PRIMARY KEY AUTOINCREMENT, card_id INTEGER NOT NULL, ts INTEGER NOT NULL, grade INTEGER NOT NULL);`,
  `ALTER TABLE sessions ADD COLUMN breaks INTEGER NOT NULL DEFAULT 0;
   ALTER TABLE tasks ADD COLUMN weekly_goal_min INTEGER NOT NULL DEFAULT 0;
   ALTER TABLE cards ADD COLUMN stability REAL;
   ALTER TABLE cards ADD COLUMN difficulty REAL;
   ALTER TABLE cards ADD COLUMN front_img TEXT;
   ALTER TABLE cards ADD COLUMN back_img TEXT;`,
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
export async function addTask(name: string, category: string, color: string, parentId: number | null = null) {
  const r = await (await db()).runAsync('INSERT INTO tasks(name,category,color,created_at,parent_id) VALUES(?,?,?,?,?)', name, category, color, Date.now(), parentId);
  return r.lastInsertRowId;
}
export const archiveTask = async (id: number) => void (await (await db()).runAsync('UPDATE tasks SET archived=1 WHERE id=? OR parent_id=?', id, id));
export const setWeeklyGoal = async (id: number, min: number) => void (await (await db()).runAsync('UPDATE tasks SET weekly_goal_min=? WHERE id=?', min, id));
export const setTopicDone = async (id: number, done: boolean) => void (await (await db()).runAsync('UPDATE tasks SET done=? WHERE id=?', done ? 1 : 0, id));

// exams
export const listExams = async () => (await db()).getAllAsync<Exam>('SELECT * FROM exams ORDER BY date');
export const addExam = async (name: string, date: string, taskId: number) => void (await (await db()).runAsync('INSERT INTO exams(name,date,task_id) VALUES(?,?,?)', name, date, taskId));
export const deleteExam = async (id: number) => void (await (await db()).runAsync('DELETE FROM exams WHERE id=?', id));

// sessions
export async function openSession(taskId: number, mode: string, ts: number) {
  const r = await (await db()).runAsync('INSERT INTO sessions(task_id,start_ts,heartbeat_ts,mode) VALUES(?,?,?,?)', taskId, ts, ts, mode);
  return r.lastInsertRowId;
}
export const heartbeat = async (id: number, ts: number) => void (await (await db()).runAsync('UPDATE sessions SET heartbeat_ts=? WHERE id=?', ts, id));
export const closeSession = async (id: number, ts: number) => void (await (await db()).runAsync('UPDATE sessions SET end_ts=?, heartbeat_ts=? WHERE id=?', ts, ts, id));
export const rateSession = async (id: number, quality: number | null, note: string) => void (await (await db()).runAsync('UPDATE sessions SET quality=?, note=? WHERE id=?', quality, note, id));
export const markBreak = async (id: number) => void (await (await db()).runAsync('UPDATE sessions SET breaks=1 WHERE id=?', id));
export const updateSession = async (id: number, taskId: number, start: number, end: number, quality: number | null, note: string) =>
  void (await (await db()).runAsync('UPDATE sessions SET task_id=?, start_ts=?, end_ts=?, heartbeat_ts=?, quality=?, note=? WHERE id=?', taskId, start, end, end, quality, note, id));
export const insertSession = async (taskId: number, start: number, end: number, quality: number | null, note: string) =>
  void (await (await db()).runAsync("INSERT INTO sessions(task_id,start_ts,end_ts,heartbeat_ts,mode,quality,note) VALUES(?,?,?,?,'manual',?,?)", taskId, start, end, end, quality, note));
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
export const clearPlans = async (date: string) => void (await (await db()).runAsync('DELETE FROM plans WHERE date=?', date));
export async function setPlan(taskId: number, date: string, slot: number, on: boolean) {
  const d = await db();
  if (on) await d.runAsync('INSERT OR REPLACE INTO plans(task_id,date,slot) VALUES(?,?,?)', taskId, date, slot);
  else await d.runAsync('DELETE FROM plans WHERE date=? AND slot=?', date, slot);
}

// cards
export const listCards = async () => (await db()).getAllAsync<Card>('SELECT * FROM cards ORDER BY id');
export async function addCards(rows: { task_id: number; front: string; back: string; front_img?: string | null; back_img?: string | null }[]) {
  const d = await db(), now = Date.now();
  await d.withTransactionAsync(async () => {
    for (const r of rows) await d.runAsync('INSERT INTO cards(task_id,front,back,due,created_at,front_img,back_img) VALUES(?,?,?,?,?,?,?)', r.task_id, r.front, r.back, now, now, r.front_img ?? null, r.back_img ?? null);
  });
}
export const updateCard = async (id: number, taskId: number, front: string, back: string, frontImg: string | null, backImg: string | null) =>
  void (await (await db()).runAsync('UPDATE cards SET task_id=?, front=?, back=?, front_img=?, back_img=? WHERE id=?', taskId, front, back, frontImg, backImg, id));
export const deleteCard = async (id: number) => void (await (await db()).runAsync('DELETE FROM cards WHERE id=?', id));
export async function saveReview(id: number, s: { due: number; ease: number; interval: number; reps: number; lapses: number; stability: number | null; difficulty: number | null }, grade: number, ts: number) {
  const d = await db();
  await d.runAsync('UPDATE cards SET due=?, ease=?, interval=?, reps=?, lapses=?, stability=?, difficulty=?, last_review=? WHERE id=?', s.due, s.ease, s.interval, s.reps, s.lapses, s.stability, s.difficulty, ts, id);
  await d.runAsync('INSERT INTO reviews(card_id,ts,grade) VALUES(?,?,?)', id, ts, grade);
}
export async function newIntroducedSince(ts: number) {
  const r = await (await db()).getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM (SELECT card_id, MIN(ts) AS m FROM reviews GROUP BY card_id) WHERE m>=?', ts);
  return r?.n ?? 0;
}
export async function reviewedSince(ts: number) {
  const r = await (await db()).getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM reviews WHERE ts>=?', ts);
  return r?.n ?? 0;
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
const TABLES = ['tasks', 'sessions', 'plans', 'diary', 'settings', 'exams', 'cards', 'reviews'] as const;
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
