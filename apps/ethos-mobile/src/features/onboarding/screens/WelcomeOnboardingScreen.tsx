// ethos-mobile/src/screens/WelcomeOnboardingScreen.tsx
import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, useColorScheme,
    StatusBar, SafeAreaView, ScrollView
} from 'react-native';
import { colors } from '../theme/colors';
import { Shield, ChevronRight, Calendar, UserPlus, BarChart3, MoreHorizontal } from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

export default function WelcomeOnboardingScreen({ navigation }: any) {
    const isDark = useColorScheme() === 'dark';
    const theme = isDark ? colors.dark : colors.light;

    const primaryTeal = '#234e5c';
    const cardBg = isDark ? '#1e2126' : '#fff';

    const steps = [
        {
            id: 1,
            title: '1. Agende sua primeira sessão',
            subtitle: 'Configure seus horários de atendimento',
            icon: Calendar,
        },
        {
            id: 2,
            title: '2. Cadastre um paciente',
            subtitle: 'Prontuários seguros e criptografados',
            icon: UserPlus,
        },
        {
            id: 3,
            title: '3. Explore o financeiro',
            subtitle: 'Controle honorários e recibos',
            icon: BarChart3,
        }
    ];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.dark.background : '#fcfcfb' }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={styles.logoBadge}>
                        <Shield size={20} color={primaryTeal} fill={primaryTeal + '20'} />
                    </View>
                    <Text style={[styles.headerBrand, { color: primaryTeal }]}>ETHOS</Text>
                </View>
                <TouchableOpacity>
                    <MoreHorizontal size={24} color={theme.mutedForeground} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Animated.View entering={FadeIn.duration(800)} style={styles.welcomeSection}>
                    <Text style={[styles.title, { color: primaryTeal }]}>Bem-vindo(a){'\n'}ao ETHOS</Text>
                    <Text style={[styles.subtitle, { color: primaryTeal }]}>
                        Sua plataforma clínica está pronta. Vamos começar a organizar seus atendimentos com ética e tecnologia?
                    </Text>
                </Animated.View>

                <Text style={styles.sectionLabel}>PRIMEIROS PASSOS</Text>

                <View style={styles.stepsContainer}>
                    {steps.map((step, index) => (
                        <Animated.View
                            key={step.id}
                            entering={FadeInDown.delay(400 + index * 100).duration(600)}
                        >
                            <TouchableOpacity style={[styles.stepCard, { backgroundColor: cardBg, borderColor: theme.border }]}>
                                <View style={styles.stepIconWrapper}>
                                    <step.icon size={24} color={primaryTeal} />
                                </View>
                                <View style={styles.stepTextContainer}>
                                    <Text style={[styles.stepTitle, { color: theme.foreground }]}>{step.title}</Text>
                                    <Text style={[styles.stepSubtitle, { color: theme.mutedForeground }]}>{step.subtitle}</Text>
                                </View>
                                <ChevronRight size={20} color={theme.border} />
                            </TouchableOpacity>
                        </Animated.View>
                    ))}
                </View>

                <Animated.View entering={FadeInDown.delay(800).duration(800)} style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.primaryButton, { backgroundColor: primaryTeal }]}
                        onPress={() => navigation.replace('MainTabs')}
                    >
                        <Text style={styles.primaryButtonText}>Começar Agora</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.supportLink}>
                        <Text style={[styles.supportText, { color: theme.mutedForeground }]}>
                            Precisa de ajuda? <Text style={styles.supportHighlight}>Fale com o suporte</Text>
                        </Text>
                    </TouchableOpacity>
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
        paddingHorizontal: 20,
        height: 60,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    logoBadge: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#f0f4f3',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerBrand: {
        fontSize: 16,
        fontFamily: 'Inter',
        fontWeight: '700',
        letterSpacing: 2,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 40,
        paddingBottom: 40,
    },
    welcomeSection: {
        alignItems: 'center',
        marginBottom: 50,
    },
    title: {
        fontSize: 40,
        fontFamily: 'Lora',
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 48,
    },
    subtitle: {
        fontSize: 17,
        fontFamily: 'Inter',
        textAlign: 'center',
        lineHeight: 26,
        opacity: 0.8,
    },
    sectionLabel: {
        fontSize: 12,
        fontFamily: 'Inter',
        fontWeight: '700',
        letterSpacing: 1.5,
        color: '#234e5c80',
        marginBottom: 20,
    },
    stepsContainer: {
        gap: 16,
        marginBottom: 40,
    },
    stepCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        gap: 16,
    },
    stepIconWrapper: {
        width: 52,
        height: 52,
        borderRadius: 16,
        backgroundColor: '#f0f4f3',
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepTextContainer: {
        flex: 1,
    },
    stepTitle: {
        fontSize: 16,
        fontFamily: 'Inter',
        fontWeight: '700',
        marginBottom: 4,
    },
    stepSubtitle: {
        fontSize: 14,
        fontFamily: 'Inter',
    },
    footer: {
        marginTop: 'auto',
        gap: 24,
    },
    primaryButton: {
        height: 72,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#234e5c',
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: 15,
        elevation: 5,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 18,
        fontFamily: 'Inter',
        fontWeight: '700',
    },
    supportLink: {
        alignItems: 'center',
    },
    supportText: {
        fontSize: 14,
        fontFamily: 'Inter',
    },
    supportHighlight: {
        fontWeight: '700',
        textDecorationLine: 'underline',
    }
});
