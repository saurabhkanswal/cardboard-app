import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {colors, spacing} from '../theme';

export interface SegmentedTab<K extends string> {
  key: K;
  label: string;
}

interface SegmentedTabsProps<K extends string> {
  tabs: SegmentedTab<K>[];
  activeKey: K;
  onChange: (key: K) => void;
}

/**
 * Pill-style segmented control: a dark track with the active segment filled light.
 * Stateless — the caller owns which tab is active.
 */
export function SegmentedTabs<K extends string>({
  tabs,
  activeKey,
  onChange,
}: SegmentedTabsProps<K>) {
  return (
    <View style={styles.track} accessibilityRole="tablist">
      {tabs.map(tab => {
        const isActive = tab.key === activeKey;
        return (
          <Pressable
            key={tab.key}
            style={[styles.segment, isActive && styles.segmentActive]}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{selected: isActive}}>
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  segment: {
    paddingHorizontal: spacing.md + 2,
    paddingVertical: 6,
    borderRadius: 9,
  },
  segmentActive: {
    backgroundColor: colors.segmentActive,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  labelActive: {
    color: colors.textOnLight,
  },
});
