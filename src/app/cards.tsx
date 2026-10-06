import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CardEditor, dropImage } from '../components/CardEditor';
import { rootOf } from '../components/TaskPicker';
import { BarChart } from '../components/charts';
import { Btn, Card, EmptyState, Txt, tap } from '../components/ui';
import { addCards, deleteCard, newIntroducedSince, reviewedSince, type Card as CardRow } from '../db';
import { useData } from '../data';
import { buildQueue, fmtInterval, isDue } from '../engine/srs';
import { useSettings } from '../store';
import { radius, space, useTheme } from '../theme';
import { addDays, startOfDay } from '../util';

export default function Cards() {
  const t = useTheme(), { top } = useSafeAreaInsets();
  const { cards, tasks, reload } = useData();
  const cfg = useSettings();
  const [sel, setSel] = useState(0), [edit, setEdit] = useState<CardRow | null>(null);
  const [today, setToday] = useState({ reviews: 0, fresh: 0 });
  const now = Date.now();
  useEffect(() => {
    const s = startOfDay(Date.now());
    Promise.all([reviewedSince(s), newIntroducedSince(s)]).then(([reviews, fresh]) => setToday({ reviews, fresh }));
  }, [cards]);

  const queue = buildQueue(cards, now, cfg, { reviewsToday: today.reviews, newToday: today.fresh });
  const due = cards.filter((c) => isDue(c, now));
  const decks = useMemo(() => {
    const m = new Map<number, { total: number; due: number }>();
    for (const c of cards) {
      const r = rootOf(tasks, c.task_id), x = m.get(r) ?? { total: 0, due: 0 };
      m.set(r, { total: x.total + 1, due: x.due + (isDue(c, now) ? 1 : 0) });
    }
    return [...m];
  }, [cards, tasks]);
  const forecast = useMemo(() => {
    const d0 = startOfDay(now), n = 14, out = Array.from({ length: n }, (_, i) => ({ label: String(new Date(addDays(d0, i)).getDate()), ms: 0, hot: i === 0 }));
    for (const c of cards) {
      if (!c.last_review && c.reps === 0) continue; // brand new cards aren't scheduled yet
      const k = Math.max(0, Math.floor((startOfDay(c.due) - d0) / 86400000));
      if (k < n) out[k].ms++;
    }
    return out;
  }, [cards]);
  const nameOf = (id: number) => (id === 0 ? 'No subject' : tasks.find((k) => k.id === id)?.name ?? 'Deleted');

  const importFile = async () => {
    try {
      const r = await DocumentPicker.getDocumentAsync({ type: ['text/*', 'application/octet-stream'], copyToCacheDirectory: true });
      if (r.canceled) return;
      const rows = (await new File(r.assets[0].uri).text()).split(/\r?\n/).map((l) => {
        const i = l.includes('\t') ? l.indexOf('\t') : l.indexOf(',');
        return i < 0 ? null : { task_id: sel, front: l.slice(0, i).trim(), back: l.slice(i + 1).trim() };
      }).filter((x): x is { task_id: number; front: string; back: string } => !!x && !!x.front && !!x.back);
      if (!rows.length) return Alert.alert('Nothing imported', 'Use one card per line: front, then a tab or comma, then back.');
      await addCards(rows); await reload();
      Alert.alert('Imported', `${rows.length} cards added to ${nameOf(sel)}.`);
    } catch (e) { Alert.alert('Import failed', String(e)); }
  };
  const del = (c: CardRow) => Alert.alert('Delete card?', undefined, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { dropImage(c.front_img); dropImage(c.back_img); await deleteCard(c.id); await reload(); } }]);
  const go = (task?: number) => router.push(task === undefined ? '/review' : { pathname: '/review', params: { task: String(task) } });

  return (
    <ScrollView style={{ backgroundColor: t.bg }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: top + space(2), paddingBottom: space(8), gap: space(4) }}>
      <View style={{ paddingHorizontal: space(4), gap: space(1) }}>
        <Pressable accessibilityLabel="Back" onPress={() => router.back()} style={{ minHeight: 48, justifyContent: 'center' }}><Txt v="h3" c={t.accentText}>‹ Back</Txt></Pressable>
        <Txt v="h1">Flashcards</Txt>
      </View>

      <Card style={{ marginHorizontal: space(4), gap: space(3) }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {[['Ready', queue.length], ['Total', cards.length], ['Reviewed today', today.reviews]].map(([k, v]) => (
            <View key={k as string}><Txt v="label">{k}</Txt><Txt v="h1">{v}</Txt></View>
          ))}
        </View>
        <Btn label={queue.length ? `Review ${queue.length}` : 'Nothing to review'} disabled={!queue.length} onPress={() => go()} />
        <Txt v="small">New today {today.fresh}/{cfg.newPerDay} · reviews {today.reviews}/{cfg.reviewsPerDay}{due.length > queue.length ? ` · ${due.length - queue.length} more waiting (daily limit)` : ''}. Change limits in Settings.</Txt>
      </Card>

      <Card style={{ marginHorizontal: space(4) }}>
        <Txt v="label" style={{ marginBottom: space(3) }}>Next 14 days · cards due</Txt>
        <BarChart data={forecast} height={110} unit="cards" />
      </Card>

      {decks.length > 0 && (
        <View style={{ marginHorizontal: space(4), gap: space(2) }}>
          <Txt v="label">Decks</Txt>
          {decks.map(([id, x]) => (
            <Pressable key={id} disabled={!x.due} onPress={() => go(id)} style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: t.surface, borderRadius: radius.md, paddingHorizontal: space(4), borderWidth: 1, borderColor: t.border }}>
              <Txt v="h3">{nameOf(id)}</Txt><Txt v="small" c={x.due ? t.accentText : t.muted}>{x.due} due · {x.total} cards</Txt>
            </Pressable>
          ))}
        </View>
      )}

      <Card style={{ marginHorizontal: space(4), gap: space(3), paddingHorizontal: 0 }}>
        <Txt v="label" style={{ paddingHorizontal: space(4) }}>{edit ? 'Edit card' : 'New card'}</Txt>
        <CardEditor tasks={tasks} edit={edit} sel={sel} setSel={setSel} onDone={() => setEdit(null)} />
        <View style={{ paddingHorizontal: space(4), gap: space(2) }}>
          <Btn kind="ghost" label="Import text file" onPress={importFile} />
          <Txt v="small">Import: one card per line, front then tab or comma then back. Anki "Notes as plain text" works. Cards go to the selected subject.</Txt>
        </View>
      </Card>

      <View style={{ marginHorizontal: space(4), gap: space(2) }}>
        <Txt v="label">All cards · tap to edit, long-press to delete</Txt>
        {cards.length === 0 && <Card><EmptyState title="No cards yet" hint="Add a question and answer above. They return on a schedule that fits how well you remember." /></Card>}
        {[...cards].reverse().slice(0, 100).map((c) => (
          <Pressable key={c.id} onPress={() => { tap(); setEdit(c); setSel(c.task_id); }} onLongPress={() => del(c)}
            style={{ backgroundColor: t.surface, borderRadius: radius.md, padding: space(3), gap: 2, borderWidth: 1, borderColor: edit?.id === c.id ? t.accentA : t.border }}>
            <Txt v="h3" numberOfLines={2}>{c.front || '(image)'}</Txt>
            <Txt v="small" numberOfLines={2}>{c.back || '(image)'}</Txt>
            <Txt v="small">{nameOf(rootOf(tasks, c.task_id))} · {isDue(c, now) ? 'due now' : c.interval ? `every ${fmtInterval(c.interval)}` : 'new'}{c.front_img || c.back_img ? ' · image' : ''}</Txt>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
