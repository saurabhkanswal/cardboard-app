import React, {useEffect} from 'react';
import {Pressable, StyleSheet} from 'react-native';
import {useVideoPlayer, VideoView} from 'expo-video';
import {colors, radius, TILE_HEIGHT, TILE_WIDTH} from '../theme';

interface VideoTileProps {
  uri: string;
  /**
   * Whether to hold a video player at all. Off-screen tiles pass false so they
   * release their decoder and show the placeholder instead. Defaults to true.
   */
  shouldLoad?: boolean;
  shouldPlay: boolean;
  videoId?: string;
  /** Stable tap handler. Receives the tile's id + uri so callers can route. */
  onPress?: (videoId: string, uri: string) => void;
}

/**
 * Stateless, prop-driven video tile. It owns its own expo-video player instance
 * (a rendering concern) but only obeys `uri` and `shouldPlay` — no business logic.
 *
 * - muted, looping, no controls, cover fit
 * - built-in caching via `useCaching`
 * - neutral placeholder behind the player until the first frame renders, or
 *   instead of the player while `shouldLoad` is false
 * - optional `onPress` wraps the tile in a Pressable (the VideoView keeps
 *   `pointerEvents="none"` so the tap reaches the Pressable)
 */
function VideoTileComponent({
  uri,
  shouldLoad = true,
  shouldPlay,
  videoId,
  onPress,
}: VideoTileProps) {
  return (
    <Pressable
      style={styles.container}
      onPress={onPress ? () => onPress(videoId ?? '', uri) : undefined}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}>
      {shouldLoad ? <TilePlayer uri={uri} shouldPlay={shouldPlay} /> : null}
    </Pressable>
  );
}

/** Mounted only while the tile is loaded, so the player is created and released with it. */
function TilePlayer({uri, shouldPlay}: {uri: string; shouldPlay: boolean}) {
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
    <VideoView
      style={styles.video}
      player={player}
      contentFit="cover"
      nativeControls={false}
      pointerEvents="none"
    />
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
 * Memoised: a tile only re-renders when its `uri`, `shouldLoad` or `shouldPlay` changes, so
 * scrolling one rail doesn't re-render tiles in others.
 */
export const VideoTile = React.memo(VideoTileComponent);
