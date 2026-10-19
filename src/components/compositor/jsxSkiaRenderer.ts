import {Skia, type SkFont, type SkPicture, type SkTypeface} from '@shopify/react-native-skia';
import type {SceneCode, SceneGraphicChild, SceneGraphicNode} from './scene';

/**
 * Lays out and draws what a `<code>` template returns, for the CSS subset kit templates use:
 * - boxes: `width`/`height`, margins, `position: absolute` + `left`/`top` (relative to the
 *   parent box), `transform: translateX()/translateY()/translate()`, `opacity`;
 * - `display: flex` rows (no wrapping): `justifyContent` flex-start | center | flex-end |
 *   space-between, `alignItems` baseline | center | flex-start | flex-end;
 * - text on one line, with the inherited `fontSize`, `color`, `letterSpacing` and
 *   `lineHeight`, in the kit's font. `<span>`s flow inline; other boxes stack vertically.
 * Anything else is ignored. Lengths are numbers or `px` strings, as in React styles.
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

function elementItem(node: SceneGraphicNode, parent: Inherited, m: Measurer): Item {
  const style = styleOf(node);
  const inh = inherit(parent, style);
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
      inFlow.push(elementItem(child, inh, m));
    }
  }

  const fixedWidth = px(style.width);
  const fixedHeight = px(style.height);
  const content =
    style.display === 'flex' && (style.flexDirection ?? 'row') === 'row'
      ? rowLayout(inFlow, fixedWidth, fixedHeight, style.justifyContent, style.alignItems)
      : allInline
        ? rowLayout(inFlow, fixedWidth, fixedHeight, 'flex-start', 'baseline')
        : stackLayout(inFlow);
  const [tx, ty] = translateOf(style.transform);

  return {
    width: fixedWidth ?? content.width,
    height: fixedHeight ?? content.height,
    baseline: content.baseline,
    margin: marginOf(style),
    place(x, y, out) {
      content.place(x + tx, y + ty, out);
      for (const child of absolute) {
        placeAbsolute(child, inh, m, x + tx, y + ty, out);
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
  out: TextRun[],
) {
  const style = styleOf(node);
  const item = elementItem(node, inh, m);
  item.place(x + (px(style.left) ?? 0) + item.margin[3], y + (px(style.top) ?? 0) + item.margin[0], out);
}

/** A template's output → positioned text runs (the root boxes start at the frame's corner). */
export function layoutGraphic(tree: SceneGraphicChild, m: Measurer): TextRun[] {
  const out: TextRun[] = [];
  for (const node of flatten([tree])) {
    if (typeof node === 'string') {
      textItem(node, ROOT, m).place(0, 0, out);
    } else {
      placeAbsolute(node, ROOT, m, 0, 0, out);
    }
  }
  return out;
}

export function recordRuns(
  runs: TextRun[],
  frame: {width: number; height: number},
  m: Measurer,
): SkPicture {
  const recorder = Skia.PictureRecorder();
  const canvas = recorder.beginRecording(Skia.XYWHRect(0, 0, frame.width, frame.height));
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
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
    paint.setColor(Skia.Color(run.color));
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
      runs = layoutGraphic(code.graphic({time, width: frame.width, height: frame.height}), m);
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
