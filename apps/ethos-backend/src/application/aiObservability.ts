/**
 * Heurísticas leves para observabilidade assistida por IA.
 * A ideia é transformar sinais operacionais em recomendações práticas,
 * sem depender de modelos externos durante testes locais.
 */

export type PerformanceSample = { timestamp: string; latencyMs: number; errorRate: number; cpuPercent: number; memoryPercent: number };
export type ErrorLog = { timestamp: string; service: string; message: string; stack?: string };

export type BottleneckAlert = {
  severity: "low" | "medium" | "high";
  metric: "latency" | "error_rate" | "cpu" | "memory";
  message: string;
};

type RiskMetric = "latency" | "errorRate" | "cpu" | "memory";

export type PredictFailureRiskConfig = {
  windowSize: number;
  weights: Record<RiskMetric, number>;
  levelWeight: number;
  trendWeight: number;
  highRiskThreshold: number;
  mediumRiskThreshold: number;
  criticalThresholds: Record<RiskMetric, number>;
  trendSensitivity: Record<RiskMetric, number>;
  contributorThreshold: number;
};

export const defaultPredictFailureRiskConfig: PredictFailureRiskConfig = {
  windowSize: 6,
  weights: {
    latency: 0.35,
    errorRate: 0.4,
    cpu: 0.15,
    memory: 0.1,
  },
  levelWeight: 0.6,
  trendWeight: 0.4,
  highRiskThreshold: 0.75,
  mediumRiskThreshold: 0.45,
  criticalThresholds: {
    latency: 450,
    errorRate: 0.03,
    cpu: 85,
    memory: 90,
  },
  trendSensitivity: {
    latency: 35,
    errorRate: 0.003,
    cpu: 4,
    memory: 3,
  },
  contributorThreshold: 0.12,
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

const clamp = (value: number) => Math.max(0, Math.min(1, value));

const linearSlope = (values: number[]) => {
  if (values.length < 2) return 0;
  const count = values.length;
  const xMean = (count - 1) / 2;
  const yMean = values.reduce((acc, value) => acc + value, 0) / count;
  const numerator = values.reduce((acc, value, index) => acc + (index - xMean) * (value - yMean), 0);
  const denominator = values.reduce((acc, _value, index) => acc + (index - xMean) ** 2, 0);
  return denominator === 0 ? 0 : numerator / denominator;
};

const metricAccessors: Record<RiskMetric, (sample: PerformanceSample) => number> = {
  latency: (sample) => sample.latencyMs,
  errorRate: (sample) => sample.errorRate,
  cpu: (sample) => sample.cpuPercent,
  memory: (sample) => sample.memoryPercent,
};

const metricLabels: Record<RiskMetric, string> = {
  latency: "latência",
  errorRate: "taxa de erro",
  cpu: "CPU",
  memory: "memória",
};

export const predictFailureRisk = (samples: PerformanceSample[], config: Partial<PredictFailureRiskConfig> = {}) => {
  const mergedConfig: PredictFailureRiskConfig = {
    ...defaultPredictFailureRiskConfig,
    ...config,
    weights: { ...defaultPredictFailureRiskConfig.weights, ...config.weights },
    criticalThresholds: { ...defaultPredictFailureRiskConfig.criticalThresholds, ...config.criticalThresholds },
    trendSensitivity: { ...defaultPredictFailureRiskConfig.trendSensitivity, ...config.trendSensitivity },
  };

  if (samples.length < 2) return { riskScore: 0, riskLevel: "low" as const, reason: "Dados insuficientes" };

  const window = samples.slice(Math.max(0, samples.length - mergedConfig.windowSize));
  const contributors = (Object.keys(metricAccessors) as RiskMetric[]).map((metric) => {
    const values = window.map((sample) => metricAccessors[metric](sample));
    const latestValue = values[values.length - 1] ?? 0;
    const slope = linearSlope(values);
    const levelSignal = clamp(latestValue / mergedConfig.criticalThresholds[metric]);
    const trendSignal = clamp(slope / mergedConfig.trendSensitivity[metric]);
    const weightedContribution = mergedConfig.weights[metric] * (mergedConfig.levelWeight * levelSignal + mergedConfig.trendWeight * trendSignal);

    return {
      metric,
      latestValue,
      slope,
      weightedContribution,
    };
  });

  const riskScore = clamp(contributors.reduce((acc, contributor) => acc + contributor.weightedContribution, 0));
  const primaryContributors = contributors
    .filter((contributor) => contributor.weightedContribution >= mergedConfig.contributorThreshold)
    .sort((left, right) => right.weightedContribution - left.weightedContribution);

  const reason =
    primaryContributors.length === 0
      ? "Comportamento estável"
      : primaryContributors
          .map(
            (contributor) =>
              `${metricLabels[contributor.metric]} contribuiu ${Math.round(contributor.weightedContribution * 100)}% (valor ${contributor.latestValue.toFixed(3)}, slope ${contributor.slope.toFixed(3)})`,
          )
          .join("; ");

  if (riskScore >= mergedConfig.highRiskThreshold) return { riskScore, riskLevel: "high" as const, reason };
  if (riskScore >= mergedConfig.mediumRiskThreshold) return { riskScore, riskLevel: "medium" as const, reason };
  return { riskScore, riskLevel: "low" as const, reason };
};

export const detectAnomalousBehavior = (samples: PerformanceSample[]) => {
  if (samples.length < 5) return [];
  const latencyValues = samples.map((sample) => sample.latencyMs);
  const mean = latencyValues.reduce((acc, item) => acc + item, 0) / latencyValues.length;
  const variance = latencyValues.reduce((acc, item) => acc + (item - mean) ** 2, 0) / latencyValues.length;
  const stdDev = Math.sqrt(variance);

  return samples
    .filter((sample) => stdDev > 0 && Math.abs(sample.latencyMs - mean) > 1.8 * stdDev)
    .map((sample) => ({
      timestamp: sample.timestamp,
      probableCause: "Pico anômalo de latência",
      suggestedAction: "Inspecionar consultas lentas, dependências externas e fila de processamento.",
    }));
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
