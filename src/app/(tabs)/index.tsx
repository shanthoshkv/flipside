import { useEffect, useMemo } from 'react';
import { Modal, ScrollView, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlipIllustration } from '../../components/FlipIllustration';
import { TaskChips } from '../../components/TaskChips';
import { Segmented } from '../../components/controls';
import { Btn, Card, CountUp, Txt } from '../../components/ui';
import { addTask } from '../../db';
import { useData } from '../../data';
import { useFlip } from '../../engine/flip';
import { totalMs } from '../../stats';
import { useSettings } from '../../store';
import { font, space, useTheme } from '../../theme';
import { fmtClock, fmtDur, startOfDay } from '../../util';

function PulseDot() {
  const o = useSharedValue(1);
  useEffect(() => { o.value = withRepeat(withSequence(withTiming(0.25, { duration: 1200, easing: Easing.inOut(Easing.quad) }), withTiming(1, { duration: 1200 })), -1); }, []);
  const s = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF6B6B' }, s]} />;
}

export default function TimerScreen() {
  const t = useTheme(), { top } = useSafeAreaInsets();
  const { tasks, sessions, allMs, reload } = useData();
  const f = useFlip();
  const { lastTaskId, focusMin, touchToStart } = useSettings();
  const sel = f.status === 'IDLE' ? (tasks.find((k) => k.id === (f.taskId ?? lastTaskId))?.id ?? tasks[0]?.id ?? null) : f.taskId;
  const task = tasks.find((k) => k.id === sel);

  const live = f.status === 'RUNNING' && f.phase === 'focus' ? f.now - f.phaseStart : 0;
  const today = useMemo(() => totalMs(sessions, startOfDay(Date.now()), Date.now() + 1), [sessions, f.status]);
  const coins = Math.floor((allMs + live) / 600000);

  const pomo = f.mode === 'pomodoro';
  const len = (f.phase === 'focus' ? focusMin : useSettings.getState().breakMin) * 60000;
  const shown = f.status !== 'RUNNING' ? (pomo ? focusMin * 60000 : 0) : pomo ? Math.max(0, len - (f.now - f.phaseStart)) : f.now - f.startTs;

  const add = async (name: string, cat: string, color: string) => {
    const id = await addTask(name, cat, color);
    await reload();
    useSettings.getState().set('lastTaskId', id);
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: top + space(2) }}>
      <ScrollView contentContainerStyle={{ paddingBottom: space(6), gap: space(5) }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: space(4) }}>
          <Txt v="h1">Flipside</Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: t.surface, paddingHorizontal: space(3), height: 40, borderRadius: 20 }}>
            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: t.accentA }} />
            <Txt v="h3">{coins}</Txt>
          </View>
        </View>

        <TaskChips tasks={tasks} selected={sel} disabled={f.status !== 'IDLE'}
          onSelect={(id) => useSettings.getState().set('lastTaskId', id)} onAdd={add} />

        <View style={{ alignItems: 'center', gap: space(1) }}>
          <Txt style={{ fontFamily: font.headBold, fontSize: 88, lineHeight: 96, fontVariant: ['tabular-nums'] }} accessibilityLabel={`Timer ${fmtClock(shown)}`}>{fmtClock(shown)}</Txt>
          <Txt v="label">{task ? task.name : 'Add a task to begin'}{pomo ? ` · ${f.phase}` : ''}</Txt>
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
          {f.status === 'IDLE' && <Btn label="Ready" disabled={sel == null} onPress={() => sel != null && f.arm(sel)} />}
          {f.status === 'ARMED' && touchToStart && <Btn label="Start" onPress={f.begin} />}
          {f.status === 'ARMED' && <Btn kind="ghost" label="Cancel" onPress={f.cancel} />}
        </View>

        <Card i={1} style={{ marginHorizontal: space(4), flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View><Txt v="label">Today</Txt><CountUp value={today + live} format={fmtDur} style={{ fontFamily: font.headBold, fontSize: 28, color: t.text }} /></View>
          <View style={{ alignItems: 'flex-end' }}><Txt v="label">Coins</Txt><Txt v="h2">{coins}</Txt></View>
        </Card>
      </ScrollView>

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
