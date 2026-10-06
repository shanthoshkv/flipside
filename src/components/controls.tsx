import { Pressable, Switch, View } from 'react-native';
import { radius, space, useTheme } from '../theme';
import { Txt, tap } from './ui';

export function Segmented<T extends string>({ options, value, onChange, disabled }: {
  options: { v: T; label: string }[]; value: T; onChange: (v: T) => void; disabled?: boolean;
}) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: t.surface2, borderRadius: radius.md, padding: 4, opacity: disabled ? 0.5 : 1 }}>
      {options.map((o) => {
        const on = o.v === value;
        return (
          <Pressable key={o.v} disabled={disabled} accessibilityRole="button" accessibilityState={{ selected: on }}
            onPress={() => { tap(); onChange(o.v); }}
            style={{ flex: 1, minHeight: 44, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? t.surface : 'transparent' }}>
            <Txt v="h3" c={on ? t.accentText : t.muted}>{o.label}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SwitchRow({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space(3), minHeight: 48 }}>
      <View style={{ flex: 1 }}><Txt>{label}</Txt>{!!hint && <Txt v="small">{hint}</Txt>}</View>
      <Switch value={value} onValueChange={onChange} accessibilityLabel={label} trackColor={{ true: t.accentA, false: t.surface2 }} thumbColor="#fff" />
    </View>
  );
}

export function Stepper({ label, value, onChange, min, max, step = 1, unit }: {
  label: string; value: number; onChange: (n: number) => void; min: number; max: number; step?: number; unit?: string;
}) {
  const t = useTheme();
  const Btn = ({ d, s }: { d: number; s: string }) => (
    <Pressable accessibilityLabel={`${label} ${s === '−' ? 'decrease' : 'increase'}`} onPress={() => { tap(); onChange(Math.max(min, Math.min(max, value + d))); }}
      style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: t.surface2, alignItems: 'center', justifyContent: 'center' }}>
      <Txt v="h2">{s}</Txt>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space(1) }}>
      <Txt>{label}</Txt>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
        <Btn d={-step} s="−" />
        <Txt v="h3" style={{ minWidth: 64, textAlign: 'center' }}>{value}{unit ?? ''}</Txt>
        <Btn d={step} s="+" />
      </View>
    </View>
  );
}
