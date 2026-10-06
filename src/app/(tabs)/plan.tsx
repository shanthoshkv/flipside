import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TaskPicker } from '../../components/TaskPicker';
import { Card, Txt, tap, useWidth } from '../../components/ui';
import { getDiary, plansForDate, saveDiary, setPlan } from '../../db';
import { useData } from '../../data';
import { actualSlots } from '../../stats';
import { useSettings } from '../../store';
import { font, radius, space, useTheme } from '../../theme';
import { addDays, dayKey, keyToTs, pad2, startOfDay } from '../../util';

const ROW = 40;
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Plan() {
  const t = useTheme(), { top } = useSafeAreaInsets();
  const { tasks, sessions } = useData();
  const lastTaskId = useSettings((s) => s.lastTaskId);
  const taskId = lastTaskId === 0 ? 0 : tasks.find((k) => k.id === lastTaskId)?.id ?? tasks.find((k) => !k.parent_id)?.id ?? 0;
  const today = startOfDay(Date.now());
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(today, i - 7)), [today]);
  const [date, setDate] = useState(dayKey(today));
  const [plan, setPlanState] = useState<Map<number, number>>(new Map());
  const [diary, setDiary] = useState(['', '', '']);
  const [w, onLayout] = useWidth(300);
  const stripRef = useRef<ScrollView>(null);

  useEffect(() => { plansForDate(date).then((ps) => setPlanState(new Map(ps.map((p) => [p.slot, p.task_id])))); }, [date]);
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
    setPlan(taskId, date, slot, mode.current === 'on');
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
            <Pressable key={k} accessibilityLabel={`${DOW[new Date(d).getDay()]} ${new Date(d).getDate()}`} onPress={() => { tap(); setDate(k); }}
              style={{ width: 56, minHeight: 64, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? t.accentA : t.surface, borderWidth: 1, borderColor: now && !on ? t.accentA : t.border }}>
              <Txt v="small" c={on ? '#1A1206' : t.muted}>{DOW[new Date(d).getDay()]}</Txt>
              <Txt v="h2" c={on ? '#1A1206' : t.text}>{new Date(d).getDate()}</Txt>
            </Pressable>
          );
        })}
      </ScrollView>

      <TaskPicker tasks={tasks} selected={taskId} onSelect={(id) => useSettings.getState().set('lastTaskId', id)} />

      <Card style={{ marginHorizontal: space(4) }}>
        <View style={{ flexDirection: 'row', gap: space(4), marginBottom: space(3) }}>
          <Txt v="small">○ planned</Txt><Txt v="small">● focused</Txt><Txt v="small">tap or hold-drag to paint</Txt>
        </View>
        <GestureDetector gesture={gesture}>
          <View onLayout={onLayout} collapsable={false}>
            {Array.from({ length: 24 }, (_, h) => (
              <View key={h} style={{ height: ROW, flexDirection: 'row', alignItems: 'center' }} pointerEvents="none">
                <Txt v="small" style={{ width: 44 }}>{pad2(h)}:00</Txt>
                <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-around' }}>
                  {Array.from({ length: 6 }, (_, c) => {
                    const s = h * 6 + c, a = actual.get(s), p = plan.get(s);
                    const col = color(a ?? p);
                    return (
                      <View key={c} style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: a != null ? col : 'transparent',
                        borderWidth: 2, borderColor: a != null ? col : p != null ? col : t.dotOff }}>
                        {a != null && p != null && <View style={{ position: 'absolute', top: 5, left: 5, width: 8, height: 8, borderRadius: 4, backgroundColor: t.bg, opacity: 0.55 }} />}
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
            placeholder={['What went well', 'What was hard', 'Tomorrow I will'][i]} placeholderTextColor={t.muted}
            style={{ minHeight: 48, borderRadius: radius.sm, backgroundColor: t.surface2, color: t.text, paddingHorizontal: space(3), fontFamily: font.body, fontSize: 15 }} />
        ))}
      </Card>
    </ScrollView>
  );
}
