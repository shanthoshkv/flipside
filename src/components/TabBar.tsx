import type { Tabs } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, type ComponentProps } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { radius, space, useTheme } from '../theme';
import { Txt, tap, useWidth } from './ui';

const Icon = ({ name, c }: { name: string; c: string }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {name === 'index' && <><Circle cx={12} cy={13} r={8} /><Path d="M12 9v4l2.5 2M9.5 2.5h5" /></>}
    {name === 'plan' && <>{[5, 12, 19].flatMap((x) => [5, 12, 19].map((y) => <Circle key={`${x}${y}`} cx={x} cy={y} r={1.6} fill={c} />))}</>}
    {name === 'stats' && <><Rect x={4} y={12} width={3.5} height={8} rx={1} /><Rect x={10.25} y={5} width={3.5} height={15} rx={1} /><Rect x={16.5} y={9} width={3.5} height={11} rx={1} /></>}
    {name === 'settings' && <><Path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><Circle cx={16} cy={7} r={2} /><Circle cx={8} cy={17} r={2} /></>}
  </Svg>
);

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];
const LABEL: Record<string, string> = { index: 'Timer', plan: 'Plan', stats: 'Stats', settings: 'Settings' };

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const t = useTheme(), { bottom } = useSafeAreaInsets(), [w, onLayout] = useWidth(360);
  const x = useSharedValue(0), n = state.routes.length, cw = (w - space(4) * 2) / n;
  useEffect(() => { x.value = withSpring(state.index * cw, { damping: 16, stiffness: 180 }); }, [state.index, cw]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View onLayout={onLayout} style={{ paddingBottom: bottom + space(2), paddingHorizontal: space(4), paddingTop: space(2), backgroundColor: t.bg }}>
      <View style={{ flexDirection: 'row', backgroundColor: t.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: t.border, padding: 0 }}>
        <Animated.View style={[{ position: 'absolute', width: cw, height: '100%' }, pill]}>
          <LinearGradient colors={[`${t.accentA}33`, `${t.accentB}1A`]} style={{ flex: 1, margin: 4, borderRadius: radius.md }} />
        </Animated.View>
        {state.routes.map((r, i) => {
          const on = state.index === i, c = on ? t.accentA : t.muted;
          return (
            <Pressable key={r.key} accessibilityRole="tab" accessibilityLabel={LABEL[r.name]} accessibilityState={{ selected: on }}
              onPress={() => { tap(); if (!on) navigation.navigate(r.name); }}
              style={{ flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
              <Icon name={r.name} c={c} />
              <Txt v="small" c={c} style={{ fontSize: 11 }}>{LABEL[r.name]}</Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
