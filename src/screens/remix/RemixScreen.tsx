import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {ModalVideoPlayer} from '../../components/ModalVideoPlayer';
import {MediaPreview} from '../../components/MediaPreview';
import {colors, spacing} from '../../theme';
import {useRemixScreenController} from './useRemixScreenController';

/**
 * View: pure presentation for the remix modal. Reads its controller and renders
 * the video, the media picker, the prompt input and the Remix button. No logic.
 */
export function RemixScreen() {
  const {
    videoUri,
    prompt,
    onChangePrompt,
    media,
    onPickMedia,
    clearMedia,
    isPicking,
    canRemix,
    isUploading,
    onRemix,
  } = useRemixScreenController();
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {paddingBottom: insets.bottom + spacing.xl},
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <ModalVideoPlayer uri={videoUri} />

        <Text style={styles.label}>Add your talk-to-camera video</Text>
        {media ? (
          <View style={styles.mediaRow}>
            <MediaPreview uri={media.uri} kind={media.kind} />
            <TouchableOpacity
              style={styles.clearButton}
              onPress={clearMedia}
              accessibilityRole="button">
              <Text style={styles.clearLabel}>Remove</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.pickButton}
            onPress={onPickMedia}
            disabled={isPicking}
            accessibilityRole="button">
            <Text style={styles.pickLabel}>
              {isPicking ? 'Opening…' : '+ Choose from library'}
            </Text>
          </TouchableOpacity>
        )}

        <Text style={styles.label}>What do you want to add?</Text>
        <TextInput
          style={styles.input}
          value={prompt}
          onChangeText={onChangePrompt}
          placeholder="Describe what to add to the video…"
          placeholderTextColor={colors.textMuted}
          multiline
        />

        <TouchableOpacity
          style={[styles.remixButton, !canRemix && styles.remixButtonDisabled]}
          onPress={onRemix}
          disabled={!canRemix}
          accessibilityRole="button">
          <Text style={styles.remixLabel}>
            {isUploading ? 'Uploading…' : 'Remix'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  label: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  mediaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearButton: {
    marginLeft: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  clearLabel: {
    color: colors.textMuted,
    fontWeight: '600',
  },
  pickButton: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  pickLabel: {
    color: colors.accent,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    color: colors.text,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 88,
    textAlignVertical: 'top',
  },
  remixButton: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  remixButtonDisabled: {
    opacity: 0.4,
  },
  remixLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
});
