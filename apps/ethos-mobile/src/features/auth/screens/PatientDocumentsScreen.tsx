import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { colors } from '../theme/colors';
import { fetchPatientDocuments } from '../services/api/patientPortal';
import type { ClinicalDocumentRecord } from '../services/api/types';

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

export default function PatientDocumentsScreen() {
  const navigation = useNavigation<any>();
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;

  const [documents, setDocuments] = useState<ClinicalDocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setDocuments(await fetchPatientDocuments());
    } catch (loadError: any) {
      setError(loadError?.message ?? 'Nao foi possivel carregar os documentos.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadDocuments();
    }, [loadDocuments]),
  );

  const orderedDocuments = useMemo(
    () => [...documents].sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at)),
    [documents],
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: theme.foreground }]}>Documentos</Text>

      {isLoading ? (
        <View style={styles.stateCard}>
          <ActivityIndicator color={theme.primary} />
          <Text style={[styles.stateText, { color: theme.mutedForeground }]}>Carregando documentos...</Text>
        </View>
      ) : error ? (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.foreground }]}>Nao foi possivel carregar.</Text>
          <Text style={[styles.bodyText, { color: theme.mutedForeground }]}>{error}</Text>
        </View>
      ) : orderedDocuments.length === 0 ? (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.foreground }]}>Nenhum documento disponivel.</Text>
          <Text style={[styles.bodyText, { color: theme.mutedForeground }]}>Quando um documento for liberado para voce, ele aparecera aqui.</Text>
        </View>
      ) : (
        orderedDocuments.map((document) => (
          <TouchableOpacity
            key={document.id}
            style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => navigation.navigate('PatientDocumentDetail', { documentId: document.id })}
          >
            <Text style={[styles.cardTitle, { color: theme.foreground }]}>{document.title}</Text>
            <Text style={[styles.bodyText, { color: theme.mutedForeground }]}>Tipo: {document.template_id}</Text>
            <Text style={[styles.bodyText, { color: theme.mutedForeground }]}>Data: {formatDate(document.created_at)}</Text>
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: theme.border }]}
              onPress={() => Alert.alert('Em breve', 'O download do documento sera conectado em uma proxima etapa.')}
            >
              <Text style={[styles.secondaryButtonText, { color: theme.primary }]}>Download</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 14,
    paddingBottom: 40,
  },
  title: {
    fontFamily: 'Lora',
    fontSize: 28,
    fontWeight: '700',
  },
  card: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    gap: 8,
  },
  cardTitle: {
    fontFamily: 'Lora',
    fontSize: 22,
    fontWeight: '700',
  },
  bodyText: {
    fontFamily: 'Inter',
    fontSize: 15,
    lineHeight: 22,
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 4,
  },
  secondaryButtonText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '700',
  },
  stateCard: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 12,
  },
  stateText: {
    fontFamily: 'Inter',
    fontSize: 14,
  },
});
