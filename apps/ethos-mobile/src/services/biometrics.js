import * as LocalAuthentication from 'expo-local-authentication';

export const biometricService = {
  /**
   * Checks if the device has biometric hardware and if it's enrolled.
   */
  isAvailable: async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  },

  /**
   * Triggers the biometric or PIN authentication.
   */
  authenticate: async (reason = 'Desbloquear ETHOS') => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      fallbackLabel: 'Usar PIN',
      disableDeviceFallback: false,
    });
    return result.success;
  }
};
