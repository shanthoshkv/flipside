import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, type SharedValue, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop, Text as SText } from 'react-native-svg';
import { font, useTheme } from '../theme';
import { useWidth } from './ui';

const ACircle = Animated.createAnimatedComponent(Circle);
const ARect = Animated.createAnimatedComponent(Rect);

function useDraw(key: unknown, delay = 0) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = 0;
    p.value = withDelay(delay, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
  }, [key]);
  return p;
}

export function Ring({ size = 200, stroke = 16, progress, children }: { size?: number; stroke?: number; progress: number; children?: React.ReactNode }) {
  const t = useTheme(), r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const p = useDraw(progress);
  const props = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - Math.min(1, progress) * p.value) }));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={t.accentA} /><Stop offset="1" stopColor={t.accentB} /></LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={t.surface2} strokeWidth={stroke} fill="none" />
        <ACircle cx={size / 2} cy={size / 2} r={r} stroke="url(#rg)" strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={`${c} ${c}`} animatedProps={props} rotation={-90} origin={`${size / 2}, ${size / 2}`} />
      </Svg>
      {children}
    </View>
  );
}

function Bar({ x, base, w, h, fill, p, i }: { x: number; base: number; w: number; h: number; fill: string; p: SharedValue<number>; i: number }) {
  const props = useAnimatedProps(() => {
    const k = Math.max(0, Math.min(1, p.value * 1.4 - i * 0.04));
    return { height: Math.max(0, h * k), y: base - h * k };
  });
  return <ARect x={x} width={w} rx={Math.min(6, w / 2)} fill={fill} animatedProps={props} />;
}

export function BarChart({ data, goal, height = 140, onSelect }: { data: { label: string; ms: number; hot?: boolean }[]; goal?: number; height?: number; onSelect?: (i: number) => void }) {
  const t = useTheme(), [w, onLayout] = useWidth();
  const p = useDraw(data.map((d) => d.ms).join());
  const max = Math.max(goal ?? 0, ...data.map((d) => d.ms), 1), bw = w / data.length, plot = height - 22;
  return (
    <View onLayout={onLayout}>
      <Svg width={w} height={height}>
        {goal ? <Rect x={0} y={plot - (goal / max) * plot} width={w} height={1} fill={t.muted} opacity={0.35} /> : null}
        {data.map((d, i) => (
          <Bar key={i} i={i} p={p} x={i * bw + bw * 0.18} w={bw * 0.64} base={plot}
            h={Math.max(d.ms > 0 ? 4 : 2, (d.ms / max) * plot)} fill={d.ms === 0 ? t.surface2 : d.hot ? t.accentB : t.accentA} />
        ))}
        {onSelect && data.map((_, i) => <Rect key={`h${i}`} x={i * bw} y={0} width={bw} height={height} fill="transparent" onPress={() => onSelect(i)} />)}
        {data.map((d, i) => (
          <SText key={`l${i}`} x={i * bw + bw / 2} y={height - 4} fontSize={11} fontFamily={font.body} fill={t.muted} textAnchor="middle">{d.label}</SText>
        ))}
      </Svg>
    </View>
  );
}

export function HourChart({ hours }: { hours: number[] }) {
  const t = useTheme(), [w, onLayout] = useWidth();
  const p = useDraw(hours.join());
  const max = Math.max(...hours, 1), bw = w / 24, H = 100;
  return (
    <View onLayout={onLayout}>
      <Svg width={w} height={H + 18}>
        {hours.map((v, i) => <Bar key={i} i={i} p={p} x={i * bw + 1.5} w={bw - 3} base={H} h={Math.max(2, (v / max) * H)} fill={v === 0 ? t.surface2 : t.accentA} />)}
        {[0, 6, 12, 18].map((hr) => <SText key={hr} x={hr * bw} y={H + 14} fontSize={10} fontFamily={font.body} fill={t.muted}>{hr}h</SText>)}
      </Svg>
    </View>
  );
}

/** columns = weeks (oldest left), rows = weekday; intensity encodes focus time */
export function Heatmap({ days, weeks = 15, onSelect }: { days: { key: string; ms: number }[]; weeks?: number; onSelect?: (key: string) => void }) {
  const t = useTheme(), [w, onLayout] = useWidth();
  const p = useDraw(days.reduce((n, d) => n + d.ms, days.length));
  const fade = useAnimatedStyle(() => ({ opacity: p.value }));
  const cell = w / weeks, max = Math.max(...days.map((d) => d.ms), 1);
  const lead = days.length ? new Date(days[0].key.replace(/-/g, '/')).getDay() : 0;
  const all = [...Array(lead).fill(null), ...days] as ({ key: string; ms: number } | null)[];
  return (
    <View onLayout={onLayout}>
      <Animated.View style={fade}>
        <Svg width={w} height={cell * 7}>
          {all.map((d, i) => d && (
            <Rect key={i} x={Math.floor(i / 7) * cell + 1.5} y={(i % 7) * cell + 1.5} width={cell - 3} height={cell - 3} rx={cell * 0.28}
              fill={d.ms > 0 ? t.accentA : t.surface2} opacity={d.ms > 0 ? 0.25 + Math.ceil((d.ms / max) * 4) * 0.19 : 1} onPress={onSelect ? () => onSelect(d.key) : undefined} />
          ))}
        </Svg>
      </Animated.View>
    </View>
  );
}
