import {ImageFormat, Skia} from '@shopify/react-native-skia';
import {bakeGraphic, createMeasurer} from './jsxSkiaRenderer';
import type {Scene, SceneCaptionLayer} from './scene';

/**
 * The scene's `<code>` layers (captions) as transparent full-frame PNGs, one per distinct
 * frame, for export: the same bake the live preview draws, rasterised offscreen at
 * timeline size. Runs on the JS thread (the bake is plain JS).
 */
export async function renderCaptionFrames(scene: Scene): Promise<SceneCaptionLayer[]> {
  const codes = scene.layers.filter(l => l.kind === 'code');
  if (codes.length === 0) {
    return [];
  }
  // Kits ship one font for now; templates draw everything with it (as CodeLayer does).
  const fontUri = scene.fonts[0]?.uri;
  if (!fontUri) {
    throw new Error('The kit has no font to draw captions with');
  }
  const typeface = Skia.Typeface.MakeFreeTypeFaceFromData(await Skia.Data.fromURI(fontUri));
  if (!typeface) {
    throw new Error('Could not load the caption font');
  }
  const frame = {width: scene.width, height: scene.height};
  const measurer = createMeasurer(typeface);
  const surface = Skia.Surface.MakeOffscreen(frame.width, frame.height);
  if (!surface) {
    throw new Error('Could not create an offscreen surface');
  }
  const canvas = surface.getCanvas();
  const transparent = Skia.Color('transparent');

  return codes.map(code => {
    const {times, pictures} = bakeGraphic(code, frame, measurer);
    return {
      id: code.id,
      frames: pictures.map((picture, i) => {
        canvas.clear(transparent);
        canvas.drawPicture(picture);
        surface.flush();
        return {
          start: code.start + times[i],
          end: i + 1 < times.length ? code.start + times[i + 1] : code.end,
          png: surface.makeImageSnapshot().encodeToBytes(ImageFormat.PNG),
        };
      }),
    };
  });
}
