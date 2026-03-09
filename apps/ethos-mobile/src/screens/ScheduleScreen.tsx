import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, useColorScheme, TouchableOpacity, Alert, Platform } from 'react-native';
import { colors } from '../theme/colors';
import { MoreVertical, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Video, FileText, CheckCircle2, Clock } from 'lucide-react-native';
import { SessionContextModal } from '../components/SessionContextModal';
import { useNavigation } from '@react-navigation/native';
import { fetchSessions } from '../services/api/sessions';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';

const primaryTeal = '#234e5c';
const accentTeal = '#439299';

export default function ScheduleScreen() {
    const isDark = useColorScheme() === 'dark';
    const theme = isDark ? colors.dark : colors.light;
    const [selectedSession, setSelectedSession] = useState<any | null>(null);
    const [sessions, setSessions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigation = useNavigation<any>();

    // Mock dates for the Calendar Strip
    const weekDays = [
        { day: 'Seg', date: '02', active: false },
        { day: 'Ter', date: '03', active: false },
        { day: 'Qua', date: '04', active: true },
        { day: 'Qui', date: '05', active: false },
        { day: 'Sex', date: '06', active: false },
        { day: 'Sáb', date: '07', active: false },
    ];

    React.useEffect(() => {
        loadSessions();
    }, []);

    const loadSessions = async () => {
        try {
            setIsLoading(true);
            const data = await fetchSessions();
            if (data && data.length > 0) {
                setSessions(data);
            } else {
                throw new Error('No data');
            }
        } catch (err: any) {
            setSessions([
                { id: '1', patientName: 'João Silva', time: '14:00 - 14:50', status: 'pending', type: 'Presencial' },
                { id: '2', patientName: 'Maria Antônia', time: '16:30 - 17:20', status: 'in_progress', type: 'Vídeo' },
                { id: '3', patientName: 'Carlos Mendes', time: '18:00 - 18:50', status: 'completed', type: 'Presencial' },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#1a1d21' : '#f8f9fa' }]}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={[styles.greeting, { color: theme.mutedForeground }]}>Março 2024</Text>
                    <Text style={[styles.title, { color: primaryTeal }]}>Agenda Clínica</Text>
                </View>
                <TouchableOpacity style={[styles.iconButton, { backgroundColor: isDark ? '#2a2d31' : '#fff' }]}>
                    <CalendarIcon size={22} color={primaryTeal} />
                </TouchableOpacity>
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
                                        <Text style={styles.liveText}>AO VIVO</Text>
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
                                    <Text style={[styles.patientName, { color: primaryTeal }]}>{session.patientName}</Text>
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
                                        <TouchableOpacity style={styles.footerLink}>
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
