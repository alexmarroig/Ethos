import { NativeModules, Platform } from 'react-native';

const API_PORT = 8787;
const CONTROL_PORT = 8788;
const FALLBACK_LOOPBACK_HOST = Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';

const ensureProtocol = (value: string) =>
  (/^[a-z]+:\/\//i.test(value) ? value : `http://${value}`);
const stripTrailingSlashes = (value: string) => value.replace(/\/+$/, '');
const normalizeDevUrl = (value: string) =>
  value.replace(/^exp:\/\//i, 'http://').replace(/^exps:\/\//i, 'https://');

const isLoopbackHost = (value: string) =>
  ['localhost', '127.0.0.1', '0.0.0.0'].includes(value);

const getWebLocationHostname = () => {
  if (typeof globalThis === 'undefined') return null;
  const locationObject = (globalThis as typeof globalThis & { location?: Location }).location;
  return locationObject?.hostname ?? null;
};

const parseHostname = (value?: string | null) => {
  if (!value) return null;

  try {
    return new URL(normalizeDevUrl(ensureProtocol(value))).hostname || null;
  } catch {
    return null;
  }
};

const getDevelopmentHost = () => {
  const androidServerHost = (
    Platform.constants as { ServerHost?: string } | undefined
  )?.ServerHost;
  return parseHostname(androidServerHost) ?? parseHostname(NativeModules?.SourceCode?.scriptURL);
};

const resolveDevelopmentHost = () => {
  const developmentHost = getDevelopmentHost();
  if (developmentHost && !isLoopbackHost(developmentHost)) {
    return developmentHost;
  }

  return FALLBACK_LOOPBACK_HOST;
};

const isDevelopment = typeof __DEV__ !== 'undefined' ? __DEV__ : false;

const buildBaseUrl = (envValue: string | undefined, port: number, envName: string) => {
  const explicitUrl = envValue?.trim();
  if (explicitUrl) {
    try {
      return stripTrailingSlashes(ensureProtocol(explicitUrl));
    } catch {
      console.warn(`[api/config] URL invalida em ${envName}: ${explicitUrl}`);
    }
  }

  if (!isDevelopment) {
    if (Platform.OS === 'web') {
      const webHostname = getWebLocationHostname();
      if (webHostname && isLoopbackHost(webHostname)) {
        return port === API_PORT ? '/api' : '/control-api';
      }

      if (webHostname) {
        return stripTrailingSlashes(`http://${webHostname}:${port}`);
      }
    }

    throw new Error(`[api/config] ${envName} precisa ser definido para builds standalone.`);
  }

  const host = resolveDevelopmentHost();
  const url = `http://${host}:${port}`;

  if (host !== FALLBACK_LOOPBACK_HOST) {
    console.info(`[api/config] Usando host de desenvolvimento: ${url}`);
  }

  return url;
};

export const getApiBaseUrl = () =>
  buildBaseUrl(process.env.EXPO_PUBLIC_ETHOS_API_URL, API_PORT, 'EXPO_PUBLIC_ETHOS_API_URL');

export const getControlApiBaseUrl = () =>
  buildBaseUrl(
    process.env.EXPO_PUBLIC_ETHOS_CONTROL_API_URL,
    CONTROL_PORT,
    'EXPO_PUBLIC_ETHOS_CONTROL_API_URL',
  );

export const API_BASE_URL = getApiBaseUrl();
