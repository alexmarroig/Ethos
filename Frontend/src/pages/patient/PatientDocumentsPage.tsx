import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Download, FileText, Loader2, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { patientPortalService, type SharedDocument } from "@/services/patientPortalService";
import IntegrationUnavailable from "@/components/IntegrationUnavailable";
import { useToast } from "@/hooks/use-toast";
import { downloadWordFromHtml, openHtmlInNewTab } from "@/services/exportService";

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return iso;
  }
};

const docTypeLabel = (type: SharedDocument["type"]) => {
  switch (type) {
    case "contract": return "Contrato";
    case "report": return "Relatório";
    case "document": return "Documento";
  }
};

const buildDocumentHtml = (doc: SharedDocument) => `
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <style>
    body { font-family: Inter, Arial, sans-serif; color: #17313a; background: #f7f2ea; margin: 0; padding: 32px; }
    .sheet { max-width: 860px; margin: 0 auto; background: #fffdfa; border: 1px solid #e8ddd1; border-radius: 24px; padding: 40px; }
    h1 { font-family: Lora, Georgia, serif; font-size: 28px; margin: 0 0 24px; }
    .badge { display: inline-block; text-transform: uppercase; letter-spacing: .12em; font-size: 11px; color: #8b6f58; margin-bottom: 12px; }
    .content { white-space: pre-wrap; font-size: 15px; line-height: 1.7; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="badge">ETHOS · ${docTypeLabel(doc.type).toUpperCase()}</div>
    <h1>${doc.title ?? docTypeLabel(doc.type)}</h1>
    <div class="content">${doc.content ?? doc.terms?.value ?? "Sem conteúdo."}</div>
  </div>
</body>
</html>`;

const groupDocs = (docs: SharedDocument[]) => ({
  contracts: docs.filter((d) => d.type === "contract"),
  reports: docs.filter((d) => d.type === "report"),
  documents: docs.filter((d) => d.type === "document"),
});

const PatientDocumentsPage = () => {
  const { toast } = useToast();
  const [docs, setDocs] = useState<SharedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId: string } | null>(null);
  const [previewDoc, setPreviewDoc] = useState<SharedDocument | null>(null);
  const [signing, setSigning] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const res = await patientPortalService.getSharedDocuments();
      if (!res.success) {
        setError({ message: res.error.message, requestId: res.request_id });
      } else {
        setDocs(res.data);
      }
      setLoading(false);
    };
    void load();
  }, []);

  const handleSign = async (doc: SharedDocument) => {
    setSigning(doc.id);
    const res = await patientPortalService.signContract(doc.id);
    setSigning(null);
    if (res.success) {
      setDocs((prev) => prev.map((d) => (d.id === doc.id ? { ...d, status: "signed" } : d)));
      toast({ title: "Contrato assinado", description: "O contrato foi assinado com sucesso." });
    } else {
      toast({ title: "Erro", description: res.error.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="content-container py-12 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
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

  const { contracts, reports, documents } = groupDocs(docs);

  const DocCard = ({ doc }: { doc: SharedDocument }) => (
    <div className="session-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{docTypeLabel(doc.type)}</span>
            {doc.status === "signed" && (
              <span className="flex items-center gap-1 text-xs text-status-validated">
                <CheckCircle2 className="w-3 h-3" />
                Assinado
              </span>
            )}
          </div>
          <h3 className="font-medium text-foreground">{doc.title ?? docTypeLabel(doc.type)}</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {doc.shared_at ? `Disponibilizado em ${formatDate(doc.shared_at)}` : formatDate(doc.created_at)}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button variant="outline" size="sm" onClick={() => setPreviewDoc(doc)}>
            Ver
          </Button>
          {doc.type === "contract" && doc.status !== "signed" && (
            <Button size="sm" className="gap-1.5" onClick={() => void handleSign(doc)} disabled={signing === doc.id}>
              {signing === doc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PenLine className="w-3.5 h-3.5" />}
              Assinar
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  const Section = ({ title, items }: { title: string; items: SharedDocument[] }) =>
    items.length === 0 ? null : (
      <section className="space-y-3">
        <h2 className="font-serif text-lg font-medium text-foreground">{title}</h2>
        {items.map((doc) => <DocCard key={doc.id} doc={doc} />)}
      </section>
    );

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12">
        <motion.header className="mb-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-serif text-3xl md:text-4xl font-medium text-foreground">Seus documentos</h1>
          <p className="mt-2 text-muted-foreground">Documentos compartilhados pelo seu psicólogo.</p>
        </motion.header>

        {docs.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Nenhum documento disponibilizado ainda.</p>
          </div>
        ) : (
          <motion.div className="space-y-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Section title="Contratos" items={contracts} />
            <Section title="Relatórios" items={reports} />
            <Section title="Documentos" items={documents} />
          </motion.div>
        )}

        {/* Preview dialog */}
        <Dialog open={Boolean(previewDoc)} onOpenChange={(open) => { if (!open) setPreviewDoc(null); }}>
          <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="font-serif text-xl">{previewDoc?.title ?? docTypeLabel(previewDoc?.type ?? "document")}</DialogTitle>
            </DialogHeader>
            {previewDoc && (
              <iframe
                title="Preview do documento"
                srcDoc={buildDocumentHtml(previewDoc)}
                className="flex-1 min-h-[60vh] w-full rounded-lg border border-border bg-white"
              />
            )}
            <DialogFooter className="flex flex-wrap justify-between gap-2">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => previewDoc && openHtmlInNewTab(buildDocumentHtml(previewDoc))}>
                  PDF
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => previewDoc && downloadWordFromHtml(buildDocumentHtml(previewDoc), `${previewDoc.title ?? "documento"}.doc`)}>
                  <Download className="w-3.5 h-3.5" />
                  DOC
                </Button>
              </div>
              {previewDoc?.type === "contract" && previewDoc.status !== "signed" && (
                <Button size="sm" className="gap-1.5" onClick={() => { if (previewDoc) void handleSign(previewDoc); }} disabled={signing === previewDoc?.id}>
                  {signing === previewDoc?.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PenLine className="w-3.5 h-3.5" />}
                  Assinar contrato
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={() => setPreviewDoc(null)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default PatientDocumentsPage;
