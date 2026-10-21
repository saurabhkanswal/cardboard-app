import {useCallback, useEffect, useRef, useState} from 'react';
import {Alert, Keyboard, Platform, useWindowDimensions, type FlatList} from 'react-native';
import {
  StackActions,
  useNavigation,
  usePreventRemove,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import {useAnimatedReaction} from 'react-native-reanimated';
import {scheduleOnRN} from 'react-native-worklets';
import {renderCaptionFrames} from '../../components/compositor/captionFrames';
import {usePlaybackClock} from '../../components/compositor/usePlaybackClock';
import {useEditorViewModel} from '../../viewmodel/editor/useEditorViewModel';
import {useExportViewModel} from '../../viewmodel/editor/useExportViewModel';
import type {ChatMessage} from '../../viewmodel/editor/chat';
import {isExportBusy, type ExportPhase} from '../../viewmodel/editor/exportRules';
import {spacing} from '../../theme';

/** Declared locally (a `type`, so it satisfies ParamListBase) — screens may not import app/. */
type EditorParamList = {
  Editor: {projectId: string};
};

const STATUS_LABEL = {
  connecting: 'Connecting to the bridge…',
  transcribing: 'Transcribing your video…',
  ready: 'Ready',
  'agent-running': 'Editing…',
  error: 'Something went wrong',
} as const;

/** Export overlay label by phase; `rendering` shows the bridge's progress instead. */
const EXPORT_LABEL: Partial<Record<ExportPhase, string>> = {
  uploading: 'Uploading…',
  saving: 'Saving…',
};

/** Share of the window height the preview may take, with the keyboard down / up. */
const PREVIEW_SHARE = 0.35;
const PREVIEW_SHARE_KEYBOARD = 0.22;
/** Per side: the video card's margin + padding (see EditorScreen's `card`). */
const CARD_INSET = spacing.md + spacing.sm;

/** `m:ss.t`. */
function formatTime(seconds: number): string {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  return `${m}:${(s - m * 60).toFixed(1).padStart(4, '0')}`;
}

/**
 * Editor screen glue: the chat composer (draft, send/stop/undo, keyboard), transport
 * (play/pause/scrub over the compositor's clock), preview sizing and status.
 */
export function useEditorScreenController() {
  const {projectId} = useRoute<RouteProp<EditorParamList, 'Editor'>>().params;
  const navigation = useNavigation();
  const vm = useEditorViewModel(projectId);
  const duration = vm.timeline?.duration ?? 0;
  const exporter = useExportViewModel(projectId, {
    status: vm.status,
    isDraft: vm.isDraft,
    rev: vm.rev,
    duration,
  });
  const {clock, isPlaying, play, pause, seekTo} = usePlaybackClock(duration);
  // Captions are rasterised on the phone before the upload starts.
  const [isPreparingExport, setPreparingExport] = useState(false);
  const [playheadTenths, setPlayheadTenths] = useState(0);
  const [draft, setDraft] = useState('');
  // null while hidden, else the keyboard height.
  const [keyboardHeight, setKeyboardHeight] = useState<number | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const window = useWindowDimensions();

  useEffect(() => {
    // Android only emits the `did` events.
    const isIOS = Platform.OS === 'ios';
    const show = Keyboard.addListener(
      isIOS ? 'keyboardWillShow' : 'keyboardDidShow',
      e => setKeyboardHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener(
      isIOS ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(null),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Label refreshes at 10 Hz, not per frame. Only the number crosses threads:
  // formatting is plain JS and must not run on the UI runtime.
  useAnimatedReaction(
    () => Math.floor(clock.playhead.value * 10),
    (tenth, previous) => {
      if (tenth !== previous) {
        scheduleOnRN(setPlayheadTenths, tenth);
      }
    },
  );

  const onTogglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const {send} = vm;
  const onSend = useCallback(() => {
    if (!draft.trim()) {
      return;
    }
    send(draft);
    setDraft('');
  }, [draft, send]);

  const onCancel = useCallback(() => navigation.goBack(), [navigation]);

  const {timeline} = vm;
  const {exportVideo, acknowledge} = exporter;
  const onExport = useCallback(async () => {
    if (!timeline) {
      return;
    }
    pause();
    Keyboard.dismiss();
    setPreparingExport(true);
    try {
      // Yield a frame so the "Preparing…" label shows before the JS-thread render.
      await new Promise(resolve => requestAnimationFrame(resolve));
      const layers = await renderCaptionFrames(timeline);
      setPreparingExport(false);
      await exportVideo(layers);
    } catch (e) {
      setPreparingExport(false);
      Alert.alert("Couldn't export", e instanceof Error ? e.message : String(e));
    }
  }, [timeline, pause, exportVideo]);

  const isExporting = isPreparingExport || isExportBusy(exporter.phase);
  // The overlay blocks Cancel; this blocks the back swipe and Android's back button.
  usePreventRemove(isExporting, () => {});

  // Report the outcome once. A finished export lands on "Your projects".
  useEffect(() => {
    if (exporter.phase === 'saved') {
      Alert.alert('Saved to Photos', 'Your video is in your photo library.');
      acknowledge();
      navigation.dispatch(StackActions.popTo('Showcase', {tab: 'projects'}));
    } else if (exporter.phase === 'error') {
      Alert.alert("Couldn't export", exporter.error ?? undefined);
      acknowledge();
    }
  }, [exporter.phase, exporter.error, acknowledge, navigation]);

  const onChatContentSizeChange = useCallback(() => {
    listRef.current?.scrollToEnd({animated: true});
  }, []);

  // Largest box of the timeline's aspect within a capped share of the window, so the
  // chat keeps most of the screen (and more of it while typing).
  const isKeyboardVisible = keyboardHeight !== null;
  const aspect = vm.timeline ? vm.timeline.width / vm.timeline.height : 9 / 16;
  const previewHeight = Math.floor(
    window.height * (isKeyboardVisible ? PREVIEW_SHARE_KEYBOARD : PREVIEW_SHARE),
  );
  const previewWidth = Math.floor(Math.min(window.width - 2 * CARD_INSET, previewHeight * aspect));
  const isBusy =
    vm.status === 'transcribing' || vm.status === 'agent-running' || vm.status === 'connecting';

  return {
    onCancel,
    onExport,
    canExport: exporter.canExport && !isExporting,
    isExporting,
    exportOverlayLabel: isPreparingExport
      ? 'Preparing…'
      : EXPORT_LABEL[exporter.phase] ??
        `Exporting ${Math.round(exporter.progress * 100)}%`,
    exportProgress: exporter.phase === 'rendering' ? exporter.progress : null,
    timeline: vm.timeline,
    // While editing, the chat's latest step already shows the agent's activity.
    statusLabel:
      vm.error ??
      (vm.status === 'agent-running' ? STATUS_LABEL[vm.status] : vm.activity) ??
      STATUS_LABEL[vm.status],
    isBusy,
    isError: vm.status === 'error',
    // Chat
    messages: vm.messages,
    listRef,
    onChatContentSizeChange,
    draft,
    onChangeDraft: setDraft,
    composerPlaceholder:
      vm.status === 'agent-running'
        ? 'Editing… tap stop to cancel'
        : vm.status === 'ready'
          ? 'Tell the director what to change…'
          : STATUS_LABEL[vm.status],
    canEdit: vm.status === 'ready',
    isRunning: vm.canStop,
    canSend: vm.canSend && draft.trim().length > 0,
    onSend,
    onStop: vm.stop,
    onUndo: vm.canUndo ? vm.undo : undefined,
    /** iOS: room to leave for the keyboard; Android's adjustResize already shrinks the window. */
    keyboardInset: Platform.OS === 'ios' ? keyboardHeight ?? 0 : 0,
    templateError: vm.templateError,
    clock,
    isPlaying,
    onTogglePlay,
    onScrub: seekTo,
    onScrubStart: pause,
    timeLabel: formatTime(playheadTenths / 10),
    durationLabel: formatTime(duration),
    duration,
    previewWidth,
    previewHeight,
  };
}
