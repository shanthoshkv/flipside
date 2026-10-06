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
