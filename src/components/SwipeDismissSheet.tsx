import React, {useEffect, useRef} from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {colors, spacing} from '../theme';

/** Vertical travel before a drag is taken from the sheet's children. */
const DRAG_SLOP = 8;
/** Dismiss once dragged past this share of the sheet's height… */
const DISMISS_DISTANCE_RATIO = 0.25;
/** …or flicked down faster than this (px/ms). */
const DISMISS_VELOCITY = 1;
const DISMISS_DURATION_MS = 180;

interface SwipeDismissSheetProps {
  /** Called once the sheet has slid off after a dismissing swipe. */
  onDismiss: () => void;
  /** Off while e.g. the keyboard is up, so drags go to the inputs. */
  enabled: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/**
 * Bottom sheet with a grab handle that follows a downward drag and calls
 * `onDismiss` past a distance/velocity threshold; otherwise springs back.
 * Stateless apart from the drag offset.
 */
export function SwipeDismissSheet({
  onDismiss,
  enabled,
  style,
  children,
}: SwipeDismissSheetProps) {
  const translateY = useRef(new Animated.Value(0)).current;
  const height = useRef(0);
  // The responder is created once; refs keep it reading the latest props.
  const onDismissRef = useRef(onDismiss);
  const enabledRef = useRef(enabled);
  useEffect(() => {
    onDismissRef.current = onDismiss;
    enabledRef.current = enabled;
  }, [onDismiss, enabled]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        enabledRef.current &&
        g.dy > DRAG_SLOP &&
        Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => translateY.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_, g) => {
        const shouldDismiss =
          g.dy > height.current * DISMISS_DISTANCE_RATIO ||
          g.vy > DISMISS_VELOCITY;
        if (shouldDismiss) {
          Animated.timing(translateY, {
            toValue: height.current,
            duration: DISMISS_DURATION_MS,
            useNativeDriver: true,
          }).start(() => onDismissRef.current());
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () =>
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start(),
    }),
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    height.current = e.nativeEvent.layout.height;
  };

  return (
    <Animated.View
      style={[style, {transform: [{translateY}]}]}
      onLayout={onLayout}
      {...panResponder.panHandlers}>
      <View style={styles.handleArea}>
        <View style={styles.handle} />
      </View>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  handleArea: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.border,
  },
});
