import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { User, CreditCard, Shield, Loader2, ExternalLink, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useEntitlements } from "@/contexts/EntitlementsContext";
import { billingService } from "@/services/billingService";
import { useToast } from "@/hooks/use-toast";
import { templatesApi } from "@/api/clinical";
import { DEFAULT_CONTRACT_TEMPLATE } from "@/lib/defaultContractTemplate";
import { defaultPaymentReminderSettings, readPaymentReminderSettings, savePaymentReminderSettings } from "@/services/paymentReminderSettings";
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
    toast({ title: "Configuração salva", description: "Os lembretes de pagamento foram atualizados neste navegador." });
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

        <motion.section
          className="mt-6 p-6 rounded-xl border border-border bg-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="font-serif text-lg font-medium text-foreground">Cobrança e lembretes</h2>
            <Button onClick={handleSavePaymentSettings}>Salvar configuração</Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Forma padrão de pagamento</label>
              <Input
                value={paymentSettings.paymentMethodLabel}
                onChange={(event) => setPaymentSettings((current) => ({ ...current, paymentMethodLabel: event.target.value }))}
                placeholder="PIX, transferência..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Chave PIX / dados bancários</label>
              <Input
                value={paymentSettings.paymentDestination}
                onChange={(event) => setPaymentSettings((current) => ({ ...current, paymentDestination: event.target.value }))}
                placeholder="pix@email.com ou dados bancários"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-foreground">Mensagem padrão do lembrete</label>
              <Textarea
                value={paymentSettings.defaultTemplate}
                onChange={(event) => setPaymentSettings((current) => ({ ...current, defaultTemplate: event.target.value }))}
                className="min-h-[180px]"
              />
              <p className="text-xs text-muted-foreground">Use as variáveis {'{patient_name}'}, {'{amount}'}, {'{payment_method}'}, {'{payment_destination}'} e {'{preferred_day}'}.</p>
            </div>
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

