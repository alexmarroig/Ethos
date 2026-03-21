// ethos-mobile/src/screens/RegisterStep2Screen.tsx
import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, useColorScheme,
    StatusBar, SafeAreaView, ScrollView
} from 'react-native';
import { colors } from '../theme/colors';
import { ChevronLeft, ChevronDown, Check, ShieldCheck } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';

export default function RegisterStep2Screen({ navigation }: any) {
    const isDark = useColorScheme() === 'dark';
    const theme = isDark ? colors.dark : colors.light;

    const [specialty, setSpecialty] = useState('');
    const [approach, setApproach] = useState('');
    const [acceptedEthics, setAcceptedEthics] = useState(false);

    const primaryTeal = '#234e5c';
    const accentTeal = '#00f2ff';
    const inputBg = isDark ? '#1e2126' : '#fcfcfb';

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.dark.background : '#fcfcfb' }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ChevronLeft size={28} color={primaryTeal} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: primaryTeal }]}>Cadastro</Text>
                <View style={{ width: 32 }} />
            </View>

            <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                    <Text style={[styles.progressTitle, { color: primaryTeal }]}>Especialidade e Ética</Text>
                    <Text style={[styles.progressStep, { color: '#00ccdb' }]}>2 de 2</Text>
                </View>
                <View style={styles.progressBarBg}>
                    <Animated.View entering={FadeInRight.duration(800)} style={[styles.progressBarFill, { backgroundColor: accentTeal }]} />
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Animated.View entering={FadeInDown.delay(200).duration(600)}>
                    <Text style={[styles.title, { color: primaryTeal }]}>Dados Profissionais</Text>
                    <Text style={[styles.subtitle, { color: theme.mutedForeground }]}>
                        Informe sua área de atuação e aceite os termos éticos da plataforma para garantir a conformidade clínica.
                    </Text>

                    {/* Especialidade Principal */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: primaryTeal }]}>Especialidade Principal</Text>
                        <TouchableOpacity style={[styles.dropdownWrapper, { backgroundColor: inputBg, borderColor: theme.border }]}>
                            <Text style={[styles.dropdownText, { color: specialty ? theme.foreground : theme.mutedForeground }]}>
                                {specialty || 'Selecione sua especialidade'}
                            </Text>
                            <ChevronDown size={20} color={accentTeal} />
                        </TouchableOpacity>
                    </View>

                    {/* Abordagem Clínica */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: primaryTeal }]}>Abordagem Clínica</Text>
                        <TouchableOpacity style={[styles.dropdownWrapper, { backgroundColor: inputBg, borderColor: theme.border }]}>
                            <Text style={[styles.dropdownText, { color: approach ? theme.foreground : theme.mutedForeground }]}>
                                {approach || 'Escolha sua abordagem'}
                            </Text>
                            <ChevronDown size={20} color={accentTeal} />
                        </TouchableOpacity>
                    </View>

                    {/* Terms Checkbox */}
                    <TouchableOpacity
                        style={[styles.termsContainer, { backgroundColor: isDark ? 'rgba(0,242,255,0.05)' : '#f0f4f3' }]}
                        onPress={() => setAcceptedEthics(!acceptedEthics)}
                    >
                        <View style={[styles.checkbox, { borderColor: accentTeal, backgroundColor: acceptedEthics ? accentTeal : 'transparent' }]}>
                            {acceptedEthics && <Check size={14} color="#fff" />}
                        </View>
                        <Text style={[styles.termsText, { color: primaryTeal }]}>
                            Li e concordo com o <Text style={styles.boldText}>Código de Ética Profissional</Text> do Psicólogo e os <Text style={styles.boldText}>Termos de Uso</Text> da plataforma ETHOS. Estou ciente do meu compromisso com o sigilo e a prática baseada em evidências.
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.primaryButton, { backgroundColor: accentTeal, opacity: acceptedEthics ? 1 : 0.6 }]}
                        onPress={() => navigation.navigate('WelcomeOnboarding')}
                        disabled={!acceptedEthics}
                    >
                        <Text style={[styles.primaryButtonText, { color: '#15171a' }]}>Finalizar Cadastro</Text>
                    </TouchableOpacity>

                    <View style={styles.securityBadge}>
                        <Text style={[styles.securityBadgeText, { color: theme.mutedForeground }]}>
                            AMBIENTE SEGURO & CRIPTOGRAFADO
                        </Text>
                    </View>
                </Animated.View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Inter',
        fontWeight: '700',
    },
    progressSection: {
        paddingHorizontal: 24,
        marginBottom: 30,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    progressTitle: {
        fontSize: 16,
        fontFamily: 'Inter',
        fontWeight: '700',
    },
    progressStep: {
        fontSize: 14,
        fontFamily: 'Inter',
        fontWeight: '700',
    },
    progressBarBg: {
        height: 8,
        backgroundColor: '#e8eeed',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        width: '100%',
        borderRadius: 4,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    title: {
        fontSize: 32,
        fontFamily: 'Lora',
        fontWeight: '700',
        marginBottom: 20,
    },
    subtitle: {
        fontSize: 16,
        fontFamily: 'Inter',
        lineHeight: 24,
        marginBottom: 40,
    },
    inputGroup: {
        marginBottom: 30,
    },
    inputLabel: {
        fontSize: 14,
        fontFamily: 'Inter',
        fontWeight: '700',
        marginBottom: 12,
    },
    dropdownWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 64,
        borderRadius: 20,
        paddingHorizontal: 20,
        borderWidth: 1,
    },
    dropdownText: {
        fontSize: 16,
        fontFamily: 'Inter',
    },
    termsContainer: {
        flexDirection: 'row',
        padding: 24,
        borderRadius: 24,
        marginBottom: 40,
        gap: 16,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 2,
    },
    termsText: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Inter',
        lineHeight: 22,
    },
    boldText: {
        fontWeight: '700',
    },
    primaryButton: {
        height: 72,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#00f2ff',
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: 15,
        elevation: 5,
    },
    primaryButtonText: {
        fontSize: 18,
        fontFamily: 'Inter',
        fontWeight: '700',
    },
    securityBadge: {
        alignItems: 'center',
        marginTop: 30,
    },
    securityBadgeText: {
        fontSize: 12,
        fontFamily: 'Inter',
        fontWeight: '700',
        letterSpacing: 2,
        opacity: 0.5,
    }
});
