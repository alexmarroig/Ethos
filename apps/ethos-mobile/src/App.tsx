import "react-native-gesture-handler";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  AppStateStatus,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppNavigator } from "./navigation/AppNavigator";
import { getLastBackgroundAt, setLastBackgroundAt } from "./storage/appLockStorage";

const App = () => {
  const [isLocked, setIsLocked] = useState(true);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const lastBackgroundAtRef = useRef<number | null>(null);
  const requireImmediateLockRef = useRef(false);

  useEffect(() => {
    const load = async () => {
      const lastBackgroundAt = await getLastBackgroundAt();
      lastBackgroundAtRef.current = lastBackgroundAt;
    };
    load();
  }, []);

  const handleUnlock = useCallback(async () => {
    setIsUnlocking(true);
    setAuthError(null);
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        setAuthError("Biometria/PIN do dispositivo indisponível.");
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Desbloquear Ethos",
        fallbackLabel: "Usar PIN do dispositivo",
        disableDeviceFallback: false,
      });

      if (result.success) {
        setIsLocked(false);
      } else {
        setAuthError("Falha na autenticação.");
      }
    } finally {
      setIsUnlocking(false);
    }
  }, []);

  useEffect(() => {
    const handleAppStateChange = async (nextState: AppStateStatus) => {
      const prevState = appState.current;
      appState.current = nextState;

      if (nextState === "inactive") {
        requireImmediateLockRef.current = true;
        const now = Date.now();
        lastBackgroundAtRef.current = now;
        await setLastBackgroundAt(now);
        return;
      }

      if (nextState === "background") {
        const now = Date.now();
        lastBackgroundAtRef.current = now;
        await setLastBackgroundAt(now);
        return;
      }

      if (prevState.match(/inactive|background/) && nextState === "active") {
        const now = Date.now();
        const lastBackgroundAt = lastBackgroundAtRef.current ?? now;
        const elapsed = now - lastBackgroundAt;
        const shouldLock = requireImmediateLockRef.current || elapsed > 30_000;

        requireImmediateLockRef.current = false;
        if (shouldLock) {
          setIsLocked(true);
        }
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => {
      subscription.remove();
    };
import React, { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppNavigator } from "./navigation/AppNavigator";
import { ensureAppDirectories } from "./storage/appDirectories";

const App = () => {
  useEffect(() => {
    void ensureAppDirectories();
  }, []);

  return (
    <SafeAreaProvider>
      {isLocked ? (
        <View style={styles.lockContainer}>
          <Text style={styles.lockTitle}>Sessão protegida</Text>
          <Text style={styles.lockSubtitle}>
            Autentique-se para continuar usando o aplicativo.
          </Text>
          {authError ? <Text style={styles.lockError}>{authError}</Text> : null}
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.lockButton}
            onPress={handleUnlock}
            disabled={isUnlocking}
          >
            {isUnlocking ? (
              <ActivityIndicator color="#0F172A" />
            ) : (
              <Text style={styles.lockButtonText}>Desbloquear</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <AppNavigator />
      )}
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  lockContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#0F172A",
  },
  lockTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#F8FAFC",
    marginBottom: 8,
  },
  lockSubtitle: {
    fontSize: 16,
    color: "#CBD5F5",
    textAlign: "center",
    marginBottom: 16,
  },
  lockError: {
    color: "#F87171",
    marginBottom: 16,
  },
  lockButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
    backgroundColor: "#F8FAFC",
  },
  lockButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
  },
});

export default App;
