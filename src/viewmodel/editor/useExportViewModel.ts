import {useCallback, useEffect, useRef, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {onBridgeEvent, subscribeProject} from '../../model/bridge/bridgeConnection';
import {useStartExportMutation, type BridgeError} from '../../model/bridge/bridgeApi';
import {selectPairing} from '../../model/bridge/pairingSlice';
import {deleteExport, downloadExport, exportUri, saveVideoToPhotos} from '../../model/export/exportFiles';
import {projectExported} from '../../model/export/exportedProjectsSlice';
import {
  canExport,
  isExportBusy,
  toExportManifest,
  type ExportLayer,
  type ExportPhase,
} from './exportRules';
import {mediaUrl} from './timeline';
import type {EditorStatus} from './useEditorViewModel';

/** What the editor knows about the timeline being exported. */
export interface ExportSource {
  status: EditorStatus;
  isDraft: boolean;
  rev: number;
  duration: number;
}

export interface ExportViewModel {
  phase: ExportPhase;
  /** 0–1 while the bridge renders. */
  progress: number;
  /** Set in the `error` phase. */
  error: string | null;
  canExport: boolean;
  /**
   * Uploads the rendered caption layers, waits for the bridge's MP4, saves it to Photos
   * and keeps a copy for "Your projects".
   */
  exportVideo: (layers: ExportLayer[]) => Promise<void>;
  /** Back to idle once the result (saved / error) has been shown. */
  acknowledge: () => void;
}

const PHOTOS_DENIED = 'Allow Cardboard to add to Photos in Settings, then export again.';

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * Feature ViewModel for exporting a project: the bridge renders the committed rev with
 * the phone's caption overlays, reporting progress as `job` events; the result is
 * downloaded, added to the photo library and kept on the device as an exported project.
 */
export function useExportViewModel(projectId: string, source: ExportSource): ExportViewModel {
  const {pairing} = useSelector(selectPairing);
  const dispatch = useDispatch();
  const {rev, duration} = source;
  const [startExport] = useStartExportMutation();
  const [phase, setPhase] = useState<ExportPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // An export of ours is with the bridge: its `job` events are ours to follow.
  const awaitingBridge = useRef(false);

  const fail = useCallback((text: string) => {
    awaitingBridge.current = false;
    setError(text);
    setPhase('error');
  }, []);

  const save = useCallback(
    async (path: string) => {
      setPhase('saving');
      let fileName: string | null = null;
      try {
        if (!pairing) {
          throw new Error('Not paired with a bridge');
        }
        fileName = await downloadExport(
          mediaUrl(pairing, path),
          `cardboard-${projectId}-${Date.now()}.mp4`,
        );
        const uri = exportUri(fileName);
        if (!uri) {
          throw new Error('The download went missing');
        }
        if ((await saveVideoToPhotos(uri)) === 'denied') {
          deleteExport(fileName);
          fail(PHOTOS_DENIED);
          return;
        }
        dispatch(
          projectExported({id: fileName, projectId, fileName, createdAt: Date.now(), duration}),
        );
        setPhase('saved');
      } catch (e) {
        if (fileName) {
          deleteExport(fileName);
        }
        fail(`Couldn't save the video: ${message(e)}`);
      }
    },
    [pairing, projectId, duration, dispatch, fail],
  );

  useEffect(() => {
    const stopEvents = onBridgeEvent(event => {
      if (
        event.type !== 'job' ||
        event.name !== 'export' ||
        event.projectId !== projectId ||
        !awaitingBridge.current
      ) {
        return;
      }
      if (event.state === 'running') {
        setPhase('rendering');
        setProgress(event.progress ?? 0);
      } else if (event.state === 'done' && event.path) {
        awaitingBridge.current = false;
        save(event.path);
      } else {
        fail(`Export failed: ${event.message ?? 'unknown error'}`);
      }
    });
    const stopProject = subscribeProject(projectId);
    return () => {
      stopProject();
      stopEvents();
    };
  }, [projectId, save, fail]);

  const allowed = canExport({...source, phase});
  const exportVideo = useCallback(
    async (layers: ExportLayer[]) => {
      if (!allowed) {
        return;
      }
      setError(null);
      setProgress(0);
      setPhase('uploading');
      awaitingBridge.current = true;
      const started = await startExport({projectId, ...toExportManifest(rev, layers)});
      if ('error' in started) {
        fail(`Couldn't start the export: ${(started.error as BridgeError).message}`);
      }
    },
    [allowed, rev, projectId, startExport, fail],
  );

  const acknowledge = useCallback(() => {
    setPhase(current => (isExportBusy(current) ? current : 'idle'));
    setError(null);
  }, []);

  return {phase, progress, error, canExport: allowed, exportVideo, acknowledge};
}
