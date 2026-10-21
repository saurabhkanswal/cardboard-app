import type {AgentEvent} from '../../model/bridge/protocol';

/**
 * One row of the editor conversation. `step` is a director tool call ("Editing the
 * timeline…"); `notice` is a system line (cancelled, undo, errors).
 */
export type ChatMessage =
  | {id: string; kind: 'user'; text: string}
  | {id: string; kind: 'assistant'; text: string}
  | {id: string; kind: 'step'; text: string}
  | {id: string; kind: 'notice'; text: string; isError: boolean};

let nextId = 0;
const newId = () => `m${++nextId}`;

export const userMessage = (text: string): ChatMessage => ({id: newId(), kind: 'user', text});

export const noticeMessage = (text: string, isError = false): ChatMessage => ({
  id: newId(),
  kind: 'notice',
  text,
  isError,
});

/**
 * Folds a director event into the log. Consecutive tool steps collapse into the latest,
 * so a long turn shows what it's doing now rather than every command it ran.
 */
export function appendAgentEvent(messages: ChatMessage[], event: AgentEvent): ChatMessage[] {
  switch (event.kind) {
    case 'text':
      return [...messages, {id: newId(), kind: 'assistant', text: event.text.trim()}];
    case 'tool': {
      const step: ChatMessage = {id: newId(), kind: 'step', text: event.summary};
      const last = messages[messages.length - 1];
      return last?.kind === 'step' ? [...messages.slice(0, -1), step] : [...messages, step];
    }
    case 'done': {
      // A finished turn's last tool step is no longer "in progress".
      const settled =
        messages[messages.length - 1]?.kind === 'step' ? messages.slice(0, -1) : messages;
      return event.ok
        ? settled
        : [...settled, noticeMessage(event.message ?? 'The edit failed', event.message !== 'Cancelled')];
    }
  }
}
