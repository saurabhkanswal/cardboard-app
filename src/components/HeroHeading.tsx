import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Animated, {FadeInDown, FadeOutUp} from 'react-native-reanimated';
import {colors, spacing} from '../theme';

export interface HeroTerm {
  label: string;
  color: string;
}

interface HeroHeadingProps {
  title: string;
  /** Static lead-in before the rotating term, e.g. "Built for". */
  prefix: string;
  /** Terms cycled after the prefix, one at a time. */
  terms: HeroTerm[];
  /** How long each term stays on screen. */
  intervalMs?: number;
}

const TERM_LINE_HEIGHT = 30;

/**
 * Hero heading: a large centred title plus a "<prefix> <term>" line that rotates
 * through `terms`. The whole line slides/fades as one unit, so each version is
 * centred on its own width with no sideways shift. Presentation only — copy comes
 * from the screen.
 */
function HeroHeadingComponent({
  title,
  prefix,
  terms,
  intervalMs = 2000,
}: HeroHeadingProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (terms.length < 2) {
      return;
    }
    const id = setInterval(
      () => setIndex(i => (i + 1) % terms.length),
      intervalMs,
    );
    return () => clearInterval(id);
  }, [terms.length, intervalMs]);

  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <View
        style={styles.taglineSlot}
        accessible
        accessibilityLabel={`${prefix} ${terms.map(t => t.label).join(', ')}`}>
        {/* Keyed by index so each line mounts fresh and runs its enter/exit. */}
        <Animated.View
          key={index}
          entering={FadeInDown.duration(350)}
          exiting={FadeOutUp.duration(250)}
          style={styles.taglineRow}>
          <Text style={styles.prefix} numberOfLines={1}>
            {prefix}{' '}
            <Text style={[styles.term, {color: terms[index].color}]}>
              {terms[index].label}
            </Text>
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  title: {
    color: colors.textSoft,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  taglineSlot: {
    alignSelf: 'stretch',
    height: TERM_LINE_HEIGHT,
    overflow: 'hidden',
  },
  taglineRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    alignItems: 'center',
  },
  prefix: {
    color: colors.textMuted,
    fontSize: 20,
    fontWeight: '600',
    lineHeight: TERM_LINE_HEIGHT,
  },
  term: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: TERM_LINE_HEIGHT,
  },
});

export const HeroHeading = React.memo(HeroHeadingComponent);
