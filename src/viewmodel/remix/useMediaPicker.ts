import {useCallback, useState} from 'react';
import * as ImagePicker from 'expo-image-picker';
import type {MediaKind, PickedMedia} from './types';

/** Outcome of a pick attempt, so callers can react without reading async state. */
export type PickMediaResult = 'picked' | 'canceled' | 'denied';

export interface MediaPicker {
  /** The currently picked asset, or `null` if nothing is selected. */
  media: PickedMedia | null;
  /** Requests library permission (if needed), opens the picker, reports the outcome. */
  pickMedia: () => Promise<PickMediaResult>;
  /** Clears the current selection. */
  clearMedia: () => void;
  /** True while the permission prompt / picker is open. */
  isPicking: boolean;
}

/** `expo-image-picker` only ever reports `image` or `video` for our media types. */
function toMediaKind(type: ImagePicker.ImagePickerAsset['type']): MediaKind {
  return type === 'video' ? 'video' : 'image';
}

/**
 * Encapsulates the device media-picker + permission flow so no component or screen
 * touches `expo-image-picker` directly. Requests photo-library permission, opens
 * the picker, and maps the result into the `PickedMedia` domain shape.
 */
export function useMediaPicker(): MediaPicker {
  const [media, setMedia] = useState<PickedMedia | null>(null);
  const [isPicking, setIsPicking] = useState(false);

  const pickMedia = useCallback(async (): Promise<PickMediaResult> => {
    setIsPicking(true);
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        return 'denied';
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        // The recipe kits work on talk-to-camera footage, so only videos for now.
        mediaTypes: ['videos'],
        quality: 1,
      });
      if (result.canceled) {
        return 'canceled';
      }

      const asset = result.assets[0];
      setMedia({
        uri: asset.uri,
        kind: toMediaKind(asset.type),
        fileName: asset.fileName ?? undefined,
        mimeType: asset.mimeType ?? undefined,
      });
      return 'picked';
    } finally {
      setIsPicking(false);
    }
  }, []);

  const clearMedia = useCallback(() => setMedia(null), []);

  return {media, pickMedia, clearMedia, isPicking};
}
