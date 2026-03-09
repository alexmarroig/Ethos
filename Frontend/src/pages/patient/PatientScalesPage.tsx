import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart3, AlertCircle } from "lucide-react";
import { scaleService, Scale } from "@/services/scaleService";
import IntegrationUnavailable from "@/components/IntegrationUnavailable";

const PatientScalesPage = () => {
  const [scales, setScales] = useState<Scale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      const res = await scaleService.list();
      if (!res.success) {
        setError({ message: res.error.message, requestId: res.request_id });
      } else {
        setScales(res.data);
      }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="content-container py-12"><p className="loading-text">Carregando escalas...</p></div>;

  if (error) return (
    <div className="content-container py-12">
      <h1 className="font-serif text-3xl font-medium text-foreground mb-6">Escalas</h1>
      <IntegrationUnavailable message={error.message} requestId={error.requestId} />
    </div>
  );

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12">
        <motion.header className="mb-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-serif text-3xl md:text-4xl font-medium text-foreground">Escalas</h1>
          <p className="mt-2 text-muted-foreground">Preencha quando solicitado pelo profissional.</p>
        </motion.header>

        <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 border border-border mb-8">
          <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground">Instrumento auxiliar. Não substitui avaliação clínica.</p>
        </div>

        {scales.length === 0 ? (
          <div className="text-center py-12">
            <BarChart3 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Nenhuma escala disponível no momento.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {scales.map((scale) => (
              <div key={scale.id} className="session-card cursor-pointer">
                <h3 className="font-serif text-lg font-medium text-foreground">{scale.name}</h3>
                {scale.description && <p className="mt-1 text-sm text-muted-foreground">{scale.description}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientScalesPage;
