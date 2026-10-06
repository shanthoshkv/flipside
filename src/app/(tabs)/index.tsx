import { useEffect, useMemo } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlipIllustration } from '../../components/FlipIllustration';
import { Reflect } from '../../components/Reflect';
import { TaskPicker } from '../../components/TaskPicker';
import { router } from 'expo-router';
import { Segmented } from '../../components/controls';
import { Btn, Card, CountUp, Txt } from '../../components/ui';
import { useData } from '../../data';
import { useFlip } from '../../engine/flip';
import { totalMs } from '../../stats';
import { useSettings } from '../../store';
import { font, space, useTheme } from '../../theme';
import { daysUntil, fmtClock, fmtDur, startOfDay } from '../../util';

function PulseDot() {
  const o = useSharedValue(1);
  useEffect(() => { o.value = withRepeat(withSequence(withTiming(0.25, { duration: 1200, easing: Easing.inOut(Easing.quad) }), withTiming(1, { duration: 1200 })), -1); }, []);
  const s = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF6B6B' }, s]} />;
}

export default function TimerScreen() {
  const t = useTheme(), { top } = useSafeAreaInsets();
  const { tasks, sessions, exams, cards } = useData();
  const dueCards = cards.filter((c) => c.due <= Date.now()).length;
  const f = useFlip();
  const { lastTaskId, focusMin, touchToStart } = useSettings();
  const want = f.taskId ?? lastTaskId;
  const sel = f.status !== 'IDLE' ? (f.taskId ?? 0) : want === 0 ? 0 : (tasks.find((k) => k.id === want)?.id ?? tasks.find((k) => !k.parent_id)?.id ?? 0);
  const task = tasks.find((k) => k.id === sel);

  const live = f.status === 'RUNNING' && f.phase === 'focus' ? f.now - f.phaseStart : 0;
  const today = useMemo(() => totalMs(sessions, startOfDay(Date.now()), Date.now() + 1), [sessions, f.status]);

  const next = useMemo(() => {
    const e = exams.map((x) => ({ ...x, days: daysUntil(x.date) })).filter((x) => x.days >= 0).sort((a, b) => a.days - b.days)[0];
    if (!e) return null;
    const topics = tasks.filter((k) => k.parent_id === e.task_id);
    return { ...e, total: topics.length, done: topics.filter((k) => k.done).length };
  }, [exams, tasks]);

  const pomo = f.mode === 'pomodoro';
  const len = (f.phase === 'focus' ? focusMin : useSettings.getState().breakMin) * 60000;
  const shown = f.status !== 'RUNNING' ? (pomo ? focusMin * 60000 : 0) : pomo ? Math.max(0, len - (f.now - f.phaseStart)) : f.now - f.startTs;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: top + space(2) }}>
      <ScrollView contentContainerStyle={{ paddingBottom: space(6), gap: space(5) }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: space(4) }}>
          <Txt v="h1">Flipside</Txt>
        </View>

        <TaskPicker tasks={tasks} selected={sel} disabled={f.status !== 'IDLE'}
          onSelect={(id) => useSettings.getState().set('lastTaskId', id)} />

        <View style={{ alignItems: 'center', gap: space(1) }}>
          <Txt style={{ fontFamily: font.headBold, fontSize: 88, lineHeight: 96, fontVariant: ['tabular-nums'] }} accessibilityLabel={`Timer ${fmtClock(shown)}`}>{fmtClock(shown)}</Txt>
          <Txt v="label">{task ? (task.parent_id ? `${tasks.find((k) => k.id === task.parent_id)?.name ?? ''} › ${task.name}` : task.name) : 'Focus'}{pomo ? ` · ${f.phase}` : ''}</Txt>
        </View>

        <View style={{ paddingHorizontal: space(4) }}>
          <Segmented disabled={f.status !== 'IDLE'} value={f.mode} onChange={f.setMode}
            options={[{ v: 'stopwatch', label: 'Stopwatch' }, { v: 'pomodoro', label: 'Pomodoro' }]} />
        </View>

        <View style={{ alignItems: 'center' }}>
          <FlipIllustration armed={f.status === 'ARMED'} color={task?.color} />
          <Txt v="small" style={{ textAlign: 'center', paddingHorizontal: space(8) }}>
            {f.status === 'ARMED' ? (touchToStart ? 'Tap Start when you are ready.' : 'Flip your phone face-down to start.') : touchToStart ? 'Touch-to-start is on.' : 'Place it screen-down. Lift it to stop.'}
          </Txt>
        </View>

        <View style={{ paddingHorizontal: space(4), gap: space(2) }}>
          {f.status === 'IDLE' && <Btn label="Ready" onPress={() => f.arm(sel)} />}
          {f.status === 'ARMED' && touchToStart && <Btn label="Start" onPress={f.begin} />}
          {f.status === 'ARMED' && <Btn kind="ghost" label="Cancel" onPress={f.cancel} />}
        </View>

        <Card i={1} style={{ marginHorizontal: space(4), flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View><Txt v="label">Today</Txt><CountUp value={today + live} format={fmtDur} style={{ fontFamily: font.headBold, fontSize: 28, color: t.text }} /></View>
        </Card>

        {dueCards > 0 && (
          <Card i={2} style={{ marginHorizontal: space(4), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View><Txt v="label">Flashcards</Txt><Txt v="h3">{dueCards} due</Txt></View>
            <Btn label="Review" onPress={() => router.push('/review')} />
          </Card>
        )}

        {next && (
          <Card i={2} style={{ marginHorizontal: space(4), gap: 6 }}>
            <Txt v="label">Next exam</Txt>
            <Pressable onPress={() => router.navigate('/study')}>
              <Txt v="h3">{next.name} · {next.days === 0 ? 'today' : `${next.days} day${next.days === 1 ? '' : 's'}`}</Txt>
              <Txt v="small">{next.total ? `${next.done}/${next.total} topics covered` : 'Add topics in Study to track coverage'}</Txt>
            </Pressable>
          </Card>
        )}
      </ScrollView>
      <Reflect />

      <Modal visible={f.status === 'RUNNING'} animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
        <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', gap: space(3) }}>
          <PulseDot />
          <Txt style={{ fontFamily: font.head, fontSize: 40, color: '#4A4A58', fontVariant: ['tabular-nums'] }}>{fmtClock(shown)}</Txt>
          <Txt v="small" c="#3A3A46">{task?.name}{pomo ? ` · ${f.phase} ${f.cycle}/${useSettings.getState().cycles}` : ''}</Txt>
          {touchToStart && <View style={{ marginTop: space(8) }}><Btn kind="ghost" label="Stop" onPress={f.end} /></View>}
        </View>
      </Modal>
    </View>
  );
}
