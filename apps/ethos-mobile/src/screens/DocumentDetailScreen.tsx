// src/screens/DocumentDetailScreen.tsx
import React from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, StatusBar, useColorScheme, Alert,
} from 'react-native';
import { ChevronLeft, FileText, Download } from 'lucide-react-native';
import { useTheme } from '../shared/hooks/useTheme';
import type { DocumentItem } from '../contexts/NotificationsContext';

export default function DocumentDetailScreen({ navigation, route }: any) {
  const document: DocumentItem = route.params?.document;
  const isDark = useColorScheme() === 'dark';
  const theme = useTheme();
  const primaryTeal = '#234e5c';

  if (!document) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#15171a' : '#fcfcfb' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={28} color={primaryTeal} />
        </TouchableOpacity>
        <View style={styles.empty}>
          <Text style={{ color: theme.mutedForeground }}>Documento não encontrado</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isRascunho = document.status === 'rascunho';
  const statusColor = isRascunho ? '#f97316' : '#22c55e';
  const statusLabel = isRascunho ? 'RASCUNHO' : 'ASSINADO';

  // Parse content into sections if it contains "##" headers; otherwise treat as plain text
  const sections = document.content?.includes('##')
    ? document.content.split(/^##\s+/m).filter(Boolean).map((block) => {
        const [heading, ...rest] = block.split('\n');
        return { heading: heading.trim(), body: rest.join('\n').trim() };
      })
    : [{ heading: 'Conteúdo', body: document.content ?? 'Sem conteúdo disponível.' }];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#15171a' : '#fcfcfb' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={28} color={primaryTeal} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: primaryTeal }]} numberOfLines={1}>{document.title}</Text>
          <Text style={[styles.headerSub, { color: theme.mutedForeground }]}>{document.patient} · {document.date}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: `${statusColor}20` }]}>
          <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      {/* Body */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.iconRow]}>
          <FileText size={32} color={primaryTeal} />
        </View>

        {sections.map((s, i) => (
          <View key={i} style={[styles.section, { borderColor: theme.border }]}>
            <Text style={[styles.sectionHeading, { color: primaryTeal }]}>{s.heading}</Text>
            <Text style={[styles.sectionBody, { color: theme.foreground }]}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Footer actions */}
      <View style={[styles.footer, { borderColor: theme.border, backgroundColor: isDark ? '#15171a' : '#fcfcfb' }]}>
        {isRascunho && (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: primaryTeal }]}
            onPress={() => Alert.alert('Assinatura digital em breve')}
          >
            <Text style={styles.primaryBtnText}>Assinar</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.secondaryBtn, { borderColor: theme.border }]}
          onPress={() => Alert.alert('Exportação em breve')}
        >
          <Download size={18} color={primaryTeal} />
          <Text style={[styles.secondaryBtnText, { color: primaryTeal }]}>Exportar PDF</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: { padding: 4 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 16, fontFamily: 'Inter', fontWeight: '700' },
  headerSub: { fontSize: 12, fontFamily: 'Inter', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontFamily: 'Inter', fontWeight: '700' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },
  iconRow: { alignItems: 'center', paddingVertical: 24 },
  section: { borderWidth: 1, borderRadius: 16, padding: 20, marginBottom: 16 },
  sectionHeading: { fontSize: 14, fontFamily: 'Inter', fontWeight: '700', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 },
  sectionBody: { fontSize: 15, fontFamily: 'Inter', lineHeight: 24 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, borderTopWidth: 1, gap: 12 },
  primaryBtn: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Inter', fontWeight: '700' },
  secondaryBtn: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1, flexDirection: 'row', gap: 8 },
  secondaryBtnText: { fontSize: 16, fontFamily: 'Inter', fontWeight: '600' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
