import React, {useEffect, useState} from 'react';
import {PixelRatio, StyleSheet, View} from 'react-native';
import {Image} from 'expo-image';
import {useVideoPlayer, VideoView} from 'expo-video';
import {colors, radius} from '../theme';
import {thumbnailCache} from './videoThumbnailCache';

interface LoopingClipProps {
  /** A bundled clip (`require('…/clip.mp4')`) or a remote uri. */
  source: number | string;
  width: number;
  height: number;
  playing: boolean;
}

/**
 * A muted, looping, control-less clip in a rounded frame. The player is created
 * with the component and released when it unmounts. Its first frame is cached per
 * source, so a remounted clip (e.g. turning back a step) shows it at once while the
 * player loads.
 */
export function LoopingClip({
  source,
  width,
  height,
  playing,
}: LoopingClipProps) {
  const player = useVideoPlayer(source, p => {
    p.muted = true;
    p.loop = true;
  });
  const [thumbnail, setThumbnail] = useState(() => thumbnailCache.get(source));
  // Hidden until it has a frame, so the thumbnail isn't covered by an empty surface.
  const [hasFrame, setHasFrame] = useState(false);

  useEffect(() => {
    if (thumbnailCache.has(source)) {
      return;
    }
    let cancelled = false;
    player
      .generateThumbnailsAsync(0, {
        maxWidth: PixelRatio.getPixelSizeForLayoutSize(width),
      })
      .then(([frame]) => {
        if (frame) {
          thumbnailCache.set(source, frame);
          if (!cancelled) {
            setThumbnail(frame);
          }
        }
      })
      // A missing thumbnail just leaves the placeholder; the video still plays.
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [source, player, width]);

  useEffect(() => {
    if (playing) {
      player.play();
    } else {
      player.pause();
    }
  }, [playing, player]);

  return (
    <View style={[styles.frame, {width, height}]}>
      {thumbnail ? (
        <Image
          style={StyleSheet.absoluteFill}
          source={thumbnail}
          contentFit="cover"
        />
      ) : null}
      <VideoView
        style={[StyleSheet.absoluteFill, !hasFrame && styles.hidden]}
        player={player}
        contentFit="cover"
        nativeControls={false}
        pointerEvents="none"
        onFirstFrameRender={() => setHasFrame(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: radius.tile,
    overflow: 'hidden',
    backgroundColor: colors.placeholder,
  },
  hidden: {
    opacity: 0,
  },
});
