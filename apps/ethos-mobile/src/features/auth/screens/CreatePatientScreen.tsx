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
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Campo obrigatÃ³rio', 'Informe o nome do paciente.');
      return;
    }

    try {
      setIsSubmitting(true);
      await createPatient({
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Erro', error?.message ?? 'NÃ£o foi possÃ­vel cadastrar o paciente.');
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
          <Text style={[styles.label, { color: theme.foreground }]}>Nome</Text>
          <TextInput
            style={[styles.input, { color: theme.foreground, backgroundColor: theme.background, borderColor: theme.border }]}
            value={name}
            onChangeText={setName}
            placeholder="Nome completo do paciente"
            placeholderTextColor={theme.mutedForeground}
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

          <Text style={[styles.label, { color: theme.foreground }]}>Telefone</Text>
          <TextInput
            style={[styles.input, { color: theme.foreground, backgroundColor: theme.background, borderColor: theme.border }]}
            value={phone}
            onChangeText={setPhone}
            placeholder="(11) 99999-9999"
            placeholderTextColor={theme.mutedForeground}
            keyboardType="phone-pad"
          />

          <Text style={[styles.label, { color: theme.foreground }]}>ObservaÃ§Ãµes</Text>
          <TextInput
            style={[styles.textarea, { color: theme.foreground, backgroundColor: theme.background, borderColor: theme.border }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Notas iniciais, contatos de apoio, pontos importantes..."
            placeholderTextColor={theme.mutedForeground}
            multiline
            textAlignVertical="top"
          />

          <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Salvar Paciente</Text>}
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
  textarea: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 140,
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
