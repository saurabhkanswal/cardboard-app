import React, {useEffect} from 'react';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, {Path} from 'react-native-svg';
import {colors} from '../theme';

const VIEW_W = 100;
const VIEW_H = 16;
const NUDGE_PX = 6;

interface SpinHintArrowProps {
  width: number;
  /** Fades out when false; its space stays reserved so the layout doesn't jump. */
  visible: boolean;
}

/**
 * A curved arrow that follows the front of the logo ring, pointing right, with a
 * gentle looping nudge in that direction to show "swipe this way to spin".
 */
export function SpinHintArrow({width, visible}: SpinHintArrowProps) {
  const nudge = useSharedValue(0);
  const opacity = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    nudge.value = withRepeat(
      withSequence(
        withTiming(NUDGE_PX, {
          duration: 600,
          easing: Easing.out(Easing.quad),
        }),
        withTiming(0, {duration: 600, easing: Easing.in(Easing.quad)}),
      ),
      -1,
    );
    return () => cancelAnimation(nudge);
  }, [nudge]);

  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, {duration: 250});
  }, [visible, opacity]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{translateX: nudge.value}],
  }));

  return (
    <Animated.View
      style={style}
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
    >
      <Svg
        width={width}
        height={(width * VIEW_H) / VIEW_W}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        fill="none"
        stroke={colors.textMuted}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* The ring's front curve, ending in an arrowhead along its tangent. */}
        <Path d="M8 3 Q50 21 92 3" />
        <Path d="M84 2.3 L92 3 L87 9.2" />
      </Svg>
    </Animated.View>
  );
}
