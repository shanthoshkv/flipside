import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { tr } from '../i18n';
import { space } from '../theme';
import { Txt } from './ui';

const TIPS = ['Look at something 6 m (20 ft) away for 20 seconds.', 'Stand up, stretch your back and shoulders.', 'Drink some water.', 'Close your eyes and relax your jaw.'];

/** Pomodoro break: a 4 s in / 4 s out breathing circle and a rotating rest tip. */
export function BreakScreen({ elapsed }: { elapsed: number }) {
  const s = useSharedValue(0.6);
  useEffect(() => { s.value = withRepeat(withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.sin) }), -1, true); }, []);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  const tip = TIPS[Math.floor(elapsed / 60000) % TIPS.length];
  return (
    <View style={{ alignItems: 'center', gap: space(4), paddingHorizontal: space(8) }}>
      <Animated.View style={[{ width: 140, height: 140, borderRadius: 70, borderWidth: 2, borderColor: '#4A4A58' }, st]} />
      <Txt v="small" c="#6A6A78" style={{ textAlign: 'center' }}>Breathe with the circle</Txt>
      <Txt c="#8A8A98" raw style={{ textAlign: 'center' }}>{tr(tip)}</Txt>
    </View>
  );
}
