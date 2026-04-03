import React from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View, useColorScheme } from 'react-native';
import { ChevronRight, Database, Moon, Shield, Smartphone, User } from 'lucide-react-native';

import { colors } from '../theme/colors';
import { useAuth } from '../contexts/AuthContext';
import {
  defaultWhatsAppMessageSettings,
  loadWhatsAppMessageSettings,
  saveWhatsAppMessageSettings,
} from '../services/whatsapp';

export default function SettingsScreen() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const { user, logout } = useAuth();

  const [biometricsEnabled, setBiometricsEnabled] = React.useState(true);
  const [offlineMode, setOfflineMode] = React.useState(true);
  const [sessionTemplate, setSessionTemplate] = React.useState(defaultWhatsAppMessageSettings.sessionReminderTemplate);
  const [paymentTemplate, setPaymentTemplate] = React.useState(defaultWhatsAppMessageSettings.paymentReminderTemplate);
  const [pixKey, setPixKey] = React.useState(defaultWhatsAppMessageSettings.pixKey);
  const [isSavingTemplates, setIsSavingTemplates] = React.useState(false);

  React.useEffect(() => {
    let active = true;

    const loadTemplates = async () => {
      const stored = await loadWhatsAppMessageSettings();
      if (!active) return;
      setSessionTemplate(stored.sessionReminderTemplate);
      setPaymentTemplate(stored.paymentReminderTemplate);
      setPixKey(stored.pixKey);
    };

    void loadTemplates();

    return () => {
      active = false;
    };
  }, []);

  const renderSettingRow = (icon: React.ReactNode, title: string, description?: string, action?: React.ReactNode) => (
    <TouchableOpacity style={[styles.settingRow, { borderBottomColor: theme.border }]} disabled={!action}>
      <View style={[styles.iconContainer, { backgroundColor: theme.secondary }]}>
        {icon}
      </View>
      <View style={styles.settingTextContainer}>
        <Text style={[styles.settingTitle, { color: theme.foreground }]}>{title}</Text>
        {description ? <Text style={[styles.settingDescription, { color: theme.mutedForeground }]}>{description}</Text> : null}
      </View>
      {action || <ChevronRight size={20} color={theme.mutedForeground} />}
    </TouchableOpacity>
  );

  const handleSaveTemplates = async () => {
    try {
      setIsSavingTemplates(true);
      await saveWhatsAppMessageSettings({
        sessionReminderTemplate: sessionTemplate,
        paymentReminderTemplate: paymentTemplate,
        pixKey,
      });
      Alert.alert('Mensagens salvas', 'Os modelos do WhatsApp foram atualizados neste dispositivo.');
    } catch (saveError: any) {
      Alert.alert('Nao foi possivel salvar', saveError?.message ?? 'Tente novamente em instantes.');
    } finally {
      setIsSavingTemplates(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.foreground }]}>Configurações</Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.mutedForeground }]}>CONTA</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {renderSettingRow(
            <User size={20} color={theme.primary} />,
            'Perfil do Psicólogo',
            user ? `${user.name} • ${user.email}` : 'Conta clínica conectada',
          )}
          {renderSettingRow(
            <Shield size={20} color={theme.statusValidated} />,
            'Segurança & App Lock',
            'Biometria ativada',
            <Switch
              value={biometricsEnabled}
              onValueChange={setBiometricsEnabled}
              trackColor={{ false: theme.muted, true: theme.statusValidated }}
              thumbColor={theme.card}
            />,
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.mutedForeground }]}>SISTEMA & DADOS</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {renderSettingRow(
            <Database size={20} color={theme.accent} />,
            'Sincronização Offline',
            'Forçar modo local',
            <Switch
              value={offlineMode}
              onValueChange={setOfflineMode}
              trackColor={{ false: theme.muted, true: theme.accent }}
              thumbColor={theme.card}
            />,
          )}
          {renderSettingRow(<Smartphone size={20} color={theme.primary} />, 'Armazenamento', '240 MB usados localmente')}
          {renderSettingRow(<Moon size={20} color={theme.mutedForeground} />, 'Aparência', 'Automático (Sistema)')}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.mutedForeground }]}>MENSAGENS PADRAO</Text>
        <View style={[styles.card, styles.templateCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.inputLabel, { color: theme.foreground }]}>Template de lembrete de sessao</Text>
          <TextInput
            style={[styles.templateInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.foreground }]}
            multiline
            value={sessionTemplate}
            onChangeText={setSessionTemplate}
            textAlignVertical="top"
            placeholder="[NOME] e [HORARIO]"
            placeholderTextColor={theme.mutedForeground}
          />

          <Text style={[styles.inputLabel, { color: theme.foreground }]}>Template de cobranca</Text>
          <TextInput
            style={[styles.templateInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.foreground }]}
            multiline
            value={paymentTemplate}
            onChangeText={setPaymentTemplate}
            textAlignVertical="top"
            placeholder="[NOME], [VALOR] e [CHAVE]"
            placeholderTextColor={theme.mutedForeground}
          />

          <Text style={[styles.inputLabel, { color: theme.foreground }]}>Chave PIX</Text>
          <TextInput
            style={[styles.singleLineInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.foreground }]}
            value={pixKey}
            onChangeText={setPixKey}
            placeholder="Sua chave PIX"
            placeholderTextColor={theme.mutedForeground}
            autoCapitalize="none"
          />

          <Text style={[styles.templateHint, { color: theme.mutedForeground }]}>
            Variaveis disponiveis: [NOME], [HORARIO], [VALOR], [CHAVE]
          </Text>

          <TouchableOpacity
            style={[styles.saveButton, { opacity: isSavingTemplates ? 0.7 : 1 }]}
            onPress={handleSaveTemplates}
            disabled={isSavingTemplates}
          >
            <Text style={styles.saveButtonText}>{isSavingTemplates ? 'Salvando...' : 'Salvar mensagens'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.logoutButton, { backgroundColor: theme.destructive + '20' }]} onPress={logout}>
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
  templateCard: {
    padding: 16,
    gap: 12,
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
  inputLabel: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
  },
  templateInput: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Inter',
    fontSize: 14,
  },
  singleLineInput: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontFamily: 'Inter',
    fontSize: 14,
  },
  templateHint: {
    fontFamily: 'Inter',
    fontSize: 12,
    lineHeight: 18,
  },
  saveButton: {
    backgroundColor: '#234e5c',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '700',
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
  },
});

