import * as LocalAuthentication from 'expo-local-authentication';

export const biometricService = {
  isAvailable: async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  },
  authenticate: async (reason = 'Desbloquear ETHOS') => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      fallbackLabel: 'Usar PIN',
      disableDeviceFallback: false,
    });
    return result.success;
  }
};
