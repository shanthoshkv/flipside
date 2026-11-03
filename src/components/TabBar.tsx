import type { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { font, space, useTheme } from '../theme';
import { Txt, tap } from './ui';

const Icon = ({ name, c }: { name: string; c: string }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    {name === 'index' && <><Circle cx={12} cy={13} r={8} /><Path d="M12 9v4l2.5 2M9.5 2.5h5" /></>}
    {name === 'plan' && <>{[5, 12, 19].flatMap((x) => [5, 12, 19].map((y) => <Circle key={`${x}${y}`} cx={x} cy={y} r={1.6} fill={c} />))}</>}
    {name === 'study' && <><Path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" /><Path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" /></>}
    {name === 'stats' && <><Rect x={4} y={12} width={3.5} height={8} rx={1} /><Rect x={10.25} y={5} width={3.5} height={15} rx={1} /><Rect x={16.5} y={9} width={3.5} height={11} rx={1} /></>}
    {name === 'settings' && <><Path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><Circle cx={16} cy={7} r={2} /><Circle cx={8} cy={17} r={2} /></>}
  </Svg>
);

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];
const LABEL: Record<string, string> = { index: 'Timer', plan: 'Plan', study: 'Study', stats: 'Stats', settings: 'Settings' };

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const t = useTheme(), { bottom } = useSafeAreaInsets();
  return (
    <View style={{ flexDirection: 'row', paddingBottom: bottom, backgroundColor: t.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border }}>
      {state.routes.map((r, i) => {
        const on = state.index === i, c = on ? t.accentText : t.muted;
        return (
          <Pressable key={r.key} accessibilityRole="tab" accessibilityLabel={LABEL[r.name]} accessibilityState={{ selected: on }}
            onPress={() => { tap(); if (!on) navigation.navigate(r.name); }}
            style={({ pressed }) => ({ flex: 1, minHeight: 54, paddingTop: space(2), alignItems: 'center', gap: 3, opacity: pressed ? 0.6 : 1 })}>
            <Icon name={r.name} c={c} />
            <Txt v="small" c={c} style={{ fontSize: 10.5, lineHeight: 13, fontFamily: font.bodyMed }}>{LABEL[r.name]}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}
