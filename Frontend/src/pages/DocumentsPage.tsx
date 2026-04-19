import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Download,
  ExternalLink,
  FilePenLine,
  FilePlus2,
  FileText,
  FolderOpen,
  Loader2,
  Printer,
  Save,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { documentsApi } from "@/api/clinical";
import type { Document, DocumentTemplate } from "@/api/types";
import { patientService, type Patient } from "@/services/patientService";
import { useAuth } from "@/contexts/AuthContext";
import { buildClinicalDocumentHtml } from "@/lib/documentBuilders";
import { ShareWithPatientButton } from "@/components/ShareWithPatientButton";
import {
  downloadWordFromHtml,
  openDataUrlInNewTab,
  openHtmlInNewTab,
  exportService,
} from "@/services/exportService";
import IntegrationUnavailable from "@/components/IntegrationUnavailable";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type DocumentFormValues = Record<string, string>;

const supportsStructuredEditor = (templateId?: string) =>
  templateId === "attendance-declaration" ||
  templateId === "psychological-certificate" ||
  templateId === "payment-receipt";

const stripHtmlToText = (html: string) =>
  html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\/(p|div|h1|h2|h3|li|section|br)>/gi, "\n")
    .replace(/<li>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const buildFreeTextHtml = (
  title: string,
  freeText: string,
  context: {
    psychologistName?: string;
    psychologistEmail?: string;
    psychologistCrp?: string;
    patientName?: string;
    patientEmail?: string;
    patientCpf?: string;
  },
) => {
  const paragraphs = freeText
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => `<p>${chunk.replace(/\n/g, "<br />")}</p>`)
    .join("");

  return `
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      body { font-family: Inter, Arial, sans-serif; color: #17313a; background: #f7f2ea; margin: 0; padding: 32px; }
      .sheet { max-width: 860px; margin: 0 auto; background: #fffdfa; border: 1px solid #e8ddd1; border-radius: 24px; padding: 40px; box-shadow: 0 18px 40px rgba(23, 49, 58, 0.08); }
      .eyebrow { text-transform: uppercase; letter-spacing: 0.18em; font-size: 12px; color: #8b6f58; margin-bottom: 10px; }
      h1 { font-family: Lora, Georgia, serif; font-size: 34px; margin: 0 0 24px; color: #17313a; }
      p { font-size: 15px; line-height: 1.7; margin: 0 0 12px; }
      .meta { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; margin-bottom:28px; }
      .meta-card { background:#f3ede5; border-radius:16px; padding:14px 16px; }
      .label { display:block; font-size:12px; text-transform:uppercase; letter-spacing:0.1em; color:#74604c; margin-bottom:6px; }
      .value { font-size:15px; color:#17313a; font-weight:600; }
    </style>
  </head>
  <body>
    <main class="sheet">
      <div class="eyebrow">ETHOS · Documento clínico</div>
      <h1>${title}</h1>
      <section class="meta">
        <div class="meta-card"><span class="label">Psicólogo(a)</span><span class="value">${context.psychologistName || "Não informado"}</span></div>
        <div class="meta-card"><span class="label">CRP</span><span class="value">${context.psychologistCrp || "Não informado"}</span></div>
        <div class="meta-card"><span class="label">Paciente</span><span class="value">${context.patientName || "Não informado"}</span></div>
        <div class="meta-card"><span class="label">Data</span><span class="value">${new Date().toLocaleDateString("pt-BR")}</span></div>
      </section>
      ${paragraphs || "<p>Sem conteúdo.</p>"}
    </main>
  </body>
</html>`;
};

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

  const [attendanceDate, setAttendanceDate] = useState("");
  const [attendanceTime, setAttendanceTime] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [cidCode, setCidCode] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [serviceType, setServiceType] = useState("session");

  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [documentFormValues, setDocumentFormValues] = useState<DocumentFormValues>({});
  const [freeTextContent, setFreeTextContent] = useState("");
  const [savingVersion, setSavingVersion] = useState(false);

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

      if (templatesRes.success) setTemplates(templatesRes.data);
      if (patientsRes.success) setPatients(patientsRes.data);
      setLoading(false);
    };

    void load();
  }, []);

  const patientNames = useMemo(
    () => new Map(patients.map((patient) => [patient.id, patient.name])),
    [patients],
  );

  const visibleTemplates = useMemo(
    () => templates.filter((template) => !HIDDEN_TEMPLATES.has(template.id)),
    [templates],
  );

  const visibleDocuments = useMemo(
    () => documents.filter((document) => (document.versions_count ?? 0) > 0),
    [documents],
  );

  const refreshDocuments = async () => {
    const result = await documentsApi.list();
    if (result.success) setDocuments(result.data);
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

  useEffect(() => {
    if (!dialogOpen) return;
    const patient = patients.find((item) => item.id === patientId);
    const template = templates.find((item) => item.id === templateId);
    if (patient && template) {
      setTitle(`${template.name ?? template.title ?? "Documento"} - ${patient.name}`);
    }
  }, [patientId, templateId, dialogOpen, patients, templates]);

  const handleCreate = async () => {
    if (!patientId || !templateId) return;

    setCreating(true);
    const patient = patients.find((item) => item.id === patientId);
    const template = templates.find((item) => item.id === templateId);
    const patientName = patient?.name ?? "Paciente";
    const docTitle =
      title.trim() || `${template?.name ?? template?.title ?? "Documento"} - ${patientName}`;

    const result = await documentsApi.create({
      patient_id: patientId,
      template_id: templateId,
      title: docTitle,
    });

    if (!result.success) {
      toast({
        title: "Erro ao criar documento",
        description: result.error.message,
        variant: "destructive",
      });
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
    setEditableHtml(generatedHtml);

    toast({ title: `${docTitle} criado com sucesso` });
  };

  const openDocumentPreview = async (doc: Document) => {
    setPreviewDoc(doc);
    setPreviewHtml("");
    setDocumentFormValues({});
    setFreeTextContent("");
    setEditMode(false);
    setPreviewLoading(true);

    const versions = await documentsApi.listVersions(doc.id);
    if (versions.success && versions.data.length > 0) {
      const latestHtml = versions.data[versions.data.length - 1].content;
      setPreviewHtml(latestHtml);
      const latestValues = versions.data[versions.data.length - 1].global_values ?? {};
      setDocumentFormValues(
        Object.fromEntries(
          Object.entries(latestValues).map(([key, value]) => [key, String(value ?? "")]),
        ),
      );
      setFreeTextContent(stripHtmlToText(latestHtml));
    } else if (!versions.success) {
      toast({
        title: "Erro ao carregar documento",
        description: versions.error.message,
        variant: "destructive",
      });
    }

    setPreviewLoading(false);
  };

  const closePreview = () => {
    setPreviewDoc(null);
    setPreviewHtml("");
    setDocumentFormValues({});
    setFreeTextContent("");
    setEditMode(false);
    setPreviewLoading(false);
  };

  const previewTemplateId = previewDoc?.template_id;
  const previewPatient = patients.find((item) => item.id === previewDoc?.patient_id);
  const livePreviewHtml = useMemo(() => {
    if (!previewDoc) return "";
    if (!editMode) return previewHtml;

    if (supportsStructuredEditor(previewTemplateId)) {
      return buildClinicalDocumentHtml(previewTemplateId ?? "", {
        psychologist: {
          name: user?.name ?? "Psicólogo(a) responsável",
          email: user?.email,
          crp: user?.crp,
        },
        patient: {
          name: previewPatient?.name ?? "Paciente",
          email: previewPatient?.email,
          cpf: previewPatient?.cpf,
        },
        documentTitle: previewDoc.title,
        dateLabel: documentFormValues.dateLabel || documentFormValues.date_label || new Date().toLocaleDateString("pt-BR"),
        attendanceDate: documentFormValues.attendanceDate || documentFormValues.attendance_date,
        attendanceTime: documentFormValues.attendanceTime || documentFormValues.attendance_time,
        periodStart: documentFormValues.periodStart || documentFormValues.period_start,
        periodEnd: documentFormValues.periodEnd || documentFormValues.period_end,
        cidCode: documentFormValues.cidCode || documentFormValues.cid_code,
        amount: documentFormValues.amount,
        paymentMethod: documentFormValues.paymentMethod || documentFormValues.payment_method,
        serviceType: documentFormValues.serviceType || documentFormValues.service_type,
        specialty: user?.specialty,
        clinicalApproach: user?.clinical_approach,
        patientBirthDate: previewPatient?.birth_date,
        patientProfession: previewPatient?.profession,
        patientPhone: previewPatient?.phone ?? previewPatient?.whatsapp,
      });
    }

    return buildFreeTextHtml(previewDoc.title, freeTextContent, {
      psychologistName: user?.name,
      psychologistEmail: user?.email,
      psychologistCrp: user?.crp,
      patientName: previewPatient?.name,
      patientEmail: previewPatient?.email,
      patientCpf: previewPatient?.cpf,
    });
  }, [documentFormValues, editMode, freeTextContent, previewDoc, previewHtml, previewPatient, previewTemplateId, user]);

  const handleSaveEditedVersion = async () => {
    const nextHtml = editMode ? livePreviewHtml : previewHtml;
    if (!previewDoc || !nextHtml.trim()) return;
    setSavingVersion(true);
    const result = await documentsApi.createVersion(previewDoc.id, nextHtml, {
      updated_at: new Date().toISOString(),
      updated_by: user?.name ?? "",
      ...documentFormValues,
    });
    setSavingVersion(false);

    if (!result.success) {
      toast({
        title: "Erro ao salvar nova versão",
        description: result.error.message,
        variant: "destructive",
      });
      return;
    }

    setPreviewHtml(nextHtml);
    setEditMode(false);
    await refreshDocuments();
    toast({
      title: "Documento atualizado",
      description: "Uma nova versão do documento foi salva com sucesso.",
    });
  };

  const handlePrint = () => {
    if (!previewDoc) return;
    void (async () => {
      const res = await exportService.exportPdf({
        document_type: "document",
        document_id: previewDoc.id,
      });
      if (!res.success) {
        toast({
          title: "Erro ao gerar PDF",
          description: res.error.message,
          variant: "destructive",
        });
        return;
      }
      const url = res.data.data_url ?? res.data.url;
      if (!url) {
        toast({
          title: "Erro ao gerar PDF",
          description: "PDF não disponível.",
          variant: "destructive",
        });
        return;
      }
      openDataUrlInNewTab(url);
      toast({
        title: "PDF aberto",
        description: "O arquivo foi gerado pelo backend local.",
      });
    })();
  };

  const handleDownloadDoc = () => {
    const html = editMode ? livePreviewHtml : previewHtml;
    if (!html) return;
    downloadWordFromHtml(html, `${previewDoc?.title ?? "documento"}.doc`);
  };

  const updateDocumentFormValue = (key: string, value: string) => {
    setDocumentFormValues((current) => ({ ...current, [key]: value }));
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
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="radio" name="serviceType" value="session" checked={serviceType === "session"} onChange={() => setServiceType("session")} />
                Sessão de psicoterapia
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="radio" name="serviceType" value="evaluation" checked={serviceType === "evaluation"} onChange={() => setServiceType("evaluation")} />
                Avaliação psicológica
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
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
        <h1 className="mb-6 text-[2.4rem] font-semibold tracking-[-0.04em] text-foreground">
          Documentos
        </h1>
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
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">
            ETHOS Web
          </p>
          <h1 className="text-[2.35rem] font-semibold tracking-[-0.05em] text-foreground md:text-[3.2rem]">
            Documentos
          </h1>
          <p className="mt-4 max-w-2xl text-[1.02rem] leading-7 text-muted-foreground">
            Modelos padronizados e documentos vinculados aos pacientes.
          </p>
        </motion.header>

        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="mb-4 text-[1.4rem] font-semibold tracking-[-0.03em] text-foreground">
            Modelos padronizados
          </h2>

          {visibleTemplates.length === 0 ? (
            <div className="py-12 text-center">
              <FolderOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Nenhum template cadastrado.</p>
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
                        {template.description ? (
                          <p className="mt-1 text-sm text-muted-foreground">{template.description}</p>
                        ) : null}
                      </div>
                    </div>

                    {redirect ? (
                      <Button
                        variant="outline"
                        className="mt-4 gap-2"
                        onClick={() => onNavigate?.(redirect.page)}
                      >
                        <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
                        {redirect.label}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="mt-4 gap-2"
                        onClick={() => openCreateDialog(template)}
                      >
                        <FilePlus2 className="h-4 w-4" strokeWidth={1.5} />
                        Usar template
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="mb-4 text-[1.4rem] font-semibold tracking-[-0.03em] text-foreground">
            Documentos criados
          </h2>

          {visibleDocuments.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Nenhum documento criado ainda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleDocuments.map((document) => (
                <div key={document.id} className="session-card transition-colors hover:border-primary/20">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-[1.15rem] font-semibold tracking-[-0.02em] text-foreground">
                        {document.title}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {patientNames.get(document.patient_id ?? "") ?? "Paciente não identificado"} · {formatDate(document.created_at)}
                      </p>
                    </div>
                    <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                      {(document.versions_count ?? 0) > 0 ? "criado" : "draft"}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Template: {templates.find((t) => t.id === document.template_id)?.name ?? templates.find((t) => t.id === document.template_id)?.title ?? document.template_id ?? "n/a"} · versões: {document.versions_count ?? 0}
                    Template: {templates.find((item) => item.id === document.template_id)?.name
                      ?? templates.find((item) => item.id === document.template_id)?.title
                      ?? document.template_id
                      ?? "n/a"} · versões: {document.versions_count ?? 0}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="gap-2"
                      onClick={() => void openDocumentPreview(document)}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Abrir
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => void openDocumentPreview(document).then(() => setEditMode(true))}
                    >
                      <FilePenLine className="h-4 w-4" />
                      Editar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.section>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {templates.find((template) => template.id === templateId)?.name
                ?? templates.find((template) => template.id === templateId)?.title
                ?? "Novo documento"}
            </DialogTitle>
            <DialogDescription>
              Escolha o paciente, complete os campos do template e crie a primeira versão do documento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Paciente</label>
              <select
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Criar documento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(previewDoc)} onOpenChange={(open) => { if (!open) closePreview(); }}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">{previewDoc?.title ?? "Documento"}</DialogTitle>
            <DialogDescription>
              Visualize o documento, faça ajustes e salve novas versões quando precisar.
            </DialogDescription>
          </DialogHeader>
          {previewLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : previewHtml ? (
            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <iframe
                title="Preview do documento"
                srcDoc={editMode ? livePreviewHtml : previewHtml}
                className="h-[70vh] w-full rounded-lg border border-border bg-white"
              />

              {editMode ? (
                <div className="flex h-[70vh] flex-col rounded-lg border border-border bg-background">
                  <div className="border-b border-border px-4 py-3">
                    <p className="font-medium text-foreground">Editar conteúdo</p>
                    <p className="text-sm text-muted-foreground">
                      {supportsStructuredEditor(previewTemplateId)
                        ? "Atualize os campos estruturados e acompanhe a prévia ao lado."
                        : "Edite o conteúdo principal do documento em texto livre e salve uma nova versão."}
                    </p>
                  </div>
                  <div className="flex-1 p-4">
                    {supportsStructuredEditor(previewTemplateId) ? (
                      <div className="space-y-4 overflow-auto pr-1">
                        {previewTemplateId === "payment-receipt" ? (
                          <>
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-foreground">Valor</label>
                              <Input
                                value={documentFormValues.amount ?? ""}
                                onChange={(event) => updateDocumentFormValue("amount", event.target.value)}
                                placeholder="200,00"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-foreground">Forma de pagamento</label>
                              <Input
                                value={documentFormValues.payment_method ?? documentFormValues.paymentMethod ?? ""}
                                onChange={(event) => updateDocumentFormValue("payment_method", event.target.value)}
                                placeholder="PIX, cartão, dinheiro..."
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-foreground">Tipo de serviço</label>
                              <select
                                value={documentFormValues.service_type ?? documentFormValues.serviceType ?? "session"}
                                onChange={(event) => updateDocumentFormValue("service_type", event.target.value)}
                                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                              >
                                <option value="session">Sessão de psicoterapia</option>
                                <option value="evaluation">Avaliação psicológica</option>
                                <option value="other">Outro</option>
                              </select>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Data do atendimento</label>
                                <Input
                                  value={documentFormValues.attendance_date ?? documentFormValues.attendanceDate ?? ""}
                                  onChange={(event) => updateDocumentFormValue("attendance_date", event.target.value)}
                                  placeholder="13/04/2026"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Data do documento</label>
                                <Input
                                  value={documentFormValues.date_label ?? documentFormValues.dateLabel ?? ""}
                                  onChange={(event) => updateDocumentFormValue("date_label", event.target.value)}
                                  placeholder="13/04/2026"
                                />
                              </div>
                            </div>
                          </>
                        ) : null}

                        {previewTemplateId === "attendance-declaration" ? (
                          <>
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Data do atendimento</label>
                                <Input
                                  value={documentFormValues.attendance_date ?? documentFormValues.attendanceDate ?? ""}
                                  onChange={(event) => updateDocumentFormValue("attendance_date", event.target.value)}
                                  placeholder="13/04/2026"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Horário</label>
                                <Input
                                  value={documentFormValues.attendance_time ?? documentFormValues.attendanceTime ?? ""}
                                  onChange={(event) => updateDocumentFormValue("attendance_time", event.target.value)}
                                  placeholder="14:00"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-foreground">Data do documento</label>
                              <Input
                                value={documentFormValues.date_label ?? documentFormValues.dateLabel ?? ""}
                                onChange={(event) => updateDocumentFormValue("date_label", event.target.value)}
                                placeholder="13/04/2026"
                              />
                            </div>
                          </>
                        ) : null}

                        {previewTemplateId === "psychological-certificate" ? (
                          <>
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Início do período</label>
                                <Input
                                  value={documentFormValues.period_start ?? documentFormValues.periodStart ?? ""}
                                  onChange={(event) => updateDocumentFormValue("period_start", event.target.value)}
                                  placeholder="13/04/2026"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Fim do período</label>
                                <Input
                                  value={documentFormValues.period_end ?? documentFormValues.periodEnd ?? ""}
                                  onChange={(event) => updateDocumentFormValue("period_end", event.target.value)}
                                  placeholder="20/04/2026"
                                />
                              </div>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">CID</label>
                                <Input
                                  value={documentFormValues.cid_code ?? documentFormValues.cidCode ?? ""}
                                  onChange={(event) => updateDocumentFormValue("cid_code", event.target.value)}
                                  placeholder="Opcional"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Data do documento</label>
                                <Input
                                  value={documentFormValues.date_label ?? documentFormValues.dateLabel ?? ""}
                                  onChange={(event) => updateDocumentFormValue("date_label", event.target.value)}
                                  placeholder="13/04/2026"
                                />
                              </div>
                            </div>
                          </>
                        ) : null}
                      </div>
                    ) : (
                      <Textarea
                        value={freeTextContent}
                        onChange={(event) => setFreeTextContent(event.target.value)}
                        className="h-full min-h-full resize-none text-sm leading-6"
                        placeholder="Escreva ou ajuste o conteúdo principal do documento..."
                      />
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex h-[70vh] flex-col justify-between rounded-lg border border-border bg-muted/20 p-5">
                  <div>
                    <p className="font-medium text-foreground">Edição de versões</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Clique em editar para ajustar o conteúdo desse documento e salvar uma nova versão.
                    </p>
                  </div>
                  <Button variant="outline" className="gap-2" onClick={() => setEditMode(true)}>
                    <FilePenLine className="h-4 w-4" />
                    {supportsStructuredEditor(previewTemplateId) ? "Editar em modo guiado" : "Editar conteúdo"}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-sm">Nenhuma versão disponível para este documento.</p>
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">Nenhuma versão disponível para este documento.</p>
            </div>
          )}
          <DialogFooter className="flex flex-wrap justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="gap-2" onClick={handlePrint} disabled={!previewHtml}>
                <Printer className="h-4 w-4" />
                PDF
              </Button>
              <Button variant="outline" className="gap-2" onClick={handleDownloadDoc} disabled={!previewHtml && !editableHtml}>
                <Download className="h-4 w-4" />
                DOC
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  const html = editMode ? editableHtml : previewHtml;
                  if (!html) return;
                  openHtmlInNewTab(html);
                }}
                disabled={!previewHtml && !editableHtml}
              >
                <ExternalLink className="h-4 w-4" />
                Abrir em nova aba
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  const patient = patients.find((item) => item.id === previewDoc?.patient_id);
                  const patientPhone = patient?.whatsapp || patient?.phone;
                  const message = encodeURIComponent(
                    `Olá ${patient?.name || ""}! Segue seu documento clínico. Qualquer dúvida, estou à disposição.`,
                  );
                  const url = patientPhone
                    ? `https://wa.me/55${patientPhone.replace(/\D/g, "")}?text=${message}`
                    : `https://wa.me/?text=${message}`;
                  window.open(url, "_blank", "noopener,noreferrer");
                }}
                disabled={!previewDoc}
              >
                <Send className="h-4 w-4" />
                WhatsApp
              </Button>
            </div>

            <div className="flex gap-2">
              {editMode ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDocumentFormValues({});
                      setFreeTextContent(stripHtmlToText(previewHtml));
                      setEditMode(false);
                    }}
                  >
                    Cancelar edição
                  </Button>
                  <Button
                    onClick={() => void handleSaveEditedVersion()}
                    disabled={savingVersion || !editableHtml.trim()}
                    className="gap-2"
                  >
                    {savingVersion ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Salvar versão
                  </Button>
                </>
              ) : null}
              {previewDoc ? (
                <ShareWithPatientButton
                  type="documents"
                  id={previewDoc.id}
                  shared={(previewDoc as unknown as { shared_with_patient?: boolean }).shared_with_patient ?? false}
                />
              ) : null}
              <Button variant="secondary" onClick={closePreview}>
                Fechar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentsPage;
