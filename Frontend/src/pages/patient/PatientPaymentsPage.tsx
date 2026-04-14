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

const PatientPaymentsPage = () => {
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
      <div className="content-container py-12 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-container py-12">
        <h1 className="font-serif text-3xl font-medium text-foreground mb-6">Pagamentos</h1>
        <IntegrationUnavailable message={error.message} requestId={error.requestId} />
      </div>
    );
  }

  const pending = financial.filter((f) => f.status === "open");
  const paid = financial.filter((f) => f.status === "paid");
  const totalPending = pending.reduce((sum, f) => sum + f.amount, 0);
  const nextDue = pending.sort((a, b) => {
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  })[0];

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12">
        <motion.header className="mb-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-serif text-3xl md:text-4xl font-medium text-foreground">Pagamentos</h1>
          <p className="mt-2 text-muted-foreground">Histórico e pendências financeiras.</p>
        </motion.header>

        {/* Summary cards */}
        {financial.length > 0 && (
          <motion.div className="grid grid-cols-2 gap-4 mb-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="session-card">
              <p className="text-sm text-muted-foreground mb-1">Total pendente</p>
              <p className="font-serif text-2xl font-medium text-foreground">{formatCurrency(totalPending)}</p>
            </div>
            <div className="session-card">
              <p className="text-sm text-muted-foreground mb-1">Próximo vencimento</p>
              <p className="font-serif text-2xl font-medium text-foreground">
                {nextDue?.due_date ? formatDate(nextDue.due_date) : "—"}
              </p>
            </div>
          </motion.div>
        )}

        {financial.length === 0 ? (
          <div className="text-center py-16">
            <CreditCard className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Nenhum lançamento disponível.</p>
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
                      : ""}
                  </p>
                </div>
                <div className="text-right shrink-0 space-y-1">
                  <p className="font-medium text-foreground">{formatCurrency(entry.amount)}</p>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full",
                      entry.status === "paid"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700",
                    )}
                  >
                    {entry.status === "paid" ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
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
};

export default PatientPaymentsPage;
