import React, { useState } from 'react';
import {
  Image,
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
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft, Eye, EyeOff, User } from 'lucide-react-native';

import { useTheme } from '../hooks/useTheme';
import { colors } from '../theme/colors';
import { CRP_REGEX, EMAIL_REGEX } from '../constants/professionalOptions';

const readAvatarDataUrl = async (uri: string, mimeType?: string | null) => {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return `data:${mimeType || 'image/jpeg'};base64,${base64}`;
};

export default function RegisterStep1Screen({ navigation }: any) {
  const isDark = useColorScheme() === 'dark';
  const theme = useTheme();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [crp, setCrp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const primaryTeal = '#234e5c';
  const inputBg = isDark ? '#1e2126' : '#fcfcfb';

  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'ET';

  const handleAvatarPick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const dataUrl = await readAvatarDataUrl(asset.uri, asset.mimeType);
      setAvatarUrl(dataUrl);
    } catch (pickError: any) {
      setError(pickError?.message ?? 'Nao foi possivel selecionar a foto agora.');
    }
  };

  const handleContinue = () => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCrp = crp.trim().replace(/\s+/g, '');

    if (!name.trim()) {
      setError('Informe o nome completo para continuar.');
      return;
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setError('Informe um e-mail valido.');
      return;
    }

    if (!CRP_REGEX.test(normalizedCrp)) {
      setError('Informe o CRP no formato 00/0000 a 00/000000.');
      return;
    }

    if (password.length < 8) {
      setError('A senha precisa ter pelo menos 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas nao conferem.');
      return;
    }

    setError(null);
    navigation.navigate('RegisterStep2', {
      registrationDraft: {
        name: name.trim(),
        email: normalizedEmail,
        crp: normalizedCrp.toUpperCase(),
        password,
        avatar_url: avatarUrl || undefined,
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
          <Text style={[styles.title, { color: primaryTeal }]}>Dados pessoais e profissionais</Text>
          <Text style={[styles.subtitle, { color: theme.mutedForeground }]}>Passo 1 de 2</Text>

          <TouchableOpacity style={styles.avatarPicker} onPress={handleAvatarPick} activeOpacity={0.9}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: isDark ? '#1e2126' : '#f0f4f3' }]}>
                <Text style={[styles.avatarFallbackText, { color: primaryTeal }]}>{initials}</Text>
              </View>
            )}
            <View style={styles.avatarTextWrap}>
              <Text style={[styles.avatarTitle, { color: primaryTeal }]}>Foto profissional</Text>
              <Text style={[styles.avatarSubtitle, { color: theme.mutedForeground }]}>
                Adicione uma foto para aparecer no perfil e no painel.
              </Text>
            </View>
            <User size={20} color={primaryTeal} />
          </TouchableOpacity>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: primaryTeal }]}>Nome completo</Text>
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
                placeholder="06/20144"
                placeholderTextColor={theme.mutedForeground}
                value={crp}
                onChangeText={setCrp}
                autoCapitalize="characters"
              />
            </View>
            <Text style={[styles.helperText, { color: theme.mutedForeground }]}>
              Use o formato 00/0000 a 00/000000.
            </Text>
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

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: primaryTeal }]}>Confirmar senha</Text>
            <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: theme.border }]}>
              <TextInput
                style={[styles.input, { color: theme.foreground }]}
                placeholder="Repita a senha"
                placeholderTextColor={theme.mutedForeground}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword((current) => !current)}>
                {showConfirmPassword ? (
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

          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: primaryTeal }]} onPress={handleContinue}>
            <Text style={styles.primaryButtonText}>Proximo passo</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.loginLink} onPress={() => navigation.navigate('Login')}>
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
    marginBottom: 24,
  },
  avatarPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 28,
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarFallback: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontSize: 24,
    fontFamily: 'Inter',
    fontWeight: '700',
  },
  avatarTextWrap: {
    flex: 1,
  },
  avatarTitle: {
    fontSize: 15,
    fontFamily: 'Inter',
    fontWeight: '700',
  },
  avatarSubtitle: {
    marginTop: 4,
    fontSize: 13,
    fontFamily: 'Inter',
    lineHeight: 18,
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
    minHeight: 56,
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter',
  },
  helperText: {
    marginTop: 6,
    fontSize: 12,
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
