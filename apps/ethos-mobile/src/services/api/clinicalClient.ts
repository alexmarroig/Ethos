import { getApiBaseUrl } from "./config";
import { createHttpClient } from "./httpClient";

const clinicalContract = {
  "/patients": ["get", "post"],
  "/patients/{id}": ["get", "patch"],
  "/patient/permissions": ["get"],
  "/patient/sessions": ["get"],
  "/patient/sessions/{id}/confirm": ["post"],
  "/patient/diary": ["get", "post"],
  "/patient/documents": ["get"],
  "/patient/documents/{id}": ["get"],
  "/psychologist/patient/{id}/diary": ["get"],
  "/notifications": ["get"],
  "/sessions": ["get", "post"],
  "/sessions/{id}": ["get"],
  "/sessions/{id}/status": ["patch"],
  "/sessions/{id}/transcribe": ["post"],
  "/sessions/{id}/clinical-note": ["post"],
  "/clinical-notes": ["get", "post"],
  "/clinical-notes/{id}": ["get", "put"],
  "/clinical-notes/{id}/validate": ["post"],
  "/reports": ["get", "post"],
  "/contracts": ["get", "post"],
  "/contracts/{id}/send": ["post"],
  "/documents": ["get", "post"],
  "/documents/{id}": ["get"],
  "/documents/{id}/versions": ["get", "post"],
  "/financial/entry": ["post"],
  "/finance": ["get"],
  "/jobs/{id}": ["get"],
} as const;

export const clinicalApiClient = createHttpClient({
  name: "EthosClinicalMobile",
  baseUrl: getApiBaseUrl,
  contract: clinicalContract,
  offline: {
    enabled: true,
    cacheNamespace: "ethos_mobile_clinical_cache",
  },
});
