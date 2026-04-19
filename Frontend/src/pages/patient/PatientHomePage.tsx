import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bell, Calendar, CheckCircle2, CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  patientPortalService,
  type PatientFinancialEntry,
  type PatientNotification,
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
    case "confirmed":
      return "Confirmada";
    case "completed":
      return "Concluída";
    case "missed":
      return "Faltou";
    case "pending":
    case "scheduled":
      return "Agendada";
    default:
      return "Sessão";
  }
};

const notificationLabel = (notification: PatientNotification) => {
  switch (notification.type) {
    case "session_reminder":
      return `Sua sessão é amanhã às ${notification.data.time ?? ""}`;
    case "payment_due":
      return `Pagamento de ${notification.data.amount ? formatCurrency(Number(notification.data.amount)) : ""} pendente`;
    case "document_shared":
      return `Novo documento disponível: ${notification.data.title ?? ""}`;
    case "slot_response":
      return notification.data.status === "confirmed"
        ? `Sessão de ${notification.data.date ?? ""} às ${notification.data.time ?? ""} confirmada!`
        : `Solicitação de ${notification.data.date ?? ""} às ${notification.data.time ?? ""} recusada`;
    default:
      return "Nova notificação";
  }
};

export default function PatientHomePage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<PatientSession[]>([]);
  const [financial, setFinancial] = useState<PatientFinancialEntry[]>([]);
  const [notifications, setNotifications] = useState<PatientNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      const [sessRes, finRes, notifRes] = await Promise.all([
        patientPortalService.getSessions(),
        patientPortalService.getFinancial(),
        patientPortalService.getNotifications(),
      ]);

      if (!sessRes.success) {
        setError({ message: sessRes.error.message, requestId: sessRes.request_id });
      } else {
        setSessions(sessRes.data);
      }

      if (finRes.success) setFinancial(finRes.data);
      if (notifRes.success) setNotifications(notifRes.data);
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

  const dismissNotification = async (id: string) => {
    await patientPortalService.markNotificationRead(id);
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification,
      ),
    );
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

  const unreadNotifications = notifications.filter((notification) => !notification.read);
  const totalPendingValue = pendingPayments.reduce((sum, entry) => sum + entry.amount, 0);

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12">
        <motion.header
          className="mb-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-serif text-3xl font-medium text-foreground md:text-4xl">
            Olá{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-2 text-muted-foreground">
            Acompanhe suas próximas sessões e seus pagamentos em um só lugar.
          </p>
        </motion.header>

        {unreadNotifications.length > 0 ? (
          <motion.div
            className="mb-6 space-y-2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            {unreadNotifications.map((notification) => (
              <div
                key={notification.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
              >
                <div className="flex items-start gap-2">
                  <Bell className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p className="text-sm text-foreground">
                    {notificationLabel(notification)}
                  </p>
                </div>
                <button
                  type="button"
                  className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => void dismissNotification(notification.id)}
                >
                  Dispensar
                </button>
              </div>
            ))}
          </motion.div>
        ) : null}

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <motion.div className="session-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Próximas sessões
            </p>
            <p className="mt-3 text-[2rem] font-semibold tracking-[-0.04em] text-foreground">
              {upcomingSessions.length}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {upcomingSessions.length === 0
                ? "Nenhuma sessão agendada."
                : "Sessões já marcadas para os próximos dias."}
            </p>
          </motion.div>

          <motion.div className="session-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Pagamentos pendentes
            </p>
            <p className="mt-3 text-[2rem] font-semibold tracking-[-0.04em] text-foreground">
              {pendingPayments.length}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {pendingPayments.length === 0
                ? "Nenhum pagamento pendente."
                : `${formatCurrency(totalPendingValue)} em aberto.`}
            </p>
          </motion.div>

          <motion.div className="session-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Notificações
            </p>
            <p className="mt-3 text-[2rem] font-semibold tracking-[-0.04em] text-foreground">
              {unreadNotifications.length}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {unreadNotifications.length === 0
                ? "Nenhuma notificação nova."
                : "Há atualizações esperando sua leitura."}
            </p>
          </motion.div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <motion.section
              className="session-card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="mb-4 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-serif text-lg font-medium">Próximas sessões</h2>
              </div>

              {upcomingSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma sessão agendada.
                </p>
              ) : (
                <div className="space-y-3">
                  {upcomingSessions.map((session) => (
                    <div
                      key={session.id}
                      className="rounded-xl border border-border/70 bg-background/70 px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {session.scheduled_at
                              ? formatDateTime(session.scheduled_at)
                              : `${session.date} ${session.time}`}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {sessionStatusLabel(session.status)}
                          </p>
                        </div>

                        {session.confirmed ? (
                          <span className="flex items-center gap-1 text-xs text-status-validated">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Confirmada
                          </span>
                        ) : (
                          <Button size="sm" onClick={() => void handleConfirm(session.id)}>
                            Confirmar
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.section>
          </div>

          <div className="space-y-6">
            <motion.section
              className="session-card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="mb-4">
                <h2 className="font-serif text-lg font-medium">Próximos pagamentos</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Veja os próximos vencimentos combinados com sua psicóloga.
                </p>
              </div>

              {pendingPayments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum pagamento pendente no momento.
                </p>
              ) : (
                <div className="space-y-3">
                  {pendingPayments.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-xl border border-border/70 bg-background/70 px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {entry.description ?? "Sessão de psicoterapia"}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {entry.due_date
                              ? `Vencimento em ${formatDate(entry.due_date)}`
                              : "Sem vencimento definido"}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-foreground">
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
    </div>
  );
}
