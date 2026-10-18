import React, {useEffect} from 'react';
import {StyleSheet, View} from 'react-native';
import {useVideoPlayer, VideoView} from 'expo-video';
import {colors, radius, TILE_HEIGHT, TILE_WIDTH} from '../theme';

interface VideoTileProps {
  uri: string;
  shouldPlay: boolean;
}

/**
 * Stateless, prop-driven video tile. It owns its own expo-video player instance
 * (a rendering concern) but only obeys `uri` and `shouldPlay` — no business logic.
 *
 * - muted, looping, no controls, cover fit
 * - built-in caching via `useCaching`
 * - neutral placeholder behind the player until the first frame renders
 */
function VideoTileComponent({uri, shouldPlay}: VideoTileProps) {
  const player = useVideoPlayer({uri, useCaching: true}, p => {
    p.muted = true;
    p.loop = true;
  });

  useEffect(() => {
    if (shouldPlay) {
      player.play();
    } else {
      player.pause();
    }
  }, [shouldPlay, player]);

  return (
    <View style={styles.container}>
      <VideoView
        style={styles.video}
        player={player}
        contentFit="cover"
        nativeControls={false}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: TILE_WIDTH,
    height: TILE_HEIGHT,
    borderRadius: radius.tile,
    overflow: 'hidden',
    backgroundColor: colors.placeholder,
  },
  video: {
    width: '100%',
    height: '100%',
  },
});

/**
 * Memoised: a tile only re-renders when its `uri` or `shouldPlay` changes, so
 * scrolling one rail doesn't re-render tiles in others.
 */
export const VideoTile = React.memo(VideoTileComponent);
