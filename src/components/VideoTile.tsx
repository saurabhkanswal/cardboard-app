import React, {useEffect, useState} from 'react';
import {PixelRatio, Pressable, StyleSheet} from 'react-native';
import {Image} from 'expo-image';
import {useVideoPlayer, VideoView, type VideoThumbnail} from 'expo-video';
import {colors, radius, TILE_HEIGHT, TILE_WIDTH} from '../theme';
import {thumbnailCache} from './videoThumbnailCache';

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
  /** Defaults to the rail tile size (TILE_WIDTH × TILE_HEIGHT). */
  width?: number;
  height?: number;
}

/**
 * Stateless, prop-driven video tile. It owns its own expo-video player instance
 * (a rendering concern) but only obeys `uri` and `shouldPlay` — no business logic.
 *
 * - muted, looping, no controls, cover fit
 * - built-in caching via `useCaching` (remote URIs only)
 * - first-frame thumbnail (generated once per uri, cached for the session) behind
 *   the player until it renders its first frame, and instead of the player while
 *   `shouldLoad` is false — so scrolling back never shows a blank tile
 * - optional `onPress` wraps the tile in a Pressable (the VideoView keeps
 *   `pointerEvents="none"` so the tap reaches the Pressable)
 */
function VideoTileComponent({
  uri,
  shouldLoad = true,
  shouldPlay,
  videoId,
  onPress,
  width = TILE_WIDTH,
  height = TILE_HEIGHT,
}: VideoTileProps) {
  const [thumbnail, setThumbnail] = useState(() => thumbnailCache.get(uri));

  return (
    <Pressable
      style={[styles.container, {width, height}]}
      onPress={onPress ? () => onPress(videoId ?? '', uri) : undefined}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}>
      {thumbnail ? <Image style={styles.fill} source={thumbnail} contentFit="cover" /> : null}
      {shouldLoad ? (
        <TilePlayer uri={uri} shouldPlay={shouldPlay} onThumbnail={setThumbnail} />
      ) : null}
    </Pressable>
  );
}

// URLs repeat across rails, so one cached frame (see videoThumbnailCache) serves them all.
const THUMBNAIL_MAX_WIDTH = PixelRatio.getPixelSizeForLayoutSize(TILE_WIDTH);

interface TilePlayerProps {
  uri: string;
  shouldPlay: boolean;
  onThumbnail: (thumbnail: VideoThumbnail) => void;
}

/** Mounted only while the tile is loaded, so the player is created and released with it. */
function TilePlayer({uri, shouldPlay, onThumbnail}: TilePlayerProps) {
  // Local files (kept exports) have nothing to cache.
  const player = useVideoPlayer({uri, useCaching: !uri.startsWith('file:')}, p => {
    p.muted = true;
    p.loop = true;
  });
  // Hidden until it has a frame to show, so the thumbnail isn't covered by an empty surface.
  const [hasFrame, setHasFrame] = useState(false);

  useEffect(() => {
    const cached = thumbnailCache.get(uri);
    if (cached) {
      onThumbnail(cached);
      return;
    }
    let cancelled = false;
    player
      .generateThumbnailsAsync(0, {maxWidth: THUMBNAIL_MAX_WIDTH})
      .then(([thumbnail]) => {
        if (thumbnail) {
          thumbnailCache.set(uri, thumbnail);
          if (!cancelled) {
            onThumbnail(thumbnail);
          }
        }
      })
      // A missing thumbnail just leaves the placeholder; the video still plays.
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [uri, player, onThumbnail]);

  useEffect(() => {
    if (shouldPlay) {
      player.play();
    } else {
      player.pause();
    }
  }, [shouldPlay, player]);

  return (
    <VideoView
      style={[styles.fill, !hasFrame && styles.hidden]}
      player={player}
      contentFit="cover"
      nativeControls={false}
      pointerEvents="none"
      onFirstFrameRender={() => setHasFrame(true)}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.tile,
    overflow: 'hidden',
    backgroundColor: colors.placeholder,
  },
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  hidden: {
    opacity: 0,
  },
});

/**
 * Memoised: a tile only re-renders when its `uri`, `shouldLoad` or `shouldPlay` changes, so
 * scrolling one rail doesn't re-render tiles in others.
 */
export const VideoTile = React.memo(VideoTileComponent);
