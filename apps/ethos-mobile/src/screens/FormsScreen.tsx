/**
 * FormsScreen — Listar, criar e gerenciar formulários customizados
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { MessageSquare, Plus } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { clinicalApiClient } from '../services/api/clinicalClient';
import { ClipboardList } from '../lib/lucideCompat';

type Form = {
  id: string;
  title: string;
  description?: string;
  field_count: number;
  response_count: number;
  active: boolean;
  created_at: string;
};

export default function FormsScreen() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'forms' | 'responses'>('forms');

  const loadForms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await clinicalApiClient.request<any>('/forms', { method: 'GET' });
      const data = Array.isArray(res) ? res : res?.data ?? [];
      setForms(data);
    } catch {
      setForms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadForms();
  }, [loadForms]);

  const handleToggleActive = async (form: Form) => {
    try {
      await clinicalApiClient.request(`/forms/${form.id}`, {
        method: 'PATCH',
        body: { active: !form.active },
      });
      setForms((prev) =>
        prev.map((f) => (f.id === form.id ? { ...f, active: !f.active } : f)),
      );
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Nao foi possivel atualizar o formulario.');
    }
  };

  const renderForm = ({ item }: { item: Form }) => (
    <View style={[styles.formCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.formCardHeader}>
        <View style={styles.formCardLeft}>
          <View style={[styles.formIcon, { backgroundColor: `${theme.primary}20` }]}>
            <ClipboardList size={20} color={theme.primary} />
          </View>
          <View style={styles.formInfo}>
            <Text style={[styles.formTitle, { color: theme.foreground }]}>{item.title}</Text>
            <Text style={[styles.formMeta, { color: theme.mutedForeground }]}>
              {item.field_count} campos · {item.response_count} respostas
            </Text>
          </View>
        </View>
        <View style={[styles.activeBadge, { backgroundColor: item.active ? `${theme.statusValidated}20` : `${theme.muted}` }]}>
          <Text style={[styles.activeBadgeText, { color: item.active ? theme.statusValidated : theme.mutedForeground }]}>
            {item.active ? 'Ativo' : 'Inativo'}
          </Text>
        </View>
      </View>

      {item.description ? (
        <Text style={[styles.formDescription, { color: theme.mutedForeground }]} numberOfLines={2}>
          {item.description}
        </Text>
      ) : null}

      <View style={styles.formCardActions}>
        <TouchableOpacity
          style={[styles.formActionBtn, { borderColor: theme.border }]}
          onPress={() => navigation.navigate('FormResponses', { formId: item.id, formTitle: item.title })}
        >
          <MessageSquare size={15} color={theme.primary} />
          <Text style={[styles.formActionText, { color: theme.primary }]}>Respostas</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.formActionBtn, { borderColor: theme.border }]}
          onPress={() => navigation.navigate('FormBuilder', { formId: item.id, formTitle: item.title })}
        >
          <Text style={[styles.formActionText, { color: theme.foreground }]}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.formActionBtn, { borderColor: theme.border }]}
          onPress={() => void handleToggleActive(item)}
        >
          <Text style={[styles.formActionText, { color: item.active ? theme.destructive : theme.statusValidated }]}>
            {item.active ? 'Desativar' : 'Ativar'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: theme.border }]}>
        {(['forms', 'responses'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && { borderBottomColor: theme.primary, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, { color: activeTab === tab ? theme.primary : theme.mutedForeground }]}>
              {tab === 'forms' ? 'Meus formularios' : 'Respostas'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={theme.primary} style={{ margin: 40 }} />
      ) : (
        <FlatList
          data={forms}
          renderItem={renderForm}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <ClipboardList size={48} color={theme.muted} />
              <Text style={[styles.emptyTitle, { color: theme.foreground }]}>Nenhum formulario</Text>
              <Text style={[styles.emptySubtitle, { color: theme.mutedForeground }]}>
                Crie formularios para enviar aos seus pacientes
              </Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => navigation.navigate('FormBuilder', {})}
        activeOpacity={0.85}
      >
        <Plus size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabText: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600' },
  listContent: { padding: 16, gap: 12, paddingBottom: 80 },
  formCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  formCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  formCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  formIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  formInfo: { flex: 1 },
  formTitle: { fontFamily: 'Inter', fontSize: 15, fontWeight: '700' },
  formMeta: { fontFamily: 'Inter', fontSize: 12, marginTop: 2 },
  activeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  activeBadgeText: { fontFamily: 'Inter', fontSize: 11, fontWeight: '700' },
  formDescription: { fontFamily: 'Inter', fontSize: 13, lineHeight: 20 },
  formCardActions: { flexDirection: 'row', gap: 8 },
  formActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  formActionText: { fontFamily: 'Inter', fontSize: 12, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyTitle: { fontFamily: 'Lora', fontSize: 18, fontWeight: '600' },
  emptySubtitle: { fontFamily: 'Inter', fontSize: 14, textAlign: 'center' },
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
});
