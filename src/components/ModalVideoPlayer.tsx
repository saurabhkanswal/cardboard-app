import React from 'react';
import {StyleSheet, View, type StyleProp, type ViewStyle} from 'react-native';
import {useVideoPlayer, VideoView} from 'expo-video';
import {colors, radius} from '../theme';

interface ModalVideoPlayerProps {
  uri: string;
  /** Layout overrides for the frame (e.g. letting it shrink in a tight sheet). */
  style?: StyleProp<ViewStyle>;
}

/**
 * Stateless, prop-driven player for the remix modal. Owns its own `expo-video`
 * player instance (a rendering concern) — looping, autoplaying, with native
 * controls so the user can scrub/pause. Obeys only its `uri`.
 */
function ModalVideoPlayerComponent({uri, style}: ModalVideoPlayerProps) {
  // Local files (kept exports) have nothing to cache.
  const player = useVideoPlayer({uri, useCaching: !uri.startsWith('file:')}, p => {
    p.loop = true;
    p.play();
  });

  return (
    <View style={[styles.container, style]}>
      <VideoView
        style={styles.video}
        player={player}
        contentFit="contain"
        nativeControls
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radius.tile,
    overflow: 'hidden',
    backgroundColor: colors.placeholder,
  },
  video: {
    width: '100%',
    height: '100%',
  },
});

export const ModalVideoPlayer = React.memo(ModalVideoPlayerComponent);
