import { useRef } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Circle, G, Line, Rect, Text as SText } from 'react-native-svg';
import { monthName } from '../i18n';
import { contributionGrid, level } from '../stats';
import { font, space, useTheme } from '../theme';
import { fmtDur } from '../util';
import { Txt, useWidth } from './ui';

/** Pie/donut with the total in the middle. Slices are drawn as arcs of one circle, so no path maths. */
export function DonutChart({ slices, size = 190, stroke = 30, center, sub }: { slices: { color: string; ms: number }[]; size?: number; stroke?: number; center: string; sub?: string }) {
  const t = useTheme(), r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const total = slices.reduce((n, s) => n + s.ms, 0) || 1, gap = slices.length > 1 ? 2.5 : 0;
  let acc = 0;
  return (
    <Animated.View entering={FadeIn.duration(500)} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      accessible accessibilityRole="image" accessibilityLabel={`${center}. ${slices.map((s) => `${Math.round((s.ms / total) * 100)}%`).join(', ')}`}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={t.surface2} strokeWidth={stroke} fill="none" />
        {slices.map((s, i) => {
          const len = (s.ms / total) * c, seg = Math.max(0.5, len - gap), off = acc;
          acc += len;
          return <Circle key={i} cx={size / 2} cy={size / 2} r={r} stroke={s.color} strokeWidth={stroke} fill="none" strokeDasharray={`${seg} ${c - seg}`} strokeDashoffset={-off} rotation={-90} origin={`${size / 2}, ${size / 2}`} />;
        })}
      </Svg>
      <Txt v="h2" raw>{center}</Txt>
      {!!sub && <Txt v="small">{sub}</Txt>}
    </Animated.View>
  );
}

/** Legend row used under pie and stacked charts: colour dot, name, time, share. */
export function LegendRow({ color, name, ms, pct }: { color: string; name: string; ms: number; pct: number }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(3), minHeight: 32 }}>
      <View style={{ width: 12, height: 12, borderRadius: 4, backgroundColor: color }} />
      <Txt style={{ flex: 1 }} numberOfLines={1} raw>{name}</Txt>
      <Txt v="small" raw>{fmtDur(ms)}</Txt>
      <Txt v="h3" c={t.text} style={{ minWidth: 44, textAlign: 'right' }} raw>{`${pct}%`}</Txt>
    </View>
  );
}

/** One bar per day, split into the subjects studied that day. */
export function StackedBars({ days, colorOf, height = 150, onSelect }: {
  days: { label: string; ms: number; parts: [number, number][] }[]; colorOf: (id: number) => string; height?: number; onSelect?: (i: number) => void;
}) {
  const t = useTheme(), [w, onLayout] = useWidth();
  const max = Math.max(...days.map((d) => d.ms), 1), bw = w / days.length, plot = height - 22;
  return (
    <View onLayout={onLayout}>
      <Svg width={w} height={height}>
        {days.map((d, i) => {
          let y = plot;
          return (
            <G key={i}>
              {d.parts.map(([id, ms], j) => {
                const h = Math.max(2, (ms / max) * plot);
                y -= h;
                return <Rect key={j} x={i * bw + bw * 0.18} y={y} width={bw * 0.64} height={h} rx={3} fill={colorOf(id)} />;
              })}
              {d.ms === 0 && <Rect x={i * bw + bw * 0.18} y={plot - 2} width={bw * 0.64} height={2} rx={1} fill={t.surface2} />}
            </G>
          );
        })}
        {days.map((d, i) => <SText key={`l${i}`} x={i * bw + bw / 2} y={height - 4} fontSize={11} fontFamily={font.body} fill={t.muted} textAnchor="middle">{d.label}</SText>)}
      </Svg>
      {onSelect && (
        <View style={{ position: 'absolute', left: 0, top: 0, width: w, height, flexDirection: 'row' }}>
          {days.map((d, i) => <Pressable key={i} style={{ flex: 1 }} accessibilityRole="button" accessibilityLabel={`${d.label}: ${Math.round(d.ms / 60000)} min`} onPress={() => onSelect(i)} />)}
        </View>
      )}
    </View>
  );
}

const STEP = 15, CELL = 12, TOP = 16;

/** GitHub-style year of focus: one square per day, darker = more focus. Scrolls sideways, newest at the right. */
export function ContributionCalendar({ days, startDay, onSelect }: { days: { key: string; ms: number; ts: number }[]; startDay: 0 | 1; onSelect: (key: string) => void }) {
  const t = useTheme(), ref = useRef<ScrollView>(null);
  const { cols, monthAt } = contributionGrid(days, startDay);
  const max = Math.max(...days.map((d) => d.ms), 1), width = cols.length * STEP, height = TOP + 7 * STEP;
  const op = [1, 0.3, 0.5, 0.75, 1];
  const fill = (ms: number) => (level(ms, max) === 0 ? t.surface2 : t.accentA);
  const pick = (x: number, y: number) => { const d = cols[Math.floor(x / STEP)]?.[Math.floor((y - TOP) / STEP)]; if (d) onSelect(d.key); };
  return (
    <View style={{ gap: space(3) }}>
      <ScrollView ref={ref} horizontal showsHorizontalScrollIndicator={false} onContentSizeChange={() => ref.current?.scrollToEnd({ animated: false })}>
        <Pressable onPress={(e) => pick(e.nativeEvent.locationX, e.nativeEvent.locationY)} accessibilityRole="image" accessibilityLabel="Focus calendar for the last year. Use Open any day to read a specific day.">
          <Svg width={width} height={height}>
            {monthAt.map((m) => <SText key={m.col} x={m.col * STEP} y={10} fontSize={10} fontFamily={font.body} fill={t.muted}>{monthName(m.month).slice(0, 3)}</SText>)}
            {cols.map((c, ci) => c.map((d, ri) => d && (
              <Rect key={`${ci}-${ri}`} x={ci * STEP} y={TOP + ri * STEP} width={CELL} height={CELL} rx={3} fill={fill(d.ms)} opacity={level(d.ms, max) === 0 ? 1 : op[level(d.ms, max)]} />
            )))}
          </Svg>
        </Pressable>
      </ScrollView>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
        <Txt v="small">Less</Txt>
        {[0, 1, 2, 3, 4].map((l) => <View key={l} style={{ width: CELL, height: CELL, borderRadius: 3, backgroundColor: l === 0 ? t.surface2 : t.accentA, opacity: l === 0 ? 1 : op[l] }} />)}
        <Txt v="small">More</Txt>
      </View>
    </View>
  );
}

/** Weekly timetable, Gantt style: a column per day, hours down the side, a coloured block per session. */
export function WeekTimeline({ days, colorOf, onSelect, dayLabel }: {
  days: { ts: number; key: string; ms: number; blocks: { task_id: number; a: number; b: number }[] }[];
  colorOf: (id: number) => string; onSelect: (key: string) => void; dayLabel: (ts: number) => string;
}) {
  const t = useTheme(), [w, onLayout] = useWidth();
  const H = 3600000;
  const all = days.flatMap((d) => d.blocks);
  let lo = all.length ? Math.floor(Math.min(...all.map((b) => b.a)) / H) : 7, hi = all.length ? Math.ceil(Math.max(...all.map((b) => b.b)) / H) : 21;
  lo = Math.max(0, Math.min(lo, 8)); hi = Math.min(24, Math.max(hi, lo + 8, 18));
  const gutter = 28, headH = 40, footH = 22, rowH = 22, colW = (w - gutter) / 7, bodyH = (hi - lo) * rowH, height = headH + bodyH + footH;
  return (
    <View onLayout={onLayout}>
      <Svg width={w} height={height}>
        {Array.from({ length: hi - lo + 1 }, (_, i) => (
          <G key={i}>
            <Line x1={gutter} x2={w} y1={headH + i * rowH} y2={headH + i * rowH} stroke={t.border} strokeWidth={1} />
            {i < hi - lo && i % 2 === 0 && <SText x={gutter - 6} y={headH + i * rowH + 9} fontSize={9} fontFamily={font.body} fill={t.muted} textAnchor="end">{lo + i}</SText>}
          </G>
        ))}
        {days.map((d, i) => (
          <G key={d.key}>
            {i > 0 && <Line x1={gutter + i * colW} x2={gutter + i * colW} y1={headH} y2={headH + bodyH} stroke={t.border} strokeWidth={1} />}
            <SText x={gutter + i * colW + colW / 2} y={14} fontSize={11} fontFamily={font.bodyBold} fill={t.text} textAnchor="middle">{dayLabel(d.ts)}</SText>
            <SText x={gutter + i * colW + colW / 2} y={30} fontSize={10} fontFamily={font.body} fill={t.muted} textAnchor="middle">{new Date(d.ts).getDate()}</SText>
            {d.blocks.map((b, j) => (
              <Rect key={j} x={gutter + i * colW + 3} y={headH + (b.a / H - lo) * rowH} width={Math.max(4, colW - 6)} height={Math.max(5, ((b.b - b.a) / H) * rowH)} rx={5} fill={colorOf(b.task_id)} opacity={0.92} />
            ))}
            <SText x={gutter + i * colW + colW / 2} y={headH + bodyH + 15} fontSize={9} fontFamily={font.body} fill={d.ms ? t.text : t.muted} textAnchor="middle">{d.ms ? fmtDur(d.ms) : '–'}</SText>
          </G>
        ))}
      </Svg>
      <View style={{ position: 'absolute', left: gutter, top: 0, width: w - gutter, height, flexDirection: 'row' }}>
        {days.map((d) => <Pressable key={d.key} style={{ flex: 1 }} accessibilityRole="button" accessibilityLabel={`${dayLabel(d.ts)} ${new Date(d.ts).getDate()}: ${fmtDur(d.ms)}`} onPress={() => onSelect(d.key)} />)}
      </View>
    </View>
  );
}

