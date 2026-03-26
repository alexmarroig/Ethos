// Web shim for expo-local-authentication — auto-approves on browser
export const hasHardwareAsync = async () => false;
export const isEnrolledAsync = async () => false;
export const authenticateAsync = async () => ({ success: true });
export const supportedAuthenticationTypesAsync = async () => [];
export const AuthenticationType = { FINGERPRINT: 1, FACIAL_RECOGNITION: 2, IRIS: 3 };
export default { hasHardwareAsync, isEnrolledAsync, authenticateAsync, supportedAuthenticationTypesAsync, AuthenticationType };
