/**
 * What the compositor draws, declared structurally here because components may not
 * import the ViewModel. `viewmodel/editor/timeline.ts`'s EditorTimeline satisfies it.
 */

export interface SceneTransform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface SceneClip {
  kind: 'clip';
  id: string;
  uri: string;
  start: number;
  end: number;
  in: number;
  out: number;
  volume: number;
  opacity: number;
  transform: SceneTransform;
}

/** What a `<code>` template returns: JSX built as plain data nodes. */
export interface SceneGraphicNode {
  type: string;
  props: Record<string, unknown>;
  children: SceneGraphicChild[];
}

export type SceneGraphicChild =
  | SceneGraphicNode
  | string
  | number
  | boolean
  | null
  | undefined
  | SceneGraphicChild[];

/** A `<code>` layer: `graphic` is called with seconds since `start`. */
export interface SceneCode {
  kind: 'code';
  id: string;
  template: string;
  start: number;
  end: number;
  graphic: (frame: {time: number; width: number; height: number}) => SceneGraphicChild;
}

export type SceneLayer = SceneClip | SceneCode;

export interface SceneFont {
  family: string;
  weight: number;
  uri: string;
}

/** A `<code>` layer rendered for export: full-frame PNGs shown from `start` to `end`. */
export interface SceneCaptionLayer {
  id: string;
  frames: {start: number; end: number; png: Uint8Array}[];
}

export interface Scene {
  width: number;
  height: number;
  duration: number;
  /** Back to front. */
  layers: SceneLayer[];
  fonts: SceneFont[];
}

/**
 * Rendering mechanics only (no editing rules). Functions marked 'worklet' run on the UI
 * thread every frame, so keep them allocation-light.
 */

/**
 * Is an element on screen at time `t`? `end` is exclusive, except that an element
 * ending exactly at the end of the scene stays visible there, so the final frame holds
 * instead of going black.
 */
export function isVisibleAt(start: number, end: number, t: number, sceneDuration: number): boolean {
  'worklet';
  return (t >= start && t < end) || (t === end && end >= sceneDuration);
}

/** Source time a clip shows at timeline time `t`. */
export function sourceTimeAt(clip: {start: number; in: number; out: number}, t: number): number {
  'worklet';
  return Math.min(clip.out, Math.max(clip.in, clip.in + (t - clip.start)));
}

/** Where a video frame is drawn: centre, unrotated size, rotation in radians. */
export interface CoverPlacement {
  cx: number;
  cy: number;
  width: number;
  height: number;
  rotation: number;
}

/**
 * Cardboard transform semantics: the clip first COVERS the frame (fills it, centred),
 * then `scale` multiplies that, `x`/`y` shift it in frame pixels and `rotation` turns it
 * (degrees). `videoRotation` is the file's orientation metadata (phones record portrait
 * as a rotated landscape stream).
 */
export function coverPlacement(
  video: {width: number; height: number},
  videoRotation: number,
  frame: {width: number; height: number},
  transform: SceneTransform,
): CoverPlacement {
  const quarterTurn = Math.abs(videoRotation) % 180 === 90;
  const shownW = quarterTurn ? video.height : video.width;
  const shownH = quarterTurn ? video.width : video.height;
  const cover = Math.max(frame.width / shownW, frame.height / shownH) * transform.scale;
  return {
    cx: frame.width / 2 + transform.x,
    cy: frame.height / 2 + transform.y,
    width: video.width * cover,
    height: video.height * cover,
    rotation: ((videoRotation + transform.rotation) * Math.PI) / 180,
  };
}
