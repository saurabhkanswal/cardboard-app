import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
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
import {QrScanner} from '../../components/QrScanner';
import {SwipeDismissSheet} from '../../components/SwipeDismissSheet';
import {colors, radius, spacing} from '../../theme';
import {usePairingScreenController} from './usePairingScreenController';

/** Minimum gap between the status bar and the top of the sheet. */
const SHEET_TOP_GAP = 24;

/** expo-blur intensity (1–100) for the backdrop over the screen behind. */
const BACKDROP_BLUR = 40;

const STATUS_LABEL = {
  unpaired: 'Not paired',
  connecting: 'Connecting…',
  connected: 'Connected',
  disconnected: 'Disconnected — retrying',
} as const;

const STATUS_COLOR = {
  unpaired: colors.textMuted,
  connecting: colors.warning,
  connected: colors.success,
  disconnected: colors.danger,
} as const;

/** View: pairing with the laptop bridge (scan QR or paste code) + live status. */
export function PairingScreen() {
  const c = usePairingScreenController();
  const insets = useSafeAreaInsets();

  return (
    // Same shape as the remix modal: blurred backdrop with a bottom sheet that
    // sizes to its content and scrolls only once it runs out of room.
    <BlurView
      tint="dark"
      intensity={BACKDROP_BLUR}
      style={[styles.backdrop, {paddingTop: insets.top + SHEET_TOP_GAP}]}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={c.onClose}
        accessibilityRole="button"
        accessibilityLabel="Close"
      />
      <KeyboardAvoidingView
        style={styles.keyboardAvoider}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SwipeDismissSheet style={styles.sheet} onDismiss={c.onClose} enabled>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[
              styles.content,
              {paddingBottom: insets.bottom + spacing.lg},
            ]}
            keyboardShouldPersistTaps="handled">
            <Text style={styles.heading}>Bridge</Text>
            <Text style={styles.intro}>
              Remixing and editing run on your laptop, where the Cardboard bridge
              works with Claude. Pair once to connect this phone to it.
            </Text>
            <View style={styles.statusRow}>
              <View
                style={[styles.dot, {backgroundColor: STATUS_COLOR[c.status]}]}
              />
              <Text style={styles.statusLabel}>{STATUS_LABEL[c.status]}</Text>
            </View>
            {c.bridgeName ? (
              <Text style={styles.muted}>
                {c.bridgeName} · {c.bridgeUrl}
              </Text>
            ) : (
              <Text style={styles.muted}>
                Run `npm run dev` in cardboard-bridge on your laptop (same
                Wi-Fi).
              </Text>
            )}

            {c.isScanning ? (
              <View style={styles.section}>
                <QrScanner onScan={c.onScan} active={!c.isChecking} />
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={c.onStopScan}
                  accessibilityRole="button">
                  <Text style={styles.secondaryLabel}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.primaryButton, styles.section]}
                onPress={c.onStartScan}
                accessibilityRole="button">
                <Text style={styles.primaryLabel}>
                  {c.bridgeName ? 'Re-pair: scan QR' : 'Scan pairing QR'}
                </Text>
              </TouchableOpacity>
            )}

            <Text style={styles.label}>Or paste the pairing code</Text>
            <TextInput
              style={styles.input}
              value={c.code}
              onChangeText={c.onChangeCode}
              placeholder='{"v":…,"url":"http://…","token":"…"}'
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              multiline
            />
            <TouchableOpacity
              style={[
                styles.primaryButton,
                (c.code.trim() === '' || c.isChecking) && styles.disabled,
              ]}
              onPress={c.onSubmitCode}
              disabled={c.code.trim() === '' || c.isChecking}
              accessibilityRole="button">
              <Text style={styles.primaryLabel}>
                {c.isChecking ? 'Checking…' : 'Connect'}
              </Text>
            </TouchableOpacity>

            {c.error ? <Text style={styles.error}>{c.error}</Text> : null}

            {c.bridgeName ? (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={c.onUnpair}
                accessibilityRole="button">
                <Text style={styles.secondaryLabel}>Forget bridge</Text>
              </TouchableOpacity>
            ) : null}
          </ScrollView>
        </SwipeDismissSheet>
      </KeyboardAvoidingView>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  backdrop: {flex: 1, justifyContent: 'flex-end'},
  keyboardAvoider: {flexShrink: 1},
  sheet: {
    flexShrink: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
  },
  // flexGrow 0: size to the content instead of filling the screen.
  scroll: {flexGrow: 0},
  // The grab handle above supplies the rest of the top gap.
  content: {padding: spacing.lg, paddingTop: spacing.md},
  heading: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  intro: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  statusRow: {flexDirection: 'row', alignItems: 'center'},
  dot: {width: 10, height: 10, borderRadius: 5, marginRight: spacing.sm},
  statusLabel: {color: colors.text, fontSize: 18, fontWeight: '700'},
  muted: {color: colors.textMuted, marginTop: spacing.xs},
  section: {marginTop: spacing.xl},
  label: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    color: colors.text,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 88,
    textAlignVertical: 'top',
    fontFamily: Platform.select({ios: 'Menlo', default: 'monospace'}),
    marginBottom: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryLabel: {color: colors.text, fontSize: 16, fontWeight: '700'},
  secondaryButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  secondaryLabel: {color: colors.textMuted, fontWeight: '600'},
  disabled: {opacity: 0.4},
  error: {color: colors.danger, marginTop: spacing.md},
});
