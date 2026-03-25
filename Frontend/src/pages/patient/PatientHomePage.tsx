import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { patientPortalService, PatientSession } from "@/services/patientPortalService";
import IntegrationUnavailable from "@/components/IntegrationUnavailable";

const PatientHomePage = () => {
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
    load();
  }, []);

  const handleConfirm = async (sessionId: string) => {
    const res = await patientPortalService.confirmSession(sessionId);
    if (res.success) {
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, confirmed: true } : s))
      );
    }
  };

  if (loading) {
    return (
      <div className="content-container py-12">
        <p className="loading-text">Carregando suas sessões...</p>
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

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12">
        <motion.header
          className="mb-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-serif text-3xl md:text-4xl font-medium text-foreground">
            Suas sessões
          </h1>
          <p className="mt-2 text-muted-foreground">Confirme sua presença nas próximas sessões.</p>
        </motion.header>

        <motion.div
          className="space-y-3"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {sessions.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Nenhuma sessão agendada.</p>
            </div>
          ) : (
            sessions.map((session) => (
              <div key={session.id} className="session-card flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{session.date}</p>
                  <p className="text-sm text-muted-foreground">{session.time}</p>
                </div>
                {session.confirmed ? (
                  <span className="flex items-center gap-1 text-xs text-status-validated">
                    <CheckCircle2 className="w-4 h-4" />
                    Confirmada
                  </span>
                ) : (
                  <Button size="sm" onClick={() => handleConfirm(session.id)}>
                    Confirmar presença
                  </Button>
                )}
              </div>
            ))
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default PatientHomePage;
