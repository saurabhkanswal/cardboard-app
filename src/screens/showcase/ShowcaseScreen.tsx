import React, {useCallback, useLayoutEffect} from 'react';
import {
  ActivityIndicator,
  FlatList,
  type ListRenderItem,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {ConnectAIButton} from '../../components/ConnectAIButton';
import {HeroHeading, type HeroTerm} from '../../components/HeroHeading';
import {ProjectTile} from '../../components/ProjectTile';
import {SectionRail} from '../../components/SectionRail';
import {type SegmentedTab, SegmentedTabs} from '../../components/SegmentedTabs';
import {colors, spacing} from '../../theme';
import {
  type ShowcaseItem,
  type ShowcaseTab,
  useShowcaseScreenController,
} from './useShowcaseScreenController';

const HERO_TERMS: HeroTerm[] = [
  {label: 'Content Creators', color: colors.heroCreators},
  {label: 'YouTubers', color: colors.heroYoutube},
  {label: 'Influencers', color: colors.heroClaude},
];

const TABS: SegmentedTab<ShowcaseTab>[] = [
  {key: 'recipes', label: 'Recipes'},
  {key: 'projects', label: 'Your projects'},
];

/**
 * View: pure presentation. Reads its controller and hands data to components.
 * No business logic, no data fetching, no model imports.
 */
export function ShowcaseScreen() {
  const {
    activeTab,
    setActiveTab,
    items,
    isProjectsEmpty,
    projectTileWidth,
    projectTileHeight,
    projectGap,
    onPressProject,
    isLoading,
    error,
    loadedIds,
    playingIds,
    retry,
    viewabilityConfig,
    sectionViewabilityConfig,
    onSectionsViewableChanged,
    getViewabilityHandler,
    onPressVideo,
    onPressConnect,
  } = useShowcaseScreenController();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  // The header button lives here, not in navigation.tsx: `app/` may not import
  // `components/`.
  const renderConnectButton = useCallback(
    () => <ConnectAIButton onPress={onPressConnect} />,
    [onPressConnect],
  );
  useLayoutEffect(() => {
    navigation.setOptions({headerRight: renderConnectButton});
  }, [navigation, renderConnectButton]);

  const renderItem: ListRenderItem<ShowcaseItem> = useCallback(
    ({item}) =>
      item.kind === 'rail' ? (
        <SectionRail
          sectionId={item.section.id}
          title={item.section.title}
          videos={item.section.videos}
          loadedIds={loadedIds}
          playingIds={playingIds}
          onViewableItemsChanged={getViewabilityHandler(item.section.id)}
          viewabilityConfig={viewabilityConfig}
          onPressVideo={onPressVideo}
        />
      ) : (
        <View style={[styles.projectRow, {gap: projectGap, marginBottom: projectGap}]}>
          {item.row.projects.map(project => (
            <ProjectTile
              key={project.id}
              id={project.id}
              uri={project.uri}
              dateLabel={project.dateLabel}
              durationLabel={project.durationLabel}
              width={projectTileWidth}
              height={projectTileHeight}
              shouldLoad={loadedIds.has(project.id)}
              shouldPlay={playingIds.has(project.id)}
              onPress={onPressProject}
            />
          ))}
        </View>
      ),
    [
      loadedIds,
      playingIds,
      getViewabilityHandler,
      viewabilityConfig,
      onPressVideo,
      projectGap,
      projectTileWidth,
      projectTileHeight,
      onPressProject,
    ],
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>Couldn't load the showcase.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={retry}>
          <Text style={styles.retryLabel}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{
        paddingTop: spacing.xl + spacing.xl + spacing.lg,
        paddingBottom: insets.bottom + spacing.xl,
      }}
      data={items}
      renderItem={renderItem}
      keyExtractor={item => item.id}
      ListHeaderComponent={
        <>
          <HeroHeading
            title={"Make viral reels,\nin minutes"}
            prefix="Built for"
            terms={HERO_TERMS}
          />
          <View style={styles.divider} />
          <View style={styles.tabs}>
            <SegmentedTabs
              tabs={TABS}
              activeKey={activeTab}
              onChange={setActiveTab}
            />
          </View>
        </>
      }
      ListEmptyComponent={
        isProjectsEmpty ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No projects yet</Text>
            <Text style={styles.emptyText}>
              Remix a recipe and export it — your videos will show up here.
            </Text>
          </View>
        ) : undefined
      }
      onViewableItemsChanged={onSectionsViewableChanged}
      viewabilityConfig={sectionViewabilityConfig}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginTop: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.divider,
  },
  tabs: {
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  projectRow: {
    // Keep in sync with PROJECT_GUTTER in the controller (tile width is fitted to it).
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
  },
  empty: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {color: colors.text, fontSize: 17, fontWeight: '600'},
  emptyText: {color: colors.textMuted, fontSize: 14, textAlign: 'center'},
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  retryButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  retryLabel: {
    color: colors.text,
    fontWeight: '600',
  },
});
