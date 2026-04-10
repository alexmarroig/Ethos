import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { ChevronLeft, Search, FileText, Users, Calendar } from "lucide-react-native";

import { useTheme } from "../hooks/useTheme";
import { fetchDocuments } from "../services/api/documents";
import { fetchPatients } from "../services/api/patients";
import { fetchSessions } from "../services/api/sessions";
import type { ClinicalDocumentRecord, PatientRecord, SessionRecord } from "../services/api/types";

const formatSessionLabel = (session: SessionRecord) =>
  new Date(session.scheduled_at).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const formatDocumentLabel = (document: ClinicalDocumentRecord) =>
  new Date(document.created_at).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function SearchScreen({ navigation }: any) {
  const isDark = useColorScheme() === "dark";
  const theme = useTheme();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [documents, setDocuments] = useState<ClinicalDocumentRecord[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [patientsResult, documentsResult, sessionsResult] = await Promise.all([
        fetchPatients(),
        fetchDocuments(),
        fetchSessions(),
      ]);
      setPatients(patientsResult);
      setDocuments(documentsResult);
      setSessions(sessionsResult);
    } catch (loadError: any) {
      setError(loadError?.message ?? "Nao foi possivel carregar a busca.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleChange = useCallback((text: string) => {
    setQuery(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebounced(text), 250);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const q = debounced.toLowerCase().trim();

  const results = useMemo(() => {
    if (!q) return null;

    const patientResults = patients.filter((patient) =>
      [patient.label, patient.email, patient.whatsapp, patient.phone]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );

    const documentResults = documents.filter((document) =>
      [document.title, document.template_id].some((value) => value.toLowerCase().includes(q))
    );

    const sessionResults = sessions.filter((session) =>
      [session.status, session.patient_id].some((value) => value.toLowerCase().includes(q))
    );

    return {
      patients: patientResults,
      documents: documentResults,
      sessions: sessionResults,
    };
  }, [documents, patients, q, sessions]);

  const hasResults =
    results && results.patients.length + results.documents.length + results.sessions.length > 0;
  const primaryTeal = "#234e5c";
  const bg = isDark ? "#15171a" : "#fcfcfb";

  const SectionHeader = ({ label }: { label: string }) => (
    <Text style={[styles.sectionHeader, { color: theme.mutedForeground }]}>{label}</Text>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={28} color={primaryTeal} />
        </TouchableOpacity>
        <View
          style={[
            styles.inputWrapper,
            { backgroundColor: isDark ? "#1e2126" : "#f0f4f3", borderColor: theme.border },
          ]}
        >
          <Search size={18} color={theme.mutedForeground} />
          <TextInput
            autoFocus
            style={[styles.input, { color: theme.foreground }]}
            placeholder="Buscar pacientes, documentos ou sessoes..."
            placeholderTextColor={theme.mutedForeground}
            value={query}
            onChangeText={handleChange}
          />
        </View>
      </View>

      {isLoading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator color={primaryTeal} />
          <Text style={[styles.emptyText, { color: theme.mutedForeground }]}>
            Carregando dados para busca...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: theme.mutedForeground }]}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : !q ? (
        <View style={styles.emptyState}>
          <Search size={48} color={theme.mutedForeground} style={{ opacity: 0.3 }} />
          <Text style={[styles.emptyText, { color: theme.mutedForeground }]}>
            Digite para buscar pacientes, documentos ou sessoes
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
              {results!.patients.length > 0 ? (
                <>
                  <SectionHeader label="PACIENTES" />
                  {results!.patients.map((patient) => (
                    <TouchableOpacity
                      key={patient.id}
                      style={[styles.item, { borderColor: theme.border }]}
                      onPress={() => navigation.navigate("PatientDetail", { patientId: patient.id })}
                    >
                      <Users size={18} color={primaryTeal} />
                      <View style={styles.itemText}>
                        <Text style={[styles.itemTitle, { color: theme.foreground }]}>{patient.label}</Text>
                        <Text style={[styles.itemSub, { color: theme.mutedForeground }]}>
                          {patient.whatsapp || patient.email || "Sem contato principal"}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              ) : null}

              {results!.documents.length > 0 ? (
                <>
                  <SectionHeader label="DOCUMENTOS" />
                  {results!.documents.map((document) => (
                    <TouchableOpacity
                      key={document.id}
                      style={[styles.item, { borderColor: theme.border }]}
                      onPress={() => navigation.navigate("DocumentDetail", { documentId: document.id })}
                    >
                      <FileText size={18} color={primaryTeal} />
                      <View style={styles.itemText}>
                        <Text style={[styles.itemTitle, { color: theme.foreground }]}>{document.title}</Text>
                        <Text style={[styles.itemSub, { color: theme.mutedForeground }]}>
                          {formatDocumentLabel(document)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              ) : null}

              {results!.sessions.length > 0 ? (
                <>
                  <SectionHeader label="SESSOES" />
                  {results!.sessions.map((session) => (
                    <TouchableOpacity
                      key={session.id}
                      style={[styles.item, { borderColor: theme.border }]}
                      onPress={() =>
                        navigation.navigate("SessionHub", {
                          session,
                          patientName: session.patient_id,
                        })
                      }
                    >
                      <Calendar size={18} color={primaryTeal} />
                      <View style={styles.itemText}>
                        <Text style={[styles.itemTitle, { color: theme.foreground }]}>
                          Sessao {session.status}
                        </Text>
                        <Text style={[styles.itemSub, { color: theme.mutedForeground }]}>
                          {formatSessionLabel(session)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              ) : null}
            </>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  backBtn: { padding: 4 },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
  },
  input: { flex: 1, fontSize: 16, fontFamily: "Inter" },
  sectionHeader: {
    fontSize: 11,
    fontFamily: "Inter",
    fontWeight: "700",
    letterSpacing: 1.5,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 14,
  },
  itemText: { flex: 1 },
  itemTitle: { fontSize: 15, fontFamily: "Inter", fontWeight: "600" },
  itemSub: { fontSize: 13, fontFamily: "Inter", marginTop: 2 },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 40,
  },
  emptyText: { fontSize: 15, fontFamily: "Inter", textAlign: "center", lineHeight: 24 },
  retryButton: {
    backgroundColor: "#234e5c",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
  },
  retryButtonText: {
    color: "#fff",
    fontFamily: "Inter",
    fontWeight: "700",
  },
});
