import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, useColorScheme, TouchableOpacity, TextInput, Platform } from 'react-native';
import { colors } from '../theme/colors';
import { Search, UserPlus, FileText, ChevronRight, Filter, MoreHorizontal } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

const primaryTeal = '#234e5c';
const accentTeal = '#439299';

interface Patient {
    id: string;
    name: string;
    lastSession: string;
    status: 'active' | 'inactive';
}

const dummyPatients: Patient[] = [
    { id: '1', name: 'Alana Gomes', lastSession: 'Há 2 dias', status: 'active' },
    { id: '2', name: 'Carlos Mendes', lastSession: 'Semana passada', status: 'active' },
    { id: '3', name: 'João Silva', lastSession: 'Hoje', status: 'active' },
    { id: '4', name: 'Maria Antônia', lastSession: 'Hoje', status: 'active' },
    { id: '5', name: 'Paulo Souza', lastSession: 'Há 1 mês', status: 'inactive' },
    { id: '6', name: 'Roberta Lima', lastSession: 'Ontem', status: 'active' },
];

export default function PatientsScreen() {
    const isDark = useColorScheme() === 'dark';
    const theme = isDark ? colors.dark : colors.light;
    const [searchQuery, setSearchQuery] = useState('');

    const filteredPatients = dummyPatients.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => a.name.localeCompare(b.name));

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#1a1d21' : '#f8f9fa' }]}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={[styles.subtitle, { color: theme.mutedForeground }]}>Meus Pacientes</Text>
                    <Text style={[styles.title, { color: primaryTeal }]}>Base Clínica</Text>
                </View>
                <TouchableOpacity style={[styles.addButton, { backgroundColor: primaryTeal }]}>
                    <UserPlus size={22} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Search & Filter */}
            <View style={styles.searchWrapper}>
                <View style={[styles.searchBar, { backgroundColor: isDark ? '#2a2d31' : '#fff' }]}>
                    <Search size={20} color={theme.mutedForeground} />
                    <TextInput
                        style={[styles.searchInput, { color: primaryTeal }]}
                        placeholder="Buscar por nome ou CPF..."
                        placeholderTextColor={theme.mutedForeground}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
                <TouchableOpacity style={[styles.filterButton, { backgroundColor: isDark ? '#2a2d31' : '#fff' }]}>
                    <Filter size={20} color={primaryTeal} />
                </TouchableOpacity>
            </View>

            {/* Patients List */}
            <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
                <View style={styles.listHeader}>
                    <Text style={[styles.listSubtitle, { color: theme.mutedForeground }]}>
                        {filteredPatients.length} pacientes encontrados
                    </Text>
                </View>

                {filteredPatients.map((patient, index) => (
                    <Animated.View
                        key={patient.id}
                        entering={FadeInDown.delay(index * 50).duration(400)}
                    >
                        <TouchableOpacity
                            style={[styles.patientCard, { backgroundColor: isDark ? '#2a2d31' : '#fff' }]}
                        >
                            <View style={[styles.avatar, { backgroundColor: patient.status === 'active' ? 'rgba(67, 146, 153, 0.1)' : 'rgba(0,0,0,0.05)' }]}>
                                <Text style={[styles.avatarText, { color: patient.status === 'active' ? accentTeal : theme.mutedForeground }]}>
                                    {patient.name.charAt(0)}
                                </Text>
                            </View>

                            <View style={styles.patientInfo}>
                                <View style={styles.nameRow}>
                                    <Text style={[styles.patientName, { color: primaryTeal }]}>
                                        {patient.name}
                                    </Text>
                                    {patient.status === 'active' && <View style={styles.onlineIndicator} />}
                                </View>
                                <View style={styles.detailRow}>
                                    <FileText size={14} color={theme.mutedForeground} />
                                    <Text style={[styles.patientDetail, { color: theme.mutedForeground }]}>
                                        Última: {patient.lastSession}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.cardActions}>
                                <TouchableOpacity style={styles.moreButton}>
                                    <ChevronRight size={20} color={theme.mutedForeground} />
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    </Animated.View>
                ))}
            </ScrollView>

            {/* Floating Index (Simulation) */}
            <View style={styles.alphaIndex}>
                {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(char => (
                    <Text key={char} style={[styles.indexChar, { color: accentTeal }]}>{char}</Text>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
    addButton: {
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: primaryTeal,
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 10,
        elevation: 5,
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
    listContainer: {
        paddingHorizontal: 24,
        paddingBottom: 120,
    },
    listHeader: {
        marginBottom: 16,
    },
    listSubtitle: {
        fontSize: 13,
        fontFamily: 'Inter',
        fontWeight: '600',
    },
    patientCard: {
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
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    avatarText: {
        fontSize: 22,
        fontFamily: 'Lora',
        fontWeight: '700',
    },
    patientInfo: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
    },
    patientName: {
        fontSize: 18,
        fontFamily: 'Lora',
        fontWeight: '700',
    },
    onlineIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#10b981',
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    patientDetail: {
        fontSize: 13,
        fontFamily: 'Inter',
    },
    cardActions: {
        marginLeft: 8,
    },
    moreButton: {
        padding: 8,
    },
    alphaIndex: {
        position: 'absolute',
        right: 8,
        top: 250,
        alignItems: 'center',
        gap: 12,
    },
    indexChar: {
        fontSize: 11,
        fontFamily: 'Inter',
        fontWeight: '800',
    }
});
