import React, { useEffect, useMemo, useState } from 'react';
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

import { colors } from '../theme/colors';
import { fetchPatientDocumentDetail } from '../services/api/patientPortal';
import type { DocumentDetailResponse } from '../services/api/types';

const formatDate = (value: string) =>
  new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function PatientDocumentDetailScreen({ route }: any) {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const documentId = route.params?.documentId as string;

  const [detail, setDetail] = useState<DocumentDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadDetail = async () => {
      try {
        const response = await fetchPatientDocumentDetail(documentId);
        if (active) setDetail(response);
      } catch (error: any) {
        if (active) {
          Alert.alert('Erro', error?.message ?? 'Nao foi possivel carregar o documento.');
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void loadDetail();

    return () => {
      active = false;
    };
  }, [documentId]);

  const latestVersion = useMemo(
    () => [...(detail?.versions ?? [])].sort((left, right) => right.version - left.version)[0] ?? null,
    [detail?.versions],
  );

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Text style={[styles.title, { color: theme.foreground }]}>Documento indisponivel.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.foreground }]}>{detail.document.title}</Text>
        <Text style={[styles.meta, { color: theme.mutedForeground }]}>Tipo: {detail.document.template_id}</Text>
        <Text style={[styles.meta, { color: theme.mutedForeground }]}>Disponibilizado em {formatDate(detail.document.created_at)}</Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => Alert.alert('Em breve', 'O download do documento sera conectado em uma proxima etapa.')}
        >
          <Text style={styles.primaryButtonText}>Download</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.foreground }]}>Conteudo</Text>
        <Text style={[styles.bodyText, { color: theme.mutedForeground }]}>
          {latestVersion?.content || 'Sem conteudo textual disponivel neste momento.'}
        </Text>
      </View>
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    gap: 10,
  },
  title: {
    fontFamily: 'Lora',
    fontSize: 26,
    fontWeight: '700',
  },
  meta: {
    fontFamily: 'Inter',
    fontSize: 14,
    lineHeight: 20,
  },
  sectionTitle: {
    fontFamily: 'Lora',
    fontSize: 20,
    fontWeight: '700',
  },
  bodyText: {
    fontFamily: 'Inter',
    fontSize: 15,
    lineHeight: 24,
  },
  primaryButton: {
    backgroundColor: '#234e5c',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonText: {
    color: '#fff',
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '700',
  },
});
