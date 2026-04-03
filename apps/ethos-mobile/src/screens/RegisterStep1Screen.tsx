import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft, Eye, EyeOff } from 'lucide-react-native';

import { useTheme } from '../hooks/useTheme';
import { colors } from '../theme/colors';

export default function RegisterStep1Screen({ navigation }: any) {
  const isDark = useColorScheme() === 'dark';
  const theme = useTheme();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [crp, setCrp] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const primaryTeal = '#234e5c';
  const inputBg = isDark ? '#1e2126' : '#fcfcfb';

  const handleContinue = () => {
    if (!name.trim()) {
      setError('Informe o nome completo para continuar.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setError('Informe um e-mail valido.');
      return;
    }

    if (!crp.trim()) {
      setError('Informe o CRP da psicologa.');
      return;
    }

    if (password.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }

    setError(null);
    navigation.navigate('RegisterStep2', {
      registrationDraft: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        crp: crp.trim().toUpperCase(),
        password,
      },
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: isDark ? colors.dark.background : '#fcfcfb' }]}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft size={28} color={primaryTeal} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: primaryTeal }]}>Crie sua conta</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(600)}>
          <Text style={[styles.title, { color: primaryTeal }]}>Dados Pessoais e{'\n'}Profissionais</Text>
          <Text style={[styles.subtitle, { color: theme.mutedForeground }]}>Passo 1 de 2</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: primaryTeal }]}>Nome Completo</Text>
            <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: theme.border }]}>
              <TextInput
                style={[styles.input, { color: theme.foreground }]}
                placeholder="Digite o nome completo"
                placeholderTextColor={theme.mutedForeground}
                value={name}
                onChangeText={setName}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: primaryTeal }]}>E-mail</Text>
            <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: theme.border }]}>
              <TextInput
                style={[styles.input, { color: theme.foreground }]}
                placeholder="exemplo@email.com"
                placeholderTextColor={theme.mutedForeground}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: primaryTeal }]}>CRP</Text>
            <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: theme.border }]}>
              <TextInput
                style={[styles.input, { color: theme.foreground }]}
                placeholder="00/00000"
                placeholderTextColor={theme.mutedForeground}
                value={crp}
                onChangeText={setCrp}
                autoCapitalize="characters"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: primaryTeal }]}>Senha</Text>
            <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: theme.border }]}>
              <TextInput
                style={[styles.input, { color: theme.foreground }]}
                placeholder="Crie uma senha forte"
                placeholderTextColor={theme.mutedForeground}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword((current) => !current)}>
                {showPassword ? (
                  <EyeOff size={20} color={theme.mutedForeground} />
                ) : (
                  <Eye size={20} color={theme.mutedForeground} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: primaryTeal }]}
            onPress={handleContinue}
          >
            <Text style={styles.primaryButtonText}>Proximo Passo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={[styles.loginText, { color: primaryTeal }]}>
              Ja tenho uma conta. <Text style={styles.loginHighlight}>Entrar</Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Lora',
    fontWeight: '700',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Lora',
    fontWeight: '700',
    lineHeight: 38,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter',
    fontWeight: '600',
    marginBottom: 40,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Inter',
    fontWeight: '600',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter',
  },
  errorBox: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 4,
    marginBottom: 8,
    backgroundColor: '#fee2e2',
  },
  errorText: {
    color: '#991b1b',
    fontSize: 14,
    fontFamily: 'Inter',
    fontWeight: '600',
  },
  primaryButton: {
    height: 64,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#234e5c',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 15,
    elevation: 5,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Inter',
    fontWeight: '700',
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 30,
  },
  loginText: {
    fontSize: 15,
    fontFamily: 'Inter',
  },
  loginHighlight: {
    fontWeight: '700',
  },
});
