/**
 * Remix domain types. Screen- and UI-agnostic; the device picker shape is mapped
 * into these so the rest of the app never sees `expo-image-picker` types.
 */

export type MediaKind = 'image' | 'video';

/** A video or image the user picked from their device to remix with. */
export interface PickedMedia {
  /** Stable picker id when the platform reports one; used to skip re-picked assets. */
  assetId?: string;
  uri: string;
  kind: MediaKind;
  fileName?: string;
  /** e.g. `video/quicktime`; used when uploading. */
  mimeType?: string;
}

/** One text input a recipe asks for (e.g. the product name). */
export interface RecipeField {
  id: string;
  label: string;
  placeholder: string;
  optional: boolean;
  maxLength: number;
}

/** What a recipe needs from the user before a remix. */
export interface Recipe {
  /** Bridge kit id. */
  id: string;
  name: string;
  mediaPrompt: string;
  mediaHint: string;
  fields: RecipeField[];
}

/** Everything the user has assembled before tapping Remix. */
export interface RemixInput {
  /** Optional extra direction; the recipe's own prompt is used when empty. */
  prompt: string;
  /** Picked clips, in upload order. */
  media: PickedMedia[];
  /** Recipe text inputs by field id. */
  fields: Record<string, string>;
}
