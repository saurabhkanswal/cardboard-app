/**
 * Pure business rules for the showcase feature. No React, no Redux, no screen
 * knowledge — anything another screen might reuse lives here.
 */

/** Default cap on how many videos may play at once on the showcase screen. */
export const DEFAULT_MAX_PLAYING = 3;

/**
 * Given the ids currently visible (in priority order) returns which may actually
 * play, capping concurrency to `max`. Order-preserving and de-duplicated.
 */
export function getPlayableIds(
  visibleIds: string[],
  max: number = DEFAULT_MAX_PLAYING,
): string[] {
  if (max <= 0) {
    return [];
  }

  const seen = new Set<string>();
  const playable: string[] = [];

  for (const id of visibleIds) {
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    playable.push(id);
    if (playable.length >= max) {
      break;
    }
  }

  return playable;
}
