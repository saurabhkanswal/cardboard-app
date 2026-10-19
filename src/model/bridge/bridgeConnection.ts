import {connectBridgeSocket, type BridgeSocket, type SocketStatus} from './bridgeSocket';
import type {ClientEvent, PairingPayload, ServerEvent} from './protocol';

/**
 * The app's single socket to the paired bridge. Screens never open their own: the
 * store wires pairing changes in (`setBridgePairing`), and ViewModels listen here.
 * Project subscriptions are re-sent after every reconnect, and the bridge replays
 * the project's current state on subscribe, so listeners resync on their own.
 */

export type BridgeStatus = 'unpaired' | SocketStatus;

type EventListener = (event: ServerEvent) => void;
type StatusListener = (status: BridgeStatus) => void;

let socket: BridgeSocket | null = null;
let pairing: PairingPayload | null = null;
let status: BridgeStatus = 'unpaired';
const eventListeners = new Set<EventListener>();
const statusListeners = new Set<StatusListener>();
/** projectId → number of active subscribers. */
const projectRefs = new Map<string, number>();

function setStatus(next: BridgeStatus) {
  status = next;
  statusListeners.forEach(l => l(next));
  if (next === 'open') {
    projectRefs.forEach((_count, projectId) => send({type: 'subscribe', projectId}));
  }
}

function send(event: ClientEvent) {
  socket?.send(event);
}

export function setBridgePairing(next: PairingPayload | null) {
  if (next?.url === pairing?.url && next?.token === pairing?.token) {
    return;
  }
  socket?.close();
  socket = null;
  pairing = next;
  if (!next) {
    setStatus('unpaired');
    return;
  }
  socket = connectBridgeSocket(next, {
    onEvent: event => eventListeners.forEach(l => l(event)),
    onStatus: setStatus,
  });
}

export function onBridgeEvent(listener: EventListener): () => void {
  eventListeners.add(listener);
  return () => eventListeners.delete(listener);
}

/** Calls `listener` now with the current status, then on every change. */
export function onBridgeStatus(listener: StatusListener): () => void {
  statusListeners.add(listener);
  listener(status);
  return () => statusListeners.delete(listener);
}

/** Streams a project's events while subscribed. Returns the unsubscribe function. */
export function subscribeProject(projectId: string): () => void {
  const count = projectRefs.get(projectId) ?? 0;
  projectRefs.set(projectId, count + 1);
  if (count === 0) {
    send({type: 'subscribe', projectId});
  }
  return () => {
    const left = (projectRefs.get(projectId) ?? 1) - 1;
    if (left <= 0) {
      projectRefs.delete(projectId);
      send({type: 'unsubscribe', projectId});
    } else {
      projectRefs.set(projectId, left);
    }
  };
}
