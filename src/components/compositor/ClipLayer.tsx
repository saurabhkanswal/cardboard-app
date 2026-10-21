import React, {useEffect} from 'react';
import {Group, Image, useVideo} from '@shopify/react-native-skia';
import {
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';
import {coverPlacement, isVisibleAt, sourceTimeAt, type SceneClip} from './scene';
import type {PlaybackClock} from './usePlaybackClock';

interface Props {
  clip: SceneClip;
  frame: {width: number; height: number};
  clock: PlaybackClock;
}

/** While paused/scrubbing, seek when the wanted frame moves by more than this. */
const SCRUB_STEP_S = 0.02;
/** While playing, re-align only if the player is this far off (e.g. after an edit). */
const REALIGN_TOLERANCE_S = 0.25;
/** …and not more often than this, so a slow seek can't trigger a seek storm. */
const MIN_SEEK_INTERVAL_MS = 500;
/** A player within this of the clip's out point has finished the clip. */
const OUT_EPSILON_S = 0.05;
/**
 * Skia's iOS player only extracts a frame after a seek that changes the time, so a
 * fresh player (at 0) seeking to 0 would never show one. Never seek below 1 ms.
 */
const MIN_SEEK_MS = 1;

/**
 * One video clip as a Skia layer, following the shared clock:
 * - paused / scrubbing: seeks its player to the playhead's frame;
 * - playing and on screen: it DRIVES the playhead from its player's time (media is the
 *   master clock, so picture, sound and playhead-drawn layers never drift apart).
 * Skia's video API is in milliseconds.
 */
export function ClipLayer({clip, frame, clock}: Props) {
  const {playhead, playing, clipOwnedAt, duration, stats} = clock;
  const paused = useSharedValue(true);
  const seek = useSharedValue<number | null>(null);
  const volume = useSharedValue(clip.volume);
  const timing = useSharedValue({start: clip.start, end: clip.end, in: clip.in, out: clip.out});
  const lastSeekTarget = useSharedValue(-1);
  const lastSeekAt = useSharedValue(0);

  // Agent edits change timing/volume in place; the player stays mounted.
  useEffect(() => {
    timing.value = {start: clip.start, end: clip.end, in: clip.in, out: clip.out};
    volume.value = clip.volume;
  }, [clip.start, clip.end, clip.in, clip.out, clip.volume, timing, volume]);

  const {currentFrame, currentTime, size, rotation} = useVideo(clip.uri, {
    paused,
    seek,
    volume,
    looping: false,
  });

  // Seeks issued before the player finished loading are dropped by useVideo; once it
  // reports a size it is ready, so forget the last target and seek again.
  useEffect(() => {
    lastSeekTarget.value = -1;
  }, [size.width, size.height, lastSeekTarget]);

  useFrameCallback(info => {
    const c = timing.value;
    const t = playhead.value;
    const onScreen = isVisibleAt(c.start, c.end, t, duration.value);
    const shouldPlay = onScreen && playing.value && t < c.end;
    const want = sourceTimeAt(c, t);
    if (paused.value === shouldPlay) {
      paused.value = !shouldPlay;
      // Just stopped (paused, or the timeline ended and rewound) with the player
      // elsewhere: `lastSeekTarget` is stale from playback, so force the paused seek.
      // Otherwise a rewind to 0 is skipped and the player stays parked at its end,
      // where the next play() does nothing.
      if (!shouldPlay && Math.abs(currentTime.value / 1000 - want) > SCRUB_STEP_S) {
        lastSeekTarget.value = -1;
      }
    }
    if (!onScreen) {
      return;
    }

    if (!shouldPlay) {
      if (Math.abs(want - lastSeekTarget.value) > SCRUB_STEP_S) {
        seek.value = Math.max(MIN_SEEK_MS, want * 1000);
        lastSeekTarget.value = want;
      }
      return;
    }

    clipOwnedAt.value = info.timestamp;
    const playerT = currentTime.value / 1000;
    if (
      Math.abs(playerT - want) > REALIGN_TOLERANCE_S &&
      info.timestamp - lastSeekAt.value > MIN_SEEK_INTERVAL_MS
    ) {
      // Player is somewhere else entirely (an edit moved the clip, stale start): jump it.
      seek.value = Math.max(MIN_SEEK_MS, want * 1000);
      lastSeekTarget.value = want;
      lastSeekAt.value = info.timestamp;
      stats.value = {...stats.value, playingSeeks: stats.value.playingSeeks + 1};
      return;
    }
    if (playerT >= c.out - OUT_EPSILON_S) {
      playhead.value = c.end; // clip finished: hand the clock on
      return;
    }
    const next = c.start + (playerT - c.in);
    if (next > t) {
      playhead.value = next; // never step backwards (frame times arrive in steps)
    }
  });

  const placement = coverPlacement(size, rotation, frame, clip.transform);
  const transform = [
    {translateX: placement.cx},
    {translateY: placement.cy},
    {rotate: placement.rotation},
  ];
  const opacity = useDerivedValue(() =>
    isVisibleAt(timing.value.start, timing.value.end, playhead.value, duration.value)
      ? clip.opacity
      : 0,
  );

  if (size.width === 0 || size.height === 0) {
    return null; // still loading: no frame size to place yet
  }

  return (
    <Group transform={transform} opacity={opacity}>
      <Image
        image={currentFrame}
        x={-placement.width / 2}
        y={-placement.height / 2}
        width={placement.width}
        height={placement.height}
        fit="fill"
      />
    </Group>
  );
}
