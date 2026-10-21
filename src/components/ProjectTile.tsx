import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {VideoTile} from './VideoTile';
import {colors, spacing} from '../theme';

/** Height of the caption row under the video; the grid adds it to the item height. */
export const PROJECT_CAPTION_HEIGHT = 28;

interface ProjectTileProps {
  id: string;
  uri: string;
  dateLabel: string;
  durationLabel: string;
  width: number;
  height: number;
  shouldLoad: boolean;
  shouldPlay: boolean;
  /** Stable tap handler; receives the project id. */
  onPress: (id: string) => void;
}

/** One exported project in the "Your projects" grid: a muted preview, date and length. */
function ProjectTileComponent({
  id,
  uri,
  dateLabel,
  durationLabel,
  width,
  height,
  shouldLoad,
  shouldPlay,
  onPress,
}: ProjectTileProps) {
  return (
    <View style={{width}}>
      <VideoTile
        videoId={id}
        uri={uri}
        width={width}
        height={height}
        shouldLoad={shouldLoad}
        shouldPlay={shouldPlay}
        onPress={onPress}
      />
      <View style={styles.caption}>
        <Text style={styles.date}>{dateLabel}</Text>
        <Text style={styles.duration}>{durationLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  caption: {
    height: PROJECT_CAPTION_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  date: {color: colors.text, fontSize: 13, fontWeight: '600'},
  duration: {color: colors.textMuted, fontSize: 12, fontVariant: ['tabular-nums']},
});

export const ProjectTile = React.memo(ProjectTileComponent);
