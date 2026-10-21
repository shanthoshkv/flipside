import { Accelerometer } from 'expo-sensors';
import { useEffect, useRef } from 'react';

/** Face-down for ≥600 ms (thinking), then lift → onReveal. Same z sign as the timer detector. */
export function useFlipReveal(on: boolean, onReveal: () => void) {
  const cb = useRef(onReveal);
  cb.current = onReveal;
  useEffect(() => {
    if (!on) return;
    let downSince = 0, armed = false;
    Accelerometer.setUpdateInterval(100);
    const sub = Accelerometer.addListener(({ z }) => {
      const t = Date.now();
      if (z < -0.8) { downSince ||= t; if (t - downSince >= 600) armed = true; }
      else { downSince = 0; if (armed && z > -0.3) { armed = false; cb.current(); } }
    });
    return () => sub.remove();
  }, [on]);
}
