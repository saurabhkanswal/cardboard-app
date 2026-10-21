import {useCallback, useRef, useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {
  usePairingViewModel,
  type PairResult,
} from '../../viewmodel/pairing/usePairingViewModel';

function errorFor(result: PairResult): string | null {
  switch (result.kind) {
    case 'paired':
      return null;
    case 'invalid':
      return 'That isn’t a Cardboard bridge pairing code.';
    case 'unreachable':
      return `Couldn’t reach the bridge (${result.message}). Same Wi-Fi?`;
    case 'incompatible':
      return 'The bridge runs a different protocol version. Update one side.';
  }
}

/**
 * Screen glue for pairing: owns the scanner on/off state, the pasted-code field and
 * the error line, and turns ViewModel results into this screen's UX.
 */
export function usePairingScreenController() {
  const vm = usePairingViewModel();
  const navigation = useNavigation();
  const [isScanning, setIsScanning] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  // The camera reports the same QR many times per second; handle one at a time.
  const handling = useRef(false);

  const submit = useCallback(
    async (raw: string) => {
      if (handling.current) {
        return;
      }
      handling.current = true;
      try {
        const result = await vm.pair(raw);
        setError(errorFor(result));
        if (result.kind === 'paired') {
          setIsScanning(false);
          setCode('');
        }
      } finally {
        handling.current = false;
      }
    },
    [vm],
  );

  const onStartScan = useCallback(async () => {
    const permission =
      vm.permission === 'granted' ? 'granted' : await vm.requestPermission();
    if (permission === 'denied') {
      Alert.alert(
        'Camera access needed',
        'Allow camera access in Settings to scan the pairing QR code, or paste the code instead.',
      );
      return;
    }
    setError(null);
    setIsScanning(true);
  }, [vm]);

  const onClose = useCallback(() => navigation.goBack(), [navigation]);

  return {
    onClose,
    status: vm.status,
    bridgeName: vm.bridgeName,
    bridgeUrl: vm.bridgeUrl,
    isChecking: vm.isChecking,
    isScanning,
    onStartScan,
    onStopScan: () => setIsScanning(false),
    onScan: submit,
    code,
    onChangeCode: setCode,
    onSubmitCode: () => submit(code),
    error,
    onUnpair: vm.unpair,
  };
}
