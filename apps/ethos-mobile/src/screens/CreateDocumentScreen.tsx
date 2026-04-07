import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
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
import { useNavigation } from '@react-navigation/native';
import { ChevronDown, Save } from 'lucide-react-native';

import { colors } from '../theme/colors';
import { fetchPatients } from '../services/api/patients';
import { createDocument } from '../services/api/documents';
import type { PatientRecord } from '../services/api/types';

const primaryTeal = '#234e5c';

const documentTypes = [
  { id: 'report', label: 'Relatório' },
  { id: 'declaration', label: 'Declaração' },
  { id: 'certificate', label: 'Atestado' },
  { id: 'receipt', label: 'Recibo' },
  { id: 'contract', label: 'Contrato' },
  { id: 'questionnaire', label: 'Questionário' },
];

export default function CreateDocumentScreen() {
  const navigation = useNavigation<any>();
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;

  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedType, setSelectedType] = useState('report');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadPatients = async () => {
      try {
        setIsLoading(true);
        const data = await fetchPatients();
        setPatients(data);
        if (data.length > 0) setSelectedPatientId(data[0].id);
      } catch (err) {
        console.error('Failed to load patients', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadPatients();
  }, []);

  const handleCreate = async () => {
    if (!selectedPatientId || !title || !content) return;
    try {
      setIsSubmitting(true);
      await createDocument({
        patient_id: selectedPatientId,
        title,
        type: selectedType as any,
        content,
        template_id: 'default',
        case_id: 'default',
      });
      navigation.goBack();
    } catch (err) {
      console.error('Failed to create document', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={primaryTeal} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: theme.mutedForeground }]}>Paciente</Text>
          <View style={[styles.pickerContainer, { backgroundColor: isDark ? '#2a2d31' : '#fff', borderColor: theme.border }]}>
            <TextInput
              style={[styles.input, { color: theme.foreground }]}
              value={patients.find(p => p.id === selectedPatientId)?.label || ''}
              editable={false}
            />
            <ChevronDown size={20} color={theme.mutedForeground} />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: theme.mutedForeground }]}>Tipo de Documento</Text>
          <View style={styles.typeGrid}>
            {documentTypes.map((type) => (
              <TouchableOpacity
                key={type.id}
                onPress={() => setSelectedType(type.id)}
                style={[
                  styles.typeChip,
                  selectedType === type.id && styles.activeTypeChip,
                  { backgroundColor: selectedType === type.id ? primaryTeal : (isDark ? '#2a2d31' : '#fff'), borderColor: theme.border },
                ]}
              >
                <Text style={[styles.typeChipText, { color: selectedType === type.id ? '#fff' : theme.foreground }]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: theme.mutedForeground }]}>Título</Text>
          <TextInput
            style={[styles.input, { backgroundColor: isDark ? '#2a2d31' : '#fff', borderColor: theme.border, color: theme.foreground }]}
            placeholder="Ex: Relatório de Evolução"
            placeholderTextColor={theme.mutedForeground}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={[styles.formGroup, { flex: 1 }]}>
          <Text style={[styles.label, { color: theme.mutedForeground }]}>Conteúdo</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: isDark ? '#2a2d31' : '#fff', borderColor: theme.border, color: theme.foreground }]}
            placeholder="Escreva o conteúdo do documento..."
            placeholderTextColor={theme.mutedForeground}
            multiline
            value={content}
            onChangeText={setContent}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, { opacity: (isSubmitting || !title || !content) ? 0.7 : 1 }]}
          onPress={handleCreate}
          disabled={isSubmitting || !title || !content}
        >
          {isSubmitting ? <ActivityIndicator color="#fff" /> : (
            <>
              <Save size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Gerar Documento</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 24,
    gap: 20,
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: 'Inter',
  },
  pickerContainer: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  activeTypeChip: {
    borderColor: primaryTeal,
  },
  typeChipText: {
    fontSize: 13,
    fontFamily: 'Inter',
    fontWeight: '600',
  },
  textArea: {
    minHeight: 300,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    fontSize: 15,
    fontFamily: 'Inter',
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: primaryTeal,
    height: 56,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 10,
    shadowColor: primaryTeal,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter',
    fontWeight: '700',
  },
});
