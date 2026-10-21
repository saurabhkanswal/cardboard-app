import React, {useState} from 'react';
import {StyleSheet, View, type GestureResponderEvent} from 'react-native';
import Animated, {useAnimatedStyle, type SharedValue} from 'react-native-reanimated';
import {colors} from '../theme';

interface Props {
  playhead: SharedValue<number>;
  duration: number;
  /** Called with timeline seconds while the user drags. */
  onScrub: (seconds: number) => void;
  onScrubStart?: () => void;
}

/**
 * Timeline scrubber. The fill follows the playhead on the UI thread (no React renders
 * per frame); dragging reports positions through `onScrub`.
 */
export function Scrubber({playhead, duration, onScrub, onScrubStart}: Props) {
  const [trackWidth, setTrackWidth] = useState(1);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${duration > 0 ? Math.min(100, (playhead.value / duration) * 100) : 0}%`,
  }));

  const report = (e: GestureResponderEvent) => {
    const x = Math.max(0, Math.min(trackWidth, e.nativeEvent.locationX));
    onScrub((x / trackWidth) * duration);
  };

  return (
    <View
      style={styles.hitArea}
      onLayout={e => setTrackWidth(Math.max(1, e.nativeEvent.layout.width))}
      onStartShouldSetResponder={() => duration > 0}
      onMoveShouldSetResponder={() => duration > 0}
      onResponderGrant={e => {
        onScrubStart?.();
        report(e);
      }}
      onResponderMove={report}
      accessibilityRole="adjustable"
      accessibilityLabel="Timeline">
      <View style={styles.track} pointerEvents="none">
        <Animated.View style={[styles.fill, fillStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hitArea: {height: 32, justifyContent: 'center'},
  track: {
    height: 4,
    borderRadius: 2,
    // Unplayed part; must contrast with the video card's `surface` behind it.
    backgroundColor: colors.divider,
    overflow: 'hidden',
  },
  fill: {height: 4, backgroundColor: colors.accent},
});
