import { Accelerometer } from 'expo-sensors';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { create } from 'zustand';
import { closeSession, deleteSession, heartbeat, openSession } from '../db';
import { useData } from '../data';
import { useSettings } from '../store';
import { refreshWidgets } from '../widgets/refresh';
import { Detector, THRESH } from './detect';

export type Status = 'IDLE' | 'ARMED' | 'RUNNING';
export type Mode = 'stopwatch' | 'pomodoro';
export type Phase = 'focus' | 'break';

interface Flip {
  status: Status; mode: Mode; taskId: number | null; sessionId: number | null;
  startTs: number; phase: Phase; cycle: number; phaseStart: number; now: number;
  setMode(m: Mode): void; arm(taskId: number): Promise<void>; cancel(): void; begin(): Promise<void>; end(): Promise<void>;
}

const KEEP = 'flipside';
let sub: { remove(): void } | null = null;
let tick: ReturnType<typeof setInterval> | null = null;
let beat: ReturnType<typeof setInterval> | null = null;
const det = new Detector(THRESH.medium);
const buzz = (t: Haptics.ImpactFeedbackStyle) => Haptics.impactAsync(t).catch(() => {});

function listen(get: () => Flip) {
  sub?.remove();
  if (useSettings.getState().touchToStart) return;
  det.th = THRESH[useSettings.getState().sensitivity];
  det.reset();
  Accelerometer.setUpdateInterval(100);
  sub = Accelerometer.addListener(({ x, y, z }) => {
    const s = get();
    if (s.status === 'IDLE') return;
    const ev = det.feed(Date.now(), x, y, z, s.status === 'RUNNING');
    if (ev === 'start' && s.status === 'ARMED') s.begin();
    else if (ev === 'stop' && s.status === 'RUNNING' && s.phase === 'focus') s.end();
  });
}

function stopTimers() {
  sub?.remove(); sub = null;
  if (tick) clearInterval(tick);
  if (beat) clearInterval(beat);
  tick = beat = null;
}

async function schedulePomodoro(focusMin: number, breakMin: number, cycles: number) {
  const perm = await Notifications.requestPermissionsAsync().catch(() => null);
  if (!perm?.granted) return;
  let sec = 0;
  for (let c = 1; c <= cycles; c++) {
    sec += focusMin * 60;
    await Notifications.scheduleNotificationAsync({
      content: { title: c === cycles ? 'Pomodoro complete' : 'Focus done', body: c === cycles ? 'Great work. All cycles finished.' : `Take a ${breakMin} min break.` },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: sec, channelId: 'default' },
    }).catch(() => {});
    if (c < cycles) {
      sec += breakMin * 60;
      await Notifications.scheduleNotificationAsync({
        content: { title: 'Break over', body: 'Back to focus.' },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: sec, channelId: 'default' },
      }).catch(() => {});
    }
  }
}

export const useFlip = create<Flip>((set, get) => ({
  status: 'IDLE', mode: 'stopwatch', taskId: null, sessionId: null, startTs: 0,
  phase: 'focus', cycle: 1, phaseStart: 0, now: Date.now(),
  setMode: (mode) => get().status === 'IDLE' && set({ mode }),

  async arm(taskId) {
    if (get().status !== 'IDLE') return;
    set({ status: 'ARMED', taskId, now: Date.now() });
    useSettings.getState().set('lastTaskId', taskId);
    activateKeepAwakeAsync(KEEP).catch(() => {});
    listen(get);
  },

  cancel() {
    if (get().status !== 'ARMED') return;
    stopTimers(); deactivateKeepAwake(KEEP);
    set({ status: 'IDLE' });
  },

  async begin() {
    const s = get();
    if (s.status === 'RUNNING' || s.taskId == null) return;
    const now = Date.now(), cfg = useSettings.getState();
    const id = await openSession(s.taskId, s.mode, now);
    set({ status: 'RUNNING', sessionId: id, startTs: now, phase: 'focus', cycle: 1, phaseStart: now, now });
    buzz(Haptics.ImpactFeedbackStyle.Medium);
    if (s.mode === 'pomodoro') schedulePomodoro(cfg.focusMin, cfg.breakMin, cfg.cycles);
    listen(get);
    beat = setInterval(() => { const sid = get().sessionId; if (sid != null) heartbeat(sid, Date.now()); }, 15000);
    tick = setInterval(() => {
      const t = Date.now(), g = get();
      set({ now: t });
      if (g.mode === 'pomodoro') advance(t);
    }, 250);
  },

  async end() {
    const s = get();
    if (s.status !== 'RUNNING') return;
    const now = Date.now();
    stopTimers(); deactivateKeepAwake(KEEP);
    Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
    set({ status: 'IDLE', sessionId: null });
    if (s.sessionId != null) {
      if (now - s.startTs < 10000) await deleteSession(s.sessionId);
      else await closeSession(s.sessionId, now);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    await useData.getState().reload();
    refreshWidgets();
  },
}));

let advancing = false;
async function advance(t: number) {
  if (advancing) return;
  advancing = true;
  try { await step(t); } finally { advancing = false; }
}

async function step(t: number) {
  const g = useFlip.getState(), cfg = useSettings.getState();
  const len = (g.phase === 'focus' ? cfg.focusMin : cfg.breakMin) * 60000;
  if (t - g.phaseStart < len) return;
  const edge = g.phaseStart + len;
  if (g.phase === 'focus') {
    if (g.sessionId != null) await closeSession(g.sessionId, edge);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    if (g.cycle >= cfg.cycles) {
      useFlip.setState({ sessionId: null, startTs: edge });
      await useFlip.getState().end();
      return;
    }
    useFlip.setState({ phase: 'break', phaseStart: edge, sessionId: null });
    useData.getState().reload(); refreshWidgets();
  } else {
    const id = await openSession(g.taskId!, 'pomodoro', edge);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    useFlip.setState({ phase: 'focus', cycle: g.cycle + 1, phaseStart: edge, sessionId: id });
    det.reset();
  }
}
