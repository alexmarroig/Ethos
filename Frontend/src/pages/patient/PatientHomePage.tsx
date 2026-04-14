import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bell, Calendar, CheckCircle2, CreditCard, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  patientPortalService,
  type PatientSession,
  type PatientFinancialEntry,
  type SharedDocument,
  type PatientNotification,
} from "@/services/patientPortalService";
import IntegrationUnavailable from "@/components/IntegrationUnavailable";
import { useAuth } from "@/contexts/AuthContext";

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return iso;
  }
};

const formatDateTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const notificationLabel = (n: PatientNotification) => {
  switch (n.type) {
    case "session_reminder": return `Sua sessão é amanhã às ${n.data.time ?? ""}`;
    case "payment_due": return `Pagamento de ${n.data.amount ? formatCurrency(Number(n.data.amount)) : ""} pendente`;
    case "document_shared": return `Novo documento disponível: ${n.data.title ?? ""}`;
    case "slot_response":
      return n.data.status === "confirmed"
        ? `Sessão de ${n.data.date ?? ""} às ${n.data.time ?? ""} confirmada!`
        : `Solicitação de ${n.data.date ?? ""} às ${n.data.time ?? ""} recusada`;
    default: return "Nova notificação";
  }
};

const PatientHomePage = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<PatientSession[]>([]);
  const [financial, setFinancial] = useState<PatientFinancialEntry[]>([]);
  const [documents, setDocuments] = useState<SharedDocument[]>([]);
  const [notifications, setNotifications] = useState<PatientNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      const [sessRes, finRes, docsRes, notifRes] = await Promise.all([
        patientPortalService.getSessions(),
        patientPortalService.getFinancial(),
        patientPortalService.getSharedDocuments(),
        patientPortalService.getNotifications(),
      ]);
      if (!sessRes.success) {
        setError({ message: sessRes.error.message, requestId: sessRes.request_id });
      } else {
        setSessions(sessRes.data);
      }
      if (finRes.success) setFinancial(finRes.data);
      if (docsRes.success) setDocuments(docsRes.data);
      if (notifRes.success) setNotifications(notifRes.data);
      setLoading(false);
    };
    void load();
  }, []);

  const handleConfirm = async (sessionId: string) => {
    const res = await patientPortalService.confirmSession(sessionId);
    if (res.success) {
      setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, confirmed: true } : s)));
    }
  };

  const dismissNotification = async (id: string) => {
    await patientPortalService.markNotificationRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

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
        <h1 className="font-serif text-3xl font-medium text-foreground mb-6">Início</h1>
        <IntegrationUnavailable message={error.message} requestId={error.requestId} />
      </div>
    );
  }

  const upcomingSessions = sessions
    .filter((s) => {
      const dt = s.scheduled_at ? new Date(s.scheduled_at) : null;
      return dt ? dt >= new Date() : false;
    })
    .slice(0, 3);

  const pendingPayments = financial.filter((f) => f.status === "open");
  const unreadNotifications = notifications.filter((n) => !n.read);
  const recentDocs = documents.slice(0, 5);

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12">
        <motion.header className="mb-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-serif text-3xl md:text-4xl font-medium text-foreground">
            Olá{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-2 text-muted-foreground">Seu portal clínico pessoal.</p>
        </motion.header>

        {/* Notifications */}
        {unreadNotifications.length > 0 && (
          <motion.div className="mb-6 space-y-2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            {unreadNotifications.map((n) => (
              <div key={n.id} className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
                <div className="flex items-start gap-2">
                  <Bell className="w-4 h-4 mt-0.5 text-ethos-primary shrink-0" />
                  <p className="text-sm text-foreground">{notificationLabel(n)}</p>
                </div>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground shrink-0"
                  onClick={() => void dismissNotification(n.id)}
                >
                  Dispensar
                </button>
              </div>
            ))}
          </motion.div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left column */}
          <div className="space-y-6">
            {/* Sessions */}
            <motion.section className="session-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <h2 className="font-serif text-lg font-medium">Próximas sessões</h2>
              </div>
              {upcomingSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma sessão agendada.</p>
              ) : (
                <div className="space-y-3">
                  {upcomingSessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between gap-3 py-2 border-b border-border/50 last:border-0">
                      <div>
                        <p className="font-medium text-foreground text-sm">
                          {session.scheduled_at ? formatDateTime(session.scheduled_at) : `${session.date} ${session.time}`}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">{session.status}</p>
                      </div>
                      {session.confirmed ? (
                        <span className="flex items-center gap-1 text-xs text-status-validated">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Confirmada
                        </span>
                      ) : (
                        <Button size="sm" onClick={() => void handleConfirm(session.id)}>
                          Confirmar
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.section>

            {/* Pending payments */}
            {pendingPayments.length > 0 && (
              <motion.section className="session-card border-amber-200 bg-amber-50/50" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className="w-4 h-4 text-amber-600" />
                  <h2 className="font-serif text-lg font-medium">Pagamentos pendentes</h2>
                </div>
                <div className="space-y-2">
                  {pendingPayments.map((f) => (
                    <div key={f.id} className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{f.description ?? "Sessão de psicoterapia"}</span>
                      <div className="text-right">
                        <p className="font-medium text-foreground">{formatCurrency(f.amount)}</p>
                        {f.due_date && <p className="text-xs text-muted-foreground">Vence {formatDate(f.due_date)}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.section>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Recent documents */}
            <motion.section className="session-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <h2 className="font-serif text-lg font-medium">Documentos recentes</h2>
              </div>
              {recentDocs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum documento disponibilizado ainda.</p>
              ) : (
                <div className="space-y-2">
                  {recentDocs.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between gap-3 py-2 border-b border-border/50 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-foreground">{doc.title ?? (doc.kind === "longitudinal_record" ? "Prontuário" : "Documento")}</p>
                        <p className="text-xs text-muted-foreground capitalize">{doc.type} · {doc.shared_at ? formatDate(doc.shared_at) : formatDate(doc.created_at)}</p>
                      </div>
                      {doc.type === "contract" && doc.status !== "signed" && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Aguarda assinatura</span>
                      )}
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
};

export default PatientHomePage;
