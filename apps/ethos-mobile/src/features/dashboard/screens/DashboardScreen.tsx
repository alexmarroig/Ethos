// ethos-mobile/src/screens/DashboardScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, useColorScheme, TouchableOpacity, Alert, Image, StatusBar, Platform } from 'react-native';
import { colors } from '../theme/colors';
import {
    MoreVertical, Brain, Search, Bell, AlertTriangle, FileText,
    Banknote, Play, Calendar, Users, Mic, Settings, ChevronRight
} from 'lucide-react-native';
import { SessionContextModal } from '../components/SessionContextModal';
import { useNavigation } from '@react-navigation/native';
import { fetchSessions } from '../services/api/sessions';
import Animated, { FadeInDown, FadeInRight, FadeIn, FadeInLeft } from 'react-native-reanimated';
import type { Session as ApiSession } from '@ethos/shared';
import { avatarPlaceholder } from '../assets/avatar_placeholder';

export default function DashboardScreen() {
    const isDark = useColorScheme() === 'dark';
    const theme = isDark ? colors.dark : colors.light;
    const [selectedSession, setSelectedSession] = useState<ApiSession | null>(null);
    const [sessions, setSessions] = useState<ApiSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigation = useNavigation<any>();
    const primaryTeal = '#234e5c';
    const accentTeal = '#00ccdb';

    React.useEffect(() => {
        loadSessions();
    }, []);

    const loadSessions = async () => {
        if (Platform.OS === 'web') {
            setSessions([
                { id: '1', patientId: 'Patient 1 (Demo)', scheduledAt: '14:00', status: 'pending' },
                { id: '2', patientId: 'Patient 2 (Demo)', scheduledAt: '16:00', status: 'completed' },
            ] as ApiSession[]);
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            const data = await fetchSessions();
            setSessions(data);
        } catch (err: any) {
            console.error("Failed to fetch sessions: ", err);
            setError(err.message || 'Erro ao carregar sessões offline.');

            // Fallback for visual development
            setSessions([
                { id: '1', patientId: 'Patient 1 (Fallback)', scheduledAt: '14:00', status: 'pending' },
                { id: '2', patientId: 'Patient 2 (Fallback)', scheduledAt: '16:00', status: 'completed' },
            ] as ApiSession[]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            {/* Header section */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Image source={{ uri: avatarPlaceholder }} style={styles.avatar} />
                    <View>
                        <Text style={[styles.headerGreeting, { color: theme.mutedForeground }]}>Bem-vindo de volta</Text>
                        <Text style={[styles.headerName, { color: theme.foreground }]}>Olá, Dr. Silva</Text>
                    </View>
                </View>
                <View style={styles.headerRight}>
                    <TouchableOpacity style={[styles.headerIcon, { backgroundColor: isDark ? '#272b34' : '#edebe8' }]}>
                        <Search size={22} color={theme.foreground} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.headerIcon, { backgroundColor: isDark ? '#272b34' : '#edebe8' }]}>
                        <Bell size={22} color={theme.foreground} />
                        <View style={styles.notificationDot} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* Alertas Section */}
                <View style={styles.sectionHeader}>
                    <AlertTriangle size={20} color={theme.primary} />
                    <Text style={[styles.sectionTitle, { color: theme.foreground }]}>Alertas</Text>
                </View>

                <View style={styles.alertGrid}>
                    <Animated.View entering={FadeInDown.delay(100).duration(800)} style={styles.alertCol}>
                        <TouchableOpacity style={[styles.alertCardSmall, { backgroundColor: isDark ? '#272b34' : '#fff', borderColor: '#f0f0f0' }]}>
                            <View style={[styles.alertIconWrapper, { backgroundColor: '#fee2e2' }]}>
                                <FileText size={20} color="#ef4444" />
                                <View style={styles.alertBadgeSmall}>
                                    <Text style={styles.alertBadgeText}>3</Text>
                                </View>
                            </View>
                            <Text style={[styles.alertTitleSmall, { color: primaryTeal }]}>Laudos{'\n'}Atrasados</Text>
                            <Text style={[styles.alertSubSmall, { color: '#00ccdb' }]}>Revisão ética{'\n'}pendente</Text>
                        </TouchableOpacity>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(200).duration(800)} style={styles.alertCol}>
                        <TouchableOpacity style={[styles.alertCardSmall, { backgroundColor: isDark ? '#272b34' : '#fff', borderColor: '#f0f0f0' }]}>
                            <View style={[styles.alertIconWrapper, { backgroundColor: '#fff7ed' }]}>
                                <Banknote size={20} color="#f97316" />
                                <View style={[styles.alertBadgeLarge, { backgroundColor: '#fff7ed' }]}>
                                    <Text style={[styles.alertBadgeTextLarge, { color: '#f97316' }]}>R$ 450</Text>
                                </View>
                            </View>
                            <Text style={[styles.alertTitleSmall, { color: primaryTeal }]}>Pagamentos</Text>
                            <Text style={[styles.alertSubSmall, { color: '#00ccdb' }]}>2 sessões pendentes</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </View>

                {/* Próxima Sessão Section */}
                <View style={styles.sectionHeader}>
                    <Calendar size={20} color={theme.primary} />
                    <Text style={[styles.sectionTitle, { color: theme.foreground }]}>Próxima Sessão</Text>
                    <TouchableOpacity style={{ marginLeft: 'auto' }}>
                        <Text style={[styles.inlineLink, { color: theme.mutedForeground }]}>Ver agenda</Text>
                    </TouchableOpacity>
                </View>

                <Animated.View entering={FadeInDown.delay(300).duration(800)}>
                    <TouchableOpacity
                        style={[styles.highlightCard, { backgroundColor: isDark ? '#1e2d35' : '#fff', borderWidth: isDark ? 0 : 1, borderColor: '#f0f0f0' }]}
                        onPress={() => navigation.navigate('SessionHub', { patientName: 'Beatriz Mendonça', time: 'Agora às 14:00', status: 'pending' })}
                    >
                        <View style={styles.highlightHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.timeLabel, { color: '#00ccdb' }]}>AGORA ÀS 14:00</Text>
                                <Text style={[styles.highlightPatientName, { color: primaryTeal }]}>Beatriz Mendonça</Text>
                                <View style={styles.sessionInfoRow}>
                                    <FileText size={16} color={theme.mutedForeground} />
                                    <Text style={[styles.highlightSessionType, { color: theme.mutedForeground }]}>Sessão #12</Text>
                                </View>
                            </View>
                            <TouchableOpacity style={styles.videoButton}>
                                <Play size={24} color="#fff" fill="#fff" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.highlightDivider} />

                        <View style={styles.highlightFooter}>
                            <Text style={[styles.focoText, { color: theme.mutedForeground }]}>
                                Foco: <Text style={styles.italicText}>Gestão de Ansiedade e Ética</Text>
                            </Text>
                            <TouchableOpacity style={styles.verProntuario} onPress={() => navigation.navigate('Documents')}>
                                <Text style={[styles.verProntuarioText, { color: '#00ccdb' }]}>VER PRONTUÁRIO</Text>
                                <ChevronRight size={16} color="#00ccdb" />
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </Animated.View>

                {/* Resumo Financeiro Section */}
                <Animated.View entering={FadeInDown.delay(400).duration(800)}>
                    <View style={[styles.financeCardLarge, { backgroundColor: isDark ? '#272b34' : '#fff', borderColor: theme.border }]}>
                        <View style={styles.financeHeaderLarge}>
                            <View>
                                <Text style={[styles.financeLabelLarge, { color: theme.mutedForeground }]}>Total Estimado</Text>
                                <Text style={[styles.financeValueLarge, { color: primaryTeal }]}>R$ 8.420,00</Text>
                            </View>
                            <View style={styles.percentBadge}>
                                <Text style={styles.percentText}>+12% vs jan</Text>
                            </View>
                        </View>

                        {/* Recebido Progress */}
                        <View style={styles.progressContainer}>
                            <View style={styles.progressLabelRow}>
                                <Text style={[styles.progressLabel, { color: theme.mutedForeground }]}>Recebido (R$ 6.200)</Text>
                                <Text style={[styles.progressPercent, { color: theme.foreground }]}>74%</Text>
                            </View>
                            <View style={styles.progressBarBg}>
                                <View style={[styles.progressBarFill, { width: '74%', backgroundColor: '#00ccdb' }]} />
                            </View>
                        </View>

                        {/* Pendente Progress */}
                        <View style={styles.progressContainer}>
                            <View style={styles.progressLabelRow}>
                                <Text style={[styles.progressLabel, { color: theme.mutedForeground }]}>Pendente (R$ 2.220)</Text>
                                <Text style={[styles.progressPercent, { color: theme.foreground }]}>26%</Text>
                            </View>
                            <View style={styles.progressBarBg}>
                                <View style={[styles.progressBarFill, { width: '26%', backgroundColor: '#ffae5d' }]} />
                            </View>
                        </View>
                    </View>
                </Animated.View>

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
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    headerGreeting: {
        fontSize: 12,
        fontFamily: 'Inter',
    },
    headerName: {
        fontSize: 20,
        fontFamily: 'Lora',
        fontWeight: '700',
    },
    headerRight: {
        flexDirection: 'row',
        gap: 12,
    },
    headerIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notificationDot: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#00ccdb',
        borderWidth: 2,
        borderColor: '#fff',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 150,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 24,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Lora',
        fontWeight: '700',
    },
    inlineLink: {
        fontSize: 14,
        fontFamily: 'Inter',
    },
    alertGrid: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 24,
    },
    alertCol: {
        flex: 1,
    },
    alertCardSmall: {
        padding: 20,
        borderRadius: 32,
        borderWidth: 1,
        height: 180,
    },
    alertIconWrapper: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    alertBadgeSmall: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#fee2e2',
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    alertBadgeText: {
        fontSize: 10,
        fontFamily: 'Inter',
        fontWeight: '700',
        color: '#ef4444',
    },
    alertBadgeLarge: {
        position: 'absolute',
        top: -4,
        right: -30,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    alertBadgeTextLarge: {
        fontSize: 12,
        fontFamily: 'Inter',
        fontWeight: '700',
    },
    alertTitleSmall: {
        fontSize: 16,
        fontFamily: 'Lora',
        fontWeight: '700',
        marginBottom: 4,
    },
    alertSubSmall: {
        fontSize: 12,
        fontFamily: 'Inter',
        lineHeight: 18,
    },
    highlightCard: {
        borderRadius: 32,
        padding: 24,
        marginBottom: 24,
    },
    highlightHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    timeLabel: {
        fontSize: 12,
        fontFamily: 'Inter',
        fontWeight: '700',
        marginBottom: 4,
    },
    highlightPatientName: {
        fontSize: 22,
        fontFamily: 'Lora',
        fontWeight: '700',
    },
    sessionInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    highlightSessionType: {
        fontSize: 14,
        fontFamily: 'Inter',
    },
    videoButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#00ccdb',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#00ccdb',
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 10,
        elevation: 5,
    },
    highlightDivider: {
        height: 1,
        backgroundColor: '#f0f0f0',
        marginVertical: 20,
    },
    highlightFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    focoText: {
        flex: 1,
        fontSize: 13,
        fontFamily: 'Inter',
        lineHeight: 18,
    },
    italicText: {
        fontStyle: 'italic',
    },
    verProntuario: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    verProntuarioText: {
        fontSize: 12,
        fontFamily: 'Inter',
        fontWeight: '700',
    },
    financeCardLarge: {
        padding: 24,
        borderRadius: 32,
        borderWidth: 1,
        marginBottom: 40,
    },
    financeHeaderLarge: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    financeLabelLarge: {
        fontSize: 13,
        fontFamily: 'Inter',
        marginBottom: 8,
    },
    financeValueLarge: {
        fontSize: 32,
        fontFamily: 'Lora',
        fontWeight: '700',
    },
    percentBadge: {
        backgroundColor: '#f0fdf4',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    percentText: {
        color: '#16a34a',
        fontSize: 12,
        fontFamily: 'Inter',
        fontWeight: '700',
    },
    progressContainer: {
        marginBottom: 16,
    },
    progressLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    progressLabel: {
        fontSize: 13,
        fontFamily: 'Inter',
    },
    progressPercent: {
        fontSize: 13,
        fontFamily: 'Inter',
        fontWeight: '700',
    },
    progressBarBg: {
        height: 8,
        backgroundColor: '#f5f5f5',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    bottomTab: {
        position: 'absolute',
        bottom: 30,
        left: 20,
        right: 20,
        height: 80,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 40,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 20,
        elevation: 10,
        borderTopWidth: 0,
    },
    tabItem: {
        alignItems: 'center',
        gap: 4,
    },
    tabLabel: {
        fontSize: 10,
        fontFamily: 'Inter',
        fontWeight: '600',
    },
    centerTabContainer: {
        alignItems: 'center',
        top: -20,
    },
    centerTab: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#234e5c',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#234e5c',
        shadowOpacity: 0.4,
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: 12,
        elevation: 8,
    }
});



