import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView, TextInput, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { deriveKeys, setSessionKeys, clearSessionKeys } from './src/services/security';
import { initDb } from './src/services/db';
import { useAppLock } from './src/hooks/useAppLock';
import { purgeService } from './src/services/purge';
import { deviceService } from './src/services/device';
import { modelManager } from './src/services/modelManager';
import { TranscriptionJob } from './src/components/TranscriptionJob';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { isLocked, unlock, setIsLocked } = useAppLock(isLoggedIn);
  const [loading, setLoading] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [dcs, setDcs] = useState(null);
  const [reminderActive, setReminderActive] = useState(true);

  // Aggressive purge on boot
  useEffect(() => {
    purgeService.purgeTempData();
  }, []);

  // Aggressive purge on unlock
  useEffect(() => {
    if (isLoggedIn && !isLocked) {
      purgeService.purgeTempData();
    }
  }, [isLoggedIn, isLocked]);

  const handleLogin = async () => {
    if (!password || !email) return;
    setLoading(true);
    try {
      const keys = await deriveKeys(password);
      const db = await initDb(keys.dbKey);

      // Real check against users table
      const dbUser = await db.getFirstAsync('SELECT * FROM users WHERE email = ?', email);
      if (!dbUser || dbUser.passwordHash !== password) {
        throw new Error('Credenciais inválidas');
      }

      setUser(dbUser);
      setSessionKeys(keys);
      setIsLoggedIn(true);
      setPassword('');

      // Check DCS after login (only for professionals)
      if (dbUser.role !== 'psychologist') return;
      const storedDcs = await deviceService.getStoredDCS();
      if (!storedDcs) {
        // Run benchmark if needed (requires base model)
        const baseReady = await modelManager.isModelReady('base');
        if (baseReady) {
          const bench = await deviceService.runBenchmark(modelManager.getModelPath('base'));
          const calculated = await deviceService.calculateDCS(bench);
          setDcs(calculated);
        } else {
          // Will be handled when starting first job
        }
      } else {
        setDcs(storedDcs);
      }
    } catch (error) {
      // Sanitized error logging
      console.error('[Auth] Falha na autenticação.');
      Alert.alert('Erro', 'Falha ao acessar o banco de dados. Verifique sua senha.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearSessionKeys();
    setIsLoggedIn(false);
    setUser(null);
  };

  if (!isLoggedIn) {
    return (
      <View style={styles.lockContainer}>
        <Text style={styles.lockTitle}>ETHOS</Text>
        <Text style={styles.lockSubtitle}>Ambiente Clínico Seguro</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#64748B"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Senha / Master Key"
          placeholderTextColor="#64748B"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Derivando chaves...' : 'Entrar'}</Text>
        </TouchableOpacity>
        <View style={{ marginTop: 24, padding: 12, borderTopWidth: 1, borderTopColor: '#1E293B' }}>
          <Text style={{ color: '#64748B', fontSize: 11, textAlign: 'center' }}>
            TESTE: psico@ethos.app / ethos2026 | paciente@ethos.app / ethos2026
          </Text>
        </View>
      </View>
    );
  }

  if (isLocked) {
    return (
      <View style={styles.lockContainer}>
        <Text style={styles.lockTitle}>ETHOS BLOQUEADO</Text>
        <Text style={styles.lockSubtitle}>Sessão protegida por biometria</Text>
        <TouchableOpacity style={styles.button} onPress={unlock}>
          <Text style={styles.buttonText}>Desbloquear</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.outlineButton} onPress={handleLogout} style={{ marginTop: 20 }}>
          <Text style={styles.outlineButtonText}>Sair</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (user.role === 'psychologist') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={styles.title}>ETHOS MOBILE</Text>
              <Text style={styles.subtitle}>Profissional: {user.fullName}</Text>
            </View>
            <TouchableOpacity onPress={handleLogout}>
              <Text style={{ color: '#F87171' }}>Sair</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.content}>
          {activeSessionId && (
            <TranscriptionJob
              sessionId={activeSessionId}
              onCancel={() => setActiveSessionId(null)}
              onComplete={() => {
                Alert.alert('Sucesso', 'Sessão transcrita e salva com segurança.');
                setActiveSessionId(null);
              }}
            />
          )}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Status de Segurança</Text>
            <Text style={styles.cardText}>✓ Banco de Dados: SQLCipher Ativo</Text>
            <Text style={styles.cardText}>✓ Vault: AES-256-GCM Pronto</Text>
            <Text style={styles.cardText}>✓ IA Offline: {dcs ? dcs.recommendedModel : 'Pendente'}</Text>
            {dcs && <Text style={styles.cardText}>✓ DCS Score: {dcs.dcs.toFixed(0)}/100</Text>}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Agenda do Dia</Text>
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.cardText}>14:00 - João Silva (Confirmado)</Text>
              <TouchableOpacity
                style={{ ...styles.button, backgroundColor: '#10B981' }}
                onPress={() => setActiveSessionId('sess-demo-001')}
                disabled={!!activeSessionId}
              >
                <Text style={styles.buttonText}>Gravar / Transcrever</Text>
              </TouchableOpacity>
            </View>

            <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 8 }}>
              <Text style={styles.cardText}>16:30 - Maria Oliveira (Pendente)</Text>
              <TouchableOpacity
                style={{ ...styles.outlineButton, borderColor: '#3B82F6' }}
                onPress={() => {
                  const msg = "Olá Maria, confirmo nossa sessão hoje às 16:30. Até breve!";
                  Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}&phone=5500000000000`);
                }}
              >
                <Text style={{ color: '#3B82F6' }}>Enviar Confirmação (WA)</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Lembretes WhatsApp</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: '#E2E8F0' }}>Lembretes locais ativos</Text>
              <TouchableOpacity
                onPress={() => setReminderActive(!reminderActive)}
                style={{ backgroundColor: reminderActive ? '#10B981' : '#334155', padding: 6, borderRadius: 6 }}
              >
                <Text style={{ color: 'white', fontSize: 12 }}>{reminderActive ? 'LIGADO' : 'DESLIGADO'}</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 8 }}>
              O sistema notificará 1h antes de cada sessão para você disparar o lembrete manual.
            </Text>
          </View>

          {!dcs && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Otimização de Hardware</Text>
              <Text style={styles.cardText}>O ETHOS precisa rodar um benchmark rápido para selecionar o melhor modelo de IA.</Text>
              <TouchableOpacity
                style={styles.outlineButton}
                onPress={async () => {
                  const baseReady = await modelManager.isModelReady('base');
                  if (!baseReady) {
                    Alert.alert('Download Necessário', 'Baixando modelo base para benchmark...');
                    await modelManager.downloadModel('base');
                  }
                  const bench = await deviceService.runBenchmark(modelManager.getModelPath('base'));
                  const calculated = await deviceService.calculateDCS(bench);
                  setDcs(calculated);
                }}
              >
                <Text style={styles.outlineButtonText}>Iniciar Benchmark</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        <View style={styles.nav}>
          <Text style={styles.navItemActive}>Home</Text>
          <Text style={styles.navItem}>Pacientes</Text>
          <Text style={styles.navItem}>Ajustes</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Patient Dashboard
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={styles.title}>ETHOS</Text>
            <Text style={styles.subtitle}>Olá, {user.fullName}</Text>
          </View>
          <TouchableOpacity onPress={handleLogout}>
            <Text style={{ color: '#F87171' }}>Sair</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Minha Próxima Sessão</Text>
          <Text style={styles.cardText}>Data: 22/02/2025 às 14:00</Text>
          <TouchableOpacity
            style={{ ...styles.button, backgroundColor: '#10B981' }}
            onPress={() => Alert.alert('Sucesso', 'Presença confirmada com sua psicóloga.')}
          >
            <Text style={styles.buttonText}>Confirmar Presença</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quadro de Avisos</Text>
          <View style={{ backgroundColor: '#0B1120', padding: 12, borderRadius: 8, marginBottom: 8 }}>
            <Text style={{ color: '#E2E8F0', fontSize: 13, fontWeight: '600' }}>Recesso de Carnaval</Text>
            <Text style={{ color: '#94A3B8', fontSize: 12 }}>Não haverá sessões entre 01/03 e 05/03. Retornaremos dia 06/03.</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Meus Diários</Text>
          <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 12 }}>Use estes espaços para registrar o que sentir vontade.</Text>
          <TouchableOpacity style={styles.outlineButton}>
            <Text style={styles.outlineButtonText}>+ Diário de Emoções</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.outlineButton}>
            <Text style={styles.outlineButtonText}>+ Diário dos Sonhos</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.nav}>
        <Text style={styles.navItemActive}>Início</Text>
        <Text style={styles.navItem}>Histórico</Text>
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
  lockContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    padding: 30,
  },
  lockTitle: {
    color: 'white',
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 2,
  },
  lockSubtitle: {
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 40,
  },
  input: {
    backgroundColor: '#1E293B',
    color: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
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
    fontSize: 14,
    marginBottom: 4,
  },
  button: {
    backgroundColor: '#3B82F6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
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
