const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Windows: node:sea path issue with Node v24+
if (process.platform === 'win32') {
  config.resolver.unstable_enablePackageExports = false;
}

// Web: redirect native-only Expo modules to JS shims so the app
// can run in the browser without native module crashes.
const WEB_SHIMS = {
  'expo-sqlite':               path.resolve(__dirname, 'src/web-shims/expo-sqlite.js'),
  'expo-secure-store':         path.resolve(__dirname, 'src/web-shims/expo-secure-store.js'),
  'expo-crypto':               path.resolve(__dirname, 'src/web-shims/expo-crypto.js'),
  'expo-file-system':          path.resolve(__dirname, 'src/web-shims/expo-file-system.js'),
  'expo-local-authentication': path.resolve(__dirname, 'src/web-shims/expo-local-authentication.js'),
  'expo-av':                   path.resolve(__dirname, 'src/web-shims/expo-av.js'),
  'expo-device':               path.resolve(__dirname, 'src/web-shims/expo-device.js'),
};

const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    const shimKey = Object.keys(WEB_SHIMS).find(
      (key) => moduleName === key || moduleName.startsWith(key + '/')
    );
    if (shimKey) {
      return { filePath: WEB_SHIMS[shimKey], type: 'sourceFile' };
    }
  }

  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
