import React, { useState } from 'react';
import {
<<<<<<< HEAD:apps/ethos-mobile/src/screens/LoginScreen.tsx
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
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Eye, EyeOff, Fingerprint, Lock, Mail, Shield } from 'lucide-react-native';

import { colors } from '../theme/colors';
import { useAuth } from '../contexts/AuthContext';

export default function LoginScreen({ navigation }: any) {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const { login, isSubmitting } = useAuth();
=======
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    useColorScheme, StatusBar, KeyboardAvoidingView, Platform,
    ScrollView, Alert, ActivityIndicator
} from 'react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { useAuth } from '../../../shared/hooks/useAuth';
import { Mail, Lock, Eye, EyeOff, Shield, Fingerprint } from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

export default function LoginScreen({ navigation }: any) {
    const isDark = useColorScheme() === 'dark';
    const theme = useTheme();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            Alert.alert('Campos obrigatórios', 'Preencha e-mail e senha.');
            return;
        }
        setIsLoading(true);
        try {
            await login(email.trim(), password);
            // Navigation happens automatically via AppNavigator when token is set
        } catch (err: any) {
            Alert.alert('Erro ao entrar', err?.message ?? 'Verifique suas credenciais e tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };
>>>>>>> 97f19340c110e556bf5c1ebe71a5b625f605e9e4:apps/ethos-mobile/src/features/auth/screens/LoginScreen.tsx

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bgPrimary = isDark ? '#15171a' : '#fcfcfb';
  const inputBg = isDark ? '#1e2126' : '#f1f0ed';
  const primaryTeal = '#234e5c';
  const accentTeal = '#00f2ff';

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Informe e-mail e senha para continuar.');
      return;
    }

    try {
      setError(null);
      await login(email.trim(), password);
    } catch (loginError: any) {
      setError(loginError?.message ?? 'NÃ£o foi possÃ­vel iniciar a sessÃ£o.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: bgPrimary }]}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeIn.delay(200)} style={styles.logoContainer}>
          <View style={[styles.iconWrapper, { backgroundColor: isDark ? '#1a2221' : '#f0f4f3' }]}>
            {isDark ? (
              <Shield size={40} color={accentTeal} fill={accentTeal + '20'} />
            ) : (
              <View style={styles.lightLogoIcon}>
                <Text style={styles.lightLogoSymbol}>âš–ï¸</Text>
              </View>
            )}
          </View>
          <Text style={[styles.brandTitle, { color: isDark ? '#fff' : '#234e5c' }]}>ETHOS</Text>
          <Text style={[styles.brandSubtitle, { color: isDark ? '#00f2ff80' : '#234e5c80' }]}>
            {isDark ? 'CLINICAL ETHICS PLATFORM' : 'Ã‰tica ClÃ­nica para PsicÃ³logos'}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).duration(800)} style={styles.formContainer}>
          <Text style={[styles.welcomeTitle, { color: isDark ? '#fff' : '#234e5c' }]}>
            Bem-vindo de volta
          </Text>
          <Text style={[styles.welcomeSubtitle, { color: theme.mutedForeground }]}>
            {isDark ? 'Enter your credentials to access the clinic' : 'Acesse sua conta para continuar'}
          </Text>

<<<<<<< HEAD:apps/ethos-mobile/src/screens/LoginScreen.tsx
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.foreground }]}>
              {isDark ? 'Professional Email' : 'E-mail'}
            </Text>
            <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'transparent' }]}>
              <Mail size={20} color={theme.mutedForeground} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.foreground }]}
                placeholder="name@clinic.com"
                placeholderTextColor={theme.mutedForeground}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>
=======
                    {/* Sign In Button */}
                    <TouchableOpacity
                        style={[styles.primaryButton, { backgroundColor: isDark ? accentTeal : primaryTeal, opacity: isLoading ? 0.7 : 1 }]}
                        onPress={handleLogin}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color={isDark ? '#15171a' : '#fff'} />
                        ) : (
                            <Text style={[styles.primaryButtonText, { color: isDark ? '#15171a' : '#fff' }]}>
                                {isDark ? 'Sign In' : 'Entrar'}
                            </Text>
                        )}
                    </TouchableOpacity>
>>>>>>> 97f19340c110e556bf5c1ebe71a5b625f605e9e4:apps/ethos-mobile/src/features/auth/screens/LoginScreen.tsx

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.foreground }]}>
              {isDark ? 'Password' : 'Senha'}
            </Text>
            <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'transparent' }]}>
              <Lock size={20} color={theme.mutedForeground} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.foreground }]}
                placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
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
            <View style={[styles.errorBox, { backgroundColor: isDark ? 'rgba(239,68,68,0.14)' : '#fee2e2' }]}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: isDark ? accentTeal : primaryTeal, opacity: isSubmitting ? 0.8 : 1 }]}
            onPress={handleLogin}
            disabled={isSubmitting}
          >
            <Text style={[styles.primaryButtonText, { color: isDark ? '#15171a' : '#fff' }]}>
              {isSubmitting ? (isDark ? 'Signing In...' : 'Entrando...') : isDark ? 'Sign In' : 'Entrar'}
            </Text>
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <Text style={[styles.dividerText, { color: theme.mutedForeground }]}>SECURE ACCESS</Text>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
          </View>

          <TouchableOpacity style={[styles.secondaryButton, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : theme.border }]}>
            <Fingerprint size={22} color={isDark ? accentTeal : primaryTeal} />
            <Text style={[styles.secondaryButtonText, { color: isDark ? '#fff' : primaryTeal }]}>
              {isDark ? 'Touch ID / Face ID' : 'Acessar com Biometria'}
            </Text>
          </TouchableOpacity>

          <View style={styles.footerLinks}>
            <TouchableOpacity onPress={() => navigation.navigate('RecoverPassword')}>
              <Text style={[styles.footerLink, { color: theme.mutedForeground }]}>
                {isDark ? 'Forgot password?' : 'Esqueci minha senha'}
              </Text>
            </TouchableOpacity>

            <View style={styles.signupPrompt}>
              <Text style={[styles.footerText, { color: theme.mutedForeground }]}>
                {isDark ? "Don't have an account?" : 'NÃ£o tem uma conta?'}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('RegisterStep1')}>
                <Text style={[styles.signupLink, { color: primaryTeal }]}>
                  {isDark ? 'Sign Up' : ' Nova conta'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.securityFootnote}>
            <Shield size={14} color={theme.mutedForeground} />
            <Text style={[styles.securityFootnoteText, { color: theme.mutedForeground }]}>
              HIPAA Compliant & Encrypted
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 30,
    paddingTop: 80,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  lightLogoIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#e8eeed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightLogoSymbol: {
    fontSize: 30,
  },
  brandTitle: {
    fontSize: 32,
    fontFamily: 'Lora',
    fontWeight: '700',
    letterSpacing: 1,
  },
  brandSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 4,
  },
  formContainer: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 24,
    fontFamily: 'Lora',
    fontWeight: '700',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 15,
    fontFamily: 'Inter',
    marginBottom: 32,
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
    height: 60,
    borderRadius: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter',
  },
  errorBox: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 13,
    fontFamily: 'Inter',
    fontWeight: '600',
  },
  primaryButton: {
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#00f2ff',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 15,
    elevation: 5,
  },
  primaryButtonText: {
    fontSize: 18,
    fontFamily: 'Inter',
    fontWeight: '700',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 32,
  },
  divider: {
    flex: 1,
    height: 1,
    opacity: 0.1,
  },
  dividerText: {
    fontSize: 11,
    fontFamily: 'Inter',
    fontWeight: '700',
    letterSpacing: 2,
    marginHorizontal: 16,
  },
  secondaryButton: {
    flexDirection: 'row',
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontFamily: 'Inter',
    fontWeight: '600',
  },
  footerLinks: {
    alignItems: 'center',
    marginTop: 32,
    gap: 16,
  },
  footerLink: {
    fontSize: 14,
    fontFamily: 'Inter',
    fontWeight: '600',
  },
  signupPrompt: {
    flexDirection: 'row',
    gap: 4,
  },
  footerText: {
    fontSize: 14,
    fontFamily: 'Inter',
  },
  signupLink: {
    fontSize: 14,
    fontFamily: 'Inter',
    fontWeight: '700',
  },
  securityFootnote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 'auto',
    paddingTop: 40,
  },
  securityFootnoteText: {
    fontSize: 12,
    fontFamily: 'Inter',
    opacity: 0.5,
  },
});
