import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Download, ExternalLink, Loader2, Plus, Save, ScrollText, Send, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { contractsApi, documentsApi, templatesApi } from "@/api/clinical";
import type { Contract, DocumentTemplate } from "@/api/types";
import IntegrationUnavailable from "@/components/IntegrationUnavailable";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { patientService, type Patient } from "@/services/patientService";
import { downloadWordFromHtml, openDataUrlInNewTab, openHtmlInNewTab, exportService } from "@/services/exportService";
import { cn } from "@/lib/utils";
import { buildContractHtml } from "@/lib/documentBuilders";
import { DEFAULT_CONTRACT_TEMPLATE } from "@/lib/defaultContractTemplate";
import { ShareWithPatientButton } from "@/components/ShareWithPatientButton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ContractEditorState = {
  patientId: string;
  templateId: string;
  title: string;
  value: string;
  valueText: string;
  paymentType: string;
  periodicity: string;
  absencePolicy: string;
  paymentMethod: string;
  content: string;
};

const defaultTerms = {
  periodicity: "Sessões semanais",
  absencePolicy:
    "O cancelamento deve ser informado com antecedência mínima de 24 horas. Ausências sem aviso prévio serão cobradas integralmente.",
  paymentMethod: "Pix, transferência ou outro meio combinado entre as partes.",
};

const fallbackContractTemplate = DEFAULT_CONTRACT_TEMPLATE;

const formatCurrencyLabel = (value: string) => {
  const parsed = Number(value.replace(",", "."));
  if (!Number.isFinite(parsed)) return value;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(parsed);
};

const buildPatientAddress = (patient?: Patient) =>
  [
    patient?.address_street,
    patient?.address_number,
    patient?.address_complement,
    patient?.address_neighborhood,
    patient?.address_city,
    patient?.address_state,
  ]
    .filter(Boolean)
    .join(", ");

const normalizeContractText = (value: string) =>
  value
    .replaceAll("ÃƒÆ’Ã‚Â£", "ã")
    .replaceAll("ÃƒÂ£", "ã")
    .replaceAll("Ã‡ÃƒO", "ÇÃO")
    .replaceAll("ÃƒO", "ÃO")
    .replaceAll("Ã?NCIA", "ÊNCIA")
    .replaceAll("Ã§", "ç")
    .replaceAll("Ã£", "ã")
    .replaceAll("Ã¡", "á")
    .replaceAll("Ã¢", "â")
    .replaceAll("Ãª", "ê")
    .replaceAll("Ã©", "é")
    .replaceAll("Ã­", "í")
    .replaceAll("Ã³", "ó")
    .replaceAll("Ãº", "ú")
    .replaceAll("Ãµ", "õ")
    .replaceAll("Ã", "à")
    .replaceAll("Â", "")
    .replaceAll("Sess\u00e3o", "Sessão")
    .replaceAll("Pr\u00f3xima", "Próxima");

const renderContractTemplate = (template: string, values: Record<string, string>) =>
  normalizeContractText(
    template.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, key: string) => values[key] ?? ""),
  );

const buildContractValues = (input: {
  psychologistName: string;
  psychologistCrp: string;
  psychologistRg?: string;
  psychologistCpf?: string;
  psychologistGender?: "F" | "M";
  email: string;
  patient?: Patient;
  value: string;
  valueText: string;
  paymentType: string;
  periodicity: string;
  paymentMethod: string;
  absencePolicy: string;
}) => {
  // Psychologist gender-aware terms
  const psiF = !input.psychologistGender || input.psychologistGender === "F";
  const psychologistSuffix = psiF ? "a" : "o";
  const psychologistArticle = psiF ? "a Sra." : "o Sr.";
  const psychologistTitle = psiF ? "Psicóloga" : "Psicólogo";

  // Patient gender-aware terms
  const patF = !input.patient?.gender || input.patient?.gender === "F";
  const patientGenderA = patF ? "a" : "o";
  const patientGenderO = patF ? "a" : "o";
  const patientArticle = patF ? "a" : "o";

  // Billing auto-fill
  const billing = input.patient?.billing;
  const sessionPrice = billing?.session_price;
  const packageTotal = billing?.package_total_price;
  const autoValue = input.value || (sessionPrice ? String(sessionPrice) : packageTotal ? String(packageTotal) : "");
  const autoPaymentType = input.paymentType || (billing?.mode === "package" ? "pacote mensal" : "cada sessão realizada");

  return {
    psychologist_name: input.psychologistName,
    psychologist_crp: input.psychologistCrp,
    psychologist_license: input.psychologistCrp, // legacy alias
    psychologist_email: input.email,
    psychologist_suffix: psychologistSuffix,
    psychologist_article: psychologistArticle,
    psychologist_title: psychologistTitle,
    psychologist_gender_o: psychologistSuffix,
    psychologist_rg_text: input.psychologistRg ? `, portador${psiF ? "a" : ""} do RG ${input.psychologistRg}` : "",
    psychologist_cpf_text: input.psychologistCpf ? `, CPF ${input.psychologistCpf}` : "",
    patient_name: input.patient?.name ?? "",
    patient_cpf: input.patient?.cpf ?? "",
    patient_document: input.patient?.cpf ?? "", // legacy alias
    patient_email: input.patient?.email ?? "",
    patient_address: buildPatientAddress(input.patient) || input.patient?.address || "",
    patient_birth_date: input.patient?.birth_date ?? "",
    patient_gender_a: patientGenderA,
    patient_gender_o: patientGenderO,
    patient_article: patientArticle,
    contract_value: autoValue ? formatCurrencyLabel(autoValue) : "R$ ___",
    contract_value_text: input.valueText || "valor a preencher por extenso",
    payment_type: autoPaymentType,
    contract_periodicity: input.periodicity,
    contract_payment_method: input.paymentMethod,
    contract_absence_policy: input.absencePolicy,
    weekly_frequency: billing?.weekly_frequency ? `${billing.weekly_frequency}x por semana` : "",
  };
};

const createEmptyEditor = (templateId = "", templateBody = fallbackContractTemplate): ContractEditorState => ({
  patientId: "",
  templateId,
  title: "",
  value: "",
  valueText: "",
  paymentType: "",
  periodicity: defaultTerms.periodicity,
  absencePolicy: defaultTerms.absencePolicy,
  paymentMethod: defaultTerms.paymentMethod,
  content: templateBody,
});

const ContractsPage = ({ embedded = false }: { embedded?: boolean }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [systemTemplates, setSystemTemplates] = useState<DocumentTemplate[]>([]);
  const [customTemplates, setCustomTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId: string } | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [templateManagerOpen, setTemplateManagerOpen] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [editor, setEditor] = useState<ContractEditorState>(createEmptyEditor());
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [uploadingSigned, setUploadingSigned] = useState<string | null>(null);
  const [previewContract, setPreviewContract] = useState<Contract | null>(null);
  const [templateDraftId, setTemplateDraftId] = useState<string | null>(null);
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateBody, setTemplateBody] = useState(fallbackContractTemplate);
  const [templateSaving, setTemplateSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [contractsRes, patientsRes, systemTemplatesRes, customTemplatesRes] = await Promise.all([
        contractsApi.list(),
        patientService.list(),
        documentsApi.listTemplates(),
        templatesApi.list(),
      ]);

      if (!contractsRes.success) {
        setError({ message: contractsRes.error.message, requestId: contractsRes.request_id });
      } else {
        setContracts(contractsRes.data);
      }

      if (patientsRes.success) {
        setPatients(patientsRes.data);
      }

      if (systemTemplatesRes.success) {
        setSystemTemplates(systemTemplatesRes.data.filter((template) => template.kind === "contract" || template.id === "therapy-contract"));
      }

      if (customTemplatesRes.success) {
        setCustomTemplates(customTemplatesRes.data.filter((template) => template.kind === "contract"));
      }

      setLoading(false);
    };

    void load();
  }, []);

  const patientMap = useMemo(
    () => new Map(patients.map((patient) => [patient.id, patient])),
    [patients],
  );

  const allTemplates = useMemo(
    () => [...systemTemplates, ...customTemplates],
    [systemTemplates, customTemplates],
  );

  const selectedTemplate = allTemplates.find((template) => template.id === editor.templateId);
  const selectedPatient = patientMap.get(editor.patientId);

  const computedContractContent = useMemo(() => {
    const values = buildContractValues({
      psychologistName: user?.name || "Psicólog(a) responsável",
      psychologistCrp: user?.crp || "CRP não informado",
      psychologistRg: user?.rg,
      psychologistCpf: user?.cpf,
      psychologistGender: user?.gender,
      email: user?.email || "",
      patient: selectedPatient,
      value: editor.value,
      valueText: editor.valueText,
      paymentType: editor.paymentType,
      periodicity: editor.periodicity,
      paymentMethod: editor.paymentMethod,
      absencePolicy: editor.absencePolicy,
    });
    return renderContractTemplate(selectedTemplate?.template_body ?? selectedTemplate?.html ?? editor.content ?? fallbackContractTemplate, values);
  }, [editor.value, editor.valueText, editor.paymentType, editor.periodicity, editor.paymentMethod, editor.absencePolicy, editor.content, selectedPatient, selectedTemplate, user?.name, user?.crp, user?.rg, user?.cpf, user?.gender, user?.email]);

  const resetTemplateDraft = () => {
    setTemplateDraftId(null);
    setTemplateTitle("");
    setTemplateDescription("");
    setTemplateBody(fallbackContractTemplate);
  };

  const openTemplateManager = (template?: DocumentTemplate) => {
    setTemplateDraftId(template?.id ?? null);
    setTemplateTitle(normalizeContractText(template?.name ?? template?.title ?? ""));
    setTemplateDescription(normalizeContractText(template?.description ?? ""));
    setTemplateBody(normalizeContractText(template?.template_body ?? template?.html ?? fallbackContractTemplate));
    setTemplateManagerOpen(true);
  };

  const openNewContract = () => {
    const defaultTemplate = allTemplates[0];
    setSelectedContractId(null);
    setEditor(
      createEmptyEditor(
        defaultTemplate?.id ?? "",
        normalizeContractText(
          defaultTemplate?.template_body ?? defaultTemplate?.html ?? fallbackContractTemplate,
        ),
      ),
    );
    setEditorOpen(true);
  };

  const openExistingContract = (contract: Contract) => {
    setSelectedContractId(contract.id);
    setEditor({
      patientId: contract.patient_id,
      templateId: contract.template_id ?? allTemplates[0]?.id ?? "",
      title: normalizeContractText(contract.title ?? ""),
      value: normalizeContractText(contract.terms?.value ?? ""),
      valueText: "",
      paymentType: "",
      periodicity: normalizeContractText(contract.terms?.periodicity ?? defaultTerms.periodicity),
      absencePolicy: normalizeContractText(contract.terms?.absence_policy ?? defaultTerms.absencePolicy),
      paymentMethod: normalizeContractText(contract.terms?.payment_method ?? defaultTerms.paymentMethod),
      content: normalizeContractText(
        contract.content ?? selectedTemplate?.template_body ?? fallbackContractTemplate,
      ),
    });
    setEditorOpen(true);
  };

  const syncLocalContract = (nextContract: Contract) => {
    setContracts((current) => {
      const exists = current.some((item) => item.id === nextContract.id);
      return exists ? current.map((item) => (item.id === nextContract.id ? nextContract : item)) : [nextContract, ...current];
    });
    setSelectedContractId(nextContract.id);
  };

  const handleTemplateChange = (templateId: string) => {
    const template = allTemplates.find((item) => item.id === templateId);
    setEditor((current) => ({
      ...current,
      templateId,
      content: normalizeContractText(
        template?.template_body ?? template?.html ?? fallbackContractTemplate,
      ),
    }));
  };

  const handleSaveContract = async () => {
    if (!editor.patientId || !user) return;
    const patient = patientMap.get(editor.patientId);
    if (!patient) return;

    setSaving(true);
    const payload: Partial<Contract> = {
      patient_id: patient.id,
      template_id: editor.templateId || undefined,
      title: editor.title.trim() || `Contrato terapêutico - ${patient.name}`,
      content: computedContractContent,
      psychologist: {
        name: user.name,
        license: user.crp || "CRP não informado",
        email: user.email,
      },
      patient: {
        name: patient.name,
        email: patient.email ?? "",
        document: patient.cpf ?? "",
        address: buildPatientAddress(patient) || patient.address || "",
      },
      terms: {
        value: editor.value.trim() || "Valor não informado",
        periodicity: editor.periodicity.trim() || defaultTerms.periodicity,
        absence_policy: editor.absencePolicy.trim() || defaultTerms.absencePolicy,
        payment_method: editor.paymentMethod.trim() || defaultTerms.paymentMethod,
      },
    };

    const result = selectedContractId
      ? await contractsApi.update(selectedContractId, payload)
      : await contractsApi.create(payload);

    setSaving(false);

    if (!result.success) {
      toast({ title: "Erro ao salvar contrato", description: result.error.message, variant: "destructive" });
      return;
    }

    syncLocalContract(result.data);
    toast({ title: selectedContractId ? "Contrato atualizado" : "Contrato criado" });
  };

  const handleSend = async (contract: Contract, channel: "email" | "whatsapp") => {
    setSending(contract.id);
    const recipient = channel === "email" ? contract.patient?.email : undefined;
    const result = await contractsApi.send(contract.id, { channel, recipient });
    setSending(null);

    if (!result.success) {
      toast({ title: "Erro ao enviar contrato", description: result.error.message, variant: "destructive" });
      return;
    }

    syncLocalContract(result.data.contract);

    if (channel === "whatsapp" && result.data.whatsapp_url) {
      window.open(result.data.whatsapp_url, "_blank", "noopener,noreferrer");
    }

    toast({ title: channel === "email" ? "Contrato enviado por email" : "Link preparado para WhatsApp" });
  };

  const handleSignedUpload = async (contract: Contract, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingSigned(contract.id);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      const result = await contractsApi.uploadSigned(contract.id, {
        file_name: file.name,
        mime_type: file.type || "application/octet-stream",
        data_url: dataUrl,
      });

      setUploadingSigned(null);

      if (!result.success) {
        toast({ title: "Erro ao anexar contrato assinado", description: result.error.message, variant: "destructive" });
        return;
      }

      syncLocalContract(result.data);
      toast({ title: "Contrato assinado anexado" });
    };
    reader.readAsDataURL(file);
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

    setCustomTemplates((current) => {
      const exists = current.some((item) => item.id === result.data.id);
      return exists ? current.map((item) => (item.id === result.data.id ? result.data : item)) : [result.data, ...current];
    });
    setTemplateManagerOpen(false);
    resetTemplateDraft();
    toast({ title: "Modelo de contrato salvo" });
  };

  const handleDeleteTemplate = async (templateId: string) => {
    const result = await templatesApi.remove(templateId);
    if (!result.success) {
      toast({ title: "Erro ao remover modelo", description: result.error.message, variant: "destructive" });
      return;
    }
    setCustomTemplates((current) => current.filter((item) => item.id !== templateId));
    toast({ title: "Modelo removido" });
  };

  const handleExport = (contract: Contract, format: "pdf" | "docx") => {
    const html = buildContractHtml(contract);
    if (format === "pdf") {
      openHtmlInNewTab(html);
      toast({ title: "Visualização aberta", description: "Use Imprimir > Salvar como PDF no navegador." });
      return;
    }

    downloadWordFromHtml(html, `contrato-${contract.id}.doc`);
  };

  const statusLabel = (status: Contract["status"]) => {
    switch (status) {
      case "accepted":
        return "Aceito";
      case "sent":
        return "Enviado";
      case "signed":
        return "Assinado";
      case "expired":
        return "Expirado";
      default:
        return "Rascunho";
    }
  };

  const statusColor = (status: Contract["status"]) => {
    switch (status) {
      case "accepted":
      case "signed":
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
    <div className={embedded ? "" : "min-h-screen"}>
      <div className={embedded ? "" : "content-container py-8 md:py-12"}>
        <motion.header className="mb-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          {!embedded && <h1 className="font-serif text-3xl md:text-4xl font-medium text-foreground">Contratos</h1>}
          <p className="mt-2 text-muted-foreground">Modelos editáveis, preenchimento automático e envio por email ou WhatsApp.</p>
        </motion.header>

        <motion.section className="mb-8 space-y-3" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-medium text-foreground">Modelos de contrato</h2>
            <Button variant="secondary" className="gap-2" onClick={() => openTemplateManager()}>
              <Save className="w-4 h-4" />
              Novo modelo
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {allTemplates.map((template) => (
              <div key={template.id} className="session-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-serif text-lg font-medium text-foreground">{template.name ?? template.title}</h3>
                    {template.description ? <p className="mt-1 text-sm text-muted-foreground">{template.description}</p> : null}
                  </div>
                  <span className="rounded-full bg-secondary px-2 py-1 text-xs text-secondary-foreground">
                    {template.kind === "contract" ? "Contrato" : "Documento"}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => openTemplateManager(template)}>
                    Editar
                  </Button>
                  {customTemplates.some((item) => item.id === template.id) ? (
                    <Button variant="ghost" size="sm" onClick={() => void handleDeleteTemplate(template.id)}>
                      Remover
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section className="space-y-3" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-medium text-foreground">Contratos gerados</h2>
            <Button variant="secondary" className="gap-2" onClick={openNewContract}>
              <Plus className="w-4 h-4" />
              Novo contrato
            </Button>
          </div>

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
                      {normalizeContractText(contract.title ?? "Contrato terapêutico")}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {contract.patient?.name ?? patientMap.get(contract.patient_id)?.name ?? contract.patient_id}
                    </p>
                  </div>
                  <span className={cn("text-xs px-2 py-1 rounded-full", statusColor(contract.status))}>
                    {statusLabel(contract.status)}
                  </span>
                </div>

                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>Modelo: {normalizeContractText(allTemplates.find((template) => template.id === contract.template_id)?.name ?? "Padrão")}</p>
                  <p>Valor: {normalizeContractText(contract.terms?.value ?? "Não informado")}</p>
                  <p>Frequência: {normalizeContractText(contract.terms?.periodicity ?? "Não informada")}</p>
                  <p>Pagamento: {normalizeContractText(contract.terms?.payment_method ?? "Não informado")}</p>
                </div>

                {contract.signed_attachment ? (
                  <p className="mt-3 text-sm text-status-validated">
                    Assinado anexado: {contract.signed_attachment.file_name}
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={() => openExistingContract(contract)}>
                    Revisar
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => void handleSend(contract, "email")} disabled={sending === contract.id}>
                    {sending === contract.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Email
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => void handleSend(contract, "whatsapp")} disabled={sending === contract.id}>
                    {sending === contract.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                    WhatsApp
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => handleExport(contract, "pdf")}>
                    <Download className="w-3.5 h-3.5" />
                    PDF
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => handleExport(contract, "docx")}>
                    <Download className="w-3.5 h-3.5" />
                    DOC
                  </Button>
                  <label className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    {uploadingSigned === contract.id ? "Anexando..." : "Upload assinado"}
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(event) => void handleSignedUpload(contract, event)}
                    />
                  </label>
                  <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setPreviewContract(contract)}>
                    <ExternalLink className="w-3.5 h-3.5" />
                    Preview
                  </Button>
                  <ShareWithPatientButton
                    type="contracts"
                    id={contract.id}
                    shared={(contract as unknown as { shared_with_patient?: boolean }).shared_with_patient ?? false}
                    onToggle={(shared) => setContracts((prev) => prev.map((c) => c.id === contract.id ? { ...c, shared_with_patient: shared } as unknown as typeof c : c))}
                  />
                </div>
              </div>
            ))
          )}
        </motion.section>

        <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="font-serif text-xl">{selectedContractId ? "Revisar contrato" : "Novo contrato"}</DialogTitle>
            </DialogHeader>
            {(!user?.rg || !user?.cpf) && (
              <div className="mx-6 mt-2 px-4 py-2 rounded-lg text-xs bg-amber-500/10 text-amber-700 border border-amber-500/20">
                ⚠️ Para um contrato completo, informe seu <strong>RG</strong> e <strong>CPF</strong> na página{" "}
                <a href="/conta" className="underline font-medium">Conta → Perfil</a>.
              </div>
            )}
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <select
                    value={editor.patientId}
                    onChange={(event) => {
                      const pid = event.target.value;
                      const p = patients.find((pt) => pt.id === pid);
                      const autoValue = p?.billing?.session_price
                        ? String(p.billing.session_price)
                        : p?.billing?.package_total_price
                          ? String(p.billing.package_total_price)
                          : "";
                      const autoType = p?.billing?.mode === "package" ? "pacote mensal" : "cada sessão realizada";
                      setEditor((current) => ({
                        ...current,
                        patientId: pid,
                        value: current.value || autoValue,
                        paymentType: current.paymentType || (p?.billing ? autoType : ""),
                      }));
                    }}
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Selecione o paciente</option>
                    {patients.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={editor.templateId}
                    onChange={(event) => handleTemplateChange(event.target.value)}
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Selecione o modelo</option>
                    {allTemplates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name ?? template.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Input placeholder="Título do contrato" value={editor.title} onChange={(event) => setEditor((current) => ({ ...current, title: event.target.value }))} />
                  <Input
                    placeholder={selectedPatient?.billing?.session_price ? `Valor (auto: R$ ${selectedPatient.billing.session_price})` : "Valor (ex: 200)"}
                    value={editor.value}
                    onChange={(event) => setEditor((current) => ({ ...current, value: event.target.value }))}
                  />
                  <Input
                    placeholder="Valor por extenso (ex: duzentos reais)"
                    value={editor.valueText}
                    onChange={(event) => setEditor((current) => ({ ...current, valueText: event.target.value }))}
                  />
                  <Input
                    placeholder={selectedPatient?.billing?.mode === "package" ? "Tipo de pagamento (auto: pacote mensal)" : "Tipo de pagamento (ex: cada sessão realizada)"}
                    value={editor.paymentType}
                    onChange={(event) => setEditor((current) => ({ ...current, paymentType: event.target.value }))}
                  />
                  <Input placeholder="Frequência" value={editor.periodicity} onChange={(event) => setEditor((current) => ({ ...current, periodicity: event.target.value }))} />
                  <Input placeholder="Forma de pagamento" value={editor.paymentMethod} onChange={(event) => setEditor((current) => ({ ...current, paymentMethod: event.target.value }))} />
                </div>

                <Textarea
                  placeholder="Política de faltas e cancelamentos"
                  value={editor.absencePolicy}
                  onChange={(event) => setEditor((current) => ({ ...current, absencePolicy: event.target.value }))}
                  className="min-h-[100px]"
                />

                <Textarea
                  value={editor.content}
                  onChange={(event) => setEditor((current) => ({ ...current, content: event.target.value }))}
                  className="min-h-[260px] resize-both"
                />
              </div>

              <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-4">
                <h3 className="font-serif text-lg text-foreground">Preview do contrato</h3>
                <div className="rounded-xl overflow-hidden border border-border bg-white">
                  <iframe
                    title="Preview do contrato"
                    srcDoc={buildContractHtml({
                      id: selectedContractId ?? "preview",
                      patient_id: editor.patientId,
                      template_id: editor.templateId,
                      title: editor.title,
                      content: computedContractContent,
                      psychologist: {
                        name: user?.name ?? "Psicóloga responsável",
                        license: user?.crp ?? "CRP não informado",
                        email: user?.email ?? "",
                      },
                      patient: {
                        name: selectedPatient?.name ?? "",
                        email: selectedPatient?.email ?? "",
                        document: selectedPatient?.cpf ?? "",
                        address: buildPatientAddress(selectedPatient) || selectedPatient?.address || "",
                      },
                      terms: {
                        value: editor.value,
                        periodicity: editor.periodicity,
                        absence_policy: editor.absencePolicy,
                        payment_method: editor.paymentMethod,
                      },
                      status: "draft",
                      created_at: new Date().toISOString(),
                    })}
                    className="h-[520px] min-h-[300px] w-full bg-white resize-y"
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="flex flex-wrap justify-between gap-2 shrink-0">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => {
                  const html = buildContractHtml({
                    content: computedContractContent,
                    psychologist: { name: user?.name ?? "", license: user?.crp ?? "", email: user?.email ?? "" },
                    patient: { name: selectedPatient?.name ?? "", document: selectedPatient?.cpf ?? "", email: selectedPatient?.email ?? "" },
                    terms: { value: editor.value, periodicity: editor.periodicity, absence_policy: editor.absencePolicy, payment_method: editor.paymentMethod },
                  });
                  openHtmlInNewTab(html);
                }}>
                  <Download className="w-3.5 h-3.5" />
                  PDF
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => {
                  const html = buildContractHtml({
                    content: computedContractContent,
                    psychologist: { name: user?.name ?? "", license: user?.crp ?? "", email: user?.email ?? "" },
                    patient: { name: selectedPatient?.name ?? "", document: selectedPatient?.cpf ?? "", email: selectedPatient?.email ?? "" },
                    terms: { value: editor.value, periodicity: editor.periodicity, absence_policy: editor.absencePolicy, payment_method: editor.paymentMethod },
                  });
                  downloadWordFromHtml(html, `contrato-${selectedContractId ?? "novo"}.doc`);
                }}>
                  <Download className="w-3.5 h-3.5" />
                  DOC
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => {
                  const patientPhone = selectedPatient?.whatsapp || selectedPatient?.phone;
                  const msg = encodeURIComponent(
                    `Olá ${selectedPatient?.name || ""}! Segue seu contrato terapêutico para revisão. Qualquer dúvida, estou à disposição.`
                  );
                  const url = patientPhone
                    ? `https://wa.me/55${patientPhone.replace(/\D/g, "")}?text=${msg}`
                    : `https://wa.me/?text=${msg}`;
                  window.open(url, "_blank", "noopener,noreferrer");
                }} disabled={!selectedPatient}>
                  <Send className="w-3.5 h-3.5" />
                  WhatsApp
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => setEditorOpen(false)}>Fechar</Button>
                <Button onClick={() => void handleSaveContract()} disabled={saving || !editor.patientId}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Salvar contrato
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={templateManagerOpen} onOpenChange={setTemplateManagerOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="font-serif text-xl">{templateDraftId ? "Editar modelo" : "Novo modelo de contrato"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Título do modelo" value={templateTitle} onChange={(event) => setTemplateTitle(event.target.value)} />
              <Input placeholder="Descrição" value={templateDescription} onChange={(event) => setTemplateDescription(event.target.value)} />
              <Textarea value={templateBody} onChange={(event) => setTemplateBody(event.target.value)} className="min-h-[360px]" />
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setTemplateManagerOpen(false)}>Fechar</Button>
              <Button onClick={() => void handleSaveTemplate()} disabled={templateSaving || !templateTitle.trim()}>
                {templateSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Salvar modelo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
              <Button variant="secondary" onClick={() => setPreviewContract(null)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ContractsPage;


