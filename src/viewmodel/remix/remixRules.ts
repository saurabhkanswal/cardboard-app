import type {RemixInput} from './types';

/**
 * Pure business rule (no React, no Redux): a remix can only run once the user has
 * picked a video AND entered a non-empty prompt. Reusable from any screen.
 */
export function canRemix(input: RemixInput): boolean {
  return input.media?.kind === 'video' && input.prompt.trim().length > 0;
}

/**
 * Which recipe kit a remix uses. The POC ships one talking-head kit; later this maps
 * the tapped showcase video to its recipe.
 */
export function kitForRemix(): string {
  return 'simple-ugc';
}

/** Upload MIME type for a picked video, falling back on its extension. */
export function videoMimeType(media: {mimeType?: string; fileName?: string; uri: string}): string {
  if (media.mimeType) {
    return media.mimeType;
  }
  const name = (media.fileName ?? media.uri).toLowerCase();
  return name.endsWith('.mov') ? 'video/quicktime' : 'video/mp4';
}
