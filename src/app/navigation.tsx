import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {ShowcaseScreen} from '../screens/showcase/ShowcaseScreen';
import {RemixScreen} from '../screens/remix/RemixScreen';
import {PairingScreen} from '../screens/pairing/PairingScreen';
import {EditorScreen} from '../screens/editor/EditorScreen';
import {OnboardingScreen} from '../screens/onboarding/OnboardingScreen';
import {ProjectPlayerScreen} from '../screens/projectPlayer/ProjectPlayerScreen';
import {colors} from '../theme';
import Logotype from '../../assets/cardboard-logotype-white.svg';

/** Logo sized from the source SVG viewBox aspect ratio (163×27). */
const LOGO_WIDTH = 140;
const LOGO_HEIGHT = (LOGO_WIDTH * 27) / 163;

/**
 * Header brand mark — defined at module scope so it's a stable component. Rendered
 * as `headerLeft` because iOS native stack always centres `headerTitle`.
 */
const HeaderLogo = () => <Logotype width={LOGO_WIDTH} height={LOGO_HEIGHT} />;

/** Route map for the root native stack. Extend as screens are added. */
export type RootStackParamList = {
  Onboarding: undefined;
  Showcase: {tab?: 'recipes' | 'projects'} | undefined;
  Remix: {videoId: string; sectionId: string; uri: string; recipeId?: string};
  Pairing: undefined;
  Editor: {projectId: string};
  ProjectPlayer: {id: string};
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
      // Onboarding shows on every launch for now. To show it only once again, use
      // `hasSeenOnboarding() ? 'Showcase' : 'Onboarding'` from model/onboarding.
      initialRouteName="Onboarding"
      screenOptions={{
        headerStyle: {backgroundColor: colors.background},
        headerShadowVisible: false,
        headerTintColor: colors.text,
      }}>
      <Stack.Screen
        name="Onboarding"
        component={OnboardingScreen}
        // Left via navigation.reset, so there's no back gesture into it.
        options={{headerShown: false, gestureEnabled: false}}
      />
      <Stack.Screen
        name="Showcase"
        component={ShowcaseScreen}
        options={{headerLeft: HeaderLogo, headerTitle: ''}}
      />
      <Stack.Screen
        name="Remix"
        component={RemixScreen}
        options={{
          // RemixScreen draws its own backdrop and bottom sheet; the native
          // formSheet's system background can't be styled.
          presentation: 'transparentModal',
          animation: 'slide_from_bottom',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Editor"
        component={EditorScreen}
        // EditorScreen draws its own header (Cancel · Editor · Export).
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="Pairing"
        component={PairingScreen}
        options={{
          // PairingScreen draws its own content-height bottom sheet (like Remix).
          presentation: 'transparentModal',
          animation: 'slide_from_bottom',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ProjectPlayer"
        component={ProjectPlayerScreen}
        // ProjectPlayerScreen draws its own header (Close · date · Delete).
        options={{
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom',
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}
