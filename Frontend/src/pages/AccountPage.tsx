import { useEffect, useRef, useState } from "react";
import { formatPhone } from "@/lib/utils";
import { motion } from "framer-motion";
import { User, CreditCard, Shield, Loader2, ExternalLink, Camera, WifiOff, RefreshCw, QrCode, MessageCircle, CheckCircle2, Bell, ChevronDown, ChevronUp, Banknote, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useEntitlements } from "@/contexts/EntitlementsContext";
import { billingService } from "@/services/billingService";
import { useToast } from "@/hooks/use-toast";
import { templatesApi, whatsappApi, sessionReminderApi } from "@/api/clinical";
import type { WhatsAppConnectionState, SessionReminderConfig } from "@/api/clinical";
import { DEFAULT_CONTRACT_TEMPLATE } from "@/lib/defaultContractTemplate";
import { defaultPaymentReminderSettings, readPaymentReminderSettings, savePaymentReminderSettings } from "@/services/paymentReminderSettings";
import { Switch } from "@/components/ui/switch";
import type { DocumentTemplate } from "@/api/types";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const statusLabels: Record<string, { label: string; className: string }> = {
  trialing: { label: "Trial", className: "bg-blue-500/10 text-blue-600" },
  active: { label: "Ativa", className: "bg-status-validated/10 text-status-validated" },
  past_due: { label: "Pagamento pendente", className: "bg-destructive/10 text-destructive" },
  canceled: { label: "Cancelada", className: "bg-muted text-muted-foreground" },
  none: { label: "Sem assinatura", className: "bg-muted text-muted-foreground" },
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const readAvatarDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(file);
  });

const AccountPage = () => {
  const { user, isCloudAuthenticated, updateProfile } = useAuth();
  const { subscription, fetchSubscription } = useEntitlements();
  const { toast } = useToast();
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [contractTemplates, setContractTemplates] = useState<DocumentTemplate[]>([]);
  const [templateManagerOpen, setTemplateManagerOpen] = useState(false);
  const [templateDraftId, setTemplateDraftId] = useState<string | null>(null);
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateBody, setTemplateBody] = useState(DEFAULT_CONTRACT_TEMPLATE);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState(defaultPaymentReminderSettings);
  const [billingCollapsed, setBillingCollapsed] = useState(true);

  // Session reminder (backend)
  const [sessionConfig, setSessionConfig] = useState<SessionReminderConfig>({
    enabled: false,
    hoursBeforeSession: 24,
    template: "Lembrete ETHOS\n\nOlá, {patient_name}! 👋\n\nLembro que temos sessão agendada para {session_date} às {session_time}.\n\nResponda *SIM* para confirmar sua presença.\n\nQualquer dúvida, estou à disposição. Até lá! 🌱",
  });
  const [sessionCollapsed, setSessionCollapsed] = useState(true);
  const [savingSession, setSavingSession] = useState(false);

  // WhatsApp — simplified
  const [waStatus, setWaStatus] = useState<WhatsAppConnectionState>("unknown");
  const [waQR, setWaQR] = useState<string>("");
  const [waConnecting, setWaConnecting] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const statusPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [profile, setProfile] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    avatar_url: user?.avatar_url ?? "",
    crp: user?.crp ?? "",
    rg: user?.rg ?? "",
    cpf: user?.cpf ?? "",
    gender: user?.gender ?? ("" as "F" | "M" | ""),
    specialty: user?.specialty ?? "",
    clinical_approach: user?.clinical_approach ?? "",
  });

  useEffect(() => {
    if (isCloudAuthenticated) {
      fetchSubscription();
    }
  }, [isCloudAuthenticated, fetchSubscription]);

  useEffect(() => {
    const loadTemplates = async () => {
      const result = await templatesApi.list();
      if (result.success) {
        setContractTemplates(result.data.filter((template) => template.kind === "contract"));
      }
    };

    void loadTemplates();
  }, []);

  const isProfileIncomplete = user?.role === "professional" && !(user.crp && user.specialty && user.clinical_approach);

  useEffect(() => {
    setProfile({
      name: user?.name ?? "",
      email: user?.email ?? "",
      avatar_url: user?.avatar_url ?? "",
      crp: user?.crp ?? "",
      rg: user?.rg ?? "",
      cpf: user?.cpf ?? "",
      gender: user?.gender ?? ("" as "F" | "M" | ""),
      specialty: user?.specialty ?? "",
      clinical_approach: user?.clinical_approach ?? "",
    });
  }, [user]);

  useEffect(() => {
    setPaymentSettings(readPaymentReminderSettings());

    // Load session reminder config from backend
    void sessionReminderApi.getConfig().then((r) => {
      if (r.success && r.data) setSessionConfig(r.data);
    });

    // Load initial WhatsApp status
    void whatsappApi.getStatus().then((r) => {
      if (r.success) setWaStatus(r.data.state);
    });
  }, []);

  const roleName =
    user?.role === "admin" ? "Administrador" : user?.role === "patient" ? "Paciente" : "Profissional";

  const subStatus = subscription?.status || "none";
  const badge = statusLabels[subStatus] || statusLabels.none;

  const handleCheckout = async () => {
    setLoadingCheckout(true);
    const res = await billingService.createCheckoutSession();
    setLoadingCheckout(false);
    if (res.success && res.data.url) {
      window.open(res.data.url, "_blank");
    } else {
      toast({ title: "Erro", description: "Não foi possível iniciar o checkout.", variant: "destructive" });
    }
  };

  const handleManage = () => {
    if (subscription?.portal_url) {
      window.open(subscription.portal_url, "_blank");
    } else {
      toast({ title: "Indisponível", description: "Portal de assinatura não disponível." });
    }
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const avatarUrl = await readAvatarDataUrl(file);
      setProfile((current) => ({ ...current, avatar_url: avatarUrl }));
    } catch (error: any) {
      toast({
        title: "Foto indisponível",
        description: error?.message ?? "Não foi possível carregar a foto.",
        variant: "destructive",
      });
    } finally {
      event.target.value = "";
    }
  };

  const handleSaveProfile = async () => {
    if (!profile.name.trim()) {
      toast({ title: "Nome obrigatório", description: "Informe seu nome profissional.", variant: "destructive" });
      return;
    }
    if (!EMAIL_REGEX.test(profile.email.trim())) {
      toast({ title: "Email inválido", description: "Informe um email válido.", variant: "destructive" });
      return;
    }

    setIsSavingProfile(true);
    const success = await updateProfile({
      name: profile.name.trim(),
      email: profile.email.trim().toLowerCase(),
      avatar_url: profile.avatar_url || undefined,
      crp: profile.crp.trim() || undefined,
      rg: profile.rg.trim() || undefined,
      cpf: profile.cpf.trim() || undefined,
      gender: (profile.gender as "F" | "M") || undefined,
      specialty: profile.specialty.trim() || undefined,
      clinical_approach: profile.clinical_approach.trim() || undefined,
    });
    setIsSavingProfile(false);

    if (success) {
      toast({ title: "Perfil salvo", description: "Seus dados foram atualizados." });
    } else {
      toast({
        title: "Não foi possível salvar",
        description: "Revise o email informado ou tente novamente em instantes.",
        variant: "destructive",
      });
    }
  };

  const openTemplateManager = (template?: DocumentTemplate) => {
    setTemplateDraftId(template?.id ?? null);
    setTemplateTitle(template?.name ?? template?.title ?? "");
    setTemplateDescription(template?.description ?? "");
    // When creating new, pre-fill with the default ETHOS template so user can edit it
    setTemplateBody(template?.template_body ?? template?.html ?? DEFAULT_CONTRACT_TEMPLATE);
    setTemplateManagerOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!templateTitle.trim()) return;
    setTemplateSaving(true);

    const payload = {
      title: templateTitle.trim(),
      description: templateDescription.trim() || undefined,
      kind: "contract" as const,
      version: 1,
      html: templateBody,
      fields: [],
    };

    const result = templateDraftId
      ? await templatesApi.update(templateDraftId, payload)
      : await templatesApi.create(payload);

    setTemplateSaving(false);

    if (!result.success) {
      toast({ title: "Erro ao salvar modelo", description: result.error.message, variant: "destructive" });
      return;
    }

    setContractTemplates((current) => {
      const exists = current.some((item) => item.id === result.data.id);
      return exists ? current.map((item) => (item.id === result.data.id ? result.data : item)) : [result.data, ...current];
    });
    setTemplateManagerOpen(false);
    setTemplateDraftId(null);
    setTemplateTitle("");
    setTemplateDescription("");
    setTemplateBody(DEFAULT_CONTRACT_TEMPLATE);
    toast({ title: "Modelo salvo" });
  };

  const handleDeleteTemplate = async (templateId: string) => {
    const result = await templatesApi.remove(templateId);
    if (!result.success) {
      toast({ title: "Erro ao remover modelo", description: result.error.message, variant: "destructive" });
      return;
    }
    setContractTemplates((current) => current.filter((item) => item.id !== templateId));
    toast({ title: "Modelo removido" });
  };

  const handleSavePaymentSettings = () => {
    savePaymentReminderSettings(paymentSettings);
    setBillingCollapsed(true);
    toast({ title: "Configuração salva", description: "Os lembretes de pagamento foram atualizados neste navegador." });
  };

  const handleSaveSessionSettings = async () => {
    setSavingSession(true);
    const r = await sessionReminderApi.saveConfig(sessionConfig);
    setSavingSession(false);
    if (!r.success) {
      toast({ title: "Erro ao salvar", description: r.error.message, variant: "destructive" });
      return;
    }
    setSessionCollapsed(true);
    toast({ title: "Configuração salva", description: "As configurações de lembrete de sessão foram atualizadas." });
  };

  const handleWaQuickConnect = async () => {
    setWaConnecting(true);
    setWaQR("");
    const r = await whatsappApi.quickConnect();
    setWaConnecting(false);
    if (!r.success) {
      toast({ title: "Erro ao conectar", description: r.error.message, variant: "destructive" });
      return;
    }
    if (r.data.state === "open") {
      setWaStatus("open");
      toast({ title: "WhatsApp já conectado! ✅" });
      return;
    }
    const b64 = r.data.qr?.base64 ?? "";
    setWaQR(b64.startsWith("data:") ? b64 : `data:image/png;base64,${b64}`);
    if (statusPollRef.current) clearInterval(statusPollRef.current);
    statusPollRef.current = setInterval(() => { void refreshWaStatus(); }, 3000);
  };

  const refreshWaStatus = async () => {
    const r = await whatsappApi.getStatus();
    if (r.success) {
      setWaStatus(r.data.state);
      if (r.data.state === "open") {
        setWaQR("");
        if (statusPollRef.current) { clearInterval(statusPollRef.current); statusPollRef.current = null; }
        toast({ title: "WhatsApp conectado! ✅", description: "Lembretes automáticos estão ativos." });
      }
    }
  };

  const handleSendTestMessage = async () => {
    if (!testPhone) return;
    const r = await whatsappApi.sendTest(testPhone, "Olá! Teste do Ethos 👋 Se recebeu esta mensagem, o WhatsApp está configurado corretamente.");
    if (r.success) {
      toast({ title: "Mensagem enviada!", description: `Mensagem de teste enviada para ${testPhone}.` });
    } else {
      toast({ title: "Erro ao enviar", description: r.error.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12">
        <motion.header
          className="mb-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="font-serif text-3xl md:text-4xl font-medium text-foreground">Minha conta</h1>
        </motion.header>

        <motion.section
          className="mb-6 p-6 rounded-xl border border-border bg-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
        {isProfileIncomplete && (
          <div className="mb-6 p-4 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-start gap-3">
            <div className="mt-0.5">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-sm">Complete seu perfil</p>
              <p className="text-xs opacity-90 mt-0.5">Para liberar todas as funcionalidades do ETHOS, preencha seus dados profissionais (CRP, Especialidade e Abordagem) abaixo.</p>
            </div>
          </div>
        )}
          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            <div className="flex items-center gap-4">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Foto de perfil" className="h-16 w-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-7 h-7 text-primary" strokeWidth={1.5} />
                </div>
              )}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:border-primary/50">
                <Camera className="h-4 w-4" />
                Foto de perfil
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </label>
            </div>

            <div className="grid flex-1 gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-foreground">Nome</label>
                <Input value={profile.name} onChange={(e) => setProfile((c) => ({ ...c, name: e.target.value }))} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-foreground">Email</label>
                <Input value={profile.email} onChange={(e) => setProfile((c) => ({ ...c, email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">CRP</label>
                <Input value={profile.crp} onChange={(e) => setProfile((c) => ({ ...c, crp: e.target.value }))} placeholder="06/211111" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Gênero</label>
                <select
                  value={profile.gender}
                  onChange={(e) => setProfile((c) => ({ ...c, gender: e.target.value as "F" | "M" | "" }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Não informado</option>
                  <option value="F">Feminino</option>
                  <option value="M">Masculino</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">RG</label>
                <Input value={profile.rg} onChange={(e) => setProfile((c) => ({ ...c, rg: e.target.value }))} placeholder="00.000.000-0" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">CPF</label>
                <Input value={profile.cpf} onChange={(e) => setProfile((c) => ({ ...c, cpf: e.target.value }))} placeholder="000.000.000-00" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Especialidade</label>
                <Input value={profile.specialty} onChange={(e) => setProfile((c) => ({ ...c, specialty: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Abordagem clínica</label>
                <Input value={profile.clinical_approach} onChange={(e) => setProfile((c) => ({ ...c, clinical_approach: e.target.value }))} />
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
              <span className="text-sm text-muted-foreground">Perfil: {roleName}</span>
            </div>
            <Button onClick={handleSaveProfile} disabled={isSavingProfile}>
              {isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar perfil"}
            </Button>
          </div>
        </motion.section>

        <motion.section
          className="p-6 rounded-xl border border-border bg-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            <h2 className="font-serif text-lg font-medium text-foreground">Assinatura</h2>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${badge.className}`}>{badge.label}</span>
            {subscription?.plan ? (
              <span className="text-xs text-muted-foreground">Plano: {subscription.plan}</span>
            ) : null}
          </div>

          {!isCloudAuthenticated ? (
            <p className="text-sm text-muted-foreground mb-4">
              Conecte-se ao plano cloud para gerenciar sua assinatura.
            </p>
          ) : null}

          <div className="flex gap-3">
            <Button variant="default" className="gap-2" onClick={handleCheckout} disabled={loadingCheckout}>
              {loadingCheckout ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
              Assinar / Upgrade
            </Button>
            <Button variant="secondary" className="gap-2" onClick={handleManage} disabled={!subscription?.portal_url}>
              Gerenciar assinatura
            </Button>
          </div>
        </motion.section>

        <motion.section
          className="mt-6 p-6 rounded-xl border border-border bg-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="font-serif text-lg font-medium text-foreground">Modelos de contrato</h2>
            <Button variant="secondary" onClick={() => openTemplateManager()}>
              Novo modelo
            </Button>
          </div>

          {contractTemplates.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum modelo personalizado criado ainda.</p>
          ) : (
            <div className="space-y-3">
              {contractTemplates.map((template) => (
                <div key={template.id} className="rounded-lg border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{template.name ?? template.title}</p>
                      {template.description ? <p className="mt-1 text-sm text-muted-foreground">{template.description}</p> : null}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openTemplateManager(template)}>Editar</Button>
                      <Button variant="ghost" size="sm" onClick={() => void handleDeleteTemplate(template.id)}>Remover</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.section>

        {/* ── Comunicação com pacientes ─────────────────────────────────── */}
        <motion.section
          className="mt-6 rounded-2xl border border-border bg-card overflow-hidden"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          {/* Header da seção */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Bell className="h-4 w-4 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="font-serif text-lg font-medium text-foreground">Comunicação com pacientes</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Lembretes automáticos via WhatsApp para sessões e cobranças</p>
            </div>
          </div>

          {/* ── Bloco 1: WhatsApp ── */}
          <div className="px-6 py-5 border-b border-border">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                  <MessageCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">WhatsApp</p>
                  <p className="text-xs text-muted-foreground">Canal de envio das mensagens</p>
                </div>
              </div>
              {waStatus === "open" ? (
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" /> Conectado
                </span>
              ) : waStatus === "connecting" ? (
                <span className="flex items-center gap-1.5 rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-semibold text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400">
                  <Loader2 className="w-3 h-3 animate-spin" /> Conectando…
                </span>
              ) : (
                <span className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                  <WifiOff className="w-3 h-3" /> Desconectado
                </span>
              )}
            </div>

            <div className="mt-4">
              {waStatus !== "open" && !waQR && (
                <Button className="gap-2 w-full sm:w-auto" onClick={() => void handleWaQuickConnect()} disabled={waConnecting}>
                  {waConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                  {waConnecting ? "Gerando QR code…" : "Conectar WhatsApp"}
                </Button>
              )}
              {waQR && (
                <div className="flex flex-col items-center gap-4 py-6 rounded-2xl border border-border bg-white dark:bg-card/50">
                  <p className="text-sm font-semibold text-foreground">Escaneie com o WhatsApp do celular</p>
                  <img src={waQR} alt="QR Code WhatsApp" className="w-56 h-56 object-contain rounded-xl" />
                  <p className="text-xs text-muted-foreground text-center max-w-xs">
                    WhatsApp → Aparelhos conectados → Conectar aparelho → Aponte a câmera para o código acima
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" /> Aguardando conexão…
                  </div>
                </div>
              )}
              {waStatus === "open" && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={testPhone}
                      onChange={(e) => setTestPhone(formatPhone(e.target.value))}
                      placeholder="Ex: 5511999999999"
                      className="flex-1 text-sm"
                    />
                    <Button variant="outline" className="gap-2 shrink-0" onClick={() => void handleSendTestMessage()} disabled={!testPhone}>
                      <MessageCircle className="w-4 h-4" />
                      Enviar teste
                    </Button>
                  </div>
                  <button
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => void handleWaQuickConnect()}
                  >
                    <RefreshCw className="w-3 h-3" /> Reconectar
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Bloco 2: Lembrete de sessão ── */}
          <div className="border-b border-border">
            <button
              className="flex w-full items-center justify-between gap-3 px-6 py-5 text-left"
              onClick={() => setSessionCollapsed((v) => !v)}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Clock className="h-4 w-4 text-primary" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Lembrete de sessão</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {sessionConfig.enabled
                      ? `Ativo · ${sessionConfig.hoursBeforeSession === 24 ? "1 dia antes" : sessionConfig.hoursBeforeSession === 48 ? "2 dias antes" : `${sessionConfig.hoursBeforeSession}h antes`}`
                      : "Desativado"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Switch
                  checked={sessionConfig.enabled}
                  onCheckedChange={(checked) => {
                    setSessionConfig((c) => ({ ...c, enabled: checked }));
                    void sessionReminderApi.saveConfig({ ...sessionConfig, enabled: checked });
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                {sessionCollapsed ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
              </div>
            </button>

            {!sessionCollapsed && (
              <div className="px-6 pb-5 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Quando enviar</label>
                  <select
                    value={sessionConfig.hoursBeforeSession}
                    onChange={(e) => setSessionConfig((c) => ({ ...c, hoursBeforeSession: Number(e.target.value) }))}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {[1, 2, 4, 8, 12, 24, 48].map((h) => (
                      <option key={h} value={h}>
                        {h === 1 ? "1 hora antes" : h < 24 ? `${h} horas antes` : h === 24 ? "1 dia antes" : "2 dias antes"}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Mensagem</label>
                  <Textarea
                    value={sessionConfig.template}
                    onChange={(e) => setSessionConfig((c) => ({ ...c, template: e.target.value }))}
                    className="min-h-[120px] max-h-[200px] resize-none text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Variáveis disponíveis: <code className="rounded bg-muted px-1">{'{patient_name}'}</code>{' '}
                    <code className="rounded bg-muted px-1">{'{session_date}'}</code>{' '}
                    <code className="rounded bg-muted px-1">{'{session_time}'}</code>{' '}
                    <code className="rounded bg-muted px-1">{'{psychologist_name}'}</code>
                  </p>
                  <p className="text-xs text-muted-foreground">Ative individualmente na ficha de cada paciente.</p>
                </div>
                <Button onClick={() => void handleSaveSessionSettings()} disabled={savingSession} size="sm">
                  {savingSession ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                  Salvar
                </Button>
              </div>
            )}
          </div>

          {/* ── Bloco 3: Lembrete de cobrança ── */}
          <div>
            <button
              className="flex w-full items-center justify-between gap-3 px-6 py-5 text-left"
              onClick={() => setBillingCollapsed((v) => !v)}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                  <Banknote className="h-4 w-4 text-amber-600 dark:text-amber-400" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Lembrete de cobrança</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {paymentSettings.paymentMethodLabel
                      ? `${paymentSettings.paymentMethodLabel}${paymentSettings.paymentDestination ? ` · ${paymentSettings.paymentDestination}` : ""}`
                      : "Não configurado"}
                  </p>
                </div>
              </div>
              {billingCollapsed ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />}
            </button>

            {!billingCollapsed && (
              <div className="px-6 pb-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Forma de pagamento</label>
                    <Input
                      value={paymentSettings.paymentMethodLabel}
                      onChange={(event) => setPaymentSettings((current) => ({ ...current, paymentMethodLabel: event.target.value }))}
                      placeholder="PIX, transferência, cartão…"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Chave PIX ou dados bancários</label>
                    <Input
                      value={paymentSettings.paymentDestination}
                      onChange={(event) => setPaymentSettings((current) => ({ ...current, paymentDestination: event.target.value }))}
                      placeholder="pix@email.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Mensagem</label>
                  <Textarea
                    value={paymentSettings.defaultTemplate}
                    onChange={(event) => setPaymentSettings((current) => ({ ...current, defaultTemplate: event.target.value }))}
                    className="min-h-[100px] max-h-[160px] resize-none text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Variáveis: <code className="rounded bg-muted px-1">{'{patient_name}'}</code>{' '}
                    <code className="rounded bg-muted px-1">{'{amount}'}</code>{' '}
                    <code className="rounded bg-muted px-1">{'{payment_method}'}</code>{' '}
                    <code className="rounded bg-muted px-1">{'{payment_destination}'}</code>
                  </p>
                </div>
                <Button onClick={handleSavePaymentSettings} size="sm">Salvar</Button>
              </div>
            )}
          </div>
        </motion.section>
      </div>

      <Dialog open={templateManagerOpen} onOpenChange={setTemplateManagerOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">{templateDraftId ? "Editar modelo" : "Novo modelo de contrato"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Título do modelo" value={templateTitle} onChange={(event) => setTemplateTitle(event.target.value)} />
            <Input placeholder="Descrição (opcional)" value={templateDescription} onChange={(event) => setTemplateDescription(event.target.value)} />
            <p className="text-xs text-muted-foreground">
              As variáveis <code className="bg-muted px-1 rounded">{"{{psychologist_name}}"}</code>, <code className="bg-muted px-1 rounded">{"{{patient_name}}"}</code>, <code className="bg-muted px-1 rounded">{"{{contract_value}}"}</code> e outras serão preenchidas automaticamente ao gerar um contrato.
            </p>
            <Textarea value={templateBody} onChange={(event) => setTemplateBody(event.target.value)} className="min-h-[400px] font-mono text-xs" />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setTemplateManagerOpen(false)}>Fechar</Button>
            <Button onClick={() => void handleSaveTemplate()} disabled={templateSaving || !templateTitle.trim()}>
              {templateSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Salvar modelo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountPage;

