const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// On Windows, the 'node:sea' external can cause issues with colon in path
// We can try to filter it out or ensure it's handled correctly.
if (process.platform === 'win32') {
    config.resolver.unstable_enablePackageExports = false;
}

module.exports = config;
