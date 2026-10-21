import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { addCards, addSessions, ensureTask, exportAll, importAll, listCards, mergeAll, resetAll, sessionsBetween } from '../db';
import { useData } from '../data';
import { cardsTsv, parseCardsText, parseSessionsCsv, reportMd, sessionsCsv, sessionsIcs } from '../exportfmt';
import { tr } from '../i18n';
import { useSettings } from '../store';
import { categoryColors, space } from '../theme';
import { dayKey } from '../util';
import { refreshWidgets } from '../widgets/refresh';
import { Btn, Card, Txt } from './ui';

async function share(ext: string, mime: string, body: string) {
  try {
    const f = new File(Paths.cache, `flipside-${dayKey(Date.now())}.${ext}`);
    if (f.exists) f.delete();
    f.create(); f.write(body);
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(f.uri, { mimeType: mime });
    else Alert.alert(tr('Export saved'), f.uri);
  } catch (e) { Alert.alert(tr('Export failed'), String(e)); }
}

async function pick(types: string[]) {
  const r = await DocumentPicker.getDocumentAsync({ type: types, copyToCacheDirectory: true });
  return r.canceled ? null : new File(r.assets[0].uri).text();
}

const after = async () => { await useSettings.getState().load(); await useData.getState().reload(); refreshWidgets(); };
const run = (fn: () => Promise<string | null>) => async () => {
  try { const msg = await fn(); if (msg) Alert.alert(tr('Imported'), msg); } catch (e) { Alert.alert(tr('Import failed'), String(e)); }
};

/** Settings → Data: every export format and import path. */
export function DataCard({ i }: { i: number }) {
  const all = async () => ({ ss: (await sessionsBetween(0, Date.now() + 86400000)).filter((s) => s.end_ts), tasks: useData.getState().tasks });
  const color = () => categoryColors[useData.getState().tasks.length % categoryColors.length];

  const imports = {
    replace: run(async () => { const txt = await pick(['application/json', 'text/plain']); if (txt == null) return null; await importAll(txt); await after(); return tr('Your data was restored.'); }),
    merge: run(async () => {
      const txt = await pick(['application/json', 'text/plain']); if (txt == null) return null;
      const n = await mergeAll(txt); await after();
      return tr('Added {a} tasks, {b} sessions, {c} cards.', { a: n.tasks, b: n.sessions, c: n.cards });
    }),
    sessions: run(async () => {
      const txt = await pick(['text/csv', 'text/comma-separated-values', 'text/plain', '*/*']); if (txt == null) return null;
      const rows = parseSessionsCsv(txt), out = [];
      for (const r of rows) {
        const subj = r.subject ? await ensureTask(r.subject, null, color()) : 0;
        out.push({ task_id: r.topic && subj ? await ensureTask(r.topic, subj, color()) : subj, start: r.start, end: r.end, quality: r.quality, note: r.note });
      }
      const n = await addSessions(out); await after();
      return tr('Added {n} sessions.', { n });
    }),
    cards: run(async () => {
      const txt = await pick(['text/plain', 'text/csv', 'text/tab-separated-values', '*/*']); if (txt == null) return null;
      const rows = parseCardsText(txt);
      const have = new Set((await listCards()).map((c) => `${c.front}\u0000${c.back}`));
      const out = [];
      for (const r of rows) if (!have.has(`${r.front}\u0000${r.back}`)) out.push({ task_id: r.tag ? await ensureTask(r.tag, null, color()) : 0, front: r.front, back: r.back });
      await addCards(out); await after();
      return tr('Added {n} cards.', { n: out.length });
    }),
  };

  const doReset = () => Alert.alert(tr('Reset all data?'), tr('Tasks, sessions, plans and diary will be deleted. This cannot be undone.'), [
    { text: tr('Cancel'), style: 'cancel' },
    { text: tr('Delete everything'), style: 'destructive', onPress: async () => { await resetAll(); await useData.getState().reload(); refreshWidgets(); } },
  ]);

  return (
    <Card i={i} style={{ marginHorizontal: space(4), gap: space(3) }}>
      <Txt v="label">Export</Txt>
      <Btn kind="ghost" label="Full backup (JSON)" onPress={async () => share('json', 'application/json', await exportAll())} />
      <Btn kind="ghost" label="Sessions spreadsheet (CSV)" onPress={async () => { const a = await all(); share('csv', 'text/csv', sessionsCsv(a.ss, a.tasks)); }} />
      <Btn kind="ghost" label="Sessions to calendar (ICS)" onPress={async () => { const a = await all(); share('ics', 'text/calendar', sessionsIcs(a.ss, a.tasks)); }} />
      <Btn kind="ghost" label="Summary report (Markdown)" onPress={async () => { const a = await all(); share('md', 'text/markdown', reportMd(a.ss, a.tasks)); }} />
      <Btn kind="ghost" label="Flashcards for Anki (TXT)" onPress={async () => share('txt', 'text/plain', cardsTsv(await listCards(), useData.getState().tasks))} />
      <Txt v="label">Import</Txt>
      <Btn kind="ghost" label="Merge a Flipside backup" onPress={imports.merge} />
      <Btn kind="ghost" label="Sessions from CSV (Toggl, Forest)" onPress={imports.sessions} />
      <Btn kind="ghost" label="Flashcards from Anki or CSV" onPress={imports.cards} />
      <Txt v="small">Merging keeps your data and skips duplicates. Replace wipes the app first.</Txt>
      <Btn kind="ghost" label="Replace with a Flipside backup" onPress={imports.replace} />
      <Btn kind="danger" label="Reset all data" onPress={doReset} />
    </Card>
  );
}
