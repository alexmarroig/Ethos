import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, DollarSign, Loader2, PencilLine, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

type EntryFormState = {
  amount: string;
  payment_method: string;
  due_date: string;
  status: "open" | "paid";
  notes: string;
  description: string;
};

const emptyEntryForm: EntryFormState = {
  amount: "",
  payment_method: "",
  due_date: "",
  status: "open",
  notes: "",
  description: "Sessão de psicoterapia",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const toInputDate = (value?: string) => (value ? new Date(value).toISOString().slice(0, 10) : "");

const FinancePage = () => {
  const { toast } = useToast();
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId: string } | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newPatientId, setNewPatientId] = useState("");
  const [newEntry, setNewEntry] = useState<EntryFormState>(emptyEntryForm);

  const [selectedEntry, setSelectedEntry] = useState<FinancialEntry | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [savingEntry, setSavingEntry] = useState(false);
  const [editEntry, setEditEntry] = useState<EntryFormState>(emptyEntryForm);

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

  const chartData = useMemo(() => {
    const paid = entries.filter((entry) => entry.status === "paid");
    const open = entries.filter((entry) => entry.status === "open");
    const paidAmount = paid.reduce((sum, entry) => sum + entry.amount, 0);
    const openAmount = open.reduce((sum, entry) => sum + entry.amount, 0);
    const total = Math.max(paidAmount + openAmount, 1);

    return [
      {
        key: "paid",
        label: "Pago",
        amount: paidAmount,
        count: paid.length,
        width: `${(paidAmount / total) * 100}%`,
        tone: "bg-emerald-500/80",
        chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      },
      {
        key: "open",
        label: "Pendente",
        amount: openAmount,
        count: open.length,
        width: `${(openAmount / total) * 100}%`,
        tone: "bg-amber-500/80",
        chip: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
      },
    ];
  }, [entries]);

  const pendingAmount = useMemo(
    () => entries.filter((entry) => entry.status === "open").reduce((sum, entry) => sum + entry.amount, 0),
    [entries],
  );

  const updateLocalEntry = (nextEntry: FinancialEntry) => {
    const nextEntries = entries.map((entry) => (entry.id === nextEntry.id ? nextEntry : entry));
    setEntries(nextEntries);

    const paidEntries = nextEntries.filter((entry) => entry.status === "paid");
    const openEntries = nextEntries.filter((entry) => entry.status === "open");

    setSummary((current) =>
      current
        ? {
            ...current,
            paid_sessions: paidEntries.length,
            pending_sessions: openEntries.length,
            total_per_month: paidEntries.reduce((sum, entry) => sum + entry.amount, 0),
            entries: nextEntries,
          }
        : current,
    );
  };

  const handleCreate = async () => {
    if (!newPatientId || !newEntry.amount) return;
    setCreating(true);

    const result = await financeService.createEntry({
      patient_id: newPatientId,
      amount: Number(newEntry.amount),
      payment_method: newEntry.payment_method || undefined,
      due_date: newEntry.due_date ? new Date(`${newEntry.due_date}T12:00:00`).toISOString() : undefined,
      status: newEntry.status,
      notes: newEntry.notes || undefined,
      description: newEntry.description || undefined,
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
            paid_sessions: nextEntries.filter((entry) => entry.status === "paid").length,
            pending_sessions: nextEntries.filter((entry) => entry.status === "open").length,
            total_per_month: nextEntries.filter((entry) => entry.status === "paid").reduce((sum, entry) => sum + entry.amount, 0),
            entries: nextEntries,
          }
        : current,
    );
    setCreateOpen(false);
    setNewPatientId("");
    setNewEntry(emptyEntryForm);
    toast({ title: "Cobrança criada" });
    setCreating(false);
  };

  const openEdit = (entry: FinancialEntry) => {
    setSelectedEntry(entry);
    setEditEntry({
      amount: entry.amount.toString(),
      payment_method: entry.payment_method ?? "",
      due_date: toInputDate(entry.due_date),
      status: entry.status,
      notes: entry.notes ?? "",
      description: entry.description ?? "Sessão de psicoterapia",
    });
    setEditOpen(true);
  };

  const handleSaveEntry = async () => {
    if (!selectedEntry || !editEntry.amount) return;
    setSavingEntry(true);

    const result = await financeService.updateEntry(selectedEntry.id, {
      amount: Number(editEntry.amount),
      payment_method: editEntry.payment_method || undefined,
      due_date: editEntry.due_date ? new Date(`${editEntry.due_date}T12:00:00`).toISOString() : undefined,
      status: editEntry.status,
      paid_at: editEntry.status === "paid" ? new Date().toISOString() : undefined,
      notes: editEntry.notes || undefined,
      description: editEntry.description || undefined,
    });

    if (!result.success) {
      toast({ title: "Erro ao salvar", description: result.error.message, variant: "destructive" });
      setSavingEntry(false);
      return;
    }

    updateLocalEntry(result.data);
    setEditOpen(false);
    setSelectedEntry(null);
    toast({ title: "Lançamento atualizado" });
    setSavingEntry(false);
  };

  const statusLabel = (status: FinancialEntry["status"]) => {
    switch (status) {
      case "paid":
        return "Pago";
      case "open":
        return "Pendente";
      default:
        return status;
    }
  };

  const statusColor = (status: FinancialEntry["status"]) => {
    switch (status) {
      case "paid":
        return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
      case "open":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
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
        <h1 className="mb-6 text-[2.4rem] font-semibold tracking-[-0.04em] text-foreground">Financeiro</h1>
        <IntegrationUnavailable message={error.message} requestId={error.requestId} />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12">
        <motion.header className="mb-10 rounded-[2rem] border border-border/80 bg-card px-7 py-8 shadow-[0_18px_44px_-28px_rgba(15,23,42,0.22)] md:px-10 md:py-10" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">ETHOS Web</p>
          <h1 className="text-[2.35rem] font-semibold tracking-[-0.05em] text-foreground md:text-[3.2rem]">Financeiro</h1>
          <p className="mt-4 max-w-2xl text-[1.02rem] leading-7 text-muted-foreground">Cobranças, pagamentos e acompanhamento rápido do que está pendente.</p>
        </motion.header>

        <motion.div className="grid gap-4 lg:grid-cols-[1.4fr_1fr] mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}>
          <div className="rounded-[2rem] border border-border bg-card p-7 shadow-[0_18px_44px_-28px_rgba(15,23,42,0.2)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Panorama do mês</p>
                <h2 className="mt-2 text-[1.55rem] font-semibold tracking-[-0.03em] text-foreground">Fluxo de recebimentos</h2>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Em aberto</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{formatCurrency(pendingAmount)}</p>
              </div>
            </div>

            <div className="mt-6 h-4 overflow-hidden rounded-full bg-secondary/80">
              {chartData.map((segment) => (
                <div key={segment.key} className={segment.tone} style={{ width: segment.width, height: "100%", display: "inline-block" }} />
              ))}
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {chartData.map((segment) => (
                <div key={segment.key} className="rounded-2xl border border-border/70 bg-background/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", segment.chip)}>{segment.label}</span>
                    <span className="text-xs text-muted-foreground">{segment.count} lançamentos</span>
                  </div>
                  <p className="mt-3 text-2xl font-serif text-foreground">{formatCurrency(segment.amount)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[0_18px_44px_-30px_rgba(15,23,42,0.18)]">
              <p className="text-sm text-muted-foreground">Recebido no mês</p>
              <p className="mt-2 text-[2rem] font-semibold tracking-[-0.04em] text-foreground">{formatCurrency(summary?.total_per_month ?? 0)}</p>
            </div>
            <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[0_18px_44px_-30px_rgba(15,23,42,0.18)]">
              <p className="text-sm text-muted-foreground">Sessões pagas</p>
              <p className="mt-2 text-[2rem] font-semibold tracking-[-0.04em] text-foreground">{summary?.paid_sessions ?? 0}</p>
            </div>
            <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[0_18px_44px_-30px_rgba(15,23,42,0.18)]">
              <p className="text-sm text-muted-foreground">Pendências</p>
              <p className="mt-2 text-[2rem] font-semibold tracking-[-0.04em] text-foreground">{summary?.pending_sessions ?? 0}</p>
            </div>
          </div>
        </motion.div>

        <motion.div className="flex flex-wrap gap-3 mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
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
                <div className="grid gap-4 md:grid-cols-2">
                  <Input type="number" step="0.01" placeholder="Valor (R$)" value={newEntry.amount} onChange={(event) => setNewEntry((current) => ({ ...current, amount: event.target.value }))} />
                  <Input type="date" value={newEntry.due_date} onChange={(event) => setNewEntry((current) => ({ ...current, due_date: event.target.value }))} />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input placeholder="Forma de pagamento" value={newEntry.payment_method} onChange={(event) => setNewEntry((current) => ({ ...current, payment_method: event.target.value }))} />
                  <select
                    value={newEntry.status}
                    onChange={(event) => setNewEntry((current) => ({ ...current, status: event.target.value as "open" | "paid" }))}
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="open">Pendente</option>
                    <option value="paid">Pago</option>
                  </select>
                </div>
                <Input placeholder="Descrição da cobrança" value={newEntry.description} onChange={(event) => setNewEntry((current) => ({ ...current, description: event.target.value }))} />
                <Textarea placeholder="Observações internas" value={newEntry.notes} onChange={(event) => setNewEntry((current) => ({ ...current, notes: event.target.value }))} className="min-h-[96px]" />
                {patients.length === 0 && <p className="text-sm text-muted-foreground">Cadastre um paciente antes de lançar a cobrança.</p>}
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={creating || patients.length === 0 || !newPatientId || !newEntry.amount} className="gap-2">
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
              <p className="text-muted-foreground text-sm">Nenhum lançamento financeiro ainda.</p>
            </div>
          ) : (
            filteredEntries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className="session-card w-full text-left"
                onClick={() => openEdit(entry)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-foreground">{entry.patient_name || "Paciente"}</h3>
                      <span className={cn("text-xs px-2 py-1 rounded-full", statusColor(entry.status))}>{statusLabel(entry.status)}</span>
                    </div>
                    <p className="text-base font-medium text-foreground">{formatCurrency(entry.amount)}</p>
                    <p className="text-sm text-muted-foreground">
                      {entry.description || "Sessão de psicoterapia"}
                      {entry.payment_method ? ` · ${entry.payment_method}` : ""}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Vencimento: {entry.due_date ? new Date(entry.due_date).toLocaleDateString("pt-BR") : "Não definido"}</span>
                      {entry.paid_at ? <span>Pago em {new Date(entry.paid_at).toLocaleDateString("pt-BR")}</span> : null}
                    </div>
                    {entry.notes ? <p className="text-sm text-muted-foreground">{entry.notes}</p> : null}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <PencilLine className="w-3.5 h-3.5" />
                      Editar
                    </span>
                    {entry.status === "open" ? (
                      <div onClick={(event) => event.stopPropagation()}>
                        <WhatsAppButton
                          phone=""
                          message={`Olá! Passando para lembrar do pagamento pendente de ${formatCurrency(entry.amount)}.`}
                          label="Enviar lembrete"
                          size="sm"
                        />
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Pago
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </motion.div>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-serif text-xl">Gerenciar cobrança</DialogTitle>
            </DialogHeader>
            {selectedEntry ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Paciente</p>
                  <p className="mt-1 font-medium text-foreground">{selectedEntry.patient_name || "Paciente"}</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input type="number" step="0.01" value={editEntry.amount} onChange={(event) => setEditEntry((current) => ({ ...current, amount: event.target.value }))} />
                  <Input type="date" value={editEntry.due_date} onChange={(event) => setEditEntry((current) => ({ ...current, due_date: event.target.value }))} />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input placeholder="Forma de pagamento" value={editEntry.payment_method} onChange={(event) => setEditEntry((current) => ({ ...current, payment_method: event.target.value }))} />
                  <select
                    value={editEntry.status}
                    onChange={(event) => setEditEntry((current) => ({ ...current, status: event.target.value as "open" | "paid" }))}
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="open">Pendente</option>
                    <option value="paid">Pago</option>
                  </select>
                </div>
                <Input placeholder="Descrição da cobrança" value={editEntry.description} onChange={(event) => setEditEntry((current) => ({ ...current, description: event.target.value }))} />
                <Textarea placeholder="Observações internas" value={editEntry.notes} onChange={(event) => setEditEntry((current) => ({ ...current, notes: event.target.value }))} className="min-h-[96px]" />
              </div>
            ) : null}
            <DialogFooter>
              <Button variant="secondary" onClick={() => setEditOpen(false)}>Fechar</Button>
              <Button onClick={handleSaveEntry} disabled={savingEntry || !editEntry.amount} className="gap-2">
                {savingEntry && <Loader2 className="w-4 h-4 animate-spin" />}
                Salvar alteracoes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default FinancePage;

