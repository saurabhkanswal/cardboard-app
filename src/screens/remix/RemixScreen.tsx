import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {BlurView} from 'expo-blur';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {ModalVideoPlayer} from '../../components/ModalVideoPlayer';
import {MediaPreview} from '../../components/MediaPreview';
import {SwipeDismissSheet} from '../../components/SwipeDismissSheet';
import {colors, radius, spacing} from '../../theme';
import {useRemixScreenController} from './useRemixScreenController';

/** Minimum gap between the status bar and the top of the sheet. */
const SHEET_TOP_GAP = 24;

/** expo-blur intensity (1–100) for the backdrop over the screen behind. */
const BACKDROP_BLUR = 40;

/**
 * View: pure presentation for the remix modal. Reads its controller and renders
 * the heading, the video, the media picker, the prompt input and the Remix
 * button (only video, input and button while an input is focused). No logic.
 */
export function RemixScreen() {
  const {
    videoUri,
    mediaPrompt,
    mediaHint,
    fields,
    fieldValues,
    onChangeField,
    isInputShown,
    onFocusInput,
    onBlurInput,
    isCompact,
    promptInputId,
    prompt,
    onChangePrompt,
    media,
    onPickMedia,
    onRemoveMedia,
    canAddMore,
    clipCountLabel,
    isPicking,
    canRemix,
    isUploading,
    onRemix,
    onClose,
    onBackdropPress,
    onDismissKeyboard,
    isKeyboardVisible,
    keyboardInset,
  } = useRemixScreenController();
  const insets = useSafeAreaInsets();

  return (
    // Full-screen blurred backdrop (a translucent dark tint on Android, which
    // would need a BlurTargetView around the screen behind) with the sheet
    // pinned to the bottom. The sheet sizes to its content and shrinks (video
    // first) when the space above the keyboard runs out; with the keyboard up
    // the media picker hides. The video stays at the same child slot so its
    // player isn't recreated.
    <BlurView
      tint="dark"
      intensity={BACKDROP_BLUR}
      style={[
        styles.backdrop,
        {
          paddingTop: insets.top + SHEET_TOP_GAP,
          paddingBottom: keyboardInset,
        },
      ]}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onBackdropPress}
        accessibilityRole="button"
        accessibilityLabel={isCompact ? 'Dismiss keyboard' : 'Close'}
      />
      {/* Swipe down to close (not while typing, so drags reach the inputs). Taps on
          the sheet's empty space dismiss the keyboard; its own buttons and inputs
          still take their touches first. */}
      <SwipeDismissSheet
        style={styles.sheet}
        onDismiss={onClose}
        enabled={!isCompact}>
        <Pressable
          onPress={onDismissKeyboard}
          accessible={false}
          style={[
            styles.sheetBody,
            {
              // The iOS keyboard already covers the home indicator.
              paddingBottom:
                (isKeyboardVisible ? 0 : insets.bottom) + spacing.lg,
            },
          ]}>
          <Text style={[styles.heading]}>
            Add your content relevant to video
          </Text>
          <ModalVideoPlayer uri={videoUri} style={styles.video} />

          {isCompact ? null : (
            <>
              <Text style={styles.label}>
                {mediaPrompt}
                {clipCountLabel ? (
                  <Text style={styles.optional}> {clipCountLabel}</Text>
                ) : null}
              </Text>
              {mediaHint ? <Text style={styles.hint}>{mediaHint}</Text> : null}
              {media.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.mediaRow}>
                  {media.map((clip, index) => (
                    <View key={clip.uri} style={styles.mediaItem}>
                      <MediaPreview uri={clip.uri} kind={clip.kind} />
                      <TouchableOpacity
                        style={styles.clearButton}
                        onPress={() => onRemoveMedia(clip.uri)}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove clip ${index + 1}`}>
                        <Text style={styles.clearLabel}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  {canAddMore ? (
                    <TouchableOpacity
                      style={[styles.pickButton, styles.addTile]}
                      onPress={onPickMedia}
                      disabled={isPicking}
                      accessibilityRole="button"
                      accessibilityLabel="Add clip">
                      <Text style={styles.pickLabel}>
                        {isPicking ? '…' : '+ Add'}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </ScrollView>
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
            </>
          )}

          {fields.map(field =>
            isInputShown(field.id) ? (
              <View key={field.id}>
                {isCompact ? null : (
                  <Text style={[styles.label, styles.fieldLabel]}>
                    {field.label}
                    {field.optional ? (
                      <Text style={styles.optional}> Optional</Text>
                    ) : null}
                  </Text>
                )}
                <TextInput
                  style={[styles.fieldInput, isCompact && styles.inputCompact]}
                  value={fieldValues[field.id] ?? ''}
                  onChangeText={text => onChangeField(field.id, text)}
                  onFocus={() => onFocusInput(field.id)}
                  onBlur={onBlurInput}
                  placeholder={field.placeholder}
                  placeholderTextColor={colors.textMuted}
                  maxLength={field.maxLength}
                  returnKeyType="done"
                />
              </View>
            ) : null,
          )}

          {isInputShown(promptInputId) ? (
            <>
              {isCompact ? null : (
                <Text style={[styles.label, styles.fieldLabel]}>
                  Anything else?<Text style={styles.optional}> Optional</Text>
                </Text>
              )}
              <TextInput
                style={[styles.input, isCompact && styles.inputCompact]}
                value={prompt}
                onChangeText={onChangePrompt}
                onFocus={() => onFocusInput(promptInputId)}
                onBlur={onBlurInput}
                placeholder="Describe what to add to the video…"
                placeholderTextColor={colors.textMuted}
                multiline
              />
            </>
          ) : null}

          <TouchableOpacity
            style={[
              styles.remixButton,
              !canRemix && styles.remixButtonDisabled,
            ]}
            onPress={onRemix}
            disabled={!canRemix}
            accessibilityRole="button">
            <Text style={styles.remixLabel}>
              {isUploading ? 'Uploading…' : 'Remix'}
            </Text>
          </TouchableOpacity>
        </Pressable>
      </SwipeDismissSheet>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    flexShrink: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
  },
  sheetBody: {
    flexShrink: 1,
    padding: spacing.lg,
    // The grab handle above supplies the rest of the top gap.
    paddingTop: spacing.md,
  },
  heading: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  video: {
    // Gives up height first when the sheet is capped (contentFit="contain" letterboxes).
    flexShrink: 1,
  },
  inputCompact: {
    // The label above is hidden while typing, so keep a gap from the video.
    marginTop: spacing.lg,
  },
  label: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  optional: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '400',
  },
  fieldInput: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    color: colors.text,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  mediaRow: {
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  mediaItem: {
    alignItems: 'center',
  },
  clearButton: {
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
  addTile: {
    // Matches MediaPreview's square.
    width: 96,
    height: 96,
    justifyContent: 'center',
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
    // Caps multiline growth so the sheet can't outgrow the space above the keyboard.
    maxHeight: 140,
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
