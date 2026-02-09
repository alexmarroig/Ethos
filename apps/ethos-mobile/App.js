import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  const [role, setRole] = useState('patient'); // 'patient' or 'psychologist'

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.header}>
        <Text style={styles.title}>ETHOS MOBILE</Text>
        <Text style={styles.subtitle}>Portal do Paciente (V1 Alpha)</Text>
      </View>

      <ScrollView style={styles.content}>
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

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Documentos Disponíveis</Text>
          <Text style={styles.emptyText}>Nenhum documento compartilhado ainda.</Text>
        </View>
      </ScrollView>

      <View style={styles.nav}>
        <Text style={styles.navItemActive}>Home</Text>
        <Text style={styles.navItem}>Agenda</Text>
        <Text style={styles.navItem}>Diários</Text>
        <Text style={styles.navItem}>Perfil</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#1E293B',
  },
  title: {
    color: 'white',
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  cardText: {
    color: '#E2E8F0',
    fontSize: 16,
    marginBottom: 12,
  },
  emptyText: {
    color: '#64748B',
    fontStyle: 'italic',
  },
  button: {
    backgroundColor: '#3B82F6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#3B82F6',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  outlineButtonText: {
    color: '#3B82F6',
    fontWeight: '500',
  },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#0B1120',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  navItem: {
    color: '#64748B',
    fontSize: 12,
  },
  navItemActive: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '700',
  }
});
