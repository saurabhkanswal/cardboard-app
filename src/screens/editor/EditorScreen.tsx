import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {ChatBubble} from '../../components/ChatBubble';
import {ChatComposer} from '../../components/ChatComposer';
import {ExportOverlay} from '../../components/ExportOverlay';
import {HeaderTextButton} from '../../components/HeaderTextButton';
import {Compositor} from '../../components/compositor/Compositor';
import {PlayPauseIcon} from '../../components/PlayPauseIcon';
import {Scrubber} from '../../components/Scrubber';
import {colors, spacing} from '../../theme';
import type {ChatMessage} from '../../viewmodel/editor/chat';
import {useEditorScreenController} from './useEditorScreenController';

const keyOf = (m: ChatMessage) => m.id;

/** Outer corner radius of the video card; the stage inside is inset by its padding. */
const CARD_RADIUS = 18;

const renderMessage = ({item}: {item: ChatMessage}) => (
  <ChatBubble
    kind={item.kind}
    text={item.text}
    isError={item.kind === 'notice' && item.isError}
  />
);

/**
 * View: chat-style editor — live Skia preview + transport on top, the conversation with
 * the director in the middle, and the prompt composer at the bottom.
 */
export function EditorScreen() {
  const c = useEditorScreenController();
  const insets = useSafeAreaInsets();
  const bottomInset = c.keyboardInset > 0 ? c.keyboardInset : insets.bottom;

  return (
    <View
      style={[
        styles.container,
        {paddingTop: insets.top, paddingBottom: bottomInset + spacing.sm},
      ]}>
      <View style={styles.header}>
        {/* Equal-width sides keep the title centred. */}
        <View style={styles.headerSide}>
          <HeaderTextButton label="Cancel" color={colors.cancel} onPress={c.onCancel} />
        </View>
        <Text style={styles.headerTitle}>Editor</Text>
        <View style={[styles.headerSide, styles.headerSideEnd]}>
          <HeaderTextButton
            label="Export"
            onPress={c.onExport}
            disabled={!c.canExport}
          />
        </View>
      </View>
      {/* The video lives in its own card, a black stage with the transport under
          it, so it reads as separate from the chat below. */}
      <View style={styles.card}>
        <View style={[styles.stage, {height: c.previewHeight}]}>
          {c.timeline && c.previewWidth > 0 ? (
            <Compositor scene={c.timeline} width={c.previewWidth} clock={c.clock} />
          ) : (
            <ActivityIndicator color={colors.textMuted} />
          )}
        </View>

        <View style={styles.transport}>
          <TouchableOpacity
            style={[styles.iconButton, c.duration === 0 && styles.disabled]}
            onPress={c.onTogglePlay}
            disabled={c.duration === 0}
            hitSlop={spacing.sm}
            accessibilityRole="button"
            accessibilityLabel={c.isPlaying ? 'Pause' : 'Play'}>
            <PlayPauseIcon isPlaying={c.isPlaying} size={22} color={colors.text} />
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
        {c.templateError ? (
          <Text style={styles.templateError} numberOfLines={2}>
            {c.templateError}
          </Text>
        ) : null}
      </View>

      <FlatList
        ref={c.listRef}
        style={styles.chat}
        contentContainerStyle={styles.chatContent}
        data={c.messages}
        keyExtractor={keyOf}
        renderItem={renderMessage}
        onContentSizeChange={c.onChatContentSizeChange}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        ListEmptyComponent={
          c.isBusy ? undefined : (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>What should we change?</Text>
              <Text style={styles.empty}>
                “Make the captions yellow” · “Cut the first 3 seconds”
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          c.isBusy || c.isError ? (
            <View style={styles.statusRow}>
              {c.isBusy ? <ActivityIndicator size="small" color={colors.accent} /> : null}
              <Text
                style={[styles.status, c.isError && styles.statusError]}
                numberOfLines={2}>
                {c.statusLabel}
              </Text>
            </View>
          ) : undefined
        }
      />

      <ChatComposer
        value={c.draft}
        onChangeText={c.onChangeDraft}
        placeholder={c.composerPlaceholder}
        editable={c.canEdit}
        isRunning={c.isRunning}
        canSend={c.canSend}
        onSend={c.onSend}
        onStop={c.onStop}
        onUndo={c.onUndo}
      />

      {c.isExporting ? (
        <ExportOverlay label={c.exportOverlayLabel} progress={c.exportProgress} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  header: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  headerSide: {flex: 1, alignItems: 'flex-start'},
  headerSideEnd: {alignItems: 'flex-end'},
  headerTitle: {color: colors.text, fontSize: 17, fontWeight: '600'},
  card: {
    // Keep margin + padding in sync with CARD_INSET in the controller.
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: CARD_RADIUS,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  stage: {
    borderRadius: CARD_RADIUS - spacing.sm,
    overflow: 'hidden',
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transport: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  iconButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {opacity: 0.4},
  scrubber: {flex: 1},
  time: {color: colors.textMuted, fontVariant: ['tabular-nums'], fontSize: 12},
  templateError: {
    color: colors.danger,
    fontSize: 11,
    paddingHorizontal: spacing.xs,
    marginTop: spacing.xs,
  },
  chat: {flex: 1, marginTop: spacing.sm},
  chatContent: {paddingHorizontal: spacing.lg, paddingVertical: spacing.md, flexGrow: 1},
  emptyWrap: {flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm},
  emptyTitle: {color: colors.text, fontSize: 20, fontWeight: '600'},
  empty: {color: colors.textMuted, fontSize: 14, textAlign: 'center'},
  statusRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs},
  status: {color: colors.textSoft, fontSize: 13, flexShrink: 1},
  statusError: {color: colors.danger},
});
