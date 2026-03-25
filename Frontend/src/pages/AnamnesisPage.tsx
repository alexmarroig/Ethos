import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BookOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { anamnesisService, Anamnesis } from "@/services/anamnesisService";
import IntegrationUnavailable from "@/components/IntegrationUnavailable";

const AnamnesisPage = () => {
  const [records, setRecords] = useState<Anamnesis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      const res = await anamnesisService.list();
      if (!res.success) {
        setError({ message: res.error.message, requestId: res.request_id });
      } else {
        setRecords(res.data);
      }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="content-container py-12">
        <p className="loading-text">Carregando anamneses...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-container py-12">
        <h1 className="font-serif text-3xl font-medium text-foreground mb-6">Anamnese</h1>
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
          transition={{ duration: 0.5 }}
        >
          <h1 className="font-serif text-3xl md:text-4xl font-medium text-foreground">
            Anamnese
          </h1>
          <p className="mt-2 text-muted-foreground">
            Templates e histórico de coleta. Separação clara entre coleta e registro clínico.
          </p>
        </motion.header>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-lg font-medium text-foreground">
              Registros de anamnese
            </h2>
            <Button variant="secondary" size="sm" className="gap-2">
              <Plus className="w-4 h-4" strokeWidth={1.5} />
              Nova anamnese
            </Button>
          </div>

          {records.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                Nenhuma anamnese registrada.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {records.map((record) => (
                <div key={record.id} className="session-card">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-lg font-medium text-foreground">
                      {record.template || "Anamnese"}
                    </h3>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                      v{record.version}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {new Date(record.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default AnamnesisPage;
