import React from 'react';
import {Canvas, Fill, Group} from '@shopify/react-native-skia';
import {ClipLayer} from './ClipLayer';
import {CodeLayer} from './CodeLayer';
import type {BakedGraphic} from './jsxSkiaRenderer';
import type {Scene} from './scene';
import type {PlaybackClock} from './usePlaybackClock';

interface Props {
  scene: Scene;
  /** On-screen width in points; height follows the scene's aspect. */
  width: number;
  clock: PlaybackClock;
  /** Dev measurement: a `<code>` layer finished baking. */
  onCodeBaked?: (stats: BakedGraphic['stats']) => void;
}

/**
 * The live preview: `scene + playhead → frame`, redrawn by Skia every UI frame. Layers
 * are drawn back to front in timeline pixels (1080×1920 for 9:16) and scaled to fit.
 */
export function Compositor({scene, width, clock, onCodeBaked}: Props) {
  const height = (width * scene.height) / scene.width;
  const frame = {width: scene.width, height: scene.height};
  // Ids change from `auto:…` (mid-turn draft) to real ids at commit; keying layers by
  // source + occurrence keeps the same player (or baked captions) mounted across that switch.
  const seen = new Map<string, number>();
  const keys = scene.layers.map(layer => {
    const source = layer.kind === 'clip' ? layer.uri : `code:${layer.template}`;
    const n = seen.get(source) ?? 0;
    seen.set(source, n + 1);
    return `${source}#${n}`;
  });

  return (
    <Canvas style={{width, height}}>
      <Fill color="black" />
      <Group transform={[{scale: width / scene.width}]}>
        {scene.layers.map((layer, i) =>
          layer.kind === 'clip' ? (
            <ClipLayer key={keys[i]} clip={layer} frame={frame} clock={clock} />
          ) : (
            <CodeLayer
              key={keys[i]}
              code={layer}
              frame={frame}
              fonts={scene.fonts}
              clock={clock}
              onBaked={onCodeBaked}
            />
          ),
        )}
      </Group>
    </Canvas>
  );
}
