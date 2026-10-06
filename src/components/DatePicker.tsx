import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { monthName, tr, weekdayLetter } from '../i18n';
import { radius, space, useTheme } from '../theme';
import { useSettings } from '../store';
import { dayKey, keyToTs, startOfDay } from '../util';
import { Txt, tap } from './ui';


/** Month grid, Monday first. value/onChange use YYYY-MM-DD. Past days are disabled unless allowPast. */
export function DatePicker({ value, onChange, allowPast }: { value: string; onChange: (k: string) => void; allowPast?: boolean }) {
  const t = useTheme(), sun = useSettings((s) => s.weekStart) === 'sun';
  const HEAD = sun ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6, 0];
  const base = value ? new Date(keyToTs(value)) : new Date();
  const [ym, setYm] = useState({ y: base.getFullYear(), m: base.getMonth() });
  const today = startOfDay(Date.now());
  const lead = sun ? new Date(ym.y, ym.m, 1).getDay() : (new Date(ym.y, ym.m, 1).getDay() + 6) % 7;
  const n = new Date(ym.y, ym.m + 1, 0).getDate();
  const cells = [...Array(lead).fill(0), ...Array.from({ length: n }, (_, i) => i + 1)];
  while (cells.length < 42) cells.push(0); // 6 rows always, so the picker keeps one size
  const go = (d: number) => setYm(({ y, m }) => { const x = new Date(y, m + d, 1); return { y: x.getFullYear(), m: x.getMonth() }; });
  const Arrow = ({ d, s }: { d: number; s: string }) => (
    <Pressable accessibilityLabel={tr(d < 0 ? 'Previous month' : 'Next month')} onPress={() => { tap(); go(d); }}
      style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}><Txt v="h2">{s}</Txt></Pressable>
  );
  return (
    <View style={{ gap: space(1) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Arrow d={-1} s="‹" /><Txt v="h3" raw>{`${monthName(ym.m)} ${ym.y}`}</Txt><Arrow d={1} s="›" />
      </View>
      <View style={{ flexDirection: 'row' }}>{HEAD.map((h, i) => <Txt key={i} v="small" raw style={{ flex: 1, textAlign: 'center' }}>{weekdayLetter(h)}</Txt>)}</View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((d, i) => {
          if (!d) return <View key={i} style={{ width: `${100 / 7}%`, height: 44 }} />;
          const k = dayKey(new Date(ym.y, ym.m, d).getTime()), on = k === value, off = !allowPast && keyToTs(k) < today, isToday = keyToTs(k) === today;
          return (
            <Pressable key={i} disabled={off} accessibilityLabel={`${d} ${monthName(ym.m)} ${ym.y}`} onPress={() => { tap(); onChange(k); }}
              style={{ width: `${100 / 7}%`, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 38, height: 38, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? t.accentA : 'transparent', borderWidth: isToday && !on ? 1 : 0, borderColor: t.accentA }}>
                <Txt v="h3" c={on ? '#1A1206' : off ? t.dotOff : t.text}>{d}</Txt>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
