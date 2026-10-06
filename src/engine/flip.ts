import { Accelerometer } from 'expo-sensors';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { Vibration } from 'react-native';
import { create } from 'zustand';
import { closeSession, deleteSession, heartbeat, markBreak, openSession } from '../db';
import { useData } from '../data';
import { syncReminders } from '../reminders';
import { useSettings } from '../store';
import { fmtDur } from '../util';
import { refreshWidgets } from '../widgets/refresh';
import { pauseAmbient, playAmbient, stopAmbient } from './ambient';
import { startBackground, stopBackground } from './background';
import { Detector, THRESH } from './detect';
import { setDnd } from './focusmode';

export type Status = 'IDLE' | 'ARMED' | 'RUNNING' | 'PAUSED';
export type Mode = 'stopwatch' | 'pomodoro' | 'flowtime';
export type Phase = 'focus' | 'break';

interface Flip {
  status: Status; mode: Mode; taskId: number | null; sessionId: number | null; reflectId: number | null;
  startTs: number; phase: Phase; cycle: number; phaseStart: number; now: number;
  acc: number; pausedAt: number | null; lastRun: { ms: number; mode: Mode } | null;
  setMode(m: Mode): void; arm(taskId: number): Promise<void>; cancel(): void;
  begin(): Promise<void>; end(): Promise<void>; pause(): Promise<void>; resume(): Promise<void>;
}

const KEEP = 'flipside';
let sub: { remove(): void } | null = null;
let tick: ReturnType<typeof setInterval> | null = null;
let beat: ReturnType<typeof setInterval> | null = null;
let busy = false;
const det = new Detector(THRESH.medium);

const canPause = (s: Flip) => useSettings.getState().pauseMode && s.mode !== 'pomodoro';

function listen(get: () => Flip) {
  sub?.remove();
  const cfg = useSettings.getState();
  if (cfg.touchToStart) return;
  det.th = cfg.calib ?? THRESH[cfg.sensitivity];
  det.reset();
  Accelerometer.setUpdateInterval(100);
  sub = Accelerometer.addListener(({ x, y, z }) => {
    const s = get();
    if (s.status === 'IDLE') return;
    const ev = det.feed(Date.now(), x, y, z, s.status === 'RUNNING');
    if (ev === 'start') {
      if (s.status === 'ARMED') s.begin();
      else if (s.status === 'PAUSED') s.resume();
    } else if (ev === 'stop' && s.status === 'RUNNING' && s.phase === 'focus') {
      if (canPause(s)) s.pause(); else s.end();
    }
  });
}

const describe = () => {
  const s = useFlip.getState();
  if (s.status === 'PAUSED') return 'Paused. Flip back to resume';
  if (s.status !== 'RUNNING') return 'Flip your phone face-down to start';
  return s.phase === 'break' ? 'On a break' : `Focusing · ${fmtDur(s.acc + Date.now() - s.startTs)}`;
};
const ambientOn = () => { const c = useSettings.getState(); playAmbient(c.ambient, c.ambientVolume); };

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
  status: 'IDLE', mode: 'stopwatch', taskId: null, sessionId: null, reflectId: null, startTs: 0,
  phase: 'focus', cycle: 1, phaseStart: 0, now: Date.now(), acc: 0, pausedAt: null, lastRun: null,
  setMode: (mode) => get().status === 'IDLE' && set({ mode }),

  async arm(taskId) {
    if (get().status !== 'IDLE') return;
    set({ status: 'ARMED', taskId, now: Date.now() });
    useSettings.getState().set('lastTaskId', taskId);
    activateKeepAwakeAsync(KEEP).catch(() => {});
    listen(get);
    Notifications.requestPermissionsAsync().catch(() => {});
    startBackground(describe);
  },

  cancel() {
    if (get().status !== 'ARMED') return;
    stopTimers(); deactivateKeepAwake(KEEP); stopBackground();
    set({ status: 'IDLE' });
  },

  async begin() {
    const s = get();
    if (s.status !== 'ARMED' || s.taskId == null || busy) return;
    busy = true;
    const now = Date.now(), cfg = useSettings.getState();
    try {
      const id = await openSession(s.taskId, s.mode, now);
      set({ status: 'RUNNING', reflectId: null, lastRun: null, sessionId: id, startTs: now, phase: 'focus', cycle: 1, phaseStart: now, now, acc: 0, pausedAt: null });
    } finally { busy = false; }
    Vibration.vibrate(60);
    ambientOn();
    if (cfg.strictFocus) setDnd(true);
    if (s.mode === 'pomodoro') schedulePomodoro(cfg.focusMin, cfg.breakMin, cfg.cycles);
    listen(get);
    beat = setInterval(() => { const sid = get().sessionId; if (sid != null) heartbeat(sid, Date.now()); }, 15000);
    tick = setInterval(() => {
      const t = Date.now(), g = get();
      set({ now: t });
      if (g.mode === 'pomodoro') advance(t);
      else if (g.status === 'PAUSED' && g.pausedAt && t - g.pausedAt > useSettings.getState().pauseGraceMin * 60000) g.end();
    }, 250);
  },

  /** Lift while pausing is enabled: close this segment (marked as a pickup), keep the run alive. */
  async pause() {
    const s = get();
    if (s.status !== 'RUNNING' || s.sessionId == null || busy) return;
    const now = Date.now(), id = s.sessionId, short = now - s.startTs < 10000;
    set({ status: 'PAUSED', sessionId: null, pausedAt: now, now, acc: short ? s.acc : s.acc + (now - s.startTs) });
    pauseAmbient();
    Vibration.vibrate(60);
    if (short) await deleteSession(id);
    else { await closeSession(id, now); await markBreak(id); set({ reflectId: id }); }
    await useData.getState().reload();
    refreshWidgets();
  },

  async resume() {
    const s = get();
    if (s.status !== 'PAUSED' || s.taskId == null || busy) return;
    busy = true;
    const now = Date.now();
    try {
      const id = await openSession(s.taskId, s.mode, now);
      set({ status: 'RUNNING', sessionId: id, startTs: now, phaseStart: now, pausedAt: null, now });
    } finally { busy = false; }
    Vibration.vibrate(60);
    ambientOn();
    det.reset();
  },

  async end() {
    const s = get();
    if (s.status !== 'RUNNING' && s.status !== 'PAUSED') return;
    const now = Date.now();
    stopTimers(); deactivateKeepAwake(KEEP); stopBackground(); stopAmbient();
    if (useSettings.getState().strictFocus) setDnd(false);
    Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
    const running = s.status === 'RUNNING';
    set({ status: 'IDLE', sessionId: null, pausedAt: null });
    let total = s.acc;
    if (running && s.sessionId != null) {
      if (now - s.startTs < 10000) await deleteSession(s.sessionId);
      else { await closeSession(s.sessionId, now); set({ reflectId: s.sessionId }); total += now - s.startTs; }
    }
    if (total > 0) set({ lastRun: { ms: total, mode: s.mode } });
    Vibration.vibrate(60);
    await useData.getState().reload();
    refreshWidgets();
    syncReminders();
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
      useFlip.setState({ sessionId: null, startTs: edge, reflectId: g.sessionId, acc: cfg.focusMin * 60000 * cfg.cycles });
      await useFlip.getState().end();
      return;
    }
    pauseAmbient();
    useFlip.setState({ phase: 'break', phaseStart: edge, sessionId: null });
    useData.getState().reload(); refreshWidgets();
  } else {
    const id = await openSession(g.taskId!, 'pomodoro', edge);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    ambientOn();
    useFlip.setState({ phase: 'focus', cycle: g.cycle + 1, phaseStart: edge, sessionId: id });
    det.reset();
  }
}
