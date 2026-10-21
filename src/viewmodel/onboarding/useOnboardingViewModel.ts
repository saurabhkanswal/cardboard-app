import {useCallback} from 'react';
import {markOnboardingSeen} from '../../model/onboarding/onboardingStorage';

/**
 * Feature ViewModel for first-launch onboarding: records that the user finished it,
 * so later launches start on Showcase.
 */
export function useOnboardingViewModel() {
  const completeOnboarding = useCallback(() => markOnboardingSeen(), []);
  return {completeOnboarding};
}
