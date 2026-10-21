import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Card, EmptyState, Txt, tap } from '../../components/ui';
import { addExam, addTask, archiveTask, deleteExam, restoreRow, setTopicDone, setWeeklyGoal, unarchiveTask } from '../../db';
import { useUndo } from '../../undo';
import { Stepper } from '../../components/controls';
import { useData } from '../../data';
import { totalMs } from '../../stats';
import { categoryColors, font, radius, space, useTheme } from '../../theme';
import { DatePicker } from '../../components/DatePicker';
import { agoLabel, tr } from '../../i18n';
import { daysUntil, fmtDate, fmtDur } from '../../util';
import { withBoundary } from '../../components/ErrorBoundary';

function Study() {
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
  const confirmDel = (name: string, fn: () => Promise<unknown>, undo: () => Promise<unknown>) =>
    done(fn).then(() => useUndo.getState().show(tr('Deleted "{name}"', { name }), undo));

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
          <Txt v="h3">{`${dueCards ? tr('{n} due now', { n: dueCards }) : tr('Nothing due')} · ${tr('{n} total', { n: cards.length })}`}</Txt>
        </View>
        <Btn label={dueCards ? 'Review' : 'Open'} onPress={() => router.push(dueCards ? '/review' : '/cards')} />
      </Card>
      {dueCards > 0 && <Pressable onPress={() => router.push('/cards')} style={{ marginHorizontal: space(4), marginTop: -space(2) }}><Txt v="small" c={t.accentText}>Manage cards and decks</Txt></Pressable>}

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
            <Pressable key={e.id} onLongPress={() => confirmDel(e.name, () => deleteExam(e.id), () => restoreRow('exams', e))}>
              <Card i={i} style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <Txt v="h3" raw style={{ flex: 1, marginRight: space(2) }}>{e.name}</Txt>
                  <Txt v="h2" c={days < 0 ? t.muted : days <= 7 ? t.danger : t.accentText}>{days < 0 ? tr('passed') : days === 0 ? tr('today') : tr('{n}d', { n: days })}</Txt>
                </View>
                <Txt v="small" raw>{`${sub?.name ?? tr('Subject deleted')} · ${fmtDate(e.date)}`}</Txt>
                {c.total > 0 ? (
                  <>
                    <View style={{ height: 8, borderRadius: 4, backgroundColor: t.surface2 }}>
                      <View style={{ width: `${(c.done / c.total) * 100}%`, height: 8, borderRadius: 4, backgroundColor: t.success }} />
                    </View>
                    <Txt v="small" raw>{`${tr('{done}/{total} topics covered', { done: c.done, total: c.total })}${days > 0 && left > 0 ? ` · ${tr('~{n} topics/day to finish', { n: (left / days).toFixed(1) })}` : ''}`}</Txt>
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
              <Pressable onPress={() => { tap(); setOpen(isOpen ? null : s.id); setNewTopic(''); }} onLongPress={() => confirmDel(s.name, () => archiveTask(s.id), () => unarchiveTask(s.id))}
                style={{ flexDirection: 'row', alignItems: 'center', gap: space(3), minHeight: 48 }}>
                <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: s.color }} />
                <View style={{ flex: 1 }}>
                  <Txt v="h3" raw>{s.name}</Txt>
                  <Txt v="small" raw>{`${fmtDur(a.ms)} · ${a.last ? tr('last {when}', { when: agoLabel(a.last) }) : tr('never studied')}${c.total ? ` · ${tr('{done}/{total} covered', { done: c.done, total: c.total })}` : ''}`}</Txt>
                </View>
                <Txt v="h3" c={t.muted}>{isOpen ? '−' : '+'}</Txt>
              </Pressable>
              {isOpen && (
                <View style={{ gap: 4 }}>
                  <Stepper label="Weekly target" value={s.weekly_goal_min / 60} unit="h" min={0} max={60} step={0.5} onChange={(h) => done(() => setWeeklyGoal(s.id, Math.round(h * 60)))} />
                  {topics.map((k) => {
                    const x = info.get(k.id);
                    return (
                      <Pressable key={k.id} onPress={() => { tap(); done(() => setTopicDone(k.id, !k.done)); }} onLongPress={() => confirmDel(k.name, () => archiveTask(k.id), () => unarchiveTask(k.id))}
                        accessibilityRole="checkbox" accessibilityState={{ checked: !!k.done }} accessibilityLabel={k.name}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: space(3), minHeight: 48 }}>
                        <View style={{ width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: k.done ? t.success : t.dotOff, backgroundColor: k.done ? t.success : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                          {!!k.done && <Txt v="small" c="#06210F" style={{ fontFamily: font.bodyBold }}>✓</Txt>}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Txt style={{ textDecorationLine: k.done ? 'line-through' : 'none', opacity: k.done ? 0.6 : 1 }} raw>{k.name}</Txt>
                          <Txt v="small" raw>{x ? `${fmtDur(x.ms)} · ${tr('last {when}', { when: agoLabel(x.last) })}` : tr('not studied yet')}</Txt>
                        </View>
                      </Pressable>
                    );
                  })}
                  <View style={{ flexDirection: 'row', gap: space(2), marginTop: space(1) }}>
                    <TextInput value={newTopic} onChangeText={setNewTopic} placeholder={tr('New topic')} placeholderTextColor={t.muted} style={[input, { flex: 1 }]}
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
          <TextInput value={newSub} onChangeText={setNewSub} placeholder={tr('New subject')} placeholderTextColor={t.muted} style={[input, { flex: 1 }]} />
          <Btn label="Add" disabled={!newSub.trim()} onPress={() => done(() => addTask(newSub.trim(), '', categoryColors[subjects.length % categoryColors.length])).then(() => setNewSub(''))} />
        </View>
      </View>

      <Modal transparent animationType="fade" visible={exam} onRequestClose={() => setExam(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: space(5) }} onPress={() => setExam(false)}>
          <Pressable style={{ backgroundColor: t.surface, borderRadius: radius.lg, padding: space(5), gap: space(3) }}>
            <Txt v="h2">New exam</Txt>
            <TextInput value={en} onChangeText={setEn} placeholder={tr('Name (e.g. Physics midterm)')} placeholderTextColor={t.muted} style={input} />
            <Txt v="small" raw>{`${tr('Exam date')}${ed ? `: ${fmtDate(ed)}` : ''}`}</Txt>
            <DatePicker value={ed} onChange={setEd} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space(2) }}>
              {subjects.map((k) => (
                <Pressable key={k.id} onPress={() => { tap(); setEs(k.id); }}
                  style={{ minHeight: 44, paddingHorizontal: space(4), borderRadius: radius.pill, justifyContent: 'center', backgroundColor: es === k.id ? k.color : t.surface2 }}>
                  <Txt v="h3" raw c={es === k.id ? '#1A1206' : t.text}>{k.name}</Txt>
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

export default withBoundary(Study, 'Study');
