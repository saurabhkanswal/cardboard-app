import type {Recipe, RemixInput} from './types';

/** The talking-head kit, used for showcase videos without a supported recipe. */
export const DEFAULT_RECIPE_ID = 'simple-ugc';

/** Most clips one remix uploads; the bridge rejects more. */
export const MAX_CLIPS = 5;

/** How many more clips the user may add, given how many are picked. */
export function remainingClips(count: number): number {
  return Math.max(0, MAX_CLIPS - count);
}

/**
 * Pure business rule (no React, no Redux): a remix can only run once the recipe has
 * loaded, the user has picked 1–MAX_CLIPS videos, and every required recipe field is filled.
 * The prompt is optional — the bridge falls back to the recipe's own prompt.
 */
export function canRemix(input: RemixInput, recipe: Recipe | null): boolean {
  return (
    recipe !== null &&
    input.media.length >= 1 &&
    input.media.length <= MAX_CLIPS &&
    input.media.every(m => m.kind === 'video') &&
    recipe.fields.every(f => f.optional || (input.fields[f.id] ?? '').trim().length > 0)
  );
}

/** Which bridge kit a remix uses: the tapped video's recipe, else the default one. */
export function kitForRemix(recipeId: string | undefined): string {
  return recipeId ?? DEFAULT_RECIPE_ID;
}

/** Non-empty, trimmed recipe field values, as the bridge's `inputs` upload field. */
export function recipeInputs(recipe: Recipe, fields: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of recipe.fields) {
    const value = (fields[f.id] ?? '').trim();
    if (value) {
      out[f.id] = value;
    }
  }
  return out;
}

/** Upload MIME type for a picked video, falling back on its extension. */
export function videoMimeType(media: {mimeType?: string; fileName?: string; uri: string}): string {
  if (media.mimeType) {
    return media.mimeType;
  }
  const name = (media.fileName ?? media.uri).toLowerCase();
  return name.endsWith('.mov') ? 'video/quicktime' : 'video/mp4';
}
