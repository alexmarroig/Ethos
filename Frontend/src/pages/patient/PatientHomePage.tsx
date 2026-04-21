import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, CheckCircle2, CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  patientPortalService,
  type PatientFinancialEntry,
  type PatientSession,
} from "@/services/patientPortalService";
import IntegrationUnavailable from "@/components/IntegrationUnavailable";
import { useAuth } from "@/contexts/AuthContext";

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
};

const formatDateTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

const sessionStatusLabel = (status: string) => {
  switch (status) {
    case "confirmed": return "Confirmada";
    case "completed": return "Concluída";
    case "missed": return "Faltou";
    case "pending":
    case "scheduled": return "Agendada";
    case "cancelled_with_notice": return "Cancelado c/ aviso";
    case "cancelled_no_show": return "Cancelado s/ aviso";
    case "rescheduled_by_patient": return "Remarcado";
    case "rescheduled_by_psychologist": return "Remarcado p/ psicólogo";
    default: return "Sessão";
  }
};

export default function PatientHomePage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<PatientSession[]>([]);
  const [financial, setFinancial] = useState<PatientFinancialEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      const [sessRes, finRes] = await Promise.all([
        patientPortalService.getSessions(),
        patientPortalService.getFinancial(),
      ]);

      if (!sessRes.success) {
        setError({ message: sessRes.error.message, requestId: sessRes.request_id });
      } else {
        setSessions(sessRes.data);
      }

      if (finRes.success) setFinancial(finRes.data);
      setLoading(false);
    };

    void load();
  }, []);

  const handleConfirm = async (sessionId: string) => {
    const result = await patientPortalService.confirmSession(sessionId);
    if (result.success) {
      setSessions((current) =>
        current.map((session) =>
          session.id === sessionId
            ? { ...session, confirmed: true, status: "confirmed" }
            : session,
        ),
      );
    }
  };

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
        <h1 className="mb-6 font-serif text-3xl font-medium text-foreground">Início</h1>
        <IntegrationUnavailable message={error.message} requestId={error.requestId} />
      </div>
    );
  }

  const upcomingSessions = sessions
    .filter((session) => {
      const dt = session.scheduled_at ? new Date(session.scheduled_at) : null;
      return dt ? dt >= new Date() : false;
    })
    .slice(0, 5);

  const pendingPayments = financial
    .filter((entry) => entry.status === "open")
    .sort((a, b) => (a.due_date || "").localeCompare(b.due_date || ""))
    .slice(0, 5);

  const totalPendingValue = pendingPayments.reduce((sum, entry) => sum + entry.amount, 0);

  return (
    <div className="min-h-screen">
      <div className="content-container py-6 md:py-10">
        {/* Header */}
        <motion.header
          className="mb-6 flex items-start justify-between gap-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h1 className="font-serif text-2xl font-medium text-foreground md:text-4xl">
              Olá{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Acompanhe suas sessões e pagamentos.
            </p>
          </div>
        </motion.header>

        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-2 gap-3 md:gap-4">
          <motion.div
            className="session-card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground md:text-[11px]">
              Próximas sessões
            </p>
            <p className="mt-2 text-[1.75rem] font-semibold tracking-[-0.04em] text-foreground md:text-[2rem]">
              {upcomingSessions.length}
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground md:text-sm">
              {upcomingSessions.length === 0 ? "Nenhuma agendada." : "Sessões marcadas."}
            </p>
          </motion.div>

          <motion.div
            className="session-card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground md:text-[11px]">
              Pagamentos
            </p>
            <p className="mt-2 text-[1.75rem] font-semibold tracking-[-0.04em] text-foreground md:text-[2rem]">
              {pendingPayments.length}
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground md:text-sm">
              {pendingPayments.length === 0
                ? "Nenhum pendente."
                : `${formatCurrency(totalPendingValue)} em aberto.`}
            </p>
          </motion.div>
        </div>

        {/* Content Grid */}
        <div className="grid gap-4 lg:grid-cols-2 md:gap-6">
          {/* Upcoming Sessions */}
          <motion.section
            className="session-card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-serif text-base font-medium md:text-lg">Próximas sessões</h2>
            </div>

            {upcomingSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma sessão agendada.</p>
            ) : (
              <div className="space-y-2.5">
                {upcomingSessions.map((session) => (
                  <div
                    key={session.id}
                    className="rounded-xl border border-border/70 bg-background/70 px-3 py-2.5 md:px-4 md:py-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {session.scheduled_at
                            ? formatDateTime(session.scheduled_at)
                            : `${session.date} ${session.time}`}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {sessionStatusLabel(session.status)}
                        </p>
                      </div>

                      {session.confirmed ? (
                        <span className="flex shrink-0 items-center gap-1 text-xs text-status-validated">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Confirmada</span>
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          className="shrink-0 text-xs h-7 px-2.5"
                          onClick={() => void handleConfirm(session.id)}
                        >
                          Confirmar
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.section>

          {/* Pending Payments */}
          <motion.section
            className="session-card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="mb-4 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-serif text-base font-medium md:text-lg">Próximos pagamentos</h2>
            </div>

            {pendingPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum pagamento pendente no momento.
              </p>
            ) : (
              <div className="space-y-2.5">
                {pendingPayments.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-xl border border-border/70 bg-background/70 px-3 py-2.5 md:px-4 md:py-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {entry.description ?? "Sessão de psicoterapia"}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {entry.due_date
                            ? `Vencimento ${formatDate(entry.due_date)}`
                            : "Sem vencimento"}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-foreground">
                        {formatCurrency(entry.amount)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.section>
        </div>
      </div>
    </div>
  );
}
