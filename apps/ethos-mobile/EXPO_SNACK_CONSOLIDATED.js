// COPIE E COLE ESTE CÓDIGO NO https://snack.expo.dev PARA VER A INTERFACE
import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');
const isDesktop = width > 768;

const PsychologistDashboardMock = () => (
  <View style={isDesktop ? styles.desktopGrid : styles.mobileStack}>
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Gravação de Sessão</Text>
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Iniciar Nova Sessão</Text>
      </TouchableOpacity>
      <View style={{ marginTop: 20 }}>
        <Text style={styles.cardText}>✓ Microfone configurado</Text>
        <Text style={styles.cardText}>✓ 15.4 GB de espaço disponível</Text>
      </View>
    </View>

    <View style={styles.card}>
      <Text style={styles.cardTitle}>Segurança & Integridade</Text>
      <View style={styles.integrityRow}>
        <View style={styles.statusDot} />
        <Text style={styles.cardText}>Banco SQLCipher: Protegido</Text>
      </View>
      <View style={styles.integrityRow}>
        <View style={styles.statusDot} />
        <Text style={styles.cardText}>Vault AES-256: Ativo</Text>
      </View>
      <View style={styles.integrityRow}>
        <View style={styles.statusDot} />
        <Text style={styles.cardText}>Biometria: Configurada</Text>
      </View>
    </View>

    <View style={styles.card}>
      <Text style={styles.cardTitle}>DCS (Device Score)</Text>
      <Text style={styles.scoreText}>92/100</Text>
      <Text style={styles.cardText}>Modelo sugerido: Whisper Large V3</Text>
    </View>
  </View>
);

const PatientDashboardMock = () => (
  <View style={isDesktop ? styles.desktopGrid : styles.mobileStack}>
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Próximo Atendimento</Text>
      <View style={styles.appointmentInfo}>
        <Text style={styles.dateText}>22 FEV</Text>
        <View>
          <Text style={styles.cardText}>Quinta-feira às 14:00</Text>
          <Text style={styles.cardText}>Presencial • Clínica Central</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Confirmar Presença</Text>
      </TouchableOpacity>
    </View>

    <View style={styles.card}>
      <Text style={styles.cardTitle}>Meus Diários</Text>
      <TouchableOpacity style={styles.outlineButton}>
        <Text style={styles.outlineButtonText}>+ Novo Diário de Emoções</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.outlineButton}>
        <Text style={styles.outlineButtonText}>+ Relatar um Sonho</Text>
      </TouchableOpacity>
    </View>
  </View>
);

export default function App() {
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState('psychologist');
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    setLoading(true);
    setTimeout(() => {
      setIsLoggedIn(true);
      setLoading(false);
    }, 800);
  };

  if (!isLoggedIn) {
    return (
      <View style={styles.lockContainer}>
        <View style={styles.loginBox}>
          <Text style={styles.lockTitle}>ETHOS</Text>
          <Text style={styles.lockSubtitle}>Ambiente Clínico Seguro • Offline-First</Text>
          <TextInput
            style={styles.input}
            placeholder="Senha Mestra"
            placeholderTextColor="#64748B"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity style={styles.button} onPress={handleLogin}>
            <Text style={styles.buttonText}>{loading ? 'Iniciando cofre...' : 'Entrar'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.outlineButton, { marginTop: 40, borderColor: '#10B981' }]}
            onPress={handleLogin}
          >
            <Text style={[styles.outlineButtonText, { color: '#10B981' }]}>Acesso Demonstração (Windows/Web)</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>ETHOS MOBILE</Text>
            <Text style={styles.subtitle}>Portal {role === 'psychologist' ? 'do Profissional' : 'do Paciente'}</Text>
          </View>
          <TouchableOpacity onPress={() => setIsLoggedIn(false)} style={styles.logoutBtn}>
            <Text style={{ color: '#F87171', fontWeight: '700' }}>Sair</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.roleRow}>
          <TouchableOpacity
            style={[styles.roleButton, role === 'psychologist' && styles.roleButtonActive]}
            onPress={() => setRole('psychologist')}
          >
            <Text style={styles.roleText}>Psicólogo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleButton, role === 'patient' && styles.roleButtonActive]}
            onPress={() => setRole('patient')}
          >
            <Text style={styles.roleText}>Paciente</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {role === 'psychologist' ? <PsychologistDashboardMock /> : <PatientDashboardMock />}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  lockContainer: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center', padding: 20 },
  loginBox: { width: '100%', maxWidth: 400 },
  lockTitle: { color: 'white', fontSize: 42, fontWeight: '900', textAlign: 'center', letterSpacing: 4 },
  lockSubtitle: { color: '#94A3B8', textAlign: 'center', marginBottom: 40, fontSize: 14 },
  input: {
    backgroundColor: '#1E293B',
    color: 'white',
    padding: 18,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#334155',
    fontSize: 16,
  },
  header: { padding: 20, backgroundColor: '#1E293B', gap: 15, borderBottomWidth: 1, borderBottomColor: '#334155' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: 'white', fontSize: 28, fontWeight: '900', letterSpacing: 1 },
  subtitle: { color: '#94A3B8', fontSize: 14, fontWeight: '500' },
  logoutBtn: { backgroundColor: 'rgba(248, 113, 113, 0.1)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  roleButton: { borderWidth: 1, borderColor: '#334155', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 10, backgroundColor: '#1E293B' },
  roleButtonActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  roleText: { color: 'white', fontSize: 14, fontWeight: '700' },
  content: { flex: 1, padding: 20 },
  desktopGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  mobileStack: { flexDirection: 'column', gap: 16 },
  card: {
    backgroundColor: '#1E293B',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    flex: isDesktop ? 1 : undefined,
    minWidth: isDesktop ? 300 : '100%',
  },
  cardTitle: { color: 'white', fontSize: 20, fontWeight: '800', marginBottom: 15, letterSpacing: 0.5 },
  cardText: { color: '#CBD5E1', fontSize: 15, marginBottom: 8 },
  button: { backgroundColor: '#3B82F6', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  buttonText: { color: 'white', fontWeight: '800', fontSize: 16 },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#3B82F6',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  outlineButtonText: { color: '#60A5FA', fontWeight: '700', fontSize: 15 },
  integrityRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  scoreText: { color: '#10B981', fontSize: 36, fontWeight: '900', marginVertical: 10 },
  appointmentInfo: { flexDirection: 'row', gap: 15, alignItems: 'center', marginBottom: 20 },
  dateText: { color: 'white', fontSize: 24, fontWeight: '900', backgroundColor: '#334155', padding: 10, borderRadius: 12, textAlign: 'center', minWidth: 80 },
});
