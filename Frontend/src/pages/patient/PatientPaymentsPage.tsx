import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, CreditCard, Loader2 } from "lucide-react";
import { patientPortalService, type PatientFinancialEntry } from "@/services/patientPortalService";
import IntegrationUnavailable from "@/components/IntegrationUnavailable";
import { cn } from "@/lib/utils";

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return iso;
  }
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export default function PatientPaymentsPage() {
  const [financial, setFinancial] = useState<PatientFinancialEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      const res = await patientPortalService.getFinancial();
      if (!res.success) {
        setError({ message: res.error.message, requestId: res.request_id });
      } else {
        setFinancial(res.data);
      }
      setLoading(false);
    };
    void load();
  }, []);

  if (loading) {
    return (
      <div className="content-container flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-container py-12">
        <h1 className="mb-6 font-serif text-3xl font-medium text-foreground">Pagamentos</h1>
        <IntegrationUnavailable message={error.message} requestId={error.requestId} />
      </div>
    );
  }

  const pending = financial.filter((entry) => entry.status === "open");
  const paid = financial.filter((entry) => entry.status === "paid");
  const totalPending = pending.reduce((sum, entry) => sum + entry.amount, 0);
  const nextDue = [...pending].sort((a, b) => (a.due_date || "").localeCompare(b.due_date || ""))[0];

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12">
        <motion.header className="mb-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-serif text-3xl font-medium text-foreground md:text-4xl">Pagamentos</h1>
          <p className="mt-2 text-muted-foreground">Acompanhe valores pendentes, pagamentos já realizados e próximos vencimentos.</p>
        </motion.header>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <motion.div className="session-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Pagamentos pendentes</p>
            <p className="mt-3 text-[2rem] font-semibold tracking-[-0.04em] text-foreground">{pending.length}</p>
            <p className="mt-2 text-sm text-muted-foreground">{pending.length === 0 ? "Nenhum valor em aberto." : "Pagamentos aguardando quitação."}</p>
          </motion.div>
          <motion.div className="session-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Total em aberto</p>
            <p className="mt-3 text-[2rem] font-semibold tracking-[-0.04em] text-foreground">{formatCurrency(totalPending)}</p>
            <p className="mt-2 text-sm text-muted-foreground">Soma dos pagamentos pendentes no momento.</p>
          </motion.div>
          <motion.div className="session-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Próximo vencimento</p>
            <p className="mt-3 text-[2rem] font-semibold tracking-[-0.04em] text-foreground">{nextDue?.due_date ? formatDate(nextDue.due_date) : "—"}</p>
            <p className="mt-2 text-sm text-muted-foreground">{nextDue ? "Data do vencimento mais próximo." : "Sem vencimentos agendados."}</p>
          </motion.div>
        </div>

        {financial.length === 0 ? (
          <div className="py-16 text-center">
            <CreditCard className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Nenhum lançamento disponível.</p>
          </div>
        ) : (
          <motion.div className="space-y-3" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            {[...pending, ...paid].map((entry) => (
              <div key={entry.id} className="session-card flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{entry.description ?? "Sessão de psicoterapia"}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.payment_method ? `${entry.payment_method} · ` : ""}
                    {entry.status === "paid" && entry.paid_at
                      ? `Pago em ${formatDate(entry.paid_at)}`
                      : entry.due_date
                        ? `Vence ${formatDate(entry.due_date)}`
                        : "Sem vencimento definido"}
                  </p>
                </div>
                <div className="shrink-0 space-y-1 text-right">
                  <p className="font-medium text-foreground">{formatCurrency(entry.amount)}</p>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
                      entry.status === "paid"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700",
                    )}
                  >
                    {entry.status === "paid" ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" />
                        Pago
                      </>
                    ) : (
                      "Pendente"
                    )}
                  </span>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
