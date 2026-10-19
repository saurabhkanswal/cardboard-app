/**
 * Pure business rules for the showcase feature. No React, no Redux, no screen
 * knowledge — anything another screen might reuse lives here.
 */

/** Default active window on the showcase screen: 3 rails × 3 tiles = 9 videos. */
export const DEFAULT_ACTIVE_ROWS = 3;
export const DEFAULT_ACTIVE_COLUMNS = 3;

/**
 * Given the visible tile ids of each on-screen rail (rails top-to-bottom, tiles
 * left-to-right) returns the ids that may be active: the first `rows` rails and
 * the first `columns` tiles of each. Order-preserving and de-duplicated.
 */
export function getActiveGridIds(
  visibleIdsByRail: string[][],
  rows: number = DEFAULT_ACTIVE_ROWS,
  columns: number = DEFAULT_ACTIVE_COLUMNS,
): string[] {
  if (rows <= 0 || columns <= 0) {
    return [];
  }

  const seen = new Set<string>();
  const active: string[] = [];

  for (const railIds of visibleIdsByRail.slice(0, rows)) {
    for (const id of railIds.slice(0, columns)) {
      if (seen.has(id)) {
        continue;
      }
      seen.add(id);
      active.push(id);
    }
  }

  return active;
}
