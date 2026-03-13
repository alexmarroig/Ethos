const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// On Windows, the 'node:sea' external can cause issues with colon in path
if (process.platform === 'win32') {
    config.resolver.unstable_enablePackageExports = false;
}

// expo-sqlite is native-only — redirect to a no-op mock on web
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (platform === 'web' && moduleName === 'expo-sqlite') {
        return {
            filePath: path.resolve(__dirname, 'src/services/sqlite-web-mock.js'),
            type: 'sourceFile',
        };
    }
    if (originalResolveRequest) {
        return originalResolveRequest(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
