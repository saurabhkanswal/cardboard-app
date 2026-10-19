/**
 * Remix domain types. Screen- and UI-agnostic; the device picker shape is mapped
 * into these so the rest of the app never sees `expo-image-picker` types.
 */

export type MediaKind = 'image' | 'video';

/** A video or image the user picked from their device to remix with. */
export interface PickedMedia {
  uri: string;
  kind: MediaKind;
  fileName?: string;
  /** e.g. `video/quicktime`; used when uploading. */
  mimeType?: string;
}

/** Everything the user has assembled before tapping Remix. */
export interface RemixInput {
  prompt: string;
  media: PickedMedia | null;
}
