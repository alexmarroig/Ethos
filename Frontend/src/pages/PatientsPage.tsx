import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, KeyRound, Loader2, Plus, Search, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatPhone } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { patientService, type Patient } from "@/services/patientService";
import { usePrivacy } from "@/hooks/usePrivacy";
import IntegrationUnavailable from "@/components/IntegrationUnavailable";
import { Skeleton } from "@/components/ui/skeleton";
import { PatientCardSkeleton } from "@/components/SkeletonCards";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type PatientsPageProps = {
  onOpenPatient: (patientId: string) => void;
};

const formatSessionDate = (value?: string) =>
  value
    ? new Date(value).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
      })
    : null;

const formatCurrency = (value?: number) =>
  typeof value === "number"
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
    : null;

const careStatusLabel = (status?: Patient["care_status"]) => {
  switch (status) {
    case "paused":
      return "Pausa";
    case "transferred":
      return "Transferido";
    case "inactive":
      return "Desativado";
    case "active":
    default:
      return "Ativo";
  }
};

const careStatusTone = (status?: Patient["care_status"]) => {
  switch (status) {
    case "paused":
      return "bg-status-pending/10 text-status-pending";
    case "transferred":
      return "bg-primary/10 text-primary";
    case "inactive":
      return "bg-muted text-muted-foreground";
    case "active":
    default:
      return "bg-status-validated/10 text-status-validated";
  }
};

const parseAccessCredentials = (credentials?: string | null) => {
  if (!credentials) return null;
  const emailMatch = credentials.match(/Email:\s*([^|]+)/i);
  const passwordMatch = credentials.match(/Senha:\s*(.+)$/i);
  return {
    email: emailMatch?.[1]?.trim() ?? "",
    password: passwordMatch?.[1]?.trim() ?? "",
  };
};

const PatientsPage = ({ onOpenPatient }: PatientsPageProps) => {
  const { toast } = useToast();
  const { maskName } = usePrivacy();
  const [searchQuery, setSearchQuery] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId: string } | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newWhatsApp, setNewWhatsApp] = useState("");

  const [accessOpen, setAccessOpen] = useState(false);
  const [granting, setGranting] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [portalEmail, setPortalEmail] = useState("");
  const [portalName, setPortalName] = useState("");
  const [portalPassword, setPortalPassword] = useState("");
  const [accessCredentials, setAccessCredentials] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    void loadPatients();
  }, []);

  const filteredPatients = useMemo(
    () => patients.filter((patient) => patient.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [patients, searchQuery],
  );

  async function loadPatients() {
    setLoading(true);
    const result = await patientService.list();
    if (!result.success) {
      setError({ message: result.error.message, requestId: result.request_id });
    } else {
      setPatients(result.data);
      setError(null);
    }
    setLoading(false);
  }

  const openAccessDialog = (patient?: Patient) => {
    setSelectedPatientId(patient?.id ?? patients[0]?.id ?? "");
    setPortalName(patient?.name ?? "");
    setPortalEmail(patient?.portal_access_email ?? patient?.email ?? "");
    setPortalPassword("");
    setAccessCredentials(null);
    setAccessOpen(true);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const result = await patientService.create({
      name: newName.trim(),
      email: newEmail.trim() || undefined,
      whatsapp: newWhatsApp.replace(/\D/g, "") || undefined,
    });

    if (!result.success) {
      toast({ title: "Erro", description: result.error.message, variant: "destructive" });
      setCreating(false);
      return;
    }

    setPatients((prev) => [result.data, ...prev]);
    setCreateOpen(false);
    setNewName("");
    setNewEmail("");
    setNewWhatsApp("");
    toast({ title: "Paciente criado" });
    setCreating(false);
    onOpenPatient(result.data.id);
  };

  const handleGrantAccess = async () => {
    if (!selectedPatientId || !portalEmail.trim() || !portalName.trim()) return;
    setGranting(true);

    const result = await patientService.grantAccess({
      patient_id: selectedPatientId,
      patient_email: portalEmail.trim(),
      patient_name: portalName.trim(),
      patient_password: portalPassword.trim() || undefined,
    });

    if (!result.success) {
      toast({ title: "Erro", description: result.error.message, variant: "destructive" });
      setGranting(false);
      return;
    }

    setAccessCredentials(result.data.credentials);
    toast({
      title: "Acesso criado",
      description:
        result.data.email_delivery?.status === "sent"
          ? "As credenciais também foram enviadas por email."
          : "Copie as credenciais exibidas abaixo para compartilhar com o paciente.",
    });
    setGranting(false);
  };

  const selectedPatient = useMemo(
    () => patients.find((item) => item.id === selectedPatientId),
    [patients, selectedPatientId],
  );
  const hasPortalAccess = Boolean(selectedPatient?.portal_access_created);

  const handleResetAccess = async () => {
    if (!selectedPatientId || !portalEmail.trim() || !portalName.trim()) return;
    setResetting(true);
    const result = await patientService.grantAccess({
      patient_id: selectedPatientId,
      patient_email: portalEmail.trim(),
      patient_name: portalName.trim(),
      patient_password: portalPassword.trim() || undefined,
      reset_password: true,
    });
    setResetting(false);

    if (!result.success) {
      toast({ title: "Erro ao redefinir acesso", description: result.error.message, variant: "destructive" });
      return;
    }

    setAccessCredentials(result.data.credentials);
    await loadPatients();
    toast({
      title: "Acesso redefinido",
      description:
        result.data.email_delivery?.status === "sent"
          ? "As novas credenciais também foram enviadas por email."
          : "Copie ou envie as novas credenciais ao paciente.",
    });
  };

  const accessPayload = useMemo(() => parseAccessCredentials(accessCredentials), [accessCredentials]);

  const handleCopyAccess = async () => {
    if (!accessCredentials) return;
    try {
      await navigator.clipboard.writeText(accessCredentials);
      toast({ title: "Acesso copiado", description: "As credenciais foram copiadas para a área de transferência." });
    } catch {
      toast({ title: "Não foi possível copiar", description: "Copie manualmente as credenciais exibidas.", variant: "destructive" });
    }
  };

  const handleSendAccessEmail = () => {
    const emailToUse = accessPayload?.email || selectedPatient?.portal_access_email || portalEmail.trim();
    if (!emailToUse) return;
    const subject = encodeURIComponent("Seu acesso ao portal do paciente ETHOS");
    const body = encodeURIComponent(
      [
        `Olá, ${portalName || "paciente"}!`,
        "",
        accessPayload
          ? "Seu acesso ao portal do paciente ETHOS foi criado/redefinido."
          : "Aqui estão os detalhes do seu acesso ao portal do paciente ETHOS.",
        "",
        `Email: ${emailToUse}`,
        accessPayload?.password ? `Senha: ${accessPayload.password}` : "(use a senha cadastrada ou solicite redefinição)",
        "",
        "Acesse: https://app.ethos-clinic.com/patient",
      ].filter(Boolean).join("\n"),
    );
    window.open(`mailto:${emailToUse}?subject=${subject}&body=${body}`, "_self");
  };

  const handleSendAccessWhatsApp = () => {
    const patient = patients.find((item) => item.id === selectedPatientId);
    const phone = (patient?.whatsapp ?? patient?.phone ?? "").replace(/\D/g, "");
    if (!phone) {
      toast({ title: "WhatsApp indisponível", description: "Cadastre o WhatsApp do paciente para enviar o acesso.", variant: "destructive" });
      return;
    }
    const emailToUse = accessPayload?.email || selectedPatient?.portal_access_email || portalEmail.trim();
    const message = [
      `Olá, ${portalName || patient?.name || "paciente"}!`,
      "",
      accessPayload
        ? "Seu acesso ao portal do paciente ETHOS foi criado/redefinido."
        : "Aqui estão os detalhes do seu acesso ao portal do paciente ETHOS.",
      "",
      emailToUse ? `Email: ${emailToUse}` : "",
      accessPayload?.password ? `Senha: ${accessPayload.password}` : "(use a senha cadastrada ou solicite redefinição)",
      "",
      "Acesse: https://app.ethos-clinic.com/patient",
    ].filter(Boolean).join("\n");
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return (
      <div className="content-container py-8 md:py-12">
        <Skeleton className="h-10 w-48 mb-2" />
        <Skeleton className="h-5 w-64 mb-8" />
        <Skeleton className="h-11 w-full max-w-md mb-8" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <PatientCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-container py-12">
        <h1 className="font-serif text-3xl font-medium text-foreground mb-6">Pacientes</h1>
        <IntegrationUnavailable message={error.message} requestId={error.requestId} />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12">
        <motion.header className="mb-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="font-serif text-3xl md:text-4xl font-medium text-foreground">Pacientes</h1>
          <p className="mt-2 text-muted-foreground">Cadastre e acompanhe seus pacientes com calma.</p>
        </motion.header>

        <motion.div className="flex flex-col sm:flex-row gap-4 mb-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input type="text" placeholder="Buscar por nome" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="pl-10 h-11" />
          </div>

          <div className="flex gap-2 sm:flex-row flex-wrap">
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" className="gap-2 h-11 w-full sm:w-auto">
                  <Plus className="w-4 h-4" strokeWidth={1.5} />
                  Novo paciente
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-serif text-xl">Novo paciente</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input placeholder="Nome completo *" value={newName} onChange={(event) => setNewName(event.target.value)} />
                  <Input placeholder="Email (opcional)" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} />
                  <Input placeholder="WhatsApp (opcional)" value={newWhatsApp} onChange={(event) => setNewWhatsApp(formatPhone(event.target.value))} />
                </div>
                <DialogFooter>
                  <Button onClick={handleCreate} disabled={creating || !newName.trim()} className="gap-2">
                    {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                    Criar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button variant="ghost" className="gap-2 h-11 w-full sm:w-auto" onClick={() => openAccessDialog()}>
              <KeyRound className="w-4 h-4" strokeWidth={1.5} />
              {hasPortalAccess ? "Enviar acesso" : "Criar acesso"}
            </Button>
          </div>
        </motion.div>

        <Dialog
          open={accessOpen}
          onOpenChange={(open) => {
            setAccessOpen(open);
            if (!open) setAccessCredentials(null);
          }}
        >
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-serif text-xl flex items-center gap-2">
                  {hasPortalAccess
                    ? <><ShieldCheck className="w-5 h-5 text-emerald-600" /> Gerenciar acesso ao portal</>
                    : <><KeyRound className="w-5 h-5" /> Criar acesso ao portal</>
                  }
                </DialogTitle>
                <DialogDescription>
                  {hasPortalAccess
                    ? "Este paciente já tem acesso. Redefina a senha, gere novas credenciais ou envie por email/WhatsApp."
                    : "Gere as credenciais e compartilhe com o paciente por cópia, email ou WhatsApp."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
              {hasPortalAccess && !accessCredentials && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20 p-4 text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <p className="font-medium text-emerald-700 dark:text-emerald-400">Portal ativo</p>
                  </div>
                  <p className="text-muted-foreground text-xs">{(selectedPatient?.portal_access_email ?? portalEmail) || "Email não registrado"}</p>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Paciente</label>
                <select
                  value={selectedPatientId}
                  onChange={(event) => {
                    const nextPatient = patients.find((patient) => patient.id === event.target.value);
                    setSelectedPatientId(event.target.value);
                    setPortalName(nextPatient?.name ?? "");
                    setPortalEmail(nextPatient?.email ?? "");
                  }}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="">Selecione um paciente</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {maskName(patient.name)}
                    </option>
                  ))}
                </select>
              </div>
              <Input placeholder="Nome do paciente" value={portalName} onChange={(event) => setPortalName(event.target.value)} />
              <Input placeholder="Email do paciente" value={portalEmail} onChange={(event) => setPortalEmail(event.target.value)} />
              <Input placeholder="Senha temporária (opcional)" value={portalPassword} onChange={(event) => setPortalPassword(event.target.value)} />
              {accessCredentials && (
                <div className="p-4 rounded-lg bg-status-validated/10 border border-status-validated/20">
                  <p className="text-sm font-medium text-foreground mb-1">Credenciais geradas:</p>
                  <code className="text-xs bg-muted px-2 py-1 rounded block break-all">{accessCredentials}</code>
                </div>
              )}
              {patients.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Cadastre um paciente antes de liberar o acesso.
                </p>
              )}
              </div>
              <DialogFooter>
                {accessCredentials ? (
                  <div className="flex w-full flex-wrap justify-end gap-2">
                    <Button variant="outline" onClick={handleResetAccess} disabled={resetting}>
                      {resetting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      Redefinir acesso
                    </Button>
                    <Button variant="outline" onClick={handleCopyAccess}>
                      Copiar acesso
                    </Button>
                    <Button variant="outline" onClick={handleSendAccessEmail} disabled={!portalEmail.trim()}>
                      Enviar por email
                    </Button>
                    <Button onClick={handleSendAccessWhatsApp}>
                      Enviar por WhatsApp
                    </Button>
                  </div>
                ) : (
                  <div className="flex w-full flex-wrap justify-end gap-2">
                    {hasPortalAccess ? (
                      <>
                        <Button
                          variant="outline"
                          onClick={handleSendAccessEmail}
                          disabled={!portalEmail.trim()}
                          className="gap-2"
                        >
                          Enviar por email
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleSendAccessWhatsApp}
                          className="gap-2"
                        >
                          Enviar por WhatsApp
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleResetAccess}
                          disabled={resetting || patients.length === 0 || !selectedPatientId || !portalName.trim() || !portalEmail.trim()}
                          className="gap-2"
                        >
                          {resetting && <Loader2 className="w-4 h-4 animate-spin" />}
                          Redefinir senha
                        </Button>
                        <Button
                          onClick={handleGrantAccess}
                          disabled={granting || patients.length === 0 || !selectedPatientId || !portalName.trim() || !portalEmail.trim()}
                          className="gap-2"
                        >
                          {granting && <Loader2 className="w-4 h-4 animate-spin" />}
                          Gerar novas credenciais
                        </Button>
                      </>
                    ) : (
                    <Button
                      onClick={handleGrantAccess}
                      disabled={granting || patients.length === 0 || !selectedPatientId || !portalName.trim() || !portalEmail.trim()}
                      className="gap-2"
                    >
                      {granting && <Loader2 className="w-4 h-4 animate-spin" />}
                      Gerar credenciais
                    </Button>
                    )}
                  </div>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>

        <motion.div className="space-y-2" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          {filteredPatients.map((patient, index) => (
            <motion.div
              key={patient.id}
              className="w-full session-card flex items-center justify-between gap-4 group"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + index * 0.05, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <button className="flex-1 text-left" onClick={() => onOpenPatient(patient.id)}>
                <h3 className="font-serif text-lg font-medium text-foreground">{maskName(patient.name)}</h3>
                {/* Email/phone shown only in patient detail, not in list cards */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className={cn("rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]", careStatusTone(patient.care_status))}>
                    {careStatusLabel(patient.care_status)}
                  </span>
                  {patient.portal_access_created ? (
                    <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-600">
                      Portal ativo
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>{typeof patient.total_sessions === "number" ? `${patient.total_sessions} sessões` : "Sem sessões"}</span>
                  {patient.next_session && <span>Próxima: {formatSessionDate(patient.next_session)}</span>}
                  {patient.last_session && <span>Última: {formatSessionDate(patient.last_session)}</span>}
                  {patient.billing?.mode === "per_session" && formatCurrency(patient.billing.session_price) && (
                    <span>Sessão: {formatCurrency(patient.billing.session_price)}</span>
                  )}
                  {patient.billing?.mode === "package" && formatCurrency(patient.billing.package_total_price) && (
                    <span>Pacote: {formatCurrency(patient.billing.package_total_price)}</span>
                  )}
                </div>
              </button>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("hidden sm:flex", patient.portal_access_created && "text-emerald-600 hover:text-emerald-700")}
                  onClick={() => openAccessDialog(patient)}
                  aria-label={patient.portal_access_created ? "Gerenciar acesso ao portal" : "Criar acesso ao portal"}
                  title={patient.portal_access_created ? "Portal ativo — clique para gerenciar" : "Criar acesso ao portal"}
                >
                  {patient.portal_access_created
                    ? <ShieldCheck className="w-4 h-4" strokeWidth={1.5} />
                    : <KeyRound className="w-4 h-4" strokeWidth={1.5} />
                  }
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onOpenPatient(patient.id)} aria-label={`Abrir ficha de ${patient.name}`}>
                  <ChevronRight className="w-5 h-5 text-muted-foreground/70 group-hover:text-muted-foreground transition-colors duration-200" strokeWidth={1.5} />
                </Button>
              </div>
            </motion.div>
          ))}
          {filteredPatients.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Nenhum paciente encontrado.</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default PatientsPage;
