import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { biometricService } from '../services/biometrics';
import { purgeService } from '../services/purge';

const LOCK_TOLERANCE_MS = 30000; // 30 seconds
const BIOMETRIC_PREF_KEY = 'ethos-biometric-enabled';

export const useBiometricPreference = () => {
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await SecureStore.getItemAsync(BIOMETRIC_PREF_KEY);
        setBiometricEnabledState(stored === 'true');
      } catch {
        setBiometricEnabledState(false);
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  const setBiometricEnabled = useCallback(async (enabled) => {
    try {
      if (enabled) {
        // Require biometric confirmation before enabling
        const confirmed = await biometricService.authenticate();
        if (!confirmed) return false;
      }
      await SecureStore.setItemAsync(BIOMETRIC_PREF_KEY, enabled ? 'true' : 'false');
      setBiometricEnabledState(enabled);
      return true;
    } catch {
      return false;
    }
  }, []);

  return { biometricEnabled, setBiometricEnabled, isLoading };
};

export const useAppLock = (isUserLoggedIn) => {
  const [isLocked, setIsLocked] = useState(false);
  const { biometricEnabled } = useBiometricPreference();
  const appState = useRef(AppState.currentState);
  const backgroundTimestamp = useRef(null);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (
        appState.current.match(/active/) &&
        nextAppState.match(/inactive|background/)
      ) {
        // App went to background
        backgroundTimestamp.current = Date.now();
      }

      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App returned to foreground
        if (isUserLoggedIn && biometricEnabled && backgroundTimestamp.current) {
          const elapsed = Date.now() - backgroundTimestamp.current;
          if (elapsed > LOCK_TOLERANCE_MS) {
            setIsLocked(true);
          }
        }
        backgroundTimestamp.current = null;
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [isUserLoggedIn, biometricEnabled]);

  const unlock = async () => {
    const success = await biometricService.authenticate();
    if (success) {
      await purgeService.purgeTempData();
      setIsLocked(false);
      return true;
    }
    return false;
  };

  return {
    isLocked,
    setIsLocked,
    unlock
  };
};
