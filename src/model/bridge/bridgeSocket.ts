import type {ClientEvent, PairingPayload, ServerEvent} from './protocol';

export type SocketStatus = 'connecting' | 'open' | 'closed';

export interface BridgeSocket {
  send: (event: ClientEvent) => void;
  /** Stops reconnecting and closes the socket for good. */
  close: () => void;
}

interface Options {
  onEvent: (event: ServerEvent) => void;
  onStatus: (status: SocketStatus) => void;
}

const MAX_BACKOFF_MS = 10_000;

/**
 * Plain WebSocket client for `/events`, reconnecting with exponential backoff.
 * RN's WebSocket can't set headers, so the token goes in the query string.
 */
export function connectBridgeSocket(
  {url, token}: PairingPayload,
  {onEvent, onStatus}: Options,
): BridgeSocket {
  const wsUrl = `${url.replace(/^http/, 'ws')}/events?token=${encodeURIComponent(token)}`;
  let ws: WebSocket | null = null;
  let attempt = 0;
  let stopped = false;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  const open = () => {
    onStatus('connecting');
    ws = new WebSocket(wsUrl);
    ws.onopen = () => {
      attempt = 0;
      onStatus('open');
    };
    ws.onmessage = message => {
      try {
        onEvent(JSON.parse(String(message.data)) as ServerEvent);
      } catch {
        // Ignore malformed frames; the protocol is JSON-only.
      }
    };
    ws.onclose = () => {
      onStatus('closed');
      if (!stopped) {
        const delay = Math.min(MAX_BACKOFF_MS, 500 * 2 ** attempt++);
        retryTimer = setTimeout(open, delay);
      }
    };
  };

  open();

  return {
    send: event => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(event));
      }
    },
    close: () => {
      stopped = true;
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
      ws?.close();
    },
  };
}
