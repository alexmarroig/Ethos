import React, { useEffect, useState } from 'react';
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
import { Download, FileText, Share2 } from 'lucide-react-native';

import { colors } from '../theme/colors';
import { fetchDocumentDetail } from '../services/api/documents';
import type { DocumentDetailResponse } from '../services/api/types';

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function DocumentDetailScreen({ route }: any) {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const documentId = route.params?.documentId as string;

  const [detail, setDetail] = useState<DocumentDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadDocument = async () => {
      try {
        const response = await fetchDocumentDetail(documentId);
        if (active) {
          setDetail(response);
        }
      } catch (error: any) {
        if (active) {
          Alert.alert('Erro', error?.message ?? 'Nao foi possivel carregar o documento.');
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadDocument();

    return () => {
      active = false;
    };
  }, [documentId]);

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (!detail) {
    return (
      <View
        style={[
          styles.centered,
          { backgroundColor: theme.background, padding: 24 },
        ]}
      >
        <Text style={[styles.emptyTitle, { color: theme.foreground }]}>
          Documento indisponivel.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
    >
      <View
        style={[
          styles.heroCard,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <View style={styles.iconRow}>
          <View style={[styles.iconBox, { backgroundColor: theme.background }]}>
            <FileText size={24} color={theme.primary} />
          </View>
          <Text style={[styles.heroTitle, { color: theme.foreground }]}>
            {detail.document.title}
          </Text>
        </View>

        <Text style={[styles.metaText, { color: theme.mutedForeground }]}>
          Paciente: {detail.patient?.label ?? 'Nao informado'}
        </Text>
        <Text style={[styles.metaText, { color: theme.mutedForeground }]}>
          Criado em {formatDateTime(detail.document.created_at)}
        </Text>
        <Text style={[styles.metaText, { color: theme.mutedForeground }]}>
          Template: {detail.document.template_id}
        </Text>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.primaryAction}
            onPress={() =>
              Alert.alert(
                'Em breve',
                'Acao de download preparada para integracao real.',
              )
            }
          >
            <Download size={16} color="#fff" />
            <Text style={styles.primaryActionText}>Download</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryAction, { borderColor: theme.border }]}
            onPress={() =>
              Alert.alert(
                'Em breve',
                'Compartilhamento sera conectado na proxima etapa.',
              )
            }
          >
            <Share2 size={16} color={theme.primary} />
            <Text style={[styles.secondaryActionText, { color: theme.primary }]}>
              Compartilhar
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.foreground }]}>
          Versoes
        </Text>
        {detail.versions.length === 0 ? (
          <View
            style={[
              styles.versionCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.versionText, { color: theme.mutedForeground }]}>
              Nenhuma versao registrada ainda.
            </Text>
          </View>
        ) : (
          detail.versions.map((version) => (
            <View
              key={version.id}
              style={[
                styles.versionCard,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.versionTitle, { color: theme.foreground }]}>
                Versao {version.version}
              </Text>
              <Text style={[styles.versionMeta, { color: theme.mutedForeground }]}>
                {formatDateTime(version.created_at)}
              </Text>
              <Text
                style={[styles.versionPreview, { color: theme.foreground }]}
                numberOfLines={4}
              >
                {version.content || 'Sem conteudo disponivel.'}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 26,
    padding: 20,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    flex: 1,
    fontFamily: 'Lora',
    fontSize: 24,
    fontWeight: '700',
  },
  metaText: {
    fontFamily: 'Inter',
    fontSize: 14,
    marginBottom: 6,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#234e5c',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
  },
  primaryActionText: {
    color: '#fff',
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
  },
  secondaryActionText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '700',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontFamily: 'Lora',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  versionCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  versionTitle: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '700',
  },
  versionMeta: {
    fontFamily: 'Inter',
    fontSize: 12,
    marginTop: 4,
  },
  versionPreview: {
    fontFamily: 'Inter',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
  versionText: {
    fontFamily: 'Inter',
    fontSize: 14,
  },
  emptyTitle: {
    fontFamily: 'Lora',
    fontSize: 24,
    fontWeight: '700',
  },
});
