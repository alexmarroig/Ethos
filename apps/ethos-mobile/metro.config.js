const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// On Windows, the 'node:sea' external can cause issues with colon in path
if (process.platform === 'win32') {
    config.resolver.unstable_enablePackageExports = false;
}

// Native-only packages that need web shims
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (platform === 'web') {
        // expo-sqlite has no web support — redirect to no-op mock
        if (moduleName === 'expo-sqlite') {
            return {
                filePath: path.resolve(__dirname, 'src/services/sqlite-web-mock.js'),
                type: 'sourceFile',
            };
        }

        // react-native-svg v14 has no "browser" field — point Metro at the web entry manually
        if (moduleName === 'react-native-svg') {
            return {
                filePath: path.resolve(
                    __dirname,
                    'node_modules/react-native-svg/src/ReactNativeSVG.web.ts'
                ),
                type: 'sourceFile',
            };
        }
    }

    if (originalResolveRequest) {
        return originalResolveRequest(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
