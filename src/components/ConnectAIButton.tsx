import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import ClaudeLogo from '../../assets/claude-logo.svg';
import ChatGPTLogo from '../../assets/chatgpt-logo.svg';
import {colors, spacing} from '../theme';

const ICON_SIZE = 20;

interface ConnectAIButtonProps {
  onPress: () => void;
}

/** Header pill showing the Claude + ChatGPT marks; tapping it starts a bridge connection. Stateless. */
export function ConnectAIButton({onPress}: ConnectAIButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={spacing.sm}
      style={({pressed}) => [styles.pill, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel="Connect with Claude or ChatGPT">
      <ClaudeLogo width={ICON_SIZE} height={ICON_SIZE} />
      <View style={styles.separator} />
      <ChatGPTLogo width={ICON_SIZE} height={ICON_SIZE} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  separator: {width: 1, height: ICON_SIZE - 4, backgroundColor: colors.divider},
  pressed: {opacity: 0.6},
});
