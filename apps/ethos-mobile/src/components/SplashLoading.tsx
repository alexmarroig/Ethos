// ethos-mobile/src/components/SplashLoading.tsx
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, useColorScheme, ActivityIndicator } from 'react-native';
import { colors } from '../theme/colors';

export default function SplashLoading() {
    const isDark = useColorScheme() === 'dark';
    const theme = isDark ? colors.dark : colors.light;

    const fadeAnim = useRef(new Animated.Value(0.5)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 0.5,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, [fadeAnim]);

    return (
        <View style={[styles.container, { backgroundColor: '#f7f5f2' }]}>
            <View style={styles.logoContainer}>
                <Text style={[styles.logoText, { color: theme.primary }]}>ETHOS</Text>
            </View>

            <Animated.View style={[styles.loadingContainer, { opacity: fadeAnim }]}>
                <ActivityIndicator size="small" color={theme.primary} />
                <Text style={[styles.loadingText, { color: theme.mutedForeground }]}>Carregando...</Text>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoContainer: {
        padding: 24,
        borderRadius: 20,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        marginBottom: 40,
    },
    logoText: {
        fontFamily: 'Lora',
        fontSize: 32,
        fontWeight: '700',
        letterSpacing: 2,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        position: 'absolute',
        bottom: 50,
    },
    loadingText: {
        fontFamily: 'Inter',
        marginLeft: 12,
        fontSize: 16,
    }
});
