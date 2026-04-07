import React, { useState, useRef } from 'react';
import {
    View, Text, TextInput, StyleSheet, TouchableOpacity,
    useColorScheme, Alert, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { ChevronLeft, Save, FileText } from 'lucide-react-native';
import { saveClinicalNote } from '../../../shared/services/api/sessions';

const primaryTeal = '#234e5c';
const accentTeal = '#439299';

const TEMPLATES = [
    { label: 'SOAP', text: 'S (Subjetivo):\n\nO (Objetivo):\n\nA (Avaliação):\n\nP (Plano):' },
    { label: 'Livre', text: '' },
    { label: 'Evolução', text: 'Sessão:\nData:\n\nConteúdo abordado:\n\nObservações clínicas:\n\nEncaminhamentos:' },
];

export default function ClinicalNoteEditorScreen({ navigation, route }: any) {
    const { sessionId, patientName } = (route.params ?? {}) as { sessionId?: string; patientName?: string };
    const isDark = useColorScheme() === 'dark';
    const theme = useTheme();
    const [content, setContent] = useState('');
    const [saving, setSaving] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(1); // default: Livre
    const mountedRef = useRef(true);

    const handleTemplateSelect = (index: number) => {
        setSelectedTemplate(index);
        if (TEMPLATES[index].text && !content.trim()) {
            setContent(TEMPLATES[index].text);
        }
    };

    const handleSave = async () => {
        if (!content.trim() || content.trim().length < 10) {
            Alert.alert('Nota muito curta', 'Escreva pelo menos 10 caracteres.');
            return;
        }
        if (!sessionId) {
            Alert.alert('Sessão não vinculada', 'Esta nota precisa de uma sessão associada.');
            return;
        }
        setSaving(true);
        try {
            await saveClinicalNote(sessionId, content.trim());
            Alert.alert('Nota salva', 'A nota clínica foi registrada com sucesso.', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (e: any) {
            if (mountedRef.current) {
                Alert.alert('Erro', e?.message ?? 'Falha ao salvar nota.');
            }
        } finally {
            if (mountedRef.current) setSaving(false);
        }
    };

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[styles.container, { backgroundColor: isDark ? '#1a1d21' : '#f8f9fa' }]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <ChevronLeft size={24} color={primaryTeal} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.headerTitle, { color: primaryTeal }]}>Nota Clínica</Text>
                        {patientName ? (
                            <Text style={[styles.headerSub, { color: theme.mutedForeground }]}>{patientName}</Text>
                        ) : null}
                    </View>
                    <TouchableOpacity
                        style={[styles.saveBtn, { backgroundColor: saving ? '#94a3b8' : primaryTeal }]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        <Save size={18} color="#fff" />
                        <Text style={styles.saveBtnText}>{saving ? 'Salvando...' : 'Salvar'}</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.templateRow}>
                    <FileText size={14} color={theme.mutedForeground} />
                    <Text style={[styles.templateLabel, { color: theme.mutedForeground }]}>Modelo:</Text>
                    {TEMPLATES.map((t, i) => (
                        <TouchableOpacity
                            key={t.label}
                            style={[
                                styles.templateChip,
                                { backgroundColor: selectedTemplate === i ? primaryTeal : (isDark ? '#2a2d31' : '#fff') }
                            ]}
                            onPress={() => handleTemplateSelect(i)}
                        >
                            <Text style={[styles.templateChipText, { color: selectedTemplate === i ? '#fff' : primaryTeal }]}>
                                {t.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
                    <TextInput
                        style={[
                            styles.editor,
                            {
                                backgroundColor: isDark ? '#2a2d31' : '#fff',
                                color: primaryTeal,
                                borderColor: isDark ? '#3a3d41' : '#e2e8f0',
                            }
                        ]}
                        multiline
                        placeholder="Escreva a nota clínica aqui..."
                        placeholderTextColor={theme.mutedForeground}
                        value={content}
                        onChangeText={setContent}
                        textAlignVertical="top"
                        autoFocus
                    />
                </ScrollView>

                <View style={styles.footer}>
                    <Text style={[styles.charCount, { color: theme.mutedForeground }]}>
                        {content.length} caracteres
                    </Text>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12 },
    backBtn: { padding: 8, marginRight: 8 },
    headerTitle: { fontSize: 20, fontFamily: 'Lora', fontWeight: '700' },
    headerSub: { fontSize: 13, fontFamily: 'Inter', marginTop: 2 },
    saveBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
    saveBtnText: { color: '#fff', fontFamily: 'Inter', fontWeight: '600', fontSize: 14 },
    templateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, marginBottom: 12, flexWrap: 'wrap' },
    templateLabel: { fontSize: 12, fontFamily: 'Inter', fontWeight: '600' },
    templateChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    templateChipText: { fontSize: 13, fontFamily: 'Inter', fontWeight: '600' },
    editor: { margin: 20, borderRadius: 16, padding: 16, minHeight: 400, fontSize: 15, fontFamily: 'Inter', borderWidth: 1, lineHeight: 24 },
    footer: { paddingHorizontal: 20, paddingBottom: 20, alignItems: 'flex-end' },
    charCount: { fontSize: 12, fontFamily: 'Inter' },
});
