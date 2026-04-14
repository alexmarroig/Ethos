import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, StyleSheet, ScrollView,
    TouchableOpacity, useColorScheme, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { ChevronLeft, Save } from 'lucide-react-native';
import { createPatient, updatePatient } from '../../../shared/services/api/sessions';

const primaryTeal = '#234e5c';
const accentTeal = '#439299';

interface Field { label: string; key: string; placeholder: string; keyboardType?: any; multiline?: boolean; }

const FIELDS: Field[] = [
    { label: 'Nome completo *', key: 'label', placeholder: 'Ex: João da Silva' },
    { label: 'Telefone / WhatsApp', key: 'phone', placeholder: 'Ex: (11) 99999-9999', keyboardType: 'phone-pad' },
    { label: 'E-mail', key: 'email', placeholder: 'Ex: joao@email.com', keyboardType: 'email-address' },
    { label: 'CPF', key: 'cpf', placeholder: 'Ex: 000.000.000-00', keyboardType: 'numeric' },
    { label: 'Data de nascimento', key: 'birth_date', placeholder: 'Ex: 15/03/1990' },
    { label: 'Observações', key: 'notes', placeholder: 'Histórico, encaminhamento, observações...', multiline: true },
];

export default function CreatePatientScreen({ navigation, route }: any) {
    const editMode = route.params?.editMode ?? false;
    const existingPatient = route.params?.patient;
    const isDark = useColorScheme() === 'dark';
    const theme = useTheme();
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<Record<string, string>>({
        label: '', phone: '', email: '', cpf: '', birth_date: '', notes: ''
    });

    useEffect(() => {
        if (editMode && existingPatient) {
            setForm({
                label: existingPatient.name ?? '',
                phone: existingPatient.phone ?? '',
                email: existingPatient.email ?? '',
                cpf: existingPatient.cpf ?? '',
                birth_date: existingPatient.birth_date ?? '',
                notes: existingPatient.notes ?? '',
            });
        }
    }, [editMode, existingPatient]);

    const handleSave = async () => {
        if (!form.label.trim()) {
            Alert.alert('Campo obrigatório', 'Nome do paciente é obrigatório.');
            return;
        }
        setSaving(true);
        try {
            if (editMode && existingPatient) {
                await updatePatient(existingPatient.id, {
                    label: form.label.trim(),
                    phone: form.phone || undefined,
                    email: form.email || undefined,
                    cpf: form.cpf || undefined,
                    birth_date: form.birth_date || undefined,
                    notes: form.notes || undefined,
                });
                Alert.alert('Sucesso', 'Paciente atualizado!');
                navigation.goBack();
            } else {
                await createPatient({
                    label: form.label.trim(),
                    phone: form.phone || undefined,
                    email: form.email || undefined,
                    cpf: form.cpf || undefined,
                    birth_date: form.birth_date || undefined,
                    notes: form.notes || undefined,
                });
                Alert.alert('Sucesso', 'Paciente cadastrado!', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            }
        } catch (e: any) {
            Alert.alert('Erro', e?.message ?? 'Falha ao salvar paciente.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[styles.container, { backgroundColor: isDark ? '#1a1d21' : '#f8f9fa' }]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <ChevronLeft size={24} color={primaryTeal} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: primaryTeal }]}>
                        {editMode ? 'Editar Paciente' : 'Novo Paciente'}
                    </Text>
                    <TouchableOpacity
                        style={[styles.saveBtn, { backgroundColor: saving ? '#94a3b8' : primaryTeal }]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        <Save size={18} color="#fff" />
                        <Text style={styles.saveBtnText}>{saving ? 'Salvando...' : 'Salvar'}</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView
                    contentContainerStyle={styles.scroll}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {FIELDS.map(field => (
                        <View key={field.key} style={styles.fieldGroup}>
                            <Text style={[styles.label, { color: theme.mutedForeground }]}>{field.label}</Text>
                            <TextInput
                                style={[
                                    styles.input,
                                    field.multiline && styles.inputMultiline,
                                    {
                                        backgroundColor: isDark ? '#2a2d31' : '#fff',
                                        color: primaryTeal,
                                        borderColor: isDark ? '#3a3d41' : '#e2e8f0',
                                    }
                                ]}
                                placeholder={field.placeholder}
                                placeholderTextColor={theme.mutedForeground}
                                value={form[field.key]}
                                onChangeText={v => setForm(prev => ({ ...prev, [field.key]: v }))}
                                keyboardType={field.keyboardType ?? 'default'}
                                multiline={field.multiline}
                                numberOfLines={field.multiline ? 4 : 1}
                                textAlignVertical={field.multiline ? 'top' : 'center'}
                                autoCapitalize={field.key === 'email' ? 'none' : 'words'}
                            />
                        </View>
                    ))}
                </ScrollView>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 },
    backBtn: { padding: 8, marginRight: 8 },
    headerTitle: { flex: 1, fontSize: 20, fontFamily: 'Lora', fontWeight: '700' },
    saveBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
    saveBtnText: { color: '#fff', fontFamily: 'Inter', fontWeight: '600', fontSize: 14 },
    scroll: { padding: 20, paddingBottom: 60 },
    fieldGroup: { marginBottom: 20 },
    label: { fontSize: 12, fontFamily: 'Inter', fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: { borderRadius: 14, padding: 14, fontSize: 15, fontFamily: 'Inter', borderWidth: 1 },
    inputMultiline: { minHeight: 100, paddingTop: 14 },
});
