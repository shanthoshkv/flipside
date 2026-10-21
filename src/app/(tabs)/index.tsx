import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { BreakScreen } from '../../components/BreakScreen';
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
import { allPresets, breakLen } from '../../presets';
import { totalMs } from '../../stats';
import { useSettings, weeklyGoal } from '../../store';
import { font, radius, space, useTheme } from '../../theme';
import { tr } from '../../i18n';
import { dayKey, daysUntil, fmtClock, fmtDur, startOfDay, startOfWeek } from '../../util';
import { withBoundary } from '../../components/ErrorBoundary';

function PulseDot({ paused }: { paused?: boolean }) {
  const o = useSharedValue(1);
  useEffect(() => { o.value = paused ? 1 : withRepeat(withSequence(withTiming(0.25, { duration: 1200, easing: Easing.inOut(Easing.quad) }), withTiming(1, { duration: 1200 })), -1); }, [paused]);
  const s = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ width: 10, height: 10, borderRadius: paused ? 2 : 5, backgroundColor: paused ? '#5A5A68' : '#FF6B6B' }, s]} />;
}

function TimerScreen() {
  const t = useTheme(), { top } = useSafeAreaInsets();
  const { tasks, sessions, exams, cards } = useData();
  const dueCards = cards.filter((c) => c.due <= Date.now()).length;
  const f = useFlip();
  const cfg = useSettings();
  const { lastTaskId, focusMin, touchToStart, pauseMode } = cfg;
  const [day, setDay] = useState<string | null>(null);
  const active = f.status === 'RUNNING' || f.status === 'PAUSED';
  // Lock to the session's task only while running; ARMED/IDLE follow the user's pick.
  const want = active ? (f.taskId ?? lastTaskId) : lastTaskId;
  const sel = want === 0 ? 0 : (tasks.find((k) => k.id === want)?.id ?? tasks.find((k) => !k.parent_id)?.id ?? 0);
  const task = tasks.find((k) => k.id === sel);

  // The timer listens whenever this tab is open: pick a task, put the phone face-down, it starts.
  const [focused, setFocused] = useState(false);
  const selRef = useRef(sel);
  selRef.current = sel;
  useFocusEffect(useCallback(() => {
    setFocused(true);
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active' && useFlip.getState().status === 'IDLE') useFlip.getState().arm(selRef.current); });
    return () => { sub.remove(); setFocused(false); useFlip.getState().cancel(); };
  }, []));
  useEffect(() => { if (focused && f.status === 'IDLE' && f.reflectId == null && !f.parked) f.arm(sel); }, [focused, f.status, f.reflectId, f.parked]);
  useEffect(() => { if (f.status === 'ARMED') f.setTask(sel); }, [sel]);

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
  const len = (f.phase === 'focus' ? focusMin : breakLen(cfg, f.cycle)) * 60000;
  const shown = f.status === 'RUNNING' ? (pomo ? Math.max(0, len - (f.now - f.phaseStart)) : f.acc + f.now - f.startTs)
    : f.status === 'PAUSED' ? f.acc : pomo ? focusMin * 60000 : 0;
  const hint = f.parked ? 'Paused listening to save battery.'
    : touchToStart ? 'Choose a task, then tap Start.'
    : canPause ? 'Choose a task, then put your phone face-down. Lift to pause, flip back to resume.'
    : 'Choose a task, then put your phone face-down to start. Lift it to stop.';
  const wGoal = weeklyGoal(cfg) * 60000;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: top + space(2) }}>
      <ScrollView contentContainerStyle={{ paddingBottom: space(6), gap: space(5) }}>
        <View style={{ paddingHorizontal: space(4) }}><Txt v="h1">Flipside</Txt></View>

        <TaskPicker tasks={tasks} selected={sel} disabled={active} onSelect={(id) => cfg.set('lastTaskId', id)} />

        <View style={{ alignItems: 'center', gap: space(1) }}>
          <Txt maxFontSizeMultiplier={1.15} style={{ fontFamily: font.headBold, fontSize: 88, lineHeight: 96, fontVariant: ['tabular-nums'] }} accessibilityLabel={`Timer ${fmtClock(shown)}`}>{fmtClock(shown)}</Txt>
          <Txt v="label" raw>{`${task ? (task.parent_id ? `${tasks.find((k) => k.id === task.parent_id)?.name ?? ''} › ${task.name}` : task.name) : tr('Focus')}${pomo ? ` · ${tr(f.phase === 'focus' ? 'Focus' : 'Break')}` : ''}`}</Txt>
        </View>

        <View style={{ paddingHorizontal: space(4), gap: space(2) }}>
          <Segmented<Mode> disabled={active} value={f.mode} onChange={f.setMode}
            options={[{ v: 'stopwatch', label: 'Stopwatch' }, { v: 'pomodoro', label: 'Pomodoro' }, { v: 'flowtime', label: 'Flowtime' }]} />
          {pomo && !active && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space(2) }}>
              {allPresets(cfg.myPresets).map((p) => {
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
          {f.mode === 'flowtime' && !active && <Txt v="small">Work until you naturally stop. Flipside then suggests a break in proportion (about a fifth of your focus).</Txt>}
        </View>

        {!active && (
          <TextInput value={f.goal} onChangeText={f.setGoal} placeholder={tr('Goal for this session (optional)')} placeholderTextColor={t.muted} maxLength={120}
            accessibilityLabel={tr('Goal for this session (optional)')}
            style={{ marginHorizontal: space(4), minHeight: 48, borderRadius: radius.sm, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, color: t.text, paddingHorizontal: space(3), fontFamily: font.body, fontSize: 15 }} />
        )}

        <View style={{ paddingHorizontal: space(4), gap: 6 }}>
          <Txt v="label">Focus sound</Txt>
          <AmbientPicker />
        </View>

        <View style={{ alignItems: 'center' }}>
          <FlipIllustration armed={f.status === 'ARMED'} color={task?.color} />
          <Txt v="small" style={{ textAlign: 'center', paddingHorizontal: space(8) }}>{hint}</Txt>
        </View>

        <View style={{ paddingHorizontal: space(4), gap: space(2) }}>
          {f.status === 'ARMED' && touchToStart && <Btn label="Start" onPress={f.begin} />}
          {f.parked && f.status === 'IDLE' && <Btn kind="ghost" label="Listen again" onPress={() => f.arm(sel)} />}
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
            <View style={{ flex: 1 }}><Txt v="label">Flashcards</Txt><Txt v="h3">{tr('{n} due', { n: dueCards })}</Txt></View>
            <Btn label="Review" onPress={() => router.push('/review')} />
          </Card>
        )}

        {next && (
          <Card i={2} style={{ marginHorizontal: space(4), gap: 6 }}>
            <Txt v="label">Next exam</Txt>
            <Pressable onPress={() => router.navigate('/study')}>
              <Txt v="h3" raw>{`${next.name} · ${next.days === 0 ? tr('today') : next.days === 1 ? tr('1 day') : tr('{n} days', { n: next.days })}`}</Txt>
              <Txt v="small">{next.total ? tr('{done}/{total} topics covered', { done: next.done, total: next.total }) : 'Add topics in Study to track coverage'}</Txt>
            </Pressable>
          </Card>
        )}
      </ScrollView>
      <Reflect />
      <DayDetail day={day} sessions={sessions} tasks={tasks} onClose={() => setDay(null)} />

      <Modal visible={active} animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
        <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', gap: space(3) }}>
          {pomo && f.phase === 'break' ? <BreakScreen elapsed={f.now - f.phaseStart} /> : <PulseDot paused={f.status === 'PAUSED'} />}
          <Txt style={{ fontFamily: font.head, fontSize: 40, color: '#4A4A58', fontVariant: ['tabular-nums'] }}>{fmtClock(shown)}</Txt>
          <Txt v="small" c="#3A3A46" raw>{`${f.status === 'PAUSED' ? tr('Paused') : task?.name ?? ''}${pomo ? ` · ${tr(f.phase === 'focus' ? 'Focus' : 'Break')} ${f.cycle}/${cfg.cycles}` : ''}`}</Txt>
          {!!f.goal && f.phase === 'focus' && <Txt v="small" c="#3A3A46" raw style={{ textAlign: 'center', paddingHorizontal: space(8) }}>{`→ ${f.goal}`}</Txt>}
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

export default withBoundary(TimerScreen, 'Timer');
