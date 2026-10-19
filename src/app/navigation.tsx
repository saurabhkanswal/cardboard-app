import React from 'react';
import {StyleSheet, Text, TouchableOpacity} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {ShowcaseScreen} from '../screens/showcase/ShowcaseScreen';
import {RemixScreen} from '../screens/remix/RemixScreen';
import {PairingScreen} from '../screens/pairing/PairingScreen';
import {EditorScreen} from '../screens/editor/EditorScreen';
import {colors} from '../theme';
import Logotype from '../../assets/cardboard-logotype-white.svg';

/** Logo sized from the source SVG viewBox aspect ratio (163×27). */
const LOGO_WIDTH = 140;
const LOGO_HEIGHT = (LOGO_WIDTH * 27) / 163;

/** Header brand mark — defined at module scope so it's a stable component. */
const HeaderLogo = () => <Logotype width={LOGO_WIDTH} height={LOGO_HEIGHT} />;

/** Header entry to the laptop-bridge pairing modal. */
function BridgeButton() {
  const navigation = useNavigation();
  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('Pairing')}
      accessibilityRole="button"
      hitSlop={8}>
      <Text style={styles.headerButton}>Bridge</Text>
    </TouchableOpacity>
  );
}

/** Route map for the root native stack. Extend as screens are added. */
export type RootStackParamList = {
  Showcase: undefined;
  Remix: {videoId: string; sectionId: string; uri: string};
  Pairing: undefined;
  Editor: {projectId: string};
};

/**
 * Register the param list globally so screens/controllers get typed navigation via
 * `useNavigation()` / `useRoute()` without importing `app/` (which the layer
 * boundaries forbid for `screens/`).
 */
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: colors.background},
        headerShadowVisible: false,
        headerTintColor: colors.text,
      }}>
      <Stack.Screen
        name="Showcase"
        component={ShowcaseScreen}
        options={{headerTitle: HeaderLogo, headerRight: BridgeButton}}
      />
      <Stack.Screen
        name="Remix"
        component={RemixScreen}
        options={{presentation: 'modal', headerTitle: 'Remix'}}
      />
      <Stack.Screen
        name="Editor"
        component={EditorScreen}
        options={{headerTitle: 'Editor'}}
      />
      <Stack.Screen
        name="Pairing"
        component={PairingScreen}
        options={{presentation: 'modal', headerTitle: 'Bridge'}}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  headerButton: {color: colors.accent, fontWeight: '600'},
});
