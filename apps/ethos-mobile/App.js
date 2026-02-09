import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView, TextInput, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { deriveKeys, setSessionKeys, clearSessionKeys } from './src/services/security';
import { initDb } from './src/services/db';
import { useAppLock } from './src/hooks/useAppLock';
import { purgeService } from './src/services/purge';

export default function App() {
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { isLocked, unlock, setIsLocked } = useAppLock(isLoggedIn);
  const [loading, setLoading] = useState(false);

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
    if (!password) return;
    setLoading(true);
    try {
      const keys = await deriveKeys(password);
      // Try to init DB to verify password (SQLCipher will fail if key is wrong on second open)
      await initDb(keys.dbKey);

      // Clear sensitive password from memory as soon as possible
      setSessionKeys(keys);
      setIsLoggedIn(true);
      setPassword('');
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
  };

  if (!isLoggedIn) {
    return (
      <View style={styles.lockContainer}>
        <Text style={styles.lockTitle}>ETHOS</Text>
        <Text style={styles.lockSubtitle}>Ambiente Clínico Seguro</Text>
        <TextInput
          style={styles.input}
          placeholder="Senha Mestra"
          placeholderTextColor="#64748B"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Derivando chaves...' : 'Entrar'}</Text>
        </TouchableOpacity>
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={styles.title}>ETHOS MOBILE</Text>
            <Text style={styles.subtitle}>Portal do Profissional (V1)</Text>
          </View>
          <TouchableOpacity onPress={handleLogout}>
            <Text style={{ color: '#F87171' }}>Sair</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Status de Segurança</Text>
          <Text style={styles.cardText}>✓ Banco de Dados: SQLCipher Ativo</Text>
          <Text style={styles.cardText}>✓ Vault: AES-256-GCM Pronto</Text>
          <Text style={styles.cardText}>✓ Sigilo: Logs PHI desativados</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Próximas Sessões</Text>
          <Text style={styles.cardText}>João Silva - 14:00 (Confirmado)</Text>
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Iniciar Sessão</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.nav}>
        <Text style={styles.navItemActive}>Home</Text>
        <Text style={styles.navItem}>Pacientes</Text>
        <Text style={styles.navItem}>Finanças</Text>
        <Text style={styles.navItem}>Ajustes</Text>
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
