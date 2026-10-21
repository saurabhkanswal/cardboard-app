import React from 'react';
import {Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {colors, radius, spacing} from '../theme';
import {UndoIcon} from './UndoIcon';

interface ChatComposerProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  /** Input accepts text (the button may still be disabled for an empty draft). */
  editable: boolean;
  /** Shows Stop instead of Send. */
  isRunning: boolean;
  canSend: boolean;
  onSend: () => void;
  onStop: () => void;
  /** Undo chip above the input; hidden when `onUndo` is undefined. */
  onUndo?: () => void;
}

/**
 * Claude/ChatGPT-style composer: a rounded field with the text input and a round
 * Send/Stop button inside it, plus an optional Undo chip above. Stateless.
 */
export function ChatComposer({
  value,
  onChangeText,
  placeholder,
  editable,
  isRunning,
  canSend,
  onSend,
  onStop,
  onUndo,
}: ChatComposerProps) {
  const buttonDisabled = !isRunning && !canSend;
  return (
    <View style={styles.container}>
      {onUndo ? (
        <Pressable
          style={styles.chip}
          onPress={onUndo}
          accessibilityRole="button"
          accessibilityLabel="Undo last change">
          <UndoIcon size={14} color={colors.textSoft} />
          <Text style={styles.chipLabel}>Undo</Text>
        </Pressable>
      ) : null}
      <View style={styles.field}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          editable={editable}
          multiline
          maxLength={2000}
        />
        <Pressable
          style={[styles.button, buttonDisabled && styles.buttonDisabled]}
          onPress={isRunning ? onStop : onSend}
          disabled={buttonDisabled}
          hitSlop={spacing.sm}
          accessibilityRole="button"
          accessibilityLabel={isRunning ? 'Stop editing' : 'Send'}>
          {isRunning ? (
            <View style={styles.stopIcon} />
          ) : (
            <Text style={[styles.sendIcon, buttonDisabled && styles.sendIconDisabled]}>
              ↑
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const BUTTON_SIZE = 34;
/** Inset of the button from the field's edge; also the field's vertical padding. */
const FIELD_INSET = 7;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  chip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginLeft: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.bubble,
    backgroundColor: colors.composer,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  chipLabel: {color: colors.textSoft, fontSize: 13, fontWeight: '500'},
  field: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingLeft: spacing.lg,
    paddingRight: FIELD_INSET,
    paddingVertical: FIELD_INSET,
    borderRadius: radius.composer,
    backgroundColor: colors.composer,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
  },
  input: {
    flex: 1,
    minHeight: BUTTON_SIZE,
    maxHeight: 140,
    // Centres one line against the button; grows upward from there.
    paddingTop: 7,
    paddingBottom: 7,
    paddingHorizontal: 0,
    marginRight: spacing.sm,
    color: colors.text,
    fontSize: 16,
    lineHeight: 20,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {backgroundColor: colors.divider},
  sendIcon: {color: colors.textOnLight, fontSize: 19, fontWeight: '800', lineHeight: 22},
  sendIconDisabled: {color: colors.textMuted},
  stopIcon: {width: 11, height: 11, borderRadius: 2, backgroundColor: colors.textOnLight},
});
