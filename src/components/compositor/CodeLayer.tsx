import React, {useEffect, useMemo} from 'react';
import {Picture, useTypeface} from '@shopify/react-native-skia';
import {useDerivedValue} from 'react-native-reanimated';
import {
  bakeGraphic,
  bakedIndexAt,
  createMeasurer,
  emptyPicture,
  type BakedGraphic,
} from './jsxSkiaRenderer';
import {isVisibleAt, type SceneCode, type SceneFont} from './scene';
import type {PlaybackClock} from './usePlaybackClock';

interface Props {
  code: SceneCode;
  frame: {width: number; height: number};
  fonts: SceneFont[];
  clock: PlaybackClock;
  /** Dev measurement: how long the last bake took. */
  onBaked?: (stats: BakedGraphic['stats']) => void;
}

/**
 * A `<code>` layer (captions). The template is baked into one picture per distinct frame
 * whenever its props change (a new rev hot-swaps them; the video stays mounted), and the
 * UI thread picks the picture for the playhead each frame — so text changes land on the
 * exact frame, with no JS-thread work during playback.
 */
export function CodeLayer({code, frame, fonts, clock, onBaked}: Props) {
  const {playhead, duration} = clock;
  const {width, height} = frame;
  // Kits ship one font for now; its templates draw everything with it.
  const typeface = useTypeface(fonts[0]?.uri);

  const baked = useMemo(
    () => (typeface ? bakeGraphic(code, {width, height}, createMeasurer(typeface)) : null),
    [code, width, height, typeface],
  );
  useEffect(() => {
    if (baked) {
      onBaked?.(baked.stats);
    }
  }, [baked, onBaked]);

  const times = baked?.times ?? [];
  const pictures = baked?.pictures ?? [];
  const {start, end} = code;
  const empty = emptyPicture();
  const picture = useDerivedValue(() => {
    const t = playhead.value;
    if (!isVisibleAt(start, end, t, duration.value)) {
      return empty;
    }
    const i = bakedIndexAt(times, t - start);
    return i < 0 ? empty : pictures[i];
  }, [times, pictures, start, end, empty]);

  return <Picture picture={picture} />;
}
