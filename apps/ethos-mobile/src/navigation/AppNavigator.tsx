import React from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HomeScreen } from "../screens/HomeScreen";
import { RecorderScreen } from "../screens/RecorderScreen";

export type RootStackParamList = {
  Home: undefined;
  Gravador: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
  return (
    <NavigationContainer
      theme={{
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: "#0B1220",
          card: "#111827",
          text: "#F8FAFC",
        },
      }}
    >
      <Stack.Navigator
        initialRouteName="Gravador"
        screenOptions={{
          headerStyle: { backgroundColor: "#0B1220" },
          headerTintColor: "#F8FAFC",
          headerTitleStyle: { fontWeight: "600" },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: "Ethos Mobile" }} />
        <Stack.Screen name="Gravador" component={RecorderScreen} options={{ title: "Gravador" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
