import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, CheckCircle2, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { patientPortalService, type PatientSession } from "@/services/patientPortalService";
import IntegrationUnavailable from "@/components/IntegrationUnavailable";

const formatDateTime = (iso?: string) => {
  if (!iso) return "Data não definida";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

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

export default function PatientSessionsPage() {
  const [sessions, setSessions] = useState<PatientSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      const res = await patientPortalService.getSessions();
      if (!res.success) {
        setError({ message: res.error.message, requestId: res.request_id });
      } else {
        setSessions(res.data);
      }
      setLoading(false);
    };
    void load();
  }, []);

  const handleConfirm = async (sessionId: string) => {
    const res = await patientPortalService.confirmSession(sessionId);
    if (res.success) {
      setSessions((prev) =>
        prev.map((session) =>
          session.id === sessionId
            ? { ...session, confirmed: true, status: "confirmed" }
            : session,
        ),
      );
    }
  };

  if (loading) {
    return (
      <div className="content-container py-12">
        <p className="loading-text">Carregando sessões...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-container py-12">
        <h1 className="mb-6 font-serif text-3xl font-medium text-foreground">Sessões</h1>
        <IntegrationUnavailable message={error.message} requestId={error.requestId} />
      </div>
    );
  }

  const upcoming = sessions.filter((session) => {
    if (!session.scheduled_at) return false;
    return new Date(session.scheduled_at) >= new Date();
  });

  const history = sessions.filter((session) => !upcoming.includes(session));

  const SessionRow = ({ session }: { session: PatientSession }) => (
    <div className="rounded-2xl border border-border bg-card px-5 py-4 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.18)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="font-medium text-foreground">
            {session.scheduled_at ? formatDateTime(session.scheduled_at) : `${session.date} ${session.time}`}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-3.5 w-3.5" />
              {sessionStatusLabel(session.status)}
            </span>
            {session.confirmed ? (
              <span className="inline-flex items-center gap-1 text-status-validated">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Confirmada
              </span>
            ) : null}
          </div>
        </div>

        {!session.confirmed ? (
          <Button size="sm" onClick={() => void handleConfirm(session.id)}>
            Confirmar
          </Button>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12">
        <motion.header className="mb-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-serif text-3xl font-medium text-foreground md:text-4xl">Sessões</h1>
          <p className="mt-2 text-muted-foreground">Acompanhe seus próximos atendimentos e o histórico recente.</p>
        </motion.header>

        <div className="grid gap-4 md:grid-cols-2 mb-8">
          <div className="session-card">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Próximas sessões</p>
            <p className="mt-3 text-[2rem] font-semibold tracking-[-0.04em] text-foreground">{upcoming.length}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {upcoming.length === 0 ? "Nenhuma sessão marcada." : "Sessões já agendadas para os próximos dias."}
            </p>
          </div>
          <div className="session-card">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Sessões anteriores</p>
            <p className="mt-3 text-[2rem] font-semibold tracking-[-0.04em] text-foreground">{history.length}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {history.length === 0 ? "Nenhum histórico recente." : "Atendimentos já registrados no portal."}
            </p>
          </div>
        </div>

        <div className="space-y-8">
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-serif text-xl text-foreground">Próximas sessões</h2>
            </div>
            {upcoming.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-background/70 py-12 text-center">
                <Calendar className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Nenhuma sessão agendada.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcoming.map((session) => (
                  <SessionRow key={session.id} session={session} />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-xl text-foreground">Histórico recente</h2>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma sessão anterior registrada.</p>
            ) : (
              <div className="space-y-3">
                {history.map((session) => (
                  <SessionRow key={session.id} session={session} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
