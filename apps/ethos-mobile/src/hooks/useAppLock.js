import { useState, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { biometricService } from '../services/biometrics';

const LOCK_TOLERANCE_MS = 30000;

export const useAppLock = (isUserLoggedIn) => {
  const [isLocked, setIsLocked] = useState(false);
  const appState = useRef(AppState.currentState);
  const backgroundTimestamp = useRef(null);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (appState.current.match(/active/) && nextAppState.match(/inactive|background/)) {
        backgroundTimestamp.current = Date.now();
      }
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        if (isUserLoggedIn && backgroundTimestamp.current) {
          const elapsed = Date.now() - backgroundTimestamp.current;
          if (elapsed > LOCK_TOLERANCE_MS) setIsLocked(true);
        }
        backgroundTimestamp.current = null;
      }
      appState.current = nextAppState;
    });
    return () => subscription.remove();
  }, [isUserLoggedIn]);

  const unlock = async () => {
    const success = await biometricService.authenticate();
    if (success) {
      setIsLocked(false);
      return true;
    }
    return false;
  };

  return { isLocked, setIsLocked, unlock };
};
