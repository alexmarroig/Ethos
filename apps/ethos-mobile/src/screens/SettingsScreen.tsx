// ethos-mobile/src/screens/SettingsScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, useColorScheme, TouchableOpacity, Switch } from 'react-native';
import { colors } from '../theme/colors';
import { Moon, Shield, Database, Smartphone, User, ChevronRight } from 'lucide-react-native';

export default function SettingsScreen() {
    const isDark = useColorScheme() === 'dark';
    const theme = isDark ? colors.dark : colors.light;

    const [biometricsEnabled, setBiometricsEnabled] = React.useState(true);
    const [offlineMode, setOfflineMode] = React.useState(true);

    const renderSettingRow = (icon: React.ReactNode, title: string, description?: string, action?: React.ReactNode) => (
        <TouchableOpacity style={[styles.settingRow, { borderBottomColor: theme.border }]} disabled={!action || action.type === Switch}>
            <View style={[styles.iconContainer, { backgroundColor: theme.secondary }]}>
                {icon}
            </View>
            <View style={styles.settingTextContainer}>
                <Text style={[styles.settingTitle, { color: theme.foreground }]}>{title}</Text>
                {description && <Text style={[styles.settingDescription, { color: theme.mutedForeground }]}>{description}</Text>}
            </View>
            {action || <ChevronRight size={20} color={theme.mutedForeground} />}
        </TouchableOpacity>
    );

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.foreground }]}>Configurações</Text>
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.mutedForeground }]}>CONTA</Text>
                <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    {renderSettingRow(<User size={20} color={theme.primary} />, "Perfil do Psicólogo", "Dr. João Silva (CRP: 12345/SP)")}
                    {renderSettingRow(<Shield size={20} color={theme.statusValidated} />, "Segurança & App Lock", "Biometria ativada",
                        <Switch
                            value={biometricsEnabled}
                            onValueChange={setBiometricsEnabled}
                            trackColor={{ false: theme.muted, true: theme.statusValidated }}
                            thumbColor={theme.card}
                        />
                    )}
                </View>
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.mutedForeground }]}>SISTEMA & DADOS</Text>
                <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    {renderSettingRow(<Database size={20} color={theme.accent} />, "Sincronização Offline", "Forçar modo local",
                        <Switch
                            value={offlineMode}
                            onValueChange={setOfflineMode}
                            trackColor={{ false: theme.muted, true: theme.accent }}
                            thumbColor={theme.card}
                        />
                    )}
                    {renderSettingRow(<Smartphone size={20} color={theme.primary} />, "Armazenamento", "240 MB usados locamente")}
                    {renderSettingRow(<Moon size={20} color={theme.mutedForeground} />, "Aparência", "Automático (Sistema)")}
                </View>
            </View>

            <View style={styles.footer}>
                <TouchableOpacity style={[styles.logoutButton, { backgroundColor: theme.destructive + '20' }]}>
                    <Text style={[styles.logoutText, { color: theme.destructive }]}>Encerrar Sessão Segura</Text>
                </TouchableOpacity>
                <Text style={[styles.versionText, { color: theme.mutedForeground }]}>ETHOS v1.0.0 (Build 42)</Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 16,
        paddingBottom: 8,
    },
    title: {
        fontFamily: 'Lora',
        fontSize: 22,
        fontWeight: '600',
    },
    section: {
        marginTop: 24,
        paddingHorizontal: 16,
    },
    sectionTitle: {
        fontFamily: 'Inter',
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 8,
        marginLeft: 4,
    },
    card: {
        borderRadius: 14,
        borderWidth: 1,
        overflow: 'hidden',
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    settingTextContainer: {
        flex: 1,
    },
    settingTitle: {
        fontFamily: 'Inter',
        fontSize: 16,
        fontWeight: '500',
    },
    settingDescription: {
        fontFamily: 'Inter',
        fontSize: 13,
        marginTop: 2,
    },
    footer: {
        marginTop: 40,
        paddingHorizontal: 16,
        paddingBottom: 40,
        alignItems: 'center',
    },
    logoutButton: {
        width: '100%',
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        marginBottom: 16,
    },
    logoutText: {
        fontFamily: 'Inter',
        fontSize: 16,
        fontWeight: '600',
    },
    versionText: {
        fontFamily: 'Inter',
        fontSize: 12,
    }
});
