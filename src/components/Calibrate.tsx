import { Accelerometer } from 'expo-sensors';
import { useEffect, useRef, useState } from 'react';
import { Modal, View } from 'react-native';
import { calibrate, type Sample, type Thresh } from '../engine/detect';
import { useSettings } from '../store';
import { radius, space, useTheme } from '../theme';
import { Btn, Txt } from './ui';

type Step = 'intro' | 'down' | 'up' | 'result';
const RECORD_MS = 3000;

/** Two 3-second recordings (face-down, then held up) become this phone's own flip thresholds. */
export function Calibrate({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useTheme();
  const [step, setStep] = useState<Step>('intro');
  const [rec, setRec] = useState(false), [left, setLeft] = useState(0);
  const [result, setResult] = useState<Thresh | string | null>(null);
  const down = useRef<Sample[]>([]);

  useEffect(() => { if (visible) { setStep('intro'); setResult(null); setRec(false); } }, [visible]);

  const record = (which: 'down' | 'up') => {
    const buf: Sample[] = [], t0 = Date.now();
    setRec(true);
    Accelerometer.setUpdateInterval(100);
    const sub = Accelerometer.addListener((s) => { buf.push({ x: s.x, y: s.y, z: s.z }); setLeft(Math.max(0, Math.ceil((RECORD_MS - (Date.now() - t0)) / 1000))); });
    setTimeout(() => {
      sub.remove(); setRec(false);
      if (which === 'down') { down.current = buf; setStep('up'); }
      else { setResult(calibrate(down.current, buf)); setStep('result'); }
    }, RECORD_MS);
  };

  const ok = typeof result === 'object' && result !== null;
  const body: Record<Step, { title: string; text: string; action?: [string, () => void] }> = {
    intro: { title: 'Calibrate flip', text: 'Two short steps teach Flipside how your phone sits and moves. Takes 10 seconds.', action: ['Begin', () => setStep('down')] },
    down: { title: 'Step 1 of 2', text: 'Lay the phone screen-down on the surface you study at and leave it still.', action: ['Start recording', () => record('down')] },
    up: { title: 'Step 2 of 2', text: 'Pick the phone up and hold it the way you normally do when you check it.', action: ['Start recording', () => record('up')] },
    result: { title: ok ? 'Calibrated' : 'Try again', text: ok ? `Flip starts at z < ${(result as Thresh).zStart}, stops above ${(result as Thresh).zStop}. Save to use these.` : String(result) },
  };
  const b = body[step];

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: space(5) }}>
        <View style={{ backgroundColor: t.surface, borderRadius: radius.lg, padding: space(5), gap: space(4) }}>
          <Txt v="h2">{b.title}</Txt>
          <Txt>{rec ? `Recording… ${left}s. Keep it as is.` : b.text}</Txt>
          {b.action && <Btn label={b.action[0]} onPress={b.action[1]} disabled={rec} />}
          {step === 'result' && ok && <Btn label="Save" onPress={() => { useSettings.getState().set('calib', result as Thresh); onClose(); }} />}
          {step === 'result' && !ok && <Btn label="Try again" onPress={() => setStep('down')} />}
          <Btn kind="ghost" label="Close" onPress={onClose} disabled={rec} />
        </View>
      </View>
    </Modal>
  );
}
