import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Download, ExternalLink, Loader2, Plus, ScrollText, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { contractsApi } from "@/api/clinical";
import type { Contract } from "@/api/types";
import IntegrationUnavailable from "@/components/IntegrationUnavailable";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { patientService, type Patient } from "@/services/patientService";
import { cn } from "@/lib/utils";
import { buildContractHtml } from "@/lib/documentBuilders";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const defaultTerms = {
  periodicity: "Sessões semanais",
  absence_policy: "Cancelamentos devem ocorrer com 24h de antecedência.",
  payment_method: "Pix ou transferência",
};

const formatCurrency = (value: string) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return value;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(parsed);
};

const ContractsPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [value, setValue] = useState("");
  const [periodicity, setPeriodicity] = useState(defaultTerms.periodicity);
  const [absencePolicy, setAbsencePolicy] = useState(defaultTerms.absence_policy);
  const [paymentMethod, setPaymentMethod] = useState(defaultTerms.payment_method);
  const [sendAfterCreate, setSendAfterCreate] = useState(true);
  const [previewContract, setPreviewContract] = useState<Contract | null>(null);

  useEffect(() => {
    const load = async () => {
      const [contractsRes, patientsRes] = await Promise.all([
        contractsApi.list(),
        patientService.list(),
      ]);

      if (!contractsRes.success) {
        setError({ message: contractsRes.error.message, requestId: contractsRes.request_id });
      } else {
        setContracts(contractsRes.data);
      }

      if (patientsRes.success) {
        setPatients(patientsRes.data);
      }

      setLoading(false);
    };

    void load();
  }, []);

  const patientMap = useMemo(
    () => new Map(patients.map((patient) => [patient.id, patient])),
    [patients],
  );

  const resetForm = () => {
    setPatientId("");
    setValue("");
    setPeriodicity(defaultTerms.periodicity);
    setAbsencePolicy(defaultTerms.absence_policy);
    setPaymentMethod(defaultTerms.payment_method);
    setSendAfterCreate(true);
  };

  const refreshContracts = async () => {
    const result = await contractsApi.list();
    if (result.success) {
      setContracts(result.data);
    }
  };

  const handleCreate = async () => {
    const patient = patientMap.get(patientId);
    if (!patient || !user) return;

    setCreating(true);
    const createResult = await contractsApi.create({
      patient_id: patient.id,
      psychologist: {
        name: user.name,
        license: "CRP não informado",
        email: user.email,
      },
      patient: {
        name: patient.name,
        email: patient.email ?? "",
        document: patient.cpf ?? "",
      },
      terms: {
        value: value.trim() || "Valor não informado",
        periodicity: periodicity.trim() || defaultTerms.periodicity,
        absence_policy: absencePolicy.trim() || defaultTerms.absence_policy,
        payment_method: paymentMethod.trim() || defaultTerms.payment_method,
      },
    });

    if (!createResult.success) {
      toast({ title: "Erro ao criar contrato", description: createResult.error.message, variant: "destructive" });
      setCreating(false);
      return;
    }

    let createdContract = createResult.data;

    if (sendAfterCreate) {
      const sendResult = await contractsApi.send(createdContract.id);
      if (sendResult.success) {
        createdContract = {
          ...createdContract,
          portal_url: sendResult.data.portal_url,
          status: "sent",
        };
      }
    }

    setContracts((current) => [createdContract, ...current]);
    setDialogOpen(false);
    setCreating(false);
    resetForm();
    toast({ title: sendAfterCreate ? "Contrato criado e enviado" : "Contrato criado" });
  };

  const handleSend = async (id: string) => {
    const result = await contractsApi.send(id);
    if (!result.success) {
      toast({ title: "Erro ao enviar contrato", description: result.error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Contrato enviado", description: "Link do portal gerado." });
    await refreshContracts();
  };

  const handleExport = async (id: string, format: "pdf" | "docx") => {
    const result = await contractsApi.exportContract(id, format);
    if (!result.success) {
      toast({ title: "Erro ao exportar", description: result.error.message, variant: "destructive" });
      return;
    }

    const contract = contracts.find((item) => item.id === id);
    const html = buildContractHtml(contract ?? {});

    if (format === "pdf") {
      const win = window.open("", "_blank", "noopener,noreferrer,width=980,height=900");
      if (!win) {
        toast({ title: "Popup bloqueado", description: "Permita popups para abrir a visualizacao do PDF.", variant: "destructive" });
        return;
      }
      win.document.write(html);
      win.document.close();
      win.focus();
      win.print();
      toast({ title: "Visualizacao aberta", description: "Use a impressao do navegador para salvar em PDF." });
      return;
    }

    const blob = new Blob([html], { type: "application/msword" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `contrato-${id}.doc`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(href);

    toast({ title: "Contrato exportado", description: "O arquivo foi baixado em formato compatível com Word." });
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "accepted":
        return "Aceito";
      case "sent":
        return "Enviado";
      case "expired":
        return "Expirado";
      default:
        return "Rascunho";
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "accepted":
        return "bg-status-validated/10 text-status-validated";
      case "sent":
        return "bg-status-pending/10 text-status-pending";
      case "expired":
        return "bg-destructive/10 text-destructive";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="content-container py-12">
        <p className="loading-text">Carregando contratos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-container py-12">
        <h1 className="font-serif text-3xl font-medium text-foreground mb-6">Contratos</h1>
        <IntegrationUnavailable message={error.message} requestId={error.requestId} />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12">
        <motion.header
          className="mb-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-serif text-3xl md:text-4xl font-medium text-foreground">
            Contratos
          </h1>
          <p className="mt-2 text-muted-foreground">
            Contrato terapêutico com envio por portal e exportação em PDF ou DOCX.
          </p>
        </motion.header>

        <motion.div
          className="flex gap-3 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" className="gap-2">
                <Plus className="w-4 h-4" strokeWidth={1.5} />
                Novo contrato
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="font-serif text-xl">Novo contrato</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <select
                  value={patientId}
                  onChange={(event) => setPatientId(event.target.value)}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="">Selecione o paciente</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.name}
                    </option>
                  ))}
                </select>

                <Input placeholder="Valor ou pacote (ex.: R$ 220,00 por sessão)" value={value} onChange={(event) => setValue(event.target.value)} />
                <Input placeholder="Periodicidade" value={periodicity} onChange={(event) => setPeriodicity(event.target.value)} />
                <Textarea placeholder="Política de faltas e cancelamentos" value={absencePolicy} onChange={(event) => setAbsencePolicy(event.target.value)} />
                <Input placeholder="Forma de pagamento" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} />

                <label className="flex items-center gap-3 text-sm text-foreground">
                  <input type="checkbox" checked={sendAfterCreate} onChange={(event) => setSendAfterCreate(event.target.checked)} />
                  Enviar ao paciente logo após criar
                </label>
              </div>

              <DialogFooter>
                <Button onClick={handleCreate} disabled={creating || !patientId} className="gap-2">
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  Criar contrato
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </motion.div>

        <motion.div
          className="space-y-3"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {contracts.length === 0 ? (
            <div className="text-center py-12">
              <ScrollText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Nenhum contrato criado ainda.</p>
            </div>
          ) : (
            contracts.map((contract) => (
              <div key={contract.id} className="session-card">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                  <div>
                    <h3 className="font-serif text-lg font-medium text-foreground">
                      Contrato terapêutico
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {contract.patient?.name ?? contract.patient_name ?? patientMap.get(contract.patient_id)?.name ?? contract.patient_id}
                    </p>
                  </div>
                  <span className={cn("text-xs px-2 py-1 rounded-full", statusColor(contract.status))}>
                    {statusLabel(contract.status)}
                  </span>
                </div>

                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>Valor: {contract.terms?.value ? formatCurrency(contract.terms.value) : "Não informado"}</p>
                  <p>Frequência: {contract.terms?.periodicity ?? "Não informada"}</p>
                  <p>Pagamento: {contract.terms?.payment_method ?? "Não informado"}</p>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  {contract.status === "draft" && (
                    <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => void handleSend(contract.id)}>
                      <Send className="w-3.5 h-3.5" strokeWidth={1.5} />
                      Enviar
                    </Button>
                  )}
                  {(contract.portal_url || contract.portal_token) && (
                    <Button variant="ghost" size="sm" className="gap-1.5" asChild>
                      <a
                        href={contract.portal_url ?? `/portal/contract?token=${contract.portal_token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.5} />
                        Portal
                      </a>
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => void handleExport(contract.id, "pdf")}>
                    <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
                    PDF
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => void handleExport(contract.id, "docx")}>
                    <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
                    DOCX
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setPreviewContract(contract)}>
                    <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.5} />
                    Preview
                  </Button>
                </div>
              </div>
            ))
          )}
        </motion.div>

        <Dialog open={Boolean(previewContract)} onOpenChange={(open) => !open && setPreviewContract(null)}>
          <DialogContent className="max-w-5xl">
            <DialogHeader>
              <DialogTitle className="font-serif text-xl">Preview do contrato</DialogTitle>
            </DialogHeader>
            {previewContract ? (
              <iframe
                title="Preview do contrato"
                srcDoc={buildContractHtml(previewContract)}
                className="h-[70vh] w-full rounded-lg border border-border bg-white"
              />
            ) : null}
            <DialogFooter>
              <Button variant="secondary" onClick={() => setPreviewContract(null)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ContractsPage;
