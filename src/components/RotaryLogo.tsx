import React, {useEffect, useRef} from 'react';
import {PanResponder, View, type AccessibilityActionEvent} from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, {Path} from 'react-native-svg';
import {colors} from '../theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * The logomark (assets/cardboard-logomark-white.svg, viewBox 37×25) is 10 slats on a
 * tilted ring seen in perspective. Each slat is traced here as a quad
 * (TL, TR, BR, BL), ordered round the ring: 0 is front-centre, then front-right →
 * far right → back … → far left → front-left.
 */
const RING: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
  [
    [15.96, 16.46],
    [21.03, 16.46],
    [20.88, 24.59],
    [16.14, 24.59],
  ],
  [
    [27.38, 15.53],
    [31.36, 14.25],
    [30.58, 22.17],
    [26.83, 23.58],
  ],
  [
    [36.19, 5.75],
    [37.0, 7.5],
    [35.64, 17.57],
    [34.14, 19.68],
  ],
  [
    [31.57, 2.39],
    [33.95, 3.67],
    [33.21, 10.46],
    [30.96, 9.03],
  ],
  [
    [24.54, 0.45],
    [27.75, 1.09],
    [27.33, 7.57],
    [24.28, 6.84],
  ],
  [
    [16.97, 0.03],
    [20.41, 0.05],
    [20.32, 6.38],
    [17.04, 6.37],
  ],
  [
    [9.27, 1.09],
    [12.47, 0.45],
    [12.74, 6.83],
    [9.68, 7.57],
  ],
  [
    [3.07, 3.66],
    [5.46, 2.38],
    [6.07, 9.02],
    [3.82, 10.45],
  ],
  [
    [0, 7.49],
    [0.81, 5.74],
    [2.85, 19.66],
    [1.37, 17.57],
  ],
  [
    [5.63, 14.24],
    [9.59, 15.53],
    [10.15, 23.57],
    [6.41, 22.17],
  ],
];
const SLOTS = RING.length;
const SLOT_DEG = 360 / SLOTS;
const VIEW_W = 37;
const VIEW_H = 25;

/** Each step turns the ring two slats, so it rests on the exact logo shape. */
const STEP_DEG = SLOT_DEG * 2;
const SPRING = {damping: 14, stiffness: 160};
/** Ratchet detent while dragging: 12 clicks per step. */
const TICK_DEG = STEP_DEG / 12;
/** Opacity of the back slats while the ring is moving. */
const BACK_MIN_OPACITY = 0.35;
const FADE_MS = 150;

/**
 * Slat `k`'s outline with the ring turned `rotation` degrees: it sits between two
 * neighbouring traced positions and blends their corners, so it follows the ring's
 * perspective (narrow at the sides, small at the back).
 */
function slatPath(k: number, rotation: number): string {
  'worklet';
  const u = (((k + rotation / SLOT_DEG) % SLOTS) + SLOTS) % SLOTS;
  const i = Math.floor(u);
  const t = u - i;
  const a = RING[i];
  const b = RING[(i + 1) % SLOTS];
  let d = '';
  for (let c = 0; c < 4; c++) {
    const x = a[c][0] + (b[c][0] - a[c][0]) * t;
    const y = a[c][1] + (b[c][1] - a[c][1]) * t;
    d += `${c === 0 ? 'M' : 'L'}${x.toFixed(3)} ${y.toFixed(3)}`;
  }
  return d + 'Z';
}

/**
 * Back slats fade while the ring moves (`moving` 0→1), so the front and back slats
 * don't merge into one jagged shape where they pass at the sides. At rest everything
 * is fully opaque, so the logo looks exactly like the original.
 */
function slatOpacity(k: number, rotation: number, moving: number): number {
  'worklet';
  // Depth on the ring: 1 at the front, -1 at the back.
  const depth = Math.cos(((k + rotation / SLOT_DEG) * 2 * Math.PI) / SLOTS);
  // Sharp step around the side (depth 0), so front slats stay fully white.
  const back = Math.min(1, Math.max(0, 0.5 - depth * 1.5));
  return 1 - (1 - BACK_MIN_OPACITY) * moving * back;
}

interface SlatProps {
  index: number;
  rotation: SharedValue<number>;
  moving: SharedValue<number>;
}

function Slat({index, rotation, moving}: SlatProps) {
  const animatedProps = useAnimatedProps(() => ({
    d: slatPath(index, rotation.value),
    opacity: slatOpacity(index, rotation.value, moving.value),
  }));
  return <AnimatedPath animatedProps={animatedProps} fill={colors.text} />;
}

interface RotaryLogoProps {
  /** Number of steps past the start; the ring turns through `[0, steps × STEP_DEG]`. */
  steps: number;
  step: number;
  onStepChange: (step: number) => void;
  /** Called at every ratchet detent passed while dragging (not on a step change). */
  onTick?: () => void;
  /** Rendered width; height follows the logo's aspect ratio. */
  size?: number;
  accessibilityLabel?: string;
}

/**
 * The Cardboard logomark as a spinnable ring: swipe sideways and the slats travel
 * round the ring under your finger. Every two slats reports a new step (swiping back
 * steps back); on release it springs to the current step. Controlled by `step`, so
 * external changes (e.g. the accessibility increment/decrement actions) animate it too.
 */
export function RotaryLogo({
  steps,
  step,
  onStepChange,
  onTick,
  size = 240,
  accessibilityLabel = 'Cardboard dial',
}: RotaryLogoProps) {
  const height = (size * VIEW_H) / VIEW_W;
  const rotation = useSharedValue(step * STEP_DEG);
  const moving = useSharedValue(0);
  // Drag state lives in refs: the responder is created once.
  const angle = useRef(step * STEP_DEG);
  const dragStartAngle = useRef(0);
  const isDragging = useRef(false);
  const stepRef = useRef(step);
  const tickRef = useRef(0);
  const propsRef = useRef({steps, onStepChange, onTick, size});
  useEffect(() => {
    propsRef.current = {steps, onStepChange, onTick, size};
  }, [steps, onStepChange, onTick, size]);

  // Follow step changes that didn't come from a drag.
  useEffect(() => {
    stepRef.current = step;
    if (!isDragging.current) {
      springTo(step * STEP_DEG);
    }
    // springTo only touches refs and shared values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        dragStartAngle.current = angle.current;
        tickRef.current = Math.round(angle.current / TICK_DEG);
        isDragging.current = true;
        moving.value = withTiming(1, {duration: FADE_MS});
      },
      onPanResponderMove: (_, g) => {
        // The front slat tracks the finger: arc length dx on a ring of radius size/2.
        const radius = propsRef.current.size / 2;
        const max = propsRef.current.steps * STEP_DEG;
        const next = dragStartAngle.current + ((g.dx / radius) * 180) / Math.PI;
        angle.current = Math.min(max, Math.max(0, next));
        rotation.value = angle.current;

        const nextStep = Math.round(angle.current / STEP_DEG);
        const nextTick = Math.round(angle.current / TICK_DEG);
        if (nextStep !== stepRef.current) {
          // The step's own feedback stands in for the tick at the same spot.
          stepRef.current = nextStep;
          propsRef.current.onStepChange(nextStep);
        } else if (nextTick !== tickRef.current) {
          propsRef.current.onTick?.();
        }
        tickRef.current = nextTick;
      },
      onPanResponderRelease: () => settle(),
      onPanResponderTerminate: () => settle(),
    }),
  ).current;

  function settle() {
    isDragging.current = false;
    springTo(stepRef.current * STEP_DEG);
  }

  /** Springs to `target`, dimming the back slats until it comes to rest. */
  function springTo(target: number) {
    angle.current = target;
    if (rotation.value === target) {
      moving.value = withTiming(0, {duration: FADE_MS});
      return;
    }
    moving.value = withTiming(1, {duration: FADE_MS});
    rotation.value = withSpring(target, SPRING, finished => {
      if (finished) {
        moving.value = withTiming(0, {duration: FADE_MS});
      }
    });
  }

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    const delta = e.nativeEvent.actionName === 'increment' ? 1 : -1;
    const next = Math.min(steps, Math.max(0, step + delta));
    if (next !== step) {
      onStepChange(next);
    }
  };

  return (
    <View
      {...panResponder.panHandlers}
      hitSlop={{top: 32, bottom: 32, left: 16, right: 16}}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{min: 0, max: steps, now: step}}
      accessibilityActions={[{name: 'increment'}, {name: 'decrement'}]}
      onAccessibilityAction={onAccessibilityAction}
    >
      <Svg
        width={size}
        height={height}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        pointerEvents="none"
      >
        {RING.map((_, k) => (
          <Slat key={k} index={k} rotation={rotation} moving={moving} />
        ))}
      </Svg>
    </View>
  );
}
