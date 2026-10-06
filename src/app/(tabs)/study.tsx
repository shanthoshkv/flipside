import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Card, EmptyState, Txt, tap } from '../../components/ui';
import { addExam, addTask, archiveTask, deleteExam, setTopicDone } from '../../db';
import { useData } from '../../data';
import { totalMs } from '../../stats';
import { categoryColors, font, radius, space, useTheme } from '../../theme';
import { DatePicker } from '../../components/DatePicker';
import { ago, daysUntil, fmtDate, fmtDur } from '../../util';

export default function Study() {
  const t = useTheme(), { top } = useSafeAreaInsets();
  const { tasks, sessions, exams, cards, reload } = useData();
  const dueCards = cards.filter((c) => c.due <= Date.now()).length;
  const subjects = tasks.filter((k) => !k.parent_id);
  const [open, setOpen] = useState<number | null>(null);
  const [newSub, setNewSub] = useState(''), [newTopic, setNewTopic] = useState('');
  const [exam, setExam] = useState(false), [en, setEn] = useState(''), [ed, setEd] = useState(''), [es, setEs] = useState<number | null>(null);

  const info = useMemo(() => {
    const m = new Map<number, { ms: number; last: number }>();
    for (const s of sessions) {
      const e = s.end_ts ?? s.heartbeat_ts ?? s.start_ts, c = m.get(s.task_id) ?? { ms: 0, last: 0 };
      m.set(s.task_id, { ms: c.ms + (e - s.start_ts), last: Math.max(c.last, e) });
    }
    return m;
  }, [sessions]);
  const subj = (id: number) => {
    const ids = [id, ...tasks.filter((k) => k.parent_id === id).map((k) => k.id)];
    return ids.reduce((a, i) => ({ ms: a.ms + (info.get(i)?.ms ?? 0), last: Math.max(a.last, info.get(i)?.last ?? 0) }), { ms: 0, last: 0 });
  };
  const cover = (id: number) => { const tp = tasks.filter((k) => k.parent_id === id); return { total: tp.length, done: tp.filter((k) => k.done).length }; };
  const done = async (fn: () => Promise<unknown>) => { await fn(); await reload(); };
  const confirmDel = (name: string, fn: () => Promise<unknown>) =>
    Alert.alert(`Delete "${name}"?`, 'Past focus time stays in your stats.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => done(fn) }]);

  const dateOk = ed !== '';
  const saveExam = async () => {
    if (!en.trim() || !dateOk || es == null) return;
    await done(() => addExam(en.trim(), ed, es));
    setEn(''); setEd(''); setExam(false);
  };
  const pad = { marginHorizontal: space(4) };
  const input = { minHeight: 48, borderRadius: radius.sm, backgroundColor: t.surface2, color: t.text, paddingHorizontal: space(4), fontFamily: font.body, fontSize: 15 };

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ paddingTop: top + space(2), paddingBottom: space(6), gap: space(4) }} keyboardShouldPersistTaps="handled">
      <Txt v="h1" style={{ paddingHorizontal: space(4) }}>Study</Txt>

      <Card style={[pad, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space(3) }]}>
        <View style={{ flex: 1 }}>
          <Txt v="label">Flashcards</Txt>
          <Txt v="h3">{dueCards ? `${dueCards} due now` : 'Nothing due'} · {cards.length} total</Txt>
        </View>
        <Btn label={dueCards ? 'Review' : 'Open'} onPress={() => router.push(dueCards ? '/review' : '/cards')} />
      </Card>
      {dueCards > 0 && <Pressable onPress={() => router.push('/cards')} style={{ marginHorizontal: space(4), marginTop: -space(2) }}><Txt v="small" c={t.accentA}>Manage cards and decks</Txt></Pressable>}

      <View style={[pad, { gap: space(3) }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Txt v="label">Exams</Txt>
          <Btn kind="ghost" label="+ Exam" disabled={subjects.length === 0} onPress={() => { setEs(subjects[0]?.id ?? null); setExam(true); }} style={{ minWidth: 96 }} />
        </View>
        {exams.length === 0 && <Card><Txt v="small">{subjects.length ? 'Add an exam to see a countdown and coverage.' : 'Add a subject first, then an exam.'}</Txt></Card>}
        {exams.map((e, i) => {
          const days = daysUntil(e.date), c = cover(e.task_id), left = c.total - c.done;
          const sub = subjects.find((k) => k.id === e.task_id);
          return (
            <Pressable key={e.id} onLongPress={() => confirmDel(e.name, () => deleteExam(e.id))}>
              <Card i={i} style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <Txt v="h3">{e.name}</Txt>
                  <Txt v="h2" c={days < 0 ? t.muted : days <= 7 ? t.accentB : t.accentA}>{days < 0 ? 'passed' : days === 0 ? 'today' : `${days}d`}</Txt>
                </View>
                <Txt v="small">{sub?.name ?? 'Subject deleted'} · {fmtDate(e.date)}</Txt>
                {c.total > 0 ? (
                  <>
                    <View style={{ height: 8, borderRadius: 4, backgroundColor: t.surface2 }}>
                      <View style={{ width: `${(c.done / c.total) * 100}%`, height: 8, borderRadius: 4, backgroundColor: t.success }} />
                    </View>
                    <Txt v="small">{c.done}/{c.total} topics covered{days > 0 && left > 0 ? ` · ~${(left / days).toFixed(1)} topics/day to finish` : ''}</Txt>
                  </>
                ) : <Txt v="small">No topics yet. Add topics below to track coverage.</Txt>}
              </Card>
            </Pressable>
          );
        })}
      </View>

      <View style={[pad, { gap: space(3) }]}>
        <Txt v="label">Subjects & topics</Txt>
        {subjects.length === 0 && <Card><EmptyState title="No subjects" hint="Add Physics, Maths, History... then break each into topics." /></Card>}
        {subjects.map((s, i) => {
          const a = subj(s.id), c = cover(s.id), topics = tasks.filter((k) => k.parent_id === s.id), isOpen = open === s.id;
          return (
            <Card key={s.id} i={i} style={{ gap: space(2) }}>
              <Pressable onPress={() => { tap(); setOpen(isOpen ? null : s.id); setNewTopic(''); }} onLongPress={() => confirmDel(s.name, () => archiveTask(s.id))}
                style={{ flexDirection: 'row', alignItems: 'center', gap: space(3), minHeight: 48 }}>
                <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: s.color }} />
                <View style={{ flex: 1 }}>
                  <Txt v="h3">{s.name}</Txt>
                  <Txt v="small">{fmtDur(a.ms)} · {a.last ? `last ${ago(a.last)}` : 'never studied'}{c.total ? ` · ${c.done}/${c.total} covered` : ''}</Txt>
                </View>
                <Txt v="h3" c={t.muted}>{isOpen ? '−' : '+'}</Txt>
              </Pressable>
              {isOpen && (
                <View style={{ gap: 4 }}>
                  {topics.map((k) => {
                    const x = info.get(k.id);
                    return (
                      <Pressable key={k.id} onPress={() => { tap(); done(() => setTopicDone(k.id, !k.done)); }} onLongPress={() => confirmDel(k.name, () => archiveTask(k.id))}
                        accessibilityRole="checkbox" accessibilityState={{ checked: !!k.done }} accessibilityLabel={k.name}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: space(3), minHeight: 48 }}>
                        <View style={{ width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: k.done ? t.success : t.dotOff, backgroundColor: k.done ? t.success : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                          {!!k.done && <Txt v="small" c="#06210F" style={{ fontFamily: font.bodyBold }}>✓</Txt>}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Txt style={{ textDecorationLine: k.done ? 'line-through' : 'none', opacity: k.done ? 0.6 : 1 }}>{k.name}</Txt>
                          <Txt v="small">{x ? `${fmtDur(x.ms)} · last ${ago(x.last)}` : 'not studied yet'}</Txt>
                        </View>
                      </Pressable>
                    );
                  })}
                  <View style={{ flexDirection: 'row', gap: space(2), marginTop: space(1) }}>
                    <TextInput value={newTopic} onChangeText={setNewTopic} placeholder="New topic" placeholderTextColor={t.muted} style={[input, { flex: 1 }]}
                      onSubmitEditing={() => newTopic.trim() && done(() => addTask(newTopic.trim(), '', s.color, s.id)).then(() => setNewTopic(''))} />
                    <Btn label="Add" disabled={!newTopic.trim()} onPress={() => done(() => addTask(newTopic.trim(), '', s.color, s.id)).then(() => setNewTopic(''))} />
                  </View>
                  <Txt v="small">Tap to mark covered. Long-press to delete.</Txt>
                </View>
              )}
            </Card>
          );
        })}
        <View style={{ flexDirection: 'row', gap: space(2) }}>
          <TextInput value={newSub} onChangeText={setNewSub} placeholder="New subject" placeholderTextColor={t.muted} style={[input, { flex: 1 }]} />
          <Btn label="Add" disabled={!newSub.trim()} onPress={() => done(() => addTask(newSub.trim(), '', categoryColors[subjects.length % categoryColors.length])).then(() => setNewSub(''))} />
        </View>
      </View>

      <Modal transparent animationType="fade" visible={exam} onRequestClose={() => setExam(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: space(5) }} onPress={() => setExam(false)}>
          <Pressable style={{ backgroundColor: t.surface, borderRadius: radius.lg, padding: space(5), gap: space(3) }}>
            <Txt v="h2">New exam</Txt>
            <TextInput value={en} onChangeText={setEn} placeholder="Name (e.g. Physics midterm)" placeholderTextColor={t.muted} style={input} />
            <Txt v="small">Exam date{ed ? `: ${fmtDate(ed)}` : ''}</Txt>
            <DatePicker value={ed} onChange={setEd} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space(2) }}>
              {subjects.map((k) => (
                <Pressable key={k.id} onPress={() => { tap(); setEs(k.id); }}
                  style={{ minHeight: 44, paddingHorizontal: space(4), borderRadius: radius.pill, justifyContent: 'center', backgroundColor: es === k.id ? k.color : t.surface2 }}>
                  <Txt v="h3" c={es === k.id ? '#1A1206' : t.text}>{k.name}</Txt>
                </Pressable>
              ))}
            </ScrollView>
            <Btn label="Add exam" onPress={saveExam} disabled={!en.trim() || !dateOk || es == null} />
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}
