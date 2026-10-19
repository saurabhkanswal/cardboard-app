import {useCallback, useEffect, useState} from 'react';
import {Camera} from 'expo-camera';

export type CameraPermission = 'unknown' | 'granted' | 'denied';

/**
 * Wraps the camera permission flow so screens never touch `expo-camera`'s
 * permission API directly (mirrors `useMediaPicker` in the remix feature).
 */
export function useCameraPermission() {
  const [permission, setPermission] = useState<CameraPermission>('unknown');

  useEffect(() => {
    Camera.getCameraPermissionsAsync().then(res =>
      setPermission(res.granted ? 'granted' : 'unknown'),
    );
  }, []);

  const requestPermission = useCallback(async () => {
    const res = await Camera.requestCameraPermissionsAsync();
    const next: CameraPermission = res.granted ? 'granted' : 'denied';
    setPermission(next);
    return next;
  }, []);

  return {permission, requestPermission};
}
