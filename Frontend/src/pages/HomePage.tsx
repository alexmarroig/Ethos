import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import SessionCard, { SessionStatus } from "@/components/SessionCard";
import FloatingActionButton, { SessionState } from "@/components/FloatingActionButton";
import { sessionService, Session } from "@/services/sessionService";
import IntegrationUnavailable from "@/components/IntegrationUnavailable";
import { Skeleton } from "@/components/ui/skeleton";
import { SessionCardSkeleton } from "@/components/SkeletonCards";

interface HomePageProps {
  onSessionClick: (sessionId: number) => void;
}

const HomePage = ({ onSessionClick }: HomePageProps) => {
  const [todaySessions, setTodaySessions] = useState<Session[]>([]);
  const [pendingSessions, setPendingSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      const today = new Date().toISOString().split("T")[0];
      const res = await sessionService.list({ from: today, to: today });

      if (!res.success) {
        setError({ message: res.error.message, requestId: res.request_id });
        setLoading(false);
        return;
      }

      const sessions = res.data;
      setTodaySessions(sessions);

      // Also fetch pending (no date filter, status pending)
      const pendingRes = await sessionService.list({ status: "pending" });
      if (pendingRes.success) {
        // Filter out today's sessions from pending
        const todayIds = new Set(sessions.map((s) => s.id));
        setPendingSessions(pendingRes.data.filter((s) => !todayIds.has(s.id)));
      }

      setLoading(false);
    };
    load();
  }, []);

  const mapStatus = (s: Session): SessionStatus => {
    if (s.clinical_note_status === "validated") return "validated";
    if (s.clinical_note_status === "draft") return "draft";
    return "pending";
  };

  const mapStatusLabel = (s: Session): string => {
    if (s.clinical_note_status === "validated") return "Prontuário validado";
    if (s.clinical_note_status === "draft") return "Rascunho pendente";
    if (!s.has_audio) return "Registro pendente";
    return "Registro pendente";
  };

  const getFabState = (): SessionState => {
    const all = [...todaySessions, ...pendingSessions];
    if (all.some((s) => !s.has_audio && !s.has_clinical_note)) return "no-record";
    if (all.some((s) => s.clinical_note_status === "draft")) return "draft-prontuario";
    return "no-session";
  };

  if (loading) {
    return (
      <div className="content-container py-8 md:py-12">
        <Skeleton className="h-10 w-72 mb-3" />
        <Skeleton className="h-5 w-24 mb-10" />
        <Skeleton className="h-4 w-32 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SessionCardSkeleton key={i} />
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
            O que precisa de atenção hoje.
          </h1>
          <IntegrationUnavailable message={error.message} requestId={error.requestId} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12">
        {/* Header */}
        <motion.header
          className="mb-10"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <h1 className="font-serif text-3xl md:text-4xl font-medium text-foreground text-balance">
            O que precisa de atenção hoje.
          </h1>
          <p className="mt-3 text-muted-foreground text-base">Com calma.</p>
        </motion.header>

        {/* Today's sessions */}
        <section className="mb-10">
          <motion.h2
            className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            Sessões de hoje
          </motion.h2>

          {todaySessions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Nenhuma sessão agendada para hoje.</p>
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
                  onClick={() => onSessionClick(Number(session.id))}
                  index={index}
                />
              ))}
            </div>
          )}
        </section>

        {/* Pending sessions */}
        {pendingSessions.length > 0 && (
          <section>
            <motion.h2
              className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.4 }}
            >
              Prontuário pendente
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
                  onClick={() => onSessionClick(Number(session.id))}
                  index={index + todaySessions.length}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      <FloatingActionButton
        state={getFabState()}
        onClick={() => console.log("FAB clicked")}
      />
    </div>
  );
};

export default HomePage;
