import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function PatientDashboard() {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Minha Próxima Sessão</Text>
        <Text style={styles.cardText}>Data: 22/02/2025 às 14:00</Text>
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Confirmar Presença</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Meus Diários</Text>
        <TouchableOpacity style={styles.outlineButton}>
          <Text style={styles.outlineButtonText}>+ Diário de Emoções</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.outlineButton}>
          <Text style={styles.outlineButtonText}>+ Diário dos Sonhos</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: {
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitle: { color: 'white', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  cardText: { color: '#E2E8F0', fontSize: 14, marginBottom: 6 },
  button: { backgroundColor: '#3B82F6', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  buttonText: { color: 'white', fontWeight: '600' },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#3B82F6',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  outlineButtonText: { color: '#3B82F6', fontWeight: '500' },
});
