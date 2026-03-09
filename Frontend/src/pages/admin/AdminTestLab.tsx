import { useState } from "react";
import { motion } from "framer-motion";
import { Play, Loader2, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CLINICAL_BASE_URL, CONTROL_BASE_URL } from "@/config/runtime";
import { api } from "@/services/apiClient";
import { controlApi } from "@/services/controlClient";
import { cn } from "@/lib/utils";

interface TestResult {
  feature: string;
  endpoint: string;
  method: string;
  plane: "clinical" | "control";
  status: "ok" | "error" | "skip";
  latency: number;
  requestId: string;
  message: string;
}

const clinicalTests = [
  { feature: "Pacientes", endpoint: "/patients", method: "GET" },
  { feature: "Sessões", endpoint: "/sessions", method: "GET" },
  { feature: "Escalas", endpoint: "/scales", method: "GET" },
  { feature: "Formulários", endpoint: "/forms", method: "GET" },
  { feature: "Anamnese", endpoint: "/anamnesis", method: "GET" },
  { feature: "Financeiro", endpoint: "/financial/entries", method: "GET" },
  { feature: "Relatórios", endpoint: "/reports", method: "GET" },
];

const controlTests = [
  { feature: "Me (cloud)", endpoint: "/me", method: "GET" },
  { feature: "Entitlements", endpoint: "/entitlements", method: "GET" },
  { feature: "Subscription", endpoint: "/billing/subscription", method: "GET" },
  { feature: "Admin Users", endpoint: "/admin/users", method: "GET" },
  { feature: "Metrics Overview", endpoint: "/admin/metrics/overview", method: "GET" },
  { feature: "Audit (cloud)", endpoint: "/admin/audit", method: "GET" },
];

const destructiveTests = [
  { feature: "Export PDF", endpoint: "/export/pdf", method: "POST" },
  { feature: "Export DOCX", endpoint: "/export/docx", method: "POST" },
  { feature: "Backup", endpoint: "/backup", method: "POST" },
  { feature: "Restore", endpoint: "/restore", method: "POST" },
  { feature: "Purge", endpoint: "/purge", method: "POST" },
];

async function runEndpoint(
  test: { feature: string; endpoint: string; method: string },
  plane: "clinical" | "control"
): Promise<TestResult> {
  const client = plane === "clinical" ? api : controlApi;
  const start = performance.now();
  try {
    const res = await client.get(test.endpoint, { timeout: 5000 });
    const latency = Math.round(performance.now() - start);
    return {
      ...test,
      plane,
      status: res.success ? "ok" : "error",
      latency,
      requestId: res.request_id,
      message: res.success ? "OK" : res.error.message,
    };
  } catch {
    return {
      ...test,
      plane,
      status: "error",
      latency: Math.round(performance.now() - start),
      requestId: "local",
      message: "Falha de conexão",
    };
  }
}

const AdminTestLab = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);
  const [showDestructive, setShowDestructive] = useState(false);

  const runTests = async () => {
    setRunning(true);
    setResults([]);
    const newResults: TestResult[] = [];

    // Clinical tests
    for (const test of clinicalTests) {
      const r = await runEndpoint(test, "clinical");
      newResults.push(r);
      setResults([...newResults]);
    }

    // Control tests
    for (const test of controlTests) {
      const r = await runEndpoint(test, "control");
      newResults.push(r);
      setResults([...newResults]);
    }

    setRunning(false);
  };

  const statusIcon = (s: TestResult["status"]) => {
    switch (s) {
      case "ok": return <CheckCircle2 className="w-4 h-4 text-status-validated" />;
      case "error": return <XCircle className="w-4 h-4 text-destructive" />;
      case "skip": return <MinusCircle className="w-4 h-4 text-status-pending" />;
    }
  };

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12">
        <motion.header
          className="mb-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-serif text-3xl md:text-4xl font-medium text-foreground">
            Test Lab
          </h1>
          <p className="mt-2 text-muted-foreground">
            Teste de conectividade com Clinical e Control Plane.
          </p>
        </motion.header>

        {/* Base URLs */}
        <motion.div
          className="mb-6 p-4 rounded-xl bg-muted/50 border border-border space-y-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
              Clinical Base URL
            </p>
            <p className="text-sm font-mono text-foreground break-all">{CLINICAL_BASE_URL}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
              Control Base URL
            </p>
            <p className="text-sm font-mono text-foreground break-all">{CONTROL_BASE_URL}</p>
          </div>
        </motion.div>

        {/* Run button */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          <Button onClick={runTests} disabled={running} className="gap-2">
            {running ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Testando...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" strokeWidth={1.5} />
                Rodar testes
              </>
            )}
          </Button>
        </motion.div>

        {/* Results table */}
        {results.length > 0 && (
          <motion.div
            className="rounded-xl border border-border overflow-hidden bg-card mb-8"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Plane</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Feature</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Endpoint</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Latência</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">request_id</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Mensagem</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i} className={cn("border-b border-border last:border-0", r.status === "error" && "bg-destructive/5")}>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full font-medium",
                          r.plane === "clinical" ? "bg-primary/10 text-primary" : "bg-blue-500/10 text-blue-600"
                        )}>
                          {r.plane === "clinical" ? "Clinical" : "Control"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">{r.feature}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.endpoint}</td>
                      <td className="px-4 py-3">{statusIcon(r.status)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.latency}ms</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground truncate max-w-[100px]">{r.requestId}</td>
                      <td className="px-4 py-3 text-muted-foreground truncate max-w-[200px]">{r.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Destructive tests section */}
        <motion.div
          className="p-6 rounded-xl border-2 border-destructive/20 bg-destructive/5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-lg font-medium text-destructive">
              Testes destrutivos
            </h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showDestructive}
                onChange={(e) => setShowDestructive(e.target.checked)}
                className="w-4 h-4 rounded border-border"
              />
              <span className="text-sm text-muted-foreground">Habilitar</span>
            </label>
          </div>

          {showDestructive ? (
            <div className="space-y-2">
              {destructiveTests.map((t) => (
                <div key={t.endpoint} className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
                  <div>
                    <span className="font-medium text-foreground">{t.feature}</span>
                    <span className="ml-2 font-mono text-xs text-muted-foreground">{t.endpoint}</span>
                  </div>
                  <Button variant="destructive" size="sm" disabled>
                    Executar
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Desligado por segurança. Habilite acima para acessar.
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default AdminTestLab;
