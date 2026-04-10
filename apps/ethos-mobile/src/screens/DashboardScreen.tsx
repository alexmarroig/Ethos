import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  AlertTriangle,
  Banknote,
  Bell,
  Calendar,
  ChevronRight,
  FileText,
  Plus,
  Search,
} from 'lucide-react-native';

import { useAuth } from '../contexts/AuthContext';
import { colors } from '../theme/colors';
import { fetchDocuments } from '../services/api/documents';
import { fetchFinanceSummary } from '../services/api/finance';
import { fetchPatients } from '../services/api/patients';
import { fetchSessions } from '../services/api/sessions';
import type {
  ClinicalDocumentRecord,
  FinanceSummary,
  PatientRecord,
  SessionRecord,
} from '../services/api/types';

const primaryTeal = '#234e5c';
const accentTeal = '#00ccdb';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

const formatSessionTime = (value: string) =>
  new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((chunk) => chunk.charAt(0).toUpperCase())
    .join('');

const sortByDateAsc = <T extends { scheduled_at?: string; created_at?: string }>(items: T[]) =>
  [...items].sort((left, right) => {
    const leftTime = Date.parse(left.scheduled_at ?? left.created_at ?? '');
    const rightTime = Date.parse(right.scheduled_at ?? right.created_at ?? '');
    return leftTime - rightTime;
  });

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;

  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [documents, setDocuments] = useState<ClinicalDocumentRecord[]>([]);
  const [financeSummary, setFinanceSummary] = useState<FinanceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [patientsResult, sessionsResult, documentsResult, financeResult] = await Promise.allSettled([
        fetchPatients(),
        fetchSessions(),
        fetchDocuments(),
        fetchFinanceSummary(),
      ]);

      if (patientsResult.status === 'fulfilled') setPatients(patientsResult.value);
      else setPatients([]);

      if (sessionsResult.status === 'fulfilled') setSessions(sessionsResult.value);
      else setSessions([]);

      if (documentsResult.status === 'fulfilled') setDocuments(documentsResult.value);
      else setDocuments([]);

      if (financeResult.status === 'fulfilled') setFinanceSummary(financeResult.value);
      else setFinanceSummary(null);

      const failures = [patientsResult, sessionsResult, documentsResult, financeResult].filter(
        (result) => result.status === 'rejected',
      ) as PromiseRejectedResult[];

      if (failures.length > 0) {
        setError('Algumas informacoes nao puderam ser carregadas agora.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadDashboard();
    }, [loadDashboard]),
  );

  const patientsById = useMemo(() => {
    const map = new Map<string, PatientRecord>();
    for (const patient of patients) {
      map.set(patient.id, patient);
      map.set(patient.external_id, patient);
    }
    return map;
  }, [patients]);

  const nextSession = useMemo(() => {
    const now = Date.now();
    const activeSessions = sessions.filter((session) => ['scheduled', 'confirmed'].includes(session.status));
    const futureSessions = sortByDateAsc(
      activeSessions.filter((session) => Date.parse(session.scheduled_at) >= now),
    );
    return futureSessions[0] ?? sortByDateAsc(activeSessions)[0] ?? null;
  }, [sessions]);

  const pendingAmount = useMemo(
    () =>
      (financeSummary?.entries ?? [])
        .filter((entry) => entry.type === 'receivable' && entry.status !== 'paid')
        .reduce((sum, entry) => sum + entry.amount, 0),
    [financeSummary],
  );

  const nextPatient = nextSession ? patientsById.get(nextSession.patient_id) ?? null : null;
  const displayName = user?.name?.trim() || 'Profissional';
  const firstName = displayName.split(/\s+/)[0] ?? displayName;
  const initials = getInitials(displayName);

  const handleCreatePrimaryAction = () => {
    if (patients.length === 0) {
      navigation.navigate('CreatePatient');
      return;
    }
    navigation.navigate('CreateSession');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {user?.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: isDark ? '#23333a' : '#e8eeed' }]}>
              <Text style={[styles.avatarFallbackText, { color: primaryTeal }]}>{initials}</Text>
            </View>
          )}
          <View>
            <Text style={[styles.headerGreeting, { color: theme.mutedForeground }]}>Bem-vinda de volta</Text>
            <Text style={[styles.headerName, { color: theme.foreground }]}>Ola, {firstName}</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.headerIcon, { backgroundColor: isDark ? '#272b34' : '#edebe8' }]}
            onPress={() => navigation.navigate('Search')}
          >
            <Search size={22} color={theme.foreground} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerIcon, { backgroundColor: isDark ? '#272b34' : '#edebe8' }]}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Bell size={22} color={theme.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {isLoading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color={primaryTeal} />
            <Text style={[styles.stateText, { color: theme.mutedForeground }]}>Carregando painel clinico...</Text>
          </View>
        ) : (
          <>
            {error ? (
              <View style={[styles.inlineMessage, { backgroundColor: isDark ? '#2a2d31' : '#fff5f5', borderColor: theme.border }]}>
                <Text style={[styles.inlineMessageText, { color: theme.foreground }]}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.sectionHeader}>
              <AlertTriangle size={20} color={theme.primary} />
              <Text style={[styles.sectionTitle, { color: theme.foreground }]}>Visao rapida</Text>
            </View>

            <View style={styles.alertGrid}>
              <Animated.View entering={FadeInDown.delay(100).duration(350)} style={styles.alertCol}>
                <TouchableOpacity
                  style={[styles.alertCardSmall, { backgroundColor: isDark ? '#272b34' : '#fff', borderColor: theme.border }]}
                  onPress={() => navigation.navigate('Documents')}
                >
                  <View style={[styles.alertIconWrapper, { backgroundColor: '#eff6ff' }]}>
                    <FileText size={20} color="#2563eb" />
                  </View>
                  <Text style={[styles.alertTitleSmall, { color: primaryTeal }]}>Documentos</Text>
                  <Text style={[styles.alertValueText, { color: theme.foreground }]}>{documents.length}</Text>
                  <Text style={[styles.alertSubSmall, { color: theme.mutedForeground }]}>
                    {documents.length === 0 ? 'Nenhum documento cadastrado' : 'Abrir central de documentos'}
                  </Text>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(180).duration(350)} style={styles.alertCol}>
                <TouchableOpacity
                  style={[styles.alertCardSmall, { backgroundColor: isDark ? '#272b34' : '#fff', borderColor: theme.border }]}
                  onPress={() => navigation.navigate('Finance')}
                >
                  <View style={[styles.alertIconWrapper, { backgroundColor: '#fff7ed' }]}>
                    <Banknote size={20} color="#f97316" />
                  </View>
                  <Text style={[styles.alertTitleSmall, { color: primaryTeal }]}>Financeiro</Text>
                  <Text style={[styles.alertValueText, { color: theme.foreground }]}>{formatCurrency(pendingAmount)}</Text>
                  <Text style={[styles.alertSubSmall, { color: theme.mutedForeground }]}>
                    {financeSummary?.pending_sessions ?? 0} sessoes pendentes
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </View>

            <View style={styles.sectionHeader}>
              <Calendar size={20} color={theme.primary} />
              <Text style={[styles.sectionTitle, { color: theme.foreground }]}>Proxima sessao</Text>
              <TouchableOpacity style={{ marginLeft: 'auto' }} onPress={() => navigation.navigate('Schedule')}>
                <Text style={[styles.inlineLink, { color: theme.mutedForeground }]}>Ver agenda</Text>
              </TouchableOpacity>
            </View>

            <Animated.View entering={FadeInDown.delay(260).duration(350)}>
              {nextSession ? (
                <TouchableOpacity
                  style={[styles.highlightCard, { backgroundColor: isDark ? '#1e2d35' : '#fff', borderWidth: 1, borderColor: theme.border }]}
                  onPress={() =>
                    navigation.navigate('SessionHub', {
                      session: nextSession,
                      patientName: nextPatient?.label ?? 'Paciente',
                    })
                  }
                >
                  <View style={styles.highlightHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.timeLabel, { color: accentTeal }]}>{formatSessionTime(nextSession.scheduled_at)}</Text>
                      <Text style={[styles.highlightPatientName, { color: primaryTeal }]}>{nextPatient?.label ?? 'Paciente sem nome'}</Text>
                      <Text style={[styles.highlightSessionType, { color: theme.mutedForeground }]}>
                        Status: {nextSession.status}
                        {nextSession.duration_minutes ? ` • ${nextSession.duration_minutes} min` : ''}
                      </Text>
                    </View>
                    <View style={styles.ctaCircle}>
                      <ChevronRight size={20} color="#fff" />
                    </View>
                  </View>

                  <View style={styles.highlightDivider} />

                  <View style={styles.highlightFooter}>
                    <Text style={[styles.focoText, { color: theme.mutedForeground }]}>
                      Abrir sessao e seguir para o prontuario dessa paciente.
                    </Text>
                    <TouchableOpacity
                      style={styles.inlineCta}
                      onPress={() => {
                        if (nextPatient?.id) {
                          navigation.navigate('PatientDetail', { patientId: nextPatient.id });
                          return;
                        }
                        navigation.navigate('Patients');
                      }}
                    >
                      <Text style={[styles.inlineCtaText, { color: accentTeal }]}>Ver paciente</Text>
                      <ChevronRight size={16} color={accentTeal} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={[styles.emptyCard, { backgroundColor: isDark ? '#272b34' : '#fff', borderColor: theme.border }]}>
                  <Text style={[styles.emptyCardTitle, { color: primaryTeal }]}>Nenhuma sessao agendada ainda.</Text>
                  <Text style={[styles.emptyCardText, { color: theme.mutedForeground }]}>
                    {patients.length === 0
                      ? 'Comece cadastrando o primeiro paciente para a Camila usar o app de verdade.'
                      : 'A agenda ainda esta vazia. Crie a primeira sessao para iniciar o atendimento.'}
                  </Text>
                  <TouchableOpacity style={styles.primaryActionButton} onPress={handleCreatePrimaryAction}>
                    <Plus size={18} color="#fff" />
                    <Text style={styles.primaryActionButtonText}>
                      {patients.length === 0 ? 'Cadastrar paciente' : 'Agendar sessao'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(320).duration(350)}>
              <TouchableOpacity
                style={[styles.financeCardLarge, { backgroundColor: isDark ? '#272b34' : '#fff', borderColor: theme.border }]}
                onPress={() => navigation.navigate('Finance')}
              >
                <View style={styles.financeHeaderLarge}>
                  <View>
                    <Text style={[styles.financeLabelLarge, { color: theme.mutedForeground }]}>Visao financeira</Text>
                    <Text style={[styles.financeValueLarge, { color: primaryTeal }]}>
                      {formatCurrency(financeSummary?.total_per_month ?? 0)}
                    </Text>
                  </View>
                  <View style={styles.percentBadge}>
                    <Text style={styles.percentText}>{patients.length} pacientes</Text>
                  </View>
                </View>

                <View style={styles.progressContainer}>
                  <View style={styles.progressLabelRow}>
                    <Text style={[styles.progressLabel, { color: theme.mutedForeground }]}>
                      Recebido
                    </Text>
                    <Text style={[styles.progressPercent, { color: theme.foreground }]}>
                      {financeSummary?.paid_sessions ?? 0} sessoes
                    </Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: '100%', backgroundColor: accentTeal }]} />
                  </View>
                </View>

                <View style={styles.progressContainer}>
                  <View style={styles.progressLabelRow}>
                    <Text style={[styles.progressLabel, { color: theme.mutedForeground }]}>
                      Pendente
                    </Text>
                    <Text style={[styles.progressPercent, { color: theme.foreground }]}>
                      {financeSummary?.pending_sessions ?? 0} sessoes
                    </Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.max(
                            8,
                            Math.min(
                              100,
                              financeSummary?.total_per_month
                                ? (pendingAmount / Math.max(financeSummary.total_per_month, 1)) * 100
                                : 8,
                            ),
                          )}%`,
                          backgroundColor: '#ffae5d',
                        },
                      ]}
                    />
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          </>
        )}
      </ScrollView>
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
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarFallback: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarFallbackText: {
    fontSize: 18,
    fontFamily: 'Inter',
    fontWeight: '700',
  },
  headerGreeting: {
    fontSize: 12,
    fontFamily: 'Inter',
  },
  headerName: {
    fontSize: 20,
    fontFamily: 'Lora',
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 12,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 150,
  },
  stateCard: {
    marginTop: 36,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  stateText: {
    fontSize: 14,
    fontFamily: 'Inter',
    textAlign: 'center',
  },
  inlineMessage: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 10,
  },
  inlineMessageText: {
    fontSize: 14,
    fontFamily: 'Inter',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Lora',
    fontWeight: '700',
  },
  inlineLink: {
    fontSize: 14,
    fontFamily: 'Inter',
  },
  alertGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  alertCol: {
    flex: 1,
  },
  alertCardSmall: {
    padding: 20,
    borderRadius: 28,
    borderWidth: 1,
    minHeight: 170,
  },
  alertIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  alertTitleSmall: {
    fontSize: 16,
    fontFamily: 'Lora',
    fontWeight: '700',
    marginBottom: 8,
  },
  alertValueText: {
    fontSize: 24,
    fontFamily: 'Lora',
    fontWeight: '700',
    marginBottom: 6,
  },
  alertSubSmall: {
    fontSize: 12,
    fontFamily: 'Inter',
    lineHeight: 18,
  },
  highlightCard: {
    borderRadius: 28,
    padding: 24,
    marginBottom: 24,
  },
  highlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  timeLabel: {
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: '700',
    marginBottom: 4,
  },
  highlightPatientName: {
    fontSize: 22,
    fontFamily: 'Lora',
    fontWeight: '700',
    marginBottom: 6,
  },
  highlightSessionType: {
    fontSize: 14,
    fontFamily: 'Inter',
  },
  ctaCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: accentTeal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightDivider: {
    height: 1,
    backgroundColor: '#e8eeed',
    marginVertical: 20,
  },
  highlightFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  focoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter',
    lineHeight: 18,
  },
  inlineCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inlineCtaText: {
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: '700',
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 24,
    marginBottom: 24,
  },
  emptyCardTitle: {
    fontSize: 22,
    fontFamily: 'Lora',
    fontWeight: '700',
    marginBottom: 10,
  },
  emptyCardText: {
    fontSize: 14,
    fontFamily: 'Inter',
    lineHeight: 22,
    marginBottom: 20,
  },
  primaryActionButton: {
    height: 52,
    borderRadius: 18,
    backgroundColor: primaryTeal,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 18,
  },
  primaryActionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter',
    fontWeight: '700',
  },
  financeCardLarge: {
    padding: 24,
    borderRadius: 28,
    borderWidth: 1,
    marginBottom: 40,
  },
  financeHeaderLarge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    gap: 16,
  },
  financeLabelLarge: {
    fontSize: 13,
    fontFamily: 'Inter',
    marginBottom: 8,
  },
  financeValueLarge: {
    fontSize: 30,
    fontFamily: 'Lora',
    fontWeight: '700',
  },
  percentBadge: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  percentText: {
    color: '#16a34a',
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: '700',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 13,
    fontFamily: 'Inter',
  },
  progressPercent: {
    fontSize: 13,
    fontFamily: 'Inter',
    fontWeight: '700',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
});
