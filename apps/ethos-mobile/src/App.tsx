import "react-native-gesture-handler";
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
      <AppNavigator />
    </SafeAreaProvider>
  );
};

export default App;
