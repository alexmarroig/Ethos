import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';

import { colors } from '../theme/colors';
import { fetchPatients } from '../services/api/patients';
import { createSession } from '../services/api/sessions';
import type { PatientRecord } from '../services/api/types';

const formatDateInput = (value: Date) => value.toISOString().slice(0, 10);
const formatTimeInput = (value: Date) => value.toTimeString().slice(0, 5);

export default function CreateSessionScreen({ navigation, route }: any) {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;

  const initialPatientId = route.params?.patientId as string | undefined;

  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId ?? '');
  const [date, setDate] = useState(formatDateInput(new Date()));
  const [time, setTime] = useState(formatTimeInput(new Date()));
  const [duration, setDuration] = useState('50');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    const loadPatients = async () => {
      try {
        const response = await fetchPatients();
        if (!active) return;
        setPatients(response);
        if (!initialPatientId && response[0]) {
          setSelectedPatientId(response[0].id);
        }
      } catch (error: any) {
        if (active) {
          Alert.alert('Erro', error?.message ?? 'Não foi possível carregar os pacientes.');
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void loadPatients();

    return () => {
      active = false;
    };
  }, [initialPatientId]);

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === selectedPatientId) ?? null,
    [patients, selectedPatientId],
  );

  const handleSubmit = async () => {
    if (!selectedPatientId) {
      Alert.alert('Paciente obrigatório', 'Selecione um paciente para agendar a sessão.');
      return;
    }

    const scheduledAt = new Date(`${date}T${time}:00`);
    if (Number.isNaN(scheduledAt.getTime())) {
      Alert.alert('Data inválida', 'Revise a data e o horário informados.');
      return;
    }

    try {
      setIsSubmitting(true);
      const session = await createSession({
        patientId: selectedPatientId,
        scheduledAt: scheduledAt.toISOString(),
        durationMinutes: Number(duration) || 50,
      });

      navigation.navigate('SessionHub', {
        session,
        patientName: selectedPatient?.label,
      });
    } catch (error: any) {
      Alert.alert('Erro', error?.message ?? 'Não foi possível criar a sessão.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.label, { color: theme.foreground }]}>Paciente</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.patientList}>
          {patients.map((patient) => {
            const active = patient.id === selectedPatientId;
            return (
              <TouchableOpacity
                key={patient.id}
                style={[
                  styles.patientChip,
                  {
                    backgroundColor: active ? theme.primary : theme.background,
                    borderColor: active ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => setSelectedPatientId(patient.id)}
              >
                <Text style={[styles.patientChipText, { color: active ? '#fff' : theme.foreground }]}>{patient.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={[styles.label, { color: theme.foreground }]}>Data</Text>
        <TextInput
          style={[styles.input, { color: theme.foreground, backgroundColor: theme.background, borderColor: theme.border }]}
          value={date}
          onChangeText={setDate}
          placeholder="AAAA-MM-DD"
          placeholderTextColor={theme.mutedForeground}
        />

        <Text style={[styles.label, { color: theme.foreground }]}>Horário</Text>
        <TextInput
          style={[styles.input, { color: theme.foreground, backgroundColor: theme.background, borderColor: theme.border }]}
          value={time}
          onChangeText={setTime}
          placeholder="14:00"
          placeholderTextColor={theme.mutedForeground}
        />

        <Text style={[styles.label, { color: theme.foreground }]}>Duração (minutos)</Text>
        <TextInput
          style={[styles.input, { color: theme.foreground, backgroundColor: theme.background, borderColor: theme.border }]}
          value={duration}
          onChangeText={setDuration}
          keyboardType="number-pad"
          placeholder="50"
          placeholderTextColor={theme.mutedForeground}
        />

        <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Criar Sessão</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  patientList: {
    gap: 10,
    paddingBottom: 4,
  },
  patientChip: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  patientChipText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '600',
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
