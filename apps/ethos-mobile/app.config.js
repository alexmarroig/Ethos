// Dynamic Expo config — replaces app.json at build time
// Conditionally includes expo-dev-client only for development builds
const IS_DEV = process.env.EAS_BUILD_PROFILE === 'development';

module.exports = ({ config }) => ({
  ...config,
  name: 'ETHOS',
  slug: 'ethos-mobile',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#15171a',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'app.ethos.mobile',
    infoPlist: {
      NSMicrophoneUsageDescription:
        'ETHOS precisa de acesso ao microfone para gravar sessões clínicas offline.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#15171a',
    },
    package: 'app.ethos.mobile',
    permissions: ['RECORD_AUDIO'],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    // Only inject expo-dev-client native code in dev builds
    ...(IS_DEV ? ['expo-dev-client'] : []),
    ['expo-sqlite', { useSQLCipher: true }],
    './plugins/withAndroidBackupConfig',
    './plugins/withIOSBackupExclusion',
  ],
  extra: {
    eas: {
      projectId: 'acf7b22f-889c-4233-8f82-f1ddc71984a7',
    },
  },
  owner: 'alexmarroig',
});
