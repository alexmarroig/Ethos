/**
 * Heurísticas leves para observabilidade assistida por IA.
 * A ideia é transformar sinais operacionais em recomendações práticas,
 * sem depender de modelos externos durante testes locais.
 */

export type PerformanceSample = { timestamp: string; latencyMs: number; errorRate: number; cpuPercent: number; memoryPercent: number };
export type ErrorLog = { timestamp: string; service: string; message: string; stack?: string };
export type ObservabilityMetric = "latency" | "error_rate" | "cpu" | "memory";
export type ObservabilitySeverity = "low" | "medium" | "high";

export type BottleneckAlert = {
  severity: ObservabilitySeverity;
  metric: ObservabilityMetric;
  message: string;
};

export type AnomalyThresholds = {
  zScoreByMetric?: Partial<Record<ObservabilityMetric, number>>;
  scoreThreshold?: number;
  weights?: Partial<Record<ObservabilityMetric, number>>;
};

export type AnomalousBehaviorAlert = {
  timestamp: string;
  metric: ObservabilityMetric;
  score: number;
  metricZScore: number;
  severity: ObservabilitySeverity;
  probableCause: string;
  suggestedAction: string;
};

export const detectBottlenecks = (samples: PerformanceSample[]): BottleneckAlert[] => {
  if (samples.length === 0) return [];
  const average = {
    latency: samples.reduce((acc, item) => acc + item.latencyMs, 0) / samples.length,
    errors: samples.reduce((acc, item) => acc + item.errorRate, 0) / samples.length,
    cpu: samples.reduce((acc, item) => acc + item.cpuPercent, 0) / samples.length,
    memory: samples.reduce((acc, item) => acc + item.memoryPercent, 0) / samples.length,
  };

  const alerts: BottleneckAlert[] = [];
  if (average.latency >= 450) alerts.push({ severity: "high", metric: "latency", message: "Latência média elevada. Avalie cache e redução de consultas síncronas." });
  if (average.errors >= 0.03) alerts.push({ severity: "high", metric: "error_rate", message: "Taxa de erro acima do esperado. Priorize análise de causa raiz." });
  if (average.cpu > 80) alerts.push({ severity: "medium", metric: "cpu", message: "CPU sustentada alta. Considere escalonamento horizontal." });
  if (average.memory > 85) alerts.push({ severity: "medium", metric: "memory", message: "Memória elevada. Verifique vazamentos e objetos long-lived." });
  return alerts;
};

export const predictFailureRisk = (samples: PerformanceSample[]) => {
  if (samples.length < 2) return { riskScore: 0, riskLevel: "low" as const, reason: "Dados insuficientes" };

  const latest = samples[samples.length - 1];
  const baseline = samples.slice(0, -1);
  const avgLatency = baseline.reduce((acc, item) => acc + item.latencyMs, 0) / baseline.length;
  const avgError = baseline.reduce((acc, item) => acc + item.errorRate, 0) / baseline.length;

  const latencyJump = avgLatency === 0 ? 0 : (latest.latencyMs - avgLatency) / avgLatency;
  const errorJump = avgError === 0 ? latest.errorRate : (latest.errorRate - avgError) / avgError;

  const riskScore = Math.max(0, Math.min(1, 0.4 * latencyJump + 0.6 * errorJump + (latest.cpuPercent > 85 ? 0.2 : 0)));
  if (riskScore >= 0.75) return { riskScore, riskLevel: "high" as const, reason: "Tendência de degradação crítica" };
  if (riskScore >= 0.4) return { riskScore, riskLevel: "medium" as const, reason: "Sinais de instabilidade detectados" };
  return { riskScore, riskLevel: "low" as const, reason: "Comportamento estável" };
};

export const detectAnomalousBehavior = (samples: PerformanceSample[], thresholds: AnomalyThresholds = {}): AnomalousBehaviorAlert[] => {
  if (samples.length < 5) return [];

  const metricDescriptors: Record<
    ObservabilityMetric,
    {
      label: string;
      getter: (sample: PerformanceSample) => number;
      probableCause: string;
      suggestedAction: string;
    }
  > = {
    latency: {
      label: "latência",
      getter: (sample) => sample.latencyMs,
      probableCause: "Pico anômalo de latência",
      suggestedAction: "Inspecionar consultas lentas, dependências externas e fila de processamento.",
    },
    error_rate: {
      label: "taxa de erro",
      getter: (sample) => sample.errorRate,
      probableCause: "Elevação anômala de erros",
      suggestedAction: "Correlacionar exceptions recentes, rollback de mudanças e saúde de dependências.",
    },
    cpu: {
      label: "CPU",
      getter: (sample) => sample.cpuPercent,
      probableCause: "Pressão anômala de CPU",
      suggestedAction: "Revisar hot paths, concorrência e necessidade de escalonamento.",
    },
    memory: {
      label: "memória",
      getter: (sample) => sample.memoryPercent,
      probableCause: "Pressão anômala de memória",
      suggestedAction: "Inspecionar retenção de objetos, cache e sinais de vazamento.",
    },
  };

  const defaultZScoreByMetric: Record<ObservabilityMetric, number> = {
    latency: 1.8,
    error_rate: 1.8,
    cpu: 2,
    memory: 2,
  };
  const zScoreByMetric = { ...defaultZScoreByMetric, ...(thresholds.zScoreByMetric ?? {}) };

  const defaultWeights: Record<ObservabilityMetric, number> = {
    latency: 0.35,
    error_rate: 0.35,
    cpu: 0.15,
    memory: 0.15,
  };
  const weights = { ...defaultWeights, ...(thresholds.weights ?? {}) };
  const scoreThreshold = thresholds.scoreThreshold ?? 0.9;
  const weightSum = Object.values(weights).reduce((acc, value) => acc + value, 0) || 1;

  const stats = (Object.keys(metricDescriptors) as ObservabilityMetric[]).reduce(
    (accumulator, metric) => {
      const values = samples.map((sample) => metricDescriptors[metric].getter(sample));
      const mean = values.reduce((acc, item) => acc + item, 0) / values.length;
      const variance = values.reduce((acc, item) => acc + (item - mean) ** 2, 0) / values.length;
      const stdDev = Math.sqrt(variance);
      return { ...accumulator, [metric]: { mean, stdDev } };
    },
    {} as Record<ObservabilityMetric, { mean: number; stdDev: number }>,
  );

  const anomalyAlerts: AnomalousBehaviorAlert[] = [];
  for (const sample of samples) {
    const zScoreByCurrentMetric = (Object.keys(metricDescriptors) as ObservabilityMetric[]).reduce(
      (accumulator, metric) => {
        const { mean, stdDev } = stats[metric];
        const value = metricDescriptors[metric].getter(sample);
        const normalized = stdDev > 0 ? Math.abs((value - mean) / stdDev) : 0;
        return { ...accumulator, [metric]: normalized };
      },
      {} as Record<ObservabilityMetric, number>,
    );

    const multivariateScore =
      (Object.keys(metricDescriptors) as ObservabilityMetric[]).reduce(
        (accumulator, metric) => accumulator + zScoreByCurrentMetric[metric] * weights[metric],
        0,
      ) / weightSum;

    const triggeredMetrics = (Object.keys(metricDescriptors) as ObservabilityMetric[]).filter(
      (metric) => zScoreByCurrentMetric[metric] >= zScoreByMetric[metric],
    );

    if (multivariateScore < scoreThreshold && triggeredMetrics.length === 0) continue;

    const metricToReport =
      triggeredMetrics.sort((metricA, metricB) => zScoreByCurrentMetric[metricB] - zScoreByCurrentMetric[metricA])[0] ??
      (Object.keys(metricDescriptors) as ObservabilityMetric[]).sort(
        (metricA, metricB) => zScoreByCurrentMetric[metricB] - zScoreByCurrentMetric[metricA],
      )[0];

    const severity: ObservabilitySeverity =
      multivariateScore >= scoreThreshold + 0.8 || zScoreByCurrentMetric[metricToReport] >= zScoreByMetric[metricToReport] + 1
        ? "high"
        : multivariateScore >= scoreThreshold + 0.3 || zScoreByCurrentMetric[metricToReport] >= zScoreByMetric[metricToReport] + 0.4
          ? "medium"
          : "low";

    const descriptor = metricDescriptors[metricToReport];
    anomalyAlerts.push({
      timestamp: sample.timestamp,
      metric: metricToReport,
      score: Number(multivariateScore.toFixed(3)),
      metricZScore: Number(zScoreByCurrentMetric[metricToReport].toFixed(3)),
      severity,
      probableCause: descriptor.probableCause,
      suggestedAction: `Métrica que disparou: ${descriptor.label}. ${descriptor.suggestedAction}`,
    });
  }

  return anomalyAlerts;
};

export const suggestRootCauseFromLogs = (logs: ErrorLog[]) => {
  const joined = logs.map((item) => `${item.message} ${item.stack ?? ""}`.toLowerCase()).join("\n");
  if (joined.includes("timeout") || joined.includes("etimedout")) return "Possível gargalo de rede/dependência externa. Ajustar timeout e circuit breaker.";
  if (joined.includes("out of memory") || joined.includes("heap")) return "Sinal de pressão de memória. Revisar alocação e retenção de objetos.";
  if (joined.includes("deadlock") || joined.includes("lock wait")) return "Possível contenção transacional. Avaliar estratégia de lock e granularidade.";
  return "Causa raiz não conclusiva. Correlacionar logs com métricas de latência/erro para maior precisão.";
};

export const generateUserSimulation = (users: number, sessionDurationMs: number) =>
  Array.from({ length: users }, (_, index) => ({
    userId: `virtual-user-${index + 1}`,
    actions: ["login", "create_session", "write_note", "export_report"],
    thinkTimeMs: Math.max(200, Math.floor(sessionDurationMs / 4)),
  }));
