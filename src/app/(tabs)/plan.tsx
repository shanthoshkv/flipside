import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TaskPicker } from '../../components/TaskPicker';
import { Stepper } from '../../components/controls';
import { Btn, Card, Txt, tap, useWidth } from '../../components/ui';
import { planDay, type PTopic } from '../../engine/planner';
import { scheduleSync } from '../../reminders';
import { busyBetween, clearPlans, getDiary, plansForDate, saveDiary, setPlan } from '../../db';
import { busySlots } from '../../ics';
import { PlanTools } from '../../components/PlanTools';
import { useData } from '../../data';
import { actualSlots } from '../../stats';
import { useSettings } from '../../store';
import { font, radius, space, useTheme } from '../../theme';
import { tr, weekdayShort } from '../../i18n';
import { addDays, dayKey, daysUntil, keyToTs, pad2, startOfDay } from '../../util';
import { withBoundary } from '../../components/ErrorBoundary';

const ROW = 40;

function Plan() {
  const t = useTheme(), { top } = useSafeAreaInsets();
  const { tasks, sessions, exams } = useData();
  const cfg = useSettings();
  const [auto, setAuto] = useState(false);
  const lastTaskId = useSettings((s) => s.lastTaskId);
  const taskId = lastTaskId === 0 ? 0 : tasks.find((k) => k.id === lastTaskId)?.id ?? tasks.find((k) => !k.parent_id)?.id ?? 0;
  const today = startOfDay(Date.now());
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(today, i - 7)), [today]);
  const [date, setDate] = useState(dayKey(today));
  const [plan, setPlanState] = useState<Map<number, number>>(new Map());
  const [diary, setDiary] = useState(['', '', '']);
  const [busy, setBusy] = useState<Set<number>>(new Set()), [rev, setRev] = useState(0);
  const busyFor = async (k: string) => busySlots(await busyBetween(keyToTs(k), keyToTs(k) + 86400000), keyToTs(k));
  const [w, onLayout] = useWidth(300);
  const stripRef = useRef<ScrollView>(null);

  useEffect(() => { plansForDate(date).then((ps) => setPlanState(new Map(ps.map((p) => [p.slot, p.task_id])))); }, [date]);
  useEffect(() => { busyFor(date).then(setBusy); }, [date, rev]);
  useEffect(() => { getDiary(date).then((d) => setDiary([d.l1, d.l2, d.l3])); }, [date]);
  useEffect(() => { setTimeout(() => stripRef.current?.scrollTo({ x: 5 * 64, animated: false }), 0); }, []);

  const actual = useMemo(() => actualSlots(sessions, keyToTs(date)), [sessions, date]);
  const color = (id?: number) => tasks.find((k) => k.id === id)?.color ?? t.accentA;

  // paint mode is decided by the first slot touched: planned → erase, empty → paint
  const mode = useRef<'on' | 'off'>('on');
  const last = useRef(-1);
  const slotAt = (x: number, y: number) => {
    const col = Math.floor(((x - 44) / (w - 44)) * 6), row = Math.floor(y / ROW);
    return row < 0 || row > 23 || col < 0 || col > 5 ? -1 : row * 6 + col;
  };
  const paint = useCallback((slot: number) => {
    if (slot < 0 || slot === last.current) return;
    last.current = slot;
    setPlanState((m) => {
      const n = new Map(m);
      if (mode.current === 'on') n.set(slot, taskId); else n.delete(slot);
      return n;
    });
    setPlan(taskId, date, slot, mode.current === 'on').then(scheduleSync);
  }, [taskId, date]);
  const begin = (x: number, y: number) => {
    const s = slotAt(x, y);
    if (s < 0) return;
    mode.current = plan.get(s) === taskId ? 'off' : 'on';
    last.current = -1; tap(); paint(s);
  };
  const gesture = Gesture.Race(
    Gesture.Pan().runOnJS(true).activateAfterLongPress(220).onStart((e) => begin(e.x, e.y)).onUpdate((e) => paint(slotAt(e.x, e.y))),
    Gesture.Tap().runOnJS(true).onEnd((e, ok) => ok && begin(e.x, e.y)),
  );

  const reloadPlan = () => plansForDate(date).then((ps) => setPlanState(new Map(ps.map((p) => [p.slot, p.task_id]))));
  const autoPlan = async (n: number) => {
    const subjects = tasks.filter((k) => !k.parent_id);
    if (!subjects.length) return Alert.alert(tr('No subjects'), tr('Add subjects and topics in the Study tab first.'));
    const last = new Map<number, number>();
    for (const s of sessions) last.set(s.task_id, Math.max(last.get(s.task_id) ?? 0, s.end_ts ?? s.heartbeat_ts ?? s.start_ts));
    const topics: PTopic[] = subjects.flatMap((s) => {
      const tp = tasks.filter((k) => k.parent_id === s.id);
      return tp.length ? tp.map((k) => ({ id: k.id, subjectId: s.id, done: !!k.done, last: last.get(k.id) ?? 0 })) : [{ id: s.id, subjectId: s.id, done: false, last: last.get(s.id) ?? 0 }];
    });
    const exs = exams.map((e) => ({ subjectId: e.task_id, days: daysUntil(e.date) }));
    const counts = new Map<number, number>();
    const first = date === dayKey(today) ? 0 : Math.round((keyToTs(date) - today) / 86400000);
    let added = 0;
    for (let i = first; i < first + n; i++) {
      if (i < 0) continue;
      const key = dayKey(addDays(today, i)), existing = await plansForDate(key);
      const nowSlot = i === 0 ? Math.floor((Date.now() - today) / 600000) + 1 : 0;
      const placed = planDay(topics, exs, counts, new Set([...existing.map((p) => p.slot), ...(await busyFor(key))]), {
        startSlot: Math.max(cfg.planStart * 6, nowSlot), endSlot: cfg.planEnd * 6, blockSlots: Math.max(1, Math.round(cfg.planBlock / 10)),
        budgetSlots: Math.max(0, Math.round(cfg.goalMin / 10) - existing.length),
      });
      for (const p of placed) await setPlan(p.taskId, key, p.slot, true);
      added += placed.length;
    }
    await reloadPlan();
    scheduleSync();
    Alert.alert(added ? tr('Planned') : tr('Nothing to add'), added ? tr('{n} minutes scheduled. Existing dots were kept.', { n: added * 10 }) : tr('No free time in your study window, or the daily goal is already planned.'));
  };
  const clearDay = () => Alert.alert(tr('Clear this day\'s plan?'), undefined, [{ text: tr('Cancel'), style: 'cancel' }, { text: tr('Clear'), style: 'destructive', onPress: async () => { await clearPlans(date); await reloadPlan(); scheduleSync(); } }]);

  const saveLine = (i: number, v: string) => {
    const n = [...diary]; n[i] = v; setDiary(n);
  };
  const commitDiary = () => saveDiary({ date, l1: diary[0], l2: diary[1], l3: diary[2] });

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ paddingTop: top + space(2), paddingBottom: space(6), gap: space(4) }} keyboardShouldPersistTaps="handled">
      <Txt v="h1" style={{ paddingHorizontal: space(4) }}>Plan</Txt>

      <ScrollView ref={stripRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space(2), paddingHorizontal: space(4) }}>
        {days.map((d) => {
          const k = dayKey(d), on = k === date, now = d === today;
          return (
            <Pressable key={k} accessibilityLabel={`${weekdayShort(new Date(d).getDay())} ${new Date(d).getDate()}`} onPress={() => { tap(); setDate(k); }}
              style={{ width: 56, minHeight: 64, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? t.accentA : t.surface, borderWidth: 1, borderColor: now && !on ? t.accentA : t.border }}>
              <Txt v="small" c={on ? '#1A1206' : t.muted} raw>{weekdayShort(new Date(d).getDay())}</Txt>
              <Txt v="h2" c={on ? '#1A1206' : t.text}>{new Date(d).getDate()}</Txt>
            </Pressable>
          );
        })}
      </ScrollView>

      <TaskPicker tasks={tasks} selected={taskId} onSelect={(id) => useSettings.getState().set('lastTaskId', id)} />

      <Card style={{ marginHorizontal: space(4), gap: space(2) }}>
        <Pressable onPress={() => { tap(); setAuto(!auto); }} style={{ minHeight: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Txt v="label">Auto-plan</Txt><Txt v="h3" c={t.accentText}>{auto ? 'Hide' : 'Set up'}</Txt>
        </Pressable>
        {auto && (
          <View style={{ gap: space(2) }}>
            <Txt v="small">Fills free slots with topics from your subjects: nearest exam first, subjects interleaved, up to your daily goal.</Txt>
            <Stepper label="Window start" value={cfg.planStart} unit=":00" min={0} max={cfg.planEnd - 1} onChange={(v) => cfg.set('planStart', v)} />
            <Stepper label="Window end" value={cfg.planEnd} unit=":00" min={cfg.planStart + 1} max={24} onChange={(v) => cfg.set('planEnd', v)} />
            <Stepper label="Block length" value={cfg.planBlock} unit="m" min={20} max={120} step={10} onChange={(v) => cfg.set('planBlock', v)} />
            <Btn label="Plan this day" onPress={() => autoPlan(1)} />
            <Btn kind="ghost" label="Plan 7 days from here" onPress={() => autoPlan(7)} />
            <PlanTools date={date} onChange={() => { setRev((r) => r + 1); reloadPlan(); }} />
            <Btn kind="danger" label="Clear this day" onPress={clearDay} />
          </View>
        )}
      </Card>

      <Card style={{ marginHorizontal: space(4) }}>
        <View style={{ flexDirection: 'row', gap: space(4), marginBottom: space(3) }}>
          <Txt v="small">▭ planned</Txt><Txt v="small">■ focused</Txt><Txt v="small">tap or hold-drag to paint</Txt>
        </View>
        <View style={{ flexDirection: 'row', marginBottom: 4 }}>
          <View style={{ width: 44 }} />
          {[0, 10, 20, 30, 40, 50].map((m) => <Txt key={m} v="small" raw style={{ flex: 1, textAlign: 'center', fontSize: 10 }}>{`:${pad2(m)}`}</Txt>)}
        </View>
        <GestureDetector gesture={gesture}>
          <View onLayout={onLayout} collapsable={false}>
            {Array.from({ length: 24 }, (_, h) => (
              <View key={h} style={{ height: ROW, flexDirection: 'row', alignItems: 'center' }} pointerEvents="none">
                <Txt v="small" raw style={{ width: 44 }}>{`${pad2(h)}:00`}</Txt>
                <View style={{ flex: 1, flexDirection: 'row' }}>
                  {Array.from({ length: 6 }, (_, c) => {
                    // each slot is a rectangle; neighbours of the same kind join into one bar
                    const kind = (i: number) => { const a = actual.get(i), q = plan.get(i); return a != null ? `a${a}` : q != null ? `p${q}` : 'e'; };
                    const s = h * 6 + c, a = actual.get(s), p = plan.get(s), k = kind(s);
                    const joinL = c > 0 && k !== 'e' && kind(s - 1) === k, joinR = c < 5 && k !== 'e' && kind(s + 1) === k;
                    const col = color(a ?? p);
                    const r = 7;
                    return (
                      <View key={c} style={{
                        flex: 1, height: ROW - 8, marginLeft: joinL ? 0 : 1.5, marginRight: joinR ? 0 : 1.5,
                        borderTopLeftRadius: joinL ? 0 : r, borderBottomLeftRadius: joinL ? 0 : r, borderTopRightRadius: joinR ? 0 : r, borderBottomRightRadius: joinR ? 0 : r,
                        backgroundColor: a != null ? col : p != null ? `${col}26` : busy.has(s) ? t.dotOff : t.surface2, opacity: a == null && p == null && busy.has(s) ? 0.5 : 1,
                        borderWidth: p != null && a == null ? 1.5 : 0, borderColor: col,
                        borderLeftWidth: p != null && a == null && joinL ? 0 : p != null && a == null ? 1.5 : 0,
                        borderRightWidth: p != null && a == null && joinR ? 0 : p != null && a == null ? 1.5 : 0,
                      }}>
                        {a != null && p != null && <View style={{ position: 'absolute', top: 4, left: 5, right: 5, height: 3, borderRadius: 2, backgroundColor: t.bg, opacity: 0.45 }} />}
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        </GestureDetector>
      </Card>

      <Card style={{ marginHorizontal: space(4), gap: space(2) }}>
        <Txt v="label">Three lines a day</Txt>
        {diary.map((v, i) => (
          <TextInput key={i} value={v} onChangeText={(x) => saveLine(i, x)} onEndEditing={commitDiary} onBlur={commitDiary}
            placeholder={tr(['What went well', 'What was hard', 'Tomorrow I will'][i])} placeholderTextColor={t.muted}
            style={{ minHeight: 48, borderRadius: radius.sm, backgroundColor: t.surface2, color: t.text, paddingHorizontal: space(3), fontFamily: font.body, fontSize: 15 }} />
        ))}
      </Card>
    </ScrollView>
  );
}

export default withBoundary(Plan, 'Plan');
