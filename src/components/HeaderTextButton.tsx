import React from 'react';
import {Pressable, StyleSheet, Text} from 'react-native';
import {colors, spacing} from '../theme';

interface HeaderTextButtonProps {
  label: string;
  /** Defaults to the header text colour. */
  color?: string;
  /** Omitted: the label renders but does nothing yet. */
  onPress?: () => void;
  /** Dimmed and not pressable. */
  disabled?: boolean;
}

/** Plain text action for a navigation header (e.g. Cancel / Export). Stateless. */
export function HeaderTextButton({
  label,
  color = colors.text,
  onPress,
  disabled = false,
}: HeaderTextButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={spacing.sm}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{disabled}}>
      <Text style={[styles.label, {color}, disabled && styles.disabled]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: {fontSize: 17, fontWeight: '600'},
  disabled: {opacity: 0.4},
});
