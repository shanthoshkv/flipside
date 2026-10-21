import { Accelerometer } from 'expo-sensors';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { Vibration } from 'react-native';
import { create } from 'zustand';
import { closeSession, deleteSession, heartbeat, markBreak, openSession } from '../db';
import { useData } from '../data';
import { runBackup } from '../backup';
import { tr } from '../i18n';
import { syncReminders } from '../reminders';
import { useSettings } from '../store';
import { fmtDur } from '../util';
import { refreshWidgets } from '../widgets/refresh';
import { pauseAmbient, playAmbient, stopAmbient } from './ambient';
import { playBeep } from './beep';
import { startBackground, stopBackground } from './background';
import { Detector, THRESH } from './detect';
import { setDnd } from './focusmode';

export type Status = 'IDLE' | 'ARMED' | 'RUNNING' | 'PAUSED';
export type Mode = 'stopwatch' | 'pomodoro' | 'flowtime';
export type Phase = 'focus' | 'break';

interface Flip {
  status: Status; mode: Mode; taskId: number | null; sessionId: number | null; reflectId: number | null;
  startTs: number; phase: Phase; cycle: number; phaseStart: number; now: number;
  acc: number; pausedAt: number | null; lastRun: { ms: number; mode: Mode } | null; parked: boolean;
  setMode(m: Mode): void; setTask(id: number): void; arm(taskId: number): Promise<void>; cancel(): void;
  begin(): Promise<void>; end(): Promise<void>; pause(): Promise<void>; resume(): Promise<void>;
}

const KEEP = 'flipside';
let sub: { remove(): void } | null = null;
let tick: ReturnType<typeof setInterval> | null = null;
let beat: ReturnType<typeof setInterval> | null = null;
let busy = false;
let armTimer: ReturnType<typeof setTimeout> | null = null;
const ARM_IDLE_MS = 15 * 60000; // listening with nothing happening for this long releases the screen and sensors
const det = new Detector(THRESH.medium);

/** start = one short pulse, stop = two, pause = one long */
const buzz = (k: 'start' | 'stop' | 'pause' = 'start') => { if (useSettings.getState().vibrate) Vibration.vibrate(k === 'start' ? 60 : k === 'pause' ? 250 : [0, 60, 90, 60]); };
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
  if (s.status === 'PAUSED') return tr('Paused. Flip back to resume');
  if (s.status !== 'RUNNING') return tr('Flip your phone face-down to start');
  return s.phase === 'break' ? tr('On a break') : tr('Focusing · {t}', { t: fmtDur(s.acc + Date.now() - s.startTs) });
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
      content: { title: tr(c === cycles ? 'Pomodoro complete' : 'Focus done'), body: c === cycles ? tr('Great work. All cycles finished.') : tr('Take a {n} min break.', { n: breakMin }) },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: sec, channelId: 'default' },
    }).catch(() => {});
    if (c < cycles) {
      sec += breakMin * 60;
      await Notifications.scheduleNotificationAsync({
        content: { title: tr('Break over'), body: tr('Back to focus.') },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: sec, channelId: 'default' },
      }).catch(() => {});
    }
  }
}

export const useFlip = create<Flip>((set, get) => ({
  status: 'IDLE', mode: 'stopwatch', taskId: null, sessionId: null, reflectId: null, startTs: 0,
  phase: 'focus', cycle: 1, phaseStart: 0, now: Date.now(), acc: 0, pausedAt: null, lastRun: null, parked: false,
  setMode: (mode) => (get().status === 'IDLE' || get().status === 'ARMED') && set({ mode }),
  setTask(id) {
    if (get().status !== 'ARMED') return;
    set({ taskId: id });
    useSettings.getState().set('lastTaskId', id);
  },

  async arm(taskId) {
    if (get().status !== 'IDLE') return;
    set({ status: 'ARMED', taskId, now: Date.now(), parked: false });
    if (armTimer) clearTimeout(armTimer);
    armTimer = setTimeout(() => { if (get().status === 'ARMED') { get().cancel(); set({ parked: true }); } }, ARM_IDLE_MS);
    useSettings.getState().set('lastTaskId', taskId);
    if (useSettings.getState().keepAwake) activateKeepAwakeAsync(KEEP).catch(() => {});
    listen(get);
    Notifications.requestPermissionsAsync().catch(() => {});
    startBackground(describe);
  },

  cancel() {
    if (get().status !== 'ARMED') return;
    if (armTimer) clearTimeout(armTimer);
    stopTimers(); deactivateKeepAwake(KEEP); stopBackground();
    set({ status: 'IDLE' });
  },

  async begin() {
    const s = get();
    if (s.status !== 'ARMED' || s.taskId == null || busy) return;
    busy = true;
    if (armTimer) clearTimeout(armTimer);
    const now = Date.now(), cfg = useSettings.getState();
    try {
      const id = await openSession(s.taskId, s.mode, now);
      set({ status: 'RUNNING', reflectId: null, lastRun: null, sessionId: id, startTs: now, phase: 'focus', cycle: 1, phaseStart: now, now, acc: 0, pausedAt: null });
    } finally { busy = false; }
    buzz();
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
    buzz('pause');
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
    buzz();
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
    buzz('stop');
    await useData.getState().reload();
    refreshWidgets();
    syncReminders();
    runBackup();
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
    if (cfg.pomoBeep) playBeep();
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
    if (cfg.pomoBeep) playBeep();
    ambientOn();
    useFlip.setState({ phase: 'focus', cycle: g.cycle + 1, phaseStart: edge, sessionId: id });
    det.reset();
  }
}
