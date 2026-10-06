export type Sensitivity = 'low' | 'medium' | 'high';
export interface Thresh { zStart: number; xy: number; zStop: number; jitter: number }

export const THRESH: Record<Sensitivity, Thresh> = {
  low: { zStart: -0.92, xy: 0.18, zStop: -0.45, jitter: 0.22 },
  medium: { zStart: -0.85, xy: 0.25, zStop: -0.6, jitter: 0.15 },
  high: { zStart: -0.75, xy: 0.35, zStop: -0.7, jitter: 0.1 },
};
const START_MS = 1000, STOP_MS = 600, WIN_MS = 500;

const std = (a: number[]) => {
  const m = a.reduce((s, v) => s + v, 0) / a.length;
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length);
};

export class Detector {
  private buf: { t: number; x: number; y: number; z: number }[] = [];
  private since: number | null = null;
  th: Thresh;
  constructor(th: Thresh) { this.th = th; }

  reset() { this.buf = []; this.since = null; }

  /** feed one sample; returns 'start' when armed→flat-face-down held, 'stop' when running→lifted/moved */
  feed(t: number, x: number, y: number, z: number, running: boolean): 'start' | 'stop' | null {
    this.buf.push({ t, x, y, z });
    while (this.buf.length && t - this.buf[0].t > WIN_MS) this.buf.shift();
    const { th } = this;
    let cond: boolean;
    if (!running) {
      cond = z < th.zStart && Math.abs(x) < th.xy && Math.abs(y) < th.xy;
    } else {
      const full = this.buf.length > 3 && t - this.buf[0].t >= WIN_MS * 0.8;
      const jitter = full ? Math.max(std(this.buf.map((b) => b.x)), std(this.buf.map((b) => b.y)), std(this.buf.map((b) => b.z))) : 0;
      cond = z > th.zStop || jitter > th.jitter;
    }
    if (!cond) { this.since = null; return null; }
    this.since ??= t;
    if (t - this.since >= (running ? STOP_MS : START_MS)) { this.since = null; return running ? 'stop' : 'start'; }
    return null;
  }
}

export interface Sample { x: number; y: number; z: number }
const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / (a.length || 1);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Derive thresholds from two short recordings: phone resting face-down, and phone held up/lifted.
 * Returns an error string when the recordings don't look right.
 */
export function calibrate(down: Sample[], up: Sample[]): Thresh | string {
  if (down.length < 10 || up.length < 10) return 'Not enough readings. Try again.';
  const zd = mean(down.map((s) => s.z)), zu = mean(up.map((s) => s.z));
  if (zd > -0.6) return 'The phone was not lying face-down. Put it screen-down on a flat surface.';
  if (zu < zd + 0.5) return 'Lifted position looked the same as face-down. Pick the phone up and hold it as you normally would.';
  const xy = mean(down.map((s) => Math.max(Math.abs(s.x), Math.abs(s.y))));
  const sd = Math.max(std(down.map((s) => s.x)), std(down.map((s) => s.y)), std(down.map((s) => s.z)));
  return {
    zStart: +clamp(zd + 0.08, -0.95, -0.6).toFixed(2),
    xy: +clamp(xy + 0.15, 0.12, 0.4).toFixed(2),
    zStop: +clamp((zd + zu) / 2, -0.8, -0.3).toFixed(2),
    jitter: +clamp(sd * 10 + 0.07, 0.08, 0.2).toFixed(2),
  };
}
