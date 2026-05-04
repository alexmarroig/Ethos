/**
 * AvailabilityScreen — Gerenciar blocos de disponibilidade para agendamento
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { Plus, Trash2, X } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { clinicalApiClient } from '../services/api/clinicalClient';

type AvailabilityBlock = {
  id: string;
  day_of_week: number; // 0=Sunday...6=Saturday
  start_time: string;  // HH:MM
  end_time: string;
  duration_minutes: number;
  patient_id?: string;
  patient_name?: string;
};

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
const DAY_FULL = ['Domingo', 'Segunda-feira', 'Terca-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sabado'];
const DURATIONS = [30, 45, 50, 60, 90];

const HOURS = Array.from({ length: 14 }, (_, i) => {
  const h = i + 7; // 07:00 to 20:00
  return `${String(h).padStart(2, '0')}:00`;
});

function BlockCard({
  block,
  onDelete,
  theme,
}: {
  block: AvailabilityBlock;
  onDelete: () => void;
  theme: typeof colors.light;
}) {
  return (
    <View style={[styles.blockCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[styles.blockDayBadge, { backgroundColor: `${theme.primary}20` }]}>
        <Text style={[styles.blockDayText, { color: theme.primary }]}>{DAY_NAMES[block.day_of_week]}</Text>
      </View>
      <View style={styles.blockInfo}>
        <Text style={[styles.blockTime, { color: theme.foreground }]}>
          {block.start_time} – {block.end_time}
        </Text>
        <Text style={[styles.blockMeta, { color: theme.mutedForeground }]}>
          {block.duration_minutes} min
          {block.patient_name ? ` · ${block.patient_name}` : ' · Todos os pacientes'}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => {
          Alert.alert('Remover bloco?', 'Este horario sera removido da sua disponibilidade.', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Remover', style: 'destructive', onPress: onDelete },
          ]);
        }}
      >
        <Trash2 size={18} color={theme.destructive} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Create Block Modal ───────────────────────────────────────────────────────
function CreateBlockModal({
  visible,
  onClose,
  onSaved,
  theme,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: (block: Omit<AvailabilityBlock, 'id'>) => void;
  theme: typeof colors.light;
}) {
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set([1]));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [duration, setDuration] = useState(50);

  const toggleDay = (d: number) => {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(d)) { if (next.size > 1) next.delete(d); }
      else next.add(d);
      return next;
    });
  };

  const handleSave = () => {
    if (startTime >= endTime) {
      Alert.alert('Horario invalido', 'O horario de inicio deve ser anterior ao fim.');
      return;
    }
    selectedDays.forEach((day) => {
      onSaved({ day_of_week: day, start_time: startTime, end_time: endTime, duration_minutes: duration });
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose} />
      <View style={[styles.modalSheet, { backgroundColor: theme.card }]}>
        <View style={styles.modalHandle} />
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: theme.foreground }]}>Novo Bloco</Text>
          <TouchableOpacity onPress={onClose}><X size={20} color={theme.mutedForeground} /></TouchableOpacity>
        </View>

        {/* Days */}
        <Text style={[styles.modalLabel, { color: theme.foreground }]}>Dias da semana</Text>
        <View style={styles.daysRow}>
          {DAY_NAMES.map((name, i) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.dayChip,
                {
                  backgroundColor: selectedDays.has(i) ? theme.primary : theme.secondary,
                  borderColor: selectedDays.has(i) ? theme.primary : theme.border,
                },
              ]}
              onPress={() => toggleDay(i)}
            >
              <Text style={[styles.dayChipText, { color: selectedDays.has(i) ? '#fff' : theme.foreground }]}>{name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Hours */}
        <Text style={[styles.modalLabel, { color: theme.foreground }]}>Hora de inicio</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hoursRow}>
          {HOURS.map((h) => (
            <TouchableOpacity
              key={h}
              style={[styles.hourChip, { backgroundColor: startTime === h ? theme.primary : theme.secondary, borderColor: startTime === h ? theme.primary : theme.border }]}
              onPress={() => setStartTime(h)}
            >
              <Text style={[styles.hourChipText, { color: startTime === h ? '#fff' : theme.foreground }]}>{h}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={[styles.modalLabel, { color: theme.foreground }]}>Hora de fim</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hoursRow}>
          {HOURS.map((h) => (
            <TouchableOpacity
              key={h}
              style={[styles.hourChip, { backgroundColor: endTime === h ? theme.primary : theme.secondary, borderColor: endTime === h ? theme.primary : theme.border }]}
              onPress={() => setEndTime(h)}
            >
              <Text style={[styles.hourChipText, { color: endTime === h ? '#fff' : theme.foreground }]}>{h}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Duration */}
        <Text style={[styles.modalLabel, { color: theme.foreground }]}>Duracao da consulta</Text>
        <View style={styles.durationsRow}>
          {DURATIONS.map((d) => (
            <TouchableOpacity
              key={d}
              style={[styles.durationChip, { backgroundColor: duration === d ? theme.primary : theme.secondary, borderColor: duration === d ? theme.primary : theme.border }]}
              onPress={() => setDuration(d)}
            >
              <Text style={[styles.durationChipText, { color: duration === d ? '#fff' : theme.foreground }]}>{d} min</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: theme.primary }]}
          onPress={handleSave}
        >
          <Text style={styles.saveBtnText}>
            Criar {selectedDays.size > 1 ? `${selectedDays.size} blocos` : 'bloco'}
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AvailabilityScreen() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const loadBlocks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await clinicalApiClient.request<any>('/availability', { method: 'GET' });
      const data = Array.isArray(res) ? res : res?.data ?? [];
      setBlocks(data);
    } catch {
      setBlocks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBlocks();
  }, [loadBlocks]);

  const handleSaveBlock = async (block: Omit<AvailabilityBlock, 'id'>) => {
    try {
      const res = await clinicalApiClient.request<any>('/availability', { method: 'POST', body: block });
      setBlocks((prev) => [...prev, res]);
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Nao foi possivel salvar o bloco.');
    }
  };

  const handleDeleteBlock = async (id: string) => {
    try {
      await clinicalApiClient.request(`/availability/${id}`, { method: 'DELETE' });
      setBlocks((prev) => prev.filter((b) => b.id !== id));
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Nao foi possivel remover o bloco.');
    }
  };

  // Group by day
  const byDay: Record<number, AvailabilityBlock[]> = {};
  for (const b of blocks) {
    if (!byDay[b.day_of_week]) byDay[b.day_of_week] = [];
    byDay[b.day_of_week].push(b);
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {loading ? (
        <ActivityIndicator color={theme.primary} style={{ margin: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {[1, 2, 3, 4, 5, 6, 0].map((day) => {
            const dayBlocks = byDay[day] ?? [];
            return (
              <View key={day} style={styles.dayGroup}>
                <Text style={[styles.dayGroupTitle, { color: dayBlocks.length ? theme.foreground : theme.mutedForeground }]}>
                  {DAY_FULL[day]}
                  {dayBlocks.length > 0 && (
                    <Text style={[styles.dayGroupCount, { color: theme.mutedForeground }]}> ({dayBlocks.length})</Text>
                  )}
                </Text>
                {dayBlocks.length === 0 ? (
                  <Text style={[styles.noneText, { color: theme.mutedForeground }]}>Sem disponibilidade</Text>
                ) : (
                  dayBlocks.map((b) => (
                    <BlockCard key={b.id} block={b} onDelete={() => void handleDeleteBlock(b.id)} theme={theme} />
                  ))
                )}
              </View>
            );
          })}
          <View style={{ height: 80 }} />
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => setShowModal(true)}
        activeOpacity={0.85}
      >
        <Plus size={24} color="#fff" />
      </TouchableOpacity>

      <CreateBlockModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSaved={(b) => void handleSaveBlock(b)}
        theme={theme}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16 },
  dayGroup: { marginBottom: 24 },
  dayGroupTitle: { fontFamily: 'Inter', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  dayGroupCount: { fontSize: 13, fontWeight: '400' },
  noneText: { fontFamily: 'Inter', fontSize: 13, marginLeft: 4 },
  blockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  blockDayBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockDayText: { fontFamily: 'Inter', fontSize: 12, fontWeight: '800' },
  blockInfo: { flex: 1 },
  blockTime: { fontFamily: 'Inter', fontSize: 15, fontWeight: '600' },
  blockMeta: { fontFamily: 'Inter', fontSize: 12, marginTop: 2 },
  deleteBtn: { padding: 8 },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 16,
  },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#ccc', alignSelf: 'center', marginBottom: 4 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontFamily: 'Lora', fontSize: 20, fontWeight: '700' },
  modalLabel: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600' },
  daysRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  dayChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  dayChipText: { fontFamily: 'Inter', fontSize: 12, fontWeight: '600' },
  hoursRow: { gap: 8, paddingBottom: 4 },
  hourChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  hourChipText: { fontFamily: 'Inter', fontSize: 13, fontWeight: '600' },
  durationsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  durationChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  durationChipText: { fontFamily: 'Inter', fontSize: 13, fontWeight: '600' },
  saveBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 4 },
  saveBtnText: { color: '#fff', fontFamily: 'Inter', fontSize: 16, fontWeight: '700' },
});
