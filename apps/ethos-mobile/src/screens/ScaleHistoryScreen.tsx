/**
 * ScaleHistoryScreen — Historico e grafico de escalas por paciente
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  Dimensions,
} from 'react-native';
import Svg, { Polyline, Line, Circle, Text as SvgText } from 'react-native-svg';
import { colors } from '../theme/colors';
import { clinicalApiClient } from '../services/api/clinicalClient';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 48;
const CHART_HEIGHT = 180;

type ScaleRecord = {
  id: string;
  scale_name: string;
  score: number;
  applied_at: string;
  notes?: string;
};

function LineChart({
  records,
  minScore,
  maxScore,
  primaryColor,
}: {
  records: ScaleRecord[];
  minScore: number;
  maxScore: number;
  primaryColor: string;
}) {
  if (records.length < 2) return null;

  const range = maxScore - minScore || 1;
  const paddingH = 32;
  const paddingV = 20;
  const w = CHART_WIDTH - paddingH * 2;
  const h = CHART_HEIGHT - paddingV * 2;

  const points = records.map((r, i) => {
    const x = paddingH + (i / (records.length - 1)) * w;
    const y = paddingV + h - ((r.score - minScore) / range) * h;
    return { x, y, score: r.score, date: new Date(r.applied_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
        <Line
          key={i}
          x1={paddingH}
          y1={paddingV + t * h}
          x2={paddingH + w}
          y2={paddingV + t * h}
          stroke="rgba(150,150,150,0.15)"
          strokeWidth={1}
        />
      ))}

      {/* Line */}
      <Polyline
        points={polylinePoints}
        fill="none"
        stroke={primaryColor}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Points */}
      {points.map((p, i) => (
        <React.Fragment key={i}>
          <Circle cx={p.x} cy={p.y} r={5} fill={primaryColor} />
          <SvgText x={p.x} y={CHART_HEIGHT - 4} fontSize={9} fill="rgba(150,150,150,0.8)" textAnchor="middle">
            {p.date}
          </SvgText>
          <SvgText x={p.x} y={p.y - 9} fontSize={10} fill={primaryColor} fontWeight="700" textAnchor="middle">
            {p.score}
          </SvgText>
        </React.Fragment>
      ))}
    </Svg>
  );
}

export default function ScaleHistoryScreen({ route }: any) {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const patientId: string | undefined = route?.params?.patientId;
  const scaleId: string | undefined = route?.params?.scaleId;
  const scaleName: string = route?.params?.scaleName ?? 'Escala';
  const minScore: number = route?.params?.minScore ?? 0;
  const maxScore: number = route?.params?.maxScore ?? 100;

  const [records, setRecords] = useState<ScaleRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      let path = '/scales/records';
      const params: string[] = [];
      if (patientId) params.push(`patient_id=${patientId}`);
      if (scaleId) params.push(`scale_id=${scaleId}`);
      if (params.length) path += `?${params.join('&')}`;

      const res = await clinicalApiClient.request<any>(path, { method: 'GET' });
      const data = Array.isArray(res) ? res : res?.data ?? [];
      // Sort ascending for chart
      const sorted = [...data].sort((a, b) => new Date(a.applied_at).getTime() - new Date(b.applied_at).getTime());
      setRecords(sorted);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [patientId, scaleId]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const lastRecord = records[records.length - 1];
  const previousRecord = records[records.length - 2];
  const trend = lastRecord && previousRecord
    ? lastRecord.score > previousRecord.score ? 'subiu' : lastRecord.score < previousRecord.score ? 'caiu' : 'estavel'
    : null;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} showsVerticalScrollIndicator={false}>
      {loading ? (
        <ActivityIndicator color={theme.primary} style={{ margin: 40 }} />
      ) : (
        <>
          {/* Chart */}
          <View style={[styles.chartCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.chartTitle, { color: theme.foreground }]}>{scaleName}</Text>
            {records.length >= 2 ? (
              <LineChart records={records} minScore={minScore} maxScore={maxScore} primaryColor={theme.primary} />
            ) : (
              <Text style={[styles.emptyChart, { color: theme.mutedForeground }]}>
                Minimo de 2 registros para exibir o grafico.
              </Text>
            )}

            {/* Summary */}
            {lastRecord && (
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: theme.primary }]}>{lastRecord.score}</Text>
                  <Text style={[styles.summaryLabel, { color: theme.mutedForeground }]}>Ultimo</Text>
                </View>
                {previousRecord && (
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryValue, { color: theme.foreground }]}>{previousRecord.score}</Text>
                    <Text style={[styles.summaryLabel, { color: theme.mutedForeground }]}>Anterior</Text>
                  </View>
                )}
                {trend && (
                  <View style={styles.summaryItem}>
                    <Text style={[
                      styles.summaryValue,
                      { color: trend === 'subiu' ? theme.destructive : trend === 'caiu' ? theme.statusValidated : theme.accent },
                    ]}>
                      {trend === 'subiu' ? '↑' : trend === 'caiu' ? '↓' : '—'}
                    </Text>
                    <Text style={[styles.summaryLabel, { color: theme.mutedForeground }]}>Tendencia</Text>
                  </View>
                )}
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: theme.foreground }]}>{records.length}</Text>
                  <Text style={[styles.summaryLabel, { color: theme.mutedForeground }]}>Aplicacoes</Text>
                </View>
              </View>
            )}
          </View>

          {/* Records list */}
          <Text style={[styles.sectionTitle, { color: theme.mutedForeground }]}>HISTORICO COMPLETO</Text>
          {[...records].reverse().map((r) => (
            <View key={r.id} style={[styles.recordRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={[styles.scoreBubble, { backgroundColor: `${theme.primary}20` }]}>
                <Text style={[styles.scoreText, { color: theme.primary }]}>{r.score}</Text>
              </View>
              <View style={styles.recordInfo}>
                <Text style={[styles.recordScale, { color: theme.foreground }]}>{r.scale_name || scaleName}</Text>
                <Text style={[styles.recordDate, { color: theme.mutedForeground }]}>
                  {new Date(r.applied_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </Text>
                {r.notes && (
                  <Text style={[styles.recordNotes, { color: theme.mutedForeground }]} numberOfLines={2}>
                    {r.notes}
                  </Text>
                )}
              </View>
            </View>
          ))}
          {records.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: theme.mutedForeground }]}>Nenhum registro encontrado.</Text>
            </View>
          )}
          <View style={{ height: 40 }} />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  chartCard: {
    margin: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 16,
  },
  chartTitle: { fontFamily: 'Lora', fontSize: 18, fontWeight: '700' },
  emptyChart: { fontFamily: 'Inter', fontSize: 14, textAlign: 'center', paddingVertical: 24 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center', gap: 4 },
  summaryValue: { fontFamily: 'Inter', fontSize: 22, fontWeight: '700' },
  summaryLabel: { fontFamily: 'Inter', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionTitle: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  scoreBubble: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: { fontFamily: 'Inter', fontSize: 20, fontWeight: '700' },
  recordInfo: { flex: 1 },
  recordScale: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600' },
  recordDate: { fontFamily: 'Inter', fontSize: 12, marginTop: 2 },
  recordNotes: { fontFamily: 'Inter', fontSize: 12, marginTop: 4, lineHeight: 18 },
  emptyState: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { fontFamily: 'Inter', fontSize: 15 },
});
