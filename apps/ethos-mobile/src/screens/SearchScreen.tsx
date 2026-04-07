// src/screens/SearchScreen.tsx
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, SafeAreaView, StatusBar, useColorScheme,
} from 'react-native';
import { ChevronLeft, Search, FileText, Users, Calendar } from 'lucide-react-native';
import { useTheme } from '../hooks/useTheme';

// ─── Mock data (same shape used by PatientsScreen and DocumentsScreen) ──────
const MOCK_PATIENTS = [
  { id: 'p1', name: 'Beatriz Mendonça', lastSession: 'Sessão #12' },
  { id: 'p2', name: 'João Silva', lastSession: 'Sessão #8' },
  { id: 'p3', name: 'Maria Antônia', lastSession: 'Sessão #3' },
  { id: 'p4', name: 'Carlos Mendes', lastSession: 'Sessão #5' },
  { id: 'p5', name: 'Roberto Santos', lastSession: 'Sessão #15' },
  { id: 'p6', name: 'Ana Paula', lastSession: 'Sessão #20' },
  { id: 'p7', name: 'Mariana Albuquerque', lastSession: 'Sessão #7' },
];

const MOCK_DOCUMENTS = [
  { id: 'd1', title: 'Prontuário - Mariana Albuquerque', patient: 'Mariana Albuquerque', status: 'assinado' as const, date: 'Hoje, 14:50', content: '' },
  { id: 'd2', title: 'Relatório Psicológico - João Silva', patient: 'João Silva', status: 'rascunho' as const, date: 'Ontem, 16:30', content: '' },
  { id: 'd3', title: 'Anamnese - Roberto Santos', patient: 'Roberto Santos', status: 'assinado' as const, date: '02 Mar, 10:00', content: '' },
  { id: 'd4', title: 'Evolução Clínica - Ana Paula', patient: 'Ana Paula', status: 'assinado' as const, date: '28 Fev, 15:20', content: '' },
];

const MOCK_SESSIONS = [
  { id: 's1', patientName: 'Beatriz Mendonça', time: 'Agora às 14:00', status: 'pending' },
  { id: 's2', patientName: 'Maria Antônia', time: '16:30 - 17:20', status: 'live' },
  { id: 's3', patientName: 'Carlos Mendes', time: '18:00 - 18:50', status: 'completed' },
];

// ─── Component ───────────────────────────────────────────────────────────────
export default function SearchScreen({ navigation }: any) {
  const isDark = useColorScheme() === 'dark';
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const timerRef = React.useRef<any>(null);

  const handleChange = useCallback((text: string) => {
    setQuery(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebounced(text), 300);
  }, []);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const q = debounced.toLowerCase().trim();

  const results = useMemo(() => {
    if (!q) return null;
    return {
      patients: MOCK_PATIENTS.filter((p) => p.name.toLowerCase().includes(q)),
      documents: MOCK_DOCUMENTS.filter((d) => d.title.toLowerCase().includes(q) || d.patient.toLowerCase().includes(q)),
      sessions: MOCK_SESSIONS.filter((s) => s.patientName.toLowerCase().includes(q)),
    };
  }, [q]);

  const hasResults = results && (results.patients.length + results.documents.length + results.sessions.length) > 0;
  const primaryTeal = '#234e5c';
  const bg = isDark ? '#15171a' : '#fcfcfb';

  const SectionHeader = ({ label }: { label: string }) => (
    <Text style={[styles.sectionHeader, { color: theme.mutedForeground }]}>{label}</Text>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={28} color={primaryTeal} />
        </TouchableOpacity>
        <View style={[styles.inputWrapper, { backgroundColor: isDark ? '#1e2126' : '#f0f4f3', borderColor: theme.border }]}>
          <Search size={18} color={theme.mutedForeground} />
          <TextInput
            autoFocus
            style={[styles.input, { color: theme.foreground }]}
            placeholder="Buscar pacientes, documentos, sessões..."
            placeholderTextColor={theme.mutedForeground}
            value={query}
            onChangeText={handleChange}
          />
        </View>
      </View>

      {/* Body */}
      {!q ? (
        <View style={styles.emptyState}>
          <Search size={48} color={theme.mutedForeground} style={{ opacity: 0.3 }} />
          <Text style={[styles.emptyText, { color: theme.mutedForeground }]}>
            Digite para buscar pacientes,{'\n'}documentos ou sessões
          </Text>
        </View>
      ) : !hasResults ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: theme.mutedForeground }]}>
            Nenhum resultado para "{debounced}"
          </Text>
        </View>
      ) : (
        <FlatList
          data={[]}
          renderItem={null}
          ListHeaderComponent={
            <>
              {results!.patients.length > 0 && (
                <>
                  <SectionHeader label="PACIENTES" />
                  {results!.patients.map((p) => (
                    <TouchableOpacity key={p.id} style={[styles.item, { borderColor: theme.border }]}
                      onPress={() => navigation.navigate('MainTabs', { screen: 'Patients' })}>
                      <Users size={18} color={primaryTeal} />
                      <View style={styles.itemText}>
                        <Text style={[styles.itemTitle, { color: theme.foreground }]}>{p.name}</Text>
                        <Text style={[styles.itemSub, { color: theme.mutedForeground }]}>{p.lastSession}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}
              {results!.documents.length > 0 && (
                <>
                  <SectionHeader label="DOCUMENTOS" />
                  {results!.documents.map((d) => (
                    <TouchableOpacity key={d.id} style={[styles.item, { borderColor: theme.border }]}
                      onPress={() => navigation.navigate('DocumentDetail', { document: d })}>
                      <FileText size={18} color={primaryTeal} />
                      <View style={styles.itemText}>
                        <Text style={[styles.itemTitle, { color: theme.foreground }]}>{d.title}</Text>
                        <Text style={[styles.itemSub, { color: theme.mutedForeground }]}>{d.date}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}
              {results!.sessions.length > 0 && (
                <>
                  <SectionHeader label="SESSÕES" />
                  {results!.sessions.map((s) => (
                    <TouchableOpacity key={s.id} style={[styles.item, { borderColor: theme.border }]}
                      onPress={() => navigation.navigate('SessionHub', { patientName: s.patientName, time: s.time, sessionId: s.id, status: s.status })}>
                      <Calendar size={18} color={primaryTeal} />
                      <View style={styles.itemText}>
                        <Text style={[styles.itemTitle, { color: theme.foreground }]}>{s.patientName}</Text>
                        <Text style={[styles.itemSub, { color: theme.mutedForeground }]}>{s.time}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, gap: 8 },
  backBtn: { padding: 4 },
  inputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, height: 48, gap: 10 },
  input: { flex: 1, fontSize: 16, fontFamily: 'Inter' },
  sectionHeader: { fontSize: 11, fontFamily: 'Inter', fontWeight: '700', letterSpacing: 1.5, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, gap: 14 },
  itemText: { flex: 1 },
  itemTitle: { fontSize: 15, fontFamily: 'Inter', fontWeight: '600' },
  itemSub: { fontSize: 13, fontFamily: 'Inter', marginTop: 2 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, paddingHorizontal: 40 },
  emptyText: { fontSize: 15, fontFamily: 'Inter', textAlign: 'center', lineHeight: 24 },
});
