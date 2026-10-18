const { getDefaultConfig } = require('expo/metro-config');
const { mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * SVGs are compiled to React components via react-native-svg-transformer:
 * removed from `assetExts`, added to `sourceExts`, and handled by the
 * transformer. This lets screens import `*.svg` as components.
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const baseConfig = getDefaultConfig(__dirname);
const { assetExts, sourceExts } = baseConfig.resolver;

const config = {
  transformer: {
    babelTransformerPath: require.resolve('./svgTransformer'),
  },
  resolver: {
    assetExts: assetExts.filter(ext => ext !== 'svg'),
    sourceExts: [...sourceExts, 'svg'],
  },
};

module.exports = mergeConfig(baseConfig, config);
