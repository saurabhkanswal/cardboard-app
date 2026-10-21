import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors, radius, spacing} from '../theme';

export type ChatBubbleKind = 'user' | 'assistant' | 'step' | 'notice';

interface ChatBubbleProps {
  kind: ChatBubbleKind;
  text: string;
  isError?: boolean;
}

/**
 * One row of a chat log, Claude/ChatGPT style: the user's messages in a grey bubble
 * on the right, replies as plain full-width text, and steps/notices as small muted
 * lines. Stateless.
 */
function ChatBubbleView({kind, text, isError}: ChatBubbleProps) {
  if (kind === 'step' || kind === 'notice') {
    return (
      <Text style={[styles.line, isError && styles.lineError]} numberOfLines={3}>
        {kind === 'step' ? `${text}…` : text}
      </Text>
    );
  }
  if (kind === 'user') {
    return (
      <View style={styles.userBubble}>
        <Text style={styles.text}>{text}</Text>
      </View>
    );
  }
  return <Text style={[styles.text, styles.assistant]}>{text}</Text>;
}

export const ChatBubble = React.memo(ChatBubbleView);

const styles = StyleSheet.create({
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '80%',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md - 2,
    borderRadius: radius.bubble + 4,
    backgroundColor: colors.bubbleUser,
    marginVertical: spacing.sm,
  },
  assistant: {marginVertical: spacing.sm},
  text: {color: colors.text, fontSize: 16, lineHeight: 23},
  line: {color: colors.textMuted, fontSize: 13, marginVertical: spacing.xs},
  lineError: {color: colors.danger},
});
