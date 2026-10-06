import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Rect } from 'react-native-svg';
import { useTheme } from '../theme';

/** Phone flips face-down on a loop; ring pulses while armed. */
export function FlipIllustration({ armed, color }: { armed: boolean; color?: string }) {
  const t = useTheme();
  const flip = useSharedValue(0), pulse = useSharedValue(0);
  useEffect(() => {
    flip.value = withRepeat(withSequence(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.cubic) }), withDelay(900, withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.cubic) })), withDelay(600, withTiming(0, { duration: 1 }))), -1);
    pulse.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1);
  }, []);
  const phone = useAnimatedStyle(() => ({ transform: [{ perspective: 600 }, { rotateX: `${flip.value * 180}deg` }] }));
  const ring = useAnimatedStyle(() => ({ opacity: armed ? 0.5 * (1 - pulse.value) : 0, transform: [{ scale: 0.8 + pulse.value * 0.7 }] }));
  const c = color ?? t.accentA;
  return (
    <View style={{ width: 200, height: 200, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ position: 'absolute' }, ring]}>
        <Svg width={200} height={200}><Circle cx={100} cy={100} r={90} stroke={c} strokeWidth={3} fill="none" /></Svg>
      </Animated.View>
      <Animated.View style={phone}>
        <Svg width={80} height={140}>
          <Rect x={2} y={2} width={76} height={136} rx={16} fill={t.surface2} stroke={c} strokeWidth={3} />
          <Rect x={28} y={10} width={24} height={5} rx={2.5} fill={c} opacity={0.6} />
          <Circle cx={40} cy={78} r={14} fill={c} opacity={0.85} />
        </Svg>
      </Animated.View>
    </View>
  );
}
