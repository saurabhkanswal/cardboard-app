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
import {SectionRail} from '../../components/SectionRail';
import type {Section} from '../../viewmodel/showcase/types';
import {colors, spacing} from '../../theme';
import {useShowcaseScreenController} from './useShowcaseScreenController';

/**
 * View: pure presentation. Reads its controller and hands data to components.
 * No business logic, no data fetching, no model imports.
 */
export function ShowcaseScreen() {
  const {
    sections,
    isLoading,
    error,
    playingIds,
    retry,
    viewabilityConfig,
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
        playingIds={playingIds}
        onViewableItemsChanged={getViewabilityHandler(item.id)}
        viewabilityConfig={viewabilityConfig}
        onPressVideo={onPressVideo}
      />
    ),
    [playingIds, getViewabilityHandler, viewabilityConfig, onPressVideo],
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
        paddingTop: insets.top + spacing.lg,
        paddingBottom: insets.bottom + spacing.lg,
      }}
      data={sections}
      renderItem={renderSection}
      keyExtractor={section => section.id}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
