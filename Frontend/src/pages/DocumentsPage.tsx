import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FilePlus2, FileText, FolderOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { documentsApi } from "@/api/clinical";
import type { Document, DocumentTemplate } from "@/api/types";
import { patientService, type Patient } from "@/services/patientService";
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

const DocumentsPage = () => {
  const { toast } = useToast();
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
        if (templatesRes.data[0]) {
          setTemplateId(templatesRes.data[0].id);
        }
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

  const selectedTemplate = templates.find((template) => template.id === templateId);

  const refreshDocuments = async () => {
    const result = await documentsApi.list();
    if (result.success) {
      setDocuments(result.data);
    }
  };

  const openCreateDialog = (template?: DocumentTemplate) => {
    setTemplateId(template?.id ?? templates[0]?.id ?? "");
    setTitle(template ? `${template.name ?? template.title ?? "Documento"} - ` : "");
    setDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!patientId || !templateId) return;

    setCreating(true);
    const template = templates.find((item) => item.id === templateId);
    const patientName = patientNames.get(patientId) ?? "Paciente";
    const result = await documentsApi.create({
      patient_id: patientId,
      template_id: templateId,
      title: title.trim() || `${template?.name ?? template?.title ?? "Documento"} - ${patientName}`,
    });

    if (!result.success) {
      toast({ title: "Erro ao criar documento", description: result.error.message, variant: "destructive" });
      setCreating(false);
      return;
    }

    await refreshDocuments();
    setDialogOpen(false);
    setCreating(false);
    setPatientId("");
    setTitle("");
    toast({ title: "Documento criado" });
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
        <h1 className="font-serif text-3xl font-medium text-foreground mb-6">Documentos</h1>
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
          transition={{ duration: 0.5 }}
        >
          <h1 className="font-serif text-3xl md:text-4xl font-medium text-foreground">
            Documentos
          </h1>
          <p className="mt-2 text-muted-foreground">
            Modelos padronizados e documentos vinculados aos pacientes.
          </p>
        </motion.header>

        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-lg font-medium text-foreground">Modelos padronizados</h2>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" className="gap-2" onClick={() => openCreateDialog()}>
                  <FilePlus2 className="w-4 h-4" strokeWidth={1.5} />
                  Novo documento
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-serif text-xl">Novo documento</DialogTitle>
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

                  <select
                    value={templateId}
                    onChange={(event) => setTemplateId(event.target.value)}
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name ?? template.title}
                      </option>
                    ))}
                  </select>

                  <Input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder={`Título do documento (${selectedTemplate?.name ?? selectedTemplate?.title ?? "template"})`}
                  />
                </div>
                <DialogFooter>
                  <Button onClick={handleCreate} disabled={creating || !patientId || !templateId} className="gap-2">
                    {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                    Criar documento
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {templates.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Nenhum template cadastrado.</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {templates.map((template) => (
                <div key={template.id} className="session-card">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-serif text-lg font-medium text-foreground">
                        {template.name ?? template.title ?? "Template"}
                      </h3>
                      {template.description && (
                        <p className="mt-1 text-sm text-muted-foreground">{template.description}</p>
                      )}
                    </div>
                  </div>

                  <Button variant="outline" className="mt-4 gap-2" onClick={() => openCreateDialog(template)}>
                    <FilePlus2 className="w-4 h-4" strokeWidth={1.5} />
                    Usar template
                  </Button>
                </div>
              ))}
            </div>
          )}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="font-serif text-lg font-medium text-foreground mb-4">Documentos criados</h2>

          {documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Nenhum documento criado ainda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((document) => (
                <div key={document.id} className="session-card">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-serif text-lg font-medium text-foreground">
                        {document.title}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {patientNames.get(document.patient_id ?? "") ?? "Paciente não identificado"} · {formatDate(document.created_at)}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                      {document.status ?? "draft"}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Template: {templates.find((template) => template.id === document.template_id)?.name ?? templates.find((template) => template.id === document.template_id)?.title ?? document.template_id ?? "n/a"} · versões: {document.versions_count ?? 0}
                  </p>
                </div>
              ))}
            </div>
          )}
        </motion.section>
      </div>
    </div>
  );
};

export default DocumentsPage;
