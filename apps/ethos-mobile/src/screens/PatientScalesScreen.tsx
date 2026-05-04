/**
 * PatientScalesScreen — Escalas clínicas aplicadas ao paciente (portal do paciente)
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import Svg, { Line, Polyline, Circle, Text as SvgText } from 'react-native-svg';
import { TrendingDown, TrendingUp, Minus, ChevronDown, ChevronUp, X } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { clinicalApiClient } from '../services/api/clinicalClient';

type ScaleRecord = {
  id: string;
  scale_id: string;
  scale_name: string;
  score: number;
  max_score: number;
  interpretation: string;
  applied_at: string;
  notes?: string;
};

type ScaleGroup = {
  scale_id: string;
  scale_name: string;
  records: ScaleRecord[];
};

// ─── Trend helpers ────────────────────────────────────────────────────────────
function computeTrend(records: ScaleRecord[]): 'up' | 'down' | 'stable' {
  if (records.length < 2) return 'stable';
  const last = records[records.length - 1].score;
  const prev = records[records.length - 2].score;
  if (last > prev + 1) return 'up';
  if (last < prev - 1) return 'down';
  return 'stable';
}

// ─── Mini Line Chart ──────────────────────────────────────────────────────────
function LineChart({
  records,
  maxScore,
  primaryColor,
  mutedColor,
}: {
  records: ScaleRecord[];
  maxScore: number;
  primaryColor: string;
  mutedColor: string;
}) {
  const W = 280;
  const H = 100;
  const PAD = 20;
  const plotW = W - PAD * 2;
  const plotH = H - PAD * 2;

  const sorted = [...records].sort(
    (a, b) => new Date(a.applied_at).getTime() - new Date(b.applied_at).getTime(),
  );

  if (sorted.length < 2) {
    return (
      <View style={[styles.chartPlaceholder, { borderColor: mutedColor }]}>
        <Text style={[styles.chartPlaceholderText, { color: mutedColor }]}>Dados insuficientes para gráfico</Text>
      </View>
    );
  }

  const points = sorted.map((r, i) => {
    const x = PAD + (i / (sorted.length - 1)) * plotW;
    const y = PAD + (1 - r.score / maxScore) * plotH;
    return { x, y, record: r };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <Svg width={W} height={H}>
      {/* Axes */}
      <Line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke={mutedColor} strokeWidth={1} strokeOpacity={0.4} />
      <Line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke={mutedColor} strokeWidth={1} strokeOpacity={0.4} />
      {/* Line */}
      <Polyline points={polylinePoints} fill="none" stroke={primaryColor} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {/* Dots */}
      {points.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={4} fill={primaryColor} />
      ))}
      {/* First and last score labels */}
      <SvgText x={points[0].x} y={points[0].y - 8} fontSize={10} fill={mutedColor} textAnchor="middle">
        {sorted[0].score}
      </SvgText>
      <SvgText
        x={points[points.length - 1].x}
        y={points[points.length - 1].y - 8}
        fontSize={10}
        fill={primaryColor}
        textAnchor="middle"
        fontWeight="bold"
      >
        {sorted[sorted.length - 1].score}
      </SvgText>
    </Svg>
  );
}

// ─── Scale Card ───────────────────────────────────────────────────────────────
function ScaleCard({
  group,
  theme,
  onPress,
}: {
  group: ScaleGroup;
  theme: typeof colors.light;
  onPress: () => void;
}) {
  const sorted = [...group.records].sort(
    (a, b) => new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime(),
  );
  const latest = sorted[0];
  const trend = computeTrend([...sorted].reverse());

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? '#bd3737' : trend === 'down' ? '#3a9b73' : theme.mutedForeground;
  const trendLabel = trend === 'up' ? 'Aumentou' : trend === 'down' ? 'Diminuiu' : 'Estável';

  return (
    <TouchableOpacity
      style={[styles.scaleCard, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.scaleCardHeader}>
        <Text style={[styles.scaleName, { color: theme.foreground }]}>{group.scale_name}</Text>
        <View style={[styles.trendBadge, { backgroundColor: `${trendColor}20` }]}>
          <TrendIcon size={12} color={trendColor} />
          <Text style={[styles.trendText, { color: trendColor }]}>{trendLabel}</Text>
        </View>
      </View>

      <View style={styles.scaleCardBody}>
        <View style={styles.scoreBlock}>
          <Text style={[styles.scoreValue, { color: theme.primary }]}>{latest.score}</Text>
          <Text style={[styles.scoreMax, { color: theme.mutedForeground }]}>/ {latest.max_score}</Text>
        </View>
        <View style={styles.scoreDetails}>
          <Text style={[styles.interpretation, { color: theme.foreground }]}>{latest.interpretation}</Text>
          <Text style={[styles.appliedAt, { color: theme.mutedForeground }]}>
            Última aplicação: {new Date(latest.applied_at).toLocaleDateString('pt-BR')}
          </Text>
          <Text style={[styles.applicationCount, { color: theme.mutedForeground }]}>
            {group.records.length} {group.records.length === 1 ? 'aplicação' : 'aplicações'} no total
          </Text>
        </View>
      </View>

      {/* Mini progress bar */}
      <View style={[styles.progressBar, { backgroundColor: theme.secondary }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.min(100, (latest.score / latest.max_score) * 100)}%` as any,
              backgroundColor: theme.primary,
            },
          ]}
        />
      </View>
    </TouchableOpacity>
  );
}

// ─── Scale Detail Modal ───────────────────────────────────────────────────────
function ScaleDetailModal({
  group,
  visible,
  onClose,
  theme,
}: {
  group: ScaleGroup | null;
  visible: boolean;
  onClose: () => void;
  theme: typeof colors.light;
}) {
  if (!group) return null;
  const sorted = [...group.records].sort(
    (a, b) => new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime(),
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose} />
      <View style={[styles.modalSheet, { backgroundColor: theme.card }]}>
        <View style={styles.modalHandle} />
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: theme.foreground }]}>{group.scale_name}</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={20} color={theme.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Chart */}
        <View style={styles.chartWrapper}>
          <LineChart
            records={group.records}
            maxScore={sorted[0]?.max_score ?? 27}
            primaryColor={theme.primary}
            mutedColor={theme.mutedForeground}
          />
        </View>

        <Text style={[styles.historyTitle, { color: theme.foreground }]}>Histórico completo</Text>

        <ScrollView style={styles.historyList} showsVerticalScrollIndicator={false}>
          {sorted.map((rec) => (
            <View
              key={rec.id}
              style={[styles.historyItem, { borderBottomColor: theme.border }]}
            >
              <View style={styles.historyLeft}>
                <Text style={[styles.historyDate, { color: theme.foreground }]}>
                  {new Date(rec.applied_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
                <Text style={[styles.historyInterpretation, { color: theme.mutedForeground }]}>
                  {rec.interpretation}
                </Text>
              </View>
              <View style={[styles.historyScore, { backgroundColor: `${theme.primary}15` }]}>
                <Text style={[styles.historyScoreText, { color: theme.primary }]}>
                  {rec.score}/{rec.max_score}
                </Text>
              </View>
            </View>
          ))}
          <View style={{ height: 32 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PatientScalesScreen() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const [groups, setGroups] = useState<ScaleGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<ScaleGroup | null>(null);

  const loadScales = useCallback(async () => {
    setLoading(true);
    try {
      const res = await clinicalApiClient.request<any>('/patient/scales', { method: 'GET' });
      const records: ScaleRecord[] = Array.isArray(res) ? res : res?.data ?? [];

      // Group by scale_id
      const map = new Map<string, ScaleGroup>();
      for (const rec of records) {
        if (!map.has(rec.scale_id)) {
          map.set(rec.scale_id, { scale_id: rec.scale_id, scale_name: rec.scale_name, records: [] });
        }
        map.get(rec.scale_id)!.records.push(rec);
      }
      setGroups(Array.from(map.values()));
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadScales();
  }, [loadScales]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {loading ? (
        <ActivityIndicator color={theme.primary} style={{ margin: 40 }} />
      ) : groups.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: theme.foreground }]}>Sem escalas aplicadas</Text>
          <Text style={[styles.emptySubtitle, { color: theme.mutedForeground }]}>
            Seu psicólogo ainda não aplicou nenhuma escala clínica. Elas aparecerão aqui conforme forem registradas.
          </Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(g) => g.scale_id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ScaleCard
              group={item}
              theme={theme}
              onPress={() => setSelectedGroup(item)}
            />
          )}
          ListHeaderComponent={
            <Text style={[styles.listHeader, { color: theme.mutedForeground }]}>
              {groups.length} {groups.length === 1 ? 'escala monitorada' : 'escalas monitoradas'}
            </Text>
          }
        />
      )}

      <ScaleDetailModal
        group={selectedGroup}
        visible={!!selectedGroup}
        onClose={() => setSelectedGroup(null)}
        theme={theme}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, gap: 12 },
  listHeader: {
    fontFamily: 'Inter',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  scaleCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  scaleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scaleName: { fontFamily: 'Lora', fontSize: 16, fontWeight: '600', flex: 1 },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  trendText: { fontFamily: 'Inter', fontSize: 11, fontWeight: '700' },
  scaleCardBody: { flexDirection: 'row', gap: 12 },
  scoreBlock: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  scoreValue: { fontFamily: 'Inter', fontSize: 36, fontWeight: '700', lineHeight: 40 },
  scoreMax: { fontFamily: 'Inter', fontSize: 14, marginBottom: 4 },
  scoreDetails: { flex: 1, justifyContent: 'center', gap: 2 },
  interpretation: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600' },
  appliedAt: { fontFamily: 'Inter', fontSize: 12 },
  applicationCount: { fontFamily: 'Inter', fontSize: 11 },
  progressBar: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ccc',
    alignSelf: 'center',
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontFamily: 'Lora', fontSize: 20, fontWeight: '700', flex: 1 },
  chartWrapper: { alignItems: 'center', marginBottom: 16 },
  chartPlaceholder: {
    height: 80,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: 280,
  },
  chartPlaceholderText: { fontFamily: 'Inter', fontSize: 13 },
  historyTitle: { fontFamily: 'Inter', fontSize: 14, fontWeight: '700', marginBottom: 8 },
  historyList: { flex: 1 },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  historyLeft: { flex: 1 },
  historyDate: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600' },
  historyInterpretation: { fontFamily: 'Inter', fontSize: 12, marginTop: 2 },
  historyScore: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  historyScoreText: { fontFamily: 'Inter', fontSize: 14, fontWeight: '700' },

  // Empty
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  emptyTitle: { fontFamily: 'Lora', fontSize: 20, fontWeight: '600', textAlign: 'center' },
  emptySubtitle: { fontFamily: 'Inter', fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
