import * as Sharing from 'expo-sharing';
import { useMemo, useRef, useState } from 'react';
import { Alert, Modal, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import type { Session, Task } from '../db';
import { monthName, tr } from '../i18n';
import { periodSummary } from '../stats';
import { radius, space, useTheme } from '../theme';
import { fmtDate, fmtDur, fmtTod } from '../util';
import { Segmented } from './controls';
import { rootOf } from './TaskPicker';
import { Btn, Txt } from './ui';

type P = 'month' | 'last' | 'year';
const range = (p: P) => {
  const d = new Date();
  if (p === 'year') return { from: new Date(d.getFullYear(), 0, 1).getTime(), to: new Date(d.getFullYear() + 1, 0, 1).getTime(), label: String(d.getFullYear()) };
  const m = d.getMonth() - (p === 'last' ? 1 : 0), a = new Date(d.getFullYear(), m, 1);
  return { from: a.getTime(), to: new Date(a.getFullYear(), a.getMonth() + 1, 1).getTime(), label: `${monthName(a.getMonth())} ${a.getFullYear()}` };
};

/** Shareable summary card, rendered on the device and shared as a PNG. */
export function Wrapped({ visible, onClose, ss, tasks }: { visible: boolean; onClose: () => void; ss: Session[]; tasks: Task[] }) {
  const t = useTheme(), ref = useRef<View>(null);
  const [p, setP] = useState<P>('month');
  const r = range(p);
  const s = useMemo(() => periodSummary(ss, r.from, Math.min(r.to, Date.now() + 1), (id) => rootOf(tasks, id)), [ss, tasks, p]);
  const name = (id: number) => tasks.find((k) => k.id === id)?.name ?? tr('No task');
  const share = async () => {
    try { const uri = await captureRef(ref, { format: 'png', quality: 1 }); await Sharing.shareAsync(uri, { mimeType: 'image/png' }); }
    catch (e) { Alert.alert(tr('Export failed'), String(e)); }
  };
  const Row = ({ k, v }: { k: string; v: string }) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Txt c="#1A1206">{k}</Txt><Txt v="h3" raw c="#1A1206">{v}</Txt></View>
  );
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: space(5), gap: space(3) }}>
        <Segmented<P> value={p} onChange={setP} options={[{ v: 'month', label: 'This month' }, { v: 'last', label: 'Last month' }, { v: 'year', label: 'This year' }]} />
        <View ref={ref} collapsable={false} style={{ backgroundColor: t.accentA, borderRadius: radius.lg, padding: space(6), gap: space(3) }}>
          <Txt v="label" c="#1A1206">Flipside Wrapped</Txt>
          <Txt v="h1" raw c="#1A1206">{r.label}</Txt>
          <Txt raw c="#1A1206" style={{ fontSize: 48, fontWeight: '800' }}>{fmtDur(s.total)}</Txt>
          <Txt c="#1A1206">of deep focus</Txt>
          <Row k="Sessions" v={String(s.count)} />
          <Row k="Active days" v={String(s.activeDays)} />
          <Row k="Longest streak" v={tr('{n}d', { n: s.streak })} />
          {s.best && <Row k="Best day" v={`${fmtDate(s.best.key)} · ${fmtDur(s.best.ms)}`} />}
          {s.bestHour != null && <Row k="Peak hour" v={fmtTod(s.bestHour, 0)} />}
          {s.top.map(([id, ms], i) => <Row key={id} k={`#${i + 1} ${name(id)}`} v={fmtDur(ms)} />)}
          <Txt v="small" c="#1A1206">Made with Flipside · free and open source</Txt>
        </View>
        <Btn label="Share image" onPress={share} disabled={s.total === 0} />
        <Btn kind="ghost" label="Close" onPress={onClose} />
      </View>
    </Modal>
  );
}
