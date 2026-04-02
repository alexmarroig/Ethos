import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { colors } from '../theme/colors';
import {
  createPatientDiaryEntry,
  fetchPatientDiaryEntries,
} from '../services/api/emotionalDiary';
import type { EmotionalDiaryEntryRecord } from '../services/api/types';

const moodOptions = [
  { value: 1 as const, emoji: '😞', label: 'Muito mal' },
  { value: 2 as const, emoji: '🙂', label: 'Baixo' },
  { value: 3 as const, emoji: '😐', label: 'Neutro' },
  { value: 4 as const, emoji: '😊', label: 'Bem' },
  { value: 5 as const, emoji: '😄', label: 'Muito bem' },
];

const intensityOptions = Array.from({ length: 11 }, (_, index) => index);

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });

const toTags = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const getMoodMeta = (mood: EmotionalDiaryEntryRecord['mood']) =>
  moodOptions.find((option) => option.value === mood) ?? moodOptions[2];

export default function EmotionalDiaryScreen() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;

  const [entries, setEntries] = useState<EmotionalDiaryEntryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<EmotionalDiaryEntryRecord['mood'] | null>(null);
  const [intensity, setIntensity] = useState(5);
  const [description, setDescription] = useState('');
  const [thoughts, setThoughts] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  const loadEntries = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetchPatientDiaryEntries();
      setEntries(response);
    } catch (loadError: any) {
      setError(loadError?.message ?? 'Nao foi possivel carregar seu diario emocional.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadEntries();
    }, [loadEntries]),
  );

  const recentEntries = useMemo(
    () => [...entries].sort((left, right) => Date.parse(right.date) - Date.parse(left.date)).slice(0, 7),
    [entries],
  );

  const chartEntries = useMemo(
    () => [...recentEntries].slice(0, 6).reverse(),
    [recentEntries],
  );

  const handleSave = async () => {
    if (!selectedMood) {
      Alert.alert('Humor necessario', 'Escolha como voce esta se sentindo para salvar seu registro.');
      return;
    }

    try {
      setIsSaving(true);
      await createPatientDiaryEntry({
        mood: selectedMood,
        intensity,
        description: description.trim() || undefined,
        thoughts: thoughts.trim() || undefined,
        tags: tagsInput.trim() ? toTags(tagsInput) : undefined,
      });

      setSelectedMood(null);
      setIntensity(5);
      setDescription('');
      setThoughts('');
      setTagsInput('');
      setShowDetails(false);
      await loadEntries();
    } catch (saveError: any) {
      Alert.alert('Nao foi possivel salvar', saveError?.message ?? 'Tente novamente em instantes.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={[styles.subtitle, { color: theme.mutedForeground }]}>Registro rapido</Text>
        <Text style={[styles.title, { color: theme.foreground }]}>Como voce esta se sentindo hoje?</Text>
      </View>

      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.cardLabel, { color: theme.mutedForeground }]}>HUMOR</Text>
        <View style={styles.moodRow}>
          {moodOptions.map((option) => {
            const selected = selectedMood === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.moodButton,
                  {
                    backgroundColor: selected ? theme.primary : theme.background,
                    borderColor: selected ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => setSelectedMood(option.value)}
              >
                <Text style={styles.moodEmoji}>{option.emoji}</Text>
                <Text style={[styles.moodLabel, { color: selected ? '#fff' : theme.foreground }]}>{option.value}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.helperText, { color: theme.mutedForeground }]}>
          {selectedMood ? getMoodMeta(selectedMood).label : 'Toque em um numero para escolher o humor do momento.'}
        </Text>

        <Text style={[styles.cardLabel, { color: theme.mutedForeground, marginTop: 20 }]}>INTENSIDADE</Text>
        <Text style={[styles.intensityValue, { color: theme.foreground }]}>{intensity}/10</Text>
        <View style={styles.intensityRow}>
          {intensityOptions.map((option) => (
            <TouchableOpacity
              key={option}
              style={styles.intensityBarTouch}
              onPress={() => setIntensity(option)}
            >
              <View
                style={[
                  styles.intensityBar,
                  {
                    height: 12 + option * 3,
                    backgroundColor: option <= intensity ? theme.primary : theme.border,
                  },
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: theme.border }]}
            onPress={() => setShowDetails((current) => !current)}
          >
            <Text style={[styles.secondaryButtonText, { color: theme.primary }]}>
              {showDetails ? 'Ocultar detalhes' : 'Adicionar detalhes'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryButton, { opacity: isSaving ? 0.7 : 1 }]}
            onPress={handleSave}
            disabled={isSaving}
          >
            <Text style={styles.primaryButtonText}>{isSaving ? 'Salvando...' : 'Salvar agora'}</Text>
          </TouchableOpacity>
        </View>

        {showDetails ? (
          <View style={styles.detailsBlock}>
            <TextInput
              style={[
                styles.input,
                styles.singleLineInput,
                { backgroundColor: theme.background, borderColor: theme.border, color: theme.foreground },
              ]}
              placeholder="Resumo rapido (opcional)"
              placeholderTextColor={theme.mutedForeground}
              value={description}
              onChangeText={setDescription}
            />
            <TextInput
              style={[
                styles.input,
                styles.multiLineInput,
                { backgroundColor: theme.background, borderColor: theme.border, color: theme.foreground },
              ]}
              placeholder="Pensamentos do momento (opcional)"
              placeholderTextColor={theme.mutedForeground}
              value={thoughts}
              onChangeText={setThoughts}
              multiline
              textAlignVertical="top"
            />
            <TextInput
              style={[
                styles.input,
                styles.singleLineInput,
                { backgroundColor: theme.background, borderColor: theme.border, color: theme.foreground },
              ]}
              placeholder="Tags separadas por virgula (opcional)"
              placeholderTextColor={theme.mutedForeground}
              value={tagsInput}
              onChangeText={setTagsInput}
              autoCapitalize="none"
            />
          </View>
        ) : null}
      </View>

      {chartEntries.length > 1 ? (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardLabel, { color: theme.mutedForeground }]}>HUMOR RECENTE</Text>
          <View style={styles.chartRow}>
            {chartEntries.map((entry) => (
              <View key={entry.id} style={styles.chartItem}>
                <View
                  style={[
                    styles.chartBar,
                    {
                      height: 18 + entry.mood * 12,
                      backgroundColor: theme.primary,
                    },
                  ]}
                />
                <Text style={[styles.chartMeta, { color: theme.mutedForeground }]}>{formatDate(entry.date)}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.cardLabel, { color: theme.mutedForeground }]}>REGISTROS RECENTES</Text>

        {isLoading ? (
          <View style={styles.stateBlock}>
            <ActivityIndicator color={theme.primary} />
            <Text style={[styles.helperText, { color: theme.mutedForeground }]}>Carregando registros...</Text>
          </View>
        ) : error ? (
          <Text style={[styles.helperText, { color: theme.mutedForeground }]}>{error}</Text>
        ) : recentEntries.length === 0 ? (
          <Text style={[styles.helperText, { color: theme.mutedForeground }]}>
            Seu primeiro registro aparece aqui assim que voce salvar.
          </Text>
        ) : (
          recentEntries.map((entry) => {
            const moodMeta = getMoodMeta(entry.mood);
            const preview = entry.description || entry.thoughts || 'Sem descricao adicional.';

            return (
              <View key={entry.id} style={[styles.entryRow, { borderBottomColor: theme.border }]}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryEmoji}>{moodMeta.emoji}</Text>
                  <View style={styles.entryCopy}>
                    <Text style={[styles.entryTitle, { color: theme.foreground }]}>
                      {formatDate(entry.date)} · Humor {entry.mood}/5
                    </Text>
                    <Text style={[styles.entryMeta, { color: theme.mutedForeground }]}>
                      Intensidade {entry.intensity}/10
                    </Text>
                  </View>
                </View>
                <Text style={[styles.entryBody, { color: theme.mutedForeground }]}>{preview}</Text>
                {entry.tags?.length ? (
                  <View style={styles.tagRow}>
                    {entry.tags.map((tag) => (
                      <View key={`${entry.id}-${tag}`} style={[styles.tag, { backgroundColor: theme.background }]}>
                        <Text style={[styles.tagText, { color: theme.primary }]}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 14,
    paddingBottom: 40,
  },
  header: {
    gap: 6,
  },
  subtitle: {
    fontFamily: 'Inter',
    fontSize: 14,
  },
  title: {
    fontFamily: 'Lora',
    fontSize: 28,
    fontWeight: '700',
  },
  card: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
  },
  cardLabel: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
  },
  moodRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  moodButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 4,
  },
  moodEmoji: {
    fontSize: 24,
  },
  moodLabel: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '700',
  },
  helperText: {
    fontFamily: 'Inter',
    fontSize: 14,
    lineHeight: 20,
  },
  intensityValue: {
    fontFamily: 'Lora',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  intensityRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 4,
  },
  intensityBarTouch: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    minHeight: 48,
  },
  intensityBar: {
    width: '100%',
    borderRadius: 999,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#234e5c',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '700',
  },
  detailsBlock: {
    gap: 10,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    fontFamily: 'Inter',
    fontSize: 14,
  },
  singleLineInput: {
    minHeight: 48,
  },
  multiLineInput: {
    minHeight: 110,
    paddingTop: 14,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 6,
  },
  chartItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  chartBar: {
    width: '100%',
    borderRadius: 999,
    minHeight: 20,
  },
  chartMeta: {
    fontFamily: 'Inter',
    fontSize: 11,
  },
  stateBlock: {
    paddingVertical: 26,
    alignItems: 'center',
    gap: 10,
  },
  entryRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 8,
  },
  entryHeader: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  entryEmoji: {
    fontSize: 24,
  },
  entryCopy: {
    flex: 1,
    gap: 2,
  },
  entryTitle: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '700',
  },
  entryMeta: {
    fontFamily: 'Inter',
    fontSize: 13,
  },
  entryBody: {
    fontFamily: 'Inter',
    fontSize: 14,
    lineHeight: 20,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
  },
});
