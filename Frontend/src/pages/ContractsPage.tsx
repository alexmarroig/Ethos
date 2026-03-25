import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ScrollText, Plus, Send, Download, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { contractsApi } from "@/api/clinical";
import type { Contract } from "@/api/types";
import IntegrationUnavailable from "@/components/IntegrationUnavailable";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

const ContractsPage = () => {
  const { toast } = useToast();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // New contract form
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newPatientId, setNewPatientId] = useState("");

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    setLoading(true);
    const res = await contractsApi.list();
    if (!res.success) {
      setError({ message: res.error.message, requestId: res.request_id });
    } else {
      setContracts(res.data);
      setError(null);
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    setCreating(true);
    const res = await contractsApi.create({
      title: newTitle,
      content: newContent,
      patient_id: newPatientId,
    });
    if (res.success) {
      setContracts((prev) => [res.data, ...prev]);
      setDialogOpen(false);
      setNewTitle("");
      setNewContent("");
      setNewPatientId("");
      toast({ title: "Contrato criado" });
    } else {
      toast({ title: "Erro", description: res.error.message, variant: "destructive" });
    }
    setCreating(false);
  };

  const handleSend = async (id: string) => {
    const res = await contractsApi.send(id);
    if (res.success) {
      toast({ title: "Contrato enviado", description: "Link do portal gerado." });
      loadContracts();
    } else {
      toast({ title: "Erro", description: res.error.message, variant: "destructive" });
    }
  };

  const handleExport = async (id: string, format: "pdf" | "docx") => {
    const res = await contractsApi.exportContract(id, format);
    if (res.success) {
      toast({ title: "Exportado", description: `${format.toUpperCase()} gerado.` });
    } else {
      toast({ title: "Erro", description: res.error.message, variant: "destructive" });
    }
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case "draft": return "Rascunho";
      case "sent": return "Enviado";
      case "accepted": return "Aceito";
      case "expired": return "Expirado";
      default: return s;
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "accepted": return "bg-status-validated/10 text-status-validated";
      case "sent": return "bg-status-pending/10 text-status-pending";
      case "expired": return "bg-destructive/10 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="content-container py-8 md:py-12">
        <Skeleton className="h-10 w-48 mb-2" />
        <Skeleton className="h-5 w-64 mb-8" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
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
            Termos e contratos terapêuticos com assinatura via portal.
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
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-serif text-xl">Novo contrato</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="ID do paciente"
                  value={newPatientId}
                  onChange={(e) => setNewPatientId(e.target.value)}
                />
                <Input
                  placeholder="Título do contrato"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
                <Textarea
                  placeholder="Conteúdo do contrato"
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="min-h-[150px]"
                />
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={creating || !newTitle.trim()} className="gap-2">
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  Criar
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
              <p className="text-muted-foreground text-sm">Nenhum contrato criado.</p>
            </div>
          ) : (
            contracts.map((c) => (
              <div key={c.id} className="session-card">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-serif text-lg font-medium text-foreground">{c.title}</h3>
                  <span className={cn("text-xs px-2 py-1 rounded-full", statusColor(c.status))}>
                    {statusLabel(c.status)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {c.patient_name || c.patient_id}
                </p>
                <div className="flex flex-wrap gap-2">
                  {c.status === "draft" && (
                    <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => handleSend(c.id)}>
                      <Send className="w-3.5 h-3.5" strokeWidth={1.5} />
                      Enviar
                    </Button>
                  )}
                  {c.portal_url && (
                    <Button variant="ghost" size="sm" className="gap-1.5" asChild>
                      <a href={c.portal_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.5} />
                        Portal
                      </a>
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => handleExport(c.id, "pdf")}>
                    <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
                    PDF
                  </Button>
                </div>
              </div>
            ))
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ContractsPage;
