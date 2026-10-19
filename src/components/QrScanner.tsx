import React from 'react';
import {StyleSheet, View} from 'react-native';
import {CameraView} from 'expo-camera';
import {colors, radius} from '../theme';

interface Props {
  /** Called with the raw QR payload; the parent decides what it means. */
  onScan: (data: string) => void;
  /** When false, scans are ignored (e.g. while a previous code is being checked). */
  active: boolean;
}

/** Square back-camera viewfinder that reports QR codes. Pure presentation. */
export function QrScanner({onScan, active}: Props) {
  return (
    <View style={styles.frame}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{barcodeTypes: ['qr']}}
        onBarcodeScanned={active ? ({data}) => onScan(data) : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    aspectRatio: 1,
    borderRadius: radius.tile,
    overflow: 'hidden',
    backgroundColor: colors.placeholder,
  },
});
