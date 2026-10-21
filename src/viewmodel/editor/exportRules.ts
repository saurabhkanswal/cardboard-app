import type {ExportManifest} from '../../model/bridge/protocol';
import type {EditorStatus} from './useEditorViewModel';

/**
 * Export domain: the phone renders the `<code>` layers (captions) to PNGs, the bridge
 * composites them over the clips into an MP4, and the phone saves it to Photos.
 */

/** One rendered caption frame, shown from `start` to `end` (timeline seconds). */
export interface ExportFrame {
  start: number;
  end: number;
  png: Uint8Array;
}

/** A `<code>` layer rendered for export (the compositor's caption frames satisfy this). */
export interface ExportLayer {
  /** The `<code>` element's id in the exported rev. */
  id: string;
  frames: ExportFrame[];
}

export type ExportPhase = 'idle' | 'uploading' | 'rendering' | 'saving' | 'saved' | 'error';

export const isExportBusy = (phase: ExportPhase) =>
  phase === 'uploading' || phase === 'rendering' || phase === 'saving';

/**
 * Only a settled, committed timeline exports: mid-turn drafts may change under the
 * render, and the bridge renders the committed rev.
 */
export function canExport(input: {
  status: EditorStatus;
  isDraft: boolean;
  duration: number;
  phase: ExportPhase;
}): boolean {
  return (
    input.status === 'ready' && !input.isDraft && input.duration > 0 && !isExportBusy(input.phase)
  );
}

/** Splits rendered layers into the wire manifest and the PNGs, in manifest order. */
export function toExportManifest(
  rev: number,
  layers: ExportLayer[],
): {manifest: ExportManifest; pngs: Uint8Array[]} {
  return {
    manifest: {
      rev,
      layers: layers.map(l => ({
        elementId: l.id,
        frames: l.frames.map(f => ({start: f.start, end: f.end})),
      })),
    },
    pngs: layers.flatMap(l => l.frames.map(f => f.png)),
  };
}
