import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronRight, FileText, Filter, Search, UserPlus } from 'lucide-react-native';

import { colors } from '../theme/colors';
import { fetchPatients } from '../services/api/patients';
import type { PatientRecord } from '../services/api/types';

const primaryTeal = '#234e5c';
const accentTeal = '#439299';

const formatLastSessionLabel = (patient: PatientRecord) => {
  const createdAt = new Date(patient.created_at);
  return createdAt.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export default function PatientsScreen() {
  const navigation = useNavigation<any>();
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;

  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPatients = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetchPatients();
      setPatients(response);
    } catch (loadError: any) {
      setError(loadError?.message ?? 'NÃ£o foi possÃ­vel carregar os pacientes.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadPatients();
    }, [loadPatients]),
  );

  const filteredPatients = useMemo(
    () =>
      patients
        .filter((patient) => {
          const normalizedQuery = searchQuery.trim().toLowerCase();
          if (!normalizedQuery) return true;
          return (
            patient.label.toLowerCase().includes(normalizedQuery) ||
            patient.email?.toLowerCase().includes(normalizedQuery) ||
            patient.phone?.toLowerCase().includes(normalizedQuery)
          );
        })
        .sort((left, right) => left.label.localeCompare(right.label)),
    [patients, searchQuery],
  );

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1a1d21' : '#f8f9fa' }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.subtitle, { color: theme.mutedForeground }]}>Meus Pacientes</Text>
          <Text style={[styles.title, { color: primaryTeal }]}>Base ClÃ­nica</Text>
        </View>
        <TouchableOpacity style={[styles.addButton, { backgroundColor: primaryTeal }]} onPress={() => navigation.navigate('CreatePatient')}>
          <UserPlus size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrapper}>
        <View style={[styles.searchBar, { backgroundColor: isDark ? '#2a2d31' : '#fff' }]}>
          <Search size={20} color={theme.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: primaryTeal }]}
            placeholder="Buscar por nome, e-mail ou telefone..."
            placeholderTextColor={theme.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={[styles.filterButton, { backgroundColor: isDark ? '#2a2d31' : '#fff' }]} onPress={loadPatients}>
          <Filter size={20} color={primaryTeal} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.listHeader}>
          <Text style={[styles.listSubtitle, { color: theme.mutedForeground }]}>
            {filteredPatients.length} pacientes encontrados
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color={primaryTeal} />
            <Text style={[styles.stateText, { color: theme.mutedForeground }]}>Carregando pacientes...</Text>
          </View>
        ) : error ? (
          <View style={styles.stateCard}>
            <Text style={[styles.stateTitle, { color: theme.foreground }]}>Falha ao carregar a lista.</Text>
            <Text style={[styles.stateText, { color: theme.mutedForeground }]}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadPatients}>
              <Text style={styles.retryButtonText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : filteredPatients.length === 0 ? (
          <View style={styles.stateCard}>
            <Text style={[styles.stateTitle, { color: theme.foreground }]}>Nenhum paciente encontrado.</Text>
            <Text style={[styles.stateText, { color: theme.mutedForeground }]}>
              Cadastre um paciente para comeÃ§ar a usar a base clÃ­nica.
            </Text>
          </View>
        ) : (
          filteredPatients.map((patient, index) => (
            <Animated.View
              key={patient.id}
              entering={FadeInDown.delay(index * 40).duration(350)}
            >
              <TouchableOpacity
                style={[styles.patientCard, { backgroundColor: isDark ? '#2a2d31' : '#fff' }]}
                onPress={() => navigation.navigate('PatientDetail', { patientId: patient.id })}
              >
                <View style={[styles.avatar, { backgroundColor: 'rgba(67, 146, 153, 0.1)' }]}>
                  <Text style={[styles.avatarText, { color: accentTeal }]}>
                    {patient.label.charAt(0)}
                  </Text>
                </View>

                <View style={styles.patientInfo}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.patientName, { color: primaryTeal }]}>{patient.label}</Text>
                    <View style={styles.onlineIndicator} />
                  </View>
                  <View style={styles.detailRow}>
                    <FileText size={14} color={theme.mutedForeground} />
                    <Text style={[styles.patientDetail, { color: theme.mutedForeground }]}>
                      Atualizado em {formatLastSessionLabel(patient)}
                    </Text>
                  </View>
                  {patient.phone ? (
                    <Text style={[styles.contactText, { color: theme.mutedForeground }]}>{patient.phone}</Text>
                  ) : null}
                </View>

                <View style={styles.cardActions}>
                  <ChevronRight size={20} color={theme.mutedForeground} />
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))
        )}
      </ScrollView>

      {!isLoading && filteredPatients.length > 0 ? (
        <View style={styles.alphaIndex}>
          {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((char) => (
            <Text key={char} style={[styles.indexChar, { color: accentTeal }]}>{char}</Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter',
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Lora',
    fontWeight: '700',
  },
  addButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: primaryTeal,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 5,
  },
  searchWrapper: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 20,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 26,
    paddingHorizontal: 20,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter',
  },
  filterButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
  },
  listContainer: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  listHeader: {
    marginBottom: 16,
  },
  listSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter',
    fontWeight: '600',
  },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 24,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 22,
    fontFamily: 'Lora',
    fontWeight: '700',
  },
  patientInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  patientName: {
    fontSize: 18,
    fontFamily: 'Lora',
    fontWeight: '700',
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  patientDetail: {
    fontSize: 13,
    fontFamily: 'Inter',
  },
  contactText: {
    fontFamily: 'Inter',
    fontSize: 12,
    marginTop: 4,
  },
  cardActions: {
    marginLeft: 8,
  },
  stateCard: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  stateTitle: {
    fontFamily: 'Lora',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  stateText: {
    fontFamily: 'Inter',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 8,
    backgroundColor: primaryTeal,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
  },
  retryButtonText: {
    color: '#fff',
    fontFamily: 'Inter',
    fontWeight: '700',
  },
  alphaIndex: {
    position: 'absolute',
    right: 8,
    top: 250,
    alignItems: 'center',
    gap: 12,
  },
  indexChar: {
    fontSize: 11,
    fontFamily: 'Inter',
    fontWeight: '800',
  },
});
