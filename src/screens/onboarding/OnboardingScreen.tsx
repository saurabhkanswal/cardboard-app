import React, {useState} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutUp,
} from 'react-native-reanimated';
import {SafeAreaView} from 'react-native-safe-area-context';
import {LoopingClip} from '../../components/LoopingClip';
import {RotaryLogo} from '../../components/RotaryLogo';
import {SpinHintArrow} from '../../components/SpinHintArrow';
import {colors, spacing} from '../../theme';
import {useOnboardingScreenController} from './useOnboardingScreenController';

const DIAL_SIZE = 200;
const BUTTON_HEIGHT = 56;
const LINE_HEIGHT = 50;
/** Room for up to three heading lines, so the clips below don't shift per step. */
const HEADING_LINES = 3;
/** The clips are portrait 9:16. */
const CLIP_ASPECT = 9 / 16;
const CLIP_GAP = spacing.sm;
/** Side margin for the clips — tighter than the text's, so they can be bigger. */
const CLIP_GUTTER = spacing.lg;

/** Largest 9:16 size that fits `count` clips side by side in the box. */
function clipSize(box: {width: number; height: number}, count: number) {
  const maxWidth = (box.width - CLIP_GAP * (count - 1)) / count;
  const height = Math.min(box.height, maxWidth / CLIP_ASPECT);
  return {width: height * CLIP_ASPECT, height};
}

/**
 * First-launch onboarding: big copy and its clips up top, and the Cardboard dial at
 * the bottom within thumb reach — spin it to step through the intro.
 */
export function OnboardingScreen() {
  const {
    step,
    steps,
    line,
    clips,
    clipsPlaying,
    isDone,
    onStepChange,
    onTick,
    onGetStarted,
  } = useOnboardingScreenController();
  const [mediaBox, setMediaBox] = useState({width: 0, height: 0});
  const onMediaLayout = (e: LayoutChangeEvent) => {
    const {width, height} = e.nativeEvent.layout;
    setMediaBox({width, height});
  };
  const size = clipSize(
    {width: mediaBox.width - CLIP_GUTTER * 2, height: mediaBox.height},
    clips.length,
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.heading} accessibilityLiveRegion="polite">
        {/* Keyed by step so each line mounts fresh and runs its enter/exit. */}
        <Animated.View
          key={step}
          entering={FadeInDown.duration(300)}
          exiting={FadeOutUp.duration(200)}
          style={styles.layer}
        >
          <Text
            style={styles.line}
            accessibilityRole="header"
            numberOfLines={HEADING_LINES}
            adjustsFontSizeToFit
          >
            {line}
          </Text>
        </Animated.View>
      </View>

      <View style={styles.media} onLayout={onMediaLayout}>
        {size.height > 0 && (
          <Animated.View
            key={step}
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(200)}
            style={[styles.layer, styles.clipRow]}
          >
            {clips.map((clip, i) => (
              <LoopingClip
                key={i}
                source={clip}
                width={size.width}
                height={size.height}
                playing={clipsPlaying}
              />
            ))}
          </Animated.View>
        )}
      </View>

      <View style={styles.controls}>
        <View style={styles.dots}>
          {Array.from({length: steps}, (_, i) => (
            <View key={i} style={[styles.dot, i < step && styles.dotActive]} />
          ))}
        </View>
        <View style={styles.buttonSlot}>
          {isDone && (
            <Animated.View entering={FadeIn.duration(300)}>
              <Pressable
                onPress={onGetStarted}
                accessibilityRole="button"
                style={({pressed}) => [
                  styles.button,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.buttonText}>Get started</Text>
              </Pressable>
            </Animated.View>
          )}
        </View>
        <RotaryLogo
          steps={steps}
          step={step}
          onStepChange={onStepChange}
          onTick={onTick}
          size={DIAL_SIZE}
          accessibilityLabel="Cardboard dial. Turn to continue."
        />
        <View style={styles.hint}>
          {/* Only at the start: hidden after the first turn, back if they return. */}
          <SpinHintArrow width={DIAL_SIZE * 0.7} visible={step === 0} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  heading: {
    height: LINE_HEIGHT * HEADING_LINES,
    marginTop: spacing.xl * 2.5,
    overflow: 'hidden',
  },
  // Absolute so the outgoing and incoming step overlap while they animate.
  layer: {
    ...StyleSheet.absoluteFill,
    paddingHorizontal: spacing.xl,
  },
  media: {
    flex: 1,
    marginVertical: spacing.sm,
  },
  clipRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: CLIP_GAP,
    paddingHorizontal: 0,
  },
  line: {
    color: colors.textSoft,
    fontSize: 44,
    fontWeight: '800',
    lineHeight: LINE_HEIGHT,
    letterSpacing: -1,
  },
  controls: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  hint: {
    marginTop: spacing.md,
  },
  dots: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.text,
  },
  // Space is always reserved so the dial doesn't move when the button appears.
  buttonSlot: {
    alignSelf: 'stretch',
    height: BUTTON_HEIGHT,
    marginVertical: spacing.md,
  },
  button: {
    height: BUTTON_HEIGHT,
    borderRadius: BUTTON_HEIGHT / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.segmentActive,
  },
  pressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: colors.textOnLight,
    fontSize: 17,
    fontWeight: '700',
  },
});
