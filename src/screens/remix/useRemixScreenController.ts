import {useCallback, useState} from 'react';
import {Alert} from 'react-native';
import {
  StackActions,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import {useRemixViewModel} from '../../viewmodel/remix/useRemixViewModel';
import {canRemix} from '../../viewmodel/remix/remixRules';
import type {PickedMedia} from '../../viewmodel/remix/types';

/**
 * This screen's own route contract. Declared locally (as a `type`, so it satisfies
 * `ParamListBase`) to type `useRoute` without importing `app/` — the layer
 * boundaries forbid `screens/ → app/`.
 */
type RemixParamList = {
  Remix: {videoId: string; sectionId: string; uri: string};
};

export interface RemixScreenController {
  /** The tapped video to remix. */
  videoUri: string;
  prompt: string;
  onChangePrompt: (text: string) => void;
  media: PickedMedia | null;
  onPickMedia: () => void;
  clearMedia: () => void;
  isPicking: boolean;
  /** True once both media and a non-empty prompt are present. */
  canRemix: boolean;
  /** True while the footage uploads to the bridge. */
  isUploading: boolean;
  onRemix: () => void;
  onClose: () => void;
}

/**
 * Screen-specific glue for the remix modal. Reads the route params, owns the prompt
 * UI state, and turns ViewModel outcomes into this screen's UX (e.g. the
 * permission-denied alert). Must not import from `model/`. Navigation is typed via
 * the global `ReactNavigation.RootParamList`, so this never imports `app/`.
 */
export function useRemixScreenController(): RemixScreenController {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RemixParamList, 'Remix'>>();
  const {uri} = route.params;

  const {media, pickMedia, clearMedia, isPicking, remix, isUploading} =
    useRemixViewModel();
  const [prompt, setPrompt] = useState('');

  const onPickMedia = useCallback(async () => {
    const result = await pickMedia();
    if (result === 'denied') {
      Alert.alert(
        'Permission needed',
        'Allow photo library access in Settings to pick a video.',
      );
    }
  }, [pickMedia]);

  const onRemix = useCallback(async () => {
    const result = await remix({prompt, media});
    switch (result.kind) {
      case 'created':
        // The editor takes over from the remix modal.
        navigation.dispatch(
          StackActions.replace('Editor', {projectId: result.projectId}),
        );
        break;
      case 'unpaired':
        Alert.alert(
          'Connect your laptop',
          'Editing runs on the Cardboard bridge on your laptop. Pair with it first.',
          [
            {text: 'Cancel', style: 'cancel'},
            {text: 'Pair', onPress: () => navigation.navigate('Pairing')},
          ],
        );
        break;
      case 'failed':
        Alert.alert('Upload failed', result.message);
        break;
      case 'invalid':
        break;
    }
  }, [remix, prompt, media, navigation]);

  const onClose = useCallback(() => navigation.goBack(), [navigation]);

  return {
    videoUri: uri,
    prompt,
    onChangePrompt: setPrompt,
    media,
    onPickMedia,
    clearMedia,
    isPicking,
    canRemix: canRemix({prompt, media}) && !isUploading,
    isUploading,
    onRemix,
    onClose,
  };
}
