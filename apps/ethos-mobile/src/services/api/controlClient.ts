import { getControlApiBaseUrl } from "./config";
import { createHttpClient } from "./httpClient";

const controlContract = {
  "/v1/integrations/biohub/status": ["get"],
  "/v1/users/me": ["get", "patch"],
  "/auth/login": ["post"],
  "/auth/logout": ["post"],
  "/auth/register": ["post"],
} as const;

export const controlApiClient = createHttpClient({
  name: "EthosControlMobile",
  baseUrl: getControlApiBaseUrl,
  contract: controlContract,
});
