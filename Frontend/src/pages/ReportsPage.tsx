import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, Plus, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { reportService, Report } from "@/services/reportService";
import IntegrationUnavailable from "@/components/IntegrationUnavailable";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";

const ReportsPage = () => {
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId: string } | null>(null);

  // Create dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newPatientId, setNewPatientId] = useState("");
  const [newNoteId, setNewNoteId] = useState("");
  const [newPurpose, setNewPurpose] = useState("");

  useEffect(() => {
    const load = async () => {
      const res = await reportService.list();
      if (!res.success) {
        setError({ message: res.error.message, requestId: res.request_id });
      } else {
        setReports(res.data);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleCreate = async () => {
    if (!newPatientId.trim() || !newNoteId.trim() || !newPurpose.trim()) return;
    setCreating(true);
    const res = await reportService.create({
      patient_id: newPatientId,
      clinical_note_id: newNoteId,
      purpose: newPurpose,
    });
    if (res.success) {
      setReports((prev) => [res.data, ...prev]);
      setDialogOpen(false);
      setNewPatientId(""); setNewNoteId(""); setNewPurpose("");
      toast({ title: "Relatório criado" });
    } else {
      toast({ title: "Erro", description: res.error.message, variant: "destructive" });
    }
    setCreating(false);
  };

  if (loading) {
    return (
      <div className="content-container py-12">
        <p className="loading-text">Preparando relatórios...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-container py-12">
        <h1 className="font-serif text-3xl font-medium text-foreground mb-6">Relatórios</h1>
        <IntegrationUnavailable message={error.message} requestId={error.requestId} />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12">
        <motion.header className="mb-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="font-serif text-3xl md:text-4xl font-medium text-foreground">Relatórios</h1>
          <p className="mt-2 text-muted-foreground">Geração de relatórios a partir de prontuários validados.</p>
        </motion.header>

        <motion.div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 border border-border mb-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground">A criação de relatório exige prontuário validado e campo de finalidade obrigatório.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-lg font-medium text-foreground">Relatórios gerados</h2>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" size="sm" className="gap-2">
                  <Plus className="w-4 h-4" strokeWidth={1.5} />
                  Novo relatório
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-serif text-xl">Novo relatório</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input placeholder="ID do paciente" value={newPatientId} onChange={(e) => setNewPatientId(e.target.value)} />
                  <Input placeholder="ID da nota clínica (validada)" value={newNoteId} onChange={(e) => setNewNoteId(e.target.value)} />
                  <Input placeholder="Finalidade do relatório *" value={newPurpose} onChange={(e) => setNewPurpose(e.target.value)} />
                </div>
                <DialogFooter>
                  <Button onClick={handleCreate} disabled={creating || !newPurpose.trim()} className="gap-2">
                    {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                    Criar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {reports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Nenhum relatório gerado.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <div key={report.id} className="session-card">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-lg font-medium text-foreground">{report.patient_name || "Relatório"}</h3>
                    <span className="text-xs text-muted-foreground">{report.status === "draft" ? "Rascunho" : "Final"}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">Finalidade: {report.purpose}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ReportsPage;
