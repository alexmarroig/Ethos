import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { DollarSign, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { financeService, type FinancialEntry, type FinanceSummary } from "@/services/financeService";
import IntegrationUnavailable from "@/components/IntegrationUnavailable";
import WhatsAppButton from "@/components/WhatsAppButton";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { FinanceCardSkeleton } from "@/components/SkeletonCards";
import { useToast } from "@/hooks/use-toast";
import { patientService, type Patient } from "@/services/patientService";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const FinancePage = () => {
  const { toast } = useToast();
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId: string } | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newPatientId, setNewPatientId] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newMethod, setNewMethod] = useState("");
  const [newDueDate, setNewDueDate] = useState("");

  useEffect(() => {
    const loadPatients = async () => {
      const result = await patientService.list();
      if (result.success) setPatients(result.data);
    };

    void loadPatients();
  }, []);

  useEffect(() => {
    void loadEntries();
  }, []);

  async function loadEntries() {
    setLoading(true);
    const result = await financeService.getSummary();
    if (!result.success) {
      setError({ message: result.error.message, requestId: result.request_id });
    } else {
      setSummary(result.data);
      setEntries(result.data.entries);
      setError(null);
    }
    setLoading(false);
  }

  const filteredEntries = useMemo(
    () => (filterStatus === "all" ? entries : entries.filter((entry) => entry.status === filterStatus)),
    [entries, filterStatus],
  );

  const handleCreate = async () => {
    if (!newPatientId || !newAmount) return;
    setCreating(true);

    const result = await financeService.createEntry({
      patient_id: newPatientId,
      amount: Number(newAmount),
      payment_method: newMethod || undefined,
      due_date: newDueDate ? new Date(`${newDueDate}T12:00:00`).toISOString() : undefined,
      status: "open",
    });

    if (!result.success) {
      toast({ title: "Erro", description: result.error.message, variant: "destructive" });
      setCreating(false);
      return;
    }

    const nextEntries = [result.data, ...entries];
    setEntries(nextEntries);
    setSummary((current) =>
      current
        ? {
            ...current,
            pending_sessions: current.pending_sessions + 1,
            entries: nextEntries,
          }
        : current,
    );
    setDialogOpen(false);
    setNewPatientId("");
    setNewAmount("");
    setNewMethod("");
    setNewDueDate("");
    toast({ title: "Cobranca criada" });
    setCreating(false);
  };

  const statusLabel = (status: FinancialEntry["status"]) => {
    switch (status) {
      case "paid":
        return "Pago";
      case "open":
        return "Em aberto";
      default:
        return status;
    }
  };

  const statusColor = (status: FinancialEntry["status"]) => {
    switch (status) {
      case "paid":
        return "bg-status-validated/10 text-status-validated";
      case "open":
        return "bg-status-pending/10 text-status-pending";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="content-container py-8 md:py-12">
        <Skeleton className="h-10 w-40 mb-2" />
        <Skeleton className="h-5 w-56 mb-8" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <FinanceCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-container py-12">
        <h1 className="font-serif text-3xl font-medium text-foreground mb-6">Financeiro</h1>
        <IntegrationUnavailable message={error.message} requestId={error.requestId} />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12">
        <motion.header className="mb-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="font-serif text-3xl md:text-4xl font-medium text-foreground">Financeiro</h1>
          <p className="mt-2 text-muted-foreground">Cobrancas, pagamentos e lembretes.</p>
        </motion.header>

        <motion.div className="grid gap-4 md:grid-cols-3 mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Recebido no mes</p>
            <p className="mt-2 font-serif text-3xl text-foreground">
              R$ {(summary?.total_per_month ?? 0).toFixed(2)}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Sessoes pagas</p>
            <p className="mt-2 font-serif text-3xl text-foreground">{summary?.paid_sessions ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Pendencias</p>
            <p className="mt-2 font-serif text-3xl text-foreground">{summary?.pending_sessions ?? 0}</p>
          </div>
        </motion.div>

        <motion.div className="flex flex-wrap gap-3 mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" size="sm" className="gap-2">
                <Plus className="w-4 h-4" strokeWidth={1.5} />
                Lancar cobranca
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-serif text-xl">Nova cobranca</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Paciente</label>
                  <select
                    value={newPatientId}
                    onChange={(event) => setNewPatientId(event.target.value)}
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="">Selecione um paciente</option>
                    {patients.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.name}
                      </option>
                    ))}
                  </select>
                </div>
                <Input type="number" step="0.01" placeholder="Valor (R$)" value={newAmount} onChange={(event) => setNewAmount(event.target.value)} />
                <Input placeholder="Metodo de pagamento (opcional)" value={newMethod} onChange={(event) => setNewMethod(event.target.value)} />
                <Input type="date" value={newDueDate} onChange={(event) => setNewDueDate(event.target.value)} />
                {patients.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Cadastre um paciente antes de lancar a cobranca.
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={creating || patients.length === 0 || !newPatientId || !newAmount} className="gap-2">
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  Criar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="flex gap-1 ml-auto">
            {["all", "open", "paid"].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={cn(
                  "px-3 py-1.5 text-xs rounded-lg transition-colors",
                  filterStatus === status ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                )}
              >
                {status === "all" ? "Todos" : statusLabel(status as FinancialEntry["status"])}
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div className="space-y-3" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          {filteredEntries.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Nenhum lancamento financeiro ainda.</p>
            </div>
          ) : (
            filteredEntries.map((entry) => (
              <div key={entry.id} className="session-card">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-medium text-foreground">{entry.patient_name || "Paciente"}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      R$ {entry.amount.toFixed(2)} · {entry.payment_method || "Pagamento externo"}
                    </p>
                    {entry.due_date && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Vencimento: {new Date(entry.due_date).toLocaleDateString("pt-BR")}
                      </p>
                    )}
                  </div>
                  <span className={cn("text-xs px-2 py-1 rounded-full", statusColor(entry.status))}>
                    {statusLabel(entry.status)}
                  </span>
                </div>
                {entry.status === "open" && (
                  <div className="mt-3">
                    <WhatsAppButton
                      phone=""
                      message={`Ola! Passando para lembrar do pagamento pendente de R$ ${entry.amount.toFixed(2)}.`}
                      label="Enviar lembrete"
                      size="sm"
                    />
                  </div>
                )}
              </div>
            ))
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default FinancePage;
