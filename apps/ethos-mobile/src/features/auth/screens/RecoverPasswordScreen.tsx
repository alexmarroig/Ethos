// ethos-mobile/src/screens/RecoverPasswordScreen.tsx
import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    useColorScheme, StatusBar, KeyboardAvoidingView, Platform,
    ScrollView
} from 'react-native';
import { colors } from '../theme/colors';
import { ChevronLeft, Mail, Send, ShieldCheck, HelpCircle } from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

export default function RecoverPasswordScreen({ navigation }: any) {
    const isDark = useColorScheme() === 'dark';
    const theme = isDark ? colors.dark : colors.light;
    const [email, setEmail] = useState('');

    const bgPrimary = '#15171a'; // Dark design per mockup
    const accentTeal = '#00f2ff';
    const inputBg = '#272b34';

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.container, { backgroundColor: bgPrimary }]}
        >
            <StatusBar barStyle="light-content" />

            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <ChevronLeft size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>ETHOS</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Animated.View entering={FadeInDown.duration(800)}>
                    <Text style={styles.title}>Recuperar{'\n'}Senha</Text>
                    <Text style={styles.subtitle}>
                        Enviaremos um link de recuperação para o seu e-mail cadastrado.
                    </Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>E-mail Profissional</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: inputBg }]}>
                            <Mail size={20} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="exemplo@clinica.com"
                                placeholderTextColor="rgba(255,255,255,0.4)"
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => navigation.navigate('EmailSent')}
                    >
                        <Text style={styles.primaryButtonText}>Enviar Link de Recuperação</Text>
                        <Send size={20} color="#15171a" />
                    </TouchableOpacity>
                </Animated.View>

                <Animated.View entering={FadeIn.delay(600)} style={styles.footerContainer}>
                    <View style={styles.supportContainer}>
                        <Text style={styles.supportText}>Ainda com problemas? </Text>
                        <TouchableOpacity>
                            <Text style={styles.supportLink}>Fale com o suporte</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.securityBadge}>
                        <ShieldCheck size={16} color={accentTeal} />
                        <Text style={[styles.securityBadgeText, { color: accentTeal }]}>
                            PROTOCOLO ÉTICO CRIPTOGRAFADO
                        </Text>
                    </View>
                </Animated.View>
            </ScrollView>
        </KeyboardAvoidingView>
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
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontFamily: 'Lora',
        fontWeight: '700',
        letterSpacing: 2,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 40,
        paddingTop: 40,
        paddingBottom: 40,
    },
    title: {
        color: '#fff',
        fontSize: 48,
        fontFamily: 'Lora',
        fontWeight: '700',
        lineHeight: 56,
        marginBottom: 20,
    },
    subtitle: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 18,
        fontFamily: 'Inter',
        lineHeight: 26,
        marginBottom: 40,
    },
    inputGroup: {
        marginBottom: 40,
    },
    inputLabel: {
        color: '#fff',
        fontSize: 14,
        fontFamily: 'Inter',
        fontWeight: '600',
        marginBottom: 12,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 64,
        borderRadius: 20,
        paddingHorizontal: 20,
    },
    inputIcon: {
        marginRight: 16,
    },
    input: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Inter',
    },
    primaryButton: {
        height: 72,
        backgroundColor: '#00f2ff',
        borderRadius: 24,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        shadowColor: '#00f2ff',
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 20,
        elevation: 10,
    },
    primaryButtonText: {
        color: '#15171a',
        fontSize: 16,
        fontFamily: 'Inter',
        fontWeight: '700',
    },
    footerContainer: {
        marginTop: 'auto',
        alignItems: 'center',
        paddingTop: 60,
    },
    supportContainer: {
        flexDirection: 'row',
        marginBottom: 24,
    },
    supportText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 14,
        fontFamily: 'Inter',
    },
    supportLink: {
        color: '#00ccdb',
        fontSize: 14,
        fontFamily: 'Inter',
        fontWeight: '700',
    },
    securityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: 'rgba(0,242,255,0.1)',
        backgroundColor: 'rgba(0,242,255,0.05)',
    },
    securityBadgeText: {
        fontSize: 11,
        fontFamily: 'Inter',
        fontWeight: '700',
        letterSpacing: 1,
    }
});
