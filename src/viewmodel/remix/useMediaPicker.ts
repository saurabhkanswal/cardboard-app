import {useCallback, useState} from 'react';
import * as ImagePicker from 'expo-image-picker';
import {MAX_CLIPS, remainingClips} from './remixRules';
import type {MediaKind, PickedMedia} from './types';

/** Outcome of a pick attempt, so callers can react without reading async state. */
export type PickMediaResult = 'picked' | 'canceled' | 'denied' | 'full';

export interface MediaPicker {
  /** The picked assets, in pick order. */
  media: PickedMedia[];
  /** Most assets that can be picked. */
  maxClips: number;
  /** Requests library permission (if needed), opens the picker, appends the picks. */
  pickMedia: () => Promise<PickMediaResult>;
  /** Removes one picked asset by uri. */
  removeMedia: (uri: string) => void;
  /** Clears every picked asset. */
  clearMedia: () => void;
  /** True while the permission prompt / picker is open. */
  isPicking: boolean;
}

/** `expo-image-picker` only ever reports `image` or `video` for our media types. */
function toMediaKind(type: ImagePicker.ImagePickerAsset['type']): MediaKind {
  return type === 'video' ? 'video' : 'image';
}

function toPickedMedia(asset: ImagePicker.ImagePickerAsset): PickedMedia {
  return {
    assetId: asset.assetId ?? undefined,
    uri: asset.uri,
    kind: toMediaKind(asset.type),
    fileName: asset.fileName ?? undefined,
    mimeType: asset.mimeType ?? undefined,
  };
}

const identity = (m: PickedMedia) => m.assetId ?? m.uri;

/** Appends new picks, skipping ones already picked, capped at MAX_CLIPS. */
function appendPicks(current: PickedMedia[], picks: PickedMedia[]): PickedMedia[] {
  const seen = new Set(current.map(identity));
  const fresh = picks.filter(m => !seen.has(identity(m)));
  return [...current, ...fresh].slice(0, MAX_CLIPS);
}

/**
 * Encapsulates the device media-picker + permission flow so no component or screen
 * touches `expo-image-picker` directly. Requests photo-library permission, opens
 * the picker for the remaining clip slots, and maps the result into `PickedMedia`.
 */
export function useMediaPicker(): MediaPicker {
  const [media, setMedia] = useState<PickedMedia[]>([]);
  const [isPicking, setIsPicking] = useState(false);

  const pickMedia = useCallback(async (): Promise<PickMediaResult> => {
    const remaining = remainingClips(media.length);
    if (remaining === 0) {
      return 'full';
    }
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
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        // iOS: return assets in the order the user tapped them.
        orderedSelection: true,
      });
      if (result.canceled) {
        return 'canceled';
      }

      const picks = result.assets.map(toPickedMedia);
      setMedia(prev => appendPicks(prev, picks));
      return 'picked';
    } finally {
      setIsPicking(false);
    }
  }, [media.length]);

  const removeMedia = useCallback(
    (uri: string) => setMedia(prev => prev.filter(m => m.uri !== uri)),
    [],
  );
  const clearMedia = useCallback(() => setMedia([]), []);

  return {media, maxClips: MAX_CLIPS, pickMedia, removeMedia, clearMedia, isPicking};
}
