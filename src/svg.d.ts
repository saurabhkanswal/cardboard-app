/**
 * Lets TypeScript treat `*.svg` imports as React components, matching the
 * runtime behavior of react-native-svg-transformer (see metro.config.js).
 */
declare module '*.svg' {
  import type React from 'react';
  import type {SvgProps} from 'react-native-svg';
  const content: React.FC<SvgProps>;
  export default content;
}
