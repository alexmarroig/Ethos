import React from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { Database, Moon, Shield, Smartphone, User } from "lucide-react-native";

import { colors } from "../theme/colors";
import { useAuth } from "../contexts/AuthContext";
import { EMAIL_REGEX, CRP_REGEX } from "../constants/professionalOptions";
import {
  defaultWhatsAppMessageSettings,
  loadWhatsAppMessageSettings,
  saveWhatsAppMessageSettings,
} from "../services/whatsapp";

const readAvatarDataUrl = async (uri: string, mimeType?: string | null) => {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return `data:${mimeType || "image/jpeg"};base64,${base64}`;
};

export default function SettingsScreen() {
  const isDark = useColorScheme() === "dark";
  const theme = isDark ? colors.dark : colors.light;
  const { user, logout, updateProfile, isSubmitting } = useAuth();

  const [biometricsEnabled, setBiometricsEnabled] = React.useState(true);
  const [offlineMode, setOfflineMode] = React.useState(true);
  const [sessionTemplate, setSessionTemplate] = React.useState(defaultWhatsAppMessageSettings.sessionReminderTemplate);
  const [paymentTemplate, setPaymentTemplate] = React.useState(defaultWhatsAppMessageSettings.paymentReminderTemplate);
  const [pixKey, setPixKey] = React.useState(defaultWhatsAppMessageSettings.pixKey);
  const [isSavingTemplates, setIsSavingTemplates] = React.useState(false);
  const [isSavingProfile, setIsSavingProfile] = React.useState(false);
  const [profile, setProfile] = React.useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    crp: user?.crp ?? "",
    specialty: user?.specialty ?? "",
    clinical_approach: user?.clinical_approach ?? "",
    avatar_url: user?.avatar_url ?? "",
  });

  React.useEffect(() => {
    setProfile({
      name: user?.name ?? "",
      email: user?.email ?? "",
      crp: user?.crp ?? "",
      specialty: user?.specialty ?? "",
      clinical_approach: user?.clinical_approach ?? "",
      avatar_url: user?.avatar_url ?? "",
    });
  }, [user]);

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

  const initials = React.useMemo(
    () =>
      (profile.name || user?.name || "ETHOS")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join(""),
    [profile.name, user?.name]
  );

  const renderSettingRow = (
    icon: React.ReactNode,
    title: string,
    description?: string,
    action?: React.ReactNode
  ) => (
    <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
      <View style={[styles.iconContainer, { backgroundColor: theme.secondary }]}>{icon}</View>
      <View style={styles.settingTextContainer}>
        <Text style={[styles.settingTitle, { color: theme.foreground }]}>{title}</Text>
        {description ? (
          <Text style={[styles.settingDescription, { color: theme.mutedForeground }]}>{description}</Text>
        ) : null}
      </View>
      {action}
    </View>
  );

  const handleSelectAvatar = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "image/*",
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const avatarUrl = await readAvatarDataUrl(asset.uri, asset.mimeType);
      setProfile((current) => ({ ...current, avatar_url: avatarUrl }));
    } catch (error: any) {
      Alert.alert("Foto indisponivel", error?.message ?? "Nao foi possivel selecionar a foto.");
    }
  };

  const handleSaveProfile = async () => {
    if (!profile.name.trim()) {
      Alert.alert("Nome obrigatorio", "Informe o nome profissional para continuar.");
      return;
    }

    if (!EMAIL_REGEX.test(profile.email.trim().toLowerCase())) {
      Alert.alert("Email invalido", "Informe um email valido para salvar o perfil.");
      return;
    }

    if (!CRP_REGEX.test(profile.crp.trim())) {
      Alert.alert("CRP invalido", "Use o formato 00/0000 a 00/000000.");
      return;
    }

    try {
      setIsSavingProfile(true);
      await updateProfile({
        name: profile.name.trim(),
        email: profile.email.trim().toLowerCase(),
        avatar_url: profile.avatar_url || undefined,
        crp: profile.crp.trim(),
        specialty: profile.specialty.trim() || undefined,
        clinical_approach: profile.clinical_approach.trim() || undefined,
      });
      Alert.alert("Perfil salvo", "Seu perfil profissional foi atualizado.");
    } catch (error: any) {
      Alert.alert("Nao foi possivel salvar", error?.message ?? "Tente novamente em instantes.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveTemplates = async () => {
    try {
      setIsSavingTemplates(true);
      await saveWhatsAppMessageSettings({
        sessionReminderTemplate: sessionTemplate,
        paymentReminderTemplate: paymentTemplate,
        pixKey,
      });
      Alert.alert("Mensagens salvas", "Os modelos do WhatsApp foram atualizados neste dispositivo.");
    } catch (saveError: any) {
      Alert.alert("Nao foi possivel salvar", saveError?.message ?? "Tente novamente em instantes.");
    } finally {
      setIsSavingTemplates(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.foreground }]}>Configuracoes</Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.mutedForeground }]}>PERFIL PROFISSIONAL</Text>
        <View style={[styles.card, styles.profileCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <TouchableOpacity style={styles.avatarRow} onPress={handleSelectAvatar} activeOpacity={0.9}>
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: theme.secondary }]}>
                <Text style={[styles.avatarFallbackText, { color: theme.primary }]}>{initials}</Text>
              </View>
            )}
            <View style={styles.avatarCopy}>
              <Text style={[styles.avatarTitle, { color: theme.foreground }]}>Foto profissional</Text>
              <Text style={[styles.avatarSubtitle, { color: theme.mutedForeground }]}>
                Toque para selecionar uma foto de perfil.
              </Text>
            </View>
            <User size={20} color={theme.primary} />
          </TouchableOpacity>

          <Text style={[styles.inputLabel, { color: theme.foreground }]}>Nome</Text>
          <TextInput
            style={[styles.singleLineInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.foreground }]}
            value={profile.name}
            onChangeText={(name) => setProfile((current) => ({ ...current, name }))}
            placeholder="Seu nome profissional"
            placeholderTextColor={theme.mutedForeground}
          />

          <Text style={[styles.inputLabel, { color: theme.foreground }]}>Email</Text>
          <TextInput
            style={[styles.singleLineInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.foreground }]}
            value={profile.email}
            onChangeText={(email) => setProfile((current) => ({ ...current, email }))}
            placeholder="seu@email.com"
            placeholderTextColor={theme.mutedForeground}
            autoCapitalize="none"
          />

          <Text style={[styles.inputLabel, { color: theme.foreground }]}>CRP</Text>
          <TextInput
            style={[styles.singleLineInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.foreground }]}
            value={profile.crp}
            onChangeText={(crp) => setProfile((current) => ({ ...current, crp }))}
            placeholder="06/211111"
            placeholderTextColor={theme.mutedForeground}
            autoCapitalize="characters"
          />

          <Text style={[styles.inputLabel, { color: theme.foreground }]}>Especialidade</Text>
          <TextInput
            style={[styles.singleLineInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.foreground }]}
            value={profile.specialty}
            onChangeText={(specialty) => setProfile((current) => ({ ...current, specialty }))}
            placeholder="Ex.: Ansiedade | Luto"
            placeholderTextColor={theme.mutedForeground}
          />

          <Text style={[styles.inputLabel, { color: theme.foreground }]}>Abordagem clinica</Text>
          <TextInput
            style={[styles.singleLineInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.foreground }]}
            value={profile.clinical_approach}
            onChangeText={(clinical_approach) => setProfile((current) => ({ ...current, clinical_approach }))}
            placeholder="Ex.: TCC | ACT"
            placeholderTextColor={theme.mutedForeground}
          />

          <TouchableOpacity
            style={[styles.saveButton, { opacity: isSavingProfile || isSubmitting ? 0.7 : 1 }]}
            onPress={handleSaveProfile}
            disabled={isSavingProfile || isSubmitting}
          >
            {isSavingProfile || isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Salvar perfil</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.mutedForeground }]}>CONTA E DISPOSITIVO</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {renderSettingRow(
            <Shield size={20} color={theme.statusValidated} />,
            "Seguranca e App Lock",
            "Biometria ativada neste aparelho",
            <Switch
              value={biometricsEnabled}
              onValueChange={setBiometricsEnabled}
              trackColor={{ false: theme.muted, true: theme.statusValidated }}
              thumbColor={theme.card}
            />
          )}
          {renderSettingRow(
            <Database size={20} color={theme.accent} />,
            "Sincronizacao offline",
            "Modo local para continuidade de uso",
            <Switch
              value={offlineMode}
              onValueChange={setOfflineMode}
              trackColor={{ false: theme.muted, true: theme.accent }}
              thumbColor={theme.card}
            />
          )}
          {renderSettingRow(<Smartphone size={20} color={theme.primary} />, "Armazenamento", "Arquivos e dados locais do dispositivo")}
          {renderSettingRow(<Moon size={20} color={theme.mutedForeground} />, "Aparencia", "Automatico (Sistema)")}
          {renderSettingRow(<User size={20} color={theme.primary} />, "Status da conta", user ? "Conta clinica conectada" : "Sem sessao ativa")}
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
            {isSavingTemplates ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Salvar mensagens</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: `${theme.destructive}20` }]}
          onPress={logout}
        >
          <Text style={[styles.logoutText, { color: theme.destructive }]}>Encerrar sessao segura</Text>
        </TouchableOpacity>
        <Text style={[styles.versionText, { color: theme.mutedForeground }]}>ETHOS v1.0.0</Text>
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
    fontFamily: "Lora",
    fontSize: 22,
    fontWeight: "600",
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontFamily: "Inter",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  profileCard: {
    padding: 16,
    gap: 12,
  },
  templateCard: {
    padding: 16,
    gap: 12,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 4,
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarFallback: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    fontFamily: "Inter",
    fontSize: 22,
    fontWeight: "700",
  },
  avatarCopy: {
    flex: 1,
  },
  avatarTitle: {
    fontFamily: "Inter",
    fontSize: 15,
    fontWeight: "700",
  },
  avatarSubtitle: {
    fontFamily: "Inter",
    fontSize: 13,
    marginTop: 4,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontFamily: "Inter",
    fontSize: 16,
    fontWeight: "500",
  },
  settingDescription: {
    fontFamily: "Inter",
    fontSize: 13,
    marginTop: 2,
  },
  inputLabel: {
    fontFamily: "Inter",
    fontSize: 14,
    fontWeight: "600",
  },
  singleLineInput: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontFamily: "Inter",
    fontSize: 14,
  },
  templateInput: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Inter",
    fontSize: 14,
  },
  templateHint: {
    fontFamily: "Inter",
    fontSize: 12,
    lineHeight: 18,
  },
  saveButton: {
    backgroundColor: "#234e5c",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontFamily: "Inter",
    fontSize: 15,
    fontWeight: "700",
  },
  footer: {
    marginTop: 40,
    paddingHorizontal: 16,
    paddingBottom: 40,
    alignItems: "center",
  },
  logoutButton: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 16,
  },
  logoutText: {
    fontFamily: "Inter",
    fontSize: 16,
    fontWeight: "600",
  },
  versionText: {
    fontFamily: "Inter",
    fontSize: 12,
  },
});
