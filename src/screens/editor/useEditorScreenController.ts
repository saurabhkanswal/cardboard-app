import {useCallback, useEffect, useState} from 'react';
import {useRoute, type RouteProp} from '@react-navigation/native';
import {useAnimatedReaction} from 'react-native-reanimated';
import {scheduleOnRN} from 'react-native-worklets';
import {EMPTY_STATS} from '../../components/compositor/playbackStats';
import {usePlaybackClock} from '../../components/compositor/usePlaybackClock';
import {useEditorViewModel} from '../../viewmodel/editor/useEditorViewModel';

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

/** `m:ss.t`. */
function formatTime(seconds: number): string {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  return `${m}:${(s - m * 60).toFixed(1).padStart(4, '0')}`;
}

/**
 * Editor screen glue: transport (play/pause/scrub over the compositor's clock),
 * preview sizing, status lines and the dev measurement HUD.
 */
export function useEditorScreenController() {
  const {projectId} = useRoute<RouteProp<EditorParamList, 'Editor'>>().params;
  const vm = useEditorViewModel(projectId);
  const duration = vm.timeline?.duration ?? 0;
  const {clock, isPlaying, play, pause, seekTo} = usePlaybackClock(duration);
  const [playheadTenths, setPlayheadTenths] = useState(0);
  const [statsLabel, setStatsLabel] = useState<string | null>(null);
  const [bakeLabel, setBakeLabel] = useState<string | null>(null);
  const [previewArea, setPreviewArea] = useState({width: 0, height: 0});

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

  useEffect(() => {
    if (!__DEV__) {
      return;
    }
    const id = setInterval(() => {
      // Spread over defaults: Fast Refresh can keep a shared value from an older shape.
      const s = {...EMPTY_STATS, ...clock.stats.value};
      setStatsLabel(
        `frames ${s.frames} · slow ${s.slowFrames} · worst ${s.worstFrameMs.toFixed(0)}ms · start ${s.startLatencyMs.toFixed(0)}ms · seeks ${s.playingSeeks}`,
      );
    }, 1000);
    return () => clearInterval(id);
  }, [clock.stats]);

  const onCodeBaked = useCallback(
    (s: {samples: number; frames: number; ms: number}) => {
      if (__DEV__) {
        setBakeLabel(`captions baked ${s.frames} frames from ${s.samples} samples in ${s.ms}ms`);
      }
    },
    [],
  );

  const onTogglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  // Largest box of the timeline's aspect that fits the preview area.
  const aspect = vm.timeline ? vm.timeline.width / vm.timeline.height : 9 / 16;
  const previewWidth = Math.floor(Math.min(previewArea.width, previewArea.height * aspect));

  return {
    timeline: vm.timeline,
    statusLabel: vm.error ?? vm.activity ?? STATUS_LABEL[vm.status],
    isBusy:
      vm.status === 'transcribing' || vm.status === 'agent-running' || vm.status === 'connecting',
    isError: vm.status === 'error',
    revLabel: `rev ${vm.rev}${vm.isDraft ? ' · live draft' : ''}${vm.errorCount ? ` · ${vm.errorCount} error(s)` : ''}`,
    templateError: vm.templateError,
    clock,
    isPlaying,
    onTogglePlay,
    onScrub: seekTo,
    onScrubStart: pause,
    timeLabel: formatTime(playheadTenths / 10),
    durationLabel: formatTime(duration),
    duration,
    statsLabel: statsLabel && bakeLabel ? `${statsLabel}\n${bakeLabel}` : statsLabel ?? bakeLabel,
    onCodeBaked,
    previewWidth,
    onPreviewLayout: setPreviewArea,
  };
}
