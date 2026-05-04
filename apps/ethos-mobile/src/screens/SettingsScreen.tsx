import React from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
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
import * as Sharing from "expo-sharing";
import * as WebBrowser from "expo-web-browser";
import {
  Archive,
  Bell,
  ChevronRight,
  CreditCard,
  Database,
  Moon,
  Shield,
  Smartphone,
  Trash2,
  User,
} from "lucide-react-native";

import { colors } from "../theme/colors";
import { useAuth } from "../contexts/AuthContext";
import { EMAIL_REGEX, CRP_REGEX } from "../constants/professionalOptions";
import {
  defaultWhatsAppMessageSettings,
  loadWhatsAppMessageSettings,
  saveWhatsAppMessageSettings,
} from "../services/whatsapp";
import { useBiometricPreference } from "../hooks/useAppLock";
import { clinicalApiClient } from "../services/api/clinicalClient";

// ─── Clinical approaches ──────────────────────────────────────────────────────
const CLINICAL_APPROACHES = [
  "TCC", "TCC-C", "ACT", "DBT", "Psicanálise", "Psicodinâmica",
  "Gestalt", "Humanista", "Sistêmica", "Cognitiva", "Comportamental",
  "EMDR", "Integrativa", "Junguiana", "Existencial", "Focada em Trauma",
];

const readAvatarDataUrl = async (uri: string, mimeType?: string | null) => {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return `data:${mimeType || "image/jpeg"};base64,${base64}`;
};

// ─── Purge Confirm Modal ──────────────────────────────────────────────────────
function PurgeConfirmModal({
  visible,
  onClose,
  onConfirmed,
  theme,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirmed: () => void;
  theme: typeof colors.light;
}) {
  const [input, setInput] = React.useState("");
  const isReady = input === "CONFIRMAR";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.purgeOverlay}>
        <View style={[styles.purgeDialog, { backgroundColor: theme.card }]}>
          <Text style={[styles.purgeTitle, { color: theme.destructive }]}>Purgar todos os dados?</Text>
          <Text style={[styles.purgeBody, { color: theme.foreground }]}>
            Esta ação remove permanentemente todos os dados locais e não pode ser desfeita. Para continuar, digite{" "}
            <Text style={{ fontWeight: "800" }}>CONFIRMAR</Text> abaixo.
          </Text>
          <TextInput
            style={[styles.purgeInput, { borderColor: theme.destructive, color: theme.foreground, backgroundColor: theme.background }]}
            value={input}
            onChangeText={setInput}
            placeholder="CONFIRMAR"
            placeholderTextColor={theme.mutedForeground}
            autoCapitalize="characters"
          />
          <View style={styles.purgeActions}>
            <TouchableOpacity
              style={[styles.purgeCancel, { borderColor: theme.border }]}
              onPress={() => { setInput(""); onClose(); }}
            >
              <Text style={[styles.purgeCancelText, { color: theme.foreground }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.purgeConfirm, { backgroundColor: isReady ? theme.destructive : theme.muted }]}
              disabled={!isReady}
              onPress={() => { setInput(""); onConfirmed(); }}
            >
              <Text style={styles.purgeConfirmText}>Purgar agora</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const isDark = useColorScheme() === "dark";
  const theme = isDark ? colors.dark : colors.light;
  const { user, logout, updateProfile, isSubmitting } = useAuth();

  const { biometricEnabled: biometricsEnabled, setBiometricEnabled } = useBiometricPreference();
  const [offlineMode, setOfflineMode] = React.useState(true);
  const [sessionTemplate, setSessionTemplate] = React.useState(defaultWhatsAppMessageSettings.sessionReminderTemplate);
  const [paymentTemplate, setPaymentTemplate] = React.useState(defaultWhatsAppMessageSettings.paymentReminderTemplate);
  const [pixKey, setPixKey] = React.useState(defaultWhatsAppMessageSettings.pixKey);
  const [isSavingTemplates, setIsSavingTemplates] = React.useState(false);
  const [isSavingProfile, setIsSavingProfile] = React.useState(false);
  const [isGeneratingBackup, setIsGeneratingBackup] = React.useState(false);
  const [isPurging, setIsPurging] = React.useState(false);
  const [showPurgeModal, setShowPurgeModal] = React.useState(false);

  // Notification toggles
  const [notifySessionReminder, setNotifySessionReminder] = React.useState(true);
  const [notifyPaymentReminder, setNotifyPaymentReminder] = React.useState(true);
  const [notifyTranscription, setNotifyTranscription] = React.useState(true);
  const [notifyNewBooking, setNotifyNewBooking] = React.useState(true);

  // Clinical approaches multi-select
  const [selectedApproaches, setSelectedApproaches] = React.useState<Set<string>>(
    new Set(user?.clinical_approach ? user.clinical_approach.split("|").map((s) => s.trim()).filter(Boolean) : [])
  );

  const [profile, setProfile] = React.useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    crp: user?.crp ?? "",
    specialty: user?.specialty ?? "",
    avatar_url: user?.avatar_url ?? "",
  });

  React.useEffect(() => {
    setProfile({
      name: user?.name ?? "",
      email: user?.email ?? "",
      crp: user?.crp ?? "",
      specialty: user?.specialty ?? "",
      avatar_url: user?.avatar_url ?? "",
    });
    if (user?.clinical_approach) {
      setSelectedApproaches(
        new Set(user.clinical_approach.split("|").map((s: string) => s.trim()).filter(Boolean))
      );
    }
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
    return () => { active = false; };
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

  const toggleApproach = (approach: string) => {
    setSelectedApproaches((prev) => {
      const next = new Set(prev);
      if (next.has(approach)) next.delete(approach);
      else next.add(approach);
      return next;
    });
  };

  const renderSettingRow = (
    icon: React.ReactNode,
    title: string,
    description?: string,
    action?: React.ReactNode,
    onPress?: () => void
  ) => (
    <TouchableOpacity
      style={[styles.settingRow, { borderBottomColor: theme.border }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.iconContainer, { backgroundColor: theme.secondary }]}>{icon}</View>
      <View style={styles.settingTextContainer}>
        <Text style={[styles.settingTitle, { color: theme.foreground }]}>{title}</Text>
        {description ? (
          <Text style={[styles.settingDescription, { color: theme.mutedForeground }]}>{description}</Text>
        ) : null}
      </View>
      {action ?? (onPress ? <ChevronRight size={18} color={theme.mutedForeground} /> : null)}
    </TouchableOpacity>
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
      Alert.alert("Foto indisponível", error?.message ?? "Não foi possível selecionar a foto.");
    }
  };

  const handleSaveProfile = async () => {
    if (!profile.name.trim()) {
      Alert.alert("Nome obrigatório", "Informe o nome profissional para continuar.");
      return;
    }
    if (!EMAIL_REGEX.test(profile.email.trim().toLowerCase())) {
      Alert.alert("Email inválido", "Informe um email válido para salvar o perfil.");
      return;
    }
    if (!CRP_REGEX.test(profile.crp.trim())) {
      Alert.alert("CRP inválido", "Use o formato 00/0000 a 00/000000.");
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
        clinical_approach: Array.from(selectedApproaches).join(" | ") || undefined,
      });
      Alert.alert("Perfil salvo", "Seu perfil profissional foi atualizado.");
    } catch (error: any) {
      Alert.alert("Não foi possível salvar", error?.message ?? "Tente novamente em instantes.");
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
      Alert.alert("Não foi possível salvar", saveError?.message ?? "Tente novamente em instantes.");
    } finally {
      setIsSavingTemplates(false);
    }
  };

  const handleGenerateBackup = async () => {
    setIsGeneratingBackup(true);
    try {
      const res = await clinicalApiClient.request<any>("/backup/export", { method: "GET" });
      const jsonStr = JSON.stringify(res, null, 2);
      const fileName = `ethos-backup-${new Date().toISOString().slice(0, 10)}.json`;
      const fileUri = FileSystem.cacheDirectory + fileName;
      await FileSystem.writeAsStringAsync(fileUri, jsonStr, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/json",
          dialogTitle: "Salvar backup do Ethos",
        });
      } else {
        Alert.alert("Backup criado", `Arquivo salvo em: ${fileUri}`);
      }
    } catch (err: any) {
      Alert.alert("Erro no backup", err?.message ?? "Não foi possível gerar o backup.");
    } finally {
      setIsGeneratingBackup(false);
    }
  };

  const handleRestoreBackup = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const content = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const data = JSON.parse(content);
      Alert.alert(
        "Restaurar backup?",
        "Os dados atuais serão substituídos pelos dados do arquivo selecionado. Esta ação não pode ser desfeita.",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Restaurar",
            style: "destructive",
            onPress: async () => {
              try {
                await clinicalApiClient.request("/backup/import", {
                  method: "POST",
                  body: data,
                });
                Alert.alert("Backup restaurado", "Seus dados foram restaurados com sucesso.");
              } catch (err: any) {
                Alert.alert("Erro ao restaurar", err?.message ?? "Não foi possível restaurar o backup.");
              }
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert("Erro", err?.message ?? "Não foi possível abrir o arquivo.");
    }
  };

  const handlePurge = async () => {
    setIsPurging(true);
    try {
      await clinicalApiClient.request("/purge", { method: "POST" });
      Alert.alert("Dados removidos", "Todos os dados locais foram apagados. Você será desconectado.", [
        { text: "OK", onPress: logout },
      ]);
    } catch (err: any) {
      Alert.alert("Erro", err?.message ?? "Não foi possível purgar os dados.");
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.foreground }]}>Configurações</Text>
      </View>

      {/* ── Perfil ─────────────────────────────────────────────────────── */}
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
            onChangeText={(name) => setProfile((c) => ({ ...c, name }))}
            placeholder="Seu nome profissional"
            placeholderTextColor={theme.mutedForeground}
          />

          <Text style={[styles.inputLabel, { color: theme.foreground }]}>Email</Text>
          <TextInput
            style={[styles.singleLineInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.foreground }]}
            value={profile.email}
            onChangeText={(email) => setProfile((c) => ({ ...c, email }))}
            placeholder="seu@email.com"
            placeholderTextColor={theme.mutedForeground}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={[styles.inputLabel, { color: theme.foreground }]}>CRP</Text>
          <TextInput
            style={[styles.singleLineInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.foreground }]}
            value={profile.crp}
            onChangeText={(crp) => setProfile((c) => ({ ...c, crp }))}
            placeholder="06/211111"
            placeholderTextColor={theme.mutedForeground}
            autoCapitalize="characters"
          />

          <Text style={[styles.inputLabel, { color: theme.foreground }]}>Especialidade</Text>
          <TextInput
            style={[styles.singleLineInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.foreground }]}
            value={profile.specialty}
            onChangeText={(specialty) => setProfile((c) => ({ ...c, specialty }))}
            placeholder="Ex.: Ansiedade | Luto"
            placeholderTextColor={theme.mutedForeground}
          />

          {/* Clinical approach multi-select chips */}
          <Text style={[styles.inputLabel, { color: theme.foreground }]}>Abordagem clínica</Text>
          <View style={styles.approachGrid}>
            {CLINICAL_APPROACHES.map((approach) => {
              const active = selectedApproaches.has(approach);
              return (
                <TouchableOpacity
                  key={approach}
                  style={[
                    styles.approachChip,
                    {
                      backgroundColor: active ? theme.primary : theme.background,
                      borderColor: active ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => toggleApproach(approach)}
                >
                  <Text style={[styles.approachChipText, { color: active ? "#fff" : theme.foreground }]}>
                    {approach}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {selectedApproaches.size > 0 && (
            <Text style={[styles.approachSummary, { color: theme.mutedForeground }]}>
              {Array.from(selectedApproaches).join(" · ")}
            </Text>
          )}

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

      {/* ── Assinatura ─────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.mutedForeground }]}>ASSINATURA</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {renderSettingRow(
            <CreditCard size={20} color={theme.accent} />,
            "Plano atual",
            "Gerenciar assinatura, faturas e pagamento",
            undefined,
            () => WebBrowser.openBrowserAsync("https://billing.stripe.com/p/login/ethos")
          )}
        </View>
      </View>

      {/* ── Notificações ───────────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.mutedForeground }]}>NOTIFICAÇÕES</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {renderSettingRow(
            <Bell size={20} color={theme.primary} />,
            "Lembretes de sessão",
            "Push 1h antes de cada sessão agendada",
            <Switch
              value={notifySessionReminder}
              onValueChange={setNotifySessionReminder}
              trackColor={{ false: theme.muted, true: theme.primary }}
              thumbColor={theme.card}
            />
          )}
          {renderSettingRow(
            <Bell size={20} color="#edbd2a" />,
            "Lembretes de pagamento",
            "Alerta de cobranças vencidas ou a vencer",
            <Switch
              value={notifyPaymentReminder}
              onValueChange={setNotifyPaymentReminder}
              trackColor={{ false: theme.muted, true: "#edbd2a" }}
              thumbColor={theme.card}
            />
          )}
          {renderSettingRow(
            <Bell size={20} color="#3a9b73" />,
            "Transcrição pronta",
            "Notificar quando a transcrição de áudio concluir",
            <Switch
              value={notifyTranscription}
              onValueChange={setNotifyTranscription}
              trackColor={{ false: theme.muted, true: "#3a9b73" }}
              thumbColor={theme.card}
            />
          )}
          {renderSettingRow(
            <Bell size={20} color={theme.accent} />,
            "Novos agendamentos",
            "Push quando paciente solicitar horário",
            <Switch
              value={notifyNewBooking}
              onValueChange={setNotifyNewBooking}
              trackColor={{ false: theme.muted, true: theme.accent }}
              thumbColor={theme.card}
            />
          )}
        </View>
      </View>

      {/* ── Dispositivo ────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.mutedForeground }]}>CONTA E DISPOSITIVO</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {renderSettingRow(
            <Shield size={20} color={theme.statusValidated} />,
            "Segurança e App Lock",
            biometricsEnabled
              ? "Biometria ativada — bloqueia após 30s em segundo plano"
              : "Ative para bloquear com biometria",
            <Switch
              value={biometricsEnabled}
              onValueChange={async (val) => {
                const ok = await setBiometricEnabled(val);
                if (!ok && val) {
                  Alert.alert("Biometria indisponível", "Não foi possível verificar a biometria neste dispositivo.");
                }
              }}
              trackColor={{ false: theme.muted, true: theme.statusValidated }}
              thumbColor={theme.card}
            />
          )}
          {renderSettingRow(
            <Database size={20} color={theme.accent} />,
            "Sincronização offline",
            "Modo local para continuidade de uso",
            <Switch
              value={offlineMode}
              onValueChange={setOfflineMode}
              trackColor={{ false: theme.muted, true: theme.accent }}
              thumbColor={theme.card}
            />
          )}
          {renderSettingRow(<Moon size={20} color={theme.mutedForeground} />, "Aparência", "Automático (Sistema)")}
          {renderSettingRow(
            <User size={20} color={theme.primary} />,
            "Status da conta",
            user ? "Conta clínica conectada" : "Sem sessão ativa"
          )}
        </View>
      </View>

      {/* ── Backup ─────────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.mutedForeground }]}>BACKUP E DADOS</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {renderSettingRow(
            <Archive size={20} color={theme.primary} />,
            "Gerar backup",
            "Exportar todos os dados em JSON",
            isGeneratingBackup ? <ActivityIndicator size="small" color={theme.primary} /> : undefined,
            isGeneratingBackup ? undefined : handleGenerateBackup
          )}
          {renderSettingRow(
            <Smartphone size={20} color="#3a9b73" />,
            "Restaurar backup",
            "Importar dados de um arquivo JSON",
            undefined,
            handleRestoreBackup
          )}
          {renderSettingRow(
            <Trash2 size={20} color={theme.destructive} />,
            "Purgar todos os dados",
            "Remove permanentemente todos os dados locais",
            undefined,
            () => setShowPurgeModal(true)
          )}
        </View>
      </View>

      {/* ── Mensagens padrão ───────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.mutedForeground }]}>MENSAGENS PADRÃO</Text>
        <View style={[styles.card, styles.templateCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.inputLabel, { color: theme.foreground }]}>Template de lembrete de sessão</Text>
          <TextInput
            style={[styles.templateInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.foreground }]}
            multiline
            value={sessionTemplate}
            onChangeText={setSessionTemplate}
            textAlignVertical="top"
            placeholder="[NOME] e [HORARIO]"
            placeholderTextColor={theme.mutedForeground}
          />

          <Text style={[styles.inputLabel, { color: theme.foreground }]}>Template de cobrança</Text>
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
            Variáveis disponíveis: [NOME], [HORARIO], [VALOR], [CHAVE]
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
          <Text style={[styles.logoutText, { color: theme.destructive }]}>Encerrar sessão segura</Text>
        </TouchableOpacity>
        <Text style={[styles.versionText, { color: theme.mutedForeground }]}>ETHOS v1.0.0</Text>
      </View>

      <PurgeConfirmModal
        visible={showPurgeModal}
        onClose={() => setShowPurgeModal(false)}
        onConfirmed={() => { setShowPurgeModal(false); void handlePurge(); }}
        theme={theme}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, paddingBottom: 8 },
  title: { fontFamily: "Lora", fontSize: 22, fontWeight: "600" },
  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionTitle: {
    fontFamily: "Inter",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  profileCard: { padding: 16, gap: 12 },
  templateCard: { padding: 16, gap: 12 },
  avatarRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 4 },
  avatarImage: { width: 64, height: 64, borderRadius: 32 },
  avatarFallback: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  avatarFallbackText: { fontFamily: "Inter", fontSize: 22, fontWeight: "700" },
  avatarCopy: { flex: 1 },
  avatarTitle: { fontFamily: "Inter", fontSize: 15, fontWeight: "700" },
  avatarSubtitle: { fontFamily: "Inter", fontSize: 13, marginTop: 4 },
  settingRow: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1 },
  iconContainer: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center", marginRight: 16 },
  settingTextContainer: { flex: 1 },
  settingTitle: { fontFamily: "Inter", fontSize: 16, fontWeight: "500" },
  settingDescription: { fontFamily: "Inter", fontSize: 13, marginTop: 2 },
  inputLabel: { fontFamily: "Inter", fontSize: 14, fontWeight: "600" },
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
  templateHint: { fontFamily: "Inter", fontSize: 12, lineHeight: 18 },

  // Approach chips
  approachGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  approachChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  approachChipText: { fontFamily: "Inter", fontSize: 12, fontWeight: "600" },
  approachSummary: { fontFamily: "Inter", fontSize: 12, lineHeight: 18 },

  saveButton: { backgroundColor: "#234e5c", borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  saveButtonText: { color: "#fff", fontFamily: "Inter", fontSize: 15, fontWeight: "700" },

  footer: { marginTop: 40, paddingHorizontal: 16, paddingBottom: 40, alignItems: "center" },
  logoutButton: { width: "100%", paddingVertical: 14, borderRadius: 14, alignItems: "center", marginBottom: 16 },
  logoutText: { fontFamily: "Inter", fontSize: 16, fontWeight: "600" },
  versionText: { fontFamily: "Inter", fontSize: 12 },

  // Purge modal
  purgeOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 24 },
  purgeDialog: { width: "100%", borderRadius: 16, padding: 24, gap: 16 },
  purgeTitle: { fontFamily: "Lora", fontSize: 18, fontWeight: "700" },
  purgeBody: { fontFamily: "Inter", fontSize: 14, lineHeight: 22 },
  purgeInput: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: "Inter",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 1,
  },
  purgeActions: { flexDirection: "row", gap: 10 },
  purgeCancel: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  purgeCancelText: { fontFamily: "Inter", fontSize: 14, fontWeight: "600" },
  purgeConfirm: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  purgeConfirmText: { color: "#fff", fontFamily: "Inter", fontSize: 14, fontWeight: "700" },
});
