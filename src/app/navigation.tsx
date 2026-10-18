import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {ShowcaseScreen} from '../screens/showcase/ShowcaseScreen';
import {colors} from '../theme';
import Logotype from '../../assets/cardboard-logotype-white.svg';

/** Logo sized from the source SVG viewBox aspect ratio (163×27). */
const LOGO_WIDTH = 140;
const LOGO_HEIGHT = (LOGO_WIDTH * 27) / 163;

/** Header brand mark — defined at module scope so it's a stable component. */
const HeaderLogo = () => <Logotype width={LOGO_WIDTH} height={LOGO_HEIGHT} />;

/** Route map for the root native stack. Extend as screens are added. */
export type RootStackParamList = {
  Showcase: undefined;
};

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
        options={{headerTitle: HeaderLogo}}
      />
    </Stack.Navigator>
  );
}
