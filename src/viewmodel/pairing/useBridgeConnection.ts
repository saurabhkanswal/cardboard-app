import {useEffect, useState} from 'react';
import {useSelector} from 'react-redux';
import {
  onBridgeStatus,
  type BridgeStatus,
} from '../../model/bridge/bridgeConnection';
import {selectPairing} from '../../model/bridge/pairingSlice';

export type BridgeConnectionStatus =
  | 'unpaired'
  | 'connecting'
  | 'connected'
  | 'disconnected';

const toStatus: Record<BridgeStatus, BridgeConnectionStatus> = {
  unpaired: 'unpaired',
  connecting: 'connecting',
  open: 'connected',
  closed: 'disconnected',
};

/** Live status of the app's single bridge socket (which reconnects on its own). */
export function useBridgeConnection() {
  const {bridgeName, pairing} = useSelector(selectPairing);
  const [status, setStatus] = useState<BridgeConnectionStatus>('unpaired');

  useEffect(() => onBridgeStatus(s => setStatus(toStatus[s])), []);

  return {status, bridgeName, bridgeUrl: pairing?.url ?? null};
}
