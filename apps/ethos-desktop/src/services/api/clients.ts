import { controlPlaneContract } from "./contracts/controlPlane.contract";
import { clinicalContract } from "./contracts/clinical.contract";
import { createHttpClient } from "./httpClient";

const getEnv = (key: "CONTROL_API_BASE_URL" | "CLINICAL_API_BASE_URL", fallback: string) => {
  const fromVite = import.meta.env[key];
  return typeof fromVite === "string" && fromVite.trim().length > 0 ? fromVite : fallback;
};

const CONTROL_API_BASE_URL = getEnv("CONTROL_API_BASE_URL", "http://localhost:8788");
const CLINICAL_API_BASE_URL = getEnv("CLINICAL_API_BASE_URL", "http://localhost:8787");

const getStoredToken = () => {
  try {
    return localStorage.getItem("ethos-admin-token");
  } catch {
    return null;
  }
};

const getControlBaseUrl = () => {
  try {
    return localStorage.getItem("ethos-control-plane-url") || CONTROL_API_BASE_URL;
  } catch {
    return CONTROL_API_BASE_URL;
  }
};

const revalidateSession = (reason: "unauthorized" | "forbidden") => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("ethos:session-invalid", { detail: { reason } }));
};

export const controlClient = createHttpClient({
  name: "controlClient",
  baseUrl: getControlBaseUrl,
  contract: controlPlaneContract,
  getAuthToken: getStoredToken,
  onSessionInvalid: revalidateSession,
});

export const clinicalClient = createHttpClient({
  name: "clinicalClient",
  baseUrl: CLINICAL_API_BASE_URL,
  contract: clinicalContract,
  getAuthToken: getStoredToken,
  onSessionInvalid: revalidateSession,
  offline: {
    enabled: true,
    cacheNamespace: "ethos-clinical-offline-cache",
  },
});

export { CONTROL_API_BASE_URL, CLINICAL_API_BASE_URL };
