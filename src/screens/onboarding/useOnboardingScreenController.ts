import {useCallback, useEffect, useState} from 'react';
import {AppState, Platform} from 'react-native';
import {useIsFocused, useNavigation} from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import {useOnboardingViewModel} from '../../viewmodel/onboarding/useOnboardingViewModel';

/**
 * What each dial step shows; index 0 is the hint before the first turn. Clips are
 * Metro assets: shipped as separate files in the app, not inlined in the JS bundle.
 */
const STEPS: ReadonlyArray<{line: string; clips: number[]}> = [
  {
    line: 'Viral content in minutes. Spin to see how.',
    clips: [
      require('../../../assets/viral_content_1.mp4'),
      require('../../../assets/viral_content_2.mp4'),
      require('../../../assets/viral_content_3.mp4'),
    ],
  },
  {
    line: 'Pick a recipe that’s already going viral',
    clips: [require('../../../assets/viral_content_1.mp4')],
  },
  {
    line: 'Drop in your clips. AI does the edit.',
    clips: [require('../../../assets/drop_in_clips.mp4')],
  },
  {
    line: 'Ready to post in minutes, not days',
    clips: [require('../../../assets/post_in_days.mp4')],
  },
];
const LAST_STEP = STEPS.length - 1;

/**
 * Screen glue for onboarding: owns the dial step, plays a haptic per step (a
 * success buzz on the last), plays clips only while focused and foregrounded, and
 * leaves for Showcase once the user is done.
 */
export function useOnboardingScreenController() {
  const {completeOnboarding} = useOnboardingViewModel();
  const navigation = useNavigation();
  const [step, setStep] = useState(0);
  const isFocused = useIsFocused();
  const [isActive, setIsActive] = useState(AppState.currentState === 'active');

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      setIsActive(state === 'active');
    });
    return () => sub.remove();
  }, []);

  // Ratchet clicks while dragging: the softest haptic each platform has, so a
  // fast spin reads as a continuous scratch rather than a buzz.
  const onTick = useCallback(() => {
    if (Platform.OS === 'android') {
      Haptics.performAndroidHapticsAsync(
        Haptics.AndroidHaptics.Segment_Frequent_Tick,
      );
    } else {
      Haptics.selectionAsync();
    }
  }, []);

  // A firmer thump per step, so steps stand out from the ticks.
  const onStepChange = useCallback((next: number) => {
    if (next === LAST_STEP) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setStep(next);
  }, []);

  const onGetStarted = useCallback(() => {
    completeOnboarding();
    navigation.reset({index: 0, routes: [{name: 'Showcase'}]});
  }, [completeOnboarding, navigation]);

  return {
    step,
    steps: LAST_STEP,
    line: STEPS[step].line,
    clips: STEPS[step].clips,
    clipsPlaying: isFocused && isActive,
    isDone: step === LAST_STEP,
    onStepChange,
    onTick,
    onGetStarted,
  };
}
