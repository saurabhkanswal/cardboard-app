import React from 'react';
import {Image, StyleSheet, View} from 'react-native';
import {useVideoPlayer, VideoView} from 'expo-video';
import {colors, radius} from '../theme';

/**
 * Local prop shape — `components/` must not import `viewmodel/`, so the kind is
 * passed as a plain string the screen adapts from its domain `PickedMedia`.
 */
interface MediaPreviewProps {
  uri: string;
  kind: 'image' | 'video';
}

function VideoPreview({uri}: {uri: string}) {
  const player = useVideoPlayer({uri, useCaching: true}, p => {
    p.muted = true;
    p.loop = true;
    p.play();
  });
  return (
    <VideoView
      style={styles.media}
      player={player}
      contentFit="cover"
      nativeControls={false}
      pointerEvents="none"
    />
  );
}

/** Thumbnail preview of the picked asset — an image or a muted, looping video. */
function MediaPreviewComponent({uri, kind}: MediaPreviewProps) {
  return (
    <View style={styles.container}>
      {kind === 'video' ? (
        <VideoPreview uri={uri} />
      ) : (
        <Image style={styles.media} source={{uri}} resizeMode="cover" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 96,
    height: 96,
    borderRadius: radius.tile,
    overflow: 'hidden',
    backgroundColor: colors.placeholder,
  },
  media: {
    width: '100%',
    height: '100%',
  },
});

export const MediaPreview = React.memo(MediaPreviewComponent);
