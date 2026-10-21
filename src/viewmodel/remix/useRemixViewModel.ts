import {useCallback, useMemo} from 'react';
import {
  useCreateProjectMutation,
  type BridgeError,
} from '../../model/bridge/bridgeApi';
import {useGetRecipeQuery} from '../../model/recipes/recipesApi';
import type {RecipeDTO} from '../../model/recipes/types';
import {useMediaPicker, type MediaPicker} from './useMediaPicker';
import {canRemix, kitForRemix, recipeInputs, videoMimeType} from './remixRules';
import type {Recipe, RemixInput} from './types';

/** DTO → domain. The shapes match today; this absorbs backend changes. */
function toRecipe(dto: RecipeDTO): Recipe {
  return {
    id: dto.id,
    name: dto.name,
    mediaPrompt: dto.mediaPrompt,
    mediaHint: dto.mediaHint,
    fields: dto.fields.map(f => ({...f})),
  };
}

/** Outcome of starting a remix, so the controller can choose the UX. */
export type RemixResult =
  | {kind: 'created'; projectId: string}
  | {kind: 'unpaired'}
  | {kind: 'invalid'}
  | {kind: 'failed'; message: string};

export interface RemixViewModel extends MediaPicker {
  /** What the recipe asks for; null while it loads. */
  recipe: Recipe | null;
  /** True once 1–MAX_CLIPS videos and every required field are present. */
  canRemix: (input: RemixInput) => boolean;
  /** Uploads the footage, fields + prompt to the bridge, which transcribes and starts the director. */
  remix: (input: RemixInput) => Promise<RemixResult>;
  isUploading: boolean;
}

/**
 * Feature ViewModel for the remix flow: composes the media picker and starts an editor
 * project on the paired bridge. The only caller of the createProject mutation.
 */
export function useRemixViewModel(recipeId: string | undefined): RemixViewModel {
  const picker = useMediaPicker();
  const [createProject, {isLoading: isUploading}] = useCreateProjectMutation();
  const kitId = kitForRemix(recipeId);
  const {data} = useGetRecipeQuery(kitId);
  const recipe = useMemo(() => (data ? toRecipe(data) : null), [data]);

  const canRemixInput = useCallback((input: RemixInput) => canRemix(input, recipe), [recipe]);

  const remix = useCallback(
    async (input: RemixInput): Promise<RemixResult> => {
      if (!recipe || !canRemix(input, recipe)) {
        return {kind: 'invalid'};
      }
      const prompt = input.prompt.trim();
      const result = await createProject({
        kitId,
        prompt: prompt || undefined,
        inputs: recipeInputs(recipe, input.fields),
        videos: input.media.map((m, i) => ({
          uri: m.uri,
          name: m.fileName ?? `video-${i + 1}.mp4`,
          type: videoMimeType(m),
        })),
      });
      if ('error' in result) {
        const error = result.error as BridgeError;
        return error.status === 'UNPAIRED'
          ? {kind: 'unpaired'}
          : {kind: 'failed', message: error.message};
      }
      return {kind: 'created', projectId: result.data.project.id};
    },
    [createProject, kitId, recipe],
  );

  return {...picker, recipe, canRemix: canRemixInput, remix, isUploading};
}
