import { EthosClinicalPlaneClient, EthosControlPlaneClient } from "@ethos/sdk";
import { getApiBaseUrl, getControlPlaneBaseUrl } from "./services/api/config";

export const mobileV1Capabilities = {
  login: true,
  recording: true,
  schedule: true,
  formsDiary: true,
  p2pSync: "qr+wifi",
  cloudClinicalUploadByDefault: false,
};

export const controlClient = new EthosControlPlaneClient(getControlPlaneBaseUrl());
export const clinicalClient = new EthosClinicalPlaneClient(getApiBaseUrl());
