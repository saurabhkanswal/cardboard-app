import type {
  ClipElement,
  CodeElement,
  PairingPayload,
  TimelineModel,
} from '../../model/bridge/protocol';
import {bindGraphic, type Graphic} from './composition';

/**
 * Editor domain: the bridge's timeline model resolved into what the compositor draws.
 * Screens and components only ever see these types, never the wire DTOs.
 */

export interface ClipTransform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

/** A video clip, ready to play: its media resolved to a URI the player can open. */
export interface EditorClip {
  kind: 'clip';
  id: string;
  uri: string;
  /** Timeline seconds. */
  start: number;
  end: number;
  /** Source seconds. */
  in: number;
  out: number;
  /** 0–1. */
  volume: number;
  opacity: number;
  transform: ClipTransform;
}

/** A `<code>` layer (captions): its template bound to the element's props. */
export interface EditorCode {
  kind: 'code';
  id: string;
  /** Workspace path of the template; identifies the layer across revs. */
  template: string;
  /** Timeline seconds. */
  start: number;
  end: number;
  graphic: Graphic;
}

export type EditorLayer = EditorClip | EditorCode;

export interface EditorFont {
  family: string;
  weight: number;
  uri: string;
}

export interface EditorTimeline {
  /** Frame size in timeline pixels (1080×1920 for 9:16). */
  width: number;
  height: number;
  duration: number;
  /** Visual layers, BACK to front (the model lists the top track first). */
  layers: EditorLayer[];
  /** Fonts the `<code>` layers draw with. */
  fonts: EditorFont[];
}

/** Compiled `<code>` template sources by workspace path (see `templatesOf`). */
export type TemplateSources = Record<string, string>;

const IDENTITY: ClipTransform = {x: 0, y: 0, scale: 1, rotation: 0};

/** Bridge media path → playable URL (players can't send headers, so the token rides along). */
export function mediaUrl(pairing: PairingPayload, path: string): string {
  return `${pairing.url}${path}?token=${encodeURIComponent(pairing.token)}`;
}

/** Templates the model's `<code>` elements use, sorted (a stable request key). */
export function templatesOf(model: TimelineModel): string[] {
  const paths = new Set<string>();
  for (const track of model.tracks) {
    for (const el of track.elements) {
      if (el.kind === 'code') {
        paths.add(el.template);
      }
    }
  }
  return [...paths].sort();
}

export interface EditorTimelineResult {
  timeline: EditorTimeline;
  /** `<code>` elements whose template failed to evaluate (they are left out). */
  templateErrors: string[];
}

/**
 * `<code>` elements whose template hasn't arrived yet are left out until it does, so the
 * footage shows as soon as possible.
 */
export function toEditorTimeline(
  model: TimelineModel,
  pairing: PairingPayload,
  templates: TemplateSources,
): EditorTimelineResult {
  const media = new Map(model.media.map(m => [m.name, m]));
  const layers: EditorLayer[] = [];
  const templateErrors: string[] = [];

  // First track = top layer, so walk the tracks bottom-up to get back-to-front order.
  for (const track of [...model.tracks].reverse()) {
    if (track.kind !== 'video') {
      continue;
    }
    for (const el of track.elements) {
      if (el.kind === 'clip') {
        const entry = media.get(el.src);
        if (entry?.kind === 'video') {
          layers.push(toClip(el, mediaUrl(pairing, entry.path)));
        }
      } else if (el.kind === 'code') {
        const source = templates[el.template];
        if (source === undefined) {
          continue;
        }
        try {
          layers.push(toCode(el, source));
        } catch (e) {
          templateErrors.push(`${el.name ?? el.template}: ${e instanceof Error ? e.message : e}`);
        }
      }
      // <image>/<shader> layers arrive in later phases.
    }
  }

  return {
    timeline: {
      width: model.width,
      height: model.height,
      duration: model.duration,
      layers,
      fonts: model.fonts.map(f => ({family: f.family, weight: f.weight, uri: mediaUrl(pairing, f.path)})),
    },
    templateErrors,
  };
}

function toClip(el: ClipElement, uri: string): EditorClip {
  return {
    kind: 'clip',
    id: el.id,
    uri,
    start: el.start,
    end: el.end,
    in: el.in,
    out: el.out,
    volume: Math.max(0, el.volume) / 100,
    opacity: el.opacity ?? 1,
    transform: el.transform ?? IDENTITY,
  };
}

function toCode(el: CodeElement, source: string): EditorCode {
  return {
    kind: 'code',
    id: el.id,
    template: el.template,
    start: el.start,
    end: el.end,
    graphic: bindGraphic(source, el.props),
  };
}
