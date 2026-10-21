import {useCallback, useEffect, useState} from 'react';
import {Alert, Keyboard, Platform} from 'react-native';
import {
  StackActions,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import {useRemixViewModel} from '../../viewmodel/remix/useRemixViewModel';
import type {PickedMedia, RecipeField} from '../../viewmodel/remix/types';

/** Focus key for the free-text prompt, alongside recipe field ids. */
const PROMPT_INPUT = 'prompt';

/**
 * This screen's own route contract. Declared locally (as a `type`, so it satisfies
 * `ParamListBase`) to type `useRoute` without importing `app/` — the layer
 * boundaries forbid `screens/ → app/`.
 */
type RemixParamList = {
  Remix: {videoId: string; sectionId: string; uri: string; recipeId?: string};
};

export interface RemixScreenController {
  /** The tapped video to remix. */
  videoUri: string;
  /** Heading + hint over the video picker, from the recipe. */
  mediaPrompt: string;
  mediaHint: string;
  /** The recipe's text inputs, in order. */
  fields: RecipeField[];
  fieldValues: Record<string, string>;
  onChangeField: (id: string, text: string) => void;
  /**
   * Whether an input (a field id, or `'prompt'`) is shown. While one is focused only it
   * stays, so the sheet fits above the keyboard. Driven by focus, not keyboard events:
   * those can arrive before `onFocus` and would unmount the input being tapped.
   */
  isInputShown: (id: string) => boolean;
  onFocusInput: (id: string) => void;
  onBlurInput: () => void;
  /** An input is focused: hide the media picker and labels. */
  isCompact: boolean;
  promptInputId: string;
  prompt: string;
  onChangePrompt: (text: string) => void;
  /** Picked clips, in upload order. */
  media: PickedMedia[];
  onPickMedia: () => void;
  onRemoveMedia: (uri: string) => void;
  /** False once the clip limit is reached: hide the add button. */
  canAddMore: boolean;
  /** e.g. `2 / 5`; empty while nothing is picked. */
  clipCountLabel: string;
  isPicking: boolean;
  /** True once a clip and every required field are present (the prompt is optional). */
  canRemix: boolean;
  /** True while the footage uploads to the bridge. */
  isUploading: boolean;
  onRemix: () => void;
  onClose: () => void;
  /** Tap outside the sheet: dismisses the keyboard if an input is focused, else closes. */
  onBackdropPress: () => void;
  /** Tap on the sheet's empty space: dismisses the keyboard. */
  onDismissKeyboard: () => void;
  isKeyboardVisible: boolean;
  /**
   * Space the view must reserve under its content for the keyboard: its height
   * on iOS, 0 on Android (`adjustResize` already shrinks the window).
   */
  keyboardInset: number;
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
  const {uri, recipeId} = route.params;

  const {
    media,
    maxClips,
    pickMedia,
    removeMedia,
    isPicking,
    recipe,
    canRemix,
    remix,
    isUploading,
  } = useRemixViewModel(recipeId);
  const [prompt, setPrompt] = useState('');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  // null while hidden, else the keyboard height.
  const [keyboardHeight, setKeyboardHeight] = useState<number | null>(null);

  useEffect(() => {
    // Android only emits the `did` events.
    const isIOS = Platform.OS === 'ios';
    const show = Keyboard.addListener(
      isIOS ? 'keyboardWillShow' : 'keyboardDidShow',
      e => setKeyboardHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener(
      isIOS ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(null);
        // Android's back button hides the keyboard without blurring; blur so the
        // full sheet returns and the next tap fires `onFocus` again.
        if (!isIOS) {
          Keyboard.dismiss();
        }
      },
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const onPickMedia = useCallback(async () => {
    const result = await pickMedia();
    if (result === 'denied') {
      Alert.alert(
        'Permission needed',
        'Allow photo library access in Settings to pick a video.',
      );
    }
  }, [pickMedia]);

  const onChangeField = useCallback((id: string, text: string) => {
    setFieldValues(prev => ({...prev, [id]: text}));
  }, []);

  const isKeyboardVisible = keyboardHeight !== null;
  const isInputShown = useCallback(
    (id: string) => focusedInput === null || focusedInput === id,
    [focusedInput],
  );
  const onBlurInput = useCallback(() => setFocusedInput(null), []);

  const onRemix = useCallback(async () => {
    const result = await remix({prompt, media, fields: fieldValues});
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
  }, [remix, prompt, media, fieldValues, navigation]);

  const onClose = useCallback(() => navigation.goBack(), [navigation]);
  const isCompact = focusedInput !== null;
  const onDismissKeyboard = useCallback(() => Keyboard.dismiss(), []);
  const onBackdropPress = isCompact ? onDismissKeyboard : onClose;

  return {
    videoUri: uri,
    mediaPrompt: recipe?.mediaPrompt ?? 'Add your video',
    mediaHint: recipe?.mediaHint ?? '',
    fields: recipe?.fields ?? [],
    fieldValues,
    onChangeField,
    isInputShown,
    onFocusInput: setFocusedInput,
    onBlurInput,
    isCompact,
    promptInputId: PROMPT_INPUT,
    prompt,
    onChangePrompt: setPrompt,
    media,
    onPickMedia,
    onRemoveMedia: removeMedia,
    canAddMore: media.length < maxClips,
    clipCountLabel: media.length > 0 ? `${media.length} / ${maxClips}` : '',
    isPicking,
    canRemix: canRemix({prompt, media, fields: fieldValues}) && !isUploading,
    isUploading,
    onRemix,
    onClose,
    onBackdropPress,
    onDismissKeyboard,
    isKeyboardVisible,
    keyboardInset: Platform.OS === 'ios' ? keyboardHeight ?? 0 : 0,
  };
}
