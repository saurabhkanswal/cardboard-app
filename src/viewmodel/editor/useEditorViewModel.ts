import {useCallback, useEffect, useMemo, useState} from 'react';
import {useSelector} from 'react-redux';
import {
  onBridgeEvent,
  subscribeProject,
} from '../../model/bridge/bridgeConnection';
import {
  useCancelProjectTurnMutation,
  useGetCompiledTemplatesQuery,
  useSendProjectMessageMutation,
  useUndoProjectTurnMutation,
  type BridgeError,
} from '../../model/bridge/bridgeApi';
import {selectPairing} from '../../model/bridge/pairingSlice';
import type {
  ProjectSummary,
  TimelineSnapshot,
} from '../../model/bridge/protocol';
import {
  appendAgentEvent,
  noticeMessage,
  userMessage,
  type ChatMessage,
} from './chat';
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
  /** This session's conversation with the director (the bridge keeps no history). */
  messages: ChatMessage[];
  /** A new instruction can start a turn (project idle and not already sending). */
  canSend: boolean;
  /** A turn is running and can be cancelled. */
  canStop: boolean;
  /** There's a committed turn to revert. */
  canUndo: boolean;
  send: (text: string) => void;
  stop: () => void;
  undo: () => void;
}

const errorText = (error: unknown) => (error as BridgeError).message;

/**
 * Feature ViewModel for the editor: follows one project over the bridge socket and
 * exposes its live timeline in editor-domain form. The only consumer of project events.
 */
export function useEditorViewModel(projectId: string): EditorViewModel {
  const {pairing} = useSelector(selectPairing);
  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [snapshot, setSnapshot] = useState<TimelineSnapshot | null>(null);
  const [activity, setActivity] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sendMessage, sendState] = useSendProjectMessageMutation();
  const [cancelTurn] = useCancelProjectTurnMutation();
  const [undoTurn, undoState] = useUndoProjectTurnMutation();

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
          // Export jobs are followed by useExportViewModel.
          if (event.projectId === projectId && event.name === 'transcribe') {
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
            setMessages(prev => appendAgentEvent(prev, e));
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

  const status = project?.status ?? 'connecting';
  const rev = project?.rev ?? snapshot?.rev ?? 0;

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) {
        return;
      }
      setMessages(prev => [...prev, userMessage(trimmed)]);
      const sent = await sendMessage({projectId, text: trimmed});
      if ('error' in sent) {
        setMessages(prev => [...prev, noticeMessage(`Couldn't send: ${errorText(sent.error)}`, true)]);
      }
    },
    [projectId, sendMessage],
  );

  const stop = useCallback(async () => {
    const cancelled = await cancelTurn({projectId});
    if ('error' in cancelled) {
      setMessages(prev => [...prev, noticeMessage(`Couldn't stop: ${errorText(cancelled.error)}`, true)]);
    }
  }, [projectId, cancelTurn]);

  const undo = useCallback(async () => {
    const undone = await undoTurn({projectId});
    setMessages(prev => [
      ...prev,
      'error' in undone
        ? noticeMessage(`Couldn't undo: ${errorText(undone.error)}`, true)
        : noticeMessage('Reverted the last change'),
    ]);
  }, [projectId, undoTurn]);

  return {
    status,
    error: project?.error ?? null,
    timeline: result?.timeline ?? null,
    rev: snapshot?.rev ?? 0,
    isDraft: snapshot?.draft ?? false,
    errorCount: snapshot?.diagnostics.filter(d => d.level === 'error').length ?? 0,
    templateError: fetchError ?? result?.templateErrors[0] ?? null,
    activity,
    messages,
    canSend: status === 'ready' && !sendState.isLoading,
    canStop: status === 'agent-running',
    canUndo: status === 'ready' && rev > 0 && !undoState.isLoading,
    send,
    stop,
    undo,
  };
}
