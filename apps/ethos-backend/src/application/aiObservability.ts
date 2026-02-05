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
