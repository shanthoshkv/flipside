import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, Text, View, type LayoutChangeEvent, type StyleProp, type TextProps, type ViewStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { tr } from '../i18n';
import { useSettings } from '../store';
import { font, radius, space, useTheme } from '../theme';

export function Card({ children, style, i = 0 }: { children: ReactNode; style?: StyleProp<ViewStyle>; i?: number }) {
  const t = useTheme();
  return (
    <Animated.View entering={FadeIn.delay(i * 30).duration(220)}
      style={[{ backgroundColor: t.surface, borderRadius: radius.lg, padding: space(4) }, style]}>
      {children}
    </Animated.View>
  );
}

export function Txt({ v = 'body', c, style, raw, ...p }: TextProps & { v?: 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'label'; c?: string; raw?: boolean }) {
  const t = useTheme(), scale = useSettings((s) => s.textScale);
  const base = {
    h1: { fontFamily: font.headBold, fontSize: 32, letterSpacing: -0.6, lineHeight: 38 }, h2: { fontFamily: font.head, fontSize: 21, letterSpacing: -0.3 },
    h3: { fontFamily: font.head, fontSize: 16, letterSpacing: -0.2 }, body: { fontFamily: font.body, fontSize: 16, lineHeight: 22 },
    small: { fontFamily: font.body, fontSize: 13, lineHeight: 18 },
    label: { fontFamily: font.bodyMed, fontSize: 13, letterSpacing: 0.3, textTransform: 'uppercase' as const },
  }[v];
  base.fontSize = Math.round(base.fontSize * scale);
  if ('lineHeight' in base && base.lineHeight) base.lineHeight = Math.round(base.lineHeight * scale);
  return <Text {...p} children={typeof p.children === 'string' && !raw ? tr(p.children) : p.children} style={[base, { color: c ?? (v === 'small' || v === 'label' ? t.muted : t.text) }, style]} />;
}

export const tap = () => { if (useSettings.getState().haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); };

export function Btn({ label, onPress, kind = 'primary', style, disabled }: {
  label: string; onPress: () => void; kind?: 'primary' | 'ghost' | 'danger'; style?: StyleProp<ViewStyle>; disabled?: boolean;
}) {
  const t = useTheme();
  const inner = (
    <Text style={{ fontFamily: font.bodyBold, fontSize: 17, letterSpacing: -0.2, color: kind === 'primary' ? '#1A1206' : kind === 'danger' ? t.danger : t.text }}>{tr(label)}</Text>
  );
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={tr(label)} disabled={disabled}
      onPress={() => { tap(); onPress(); }} style={({ pressed }) => [{ opacity: disabled ? 0.35 : pressed ? 0.7 : 1 }, style]}>
      {kind === 'primary' ? (
        <View style={{ minHeight: 50, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space(6), backgroundColor: t.accentA }}>{inner}</View>
      ) : (
        <View style={{ minHeight: 50, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space(6), backgroundColor: t.surface2 }}>{inner}</View>
      )}
    </Pressable>
  );
}

export function useWidth(init = 300) {
  const [w, setW] = useState(init);
  return [w, (e: LayoutChangeEvent) => setW(Math.max(1, e.nativeEvent.layout.width))] as const;
}

export function CountUp({ value, format, style }: { value: number; format: (n: number) => string; style?: StyleProp<any> }) {
  const [n, setN] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const a = from.current, t0 = Date.now();
    let raf = 0;
    const step = () => {
      const p = Math.min(1, (Date.now() - t0) / 600), e = 1 - (1 - p) ** 3;
      setN(a + (value - a) * e);
      if (p < 1) raf = requestAnimationFrame(step); else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <Txt style={style}>{format(n)}</Txt>;
}

export function EmptyState({ title, hint }: { title: string; hint: string }) {
  const t = useTheme();
  return (
    <View style={{ alignItems: 'center', padding: space(6), gap: space(2) }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 72, gap: 6 }}>
        {Array.from({ length: 9 }, (_, i) => (
          <View key={i} style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: i === 4 ? t.accentA : t.dotOff }} />
        ))}
      </View>
      <Txt v="h3">{title}</Txt>
      <Txt v="small" style={{ textAlign: 'center' }}>{hint}</Txt>
    </View>
  );
}
