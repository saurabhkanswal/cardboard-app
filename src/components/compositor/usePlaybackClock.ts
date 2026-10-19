import {useCallback, useEffect, useState} from 'react';
import {
  useFrameCallback,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import {scheduleOnRN} from 'react-native-worklets';
import {EMPTY_STATS, type PlaybackStats} from './playbackStats';

/** A frame slower than this at 60 Hz means at least one dropped frame. */
const SLOW_FRAME_MS = 25;
/** A clip layer that reported "on screen" within this window owns the clock. */
const CLIP_OWNERSHIP_MS = 100;
/** Play was pressed on the JS thread; the UI thread stamps the next frame's time. */
const PRESS_PENDING = -1;

/**
 * The compositor's single timeline clock, shared by every layer.
 *
 * Media is the master: while a video clip is on screen and playing, its layer writes
 * the playhead from the player's own time (so picture, sound and anything drawn
 * from the playhead stay in sync). This clock only free-runs on real time where no
 * clip is on screen, detects the end, and records dev stats.
 */
export interface PlaybackClock {
  /** Timeline seconds. */
  playhead: SharedValue<number>;
  playing: SharedValue<boolean>;
  /** UI timestamp (ms) when a clip layer last claimed the clock. */
  clipOwnedAt: SharedValue<number>;
  /** Scene length, readable from worklets. */
  duration: SharedValue<number>;
  stats: SharedValue<PlaybackStats>;
}

export function usePlaybackClock(duration: number) {
  const playhead = useSharedValue(0);
  const playing = useSharedValue(false);
  const clipOwnedAt = useSharedValue(0);
  const durationSV = useSharedValue(duration);
  const stats = useSharedValue<PlaybackStats>(EMPTY_STATS);
  const playPressedAt = useSharedValue(0);
  const playheadAtPress = useSharedValue(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    durationSV.value = duration;
    if (playhead.value > duration) {
      playhead.value = duration;
    }
  }, [duration, durationSV, playhead]);

  useFrameCallback(info => {
    if (!playing.value) {
      return;
    }
    const dt = info.timeSincePreviousFrame ?? 0;
    const s = stats.value;
    let startLatencyMs = s.startLatencyMs;
    if (playPressedAt.value === PRESS_PENDING) {
      playPressedAt.value = info.timestamp; // first UI frame after Play
    } else if (playPressedAt.value > 0 && playhead.value !== playheadAtPress.value) {
      startLatencyMs = info.timestamp - playPressedAt.value;
      playPressedAt.value = 0;
    }
    stats.value = {
      ...s,
      frames: s.frames + 1,
      slowFrames: s.slowFrames + (dt > SLOW_FRAME_MS ? 1 : 0),
      worstFrameMs: Math.max(s.worstFrameMs, dt),
      startLatencyMs,
    };

    const clipOwnsClock = info.timestamp - clipOwnedAt.value < CLIP_OWNERSHIP_MS;
    if (!clipOwnsClock) {
      playhead.value = Math.min(durationSV.value, playhead.value + dt / 1000);
    }
    if (playhead.value >= durationSV.value) {
      playhead.value = durationSV.value;
      playing.value = false;
      scheduleOnRN(setIsPlaying, false);
    }
  });

  const play = useCallback(() => {
    if (playhead.value >= durationSV.value) {
      playhead.value = 0;
    }
    stats.value = EMPTY_STATS;
    playheadAtPress.value = playhead.value;
    playPressedAt.value = PRESS_PENDING;
    playing.value = true;
    setIsPlaying(true);
  }, [playhead, durationSV, stats, playheadAtPress, playPressedAt, playing]);

  const pause = useCallback(() => {
    playing.value = false;
    setIsPlaying(false);
  }, [playing]);

  const seekTo = useCallback(
    (seconds: number) => {
      playhead.value = Math.max(0, Math.min(durationSV.value, seconds));
    },
    [playhead, durationSV],
  );

  const clock: PlaybackClock = {playhead, playing, clipOwnedAt, duration: durationSV, stats};
  return {clock, isPlaying, play, pause, seekTo};
}
