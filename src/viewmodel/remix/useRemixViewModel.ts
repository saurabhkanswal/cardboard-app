import {useCallback} from 'react';
import {
  useCreateProjectMutation,
  type BridgeError,
} from '../../model/bridge/bridgeApi';
import {useMediaPicker, type MediaPicker} from './useMediaPicker';
import {canRemix, kitForRemix, videoMimeType} from './remixRules';
import type {RemixInput} from './types';

/** Outcome of starting a remix, so the controller can choose the UX. */
export type RemixResult =
  | {kind: 'created'; projectId: string}
  | {kind: 'unpaired'}
  | {kind: 'invalid'}
  | {kind: 'failed'; message: string};

export interface RemixViewModel extends MediaPicker {
  /** Uploads the footage + prompt to the bridge, which transcribes and starts the director. */
  remix: (input: RemixInput) => Promise<RemixResult>;
  isUploading: boolean;
}

/**
 * Feature ViewModel for the remix flow: composes the media picker and starts an editor
 * project on the paired bridge. The only caller of the createProject mutation.
 */
export function useRemixViewModel(): RemixViewModel {
  const picker = useMediaPicker();
  const [createProject, {isLoading: isUploading}] = useCreateProjectMutation();

  const remix = useCallback(
    async (input: RemixInput): Promise<RemixResult> => {
      if (!canRemix(input) || !input.media) {
        return {kind: 'invalid'};
      }
      const {media} = input;
      const result = await createProject({
        kitId: kitForRemix(),
        prompt: input.prompt.trim(),
        video: {
          uri: media.uri,
          name: media.fileName ?? 'video.mp4',
          type: videoMimeType(media),
        },
      });
      if ('error' in result) {
        const error = result.error as BridgeError;
        return error.status === 'UNPAIRED'
          ? {kind: 'unpaired'}
          : {kind: 'failed', message: error.message};
      }
      return {kind: 'created', projectId: result.data.project.id};
    },
    [createProject],
  );

  return {...picker, remix, isUploading};
}
