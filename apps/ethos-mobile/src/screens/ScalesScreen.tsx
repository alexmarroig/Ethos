/**
 * ScalesScreen — Aplicar escalas clínicas por paciente
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { ChevronRight, History, X } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { clinicalApiClient } from '../services/api/clinicalClient';

// ─── Types ────────────────────────────────────────────────────────────────────
type Scale = {
  id: string;
  name: string;
  abbreviation: string;
  description: string;
  approach: string;
  min_score: number;
  max_score: number;
  interpretation?: Record<string, string>;
};

type ScaleRecord = {
  id: string;
  scale_id: string;
  scale_name: string;
  patient_id: string;
  patient_name: string;
  score: number;
  applied_at: string;
};

// ─── Hardcoded scales (fallback if API not available) ─────────────────────────
const BUILT_IN_SCALES: Scale[] = [
  { id: 'phq9', name: 'PHQ-9', abbreviation: 'PHQ-9', description: 'Escala de depressao de 9 itens (Patient Health Questionnaire)', approach: 'TCC', min_score: 0, max_score: 27, interpretation: { '0-4': 'Minima', '5-9': 'Leve', '10-14': 'Moderada', '15-19': 'Moderada a grave', '20-27': 'Grave' } },
  { id: 'gad7', name: 'GAD-7', abbreviation: 'GAD-7', description: 'Escala de ansiedade generalizada de 7 itens', approach: 'TCC', min_score: 0, max_score: 21, interpretation: { '0-4': 'Minima', '5-9': 'Leve', '10-14': 'Moderada', '15-21': 'Grave' } },
  { id: 'bdi2', name: 'BDI-II', abbreviation: 'BDI-II', description: 'Inventario de depressao de Beck - Segunda edicao', approach: 'TCC', min_score: 0, max_score: 63, interpretation: { '0-13': 'Minima', '14-19': 'Leve', '20-28': 'Moderada', '29-63': 'Grave' } },
  { id: 'bai', name: 'BAI', abbreviation: 'BAI', description: 'Inventario de ansiedade de Beck', approach: 'TCC', min_score: 0, max_score: 63, interpretation: { '0-10': 'Minima', '11-19': 'Leve', '20-30': 'Moderada', '31-63': 'Grave' } },
  { id: 'ders', name: 'DERS', abbreviation: 'DERS', description: 'Dificuldades na regulacao emocional', approach: 'DBT', min_score: 36, max_score: 180 },
  { id: 'bsl23', name: 'BSL-23', abbreviation: 'BSL-23', description: 'Lista de sintomas de borderline', approach: 'DBT', min_score: 0, max_score: 92 },
  { id: 'aaqii', name: 'AAQ-II', abbreviation: 'AAQ-II', description: 'Questionario de aceitacao e acao', approach: 'ACT', min_score: 7, max_score: 49 },
  { id: 'cfq', name: 'CFQ', abbreviation: 'CFQ', description: 'Questionario de fusao cognitiva', approach: 'ACT', min_score: 7, max_score: 49 },
];

const APPROACHES = ['Todos', 'TCC', 'DBT', 'ACT', 'Psicanalise', 'Humanista'];

// ─── Apply Scale Modal ────────────────────────────────────────────────────────
function ApplyScaleModal({
  scale,
  patientId,
  patientName,
  onClose,
  onSaved,
  theme,
}: {
  scale: Scale;
  patientId?: string;
  patientName?: string;
  onClose: () => void;
  onSaved: () => void;
  theme: typeof colors.light;
}) {
  const [score, setScore] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const num = Number(score);
    if (!score || isNaN(num)) {
      Alert.alert('Pontuacao invalida', 'Informe a pontuacao numerica.');
      return;
    }
    if (num < scale.min_score || num > scale.max_score) {
      Alert.alert('Pontuacao fora do intervalo', `A pontuacao deve ser entre ${scale.min_score} e ${scale.max_score}.`);
      return;
    }

    setSaving(true);
    try {
      await clinicalApiClient.request('/scales/records', {
        method: 'POST',
        body: {
          scale_id: scale.id,
          patient_id: patientId,
          score: num,
          applied_at: new Date().toISOString(),
        },
      });
      onSaved();
    } catch (err: any) {
      Alert.alert('Erro ao salvar', err?.message ?? 'Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const getInterpretation = (): string => {
    if (!scale.interpretation) return '';
    const num = Number(score);
    for (const [range, label] of Object.entries(scale.interpretation)) {
      const [min, max] = range.split('-').map(Number);
      if (num >= min && num <= max) return label;
    }
    return '';
  };

  const interpretation = score ? getInterpretation() : '';

  return (
    <View style={styles.applyModal}>
      <View style={styles.applyModalHandle} />
      <View style={styles.applyModalHeader}>
        <View>
          <Text style={[styles.applyModalTitle, { color: theme.foreground }]}>{scale.name}</Text>
          {patientName && (
            <Text style={[styles.applyModalPatient, { color: theme.mutedForeground }]}>
              Paciente: {patientName}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={onClose}>
          <X size={20} color={theme.mutedForeground} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.applyModalDesc, { color: theme.mutedForeground }]}>{scale.description}</Text>

      <Text style={[styles.applyInputLabel, { color: theme.foreground }]}>
        Pontuacao ({scale.min_score} – {scale.max_score})
      </Text>
      <TextInput
        style={[styles.applyInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.foreground }]}
        keyboardType="numeric"
        value={score}
        onChangeText={setScore}
        placeholder={`Ex.: ${Math.floor((scale.min_score + scale.max_score) / 2)}`}
        placeholderTextColor={theme.mutedForeground}
      />

      {interpretation ? (
        <View style={[styles.interpretationBadge, { backgroundColor: `${theme.accent}20` }]}>
          <Text style={[styles.interpretationText, { color: theme.accent }]}>
            Classificacao: {interpretation}
          </Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.applyBtn, { backgroundColor: theme.primary, opacity: saving ? 0.7 : 1 }]}
        onPress={() => void handleSave()}
        disabled={saving}
      >
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.applyBtnText}>Registrar Aplicacao</Text>}
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ScalesScreen({ navigation, route }: any) {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const patientId: string | undefined = route?.params?.patientId;
  const patientName: string | undefined = route?.params?.patientName;

  const [scales, setScales] = useState<Scale[]>(BUILT_IN_SCALES);
  const [recentRecords, setRecentRecords] = useState<ScaleRecord[]>([]);
  const [selectedApproach, setSelectedApproach] = useState('Todos');
  const [selectedScale, setSelectedScale] = useState<Scale | null>(null);
  const [loading, setLoading] = useState(false);

  const loadRecords = useCallback(async () => {
    try {
      const path = patientId ? `/scales/records?patient_id=${patientId}` : '/scales/records';
      const res = await clinicalApiClient.request<any>(path, { method: 'GET' });
      const data = Array.isArray(res) ? res : res?.data ?? [];
      setRecentRecords(data.slice(0, 20));
    } catch {
      setRecentRecords([]);
    }
  }, [patientId]);

  const loadScales = useCallback(async () => {
    setLoading(true);
    try {
      const res = await clinicalApiClient.request<any>('/scales', { method: 'GET' });
      const data = Array.isArray(res) ? res : res?.data ?? [];
      if (data.length > 0) setScales(data);
    } catch {
      // Use built-in scales as fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadScales();
    void loadRecords();
  }, [loadScales, loadRecords]);

  const filteredScales = selectedApproach === 'Todos'
    ? scales
    : scales.filter((s) => s.approach === selectedApproach);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Approach filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {APPROACHES.map((ap) => (
            <TouchableOpacity
              key={ap}
              style={[
                styles.chip,
                {
                  backgroundColor: selectedApproach === ap ? theme.primary : theme.secondary,
                  borderColor: selectedApproach === ap ? theme.primary : theme.border,
                },
              ]}
              onPress={() => setSelectedApproach(ap)}
            >
              <Text style={[styles.chipText, { color: selectedApproach === ap ? '#fff' : theme.foreground }]}>
                {ap}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Scales list */}
        <Text style={[styles.sectionTitle, { color: theme.mutedForeground }]}>ESCALAS DISPONIVEIS</Text>
        {loading ? (
          <ActivityIndicator color={theme.primary} style={{ margin: 24 }} />
        ) : (
          filteredScales.map((scale) => (
            <TouchableOpacity
              key={scale.id}
              style={[styles.scaleCard, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => setSelectedScale(scale)}
              activeOpacity={0.85}
            >
              <View style={styles.scaleCardLeft}>
                <View style={[styles.scaleAbbrevBadge, { backgroundColor: `${theme.primary}20` }]}>
                  <Text style={[styles.scaleAbbrevText, { color: theme.primary }]}>{scale.abbreviation}</Text>
                </View>
                <View style={styles.scaleCardInfo}>
                  <Text style={[styles.scaleCardName, { color: theme.foreground }]}>{scale.name}</Text>
                  <Text style={[styles.scaleCardDesc, { color: theme.mutedForeground }]} numberOfLines={1}>
                    {scale.description}
                  </Text>
                </View>
              </View>
              <View style={styles.scaleCardRight}>
                <View style={[styles.approachChip, { backgroundColor: `${theme.accent}15` }]}>
                  <Text style={[styles.approachChipText, { color: theme.accent }]}>{scale.approach}</Text>
                </View>
                <ChevronRight size={16} color={theme.mutedForeground} />
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Recent records */}
        {recentRecords.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.mutedForeground, marginTop: 24 }]}>
              REGISTROS RECENTES
            </Text>
            {recentRecords.map((record) => (
              <TouchableOpacity
                key={record.id}
                style={[styles.recordCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => navigation.navigate('ScaleHistory', { patientId: record.patient_id, scaleId: record.scale_id })}
                activeOpacity={0.85}
              >
                <View style={styles.recordCardLeft}>
                  <Text style={[styles.recordScaleName, { color: theme.foreground }]}>{record.scale_name}</Text>
                  <Text style={[styles.recordPatient, { color: theme.mutedForeground }]}>
                    {record.patient_name} · {new Date(record.applied_at).toLocaleDateString('pt-BR')}
                  </Text>
                </View>
                <View style={styles.recordCardRight}>
                  <Text style={[styles.recordScore, { color: theme.primary }]}>{record.score}</Text>
                  <History size={14} color={theme.mutedForeground} />
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Apply scale modal */}
      <Modal
        visible={selectedScale !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedScale(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedScale(null)}
        />
        {selectedScale && (
          <View style={[styles.modalSheet, { backgroundColor: theme.card }]}>
            <ApplyScaleModal
              scale={selectedScale}
              patientId={patientId}
              patientName={patientName}
              onClose={() => setSelectedScale(null)}
              onSaved={() => {
                setSelectedScale(null);
                Alert.alert('Registrado!', 'Aplicacao da escala salva com sucesso.');
                void loadRecords();
              }}
              theme={theme}
            />
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  chipsRow: { paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontFamily: 'Inter', fontSize: 13, fontWeight: '600' },
  sectionTitle: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  scaleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  scaleCardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  scaleAbbrevBadge: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleAbbrevText: { fontFamily: 'Inter', fontSize: 13, fontWeight: '800' },
  scaleCardInfo: { flex: 1 },
  scaleCardName: { fontFamily: 'Inter', fontSize: 15, fontWeight: '700' },
  scaleCardDesc: { fontFamily: 'Inter', fontSize: 12, marginTop: 2 },
  scaleCardRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  approachChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  approachChipText: { fontFamily: 'Inter', fontSize: 11, fontWeight: '700' },
  recordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  recordCardLeft: { flex: 1 },
  recordScaleName: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600' },
  recordPatient: { fontFamily: 'Inter', fontSize: 12, marginTop: 2 },
  recordCardRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recordScore: { fontFamily: 'Inter', fontSize: 22, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  // Apply modal
  applyModal: { padding: 24, gap: 14 },
  applyModalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ccc',
    alignSelf: 'center',
    marginBottom: 4,
  },
  applyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  applyModalTitle: { fontFamily: 'Lora', fontSize: 20, fontWeight: '700' },
  applyModalPatient: { fontFamily: 'Inter', fontSize: 13, marginTop: 2 },
  applyModalDesc: { fontFamily: 'Inter', fontSize: 13, lineHeight: 20 },
  applyInputLabel: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600' },
  applyInput: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontFamily: 'Inter',
    fontSize: 20,
    fontWeight: '700',
  },
  interpretationBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  interpretationText: { fontFamily: 'Inter', fontSize: 14, fontWeight: '700' },
  applyBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  applyBtnText: { color: '#fff', fontFamily: 'Inter', fontSize: 16, fontWeight: '700' },
});
