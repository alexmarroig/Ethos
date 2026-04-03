import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, CalendarPlus, FileText, KeyRound, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import IntegrationUnavailable from "@/components/IntegrationUnavailable";
import { useAuth } from "@/contexts/AuthContext";
import { patientService, type PatientDetail } from "@/services/patientService";
import { sessionService } from "@/services/sessionService";
import { contractsApi, documentsApi } from "@/api/clinical";
import { reportService } from "@/services/reportService";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type PatientDetailPageProps = {
  patientId: string;
  onBack: () => void;
  onOpenSession: (sessionId: string) => void;
  onOpenProntuario: (sessionId: string) => void;
};

type PatientFormState = {
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  birth_date: string;
  address: string;
  cpf: string;
  main_complaint: string;
  psychiatric_medications: string;
  has_psychiatric_followup: boolean;
  psychiatrist_name: string;
  psychiatrist_contact: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  notes: string;
  billing_mode: "per_session" | "package";
  session_price: string;
  package_total_price: string;
  package_session_count: string;
};

const emptyForm: PatientFormState = {
  name: "",
  email: "",
  phone: "",
  whatsapp: "",
  birth_date: "",
  address: "",
  cpf: "",
  main_complaint: "",
  psychiatric_medications: "",
  has_psychiatric_followup: false,
  psychiatrist_name: "",
  psychiatrist_contact: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  notes: "",
  billing_mode: "per_session",
  session_price: "",
  package_total_price: "",
  package_session_count: "",
};

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Não definido";

const formatDateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Não definido";

const formatCurrency = (value?: number) =>
  typeof value === "number"
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
    : "Não definido";

const toInputDate = (value?: string) => (value ? new Date(value).toISOString().slice(0, 10) : "");
const buildDocumentTitle = (patientName: string, label: string) => `${label} - ${patientName}`;

export default function PatientDetailPage({
  patientId,
  onBack,
  onOpenSession,
  onOpenProntuario,
}: PatientDetailPageProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [detail, setDetail] = useState<PatientDetail | null>(null);
  const [form, setForm] = useState<PatientFormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<{ message: string; requestId: string } | null>(null);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [sessionDate, setSessionDate] = useState("");
  const [sessionTime, setSessionTime] = useState("");
  const [sessionDuration, setSessionDuration] = useState("50");
  const [accessOpen, setAccessOpen] = useState(false);
  const [grantingAccess, setGrantingAccess] = useState(false);
  const [portalEmail, setPortalEmail] = useState("");
  const [portalName, setPortalName] = useState("");
  const [portalPassword, setPortalPassword] = useState("");
  const [accessCredentials, setAccessCredentials] = useState<string | null>(null);
  const [shortcutLoading, setShortcutLoading] = useState<string | null>(null);

  const loadPatient = useCallback(async () => {
    setLoading(true);
    const result = await patientService.getById(patientId);
    if (!result.success) {
      setError({ message: result.error.message, requestId: result.request_id });
      setDetail(null);
      setLoading(false);
      return;
    }

    setDetail(result.data);
    setError(null);
    setLoading(false);
  }, [patientId]);

  useEffect(() => {
    void loadPatient();
  }, [loadPatient]);

  useEffect(() => {
    if (!detail) return;

    setForm({
      name: detail.patient.name,
      email: detail.patient.email ?? "",
      phone: detail.patient.phone ?? "",
      whatsapp: detail.patient.whatsapp ?? detail.patient.phone ?? "",
      birth_date: toInputDate(detail.patient.birth_date),
      address: detail.patient.address ?? "",
      cpf: detail.patient.cpf ?? "",
      main_complaint: detail.patient.main_complaint ?? "",
      psychiatric_medications: detail.patient.psychiatric_medications ?? "",
      has_psychiatric_followup: Boolean(detail.patient.has_psychiatric_followup),
      psychiatrist_name: detail.patient.psychiatrist_name ?? "",
      psychiatrist_contact: detail.patient.psychiatrist_contact ?? "",
      emergency_contact_name: detail.patient.emergency_contact_name ?? "",
      emergency_contact_phone: detail.patient.emergency_contact_phone ?? "",
      notes: detail.patient.notes ?? "",
      billing_mode: detail.patient.billing?.mode ?? "per_session",
      session_price: detail.patient.billing?.session_price?.toString() ?? "",
      package_total_price: detail.patient.billing?.package_total_price?.toString() ?? "",
      package_session_count: detail.patient.billing?.package_session_count?.toString() ?? "",
    });

    setPortalEmail(detail.patient.email ?? "");
    setPortalName(detail.patient.name);
    setPortalPassword("");
    setAccessCredentials(null);
  }, [detail]);

  const latestSessionId = detail?.summary.last_session?.id ?? detail?.summary.next_session?.id ?? detail?.sessions[0]?.id;

  const summaryCards = useMemo(() => {
    if (!detail) return [];
    return [
      { label: "Total de sessões", value: String(detail.summary.total_sessions) },
      { label: "Próxima sessão", value: formatDateTime(detail.summary.next_session?.scheduled_at) },
      { label: "Última sessão", value: formatDateTime(detail.summary.last_session?.scheduled_at) },
    ];
  }, [detail]);

  const updateForm = <K extends keyof PatientFormState>(key: K, value: PatientFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    if (!detail || !form.name.trim()) return;

    setSaving(true);
    const result = await patientService.update(detail.patient.id, {
      name: form.name.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      whatsapp: form.whatsapp.trim() || undefined,
      birth_date: form.birth_date || undefined,
      address: form.address.trim() || undefined,
      cpf: form.cpf.trim() || undefined,
      main_complaint: form.main_complaint.trim() || undefined,
      psychiatric_medications: form.psychiatric_medications.trim() || undefined,
      has_psychiatric_followup: form.has_psychiatric_followup,
      psychiatrist_name: form.psychiatrist_name.trim() || undefined,
      psychiatrist_contact: form.psychiatrist_contact.trim() || undefined,
      emergency_contact_name: form.emergency_contact_name.trim() || undefined,
      emergency_contact_phone: form.emergency_contact_phone.trim() || undefined,
      billing: {
        mode: form.billing_mode,
        session_price: form.billing_mode === "per_session" && form.session_price ? Number(form.session_price) : undefined,
        package_total_price: form.billing_mode === "package" && form.package_total_price ? Number(form.package_total_price) : undefined,
        package_session_count: form.billing_mode === "package" && form.package_session_count ? Number(form.package_session_count) : undefined,
      },
      notes: form.notes.trim() || undefined,
    });

    if (!result.success) {
      toast({ title: "Erro ao salvar", description: result.error.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    toast({ title: "Ficha do paciente atualizada" });
    setSaving(false);
    await loadPatient();
  };

  const handleCreateSession = async () => {
    if (!detail || !sessionDate || !sessionTime) return;

    setCreatingSession(true);
    const scheduledAt = new Date(`${sessionDate}T${sessionTime}:00`).toISOString();
    const result = await sessionService.create({
      patient_id: detail.patient.id,
      scheduled_at: scheduledAt,
      duration_minutes: Number(sessionDuration) || 50,
    });

    if (!result.success) {
      toast({ title: "Erro ao agendar", description: result.error.message, variant: "destructive" });
      setCreatingSession(false);
      return;
    }

    setCreatingSession(false);
    setSessionDialogOpen(false);
    setSessionDate("");
    setSessionTime("");
    setSessionDuration("50");
    toast({ title: "Sessão criada" });
    await loadPatient();
  };

  const handleOpenLatestProntuario = () => {
    if (!latestSessionId) {
      toast({
        title: "Sessão necessária",
        description: "Crie uma sessão antes de abrir uma nova nota clínica.",
        variant: "destructive",
      });
      return;
    }
    onOpenProntuario(latestSessionId);
  };

  const createTemplateDocument = async (templateId: string, title: string) => {
    if (!detail) return;

    setShortcutLoading(templateId);
    const result = await documentsApi.create({
      patient_id: detail.patient.id,
      case_id: detail.patient.id,
      template_id: templateId,
      title,
    });
    setShortcutLoading(null);

    if (!result.success) {
      toast({ title: "Erro ao criar documento", description: result.error.message, variant: "destructive" });
      return;
    }

    toast({ title: `${title} criado com sucesso` });
    await loadPatient();
  };

  const handleCreateContract = async () => {
    if (!detail) return;

    setShortcutLoading("contract");
    const contractResult = await contractsApi.create({
      patient_id: detail.patient.id,
      psychologist: {
        name: user?.name ?? "Psicólogo responsável",
        license: "",
        email: user?.email ?? "",
      },
      patient: {
        name: detail.patient.name,
        email: detail.patient.email ?? "",
        document: detail.patient.cpf ?? "",
      },
      terms: {
        value:
          form.billing_mode === "package"
            ? `${formatCurrency(Number(form.package_total_price || 0))} por pacote de ${form.package_session_count || "0"} sessões`
            : `${formatCurrency(Number(form.session_price || 0))} por sessão`,
        periodicity: form.billing_mode === "package" ? "pacote" : "sessão",
        absence_policy: "Cancelamentos devem ser informados com antecedência mínima de 24 horas.",
        payment_method: "A combinar",
      },
    } as any);

    if (!contractResult.success) {
      setShortcutLoading(null);
      toast({ title: "Erro ao criar contrato", description: contractResult.error.message, variant: "destructive" });
      return;
    }

    if (detail.patient.email) {
      const sendResult = await contractsApi.send(contractResult.data.id);
      setShortcutLoading(null);
      if (!sendResult.success) {
        toast({ title: "Contrato criado", description: "O envio ficou pendente e pode ser feito depois." });
        return;
      }

      toast({
        title: "Contrato criado e enviado",
        description: sendResult.data.portal_url ? `Portal: ${sendResult.data.portal_url}` : "O link do portal foi gerado.",
      });
      return;
    }

    setShortcutLoading(null);
    toast({ title: "Contrato criado", description: "Paciente sem e-mail. O envio pode ser feito depois." });
  };

  const handleCreateReport = async () => {
    if (!detail) return;

    setShortcutLoading("report");
    const result = await reportService.create({
      patient_id: detail.patient.id,
      purpose: "profissional",
      content: `Relatório psicológico em elaboração referente ao acompanhamento clínico de ${detail.patient.name}.`,
    });
    setShortcutLoading(null);

    if (!result.success) {
      toast({ title: "Erro ao criar relatório", description: result.error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Relatório criado", description: "O relatório inicial já está vinculado ao paciente." });
  };

  const handleGrantAccess = async () => {
    if (!detail || !portalEmail.trim() || !portalName.trim()) return;

    setGrantingAccess(true);
    const result = await patientService.grantAccess({
      patient_id: detail.patient.id,
      patient_email: portalEmail.trim(),
      patient_name: portalName.trim(),
      patient_password: portalPassword.trim() || undefined,
    });
    setGrantingAccess(false);

    if (!result.success) {
      toast({ title: "Erro ao criar acesso", description: result.error.message, variant: "destructive" });
      return;
    }

    setAccessCredentials(result.data.credentials);
    toast({ title: "Acesso do paciente criado" });
  };

  if (loading) {
    return (
      <div className="content-container py-12">
        <p className="text-muted-foreground">Carregando ficha do paciente...</p>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="content-container py-12">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" onClick={onBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
        </div>
        <IntegrationUnavailable message={error?.message ?? "Paciente não encontrado"} requestId={error?.requestId ?? "local"} />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12 space-y-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Button variant="ghost" onClick={onBack} className="gap-2 px-0 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Voltar para pacientes
          </Button>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="font-serif text-3xl md:text-4xl font-medium text-foreground">{detail.patient.name}</h1>
              <p className="mt-2 text-muted-foreground">Ficha clínica completa do paciente, com visão operacional e atalhos de documentos.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Dialog open={sessionDialogOpen} onOpenChange={setSessionDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary" className="gap-2">
                    <CalendarPlus className="w-4 h-4" />
                    Nova sessão
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="font-serif text-xl">Agendar sessão</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input type="date" value={sessionDate} onChange={(event) => setSessionDate(event.target.value)} />
                    <Input type="time" value={sessionTime} onChange={(event) => setSessionTime(event.target.value)} />
                    <Input type="number" min="20" step="10" value={sessionDuration} onChange={(event) => setSessionDuration(event.target.value)} />
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreateSession} disabled={creatingSession || !sessionDate || !sessionTime} className="gap-2">
                      {creatingSession && <Loader2 className="w-4 h-4 animate-spin" />}
                      Agendar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button variant="secondary" className="gap-2" onClick={handleOpenLatestProntuario}>
                <FileText className="w-4 h-4" />
                Nova nota clínica
              </Button>

              <Dialog open={accessOpen} onOpenChange={setAccessOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <KeyRound className="w-4 h-4" />
                    Criar acesso
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="font-serif text-xl">Criar acesso do paciente</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input placeholder="Nome do paciente" value={portalName} onChange={(event) => setPortalName(event.target.value)} />
                    <Input placeholder="E-mail do paciente" value={portalEmail} onChange={(event) => setPortalEmail(event.target.value)} />
                    <Input placeholder="Senha temporária (opcional)" value={portalPassword} onChange={(event) => setPortalPassword(event.target.value)} />
                    {accessCredentials && (
                      <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-foreground">
                        <p className="font-medium mb-2">Credenciais geradas</p>
                        <code className="block break-all text-xs">{accessCredentials}</code>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button onClick={handleGrantAccess} disabled={grantingAccess || !portalName.trim() || !portalEmail.trim()} className="gap-2">
                      {grantingAccess && <Loader2 className="w-4 h-4 animate-spin" />}
                      Gerar acesso
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button onClick={handleSave} disabled={saving || !form.name.trim()} className="gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar ficha
              </Button>
            </div>
          </div>
        </motion.div>

        <motion.div className="grid gap-4 md:grid-cols-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}>
          {summaryCards.map((card) => (
            <div key={card.label} className="session-card">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="mt-2 font-serif text-2xl text-foreground">{card.value}</p>
            </div>
          ))}
        </motion.div>

        <motion.section className="session-card space-y-5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div>
            <h2 className="font-serif text-2xl text-foreground">Identificação</h2>
            <p className="text-sm text-muted-foreground mt-1">Dados de contato e identificação do paciente.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Nome do paciente</label>
              <Input value={form.name} onChange={(event) => updateForm("name", event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">WhatsApp</label>
              <Input value={form.whatsapp} onChange={(event) => updateForm("whatsapp", event.target.value)} placeholder="(11) 99999-9999" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">E-mail</label>
              <Input value={form.email} onChange={(event) => updateForm("email", event.target.value)} placeholder="email@paciente.com" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Telefone legado</label>
              <Input value={form.phone} onChange={(event) => updateForm("phone", event.target.value)} placeholder="Opcional" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Data de nascimento</label>
              <Input type="date" value={form.birth_date} onChange={(event) => updateForm("birth_date", event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">CPF</label>
              <Input value={form.cpf} onChange={(event) => updateForm("cpf", event.target.value)} placeholder="000.000.000-00" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Endereço</label>
            <Textarea value={form.address} onChange={(event) => updateForm("address", event.target.value)} className="min-h-[100px]" />
          </div>
        </motion.section>

        <motion.section className="session-card space-y-5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div>
            <h2 className="font-serif text-2xl text-foreground">Clínico</h2>
            <p className="text-sm text-muted-foreground mt-1">Contexto principal e observações clínicas permanentes.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Queixa principal</label>
            <Textarea value={form.main_complaint} onChange={(event) => updateForm("main_complaint", event.target.value)} className="min-h-[110px]" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Remédios psiquiátricos</label>
            <Textarea value={form.psychiatric_medications} onChange={(event) => updateForm("psychiatric_medications", event.target.value)} className="min-h-[100px]" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Observações adicionais</label>
            <Textarea value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} className="min-h-[120px]" />
          </div>
        </motion.section>

        <motion.section className="session-card space-y-5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div>
            <h2 className="font-serif text-2xl text-foreground">Cobrança</h2>
            <p className="text-sm text-muted-foreground mt-1">Preferência padrão de cobrança para este paciente.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Tipo de cobrança</label>
              <select
                value={form.billing_mode}
                onChange={(event) => updateForm("billing_mode", event.target.value as "per_session" | "package")}
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="per_session">Sessão avulsa</option>
                <option value="package">Pacote</option>
              </select>
            </div>

            {form.billing_mode === "per_session" ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Valor por sessão</label>
                <Input type="number" min="0" step="0.01" value={form.session_price} onChange={(event) => updateForm("session_price", event.target.value)} />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Valor total do pacote</label>
                  <Input type="number" min="0" step="0.01" value={form.package_total_price} onChange={(event) => updateForm("package_total_price", event.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Quantidade de sessões</label>
                  <Input type="number" min="1" step="1" value={form.package_session_count} onChange={(event) => updateForm("package_session_count", event.target.value)} />
                </div>
              </>
            )}
          </div>
        </motion.section>

        <motion.section className="session-card space-y-5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <div>
            <h2 className="font-serif text-2xl text-foreground">Psiquiatria e emergência</h2>
            <p className="text-sm text-muted-foreground mt-1">Rede de cuidado e segurança do caso.</p>
          </div>
          <label className="flex items-center gap-3 text-sm text-foreground">
            <input
              type="checkbox"
              checked={form.has_psychiatric_followup}
              onChange={(event) => updateForm("has_psychiatric_followup", event.target.checked)}
            />
            Em acompanhamento psiquiátrico
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Nome do psiquiatra</label>
              <Input value={form.psychiatrist_name} onChange={(event) => updateForm("psychiatrist_name", event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Contato do psiquiatra</label>
              <Input value={form.psychiatrist_contact} onChange={(event) => updateForm("psychiatrist_contact", event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Contato de emergência</label>
              <Input value={form.emergency_contact_name} onChange={(event) => updateForm("emergency_contact_name", event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Telefone de emergência</label>
              <Input value={form.emergency_contact_phone} onChange={(event) => updateForm("emergency_contact_phone", event.target.value)} />
            </div>
          </div>
        </motion.section>

        <motion.section className="session-card space-y-5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-serif text-2xl text-foreground">Histórico operacional</h2>
              <p className="text-sm text-muted-foreground mt-1">Sessões registradas e atalhos clínicos do caso.</p>
            </div>
            {latestSessionId && (
              <Button variant="outline" onClick={() => onOpenProntuario(latestSessionId)}>
                Abrir prontuário mais recente
              </Button>
            )}
          </div>

          {detail.sessions.length === 0 ? (
            <div className="rounded-xl border border-border bg-muted/30 p-6 text-sm text-muted-foreground">
              Nenhuma sessão vinculada ainda.
            </div>
          ) : (
            <div className="space-y-3">
              {detail.sessions.map((session) => (
                <div key={session.id} className="rounded-xl border border-border bg-background/60 p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium text-foreground">{formatDateTime(session.scheduled_at)}</p>
                    <p className="text-sm text-muted-foreground">
                      {session.duration_minutes ? `${session.duration_minutes} min · ` : ""}
                      {session.status}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => onOpenSession(session.id)}>
                      Abrir sessão
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onOpenProntuario(session.id)}>
                      Nota clínica
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.section>

        <motion.section className="session-card space-y-5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <div>
            <h2 className="font-serif text-2xl text-foreground">Documentos</h2>
            <p className="text-sm text-muted-foreground mt-1">Atalhos rápidos para os principais documentos do caso.</p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Button variant="secondary" onClick={() => void createTemplateDocument("payment-receipt", buildDocumentTitle(detail.patient.name, "Recibo"))} disabled={shortcutLoading === "payment-receipt"} className="justify-start gap-2">
              {shortcutLoading === "payment-receipt" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Criar recibo
            </Button>
            <Button variant="secondary" onClick={() => void createTemplateDocument("attendance-declaration", buildDocumentTitle(detail.patient.name, "Declaração"))} disabled={shortcutLoading === "attendance-declaration"} className="justify-start gap-2">
              {shortcutLoading === "attendance-declaration" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Criar declaração
            </Button>
            <Button variant="secondary" onClick={() => void createTemplateDocument("psychological-certificate", buildDocumentTitle(detail.patient.name, "Atestado psicológico"))} disabled={shortcutLoading === "psychological-certificate"} className="justify-start gap-2">
              {shortcutLoading === "psychological-certificate" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Criar atestado
            </Button>
            <Button variant="outline" onClick={() => void handleCreateContract()} disabled={shortcutLoading === "contract"} className="justify-start gap-2">
              {shortcutLoading === "contract" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Criar contrato
            </Button>
            <Button variant="outline" onClick={() => void handleCreateReport()} disabled={shortcutLoading === "report"} className="justify-start gap-2">
              {shortcutLoading === "report" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Criar relatório
            </Button>
          </div>

          {detail.documents.length === 0 ? (
            <div className="rounded-xl border border-border bg-muted/30 p-6 text-sm text-muted-foreground">
              Nenhum documento clínico vinculado a este paciente ainda.
            </div>
          ) : (
            <div className="space-y-3">
              {detail.documents.map((document) => (
                <div key={(document as { id: string }).id} className="rounded-xl border border-border bg-background/60 p-4">
                  <p className="font-medium text-foreground">{(document as { title?: string }).title ?? "Documento"}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Template {(document as { template_id?: string }).template_id ?? "n/a"} · criado em {formatDate((document as { created_at?: string }).created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </motion.section>

        <motion.section className="session-card space-y-5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div>
            <h2 className="font-serif text-2xl text-foreground">Diário emocional</h2>
            <p className="text-sm text-muted-foreground mt-1">Últimos registros do paciente para consulta rápida.</p>
          </div>

          {detail.emotional_diary.length === 0 ? (
            <div className="rounded-xl border border-border bg-muted/30 p-6 text-sm text-muted-foreground">
              Ainda não há registros emocionais vinculados.
            </div>
          ) : (
            <div className="space-y-3">
              {detail.emotional_diary.slice(0, 5).map((entry: any) => (
                <div key={entry.id} className="rounded-xl border border-border bg-background/60 p-4">
                  <p className="font-medium text-foreground">{formatDateTime(entry.date)} · Humor {entry.mood}/5 · Intensidade {entry.intensity}/10</p>
                  <p className="text-sm text-muted-foreground mt-2">{entry.description || entry.thoughts || "Sem descrição adicional."}</p>
                </div>
              ))}
            </div>
          )}
        </motion.section>
      </div>
    </div>
  );
}
