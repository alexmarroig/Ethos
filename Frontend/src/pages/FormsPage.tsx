import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ClipboardList, Plus, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formService, Form } from "@/services/formService";
import IntegrationUnavailable from "@/components/IntegrationUnavailable";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";

const FormsPage = () => {
  const { toast } = useToast();
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId: string } | null>(null);

  // Create entry dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedFormId, setSelectedFormId] = useState("");
  const [patientId, setPatientId] = useState("");
  const [entryData, setEntryData] = useState("");

  useEffect(() => {
    const load = async () => {
      const res = await formService.list();
      if (!res.success) {
        setError({ message: res.error.message, requestId: res.request_id });
      } else {
        setForms(res.data);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleCreateEntry = async () => {
    if (!selectedFormId || !patientId) return;
    setCreating(true);
    let parsed: unknown = {};
    try { parsed = JSON.parse(entryData || "{}"); } catch { parsed = { text: entryData }; }
    const res = await formService.createEntry({
      form_id: selectedFormId,
      patient_id: patientId,
      data: parsed,
    });
    if (res.success) {
      setDialogOpen(false);
      setSelectedFormId(""); setPatientId(""); setEntryData("");
      toast({ title: "Entrada registrada" });
    } else {
      toast({ title: "Erro", description: res.error.message, variant: "destructive" });
    }
    setCreating(false);
  };

  if (loading) {
    return (
      <div className="content-container py-12">
        <p className="loading-text">Carregando formulários...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-container py-12">
        <h1 className="font-serif text-3xl font-medium text-foreground mb-6">Formulários / Diários</h1>
        <IntegrationUnavailable message={error.message} requestId={error.requestId} />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12">
        <motion.header className="mb-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="font-serif text-3xl md:text-4xl font-medium text-foreground">Formulários / Diários</h1>
          <p className="mt-2 text-muted-foreground">Material bruto do paciente. Separado do registro profissional.</p>
        </motion.header>

        <motion.div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 border border-border mb-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground">Este conteúdo nunca é inserido automaticamente em prontuário.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-lg font-medium text-foreground">Formulários disponíveis</h2>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" size="sm" className="gap-2">
                  <Plus className="w-4 h-4" strokeWidth={1.5} />
                  Nova entrada
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-serif text-xl">Nova entrada</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input placeholder="ID do formulário" value={selectedFormId} onChange={(e) => setSelectedFormId(e.target.value)} />
                  <Input placeholder="ID do paciente" value={patientId} onChange={(e) => setPatientId(e.target.value)} />
                  <Textarea placeholder="Dados (texto livre ou JSON)" value={entryData} onChange={(e) => setEntryData(e.target.value)} className="min-h-[100px]" />
                </div>
                <DialogFooter>
                  <Button onClick={handleCreateEntry} disabled={creating || !selectedFormId || !patientId} className="gap-2">
                    {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                    Registrar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {forms.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Nenhum formulário disponível.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {forms.map((form) => (
                <div key={form.id} className="session-card cursor-pointer">
                  <h3 className="font-serif text-lg font-medium text-foreground">{form.name}</h3>
                  {form.description && <p className="mt-1 text-sm text-muted-foreground">{form.description}</p>}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default FormsPage;
