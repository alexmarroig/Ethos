import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";

export type HomeScreenProps = NativeStackScreenProps<RootStackParamList, "Home">;

export const HomeScreen = ({ navigation }: HomeScreenProps) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bem-vindo ao Ethos Mobile</Text>
      <Text style={styles.subtitle}>Acesse o gravador para iniciar uma nova sessão.</Text>
      <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate("Gravador")}>
        <Text style={styles.primaryButtonText}>Abrir Gravador</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1220",
    padding: 24,
    justifyContent: "center",
    gap: 16,
  },
  title: {
    fontSize: 24,
    color: "#F8FAFC",
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 14,
    color: "#94A3B8",
  },
  primaryButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#F8FAFC",
    fontWeight: "600",
  },
});
