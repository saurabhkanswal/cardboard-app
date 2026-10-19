import React, {useCallback} from 'react';
import {
  ActivityIndicator,
  FlatList,
  type ListRenderItem,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {HeroHeading, type HeroTerm} from '../../components/HeroHeading';
import {SectionRail} from '../../components/SectionRail';
import {type SegmentedTab, SegmentedTabs} from '../../components/SegmentedTabs';
import type {Section} from '../../viewmodel/showcase/types';
import {colors, spacing} from '../../theme';
import {
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
    sections,
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
  } = useShowcaseScreenController();
  const insets = useSafeAreaInsets();

  const renderSection: ListRenderItem<Section> = useCallback(
    ({item}) => (
      <SectionRail
        sectionId={item.id}
        title={item.title}
        videos={item.videos}
        loadedIds={loadedIds}
        playingIds={playingIds}
        onViewableItemsChanged={getViewabilityHandler(item.id)}
        viewabilityConfig={viewabilityConfig}
        onPressVideo={onPressVideo}
      />
    ),
    [
      loadedIds,
      playingIds,
      getViewabilityHandler,
      viewabilityConfig,
      onPressVideo,
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
      data={sections}
      renderItem={renderSection}
      keyExtractor={section => section.id}
      ListHeaderComponent={
        <>
          <HeroHeading
            title="Viral reels, in minutes"
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
