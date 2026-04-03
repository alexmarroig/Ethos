// ETHOS Runtime Configuration
// All base URLs and app-level settings

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1"]);

function isLocalBrowserHost() {
  if (typeof window === "undefined") return null;
  return LOCAL_HOSTNAMES.has(window.location.hostname);
}

const CLINICAL_FALLBACK = isLocalBrowserHost()
  ? "/api/clinical"
  : "https://ethos-clinical.onrender.com";
const CONTROL_FALLBACK = isLocalBrowserHost()
  ? "/api/control"
  : "https://ethos-control.onrender.com";

export const CLINICAL_BASE_URL =
  import.meta.env.VITE_CLINICAL_BASE_URL || CLINICAL_FALLBACK;

export const CONTROL_BASE_URL =
  import.meta.env.VITE_CONTROL_BASE_URL || CONTROL_FALLBACK;

if (import.meta.env.DEV) {
  if (!import.meta.env.VITE_CLINICAL_BASE_URL)
    console.warn("[runtime] VITE_CLINICAL_BASE_URL não definida — usando fallback:", CLINICAL_FALLBACK);
  if (!import.meta.env.VITE_CONTROL_BASE_URL)
    console.warn("[runtime] VITE_CONTROL_BASE_URL não definida — usando fallback:", CONTROL_FALLBACK);
}

export const APP_VERSION = import.meta.env.VITE_APP_VERSION || "1.0.0";

export const IS_DEV =
  import.meta.env.DEV || import.meta.env.VITE_ENV === "development";

export const ENABLE_DEMO_LOGIN =
  import.meta.env.VITE_ENABLE_DEMO_LOGIN === "true";

export const SHOW_CONNECTIVITY_BANNER =
  import.meta.env.VITE_SHOW_CONNECTIVITY_BANNER === "true";

// Timeouts
export const DEFAULT_TIMEOUT = 30_000;
export const LONG_TIMEOUT = 120_000; // upload, transcribe, export, backup

// Paths that use LONG_TIMEOUT
export const LONG_TIMEOUT_PATTERNS = [
  "/audio",
  "/transcribe",
  "/export",
  "/backup",
  "/restore",
  "/purge",
];
