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
import {QrScanner} from '../../components/QrScanner';
import {colors, spacing} from '../../theme';
import {usePairingScreenController} from './usePairingScreenController';

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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {paddingBottom: insets.bottom + spacing.xl},
        ]}
        keyboardShouldPersistTaps="handled">
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
            Run `npm run dev` in cardboard-bridge on your laptop (same Wi-Fi).
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  content: {padding: spacing.lg},
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
