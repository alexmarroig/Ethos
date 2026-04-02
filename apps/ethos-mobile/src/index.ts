<<<<<<< HEAD
import { EthosClinicalPlaneClient, EthosControlPlaneClient } from "@ethos/sdk";
import { getApiBaseUrl, getControlPlaneBaseUrl } from "./services/api/config";
=======
// SDK clients are accessed via shared/services/api instead of @ethos/sdk
// (workspace dep not resolvable in EAS Build)
>>>>>>> 97f19340c110e556bf5c1ebe71a5b625f605e9e4

export const mobileV1Capabilities = {
  login: true,
  recording: true,
  schedule: true,
  formsDiary: true,
  p2pSync: "qr+wifi",
  cloudClinicalUploadByDefault: false,
};
<<<<<<< HEAD

export const controlClient = new EthosControlPlaneClient(getControlPlaneBaseUrl());
export const clinicalClient = new EthosClinicalPlaneClient(getApiBaseUrl());
=======
>>>>>>> 97f19340c110e556bf5c1ebe71a5b625f605e9e4
