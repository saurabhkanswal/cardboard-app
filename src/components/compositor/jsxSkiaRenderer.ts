import {
  BlurStyle,
  Skia,
  type SkFont,
  type SkPaint,
  type SkPicture,
  type SkRuntimeEffect,
  type SkTypeface,
} from '@shopify/react-native-skia';
import type {SceneCode, SceneGraphicChild, SceneGraphicNode} from './scene';

/**
 * Lays out and draws what a `<code>` template returns, for the CSS subset kit templates use:
 * - boxes: `width`/`height`, margins, `position: absolute` + `left`/`top`/`right`/`bottom`
 *   (relative to the parent box), `transform: translateX()/translateY()/translate()`, `opacity`;
 * - `display: flex` rows (no wrapping): `justifyContent` flex-start | center | flex-end |
 *   space-between, `alignItems` baseline | center | flex-start | flex-end;
 * - text on one line, with the inherited `fontSize`, `color`, `letterSpacing`, `lineHeight` and
 *   `textShadow`, in the kit's font. `<span>`s flow inline; other boxes stack vertically;
 * - dotted text: `backgroundClip: 'text'` with a `radial-gradient(circle, <color> a%,
 *   transparent b%)` image tiled by `backgroundSize` (a dot-matrix fill).
 * Anything else is ignored. Lengths are numbers, `px` strings, or `%` of the parent box.
 */

/** One run of text, positioned in frame pixels. Plain data, so frames can be compared. */
export interface TextRun {
  text: string;
  x: number;
  /** Baseline. */
  y: number;
  size: number;
  spacing: number;
  color: string;
  opacity: number;
  /** Dot-matrix fill instead of `color`. */
  dots?: DotFill;
  shadow?: TextShadow;
}

/** A grid of round dots, `cell` px apart, painted in `color`. */
export interface DotFill {
  color: string;
  cell: number;
  radius: number;
}

export interface TextShadow {
  dx: number;
  dy: number;
  blur: number;
  color: string;
}

export interface Measurer {
  font(size: number): SkFont;
}

type Style = Record<string, unknown>;

interface Inherited {
  fontSize: number;
  color: string;
  letterSpacing: number;
  /** Unitless multiplier (number) or a CSS length. */
  lineHeight: unknown;
  opacity: number;
  dots?: DotFill;
  shadow?: TextShadow;
}

/** The containing block that `%` lengths resolve against. */
interface Box {
  width?: number;
  height?: number;
}

/** A laid-out box: its size, baseline from its top, and how to emit its text at a position. */
interface Item {
  width: number;
  height: number;
  baseline: number;
  /** top, right, bottom, left. */
  margin: [number, number, number, number];
  place(x: number, y: number, out: TextRun[]): void;
}

const ROOT: Inherited = {
  fontSize: 16,
  color: '#000000',
  letterSpacing: 0,
  lineHeight: 'normal',
  opacity: 1,
};
const NO_MARGIN: Item['margin'] = [0, 0, 0, 0];
/** CSS `line-height: normal`, roughly. */
const NORMAL_LINE_HEIGHT = 1.2;

export function createMeasurer(typeface: SkTypeface): Measurer {
  const fonts = new Map<number, SkFont>();
  return {
    font(size) {
      let font = fonts.get(size);
      if (!font) {
        font = Skia.Font(typeface, size);
        fonts.set(size, font);
      }
      return font;
    },
  };
}

function px(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === 'string' && /^-?[\d.]+(px)?$/.test(value.trim())) {
    return parseFloat(value);
  }
  return undefined;
}

/** `px`, plus `%` of `basis` (a parent box side) when it's known. */
function len(value: unknown, basis: number | undefined): number | undefined {
  if (typeof value === 'string' && basis !== undefined) {
    const pct = /^(-?[\d.]+)%$/.exec(value.trim());
    if (pct) {
      return (parseFloat(pct[1]) / 100) * basis;
    }
  }
  return px(value);
}

/** `radial-gradient(circle, <color> a%, transparent b%)` tiled by `backgroundSize: 'Npx …'`. */
function dotsOf(style: Style): DotFill | undefined {
  const clip = style.backgroundClip ?? style.WebkitBackgroundClip;
  if (clip !== 'text' || typeof style.backgroundImage !== 'string') {
    return undefined;
  }
  const g = /radial-gradient\(\s*circle\s*,\s*([^\s,]+)\s+([\d.]+)%\s*,\s*transparent\s+([\d.]+)%\s*\)/.exec(
    style.backgroundImage,
  );
  const cell = typeof style.backgroundSize === 'string' ? px(style.backgroundSize.trim().split(/\s+/)[0]) : undefined;
  if (!g || !cell) {
    return undefined;
  }
  // A `circle` gradient's 100% is the farthest corner: half the tile's diagonal. The dot's
  // edge sits midway through the color→transparent transition.
  const reach = (cell * Math.SQRT2) / 2;
  return {color: g[1], cell, radius: (((parseFloat(g[2]) + parseFloat(g[3])) / 2) / 100) * reach};
}

/** `textShadow: '<x> <y> [blur] <color>'` (first shadow only). */
function shadowOf(value: unknown): TextShadow | undefined {
  if (typeof value !== 'string' || value === 'none') {
    return undefined;
  }
  const parts = value.split(',')[0].trim().split(/\s+/);
  const lengths = parts.map(px);
  const color = parts.find((_, i) => lengths[i] === undefined);
  const [dx, dy, blur = 0] = lengths.filter((n): n is number => n !== undefined);
  return color && dx !== undefined && dy !== undefined ? {dx, dy, blur, color} : undefined;
}

function styleOf(node: SceneGraphicNode): Style {
  const style = node.props.style;
  return style && typeof style === 'object' ? (style as Style) : {};
}

function inherit(parent: Inherited, style: Style): Inherited {
  return {
    fontSize: px(style.fontSize) ?? parent.fontSize,
    color: typeof style.color === 'string' ? style.color : parent.color,
    letterSpacing: px(style.letterSpacing) ?? parent.letterSpacing,
    lineHeight: style.lineHeight ?? parent.lineHeight,
    // Not inherited in CSS, but for non-overlapping text a group's opacity is the same thing.
    opacity: parent.opacity * (typeof style.opacity === 'number' ? style.opacity : 1),
    // A background clipped to text fills the text of the whole subtree.
    dots: dotsOf(style) ?? parent.dots,
    shadow: style.textShadow !== undefined ? shadowOf(style.textShadow) : parent.shadow,
  };
}

function lineHeightPx(lineHeight: unknown, fontSize: number): number {
  if (typeof lineHeight === 'number') {
    return lineHeight * fontSize;
  }
  return px(lineHeight) ?? NORMAL_LINE_HEIGHT * fontSize;
}

function marginOf(style: Style): Item['margin'] {
  const all = px(style.margin) ?? 0;
  return [
    px(style.marginTop) ?? all,
    px(style.marginRight) ?? all,
    px(style.marginBottom) ?? all,
    px(style.marginLeft) ?? all,
  ];
}

function translateOf(transform: unknown): [number, number] {
  if (typeof transform !== 'string') {
    return [0, 0];
  }
  const num = (re: RegExp) => parseFloat(re.exec(transform)?.[1] ?? '0');
  const both = /translate\(\s*(-?[\d.]+)(?:px)?\s*,\s*(-?[\d.]+)(?:px)?\s*\)/.exec(transform);
  return [
    (both ? parseFloat(both[1]) : 0) + num(/translateX\(\s*(-?[\d.]+)/),
    (both ? parseFloat(both[2]) : 0) + num(/translateY\(\s*(-?[\d.]+)/),
  ];
}

function flatten(children: SceneGraphicChild[], out: (SceneGraphicNode | string)[] = []) {
  for (const child of children) {
    if (Array.isArray(child)) {
      flatten(child, out);
    } else if (typeof child === 'string' || typeof child === 'number') {
      out.push(String(child));
    } else if (child && typeof child === 'object') {
      out.push(child);
    }
  }
  return out;
}

/** Text advances in CSS terms: letter-spacing is added after every character. */
function advances(text: string, inh: Inherited, m: Measurer): number[] {
  const font = m.font(inh.fontSize);
  return font.getGlyphWidths(font.getGlyphIDs(text)).map(w => w + inh.letterSpacing);
}

function textItem(text: string, inh: Inherited, m: Measurer): Item {
  const width = advances(text, inh, m).reduce((a, b) => a + b, 0);
  const {ascent, descent} = m.font(inh.fontSize).getMetrics(); // ascent is negative
  const height = lineHeightPx(inh.lineHeight, inh.fontSize);
  // The glyphs' content area is centred in the line box (half-leading on each side).
  const baseline = (height - (descent - ascent)) / 2 - ascent;
  return {
    width,
    height,
    baseline,
    margin: NO_MARGIN,
    place: (x, y, out) =>
      out.push({
        text,
        x,
        y: y + baseline,
        size: inh.fontSize,
        spacing: inh.letterSpacing,
        color: inh.color,
        opacity: inh.opacity,
        ...(inh.dots && {dots: inh.dots}),
        ...(inh.shadow && {shadow: inh.shadow}),
      }),
  };
}

type Content = Omit<Item, 'margin'>;

function rowLayout(
  items: Item[],
  fixedWidth: number | undefined,
  fixedHeight: number | undefined,
  justify: unknown,
  align: unknown,
): Content {
  const total = items.reduce((sum, i) => sum + i.margin[3] + i.width + i.margin[1], 0);
  const width = fixedWidth ?? total;
  const free = width - total;
  const startX = justify === 'center' ? free / 2 : justify === 'flex-end' ? free : 0;
  const gap = justify === 'space-between' && items.length > 1 ? free / (items.length - 1) : 0;

  const outerHeights = items.map(i => i.margin[0] + i.height + i.margin[2]);
  // Baseline alignment: the item reaching deepest to its baseline sits flush with the top.
  const baseline = Math.max(0, ...items.map(i => i.margin[0] + i.baseline));
  const contentHeight =
    align === 'baseline'
      ? Math.max(0, ...items.map(i => baseline - i.baseline + i.height + i.margin[2]))
      : Math.max(0, ...outerHeights);
  const height = fixedHeight ?? contentHeight;
  const tops = items.map((i, k) =>
    align === 'baseline'
      ? baseline - i.baseline
      : align === 'center'
        ? (height - outerHeights[k]) / 2 + i.margin[0]
        : align === 'flex-end'
          ? height - outerHeights[k] + i.margin[0]
          : i.margin[0],
  );

  return {
    width,
    height,
    baseline: items.length ? tops[0] + items[0].baseline : height,
    place(x, y, out) {
      let cx = x + startX;
      items.forEach((item, k) => {
        cx += item.margin[3];
        item.place(cx, y + tops[k], out);
        cx += item.width + item.margin[1] + gap;
      });
    },
  };
}

function stackLayout(items: Item[]): Content {
  const tops: number[] = [];
  let height = 0;
  for (const item of items) {
    tops.push(height + item.margin[0]);
    height += item.margin[0] + item.height + item.margin[2];
  }
  return {
    width: Math.max(0, ...items.map(i => i.margin[3] + i.width + i.margin[1])),
    height,
    baseline: items.length ? tops[0] + items[0].baseline : height,
    place(x, y, out) {
      items.forEach((item, k) => item.place(x + item.margin[3], y + tops[k], out));
    },
  };
}

function elementItem(node: SceneGraphicNode, parent: Inherited, m: Measurer, box: Box): Item {
  const style = styleOf(node);
  const inh = inherit(parent, style);
  const fixedWidth = len(style.width, box.width);
  const fixedHeight = len(style.height, box.height);
  // In-flow children resolve `%` against this box when its size is fixed.
  const own: Box = {width: fixedWidth, height: fixedHeight};
  const inFlow: Item[] = [];
  const absolute: SceneGraphicNode[] = [];
  let allInline = true;
  for (const child of flatten(node.children)) {
    if (typeof child === 'string') {
      inFlow.push(textItem(child, inh, m));
    } else if (styleOf(child).position === 'absolute') {
      absolute.push(child);
    } else {
      allInline = allInline && child.type === 'span';
      inFlow.push(elementItem(child, inh, m, own));
    }
  }

  const content =
    style.display === 'flex' && (style.flexDirection ?? 'row') === 'row'
      ? rowLayout(inFlow, fixedWidth, fixedHeight, style.justifyContent, style.alignItems)
      : allInline
        ? rowLayout(inFlow, fixedWidth, fixedHeight, 'flex-start', 'baseline')
        : stackLayout(inFlow);
  const [tx, ty] = translateOf(style.transform);
  const width = fixedWidth ?? content.width;
  const height = fixedHeight ?? content.height;

  return {
    width,
    height,
    baseline: content.baseline,
    margin: marginOf(style),
    place(x, y, out) {
      content.place(x + tx, y + ty, out);
      for (const child of absolute) {
        placeAbsolute(child, inh, m, x + tx, y + ty, {width, height}, out);
      }
    },
  };
}

function placeAbsolute(
  node: SceneGraphicNode,
  inh: Inherited,
  m: Measurer,
  x: number,
  y: number,
  box: Box,
  out: TextRun[],
) {
  const style = styleOf(node);
  const item = elementItem(node, inh, m, box);
  const outerWidth = item.margin[3] + item.width + item.margin[1];
  const outerHeight = item.margin[0] + item.height + item.margin[2];
  const left = len(style.left, box.width);
  const top = len(style.top, box.height);
  const right = len(style.right, box.width);
  const bottom = len(style.bottom, box.height);
  const dx =
    left ?? (right !== undefined && box.width !== undefined ? box.width - right - outerWidth : 0);
  const dy =
    top ?? (bottom !== undefined && box.height !== undefined ? box.height - bottom - outerHeight : 0);
  item.place(x + dx + item.margin[3], y + dy + item.margin[0], out);
}

/** A template's output → positioned text runs (the root boxes start at the frame's corner). */
export function layoutGraphic(
  tree: SceneGraphicChild,
  m: Measurer,
  frame: {width: number; height: number},
): TextRun[] {
  const out: TextRun[] = [];
  for (const node of flatten([tree])) {
    if (typeof node === 'string') {
      textItem(node, ROOT, m).place(0, 0, out);
    } else {
      placeAbsolute(node, ROOT, m, 0, 0, frame, out);
    }
  }
  return out;
}

/** Round dots on a `cell` grid, antialiased over one pixel. Premultiplied `color` uniform. */
const DOTS_SKSL = `
uniform float cell;
uniform float radius;
uniform half4 color;
half4 main(float2 p) {
  float2 q = mod(p, cell) - cell * 0.5;
  return color * half(clamp(radius + 0.5 - length(q), 0.0, 1.0));
}`;

let dotsEffect: SkRuntimeEffect | null = null;

function dotsPaint(paint: SkPaint, dots: DotFill) {
  dotsEffect ??= Skia.RuntimeEffect.Make(DOTS_SKSL);
  const [r, g, b, a] = Skia.Color(dots.color);
  if (dotsEffect) {
    paint.setShader(dotsEffect.makeShader([dots.cell, dots.radius, r * a, g * a, b * a, a]));
  } else {
    paint.setColor(Skia.Color(dots.color));
  }
}

export function recordRuns(
  runs: TextRun[],
  frame: {width: number; height: number},
  m: Measurer,
): SkPicture {
  const recorder = Skia.PictureRecorder();
  const canvas = recorder.beginRecording(Skia.XYWHRect(0, 0, frame.width, frame.height));
  for (const run of runs) {
    if (run.opacity <= 0) {
      continue;
    }
    const font = m.font(run.size);
    const glyphs = font.getGlyphIDs(run.text);
    const widths = font.getGlyphWidths(glyphs);
    let x = 0;
    const positions = glyphs.map((_, i) => {
      const at = Skia.Point(x, 0);
      x += widths[i] + run.spacing;
      return at;
    });
    if (run.shadow) {
      const shadow = Skia.Paint();
      shadow.setAntiAlias(true);
      shadow.setColor(Skia.Color(run.shadow.color));
      shadow.setAlphaf(shadow.getAlphaf() * run.opacity);
      if (run.shadow.blur > 0) {
        // CSS blur radius ≈ 2σ.
        shadow.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, run.shadow.blur / 2, true));
      }
      canvas.drawGlyphs(glyphs, positions, run.x + run.shadow.dx, run.y + run.shadow.dy, font, shadow);
    }
    const paint = Skia.Paint();
    paint.setAntiAlias(true);
    if (run.dots) {
      dotsPaint(paint, run.dots);
    } else {
      paint.setColor(Skia.Color(run.color));
    }
    paint.setAlphaf(paint.getAlphaf() * run.opacity);
    canvas.drawGlyphs(glyphs, positions, run.x, run.y, font, paint);
  }
  return recorder.finishRecordingAsPicture();
}

// ── Baking ────────────────────────────────────────────────────────────────────────

/** How often the template is sampled for changes… */
const SAMPLE_HZ = 30;
/** …and how precisely each change is then located (bisection). */
const CHANGE_PRECISION_S = 0.001;

/**
 * A `<code>` layer as a step function of time: `pictures[i]` shows from `times[i]` (seconds
 * since the element's start) until the next entry. Templates are plain JS (they can't run
 * on the UI thread), so they are evaluated here once per props change, on the JS thread.
 */
export interface BakedGraphic {
  times: number[];
  pictures: SkPicture[];
  stats: {samples: number; frames: number; ms: number};
}

export function bakeGraphic(
  code: SceneCode,
  frame: {width: number; height: number},
  m: Measurer,
): BakedGraphic {
  const began = Date.now();
  const length = Math.max(0, code.end - code.start);
  let samples = 0;
  let warned = false;
  const sample = (time: number) => {
    samples++;
    let runs: TextRun[] = [];
    try {
      runs = layoutGraphic(code.graphic({time, width: frame.width, height: frame.height}), m, frame);
    } catch (e) {
      if (__DEV__ && !warned) {
        warned = true;
        console.warn(`[code layer] ${code.template} threw at ${time.toFixed(3)}s`, e);
      }
    }
    return {runs, key: JSON.stringify(runs)};
  };

  let current = sample(0);
  let at = 0;
  const steps: {time: number; runs: TextRun[]}[] = [{time: 0, runs: current.runs}];
  for (let k = 1, n = Math.ceil(length * SAMPLE_HZ); k <= n; k++) {
    const t = Math.min(length, k / SAMPLE_HZ);
    const next = sample(t);
    // Find every change between `at` and `t` to the millisecond (there may be more than one).
    while (next.key !== current.key) {
      let lo = at;
      let hi = t;
      let found = next;
      while (hi - lo > CHANGE_PRECISION_S) {
        const mid = (lo + hi) / 2;
        const s = sample(mid);
        if (s.key === current.key) {
          lo = mid;
        } else {
          hi = mid;
          found = s;
        }
      }
      steps.push({time: hi, runs: found.runs});
      current = found;
      at = hi;
    }
    at = t;
  }

  return {
    times: steps.map(s => s.time),
    pictures: steps.map(s => recordRuns(s.runs, frame, m)),
    stats: {samples, frames: steps.length, ms: Date.now() - began},
  };
}

/** Index of the picture showing at `time` (seconds since the element's start), or -1. */
export function bakedIndexAt(times: number[], time: number): number {
  'worklet';
  if (times.length === 0 || time < times[0]) {
    return -1;
  }
  let lo = 0;
  let hi = times.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (times[mid] <= time) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return lo;
}

let empty: SkPicture | null = null;

export function emptyPicture(): SkPicture {
  if (!empty) {
    const recorder = Skia.PictureRecorder();
    recorder.beginRecording(Skia.XYWHRect(0, 0, 1, 1));
    empty = recorder.finishRecordingAsPicture();
  }
  return empty;
}
