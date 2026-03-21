// ethos-mobile/src/screens/EmailSentScreen.tsx
import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, useColorScheme,
    StatusBar, SafeAreaView
} from 'react-native';
import { colors } from '../theme/colors';
import { ChevronLeft, MailCheck } from 'lucide-react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

export default function EmailSentScreen({ navigation }: any) {
    const isDark = useColorScheme() === 'dark';
    const theme = isDark ? colors.dark : colors.light;

    // Design matches the light mockup provided
    const bgPrimary = isDark ? '#15171a' : '#fcfcfb';
    const primaryTeal = '#234e5c';

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: bgPrimary }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <ChevronLeft size={28} color={theme.foreground} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: primaryTeal }]}>ETHOS</Text>
                <View style={{ width: 44 }} />
            </View>

            <View style={styles.content}>
                <Animated.View entering={ZoomIn.duration(800)} style={styles.iconContainer}>
                    <View style={styles.iconCircle}>
                        <MailCheck size={60} color={primaryTeal} strokeWidth={1.5} />
                    </View>
                </Animated.View>

                <Animated.View entering={FadeIn.delay(400).duration(800)} style={styles.textContainer}>
                    <Text style={[styles.title, { color: primaryTeal }]}>E-mail enviado!</Text>
                    <Text style={[styles.subtitle, { color: theme.mutedForeground }]}>
                        Enviamos as instruções para o seu e-mail.{'\n'}
                        Por favor, verifique sua caixa de entrada e spam.
                    </Text>
                </Animated.View>

                <Animated.View entering={FadeIn.delay(800).duration(800)} style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.primaryButton, { backgroundColor: primaryTeal }]}
                        onPress={() => navigation.navigate('Login')}
                    >
                        <Text style={styles.primaryButtonText}>Voltar ao Login</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.secondaryButton}>
                        <Text style={[styles.secondaryButtonText, { color: primaryTeal }]}>Reenviar e-mail</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
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
        paddingTop: 10,
        height: 60,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Lora',
        fontWeight: '700',
        letterSpacing: 2,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    iconContainer: {
        marginBottom: 40,
    },
    iconCircle: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: '#f0f4f3',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(35, 78, 92, 0.05)',
    },
    textContainer: {
        alignItems: 'center',
        marginBottom: 60,
    },
    title: {
        fontSize: 32,
        fontFamily: 'Lora',
        fontWeight: '700',
        marginBottom: 20,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        fontFamily: 'Inter',
        lineHeight: 24,
        textAlign: 'center',
    },
    footer: {
        width: '100%',
        gap: 20,
    },
    primaryButton: {
        height: 64,
        borderRadius: 32,
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
        fontSize: 16,
        fontFamily: 'Inter',
        fontWeight: '700',
    },
    secondaryButton: {
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    secondaryButtonText: {
        fontSize: 15,
        fontFamily: 'Inter',
        fontWeight: '600',
    }
});
