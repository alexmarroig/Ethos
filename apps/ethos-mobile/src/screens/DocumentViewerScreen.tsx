/**
 * DocumentViewerScreen — Visualizador de PDF nativo
 */
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { Download, Share2 } from 'lucide-react-native';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { colors } from '../theme/colors';
import { Printer, ZoomIn } from '../lib/lucideCompat';

// react-native-pdf is a native module. We try to import it but gracefully
// degrade when running in Expo Go / web environments.
let Pdf: any = null;
try {
  Pdf = require('react-native-pdf').default;
} catch {
  Pdf = null;
}

export default function DocumentViewerScreen({ route }: any) {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const title: string = route?.params?.title ?? 'Documento';
  const uri: string | undefined = route?.params?.uri;
  const htmlContent: string | undefined = route?.params?.htmlContent;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleShare = async () => {
    try {
      if (uri) {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri);
        } else {
          Alert.alert('Compartilhamento indisponivel', 'Este dispositivo nao suporta compartilhamento direto.');
        }
      }
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Nao foi possivel compartilhar.');
    }
  };

  const handlePrint = async () => {
    try {
      if (htmlContent) {
        await Print.printAsync({ html: htmlContent });
      } else if (uri) {
        await Print.printAsync({ uri });
      } else {
        Alert.alert('Impressao indisponivel', 'Conteudo nao disponivel para impressao.');
      }
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Nao foi possivel imprimir.');
    }
  };

  const renderContent = () => {
    if (!uri && !htmlContent) {
      return (
        <View style={styles.errorState}>
          <Text style={[styles.errorTitle, { color: theme.foreground }]}>Documento indisponivel</Text>
          <Text style={[styles.errorSubtitle, { color: theme.mutedForeground }]}>
            Nenhuma URL ou conteudo foi fornecido para este documento.
          </Text>
        </View>
      );
    }

    if (!Pdf) {
      // Fallback when react-native-pdf is not available (Expo Go, web)
      return (
        <View style={styles.fallbackState}>
          <ZoomIn size={48} color={theme.muted} />
          <Text style={[styles.fallbackTitle, { color: theme.foreground }]}>Visualizador nativo</Text>
          <Text style={[styles.fallbackText, { color: theme.mutedForeground }]}>
            O visualizador de PDF nativo requer um build de desenvolvimento.{'\n'}
            Para usar no Expo Go, instale expo-dev-client ou faça um build local.
          </Text>
          <TouchableOpacity
            style={[styles.fallbackBtn, { backgroundColor: theme.primary }]}
            onPress={handleShare}
          >
            <Share2 size={16} color="#fff" />
            <Text style={styles.fallbackBtnText}>Abrir externamente</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color={theme.primary} size="large" />
            <Text style={[styles.loadingText, { color: theme.mutedForeground }]}>Carregando PDF...</Text>
          </View>
        )}
        <Pdf
          source={{ uri: uri ?? '' }}
          style={[styles.pdf, { backgroundColor: theme.background }]}
          onLoadComplete={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
          enablePaging
          spacing={8}
        />
        {error && (
          <View style={styles.errorState}>
            <Text style={[styles.errorTitle, { color: theme.foreground }]}>Erro ao carregar</Text>
            <Text style={[styles.errorSubtitle, { color: theme.mutedForeground }]}>
              Nao foi possivel abrir este documento.
            </Text>
            <TouchableOpacity
              style={[styles.fallbackBtn, { backgroundColor: theme.primary }]}
              onPress={handleShare}
            >
              <Share2 size={16} color="#fff" />
              <Text style={styles.fallbackBtnText}>Tentar abrir externamente</Text>
            </TouchableOpacity>
          </View>
        )}
      </>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Toolbar */}
      <View style={[styles.toolbar, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <Text style={[styles.toolbarTitle, { color: theme.foreground }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.toolbarActions}>
          <TouchableOpacity style={styles.toolbarBtn} onPress={handleShare}>
            <Share2 size={20} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolbarBtn} onPress={handlePrint}>
            <Printer size={20} color={theme.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>{renderContent()}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  toolbarTitle: { fontFamily: 'Inter', fontSize: 15, fontWeight: '600', flex: 1 },
  toolbarActions: { flexDirection: 'row', gap: 4 },
  toolbarBtn: { padding: 10 },
  content: { flex: 1 },
  pdf: { flex: 1 },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    zIndex: 10,
  },
  loadingText: { fontFamily: 'Inter', fontSize: 14 },
  errorState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  errorTitle: { fontFamily: 'Lora', fontSize: 18, fontWeight: '600', textAlign: 'center' },
  errorSubtitle: { fontFamily: 'Inter', fontSize: 14, textAlign: 'center', lineHeight: 22 },
  fallbackState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  fallbackTitle: { fontFamily: 'Lora', fontSize: 18, fontWeight: '600' },
  fallbackText: { fontFamily: 'Inter', fontSize: 14, textAlign: 'center', lineHeight: 22 },
  fallbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  fallbackBtnText: { color: '#fff', fontFamily: 'Inter', fontSize: 15, fontWeight: '600' },
});
