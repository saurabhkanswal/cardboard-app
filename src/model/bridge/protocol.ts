/**
 * Wire protocol between the Cardboard mobile app and this bridge.
 *
 * SOURCE OF TRUTH. This file is copied verbatim into the app at
 * `cardboard-app/src/model/bridge/protocol.ts` — keep it dependency-free (types and
 * constants only) and bump PROTOCOL_VERSION on any breaking change.
 */

export const PROTOCOL_VERSION = 3;

// ── Pairing ─────────────────────────────────────────────────────────────────────

/** Encoded in the pairing QR code (and printed as text for the simulator). */
export interface PairingPayload {
  v: typeof PROTOCOL_VERSION;
  /** Bridge base URL on the LAN, e.g. `http://192.168.1.20:8787`. */
  url: string;
  /** Shared secret; sent as `Authorization: Bearer <token>` or `?token=` on the socket/media. */
  token: string;
}

/** `GET /health` response. */
export interface HealthResponse {
  ok: true;
  protocolVersion: number;
  bridgeName: string;
}

// ── Timeline model (what `timeline.tsx` parses into) ──────────────────────────

export interface Transform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

interface ElementBase {
  /** Stable id. `auto:<track>:<index>` until the bridge writes a real id back at turn end. */
  id: string;
  name?: string;
  /** Timeline seconds. */
  start: number;
  end: number;
}

export interface ClipElement extends ElementBase {
  kind: 'clip';
  /** Media name (see `TimelineModel.media`). */
  src: string;
  /** Source seconds. */
  in: number;
  out: number;
  /** 0–100+. */
  volume: number;
  transform?: Transform;
  opacity?: number;
}

export interface ImageElement extends ElementBase {
  kind: 'image';
  src: string;
  transform?: Transform;
  opacity?: number;
}

export interface AudioElement extends ElementBase {
  kind: 'audio';
  src: string;
  in: number;
  out: number;
  volume: number;
  /** Fade durations in seconds. */
  fadeIn?: number;
  fadeOut?: number;
}

export interface CodeElement extends ElementBase {
  kind: 'code';
  /**
   * Workspace path of the template, e.g. `recipe/templates/captions.jsx`. The phone loads it
   * compiled from `GET /projects/:id/compiled/<template>`.
   */
  template: string;
  props: Record<string, unknown>;
}

export interface ShaderElement extends ElementBase {
  kind: 'shader';
  /** SkSL source (Phase 6). */
  sksl?: string;
  params?: Record<string, number>;
  amount?: number;
}

export type TimelineElement =
  | ClipElement
  | ImageElement
  | AudioElement
  | CodeElement
  | ShaderElement;

export interface Track {
  name: string;
  kind: 'video' | 'audio';
  /** Back-to-front order is the track list reversed: the FIRST track is the TOP layer. */
  elements: TimelineElement[];
}

export interface MediaEntry {
  name: string;
  kind: 'video' | 'audio' | 'image';
  /** Path on the bridge: `GET <url><path>?token=`. */
  path: string;
  duration?: number;
  width?: number;
  height?: number;
}

/** A font the kit's templates draw with (`<code>` layers). */
export interface FontEntry {
  /** CSS family name the templates use, e.g. `Inter`. */
  family: string;
  weight: number;
  /** Path on the bridge: `GET <url><path>?token=`. */
  path: string;
}

export interface TimelineModel {
  aspect: string;
  width: number;
  height: number;
  /** Seconds: the latest element end. */
  duration: number;
  tracks: Track[];
  media: MediaEntry[];
  /** From the project's kit. */
  fonts: FontEntry[];
}

export interface Diagnostic {
  level: 'error' | 'warning';
  message: string;
  elementId?: string;
  line?: number;
}

// ── Kits & projects ─────────────────────────────────────────────────────────────

/** `GET /kits` item. */
export interface KitSummary {
  id: string;
  name: string;
  aspect: string;
  description: string;
}

export type ProjectStatus =
  | 'transcribing'
  | 'ready'
  | 'agent-running'
  | 'error';

export interface ProjectSummary {
  id: string;
  kitId: string;
  status: ProjectStatus;
  /** Committed revision; each finished agent turn (or undo) changes it. */
  rev: number;
  /** Set when status is `error`. */
  error?: string;
}

/** Latest parse of `timeline.tsx`. `draft` = mid-turn save, not yet committed. */
export interface TimelineSnapshot {
  rev: number;
  draft: boolean;
  model: TimelineModel;
  diagnostics: Diagnostic[];
}

/** `POST /projects` (multipart: `video` file + `kitId`, optional `prompt`, `names`). */
export interface CreateProjectResponse {
  project: ProjectSummary;
}

/** `GET /projects/:id`. */
export interface ProjectResponse {
  project: ProjectSummary;
  timeline: TimelineSnapshot | null;
}

/** `POST /projects/:id/messages` body. */
export interface SendMessageRequest {
  text: string;
}

// ── Socket events ───────────────────────────────────────────────────────────────

export type AgentEvent =
  | {kind: 'text'; text: string}
  | {kind: 'tool'; name: string; summary: string}
  | {kind: 'done'; ok: boolean; message?: string};

/** Messages the bridge sends over the WebSocket (`/events?token=`). */
export type ServerEvent =
  | {type: 'hello'; protocolVersion: number; bridgeName: string}
  | {type: 'pong'; at: number}
  | {type: 'project'; project: ProjectSummary}
  | {type: 'timeline'; projectId: string; snapshot: TimelineSnapshot}
  | {type: 'agent'; projectId: string; event: AgentEvent}
  | {
      type: 'job';
      projectId: string;
      name: 'transcribe';
      state: 'running' | 'done' | 'error';
      message?: string;
    };

/** Messages the app sends over the WebSocket. */
export type ClientEvent =
  | {type: 'ping'; at: number}
  /** Start receiving a project's events (also replays its current state). */
  | {type: 'subscribe'; projectId: string}
  | {type: 'unsubscribe'; projectId: string};
