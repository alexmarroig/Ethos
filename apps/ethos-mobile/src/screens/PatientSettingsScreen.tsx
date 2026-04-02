import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';

import { colors } from '../theme/colors';
import { useAuth } from '../contexts/AuthContext';

export default function PatientSettingsScreen() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const { user, logout } = useAuth();

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: theme.foreground }]}>Configuracoes</Text>

      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.label, { color: theme.mutedForeground }]}>NOME</Text>
        <Text style={[styles.value, { color: theme.foreground }]}>{user?.name ?? 'Paciente'}</Text>

        <Text style={[styles.label, { color: theme.mutedForeground }]}>E-MAIL</Text>
        <Text style={[styles.value, { color: theme.foreground }]}>{user?.email ?? 'Nao informado'}</Text>

        <Text style={[styles.label, { color: theme.mutedForeground }]}>ACESSO</Text>
        <Text style={[styles.value, { color: theme.foreground }]}>Portal do paciente</Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Sair</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  title: {
    fontFamily: 'Lora',
    fontSize: 28,
    fontWeight: '700',
  },
  card: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    gap: 8,
  },
  label: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
  value: {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#234e5c',
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '700',
  },
});
