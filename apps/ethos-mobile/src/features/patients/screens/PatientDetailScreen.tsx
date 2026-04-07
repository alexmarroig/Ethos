import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    useColorScheme,
} from 'react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { ChevronLeft, Phone, Mail, FileText, Calendar, Plus, Edit2 } from 'lucide-react-native';
import { fetchSessions } from '../../../shared/services/api/sessions';

const primaryTeal = '#234e5c';
const accentTeal = '#439299';

export default function PatientDetailScreen({ navigation, route }: any) {
    const { patient } = route.params as { patient: any };
    const isDark = useColorScheme() === 'dark';
    const theme = useTheme();
    const [sessions, setSessions] = useState<any[]>([]);
    const [loadingSessions, setLoadingSessions] = useState(true);

    useEffect(() => {
        fetchSessions()
            .then(all => setSessions(all.filter((s: any) => s.patient_id === patient.id)))
            .catch(() => setSessions([]))
            .finally(() => setLoadingSessions(false));
    }, [patient.id]);

    const statusLabel: Record<string, string> = {
        scheduled: 'Agendada',
        confirmed: 'Confirmada',
        completed: 'Realizada',
        missed: 'Faltou',
        in_progress: 'Em andamento',
    };

    const statusColor: Record<string, string> = {
        scheduled: '#3b82f6',
        confirmed: '#10b981',
        completed: '#6366f1',
        missed: '#ef4444',
        in_progress: '#f59e0b',
    };

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#1a1d21' : '#f8f9fa' }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ChevronLeft size={24} color={primaryTeal} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: primaryTeal }]}>Ficha do Paciente</Text>
                <TouchableOpacity
                    onPress={() => navigation.navigate('CreatePatient', { patient, editMode: true })}
                    style={styles.editBtn}
                >
                    <Edit2 size={20} color={accentTeal} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <View style={[styles.card, { backgroundColor: isDark ? '#2a2d31' : '#fff' }]}>
                    <View style={[styles.avatar, { backgroundColor: 'rgba(67,146,153,0.12)' }]}>
                        <Text style={[styles.avatarText, { color: accentTeal }]}>
                            {patient.name?.charAt(0)?.toUpperCase() ?? '?'}
                        </Text>
                    </View>
                    <Text style={[styles.name, { color: primaryTeal }]}>{patient.name}</Text>

                    {patient.phone ? (
                        <View style={styles.infoRow}>
                            <Phone size={16} color={accentTeal} />
                            <Text style={[styles.infoText, { color: theme.mutedForeground }]}>{patient.phone}</Text>
                        </View>
                    ) : null}
                    {patient.email ? (
                        <View style={styles.infoRow}>
                            <Mail size={16} color={accentTeal} />
                            <Text style={[styles.infoText, { color: theme.mutedForeground }]}>{patient.email}</Text>
                        </View>
                    ) : null}
                    {patient.cpf ? (
                        <View style={styles.infoRow}>
                            <FileText size={16} color={accentTeal} />
                            <Text style={[styles.infoText, { color: theme.mutedForeground }]}>CPF: {patient.cpf}</Text>
                        </View>
                    ) : null}
                    {patient.birth_date ? (
                        <View style={styles.infoRow}>
                            <Calendar size={16} color={accentTeal} />
                            <Text style={[styles.infoText, { color: theme.mutedForeground }]}>
                                Nascimento: {patient.birth_date}
                            </Text>
                        </View>
                    ) : null}
                    {patient.notes ? (
                        <View style={[styles.notesBox, { backgroundColor: isDark ? '#1a1d21' : '#f8f9fa' }]}>
                            <Text style={[styles.notesLabel, { color: theme.mutedForeground }]}>Observações</Text>
                            <Text style={[styles.notesText, { color: primaryTeal }]}>{patient.notes}</Text>
                        </View>
                    ) : null}
                </View>

                <View style={styles.actionsRow}>
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: primaryTeal }]}
                        onPress={() => navigation.navigate('SessionHub', { patientId: patient.id, patientName: patient.name })}
                    >
                        <FileText size={18} color="#fff" />
                        <Text style={styles.actionBtnText}>Nova Sessão</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: accentTeal }]}
                        onPress={() => navigation.navigate('ClinicalNoteEditor', { patientId: patient.id, patientName: patient.name })}
                    >
                        <Plus size={18} color="#fff" />
                        <Text style={styles.actionBtnText}>Nova Nota</Text>
                    </TouchableOpacity>
                </View>

                <Text style={[styles.sectionTitle, { color: primaryTeal }]}>Sessões</Text>
                {loadingSessions ? (
                    <Text style={[styles.emptyText, { color: theme.mutedForeground }]}>Carregando...</Text>
                ) : sessions.length === 0 ? (
                    <Text style={[styles.emptyText, { color: theme.mutedForeground }]}>Nenhuma sessão registrada.</Text>
                ) : (
                    sessions.map(session => (
                        <TouchableOpacity
                            key={session.id}
                            style={[styles.sessionRow, { backgroundColor: isDark ? '#2a2d31' : '#fff' }]}
                            onPress={() => navigation.navigate('SessionHub', { sessionId: session.id, patientId: patient.id, patientName: patient.name })}
                        >
                            <View>
                                <Text style={[styles.sessionDate, { color: primaryTeal }]}>
                                    {new Date(session.scheduled_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </Text>
                                <View style={[styles.statusBadge, { backgroundColor: (statusColor[session.status] ?? '#6b7280') + '22' }]}>
                                    <Text style={[styles.statusText, { color: statusColor[session.status] ?? '#6b7280' }]}>
                                        {statusLabel[session.status] ?? session.status}
                                    </Text>
                                </View>
                            </View>
                            <ChevronLeft size={18} color={theme.mutedForeground} style={{ transform: [{ rotate: '180deg' }] }} />
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 },
    backBtn: { padding: 8, marginRight: 8 },
    headerTitle: { flex: 1, fontSize: 20, fontFamily: 'Lora', fontWeight: '700' },
    editBtn: { padding: 8 },
    scroll: { padding: 20, paddingBottom: 100 },
    card: { borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 2 },
    avatar: { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    avatarText: { fontSize: 36, fontFamily: 'Lora', fontWeight: '700' },
    name: { fontSize: 22, fontFamily: 'Lora', fontWeight: '700', marginBottom: 16 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, alignSelf: 'flex-start' },
    infoText: { fontSize: 14, fontFamily: 'Inter' },
    notesBox: { width: '100%', borderRadius: 12, padding: 12, marginTop: 12 },
    notesLabel: { fontSize: 11, fontFamily: 'Inter', fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
    notesText: { fontSize: 14, fontFamily: 'Inter' },
    actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
    actionBtnText: { color: '#fff', fontFamily: 'Inter', fontWeight: '600', fontSize: 14 },
    sectionTitle: { fontSize: 18, fontFamily: 'Lora', fontWeight: '700', marginBottom: 12 },
    emptyText: { fontFamily: 'Inter', fontSize: 14, textAlign: 'center', marginVertical: 16 },
    sessionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 16, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 1 },
    sessionDate: { fontSize: 15, fontFamily: 'Inter', fontWeight: '600', marginBottom: 4 },
    statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
    statusText: { fontSize: 12, fontFamily: 'Inter', fontWeight: '600' },
});
