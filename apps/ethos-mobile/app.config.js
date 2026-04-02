const BUILD_PROFILE = process.env.EAS_BUILD_PROFILE ?? 'local';
const IS_DEV_CLIENT_BUILD = BUILD_PROFILE === 'development';

const APP_NAME = 'ETHOS';
const APP_SLUG = 'ethos-mobile';
const APP_VERSION = '1.0.0';
const APP_THEME = '#15171a';
const EAS_PROJECT_ID = 'acf7b22f-889c-4233-8f82-f1ddc71984a7';

module.exports = ({ config }) => ({
  ...config,
  name: APP_NAME,
  slug: APP_SLUG,
  version: APP_VERSION,
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: APP_THEME,
  },
  assetBundlePatterns: ['**/*'],
  updates: {
    enabled: true,
    checkAutomatically: 'ON_ERROR_RECOVERY',
    fallbackToCacheTimeout: 0,
    url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'app.ethos.mobile',
    infoPlist: {
      NSMicrophoneUsageDescription:
        'ETHOS precisa de acesso ao microfone para gravar sessoes clinicas offline.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: APP_THEME,
    },
    package: 'app.ethos.mobile',
    permissions: ['RECORD_AUDIO'],
  },
  web: {
    bundler: 'metro',
    output: 'single',
    favicon: './assets/favicon.png',
    name: APP_NAME,
    shortName: APP_NAME,
    lang: 'pt-BR',
    themeColor: APP_THEME,
    backgroundColor: APP_THEME,
    display: 'standalone',
  },
  plugins: [
    ...(IS_DEV_CLIENT_BUILD ? ['expo-dev-client'] : []),
    ['expo-sqlite', { useSQLCipher: true }],
    './plugins/withAndroidBackupConfig',
    './plugins/withIOSBackupExclusion',
    'expo-font',
    'expo-secure-store',
    '@sentry/react-native',
  ],
  extra: {
    eas: {
      projectId: EAS_PROJECT_ID,
    },
  },
  owner: 'alexmarroig',
});
