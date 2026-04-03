import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';

import { colors } from '../theme/colors';
import { createPatient } from '../services/api/patients';

export default function CreatePatientScreen({ navigation }: any) {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Campo obrigatório', 'Informe o nome do paciente.');
      return;
    }

    try {
      setIsSubmitting(true);
      const patient = await createPatient({
        name: name.trim(),
        email: email.trim() || undefined,
        whatsapp: whatsapp.trim() || undefined,
      });

      navigation.replace('PatientDetail', { patientId: patient.id });
    } catch (error: any) {
      Alert.alert('Erro', error?.message ?? 'Não foi possível cadastrar o paciente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.foreground }]}>Cadastro rápido</Text>
          <Text style={[styles.subtitle, { color: theme.mutedForeground }]}>
            Crie o paciente com o básico agora e complete a ficha logo em seguida.
          </Text>

          <Text style={[styles.label, { color: theme.foreground }]}>Nome</Text>
          <TextInput
            style={[styles.input, { color: theme.foreground, backgroundColor: theme.background, borderColor: theme.border }]}
            value={name}
            onChangeText={setName}
            placeholder="Nome completo do paciente"
            placeholderTextColor={theme.mutedForeground}
          />

          <Text style={[styles.label, { color: theme.foreground }]}>WhatsApp</Text>
          <TextInput
            style={[styles.input, { color: theme.foreground, backgroundColor: theme.background, borderColor: theme.border }]}
            value={whatsapp}
            onChangeText={setWhatsapp}
            placeholder="(11) 99999-9999"
            placeholderTextColor={theme.mutedForeground}
            keyboardType="phone-pad"
          />

          <Text style={[styles.label, { color: theme.foreground }]}>E-mail</Text>
          <TextInput
            style={[styles.input, { color: theme.foreground, backgroundColor: theme.background, borderColor: theme.border }]}
            value={email}
            onChangeText={setEmail}
            placeholder="email@paciente.com"
            placeholderTextColor={theme.mutedForeground}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Criar e abrir ficha</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  title: {
    fontFamily: 'Lora',
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontFamily: 'Inter',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 16,
  },
  label: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'Inter',
    fontSize: 15,
  },
  primaryButton: {
    backgroundColor: '#234e5c',
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
    marginTop: 24,
  },
  primaryButtonText: {
    color: '#fff',
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '700',
  },
});
