import { NativeModules, Platform } from "react-native";

const API_PORT = 8787;
const CONTROL_PORT = 8788;
const FALLBACK_LOOPBACK_HOST = Platform.OS === "android" ? "10.0.2.2" : "127.0.0.1";

const ensureProtocol = (value: string) => (/^[a-z]+:\/\//i.test(value) ? value : `http://${value}`);
const stripTrailingSlashes = (value: string) => value.replace(/\/+$/, "");
const normalizeDevUrl = (value: string) => value.replace(/^exp:\/\//i, "http://").replace(/^exps:\/\//i, "https://");

const parseHostname = (value?: string | null) => {
  if (!value) return null;

  try {
    return new URL(normalizeDevUrl(ensureProtocol(value))).hostname || null;
  } catch {
    return null;
  }
};

const isLoopbackHost = (value: string) => ["localhost", "127.0.0.1", "0.0.0.0"].includes(value);

const getDevelopmentHost = () => {
  const androidServerHost = (Platform.constants as { ServerHost?: string } | undefined)?.ServerHost;
  return parseHostname(androidServerHost) ?? parseHostname(NativeModules?.SourceCode?.scriptURL);
};

const resolveDefaultHost = () => {
  const developmentHost = getDevelopmentHost();
  if (developmentHost && !isLoopbackHost(developmentHost)) {
    return developmentHost;
  }

  return FALLBACK_LOOPBACK_HOST;
};

const buildBaseUrl = (envValue: string | undefined, port: number) => {
  const explicitUrl = envValue?.trim();
  if (explicitUrl) {
    return stripTrailingSlashes(ensureProtocol(explicitUrl));
  }

  return `http://${resolveDefaultHost()}:${port}`;
};

export const getApiBaseUrl = () => buildBaseUrl(process.env.EXPO_PUBLIC_ETHOS_API_URL, API_PORT);
export const getControlPlaneBaseUrl = () => buildBaseUrl(process.env.EXPO_PUBLIC_ETHOS_CONTROL_API_URL, CONTROL_PORT);
export const API_BASE_URL = getApiBaseUrl();
