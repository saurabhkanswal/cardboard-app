import React, {useCallback} from 'react';
import {
  FlatList,
  type ListRenderItem,
  StyleSheet,
  Text,
  View,
  type ListViewToken as ViewToken,
} from 'react-native';
import {VideoTile} from './VideoTile';
import {colors, spacing, TILE_WIDTH} from '../theme';

/**
 * Minimal item shape this component renders. Declared locally so `components/`
 * never imports from `viewmodel/` — the screen adapts domain data to these props.
 */
export interface RailVideo {
  id: string;
  url: string;
}

interface SectionRailProps {
  sectionId: string;
  title: string;
  videos: RailVideo[];
  /** Tiles that should hold a video player; the rest render a placeholder. */
  loadedIds: Set<string>;
  playingIds: Set<string>;
  onViewableItemsChanged: (info: {viewableItems: ViewToken[]}) => void;
  viewabilityConfig: {itemVisiblePercentThreshold: number};
  onPressVideo: (p: {sectionId: string; videoId: string; uri: string}) => void;
}

const TILE_GAP = spacing.md;

function SectionRailComponent({
  sectionId,
  title,
  videos,
  loadedIds,
  playingIds,
  onViewableItemsChanged,
  viewabilityConfig,
  onPressVideo,
}: SectionRailProps) {
  // One stable handler for the whole rail so tapping doesn't re-render every tile.
  const handlePress = useCallback(
    (videoId: string, uri: string) =>
      onPressVideo({sectionId, videoId, uri}),
    [onPressVideo, sectionId],
  );

  const renderItem: ListRenderItem<RailVideo> = useCallback(
    ({item}) => (
      <View style={styles.tileWrapper}>
        <VideoTile
          videoId={item.id}
          uri={item.url}
          shouldLoad={loadedIds.has(item.id)}
          shouldPlay={playingIds.has(item.id)}
          onPress={handlePress}
        />
      </View>
    ),
    [loadedIds, playingIds, handlePress],
  );

  // URLs repeat across sections, so key by sectionId + videoId.
  const keyExtractor = useCallback(
    (item: RailVideo) => `${sectionId}:${item.id}`,
    [sectionId],
  );

  // Fixed tile size → cheap, exact layout without measurement.
  const getItemLayout = useCallback(
    (_: ArrayLike<RailVideo> | null | undefined, index: number) => ({
      length: TILE_WIDTH + TILE_GAP,
      offset: (TILE_WIDTH + TILE_GAP) * index,
      index,
    }),
    [],
  );

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>{title}</Text>
      <FlatList
        horizontal
        data={videos}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        initialNumToRender={2}
        windowSize={3}
        maxToRenderPerBatch={2}
        contentContainerStyle={styles.railContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  heading: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  railContent: {
    paddingHorizontal: spacing.lg,
  },
  tileWrapper: {
    marginRight: TILE_GAP,
  },
});

export const SectionRail = React.memo(SectionRailComponent);
