import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  DollarSign,
  Loader2,
  PencilLine,
  Plus,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CashflowTable } from "@/components/finance/CashflowTable";
import {
  type CashflowMonth,
  financeService,
  type FinancialEntry,
  type FinancialSummary,
  type FinanceSummary,
} from "@/services/financeService";
import IntegrationUnavailable from "@/components/IntegrationUnavailable";
import WhatsAppButton from "@/components/WhatsAppButton";
import { cn } from "@/lib/utils";
import { ShareWithPatientButton } from "@/components/ShareWithPatientButton";
import { Skeleton } from "@/components/ui/skeleton";
import { FinanceCardSkeleton } from "@/components/SkeletonCards";
import { useToast } from "@/hooks/use-toast";
import { usePrivacy } from "@/hooks/usePrivacy";
import { patientService, type Patient } from "@/services/patientService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const FinanceTrendChart = lazy(() =>
  import("@/components/finance/FinanceCharts").then((module) => ({
    default: module.FinanceTrendChart,
  })),
);
const FinanceTopPatientsChart = lazy(() =>
  import("@/components/finance/FinanceCharts").then((module) => ({
    default: module.FinanceTopPatientsChart,
  })),
);

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
  description: "Sess\u00e3o de psicoterapia",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

const toInputDate = (value?: string) =>
  value ? new Date(value).toISOString().slice(0, 10) : "";

const formatDate = (value?: string) =>
  value
    ? new Date(value).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
      })
    : "Sem data";

const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

const statusLabel = (status: FinancialEntry["status"]) =>
  status === "paid" ? "Pago" : "Pendente";

const statusColor = (status: FinancialEntry["status"]) =>
  status === "paid"
    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    : "bg-amber-500/10 text-amber-700 dark:text-amber-300";

function ChartFallback() {
  return <Skeleton className="h-full w-full rounded-2xl" />;
}

export default function FinancePage() {
  const { toast } = useToast();
  const { maskCurrency, maskName } = usePrivacy();
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [cashflowByMonth, setCashflowByMonth] = useState<CashflowMonth[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId: string } | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "open" | "paid">("all");
  const [filterOverdue, setFilterOverdue] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

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
    void loadEntries(true);
    financeService.getFinancialSummary().then((result) => {
      if (result.success) setFinancialSummary(result.data);
    }).catch(() => {});
    financeService.getMonthlyCashflow().then((result) => {
      if (result.success) setCashflowByMonth(result.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setEntries([]);
    setNextCursor(null);
    setCurrentPage(1);
    void loadEntries(true);
  }, [filterStatus]);

  async function loadEntries(reset = false) {
    if (reset) setLoading(true);
    else setLoadingMore(true);

    const [summaryResult, listResult] = await Promise.all([
      financeService.getSummary(),
      financeService.listEntriesPage({
        status: filterStatus === "all" ? undefined : filterStatus,
        page: reset ? 1 : currentPage + 1,
        page_size: 30,
        cursor: reset ? undefined : (nextCursor ?? undefined),
      }),
    ]);

    if (summaryResult.success) {
      setSummary(summaryResult.data);
    }

    if (!listResult.success) {
      setError({ message: listResult.error.message, requestId: listResult.request_id });
    } else {
      setEntries((current) => (reset ? listResult.data.items : [...current, ...listResult.data.items]));
      setCurrentPage(listResult.data.page);
      setNextCursor(listResult.data.next_cursor ?? null);
      setError(null);
    }

    setLoading(false);
    setLoadingMore(false);
  }

  const isOverdue = (entry: FinancialEntry) => {
    if (entry.status !== "open" || !entry.due_date) return false;
    const due = new Date(entry.due_date.length === 10 ? `${entry.due_date}T12:00:00` : entry.due_date);
    due.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  };

  const filteredEntries = useMemo(
    () => (filterOverdue ? entries.filter((entry) => isOverdue(entry)) : entries),
    [entries, filterOverdue],
  );

  const paidEntries = useMemo(
    () => entries.filter((entry) => entry.status === "paid"),
    [entries],
  );
  const openEntries = useMemo(
    () => entries.filter((entry) => entry.status === "open"),
    [entries],
  );
  const paidAmount = useMemo(
    () => paidEntries.reduce((sum, entry) => sum + entry.amount, 0),
    [paidEntries],
  );
  const openAmount = useMemo(
    () => openEntries.reduce((sum, entry) => sum + entry.amount, 0),
    [openEntries],
  );
  const totalEntriesAmount = Math.max(paidAmount + openAmount, 1);

  const cashflowSegments = [
    {
      key: "paid",
      label: "Pago",
      amount: paidAmount,
      count: paidEntries.length,
      width: `${(paidAmount / totalEntriesAmount) * 100}%`,
      tone: "bg-emerald-500/80",
      chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    },
    {
      key: "open",
      label: "Pendente",
      amount: openAmount,
      count: openEntries.length,
      width: `${(openAmount / totalEntriesAmount) * 100}%`,
      tone: "bg-amber-500/80",
      chip: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    },
  ];

  const monthlyTrend = useMemo(() => {
    const buckets = new Map<string, { label: string; received: number; open: number }>();
    entries.forEach((entry) => {
      const source = entry.due_date ?? entry.created_at;
      const date = new Date(source);
      if (Number.isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const current = buckets.get(key) ?? {
        label: date.toLocaleDateString("pt-BR", { month: "short" }),
        received: 0,
        open: 0,
      };
      if (entry.status === "paid") current.received += entry.amount;
      else current.open += entry.amount;
      buckets.set(key, current);
    });
    return Array.from(buckets.values()).slice(-6);
  }, [entries]);

  const nextDueEntries = useMemo(
    () =>
      [...openEntries]
        .filter((entry) => entry.due_date)
        .sort((left, right) => Date.parse(left.due_date || "") - Date.parse(right.due_date || ""))
        .slice(0, 5),
    [openEntries],
  );

  const topPatients = useMemo(() => {
    const groups = new Map<string, { patientName: string; amount: number; count: number }>();
    entries.forEach((entry) => {
      const key = entry.patient_id;
      const current = groups.get(key) ?? {
        patientName: entry.patient_name || "Paciente",
        amount: 0,
        count: 0,
      };
      current.amount += entry.amount;
      current.count += 1;
      groups.set(key, current);
    });
    return Array.from(groups.values())
      .sort((left, right) => right.amount - left.amount)
      .slice(0, 5);
  }, [entries]);

  const recentOpenThisMonth = useMemo(
    () =>
      openEntries.filter((entry) => {
        const dueDate = entry.due_date ? new Date(entry.due_date) : new Date(entry.created_at);
        return dueDate >= startOfMonth;
      }).length,
    [openEntries],
  );

  const updateLocalEntry = (nextEntry: FinancialEntry) => {
    const nextEntries = entries.map((entry) =>
      entry.id === nextEntry.id ? nextEntry : entry,
    );
    setEntries(nextEntries);

    const paid = nextEntries.filter((entry) => entry.status === "paid");
    const open = nextEntries.filter((entry) => entry.status === "open");

    setSummary((current) =>
      current
        ? {
            ...current,
            paid_sessions: paid.length,
            pending_sessions: open.length,
            total_per_month: paid.reduce((sum, entry) => sum + entry.amount, 0),
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
      due_date: newEntry.due_date
        ? new Date(`${newEntry.due_date}T12:00:00`).toISOString()
        : undefined,
      status: newEntry.status,
      notes: newEntry.notes || undefined,
      description: newEntry.description || undefined,
    });

    if (!result.success) {
      toast({
        title: "Erro",
        description: result.error.message,
        variant: "destructive",
      });
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
            total_per_month: nextEntries
              .filter((entry) => entry.status === "paid")
              .reduce((sum, entry) => sum + entry.amount, 0),
            entries: nextEntries,
          }
        : current,
    );

    setCreateOpen(false);
    setNewPatientId("");
    setNewEntry(emptyEntryForm);
    toast({ title: "Cobran\u00e7a criada" });
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
      description: entry.description ?? "Sess\u00e3o de psicoterapia",
    });
    setEditOpen(true);
  };

  const handleSaveEntry = async () => {
    if (!selectedEntry || !editEntry.amount) return;
    setSavingEntry(true);

    const result = await financeService.updateEntry(selectedEntry.id, {
      amount: Number(editEntry.amount),
      payment_method: editEntry.payment_method || undefined,
      due_date: editEntry.due_date
        ? new Date(`${editEntry.due_date}T12:00:00`).toISOString()
        : undefined,
      status: editEntry.status,
      paid_at: editEntry.status === "paid" ? new Date().toISOString() : undefined,
      notes: editEntry.notes || undefined,
      description: editEntry.description || undefined,
    });

    if (!result.success) {
      toast({
        title: "Erro ao salvar",
        description: result.error.message,
        variant: "destructive",
      });
      setSavingEntry(false);
      return;
    }

    updateLocalEntry(result.data);
    setEditOpen(false);
    setSelectedEntry(null);
    toast({ title: "Lançamento atualizado" });
    setSavingEntry(false);
  };

  if (loading) {
    return (
      <div className="content-container py-8 md:py-12">
        <Skeleton className="mb-2 h-10 w-40" />
        <Skeleton className="mb-8 h-5 w-56" />
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
        <h1 className="mb-6 text-[2.4rem] font-semibold tracking-[-0.04em] text-foreground">
          Financeiro
        </h1>
        <IntegrationUnavailable message={error.message} requestId={error.requestId} />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12">
        <motion.header
          className="mb-10 rounded-[2rem] border border-border/80 bg-card px-4 py-5 shadow-[0_18px_44px_-28px_rgba(15,23,42,0.22)] md:px-7 md:py-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">
            ETHOS Web
          </p>
          <h1 className="text-2xl font-semibold tracking-[-0.05em] text-foreground md:text-[2.35rem] xl:text-[3.2rem]">
            Financeiro
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground md:text-[1.02rem]">
            Cobranças, pagamentos e acompanhamento do fluxo financeiro da clínica com visão mais estratégica.
          </p>
        </motion.header>

        <motion.section
          className="mb-6 grid gap-4 xl:grid-cols-[1.25fr_0.75fr]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
        >
          <div className="rounded-[2rem] border border-border bg-card p-6 shadow-[0_18px_44px_-28px_rgba(15,23,42,0.2)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Panorama do mês</p>
                <h2 className="mt-2 text-[1.65rem] font-semibold tracking-[-0.03em] text-foreground">
                  Fluxo de recebimentos
                </h2>
                <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                  Compare rapidamente o valor já recebido com o que ainda está pendente e identifique onde agir primeiro.
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/50 px-4 py-3 text-right">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Em aberto</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{maskCurrency(formatCurrency(openAmount))}</p>
              </div>
            </div>

            <div className="mt-6 h-[220px] rounded-2xl border border-border/70 bg-background/40 p-4">
              <Suspense fallback={<ChartFallback />}>
                <FinanceTrendChart data={monthlyTrend} formatCurrency={formatCurrency} />
              </Suspense>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {cashflowSegments.map((segment) => (
                <div key={segment.key} className="rounded-2xl border border-border/70 bg-background/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", segment.chip)}>
                      {segment.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {`${segment.count} lançamentos`}
                    </span>
                  </div>
                  <p className="mt-3 text-2xl font-serif text-foreground">{maskCurrency(formatCurrency(segment.amount))}</p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                    <div className={segment.tone} style={{ width: segment.width, height: "100%" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[0_18px_44px_-30px_rgba(15,23,42,0.18)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">{"Recebido no mês"}</p>
                  <p className="mt-2 text-[2rem] font-semibold tracking-[-0.04em] text-foreground">
                    {maskCurrency(formatCurrency(summary?.total_per_month ?? 0))}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-emerald-400" />
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[0_18px_44px_-30px_rgba(15,23,42,0.18)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">{"Sessões pagas"}</p>
                  <p className="mt-2 text-[2rem] font-semibold tracking-[-0.04em] text-foreground">
                    {summary?.paid_sessions ?? 0}
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[0_18px_44px_-30px_rgba(15,23,42,0.18)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">{"Pendências"}</p>
                  <p className="mt-2 text-[2rem] font-semibold tracking-[-0.04em] text-foreground">
                    {summary?.pending_sessions ?? 0}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-amber-400" />
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[0_18px_44px_-30px_rgba(15,23,42,0.18)]">
              <p className="text-sm text-muted-foreground">{"Ação rápida"}</p>
              <p className="mt-2 text-base font-medium text-foreground">
                {recentOpenThisMonth > 0
                  ? `${recentOpenThisMonth} pend\u00eancia(s) surgiram neste m\u00eas.`
                  : "Nenhuma nova pend\u00eancia no m\u00eas atual."}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {
                  "Priorize os vencimentos mais próximos e compartilhe cobranças no portal do paciente quando fizer sentido."
                }
              </p>
            </div>
          </div>
        </motion.section>

        <motion.section
          className="mb-6 grid gap-4 xl:grid-cols-[1fr_1fr]"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="rounded-[1.6rem] border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{"Vencimentos prioritários"}</h3>
                <p className="text-sm text-muted-foreground">
                  {"Os próximos pagamentos que merecem atenção."}
                </p>
              </div>
              <ArrowUpRight className="h-5 w-5 text-primary/70" />
            </div>
            {nextDueEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {"Nenhum próximo vencimento pendente registrado."}
              </p>
            ) : (
              <div className="space-y-3">
                {nextDueEntries.map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-border/70 bg-background/60 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{entry.patient_name ?? "Paciente"}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {entry.description ?? "Cobran\u00e7a cl\u00ednica"} ? vence em {formatDate(entry.due_date)}
                        </p>
                      </div>
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", statusColor(entry.status))}>
                        {statusLabel(entry.status)}
                      </span>
                    </div>
                    <p className="mt-3 text-xl font-semibold text-foreground">{maskCurrency(formatCurrency(entry.amount))}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[1.6rem] border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Pacientes com maior volume</h3>
                <p className="text-sm text-muted-foreground">
                  {"Quem mais concentrou lançamentos no período."}
                </p>
              </div>
            </div>
            {topPatients.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum paciente com volume financeiro registrado ainda.</p>
            ) : (
              <div className="h-[260px] rounded-2xl border border-border/70 bg-background/40 p-4">
                <Suspense fallback={<ChartFallback />}>
                  <FinanceTopPatientsChart data={topPatients} formatCurrency={formatCurrency} />
                </Suspense>
              </div>
            )}
          </div>
        </motion.section>

        <motion.section
          className="mb-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
        >
          <CashflowTable rows={cashflowByMonth} formatCurrency={formatCurrency} />
        </motion.section>

        <motion.div className="mb-6 flex flex-wrap gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" size="sm" className="gap-2">
                <Plus className="h-4 w-4" strokeWidth={1.5} />
                {"Lançar cobrança"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-serif text-xl">Nova cobran\u00e7a</DialogTitle>
                <DialogDescription>
                  {"Registre um novo lançamento financeiro para o paciente e acompanhe o status depois."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Paciente</label>
                  <select value={newPatientId} onChange={(event) => setNewPatientId(event.target.value)} className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
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
                  <select value={newEntry.status} onChange={(event) => setNewEntry((current) => ({ ...current, status: event.target.value as "open" | "paid" }))} className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="open">Pendente</option>
                    <option value="paid">Pago</option>
                  </select>
                </div>
                <Input placeholder="Descri\u00e7\u00e3o da cobran\u00e7a" value={newEntry.description} onChange={(event) => setNewEntry((current) => ({ ...current, description: event.target.value }))} />
                <Textarea placeholder="Observa\u00e7\u00f5es internas" value={newEntry.notes} onChange={(event) => setNewEntry((current) => ({ ...current, notes: event.target.value }))} className="min-h-[96px]" />
                {patients.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {"Cadastre um paciente antes de lançar a cobrança."}
                  </p>
                ) : null}
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={creating || patients.length === 0 || !newPatientId || !newEntry.amount} className="gap-2">
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Criar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="ml-auto flex gap-1">
            {(["all", "open", "paid"] as const).map((status) => (
              <button key={status} onClick={() => setFilterStatus(status)} className={cn("rounded-lg px-3 py-1.5 text-xs transition-colors", filterStatus === status ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80")}>
                {status === "all" ? "Todos" : statusLabel(status)}
              </button>
            ))}
            <button
              onClick={() => setFilterOverdue((value) => !value)}
              className={cn("rounded-lg px-3 py-1.5 text-xs transition-colors", filterOverdue ? "bg-destructive text-destructive-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80")}
            >
              Vencidos
            </button>
          </div>
        </motion.div>

        {financialSummary && financialSummary.overdue_count > 0 ? (
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm">
            <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
            <div className="flex-1">
              <span className="font-semibold text-destructive">
                {financialSummary.overdue_count} {financialSummary.overdue_count === 1 ? "cobran\u00e7a vencida" : "cobran\u00e7as vencidas"}
              </span>
              <span className="text-muted-foreground">
                {" · "}
                {financialSummary.overdue_total.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}{" "}
                em aberto
              </span>
            </div>
            <button className="text-xs font-medium text-destructive underline-offset-2 hover:underline" onClick={() => setFilterOverdue(true)}>
              Ver vencidas
            </button>
          </div>
        ) : null}

        <motion.div className="space-y-3" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          {filteredEntries.length === 0 ? (
            <div className="py-12 text-center">
              <DollarSign className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">{"Nenhum lançamento financeiro ainda."}</p>
            </div>
          ) : (
            filteredEntries.map((entry) => (
              <div key={entry.id} className="session-card">
                <button type="button" className="w-full text-left" onClick={() => openEdit(entry)}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-foreground">{maskName(entry.patient_name ?? "Paciente")}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {entry.description ?? "Cobran\u00e7a"} ? vencimento {formatDate(entry.due_date)}
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", statusColor(entry.status))}>
                        {statusLabel(entry.status)}
                      </span>
                      {isOverdue(entry) ? (
                        <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                          Vencido
                        </span>
                      ) : null}
                      <p className="mt-3 text-lg font-semibold text-foreground">{maskCurrency(formatCurrency(entry.amount))}</p>
                    </div>
                  </div>
                </button>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => openEdit(entry)}>
                      <PencilLine className="h-4 w-4" />
                      Editar
                    </Button>
                    <ShareWithPatientButton type="financial/entries" id={entry.id} shared={(entry as FinancialEntry & { shared_with_patient?: boolean }).shared_with_patient ?? false} />
                    <WhatsAppButton
                      phone=""
                      message={`Ol\u00e1! Gostaria de lembrar que existe um pagamento combinado no valor de ${formatCurrency(entry.amount)} com vencimento em ${formatDate(entry.due_date)}.`}
                      label="Lembrar no WhatsApp"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {entry.payment_method ? `Forma de pagamento: ${entry.payment_method}` : "Forma de pagamento n\u00e3o definida"}
                  </p>
                </div>
              </div>
            ))
          )}

          {nextCursor ? (
            <div className="pt-2">
              <Button
                variant="outline"
                className="w-full gap-2"
                disabled={loadingMore}
                onClick={() => void loadEntries(false)}
              >
                {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {loadingMore ? "Carregando mais lançamentos..." : "Carregar mais lançamentos"}
              </Button>
            </div>
          ) : null}
        </motion.div>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-serif text-xl">Editar lan\u00e7amento</DialogTitle>
              <DialogDescription>
                {"Ajuste valor, status, vencimento e observações desse lançamento."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Input type="number" step="0.01" placeholder="Valor (R$)" value={editEntry.amount} onChange={(event) => setEditEntry((current) => ({ ...current, amount: event.target.value }))} />
                <Input type="date" value={editEntry.due_date} onChange={(event) => setEditEntry((current) => ({ ...current, due_date: event.target.value }))} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Input placeholder="Forma de pagamento" value={editEntry.payment_method} onChange={(event) => setEditEntry((current) => ({ ...current, payment_method: event.target.value }))} />
                <select value={editEntry.status} onChange={(event) => setEditEntry((current) => ({ ...current, status: event.target.value as "open" | "paid" }))} className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="open">Pendente</option>
                  <option value="paid">Pago</option>
                </select>
              </div>
              <Input placeholder="Descri\u00e7\u00e3o" value={editEntry.description} onChange={(event) => setEditEntry((current) => ({ ...current, description: event.target.value }))} />
              <Textarea placeholder="Observa\u00e7\u00f5es" value={editEntry.notes} onChange={(event) => setEditEntry((current) => ({ ...current, notes: event.target.value }))} className="min-h-[96px]" />
            </div>
            <DialogFooter>
              <Button onClick={handleSaveEntry} disabled={savingEntry || !editEntry.amount} className="gap-2">
                {savingEntry ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
