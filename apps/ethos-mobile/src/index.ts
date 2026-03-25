// SDK clients are accessed via shared/services/api instead of @ethos/sdk
// (workspace dep not resolvable in EAS Build)

export const mobileV1Capabilities = {
  login: true,
  recording: true,
  schedule: true,
  formsDiary: true,
  p2pSync: "qr+wifi",
  cloudClinicalUploadByDefault: false,
};
