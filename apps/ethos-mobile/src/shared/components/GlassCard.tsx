import React from 'react';
import { StyleSheet, View, ViewStyle, useColorScheme } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors } from '../theme/colors';

interface GlassCardProps {
    children: React.ReactNode;
    style?: ViewStyle;
    intensity?: number;
}

export const GlassCard: React.FC<GlassCardProps> = ({
    children,
    style,
    intensity = 40
}) => {
    const isDark = useColorScheme() === 'dark';
    const theme = isDark ? colors.dark : colors.light;

    return (
        <BlurView
            intensity={intensity}
            tint={isDark ? 'dark' : 'light'}
            style={[
                styles.container,
                {
                    backgroundColor: isDark ? 'rgba(30, 32, 37, 0.4)' : 'rgba(252, 252, 251, 0.4)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                },
                style
            ]}
        >
            <View style={styles.content}>
                {children}
            </View>
        </BlurView>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    content: {
        padding: 20,
    },
});
