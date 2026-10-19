import {useEffect, useMemo, useState} from 'react';
import {useSelector} from 'react-redux';
import {
  onBridgeEvent,
  subscribeProject,
} from '../../model/bridge/bridgeConnection';
import {
  useGetCompiledTemplatesQuery,
  type BridgeError,
} from '../../model/bridge/bridgeApi';
import {selectPairing} from '../../model/bridge/pairingSlice';
import type {
  ProjectSummary,
  TimelineSnapshot,
} from '../../model/bridge/protocol';
import {templatesOf, toEditorTimeline, type EditorTimeline} from './timeline';

const NO_TEMPLATES: Record<string, string> = {};

export type EditorStatus =
  | 'connecting'
  | 'transcribing'
  | 'ready'
  | 'agent-running'
  | 'error';

export interface EditorViewModel {
  status: EditorStatus;
  error: string | null;
  /** Latest timeline (live drafts included), or null until the first snapshot. */
  timeline: EditorTimeline | null;
  rev: number;
  /** True while the shown timeline is an uncommitted mid-turn save. */
  isDraft: boolean;
  errorCount: number;
  /** A `<code>` template that couldn't be loaded or evaluated (its layer is left out). */
  templateError: string | null;
  /** One-line "what's happening" (agent tool / job progress). */
  activity: string | null;
}

/**
 * Feature ViewModel for the editor: follows one project over the bridge socket and
 * exposes its live timeline in editor-domain form. The only consumer of project events.
 */
export function useEditorViewModel(projectId: string): EditorViewModel {
  const {pairing} = useSelector(selectPairing);
  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [snapshot, setSnapshot] = useState<TimelineSnapshot | null>(null);
  const [activity, setActivity] = useState<string | null>(null);

  useEffect(() => {
    const stopEvents = onBridgeEvent(event => {
      if (!('projectId' in event) && event.type !== 'project') {
        return;
      }
      switch (event.type) {
        case 'project':
          if (event.project.id === projectId) {
            setProject(event.project);
          }
          break;
        case 'timeline':
          if (event.projectId === projectId) {
            setSnapshot(event.snapshot);
          }
          break;
        case 'job':
          if (event.projectId === projectId) {
            setActivity(
              event.state === 'running'
                ? 'Transcribing your video…'
                : event.state === 'error'
                  ? 'Transcription failed'
                  : null,
            );
          }
          break;
        case 'agent':
          if (event.projectId === projectId) {
            const e = event.event;
            setActivity(e.kind === 'tool' ? `${e.summary}…` : e.kind === 'done' ? null : 'Thinking…');
          }
          break;
      }
    });
    const stopProject = subscribeProject(projectId);
    return () => {
      stopProject();
      stopEvents();
    };
  }, [projectId]);

  // Compiled once per template set; elements are re-bound to new props on every snapshot.
  const templates = snapshot ? templatesOf(snapshot.model) : [];
  const compiled = useGetCompiledTemplatesQuery(
    {projectId, templates},
    {skip: templates.length === 0},
  );
  const sources = compiled.data ?? NO_TEMPLATES;

  const result = useMemo(
    () => (snapshot && pairing ? toEditorTimeline(snapshot.model, pairing, sources) : null),
    [snapshot, pairing, sources],
  );
  const fetchError = compiled.error
    ? `Captions: ${(compiled.error as BridgeError).message}`
    : null;

  return {
    status: project?.status ?? 'connecting',
    error: project?.error ?? null,
    timeline: result?.timeline ?? null,
    rev: snapshot?.rev ?? 0,
    isDraft: snapshot?.draft ?? false,
    errorCount: snapshot?.diagnostics.filter(d => d.level === 'error').length ?? 0,
    templateError: fetchError ?? result?.templateErrors[0] ?? null,
    activity,
  };
}
