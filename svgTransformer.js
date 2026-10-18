/**
 * Metro babel transformer: compiles `*.svg` to React components (via
 * react-native-svg-transformer) and delegates everything else to Expo's
 * upstream transformer.
 *
 * react-native-svg-transformer's bundled `/expo` entry can't locate the
 * transformer in this bare-RN + expo-modules layout (it lives under a nested
 * `expo/node_modules/@expo/metro-config`, which the package exports map hides).
 * We resolve it by absolute path from the default Metro config instead.
 */
const {createTransformer} = require('react-native-svg-transformer');
const {getDefaultConfig} = require('expo/metro-config');

const upstreamTransformerPath =
  getDefaultConfig(__dirname).transformer.babelTransformerPath;
const upstreamTransformer = require(upstreamTransformerPath);

module.exports.transform = createTransformer(upstreamTransformer);
module.exports.getCacheKey = upstreamTransformer.getCacheKey;
