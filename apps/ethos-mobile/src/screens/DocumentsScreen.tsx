import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  CheckCircle,
  Clock,
  FileDown,
  FileText,
  Filter,
  Plus,
  Search,
} from 'lucide-react-native';

import { colors } from '../theme/colors';
import { fetchDocuments } from '../services/api/documents';
import { fetchPatients } from '../services/api/patients';
import type { ClinicalDocumentRecord, PatientRecord } from '../services/api/types';

const primaryTeal = '#234e5c';

const categories = ['Tudo', 'Notas Clínicas', 'Relatórios', 'Declarações', 'Atestados', 'Recibos', 'Contratos', 'Questionários'];

const categoryMap: Record<string, string> = {
  'Notas Clínicas': 'clinical_note',
  'Relatórios': 'report',
  'Declarações': 'declaration',
  'Atestados': 'certificate',
  'Recibos': 'receipt',
  'Contratos': 'contract',
  'Questionários': 'questionnaire',
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const getPatientName = (doc: ClinicalDocumentRecord, patients: PatientRecord[]) => {
  const patient = patients.find((p) => p.id === doc.patient_id);
  return patient ? patient.label : 'Paciente não identificado';
};

export default function DocumentsScreen() {
  const navigation = useNavigation<any>();
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;

  const [documents, setDocuments] = useState<ClinicalDocumentRecord[]>([]);
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('Tudo');
  const [searchQuery, setSearchQuery] = useState('');

  const loadDocuments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [docsData, patientsData] = await Promise.all([fetchDocuments(), fetchPatients()]);
      setDocuments(docsData);
      setPatients(patientsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar documentos');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDocuments();
    }, [loadDocuments])
  );

  const filteredDocuments = useMemo(() => {
    return documents.filter((document) => {
      const categoryType = categoryMap[filter];
      const matchesFilter = filter === 'Tudo' || document.type === categoryType;

      const normalizedQuery = searchQuery.toLowerCase().trim();
      if (!normalizedQuery) return matchesFilter;

      const patientName = getPatientName(document, patients).toLowerCase();
      const matchesSearch =
        document.title.toLowerCase().includes(normalizedQuery) ||
        patientName.includes(normalizedQuery);

      return matchesFilter && matchesSearch;
    });
  }, [documents, filter, patients, searchQuery]);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1a1d21' : '#f8f9fa' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View style={styles.header}>
        <View>
          <Text style={[styles.subtitle, { color: theme.mutedForeground }]}>Prontuários e Laudos</Text>
          <Text style={[styles.title, { color: primaryTeal }]}>Documentos</Text>
        </View>
        <TouchableOpacity
          style={[styles.headerIcon, { backgroundColor: isDark ? '#2a2d31' : '#fff' }]}
          onPress={() => navigation.navigate('CreateDocument')}
        >
          <Plus size={24} color={primaryTeal} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrapper}>
        <View style={[styles.searchBar, { backgroundColor: isDark ? '#2a2d31' : '#fff' }]}>
          <Search size={20} color={theme.mutedForeground} />
          <TextInput
            placeholder="Buscar documentos..."
            placeholderTextColor={theme.mutedForeground}
            style={[styles.searchInput, { color: primaryTeal }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={[styles.filterButton, { backgroundColor: isDark ? '#2a2d31' : '#fff' }]} onPress={loadDocuments}>
          <Filter size={20} color={primaryTeal} />
        </TouchableOpacity>
      </View>

      <View style={styles.chipsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              onPress={() => setFilter(category)}
              style={[
                styles.chip,
                filter === category && styles.activeChip,
                { backgroundColor: filter === category ? primaryTeal : (isDark ? '#2a2d31' : '#fff') },
              ]}
            >
              <Text style={[styles.chipText, { color: filter === category ? '#fff' : theme.mutedForeground }]}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.stateCard}>
          <ActivityIndicator color={primaryTeal} />
          <Text style={[styles.stateText, { color: theme.mutedForeground }]}>Carregando documentos...</Text>
        </View>
      ) : error ? (
        <View style={styles.stateCard}>
          <Text style={[styles.stateTitle, { color: theme.foreground }]}>Falha ao carregar os documentos.</Text>
          <Text style={[styles.stateText, { color: theme.mutedForeground }]}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredDocuments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={(
            <View style={styles.stateCard}>
              <Text style={[styles.stateTitle, { color: theme.foreground }]}>Nenhum documento nesta seleção.</Text>
              <Text style={[styles.stateText, { color: theme.mutedForeground }]}>Ajuste os filtros ou gere um novo documento.</Text>
            </View>
          )}
          renderItem={({ item, index }) => {
            const patientName = getPatientName(item, patients);
            const isNote = item.type === 'clinical_note';

            return (
              <Animated.View entering={FadeInDown.delay(index * 70).duration(400)}>
                <TouchableOpacity
                  style={[styles.docCard, { backgroundColor: isDark ? '#2a2d31' : '#fff' }]}
                  onPress={() => navigation.navigate('DocumentDetail', { documentId: item.id })}
                >
                  <View style={[styles.docIconWrapper, { backgroundColor: isNote ? 'rgba(35, 78, 92, 0.1)' : 'rgba(0, 204, 219, 0.1)' }]}>
                    <FileText size={24} color={isNote ? primaryTeal : '#00ccdb'} />
                  </View>

                  <View style={styles.docInfo}>
                    <Text style={[styles.docTitle, { color: primaryTeal }]} numberOfLines={1}>{item.title}</Text>
                    <Text style={[styles.patientText, { color: theme.mutedForeground }]} numberOfLines={1}>{patientName}</Text>
                    <View style={styles.docMeta}>
                      <View style={[styles.statusBadge, { backgroundColor: isNote ? '#f0fdf4' : '#eff6ff' }]}>
                        <Text style={[styles.statusText, { color: isNote ? '#16a34a' : '#2563eb' }]}>
                          {categories.find(c => categoryMap[c] === item.type) || 'Nota'}
                        </Text>
                      </View>
                      <Text style={[styles.docDate, { color: theme.mutedForeground }]}>{formatDate(item.created_at)}</Text>
                    </View>
                  </View>

                  <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.actionIcon}>
                      <FileDown size={20} color={theme.mutedForeground} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          }}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateDocument')}
      >
        <Plus size={32} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
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
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
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
  chipsContainer: {
    marginBottom: 16,
  },
  chipsScroll: {
    paddingHorizontal: 24,
    gap: 10,
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  activeChip: {
    shadowColor: primaryTeal,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  chipText: {
    fontSize: 13,
    fontFamily: 'Inter',
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 2,
  },
  docIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  docInfo: {
    flex: 1,
    marginLeft: 16,
  },
  docTitle: {
    fontSize: 16,
    fontFamily: 'Inter',
    fontWeight: '700',
    marginBottom: 4,
  },
  patientText: {
    fontSize: 13,
    fontFamily: 'Inter',
    marginBottom: 8,
  },
  docMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Inter',
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  docDate: {
    fontSize: 12,
    fontFamily: 'Inter',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 8,
  },
  actionIcon: {
    padding: 8,
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
    lineHeight: 20,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#234e5c',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#234e5c',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 15,
    elevation: 10,
  },
});
