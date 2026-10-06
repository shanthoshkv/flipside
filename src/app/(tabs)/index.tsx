import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AmbientPicker } from '../../components/AmbientPicker';
import { DayDetail } from '../../components/DayDetail';
import { FlipIllustration } from '../../components/FlipIllustration';
import { Reflect } from '../../components/Reflect';
import { TaskPicker } from '../../components/TaskPicker';
import { Segmented } from '../../components/controls';
import { Btn, Card, CountUp, Txt, tap } from '../../components/ui';
import { useData } from '../../data';
import { useFlip, type Mode } from '../../engine/flip';
import { PRESETS } from '../../presets';
import { totalMs } from '../../stats';
import { useSettings, weeklyGoal } from '../../store';
import { font, radius, space, useTheme } from '../../theme';
import { dayKey, daysUntil, fmtClock, fmtDur, startOfDay, startOfWeek } from '../../util';

function PulseDot({ paused }: { paused?: boolean }) {
  const o = useSharedValue(1);
  useEffect(() => { o.value = paused ? 1 : withRepeat(withSequence(withTiming(0.25, { duration: 1200, easing: Easing.inOut(Easing.quad) }), withTiming(1, { duration: 1200 })), -1); }, [paused]);
  const s = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ width: 10, height: 10, borderRadius: paused ? 2 : 5, backgroundColor: paused ? '#5A5A68' : '#FF6B6B' }, s]} />;
}

export default function TimerScreen() {
  const t = useTheme(), { top } = useSafeAreaInsets();
  const { tasks, sessions, exams, cards } = useData();
  const dueCards = cards.filter((c) => c.due <= Date.now()).length;
  const f = useFlip();
  const cfg = useSettings();
  const { lastTaskId, focusMin, touchToStart, pauseMode } = cfg;
  const [day, setDay] = useState<string | null>(null);
  const want = f.taskId ?? lastTaskId;
  const sel = f.status !== 'IDLE' ? (f.taskId ?? 0) : want === 0 ? 0 : (tasks.find((k) => k.id === want)?.id ?? tasks.find((k) => !k.parent_id)?.id ?? 0);
  const task = tasks.find((k) => k.id === sel);
  const active = f.status === 'RUNNING' || f.status === 'PAUSED';

  const live = f.status === 'RUNNING' && f.phase === 'focus' ? f.now - f.phaseStart : 0;
  const { today, week } = useMemo(() => {
    const now = Date.now();
    return { today: totalMs(sessions, startOfDay(now), now + 1), week: totalMs(sessions, startOfWeek(now), now + 1) };
  }, [sessions, f.status]);

  const next = useMemo(() => {
    const e = exams.map((x) => ({ ...x, days: daysUntil(x.date) })).filter((x) => x.days >= 0).sort((a, b) => a.days - b.days)[0];
    if (!e) return null;
    const topics = tasks.filter((k) => k.parent_id === e.task_id);
    return { ...e, total: topics.length, done: topics.filter((k) => k.done).length };
  }, [exams, tasks]);

  const pomo = f.mode === 'pomodoro';
  const canPause = pauseMode && !pomo;
  const len = (f.phase === 'focus' ? focusMin : cfg.breakMin) * 60000;
  const shown = f.status === 'RUNNING' ? (pomo ? Math.max(0, len - (f.now - f.phaseStart)) : f.acc + f.now - f.startTs)
    : f.status === 'PAUSED' ? f.acc : pomo ? focusMin * 60000 : 0;
  const hint = f.status === 'ARMED' ? (touchToStart ? 'Tap Start when you are ready.' : 'Flip your phone face-down to start.')
    : touchToStart ? 'Touch-to-start is on.' : canPause ? 'Place it screen-down. Lift to pause, flip back to resume.' : 'Place it screen-down. Lift it to stop.';
  const wGoal = weeklyGoal(cfg) * 60000;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: top + space(2) }}>
      <ScrollView contentContainerStyle={{ paddingBottom: space(6), gap: space(5) }}>
        <View style={{ paddingHorizontal: space(4) }}><Txt v="h1">Flipside</Txt></View>

        <TaskPicker tasks={tasks} selected={sel} disabled={f.status !== 'IDLE'} onSelect={(id) => cfg.set('lastTaskId', id)} />

        <View style={{ alignItems: 'center', gap: space(1) }}>
          <Txt maxFontSizeMultiplier={1.15} style={{ fontFamily: font.headBold, fontSize: 88, lineHeight: 96, fontVariant: ['tabular-nums'] }} accessibilityLabel={`Timer ${fmtClock(shown)}`}>{fmtClock(shown)}</Txt>
          <Txt v="label">{task ? (task.parent_id ? `${tasks.find((k) => k.id === task.parent_id)?.name ?? ''} › ${task.name}` : task.name) : 'Focus'}{pomo ? ` · ${f.phase}` : ''}</Txt>
        </View>

        <View style={{ paddingHorizontal: space(4), gap: space(2) }}>
          <Segmented<Mode> disabled={f.status !== 'IDLE'} value={f.mode} onChange={f.setMode}
            options={[{ v: 'stopwatch', label: 'Stopwatch' }, { v: 'pomodoro', label: 'Pomodoro' }, { v: 'flowtime', label: 'Flowtime' }]} />
          {pomo && f.status === 'IDLE' && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space(2) }}>
              {PRESETS.map((p) => {
                const on = cfg.focusMin === p.focus && cfg.breakMin === p.brk;
                return (
                  <Pressable key={p.label} accessibilityLabel={`Preset ${p.focus} minutes focus, ${p.brk} minutes break`} onPress={() => { tap(); cfg.set('focusMin', p.focus); cfg.set('breakMin', p.brk); }}
                    style={{ minHeight: 44, paddingHorizontal: space(4), borderRadius: radius.pill, justifyContent: 'center', backgroundColor: on ? t.accentA : t.surface2 }}>
                    <Txt v="h3" c={on ? '#1A1206' : t.text}>{p.label}</Txt>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
          {f.mode === 'flowtime' && f.status === 'IDLE' && <Txt v="small">Work until you naturally stop. Flipside then suggests a break in proportion (about a fifth of your focus).</Txt>}
        </View>

        <View style={{ paddingHorizontal: space(4), gap: 6 }}>
          <Txt v="label">Focus sound</Txt>
          <AmbientPicker />
        </View>

        <View style={{ alignItems: 'center' }}>
          <FlipIllustration armed={f.status === 'ARMED'} color={task?.color} />
          <Txt v="small" style={{ textAlign: 'center', paddingHorizontal: space(8) }}>{hint}</Txt>
        </View>

        <View style={{ paddingHorizontal: space(4), gap: space(2) }}>
          {f.status === 'IDLE' && <Btn label="Ready" onPress={() => f.arm(sel)} />}
          {f.status === 'ARMED' && touchToStart && <Btn label="Start" onPress={f.begin} />}
          {f.status === 'ARMED' && <Btn kind="ghost" label="Cancel" onPress={f.cancel} />}
        </View>

        <Pressable accessibilityRole="button" accessibilityLabel="Open today's sessions" onPress={() => { tap(); setDay(dayKey(Date.now())); }}>
          <Card i={1} style={{ marginHorizontal: space(4), gap: space(3) }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View><Txt v="label">Today</Txt><CountUp value={today + live} format={fmtDur} style={{ fontFamily: font.headBold, fontSize: 28, color: t.text }} /></View>
              <View style={{ alignItems: 'flex-end' }}><Txt v="label">This week</Txt><Txt v="h3">{fmtDur(week + live)} / {fmtDur(wGoal)}</Txt></View>
            </View>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: t.surface2 }}>
              <View style={{ width: `${Math.min(100, ((week + live) / wGoal) * 100)}%`, height: 6, borderRadius: 3, backgroundColor: t.accentA }} />
            </View>
            <Txt v="small">Tap to see, edit or add today's sessions.</Txt>
          </Card>
        </Pressable>

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
      <DayDetail day={day} sessions={sessions} tasks={tasks} onClose={() => setDay(null)} />

      <Modal visible={active} animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
        <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', gap: space(3) }}>
          <PulseDot paused={f.status === 'PAUSED'} />
          <Txt style={{ fontFamily: font.head, fontSize: 40, color: '#4A4A58', fontVariant: ['tabular-nums'] }}>{fmtClock(shown)}</Txt>
          <Txt v="small" c="#3A3A46">{f.status === 'PAUSED' ? 'Paused' : task?.name}{pomo ? ` · ${f.phase} ${f.cycle}/${cfg.cycles}` : ''}</Txt>
          {touchToStart && (
            <View style={{ marginTop: space(8), gap: space(2) }}>
              {canPause && (f.status === 'RUNNING' ? <Btn kind="ghost" label="Pause" onPress={f.pause} /> : <Btn kind="ghost" label="Resume" onPress={f.resume} />)}
              <Btn kind="ghost" label="Stop" onPress={f.end} />
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}
