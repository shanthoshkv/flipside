import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, Text, View, type LayoutChangeEvent, type StyleProp, type TextProps, type ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { font, radius, space, useTheme } from '../theme';

export function Card({ children, style, i = 0 }: { children: ReactNode; style?: StyleProp<ViewStyle>; i?: number }) {
  const t = useTheme();
  return (
    <Animated.View entering={FadeInDown.delay(i * 60).springify().damping(18)}
      style={[{ backgroundColor: t.surface, borderRadius: radius.lg, padding: space(4), borderWidth: 1, borderColor: t.border }, style]}>
      {children}
    </Animated.View>
  );
}

export function Txt({ v = 'body', c, style, ...p }: TextProps & { v?: 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'label'; c?: string }) {
  const t = useTheme();
  const base = {
    h1: { fontFamily: font.headBold, fontSize: 28 }, h2: { fontFamily: font.head, fontSize: 20 }, h3: { fontFamily: font.head, fontSize: 16 },
    body: { fontFamily: font.body, fontSize: 15 }, small: { fontFamily: font.body, fontSize: 12.5 },
    label: { fontFamily: font.bodyBold, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' as const },
  }[v];
  return <Text {...p} style={[base, { color: c ?? (v === 'small' || v === 'label' ? t.muted : t.text) }, style]} />;
}

export const tap = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

export function Btn({ label, onPress, kind = 'primary', style, disabled }: {
  label: string; onPress: () => void; kind?: 'primary' | 'ghost' | 'danger'; style?: StyleProp<ViewStyle>; disabled?: boolean;
}) {
  const t = useTheme();
  const inner = (
    <Text style={{ fontFamily: font.head, fontSize: 16, color: kind === 'primary' ? '#1A1206' : kind === 'danger' ? t.danger : t.text }}>{label}</Text>
  );
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled}
      onPress={() => { tap(); onPress(); }} style={({ pressed }) => [{ opacity: disabled ? 0.4 : pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }, style]}>
      {kind === 'primary' ? (
        <LinearGradient colors={[t.accentA, t.accentB]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ minHeight: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space(6) }}>{inner}</LinearGradient>
      ) : (
        <View style={{ minHeight: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space(6), backgroundColor: t.surface2 }}>{inner}</View>
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
