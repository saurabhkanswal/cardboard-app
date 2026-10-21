import React from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {colors, radius, spacing} from '../theme';

interface ExportOverlayProps {
  label: string;
  /** 0–1 while the bridge renders; null hides the bar. */
  progress: number | null;
}

/**
 * Full-screen scrim shown while a video exports. It sits on top of the screen and
 * takes every touch, so nothing underneath can be used until it's removed.
 */
export function ExportOverlay({label, progress}: ExportOverlayProps) {
  return (
    <View style={styles.scrim} accessibilityViewIsModal>
      <View style={styles.card}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.label} accessibilityLiveRegion="polite">
          {label}
        </Text>
        {progress !== null ? (
          <View style={styles.track}>
            <View style={[styles.fill, {width: `${Math.round(progress * 100)}%`}]} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    minWidth: 200,
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: radius.bubble,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  label: {color: colors.text, fontSize: 15, fontWeight: '600'},
  track: {
    alignSelf: 'stretch',
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: {height: '100%', backgroundColor: colors.accent},
});
