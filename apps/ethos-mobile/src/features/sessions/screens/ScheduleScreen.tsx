import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, useColorScheme, TouchableOpacity, Alert, Platform, Modal } from 'react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { MoreVertical, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Video, FileText, CheckCircle2, Clock, Search, Bell } from 'lucide-react-native';
import { SessionContextModal } from '../components/SessionContextModal';
import { useNavigation } from '@react-navigation/native';
import { fetchSessions, fetchPatients } from '../../../shared/services/api/sessions';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';

const primaryTeal = '#234e5c';
const accentTeal = '#439299';

export default function ScheduleScreen() {
    const isDark = useColorScheme() === 'dark';
    const theme = useTheme();
    const [selectedSession, setSelectedSession] = useState<any | null>(null);
    const [showCalendar, setShowCalendar] = useState(false);
    const [sessions, setSessions] = useState<any[]>([]);
    const [patientMap, setPatientMap] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const navigation = useNavigation<any>();

    const today = new Date();
    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - today.getDay() + 1 + i);
        const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        return {
            day: dayNames[d.getDay()],
            date: String(d.getDate()).padStart(2, '0'),
            active: d.toDateString() === today.toDateString(),
            fullDate: d,
        };
    });

    const loadSessions = useCallback(async () => {
        setIsLoading(true);
        try {
            const [data, patients] = await Promise.all([fetchSessions(), fetchPatients()]);
            const map: Record<string, string> = {};
            (patients as any[]).forEach(p => { map[p.id] = p.label ?? p.name ?? '—'; });
            setPatientMap(map);
            setSessions(Array.isArray(data) ? data : []);
        } catch {
            setSessions([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { loadSessions(); }, [loadSessions]);

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#1a1d21' : '#f8f9fa' }]}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={[styles.greeting, { color: theme.mutedForeground }]}>Março 2024</Text>
                    <Text style={[styles.title, { color: primaryTeal }]}>Agenda Clínica</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity style={[styles.iconButton, { backgroundColor: isDark ? '#2a2d31' : '#fff' }]} onPress={() => navigation.navigate('Search')}>
                        <Search size={22} color={primaryTeal} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.iconButton, { backgroundColor: isDark ? '#2a2d31' : '#fff' }]} onPress={() => navigation.navigate('Notifications')}>
                        <Bell size={22} color={primaryTeal} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.iconButton, { backgroundColor: isDark ? '#2a2d31' : '#fff' }]} onPress={() => setShowCalendar(true)}>
                        <CalendarIcon size={22} color={primaryTeal} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Calendar Strip */}
            <View style={styles.calendarStrip}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.calendarScroll}>
                    {weekDays.map((item, idx) => (
                        <TouchableOpacity
                            key={idx}
                            style={[
                                styles.dayCard,
                                item.active && styles.activeDayCard,
                                { backgroundColor: item.active ? primaryTeal : (isDark ? '#2a2d31' : '#fff') }
                            ]}
                        >
                            <Text style={[styles.dayText, { color: item.active ? '#fff' : theme.mutedForeground }]}>{item.day}</Text>
                            <Text style={[styles.dateNumber, { color: item.active ? '#fff' : primaryTeal }]}>{item.date}</Text>
                            {item.active && <View style={styles.activeDot} />}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: primaryTeal }]}>Sessões de Hoje</Text>
                    <View style={styles.sessionCount}>
                        <Text style={styles.sessionCountText}>3 agendadas</Text>
                    </View>
                </View>

                {sessions.map((session, index) => (
                    <Animated.View
                        key={session.id}
                        entering={FadeInDown.delay(index * 100).duration(500)}
                    >
                        <TouchableOpacity
                            style={[styles.sessionCard, { backgroundColor: isDark ? '#2a2d31' : '#fff' }]}
                            onPress={() => navigation.navigate('SessionHub', { session })}
                        >
                            <View style={styles.sessionHeaderRow}>
                                <View style={styles.timeWrapper}>
                                    <Clock size={14} color={accentTeal} />
                                    <Text style={[styles.timeLabel, { color: accentTeal }]}>{session.time}</Text>
                                </View>
                                {session.status === 'in_progress' && (
                                    <View style={styles.liveBadge}>
                                        <View style={styles.liveDot} />
                                        <Text style={styles.liveText}>EM ANDAMENTO</Text>
                                    </View>
                                )}
                                {session.status === 'completed' && (
                                    <View style={styles.completedBadge}>
                                        <CheckCircle2 size={12} color="#16a34a" />
                                        <Text style={styles.completedText}>CONCLUÍDA</Text>
                                    </View>
                                )}
                            </View>

                            <View style={styles.patientRow}>
                                <View style={styles.patientInfo}>
                                    <Text style={[styles.patientName, { color: primaryTeal }]}>{session.patientName ?? patientMap[session.patient_id] ?? '—'}</Text>
                                    <View style={styles.typeTag}>
                                        {session.type === 'Vídeo' ? (
                                            <Video size={14} color={theme.mutedForeground} />
                                        ) : (
                                            <CalendarIcon size={14} color={theme.mutedForeground} />
                                        )}
                                        <Text style={[styles.typeText, { color: theme.mutedForeground }]}>{session.type}</Text>
                                    </View>
                                </View>
                                <TouchableOpacity style={styles.moreIcon} onPress={() => setSelectedSession(session)}>
                                    <MoreVertical size={20} color={theme.mutedForeground} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.cardFooter}>
                                <View style={styles.footerActions}>
                                    {session.status === 'completed' ? (
                                        <TouchableOpacity style={styles.footerLink} onPress={() => navigation.navigate('MainTabs', { screen: 'Documents', params: { showBack: true } })}>
                                            <FileText size={14} color={accentTeal} />
                                            <Text style={[styles.footerLinkText, { color: accentTeal }]}>Ver Prontuário</Text>
                                        </TouchableOpacity>
                                    ) : (
                                        <TouchableOpacity style={styles.footerLink}>
                                            <Clock size={14} color={theme.mutedForeground} />
                                            <Text style={[styles.footerLinkText, { color: theme.mutedForeground }]}>Anamnese Pendente</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                                <ChevronRight size={18} color={theme.mutedForeground} />
                            </View>
                        </TouchableOpacity>
                    </Animated.View>
                ))}
            </ScrollView>

            <SessionContextModal
                visible={!!selectedSession}
                onClose={() => setSelectedSession(null)}
                onValidate={() => Alert.alert('Ação', `Validar prontuário`)}
                onEdit={() => Alert.alert('Ação', `Editar sessão`)}
                onDelete={() => Alert.alert('Ação', `Excluir sessão`)}
            />

            <Modal visible={showCalendar} transparent animationType="slide" onRequestClose={() => setShowCalendar(false)}>
                <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={() => setShowCalendar(false)} />
                <View style={{ backgroundColor: isDark ? '#1e2126' : '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, marginTop: -24 }}>
                    <Text style={{ fontSize: 18, fontFamily: 'Inter', fontWeight: '700', color: '#234e5c', marginBottom: 16, textAlign: 'center' }}>
                        Março 2024
                    </Text>
                    <Text style={{ fontSize: 14, fontFamily: 'Inter', color: theme.mutedForeground, textAlign: 'center', lineHeight: 22 }}>
                        Calendário completo em breve.{'\n'}Por enquanto, use a barra semanal acima.
                    </Text>
                    <TouchableOpacity onPress={() => setShowCalendar(false)} style={{ marginTop: 24, backgroundColor: '#234e5c', borderRadius: 16, height: 52, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ color: '#fff', fontFamily: 'Inter', fontWeight: '700' }}>Fechar</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 20,
    },
    greeting: {
        fontSize: 14,
        fontFamily: 'Inter',
        marginBottom: 4,
    },
    title: {
        fontSize: 26,
        fontFamily: 'Lora',
        fontWeight: '700',
    },
    iconButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 10,
        elevation: 2,
    },
    calendarStrip: {
        paddingVertical: 10,
        paddingBottom: 20,
    },
    calendarScroll: {
        paddingHorizontal: 20,
        gap: 12,
    },
    dayCard: {
        width: 65,
        height: 90,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    activeDayCard: {
        shadowColor: primaryTeal,
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: 12,
        elevation: 5,
    },
    dayText: {
        fontSize: 12,
        fontFamily: 'Inter',
        fontWeight: '600',
        marginBottom: 8,
    },
    dateNumber: {
        fontSize: 20,
        fontFamily: 'Inter',
        fontWeight: '700',
    },
    activeDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#fff',
        marginTop: 6,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 100,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        marginTop: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Lora',
        fontWeight: '700',
    },
    sessionCount: {
        backgroundColor: 'rgba(67, 146, 153, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    sessionCountText: {
        fontSize: 12,
        fontFamily: 'Inter',
        color: accentTeal,
        fontWeight: '600',
    },
    sessionCard: {
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 15,
        elevation: 3,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)',
    },
    sessionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    timeWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    timeLabel: {
        fontSize: 12,
        fontFamily: 'Inter',
        fontWeight: '700',
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fee2e2',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#ef4444',
    },
    liveText: {
        fontSize: 10,
        fontFamily: 'Inter',
        fontWeight: '800',
        color: '#ef4444',
    },
    completedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0fdf4',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    completedText: {
        fontSize: 10,
        fontFamily: 'Inter',
        fontWeight: '800',
        color: '#16a34a',
    },
    patientRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    patientInfo: {
        flex: 1,
    },
    patientName: {
        fontSize: 20,
        fontFamily: 'Lora',
        fontWeight: '700',
        marginBottom: 4,
    },
    typeTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    typeText: {
        fontSize: 13,
        fontFamily: 'Inter',
    },
    moreIcon: {
        padding: 8,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    footerActions: {
        flexDirection: 'row',
        gap: 16,
    },
    footerLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    footerLinkText: {
        fontSize: 12,
        fontFamily: 'Inter',
        fontWeight: '600',
    }
});
