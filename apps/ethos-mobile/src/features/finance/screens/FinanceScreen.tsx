import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, useColorScheme, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { colors } from '../theme/colors';
import { Banknote, TrendingUp, TrendingDown, ChevronRight, Plus, Download, Filter, ArrowUpRight, ArrowDownLeft } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

const primaryTeal = '#234e5c';
const accentTeal = '#439299';
const { width } = Dimensions.get('window');

export default function FinanceScreen() {
    const isDark = useColorScheme() === 'dark';
    const theme = isDark ? colors.dark : colors.light;

    const transactions = [
        { id: '1', title: 'Sessão João Silva', value: 'R$ 180,00', date: 'Hoje, 14:00', type: 'income', status: 'received' },
        { id: '2', title: 'Sessão Maria Antônia', value: 'R$ 200,00', date: 'Hoje, 16:30', type: 'income', status: 'pending' },
        { id: '3', title: 'Aluguel Consultório', value: 'R$ 1.200,00', date: '01 Mar, 09:00', type: 'expense', status: 'paid' },
        { id: '4', title: 'Sessão Carlos Mendes', value: 'R$ 180,00', date: 'Ontem, 18:00', type: 'income', status: 'received' },
    ];

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#1a1d21' : '#f8f9fa' }]}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={[styles.subtitle, { color: theme.mutedForeground }]}>Fluxo de Caixa</Text>
                    <Text style={[styles.title, { color: primaryTeal }]}>Financeiro</Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={[styles.iconButton, { backgroundColor: isDark ? '#2a2d31' : '#fff' }]}>
                        <Download size={20} color={primaryTeal} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.iconButton, { backgroundColor: isDark ? '#2a2d31' : '#fff' }]}>
                        <Plus size={20} color={primaryTeal} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Main Card */}
                <Animated.View entering={FadeInDown.duration(600)} style={[styles.mainCard, { backgroundColor: primaryTeal }]}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardLabel}>Saldo Estimado (Março)</Text>
                        <View style={styles.monthBadge}>
                            <Text style={styles.monthText}>Este Mês</Text>
                        </View>
                    </View>
                    <Text style={styles.mainValue}>R$ 4.820,00</Text>

                    <View style={styles.summaryRow}>
                        <View style={styles.summaryItem}>
                            <View style={[styles.summaryIcon, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                                <TrendingUp size={16} color="#4ade80" />
                            </View>
                            <View>
                                <Text style={styles.summaryLabel}>Recebido</Text>
                                <Text style={styles.summaryValue}>R$ 3.120</Text>
                            </View>
                        </View>
                        <View style={styles.summaryDivider} />
                        <View style={styles.summaryItem}>
                            <View style={[styles.summaryIcon, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                                <TrendingDown size={16} color="#f87171" />
                            </View>
                            <View>
                                <Text style={styles.summaryLabel}>Despesas</Text>
                                <Text style={styles.summaryValue}>R$ 1.300</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.progressContainer}>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: '65%' }]} />
                        </View>
                        <Text style={styles.progressText}>65% da meta mensal atingida</Text>
                    </View>
                </Animated.View>

                {/* Quick Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={[styles.statCard, { backgroundColor: isDark ? '#2a2d31' : '#fff' }]}>
                        <Text style={[styles.statLabel, { color: theme.mutedForeground }]}>Pendentes</Text>
                        <Text style={[styles.statValue, { color: '#f59e0b' }]}>R$ 1.700</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: isDark ? '#2a2d31' : '#fff' }]}>
                        <Text style={[styles.statLabel, { color: theme.mutedForeground }]}>Previsão Abr</Text>
                        <Text style={[styles.statValue, { color: primaryTeal }]}>R$ 5.200</Text>
                    </View>
                </View>

                {/* Transitions Header */}
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: primaryTeal }]}>Transações Recentes</Text>
                    <TouchableOpacity>
                        <Text style={[styles.seeAll, { color: accentTeal }]}>Ver Tudo</Text>
                    </TouchableOpacity>
                </View>

                {/* Transactions List */}
                {transactions.map((item, index) => (
                    <Animated.View key={item.id} entering={FadeInUp.delay(index * 100).duration(500)}>
                        <TouchableOpacity style={[styles.transactionCard, { backgroundColor: isDark ? '#2a2d31' : '#fff' }]}>
                            <View style={[styles.transIcon, { backgroundColor: item.type === 'income' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(248, 113, 113, 0.1)' }]}>
                                {item.type === 'income' ?
                                    <ArrowUpRight size={20} color="#16a34a" /> :
                                    <ArrowDownLeft size={20} color="#dc2626" />
                                }
                            </View>
                            <View style={styles.transInfo}>
                                <Text style={[styles.transTitle, { color: primaryTeal }]}>{item.title}</Text>
                                <Text style={[styles.transDate, { color: theme.mutedForeground }]}>{item.date}</Text>
                            </View>
                            <View style={styles.transValueColumn}>
                                <Text style={[styles.transValue, { color: item.type === 'income' ? '#16a34a' : '#dc2626' }]}>
                                    {item.type === 'income' ? '+' : '-'} {item.value}
                                </Text>
                                <View style={[styles.statusBadge, { backgroundColor: item.status === 'received' || item.status === 'paid' ? '#f0fdf4' : '#fff7ed' }]}>
                                    <Text style={[styles.statusText, { color: item.status === 'received' || item.status === 'paid' ? '#16a34a' : '#ea580c' }]}>
                                        {item.status === 'received' ? 'Recebido' : item.status === 'pending' ? 'Pendente' : 'Pago'}
                                    </Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    </Animated.View>
                ))}
            </ScrollView>
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
        paddingBottom: 24,
    },
    subtitle: {
        fontSize: 14,
        fontFamily: 'Inter',
        marginBottom: 4,
    },
    title: {
        fontSize: 28,
        fontFamily: 'Lora',
        fontWeight: '700',
    },
    headerActions: {
        flexDirection: 'row',
        gap: 12,
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 10,
        elevation: 2,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 120,
    },
    mainCard: {
        borderRadius: 32,
        padding: 24,
        marginBottom: 24,
        shadowColor: primaryTeal,
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 20,
        elevation: 8,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
        fontFamily: 'Inter',
    },
    monthBadge: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    monthText: {
        color: '#fff',
        fontSize: 10,
        fontFamily: 'Inter',
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    mainValue: {
        color: '#fff',
        fontSize: 36,
        fontFamily: 'Lora',
        fontWeight: '700',
        marginBottom: 32,
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    summaryItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    summaryIcon: {
        width: 32,
        height: 32,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    summaryLabel: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 11,
        fontFamily: 'Inter',
    },
    summaryValue: {
        color: '#fff',
        fontSize: 15,
        fontFamily: 'Inter',
        fontWeight: '700',
    },
    summaryDivider: {
        width: 1,
        height: 30,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginHorizontal: 16,
    },
    progressContainer: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        paddingTop: 20,
    },
    progressBarBg: {
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 10,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#fff',
        borderRadius: 3,
    },
    progressText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        fontFamily: 'Inter',
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 32,
    },
    statCard: {
        flex: 1,
        padding: 20,
        borderRadius: 24,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 10,
        elevation: 2,
    },
    statLabel: {
        fontSize: 12,
        fontFamily: 'Inter',
        marginBottom: 8,
    },
    statValue: {
        fontSize: 18,
        fontFamily: 'Lora',
        fontWeight: '700',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Lora',
        fontWeight: '700',
    },
    seeAll: {
        fontSize: 13,
        fontFamily: 'Inter',
        fontWeight: '600',
    },
    transactionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 24,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 10,
        elevation: 2,
    },
    transIcon: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    transInfo: {
        flex: 1,
    },
    transTitle: {
        fontSize: 15,
        fontFamily: 'Inter',
        fontWeight: '700',
        marginBottom: 4,
    },
    transDate: {
        fontSize: 12,
        fontFamily: 'Inter',
    },
    transValueColumn: {
        alignItems: 'flex-end',
    },
    transValue: {
        fontSize: 15,
        fontFamily: 'Inter',
        fontWeight: '700',
        marginBottom: 4,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 10,
        fontFamily: 'Inter',
        fontWeight: '700',
    }
});
