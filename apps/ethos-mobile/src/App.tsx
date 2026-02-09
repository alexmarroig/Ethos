import "react-native-gesture-handler";
import React, { useEffect } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppNavigator } from "./navigation/AppNavigator";
import { clearTranscriptionTemp, ensureSecureDirectories } from "./storage/secureDirectories";

const App = () => {
  useEffect(() => {
    const init = async () => {
      await ensureSecureDirectories();
      await clearTranscriptionTemp();
    };
    init();

    const onAppStateChange = async (state: AppStateStatus) => {
      if (state === "active") {
        await clearTranscriptionTemp();
      }
    };
    const subscription = AppState.addEventListener("change", onAppStateChange);
    return () => subscription.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
};

export default App;
