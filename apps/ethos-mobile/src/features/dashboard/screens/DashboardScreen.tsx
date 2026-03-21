// ethos-mobile/src/screens/DashboardScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, useColorScheme, TouchableOpacity, Alert, Image, StatusBar } from 'react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import {
    Search, Bell, AlertTriangle, Calendar
} from 'lucide-react-native';
import { SessionContextModal } from '../../../features/sessions/components/SessionContextModal';
import { useNavigation } from '@react-navigation/native';
import { useDashboard } from '../../../shared/hooks/useDashboard';
import type { Session as ApiSession } from '@ethos/shared';
import { avatarPlaceholder } from '../../../shared/assets/avatar_placeholder';
import { AlertCard } from '../components/AlertCard';
import { NextSessionCard } from '../components/NextSessionCard';
import { FinanceSummaryCard } from '../components/FinanceSummaryCard';

export default function DashboardScreen() {
    const isDark = useColorScheme() === 'dark';
    const theme = useTheme();
    const [selectedSession, setSelectedSession] = useState<ApiSession | null>(null);
    const { sessions, isLoading, error } = useDashboard();
    const navigation = useNavigation<any>();

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

                <AlertCard
                    overdueReportsCount={3}
                    pendingPaymentsAmount="R$ 450"
                    pendingPaymentsCount={2}
                />

                {/* Próxima Sessão Section */}
                <View style={styles.sectionHeader}>
                    <Calendar size={20} color={theme.primary} />
                    <Text style={[styles.sectionTitle, { color: theme.foreground }]}>Próxima Sessão</Text>
                    <TouchableOpacity style={{ marginLeft: 'auto' }}>
                        <Text style={[styles.inlineLink, { color: theme.mutedForeground }]}>Ver agenda</Text>
                    </TouchableOpacity>
                </View>

                <NextSessionCard
                    timeLabel="AGORA ÀS 14:00"
                    patientName="Beatriz Mendonça"
                    sessionLabel="Sessão #12"
                    focusText="Gestão de Ansiedade e Ética"
                    onPressSession={() => navigation.navigate('SessionHub', { patientName: 'Beatriz Mendonça', time: 'Agora às 14:00', status: 'pending' })}
                    onPressRecords={() => navigation.navigate('Documents')}
                />

                {/* Resumo Financeiro Section */}
                <FinanceSummaryCard
                    totalLabel="Total Estimado"
                    totalValue="R$ 8.420,00"
                    trendBadge="+12% vs jan"
                    progressItems={[
                        { label: 'Recebido (R$ 6.200)', percent: 74, color: '#00ccdb' },
                        { label: 'Pendente (R$ 2.220)', percent: 26, color: '#ffae5d' },
                    ]}
                />

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
});
