// ethos-mobile/src/screens/RegisterStep1Screen.tsx
import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    useColorScheme, StatusBar, KeyboardAvoidingView, Platform,
    ScrollView
} from 'react-native';
import { colors } from '../theme/colors';
import { ChevronLeft, Eye, EyeOff } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function RegisterStep1Screen({ navigation }: any) {
    const isDark = useColorScheme() === 'dark';
    const theme = isDark ? colors.dark : colors.light;

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [crp, setCrp] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Specific design values
    const primaryTeal = '#234e5c';
    const inputBg = isDark ? '#1e2126' : '#fcfcfb';

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.container, { backgroundColor: isDark ? colors.dark.background : '#fcfcfb' }]}
        >
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ChevronLeft size={28} color={primaryTeal} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: primaryTeal }]}>Crie sua conta</Text>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Animated.View entering={FadeInDown.duration(600)}>
                    <Text style={[styles.title, { color: primaryTeal }]}>Dados Pessoais e{'\n'}Profissionais</Text>
                    <Text style={[styles.subtitle, { color: theme.mutedForeground }]}>Passo 1 de 2</Text>

                    {/* Nome Completo */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: primaryTeal }]}>Nome Completo</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: theme.border }]}>
                            <TextInput
                                style={[styles.input, { color: theme.foreground }]}
                                placeholder="Digite seu nome completo"
                                placeholderTextColor={theme.mutedForeground}
                                value={name}
                                onChangeText={setName}
                            />
                        </View>
                    </View>

                    {/* E-mail */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: primaryTeal }]}>E-mail</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: theme.border }]}>
                            <TextInput
                                style={[styles.input, { color: theme.foreground }]}
                                placeholder="exemplo@email.com"
                                placeholderTextColor={theme.mutedForeground}
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>
                    </View>

                    {/* CRP */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: primaryTeal }]}>CRP (Conselho Regional de Psicologia)</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: theme.border }]}>
                            <TextInput
                                style={[styles.input, { color: theme.foreground }]}
                                placeholder="00/00000"
                                placeholderTextColor={theme.mutedForeground}
                                value={crp}
                                onChangeText={setCrp}
                            />
                        </View>
                    </View>

                    {/* Senha */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: primaryTeal }]}>Senha</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: theme.border }]}>
                            <TextInput
                                style={[styles.input, { color: theme.foreground }]}
                                placeholder="Crie uma senha forte"
                                placeholderTextColor={theme.mutedForeground}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                {showPassword ? (
                                    <EyeOff size={20} color={theme.mutedForeground} />
                                ) : (
                                    <Eye size={20} color={theme.mutedForeground} />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.primaryButton, { backgroundColor: primaryTeal }]}
                        onPress={() => navigation.navigate('RegisterStep2')}
                    >
                        <Text style={styles.primaryButtonText}>Próximo Passo</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.loginLink}
                        onPress={() => navigation.navigate('Login')}
                    >
                        <Text style={[styles.loginText, { color: primaryTeal }]}>
                            Já tenho uma conta. <Text style={styles.loginHighlight}>Entrar</Text>
                        </Text>
                    </TouchableOpacity>
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
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Lora',
        fontWeight: '700',
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 40,
    },
    title: {
        fontSize: 32,
        fontFamily: 'Lora',
        fontWeight: '700',
        lineHeight: 38,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        fontFamily: 'Inter',
        fontWeight: '600',
        marginBottom: 40,
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontFamily: 'Inter',
        fontWeight: '600',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 56,
        borderRadius: 16,
        paddingHorizontal: 16,
        borderWidth: 1,
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontFamily: 'Inter',
    },
    primaryButton: {
        height: 64,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
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
    loginLink: {
        alignItems: 'center',
        marginTop: 30,
    },
    loginText: {
        fontSize: 15,
        fontFamily: 'Inter',
    },
    loginHighlight: {
        fontWeight: '700',
    }
});
