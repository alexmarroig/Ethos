import React from 'react';
import {
  Alert,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { Download, FileText, Share2 } from 'lucide-react-native';
import { colors } from '../theme/colors';

export default function DocumentViewerScreen({ route }: any) {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const title: string = route?.params?.title ?? 'Documento';
  const uri: string | undefined = route?.params?.uri;
  const htmlContent: string | undefined = route?.params?.htmlContent;

  const openExternal = async () => {
    if (!uri) {
      Alert.alert('Documento indisponivel', 'Nenhuma URL foi fornecida para abrir este documento.');
      return;
    }
    await Linking.openURL(uri);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.toolbar, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <Text style={[styles.toolbarTitle, { color: theme.foreground }]} numberOfLines={1}>
          {title}
        </Text>
        {uri ? (
          <TouchableOpacity style={styles.toolbarBtn} onPress={openExternal}>
            <Download size={20} color={theme.primary} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.content}>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <FileText size={44} color={theme.primary} strokeWidth={1.6} />
          <Text style={[styles.title, { color: theme.foreground }]}>Visualizacao web</Text>
          <Text style={[styles.text, { color: theme.mutedForeground }]}>
            O visualizador nativo de PDF fica disponivel no app instalado. No navegador, abra o arquivo em uma nova aba.
          </Text>
          {htmlContent ? (
            <Text style={[styles.preview, { color: theme.mutedForeground }]} numberOfLines={5}>
              {htmlContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}
            </Text>
          ) : null}
          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: theme.primary }]} onPress={openExternal}>
            <Share2 size={16} color="#fff" />
            <Text style={styles.primaryButtonText}>Abrir documento</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  toolbarTitle: { fontFamily: 'Inter', fontSize: 15, fontWeight: '700', flex: 1 },
  toolbarBtn: { padding: 10 },
  content: { flex: 1, justifyContent: 'center', padding: 20 },
  card: { borderWidth: 1, borderRadius: 24, padding: 24, alignItems: 'center', gap: 12 },
  title: { fontFamily: 'Lora', fontSize: 22, fontWeight: '700', textAlign: 'center' },
  text: { fontFamily: 'Inter', fontSize: 14, lineHeight: 21, textAlign: 'center' },
  preview: { fontFamily: 'Inter', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 6 },
  primaryButton: {
    minHeight: 46,
    borderRadius: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  primaryButtonText: { color: '#fff', fontFamily: 'Inter', fontSize: 13, fontWeight: '800' },
});
