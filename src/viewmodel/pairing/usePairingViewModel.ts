import {useCallback} from 'react';
import {useDispatch} from 'react-redux';
import {
  useCheckBridgeHealthMutation,
  type BridgeError,
} from '../../model/bridge/bridgeApi';
import {paired, unpaired} from '../../model/bridge/pairingSlice';
import {PROTOCOL_VERSION} from '../../model/bridge/protocol';
import {parsePairingCode} from './pairingRules';
import {useBridgeConnection} from './useBridgeConnection';
import {useCameraPermission} from './useCameraPermission';

/** Outcome of a pair attempt, so the controller can pick the right UX. */
export type PairResult =
  | {kind: 'paired'; bridgeName: string}
  | {kind: 'invalid'}
  | {kind: 'unreachable'; message: string}
  | {kind: 'incompatible'};

/**
 * Feature ViewModel for pairing with the laptop bridge: validates a scanned/pasted
 * code, health-checks the bridge, stores the pairing and exposes the live
 * connection status. The only caller of the bridge health endpoint.
 */
export function usePairingViewModel() {
  const dispatch = useDispatch();
  const [checkHealth, {isLoading: isChecking}] = useCheckBridgeHealthMutation();
  const connection = useBridgeConnection();
  const camera = useCameraPermission();

  const pair = useCallback(
    async (code: string): Promise<PairResult> => {
      const pairing = parsePairingCode(code);
      if (!pairing) {
        return {kind: 'invalid'};
      }
      const result = await checkHealth(pairing);
      if ('error' in result) {
        const error = result.error as BridgeError;
        return {kind: 'unreachable', message: error.message};
      }
      if (result.data.protocolVersion !== PROTOCOL_VERSION) {
        return {kind: 'incompatible'};
      }
      dispatch(paired({pairing, bridgeName: result.data.bridgeName}));
      return {kind: 'paired', bridgeName: result.data.bridgeName};
    },
    [checkHealth, dispatch],
  );

  const unpair = useCallback(() => {
    dispatch(unpaired());
  }, [dispatch]);

  return {...connection, ...camera, pair, unpair, isChecking};
}
