import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, AlertTriangle, BarChart3, Activity, Loader2 } from "lucide-react";
import { controlAdminService, MetricsOverview } from "@/services/controlAdminService";
import { api } from "@/services/apiClient";
import { useAuth } from "@/contexts/AuthContext";

const AdminDashboard = () => {
  const { isCloudAuthenticated } = useAuth();
  const [metrics, setMetrics] = useState<MetricsOverview | null>(null);
  const [localMetrics, setLocalMetrics] = useState<MetricsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const promises: Promise<void>[] = [];

      if (isCloudAuthenticated) {
        promises.push(
          controlAdminService.getMetricsOverview().then((res) => {
            if (res.success) setMetrics(res.data);
          })
        );
      }

      promises.push(
        api.get<MetricsOverview>("/admin/metrics/overview").then((res) => {
          if (res.success) setLocalMetrics(res.data);
        })
      );

      await Promise.allSettled(promises);
      setLoading(false);
    };
    load();
  }, [isCloudAuthenticated]);

  const m = metrics || localMetrics;

  const cards = [
    { label: "Usuários ativos", value: m?.active_users ?? "—", icon: Users, color: "text-primary" },
    { label: "Sessões (hoje)", value: m?.sessions_today ?? "—", icon: Activity, color: "text-status-validated" },
    { label: "Erros recentes", value: m?.errors_recent ?? "—", icon: AlertTriangle, color: "text-destructive" },
  ];

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12">
        <motion.header
          className="mb-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-serif text-3xl md:text-4xl font-medium text-foreground">
            Painel Administrativo
          </h1>
          <p className="mt-2 text-muted-foreground">
            Métricas agregadas. Dados clínicos nunca são exibidos.
          </p>
        </motion.header>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {cards.map((card) => (
            <motion.div
              key={card.label}
              className="p-6 rounded-xl border border-border bg-card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center gap-3 mb-3">
                <card.icon className={`w-5 h-5 ${card.color}`} strokeWidth={1.5} />
                <span className="text-sm text-muted-foreground">{card.label}</span>
              </div>
              <p className="font-serif text-3xl font-medium text-foreground">
                {loading ? <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /> : card.value}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="p-6 rounded-xl border border-border bg-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            <h2 className="font-serif text-lg font-medium text-foreground">Fonte de dados</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {isCloudAuthenticated
              ? "Conectado ao Control Plane (cloud). Métricas globais e locais disponíveis."
              : "Modo offline. Apenas métricas locais do Clinical Plane."}
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminDashboard;
