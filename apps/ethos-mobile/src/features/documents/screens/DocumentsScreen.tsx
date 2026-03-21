import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, useColorScheme, TouchableOpacity, TextInput, StatusBar, FlatList } from 'react-native';
import { colors } from '../theme/colors';
import { Search, FileText, Filter, CheckCircle, Clock, ChevronRight, Plus, MoreHorizontal, FileDown } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';

const primaryTeal = '#234e5c';
const accentTeal = '#439299';

const mockDocs = [
    { id: '1', title: 'Prontuário - Mariana Albuquerque', patient: 'Mariana Albuquerque', date: 'Hoje, 14:50', status: 'signed', type: 'Prontuário' },
    { id: '2', title: 'Relatório Psicológico - João Silva', patient: 'João Silva', date: 'Ontem, 16:30', status: 'draft', type: 'Relatório' },
    { id: '3', title: 'Anamnese - Roberto Santos', patient: 'Roberto Santos', date: '02 Mar, 10:00', status: 'signed', type: 'Prontuário' },
    { id: '4', title: 'Evolução Clínica - Ana Paula', patient: 'Ana Paula', date: '28 Fev, 15:20', status: 'signed', type: 'Prontuário' },
];

export default function DocumentsScreen() {
    const isDark = useColorScheme() === 'dark';
    const theme = isDark ? colors.dark : colors.light;
    const [filter, setFilter] = useState('Todos');

    const categories = ['Todos', 'Assinados', 'Rascunhos', 'Modelos'];

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#1a1d21' : '#f8f9fa' }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={[styles.subtitle, { color: theme.mutedForeground }]}>Prontuários e Laudos</Text>
                    <Text style={[styles.title, { color: primaryTeal }]}>Documentos</Text>
                </View>
                <TouchableOpacity style={[styles.headerIcon, { backgroundColor: isDark ? '#2a2d31' : '#fff' }]}>
                    <Plus size={24} color={primaryTeal} />
                </TouchableOpacity>
            </View>

            {/* Search & Statistics */}
            <View style={styles.searchWrapper}>
                <View style={[styles.searchBar, { backgroundColor: isDark ? '#2a2d31' : '#fff' }]}>
                    <Search size={20} color={theme.mutedForeground} />
                    <TextInput
                        placeholder="Buscar por nome ou data..."
                        placeholderTextColor={theme.mutedForeground}
                        style={[styles.searchInput, { color: primaryTeal }]}
                    />
                </View>
                <TouchableOpacity style={[styles.filterButton, { backgroundColor: isDark ? '#2a2d31' : '#fff' }]}>
                    <Filter size={20} color={primaryTeal} />
                </TouchableOpacity>
            </View>

            {/* Chips */}
            <View style={styles.chipsContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                    {categories.map((cat) => (
                        <TouchableOpacity
                            key={cat}
                            onPress={() => setFilter(cat)}
                            style={[
                                styles.chip,
                                filter === cat && styles.activeChip,
                                { backgroundColor: filter === cat ? primaryTeal : (isDark ? '#2a2d31' : '#fff') }
                            ]}
                        >
                            <Text style={[
                                styles.chipText,
                                { color: filter === cat ? '#fff' : theme.mutedForeground }
                            ]}>
                                {cat}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Documents List */}
            <FlatList
                data={mockDocs}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                renderItem={({ item, index }) => (
                    <Animated.View entering={FadeInDown.delay(index * 100).duration(500)}>
                        <TouchableOpacity style={[styles.docCard, { backgroundColor: isDark ? '#2a2d31' : '#fff' }]}>
                            <View style={[styles.docIconWrapper, { backgroundColor: item.status === 'signed' ? 'rgba(22, 163, 74, 0.1)' : 'rgba(245, 158, 11, 0.1)' }]}>
                                <FileText size={24} color={item.status === 'signed' ? '#16a34a' : '#f59e0b'} />
                            </View>

                            <View style={styles.docInfo}>
                                <Text style={[styles.docTitle, { color: primaryTeal }]} numberOfLines={1}>
                                    {item.title}
                                </Text>
                                <View style={styles.docMeta}>
                                    {item.status === 'signed' ? (
                                        <View style={styles.statusBadge}>
                                            <CheckCircle size={12} color="#16a34a" />
                                            <Text style={[styles.statusText, { color: '#16a34a' }]}>Assinado</Text>
                                        </View>
                                    ) : (
                                        <View style={[styles.statusBadge, { backgroundColor: '#fef3c7' }]}>
                                            <Clock size={12} color="#d97706" />
                                            <Text style={[styles.statusText, { color: '#d97706' }]}>Rascunho</Text>
                                        </View>
                                    )}
                                    <Text style={[styles.docDate, { color: theme.mutedForeground }]}>
                                        {item.date}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.cardActions}>
                                <TouchableOpacity style={styles.actionIcon}>
                                    <FileDown size={20} color={theme.mutedForeground} />
                                </TouchableOpacity>
                                <ChevronRight size={18} color={theme.mutedForeground} />
                            </View>
                        </TouchableOpacity>
                    </Animated.View>
                )}
            />

            <TouchableOpacity style={styles.fab}>
                <Plus size={32} color="#fff" />
            </TouchableOpacity>
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
    headerIcon: {
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
    searchWrapper: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        gap: 12,
        marginBottom: 20,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        height: 52,
        borderRadius: 26,
        paddingHorizontal: 20,
        gap: 12,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
        elevation: 2,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        fontFamily: 'Inter',
    },
    filterButton: {
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
        elevation: 2,
    },
    chipsContainer: {
        marginBottom: 24,
    },
    chipsScroll: {
        paddingHorizontal: 24,
        gap: 10,
    },
    chip: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    activeChip: {
        shadowColor: primaryTeal,
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
        elevation: 3,
    },
    chipText: {
        fontSize: 13,
        fontFamily: 'Inter',
        fontWeight: '600',
    },
    listContent: {
        paddingHorizontal: 24,
        paddingBottom: 120,
    },
    docCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 24,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 12,
        elevation: 2,
    },
    docIconWrapper: {
        width: 56,
        height: 56,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    docInfo: {
        flex: 1,
        marginLeft: 16,
    },
    docTitle: {
        fontSize: 16,
        fontFamily: 'Inter',
        fontWeight: '700',
        marginBottom: 6,
    },
    docMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0fdf4',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        gap: 4,
    },
    statusText: {
        fontSize: 10,
        fontFamily: 'Inter',
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    docDate: {
        fontSize: 12,
        fontFamily: 'Inter',
    },
    cardActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginLeft: 8,
    },
    actionIcon: {
        padding: 8,
    },
    fab: {
        position: 'absolute',
        bottom: 30,
        right: 24,
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#234e5c',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#234e5c',
        shadowOpacity: 0.4,
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: 15,
        elevation: 10,
    }
});
