const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// .ogg is not a default Metro asset type; the bundled focus sounds are Ogg Vorbis (gapless looping).
config.resolver.assetExts.push('ogg');

module.exports = config;
