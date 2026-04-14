import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Download, ExternalLink, FilePlus2, FileText, FolderOpen, Loader2, Printer, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { documentsApi } from "@/api/clinical";
import type { Document, DocumentTemplate } from "@/api/types";
import { patientService, type Patient } from "@/services/patientService";
import { useAuth } from "@/contexts/AuthContext";
import { buildClinicalDocumentHtml } from "@/lib/documentBuilders";
import { downloadWordFromHtml, openDataUrlInNewTab, openHtmlInNewTab, exportService } from "@/services/exportService";
import IntegrationUnavailable from "@/components/IntegrationUnavailable";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const formatDate = (value?: string) =>
  value
    ? new Date(value).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Sem data";

const REDIRECT_TEMPLATES: Record<string, { page: string; label: string }> = {
  "therapy-contract": { page: "contracts", label: "Ir para Contratos" },
  "psychological-report": { page: "reports", label: "Ir para Relatórios" },
};

const HIDDEN_TEMPLATES = new Set(["session-summary", "evolution-note"]);

interface DocumentsPageProps {
  onNavigate?: (page: string) => void;
}

const DocumentsPage = ({ onNavigate }: DocumentsPageProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId: string } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [title, setTitle] = useState("");

  // Template-specific fields
  const [attendanceDate, setAttendanceDate] = useState("");
  const [attendanceTime, setAttendanceTime] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [cidCode, setCidCode] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [serviceType, setServiceType] = useState("session");

  // Preview state
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [documentsRes, templatesRes, patientsRes] = await Promise.all([
        documentsApi.list(),
        documentsApi.listTemplates(),
        patientService.list(),
      ]);

      if (!documentsRes.success) {
        setError({ message: documentsRes.error.message, requestId: documentsRes.request_id });
      } else {
        setDocuments(documentsRes.data);
      }

      if (templatesRes.success) {
        setTemplates(templatesRes.data);
      }

      if (patientsRes.success) {
        setPatients(patientsRes.data);
      }

      setLoading(false);
    };

    void load();
  }, []);

  const patientNames = useMemo(
    () => new Map(patients.map((patient) => [patient.id, patient.name])),
    [patients],
  );

  const visibleTemplates = useMemo(
    () => templates.filter((t) => !HIDDEN_TEMPLATES.has(t.id)),
    [templates],
  );

  const visibleDocuments = useMemo(
    () => documents.filter((d) => (d.versions_count ?? 0) > 0),
    [documents],
  );

  const refreshDocuments = async () => {
    const result = await documentsApi.list();
    if (result.success) {
      setDocuments(result.data);
    }
  };

  const resetFormFields = () => {
    setPatientId("");
    setTitle("");
    setAttendanceDate("");
    setAttendanceTime("");
    setPeriodStart("");
    setPeriodEnd("");
    setCidCode("");
    setAmount("");
    setPaymentMethod("");
    setServiceType("session");
  };

  const openCreateDialog = (template: DocumentTemplate) => {
    resetFormFields();
    setTemplateId(template.id);
    setDialogOpen(true);
  };

  // Auto-update title when patient or template changes
  useEffect(() => {
    if (!dialogOpen) return;
    const patient = patients.find((p) => p.id === patientId);
    const template = templates.find((t) => t.id === templateId);
    if (patient && template) {
      setTitle(`${template.name ?? template.title ?? "Documento"} - ${patient.name}`);
    }
  }, [patientId, templateId, dialogOpen, patients, templates]);

  const handleCreate = async () => {
    if (!patientId || !templateId) return;

    setCreating(true);
    const patient = patients.find((p) => p.id === patientId);
    const template = templates.find((t) => t.id === templateId);
    const patientName = patient?.name ?? "Paciente";
    const docTitle = title.trim() || `${template?.name ?? template?.title ?? "Documento"} - ${patientName}`;

    const result = await documentsApi.create({
      patient_id: patientId,
      template_id: templateId,
      title: docTitle,
    });

    if (!result.success) {
      toast({ title: "Erro ao criar documento", description: result.error.message, variant: "destructive" });
      setCreating(false);
      return;
    }

    const generatedHtml = buildClinicalDocumentHtml(templateId, {
      psychologist: {
        name: user?.name ?? "Psicólogo(a) responsável",
        email: user?.email,
        crp: user?.crp,
      },
      patient: {
        name: patientName,
        email: patient?.email,
        cpf: patient?.cpf,
      },
      documentTitle: docTitle,
      dateLabel: new Date().toLocaleDateString("pt-BR"),
      attendanceDate,
      attendanceTime,
      periodStart,
      periodEnd,
      cidCode,
      amount,
      paymentMethod,
      serviceType,
      specialty: user?.specialty,
      clinicalApproach: user?.clinical_approach,
      patientBirthDate: patient?.birth_date,
      patientProfession: patient?.profession,
      patientPhone: patient?.phone ?? patient?.whatsapp,
    });

    await documentsApi.createVersion(result.data.id, generatedHtml, {
      psychologist_name: user?.name ?? "",
      psychologist_crp: user?.crp ?? "",
      patient_name: patientName,
      date: new Date().toLocaleDateString("pt-BR"),
    });

    await refreshDocuments();
    setDialogOpen(false);
    setCreating(false);
    resetFormFields();

    setPreviewDoc({ ...result.data, versions_count: 1 });
    setPreviewHtml(generatedHtml);

    toast({ title: `${docTitle} criado com sucesso` });
  };

  const openDocumentPreview = async (doc: Document) => {
    setPreviewDoc(doc);
    setPreviewHtml("");
    setPreviewLoading(true);

    const versions = await documentsApi.listVersions(doc.id);
    if (versions.success && versions.data.length > 0) {
      setPreviewHtml(versions.data[versions.data.length - 1].content);
    } else if (!versions.success) {
      toast({ title: "Erro ao carregar documento", description: versions.error.message, variant: "destructive" });
    }

    setPreviewLoading(false);
  };

  const closePreview = () => {
    setPreviewDoc(null);
    setPreviewHtml("");
    setPreviewLoading(false);
  };

  const handlePrint = () => {
    if (!previewDoc) return;
    void (async () => {
      const res = await exportService.exportPdf({ document_type: "document", document_id: previewDoc.id });
      if (!res.success) {
        toast({ title: "Erro ao gerar PDF", description: res.error.message, variant: "destructive" });
        return;
      }
      const url = res.data.data_url ?? res.data.url;
      if (!url) {
        toast({ title: "Erro ao gerar PDF", description: "PDF não disponível.", variant: "destructive" });
        return;
      }
      openDataUrlInNewTab(url);
      toast({ title: "PDF aberto", description: "O arquivo foi gerado pelo backend local." });
    })();
  };

  const handleDownloadDoc = () => {
    if (!previewHtml) return;
    downloadWordFromHtml(previewHtml, `${previewDoc?.title ?? "documento"}.doc`);
  };

  const renderTemplateFields = () => {
    if (templateId === "attendance-declaration") {
      return (
        <>
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Data do atendimento</label>
            <Input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Horário do atendimento</label>
            <Input type="time" value={attendanceTime} onChange={(e) => setAttendanceTime(e.target.value)} />
          </div>
        </>
      );
    }

    if (templateId === "psychological-certificate") {
      return (
        <>
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Período de afastamento — início</label>
            <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Período de afastamento — fim</label>
            <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">CID (opcional)</label>
            <Input value={cidCode} onChange={(e) => setCidCode(e.target.value)} placeholder="Ex: F41.1" />
          </div>
        </>
      );
    }

    if (templateId === "payment-receipt") {
      return (
        <>
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Data do atendimento</label>
            <Input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Valor (R$)</label>
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Ex: 250,00" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Forma de pagamento</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="">Selecione</option>
              <option value="Dinheiro">Dinheiro</option>
              <option value="PIX">PIX</option>
              <option value="Cartão de crédito">Cartão de crédito</option>
              <option value="Cartão de débito">Cartão de débito</option>
              <option value="Transferência bancária">Transferência bancária</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Tipo de serviço</label>
            <div className="flex gap-4 pt-1">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="serviceType" value="session" checked={serviceType === "session"} onChange={() => setServiceType("session")} />
                Sessão de psicoterapia
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="serviceType" value="evaluation" checked={serviceType === "evaluation"} onChange={() => setServiceType("evaluation")} />
                Avaliação psicológica
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="serviceType" value="other" checked={serviceType === "other"} onChange={() => setServiceType("other")} />
                Outro
              </label>
            </div>
          </div>
        </>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <div className="content-container py-12">
        <p className="loading-text">Carregando documentos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-container py-12">
        <h1 className="mb-6 text-[2.4rem] font-semibold tracking-[-0.04em] text-foreground">Documentos</h1>
        <IntegrationUnavailable message={error.message} requestId={error.requestId} />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12">
        <motion.header
          className="mb-10 rounded-[2rem] border border-border/80 bg-card px-7 py-8 shadow-[0_18px_44px_-28px_rgba(15,23,42,0.22)] md:px-10 md:py-10"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">ETHOS Web</p>
          <h1 className="text-[2.35rem] font-semibold tracking-[-0.05em] text-foreground md:text-[3.2rem]">
            Documentos
          </h1>
          <p className="mt-4 max-w-2xl text-[1.02rem] leading-7 text-muted-foreground">
            Modelos padronizados e documentos vinculados aos pacientes.
          </p>
        </motion.header>

        {/* Template cards */}
        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="mb-4 text-[1.4rem] font-semibold tracking-[-0.03em] text-foreground">Modelos padronizados</h2>

          {visibleTemplates.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Nenhum template cadastrado.</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {visibleTemplates.map((template) => {
                const redirect = REDIRECT_TEMPLATES[template.id];
                return (
                  <div key={template.id} className="session-card">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-[1.15rem] font-semibold tracking-[-0.02em] text-foreground">
                          {template.name ?? template.title ?? "Template"}
                        </h3>
                        {template.description && (
                          <p className="mt-1 text-sm text-muted-foreground">{template.description}</p>
                        )}
                      </div>
                    </div>

                    {redirect ? (
                      <Button
                        variant="outline"
                        className="mt-4 gap-2"
                        onClick={() => onNavigate?.(redirect.page)}
                      >
                        <ExternalLink className="w-4 h-4" strokeWidth={1.5} />
                        {redirect.label}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="mt-4 gap-2"
                        onClick={() => openCreateDialog(template)}
                      >
                        <FilePlus2 className="w-4 h-4" strokeWidth={1.5} />
                        Usar template
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </motion.section>

        {/* Created documents */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="mb-4 text-[1.4rem] font-semibold tracking-[-0.03em] text-foreground">Documentos criados</h2>

          {visibleDocuments.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Nenhum documento criado ainda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleDocuments.map((document) => (
                <div
                  key={document.id}
                  className="session-card cursor-pointer transition-colors hover:border-primary/20"
                  onClick={() => openDocumentPreview(document)}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-[1.15rem] font-semibold tracking-[-0.02em] text-foreground">
                        {document.title}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {patientNames.get(document.patient_id ?? "") ?? "Paciente não identificado"} · {formatDate(document.created_at)}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                      {(document.versions_count ?? 0) > 0 ? "criado" : "draft"}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Template: {templates.find((t) => t.id === document.template_id)?.name ?? templates.find((t) => t.id === document.template_id)?.title ?? document.template_id ?? "n/a"} · versões: {document.versions_count ?? 0}
                  </p>
                </div>
              ))}
            </div>
          )}
        </motion.section>
      </div>

      {/* Create document dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {templates.find((t) => t.id === templateId)?.name ?? templates.find((t) => t.id === templateId)?.title ?? "Novo documento"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Paciente</label>
              <select
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">Selecione o paciente</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name}
                  </option>
                ))}
              </select>
            </div>

            {renderTemplateFields()}

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Título do documento</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título (preenchido automaticamente)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreate} disabled={creating || !patientId || !templateId} className="gap-2">
              {creating && <Loader2 className="w-4 h-4 animate-spin" />}
              Criar documento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document preview dialog */}
      <Dialog open={Boolean(previewDoc)} onOpenChange={(open) => { if (!open) closePreview(); }}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">{previewDoc?.title ?? "Documento"}</DialogTitle>
          </DialogHeader>
          {previewLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : previewHtml ? (
            <iframe
              title="Preview do documento"
              srcDoc={previewHtml}
              className="h-[70vh] w-full rounded-lg border border-border bg-white"
            />
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-sm">Nenhuma versão disponível para este documento.</p>
            </div>
          )}
          <DialogFooter className="flex flex-wrap justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="gap-2" onClick={handlePrint} disabled={!previewHtml}>
                <Printer className="w-4 h-4" />
                PDF
              </Button>
              <Button variant="outline" className="gap-2" onClick={handleDownloadDoc} disabled={!previewHtml}>
                <Download className="w-4 h-4" />
                DOC
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => {
                if (!previewHtml) return;
                openHtmlInNewTab(previewHtml);
              }} disabled={!previewHtml}>
                <ExternalLink className="w-4 h-4" />
                Abrir em nova aba
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => {
                const patient = patients.find((p) => p.id === previewDoc?.patient_id);
                const patientPhone = patient?.whatsapp || patient?.phone;
                const msg = encodeURIComponent(
                  `Olá ${patient?.name || ""}! Segue seu documento clínico. Qualquer dúvida, estou à disposição.`
                );
                const url = patientPhone
                  ? `https://wa.me/55${patientPhone.replace(/\D/g, "")}?text=${msg}`
                  : `https://wa.me/?text=${msg}`;
                window.open(url, "_blank", "noopener,noreferrer");
              }} disabled={!previewDoc}>
                <Send className="w-4 h-4" />
                WhatsApp
              </Button>
            </div>
            <Button variant="secondary" onClick={closePreview}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentsPage;
