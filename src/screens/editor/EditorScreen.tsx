import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Compositor} from '../../components/compositor/Compositor';
import {Scrubber} from '../../components/Scrubber';
import {colors, spacing} from '../../theme';
import {useEditorScreenController} from './useEditorScreenController';

/** View: live Skia preview of the project's timeline, transport controls, status. */
export function EditorScreen() {
  const c = useEditorScreenController();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, {paddingBottom: insets.bottom + spacing.md}]}>
      <View
        style={styles.previewArea}
        onLayout={e =>
          c.onPreviewLayout({
            width: e.nativeEvent.layout.width,
            height: e.nativeEvent.layout.height,
          })
        }>
        {c.timeline && c.previewWidth > 0 ? (
          <Compositor
            scene={c.timeline}
            width={c.previewWidth}
            clock={c.clock}
            onCodeBaked={c.onCodeBaked}
          />
        ) : (
          <ActivityIndicator color={colors.textMuted} />
        )}
      </View>

      <View style={styles.statusRow}>
        {c.isBusy ? <ActivityIndicator size="small" color={colors.accent} /> : null}
        <Text
          style={[styles.status, c.isError && styles.statusError]}
          numberOfLines={2}>
          {c.statusLabel}
        </Text>
      </View>
      <Text style={styles.meta}>{c.revLabel}</Text>
      {c.templateError ? (
        <Text style={[styles.meta, styles.statusError]} numberOfLines={2}>
          {c.templateError}
        </Text>
      ) : null}

      <View style={styles.transport}>
        <TouchableOpacity
          style={[styles.playButton, c.duration === 0 && styles.disabled]}
          onPress={c.onTogglePlay}
          disabled={c.duration === 0}
          accessibilityRole="button"
          accessibilityLabel={c.isPlaying ? 'Pause' : 'Play'}>
          <Text style={styles.playLabel}>{c.isPlaying ? '❚❚' : '▶'}</Text>
        </TouchableOpacity>
        <View style={styles.scrubber}>
          <Scrubber
            playhead={c.clock.playhead}
            duration={c.duration}
            onScrub={c.onScrub}
            onScrubStart={c.onScrubStart}
          />
        </View>
        <Text style={styles.time}>
          {c.timeLabel} / {c.durationLabel}
        </Text>
      </View>

      {c.statsLabel ? <Text style={styles.devHud}>{c.statsLabel}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  previewArea: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  status: {color: colors.text, fontSize: 15, fontWeight: '600', flexShrink: 1},
  statusError: {color: colors.danger},
  meta: {color: colors.textMuted, fontSize: 12, paddingHorizontal: spacing.lg, marginTop: spacing.xs},
  transport: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playLabel: {color: colors.text, fontSize: 16},
  disabled: {opacity: 0.4},
  scrubber: {flex: 1},
  time: {color: colors.textMuted, fontVariant: ['tabular-nums'], fontSize: 12},
  devHud: {
    color: colors.warning,
    fontSize: 10,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xs,
    fontVariant: ['tabular-nums'],
  },
});
