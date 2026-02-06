import { EthosClinicalPlaneClient, EthosControlPlaneClient } from "@ethos/sdk";

export * from "./theme/tokens";

export const mobileV1Capabilities = {
  login: true,
  recording: true,
  schedule: true,
  formsDiary: true,
  p2pSync: "qr+wifi",
  cloudClinicalUploadByDefault: false,
};

export const controlClient = new EthosControlPlaneClient("http://localhost:8788");
export const clinicalClient = new EthosClinicalPlaneClient("http://localhost:8787");
