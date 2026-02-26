import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import { mockLocalAuthentication } from './webMocks';

const AuthLib = Platform.OS === 'web' ? mockLocalAuthentication : LocalAuthentication;

export const biometricService = {
  /**
   * Checks if the device has biometric hardware and if it's enrolled.
   */
  isAvailable: async () => {
    const hasHardware = await AuthLib.hasHardwareAsync();
    const isEnrolled = await AuthLib.isEnrolledAsync();
    return hasHardware && isEnrolled;
  },

  /**
   * Triggers the biometric or PIN authentication.
   */
  authenticate: async (reason = 'Desbloquear ETHOS') => {
    const result = await AuthLib.authenticateAsync({
      promptMessage: reason,
      fallbackLabel: 'Usar PIN',
      disableDeviceFallback: false,
    });
    return result.success;
  }
};
