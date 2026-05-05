/**
 * FormBuilderScreen — Criar e editar formulários customizados
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { Plus, Trash2 } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { clinicalApiClient } from '../services/api/clinicalClient';
import { GripVertical } from '../lib/lucideCompat';

type FieldType = 'text_short' | 'text_long' | 'select' | 'scale';

type FormField = {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
};

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text_short: 'Texto curto',
  text_long: 'Texto longo',
  select: 'Selecao',
  scale: 'Escala 1-10',
};

const FIELD_TYPES: FieldType[] = ['text_short', 'text_long', 'select', 'scale'];

const makeId = () => `field-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export default function FormBuilderScreen({ navigation, route }: any) {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const formId: string | undefined = route?.params?.formId;

  const [title, setTitle] = useState(route?.params?.formTitle ?? '');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<FormField[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!formId);

  // Load existing form if editing
  useEffect(() => {
    if (!formId) {
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const res = await clinicalApiClient.request<any>(`/forms/${formId}`, { method: 'GET' });
        setTitle(res.title ?? '');
        setDescription(res.description ?? '');
        setFields((res.fields ?? []).map((f: any) => ({ ...f, id: f.id ?? makeId() })));
      } catch {
        Alert.alert('Erro', 'Nao foi possivel carregar o formulario.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [formId]);

  const addField = (type: FieldType) => {
    setFields((prev) => [
      ...prev,
      {
        id: makeId(),
        label: '',
        type,
        required: false,
        options: type === 'select' ? ['Opcao 1', 'Opcao 2'] : undefined,
      },
    ]);
  };

  const updateField = (id: string, update: Partial<FormField>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...update } : f)));
  };

  const removeField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Titulo obrigatorio', 'Informe o titulo do formulario.');
      return;
    }
    if (fields.length === 0) {
      Alert.alert('Sem campos', 'Adicione ao menos um campo ao formulario.');
      return;
    }

    setSaving(true);
    try {
      const body = { title: title.trim(), description: description.trim(), fields };
      if (formId) {
        await clinicalApiClient.request(`/forms/${formId}`, { method: 'PUT', body });
      } else {
        await clinicalApiClient.request('/forms', { method: 'POST', body });
      }
      Alert.alert('Salvo!', 'Formulario salvo com sucesso.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Erro ao salvar', err?.message ?? 'Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Title & Description */}
        <View style={[styles.metaCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.inputLabel, { color: theme.foreground }]}>Titulo do formulario *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.foreground }]}
            value={title}
            onChangeText={setTitle}
            placeholder="Ex.: Escala de humor semanal"
            placeholderTextColor={theme.mutedForeground}
          />
          <Text style={[styles.inputLabel, { color: theme.foreground, marginTop: 12 }]}>Descricao (opcional)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.foreground }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Breve descricao sobre o objetivo do formulario"
            placeholderTextColor={theme.mutedForeground}
            multiline
          />
        </View>

        {/* Fields */}
        <Text style={[styles.sectionTitle, { color: theme.mutedForeground }]}>CAMPOS ({fields.length})</Text>

        {fields.map((field, index) => (
          <View key={field.id} style={[styles.fieldCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.fieldHeader}>
              <GripVertical size={16} color={theme.mutedForeground} />
              <Text style={[styles.fieldIndex, { color: theme.mutedForeground }]}>#{index + 1}</Text>
              <View style={[styles.fieldTypeBadge, { backgroundColor: `${theme.primary}20` }]}>
                <Text style={[styles.fieldTypeText, { color: theme.primary }]}>{FIELD_TYPE_LABELS[field.type]}</Text>
              </View>
              <TouchableOpacity onPress={() => removeField(field.id)} style={styles.removeBtn}>
                <Trash2 size={16} color={theme.destructive} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.foreground }]}
              value={field.label}
              onChangeText={(text) => updateField(field.id, { label: text })}
              placeholder="Pergunta ou rotulo do campo"
              placeholderTextColor={theme.mutedForeground}
            />

            {field.type === 'select' && (
              <View style={styles.optionsContainer}>
                <Text style={[styles.optionsLabel, { color: theme.mutedForeground }]}>Opcoes:</Text>
                {(field.options ?? []).map((opt, optIdx) => (
                  <TextInput
                    key={optIdx}
                    style={[styles.optionInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.foreground }]}
                    value={opt}
                    onChangeText={(text) => {
                      const newOptions = [...(field.options ?? [])];
                      newOptions[optIdx] = text;
                      updateField(field.id, { options: newOptions });
                    }}
                    placeholder={`Opcao ${optIdx + 1}`}
                    placeholderTextColor={theme.mutedForeground}
                  />
                ))}
                <TouchableOpacity
                  style={[styles.addOptionBtn, { borderColor: theme.border }]}
                  onPress={() => updateField(field.id, { options: [...(field.options ?? []), ''] })}
                >
                  <Plus size={14} color={theme.primary} />
                  <Text style={[styles.addOptionText, { color: theme.primary }]}>Adicionar opcao</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.fieldFooter}>
              <Text style={[styles.requiredLabel, { color: theme.foreground }]}>Obrigatorio</Text>
              <Switch
                value={field.required}
                onValueChange={(v) => updateField(field.id, { required: v })}
                trackColor={{ false: theme.muted, true: theme.primary }}
                thumbColor={theme.card}
              />
            </View>
          </View>
        ))}

        {/* Add field buttons */}
        <Text style={[styles.sectionTitle, { color: theme.mutedForeground, marginTop: 24 }]}>ADICIONAR CAMPO</Text>
        <View style={styles.addFieldRow}>
          {FIELD_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.addFieldBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => addField(type)}
            >
              <Plus size={14} color={theme.primary} />
              <Text style={[styles.addFieldText, { color: theme.foreground }]}>{FIELD_TYPE_LABELS[type]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save button */}
      <View style={[styles.footer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: theme.primary, opacity: saving ? 0.7 : 1 }]}
          onPress={() => void handleSave()}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Salvar formulario</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, gap: 12 },
  metaCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 8 },
  sectionTitle: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 4,
  },
  inputLabel: { fontFamily: 'Inter', fontSize: 13, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Inter',
    fontSize: 14,
  },
  fieldCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  fieldHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fieldIndex: { fontFamily: 'Inter', fontSize: 12, fontWeight: '700' },
  fieldTypeBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, flex: 1 },
  fieldTypeText: { fontFamily: 'Inter', fontSize: 11, fontWeight: '700' },
  removeBtn: { padding: 4 },
  optionsContainer: { gap: 8, marginTop: 4 },
  optionsLabel: { fontFamily: 'Inter', fontSize: 12 },
  optionInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: 'Inter',
    fontSize: 13,
  },
  addOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 10,
    borderStyle: 'dashed',
    alignSelf: 'flex-start',
  },
  addOptionText: { fontFamily: 'Inter', fontSize: 12 },
  fieldFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  requiredLabel: { fontFamily: 'Inter', fontSize: 14 },
  addFieldRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  addFieldBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  addFieldText: { fontFamily: 'Inter', fontSize: 12, fontWeight: '600' },
  footer: { padding: 16, borderTopWidth: 1 },
  saveBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontFamily: 'Inter', fontSize: 16, fontWeight: '700' },
});
