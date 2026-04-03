import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CalendarPlus, UserPlus } from "lucide-react";
import SessionCard, { SessionStatus } from "@/components/SessionCard";
import FloatingActionButton, { SessionState } from "@/components/FloatingActionButton";
import { sessionService, type Session } from "@/services/sessionService";
import IntegrationUnavailable from "@/components/IntegrationUnavailable";
import { Skeleton } from "@/components/ui/skeleton";
import { SessionCardSkeleton } from "@/components/SkeletonCards";
import { Button } from "@/components/ui/button";

interface HomePageProps {
  onSessionClick: (sessionId: string) => void;
  onNavigate: (page: string) => void;
}

const HomePage = ({ onSessionClick, onNavigate }: HomePageProps) => {
  const [todaySessions, setTodaySessions] = useState<Session[]>([]);
  const [pendingSessions, setPendingSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const today = new Date().toISOString().slice(0, 10);
      const res = await sessionService.list({ from: today, to: today });

      if (!res.success) {
        setError({ message: res.error.message, requestId: res.request_id });
        setLoading(false);
        return;
      }

      const sessions = res.data;
      setTodaySessions(sessions);

      const pendingRes = await sessionService.list({ status: "pending" });
      if (pendingRes.success) {
        const todayIds = new Set(sessions.map((item) => item.id));
        setPendingSessions(pendingRes.data.filter((item) => !todayIds.has(item.id)));
      } else {
        setPendingSessions([]);
      }

      setError(null);
      setLoading(false);
    };

    void load();
  }, []);

  const mapStatus = (session: Session): SessionStatus => {
    if (session.clinical_note_status === "validated") return "validated";
    if (session.clinical_note_status === "draft") return "draft";
    return "pending";
  };

  const mapStatusLabel = (session: Session) => {
    if (session.clinical_note_status === "validated") return "Prontuario validado";
    if (session.clinical_note_status === "draft") return "Rascunho pendente";
    if (!session.has_audio) return "Registro pendente";
    return "Registro pendente";
  };

  const getFabState = (): SessionState => {
    const all = [...todaySessions, ...pendingSessions];
    if (all.some((item) => !item.has_audio && !item.has_clinical_note)) return "no-record";
    if (all.some((item) => item.clinical_note_status === "draft")) return "draft-prontuario";
    return "no-session";
  };

  if (loading) {
    return (
      <div className="content-container py-8 md:py-12">
        <Skeleton className="h-10 w-72 mb-3" />
        <Skeleton className="h-5 w-24 mb-10" />
        <Skeleton className="h-4 w-32 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <SessionCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <div className="content-container py-12">
          <h1 className="font-serif text-3xl md:text-4xl font-medium text-foreground mb-8">
            O que precisa de atencao hoje.
          </h1>
          <IntegrationUnavailable message={error.message} requestId={error.requestId} />
        </div>
      </div>
    );
  }

  const isFirstRun = todaySessions.length === 0 && pendingSessions.length === 0;

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12">
        <motion.header
          className="mb-10"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <h1 className="font-serif text-3xl md:text-4xl font-medium text-foreground text-balance">
            O que precisa de atencao hoje.
          </h1>
          <p className="mt-3 text-muted-foreground text-base">Com calma.</p>
        </motion.header>

        <section className="mb-10">
          <motion.h2
            className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            Sessoes de hoje
          </motion.h2>

          {todaySessions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/60 p-6">
              <p className="text-sm text-muted-foreground">
                Nenhuma sessao agendada para hoje.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button variant="secondary" className="gap-2" onClick={() => onNavigate("patients")}>
                  <UserPlus className="w-4 h-4" />
                  Cadastrar primeiro paciente
                </Button>
                <Button className="gap-2" onClick={() => onNavigate("agenda")}>
                  <CalendarPlus className="w-4 h-4" />
                  Agendar primeira sessao
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {todaySessions.map((session, index) => (
                <SessionCard
                  key={session.id}
                  patientName={session.patient_name}
                  date="Hoje"
                  time={session.time}
                  status={mapStatus(session)}
                  statusLabel={mapStatusLabel(session)}
                  onClick={() => onSessionClick(session.id)}
                  index={index}
                />
              ))}
            </div>
          )}
        </section>

        {pendingSessions.length > 0 && (
          <section>
            <motion.h2
              className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.4 }}
            >
              Prontuario pendente
            </motion.h2>
            <div className="space-y-3">
              {pendingSessions.map((session, index) => (
                <SessionCard
                  key={session.id}
                  patientName={session.patient_name}
                  date={session.date}
                  time={session.time}
                  status={mapStatus(session)}
                  statusLabel={mapStatusLabel(session)}
                  onClick={() => onSessionClick(session.id)}
                  index={index + todaySessions.length}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      <FloatingActionButton
        state={getFabState()}
        onClick={() => onNavigate(isFirstRun ? "patients" : "agenda")}
      />
    </div>
  );
};

export default HomePage;
