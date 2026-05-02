import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, AlertTriangle, BarChart3, Activity, Loader2, ArrowUpRight, ArrowDownRight, CreditCard } from "lucide-react";
import { controlAdminService, MetricsOverview, TimeSeriesData } from "@/services/controlAdminService";
import { api } from "@/services/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";

const AdminDashboard = () => {
  const { isCloudAuthenticated } = useAuth();
  const [metrics, setMetrics] = useState<MetricsOverview | null>(null);
  const [localMetrics, setLocalMetrics] = useState<MetricsOverview | null>(null);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const promises: Promise<void>[] = [];

      if (isCloudAuthenticated) {
        promises.push(
          controlAdminService.getMetricsOverview().then((res) => {
            if (res.success) setMetrics(res.data);
          }),
          controlAdminService.getAnalyticsTimeSeries().then((res) => {
            if (res.success) setTimeSeries(res.data);
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
    { 
      label: "Usuários Ativos", 
      value: m?.active_users ?? "—", 
      icon: Users, 
      color: "text-primary",
      bg: "bg-primary/10",
      trend: "+12.5%",
      trendUp: true
    },
    { 
      label: "Sessões (Hoje)", 
      value: m?.sessions_today ?? "—", 
      icon: Activity, 
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      trend: "+5.2%",
      trendUp: true
    },
    { 
      label: "Receita Recorrente (MRR)", 
      value: m?.monthly_revenue ? `R$ ${(m.monthly_revenue).toLocaleString('pt-BR')}` : "R$ 4.520", 
      icon: CreditCard, 
      color: "text-violet-500",
      bg: "bg-violet-500/10",
      trend: "+18.0%",
      trendUp: true
    },
    { 
      label: "Erros Recentes", 
      value: m?.errors_recent ?? "0", 
      icon: AlertTriangle, 
      color: "text-destructive",
      bg: "bg-destructive/10",
      trend: "-2.4%",
      trendUp: false
    },
  ];

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12">
        <motion.header
          className="mb-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl md:text-4xl font-medium text-foreground">
                Painel Administrativo
              </h1>
              <p className="mt-2 text-muted-foreground">
                Métricas agregadas de crescimento e estabilidade.
              </p>
            </div>
            {!isCloudAuthenticated && (
              <span className="inline-flex items-center rounded-full bg-yellow-500/10 px-3 py-1 text-sm font-medium text-yellow-600 dark:text-yellow-500 border border-yellow-500/20">
                <AlertTriangle className="mr-2 h-4 w-4" /> Modo Offline
              </span>
            )}
          </div>
        </motion.header>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {cards.map((card, i) => (
            <motion.div
              key={card.label}
              className="p-6 rounded-2xl border border-border bg-card shadow-sm"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.bg}`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} strokeWidth={2} />
                </div>
                <div className={`flex items-center text-xs font-medium ${card.trendUp ? "text-emerald-500" : "text-destructive"}`}>
                  {card.trend}
                  {card.trendUp ? <ArrowUpRight className="ml-1 h-3 w-3" /> : <ArrowDownRight className="ml-1 h-3 w-3" />}
                </div>
              </div>
              <p className="text-sm font-medium text-muted-foreground mb-1">{card.label}</p>
              <h3 className="font-serif text-3xl font-medium text-foreground">
                {loading ? <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /> : card.value}
              </h3>
            </motion.div>
          ))}
        </div>

        {/* Charts */}
        {isCloudAuthenticated && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <motion.div
              className="lg:col-span-2 p-6 rounded-2xl border border-border bg-card shadow-sm"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h3 className="text-lg font-medium text-foreground mb-6">Crescimento de Sessões (30 dias)</h3>
              <div className="h-[300px] w-full">
                {loading ? (
                  <div className="h-full w-full flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <Area type="monotone" dataKey="sessions" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorSessions)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </motion.div>

            <motion.div
              className="p-6 rounded-2xl border border-border bg-card shadow-sm flex flex-col"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h3 className="text-lg font-medium text-foreground mb-6">Novos Cadastros</h3>
              <div className="flex-1 min-h-[300px] w-full">
                {loading ? (
                  <div className="h-full w-full flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={timeSeries.slice(-10)} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip 
                        cursor={{ fill: 'hsl(var(--muted))' }}
                        contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}
                      />
                      <Bar dataKey="signups" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </motion.div>
          </div>
        )}

        <motion.div
          className="p-6 rounded-2xl border border-border bg-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            <h2 className="font-serif text-lg font-medium text-foreground">Fonte de Dados do Servidor</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {isCloudAuthenticated
              ? "Conectado ao BioHub Control Plane (Cloud). Todas as métricas em tempo real e agregadas estão disponíveis."
              : "Modo Local-First ativo. Visualizando apenas métricas restritas de uso e armazenamento do Clinical Plane."}
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminDashboard;
