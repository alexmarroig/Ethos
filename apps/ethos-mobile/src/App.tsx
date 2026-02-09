import "react-native-gesture-handler";
import React, { useEffect } from "react";
import { AppState } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppNavigator } from "./navigation/AppNavigator";
import { clearCacheDirectory } from "./storage/cacheCleanup";

const App = () => {
  useEffect(() => {
    const runCleanup = () => {
      void clearCacheDirectory().catch((error) => {
        console.warn("Falha ao limpar cache:", error);
      });
    };

    runCleanup();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        runCleanup();
      }
    });
    return () => subscription.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
};

export default App;
