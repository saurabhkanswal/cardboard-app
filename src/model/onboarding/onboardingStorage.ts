import Storage from 'expo-sqlite/kv-store';

/** Bump the suffix to show onboarding again to everyone (e.g. after a redesign). */
const SEEN_KEY = 'onboarding.seen.v1';

/** Synchronous so the root navigator can pick its first route without a flash. */
export const hasSeenOnboarding = (): boolean =>
  Storage.getItemSync(SEEN_KEY) === '1';

export const markOnboardingSeen = (): void =>
  Storage.setItemSync(SEEN_KEY, '1');
