import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DollarSign, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { financeService, FinancialEntry } from "@/services/financeService";
import IntegrationUnavailable from "@/components/IntegrationUnavailable";
import WhatsAppButton from "@/components/WhatsAppButton";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { FinanceCardSkeleton } from "@/components/SkeletonCards";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";

const FinancePage = () => {
  const { toast } = useToast();
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId: string } | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Create dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newPatientId, setNewPatientId] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newMethod, setNewMethod] = useState("");

  useEffect(() => {
    loadEntries();
  }, [filterStatus]);

  const loadEntries = async () => {
    setLoading(true);
    const res = await financeService.listEntries(filterStatus !== "all" ? { status: filterStatus } : undefined);
    if (!res.success) {
      setError({ message: res.error.message, requestId: res.request_id });
    } else {
      setEntries(res.data);
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!newPatientId.trim() || !newAmount) return;
    setCreating(true);
    const res = await financeService.createEntry({
      patient_id: newPatientId,
      amount: parseFloat(newAmount),
      payment_method: newMethod || undefined,
      status: "open",
    });
    if (res.success) {
      setEntries((prev) => [res.data, ...prev]);
      setDialogOpen(false);
      setNewPatientId(""); setNewAmount(""); setNewMethod("");
      toast({ title: "Lançamento criado" });
    } else {
      toast({ title: "Erro", description: res.error.message, variant: "destructive" });
    }
    setCreating(false);
  };

  const handleMarkPaid = async (entry: FinancialEntry) => {
    const res = await financeService.createEntry({ ...entry, status: "paid", paid_at: new Date().toISOString() });
    if (res.success) {
      toast({ title: "Marcado como pago" });
      loadEntries();
    } else {
      toast({ title: "Erro", description: res.error.message, variant: "destructive" });
    }
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case "paid": return "Pago";
      case "open": return "Em aberto";
      case "exempt": return "Isento";
      case "package": return "Pacote";
      default: return s;
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "paid": return "bg-status-validated/10 text-status-validated";
      case "open": return "bg-status-pending/10 text-status-pending";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="content-container py-8 md:py-12">
        <Skeleton className="h-10 w-40 mb-2" />
        <Skeleton className="h-5 w-56 mb-8" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (<FinanceCardSkeleton key={i} />))}
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
          <p className="mt-2 text-muted-foreground">Cobranças, pagamentos e lembretes.</p>
        </motion.header>

        <motion.div className="flex flex-wrap gap-3 mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" size="sm" className="gap-2">
                <Plus className="w-4 h-4" strokeWidth={1.5} />
                Lançar cobrança
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-serif text-xl">Nova cobrança</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input placeholder="ID do paciente" value={newPatientId} onChange={(e) => setNewPatientId(e.target.value)} />
                <Input type="number" step="0.01" placeholder="Valor (R$)" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} />
                <Input placeholder="Método de pagamento (opcional)" value={newMethod} onChange={(e) => setNewMethod(e.target.value)} />
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={creating || !newPatientId.trim() || !newAmount} className="gap-2">
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  Criar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="flex gap-1 ml-auto">
            {["all", "open", "paid", "exempt"].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={cn("px-3 py-1.5 text-xs rounded-lg transition-colors", filterStatus === s ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80")}
              >
                {s === "all" ? "Todos" : statusLabel(s)}
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div className="space-y-3" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          {entries.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Nenhum lançamento financeiro.</p>
            </div>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="session-card">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-foreground">{entry.patient_name || "Paciente"}</h3>
                    <p className="text-sm text-muted-foreground mt-1">R$ {entry.amount.toFixed(2)} · {entry.payment_method || "—"}</p>
                  </div>
                  <span className={cn("text-xs px-2 py-1 rounded-full", statusColor(entry.status))}>{statusLabel(entry.status)}</span>
                </div>
                {entry.status === "open" && (
                  <div className="mt-3 flex gap-2">
                    <Button variant="secondary" size="sm" className="text-xs" onClick={() => handleMarkPaid(entry)}>
                      Marcar como pago
                    </Button>
                    <WhatsAppButton phone="" message={`Olá! Lembrete de pagamento referente à sessão. Valor: R$ ${entry.amount.toFixed(2)}.`} label="Lembrete" size="sm" />
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
