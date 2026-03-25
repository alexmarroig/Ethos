import { useState } from "react";
import { motion } from "framer-motion";
import { Stethoscope, Play, Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/services/apiClient";
import { CLINICAL_BASE_URL } from "@/config/runtime";
import { useToast } from "@/hooks/use-toast";

const DiagnosticsPage = () => {
  const { toast } = useToast();
  const [openApiStatus, setOpenApiStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [contracts, setContracts] = useState<unknown[] | null>(null);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [jobId, setJobId] = useState("");
  const [jobResult, setJobResult] = useState<unknown | null>(null);
  const [jobLoading, setJobLoading] = useState(false);
  const [webhookLoading, setWebhookLoading] = useState(false);

  const checkOpenApi = async () => {
    setOpenApiStatus("loading");
    try {
      const res = await fetch(`${CLINICAL_BASE_URL}/openapi.yaml`, { signal: AbortSignal.timeout(5000) });
      setOpenApiStatus(res.ok ? "ok" : "error");
    } catch {
      setOpenApiStatus("error");
    }
  };

  const fetchContracts = async () => {
    setContractsLoading(true);
    const res = await api.get<unknown[]>("/contracts");
    setContractsLoading(false);
    if (res.success) {
      setContracts(res.data as unknown[]);
    } else {
      toast({ title: "Erro", description: res.error.message, variant: "destructive" });
    }
  };

  const fetchJob = async () => {
    if (!jobId.trim()) return;
    setJobLoading(true);
    const res = await api.get(`/jobs/${jobId.trim()}`);
    setJobLoading(false);
    if (res.success) {
      setJobResult(res.data);
    } else {
      toast({ title: "Erro", description: res.error.message, variant: "destructive" });
    }
  };

  const simulateWorkerKilled = async () => {
    setWebhookLoading(true);
    const res = await api.post("/webhooks/transcriber", { event: "WORKER_KILLED" });
    setWebhookLoading(false);
    toast({
      title: res.success ? "Enviado" : "Erro",
      description: res.success ? "Evento WORKER_KILLED enviado." : res.error.message,
      variant: res.success ? "default" : "destructive",
    });
  };

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12">
        <motion.header className="mb-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-serif text-3xl md:text-4xl font-medium text-foreground">
            Diagnóstico
          </h1>
          <p className="mt-2 text-muted-foreground">
            Validação de conectividade e operação do backend clínico.
          </p>
        </motion.header>

        <div className="space-y-6">
          {/* OpenAPI */}
          <motion.section className="p-6 rounded-xl border border-border bg-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-serif text-lg font-medium text-foreground">OpenAPI Spec</h2>
              <Button size="sm" onClick={checkOpenApi} disabled={openApiStatus === "loading"} className="gap-2">
                {openApiStatus === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Verificar
              </Button>
            </div>
            <p className="text-sm font-mono text-muted-foreground">{CLINICAL_BASE_URL}/openapi.yaml</p>
            {openApiStatus === "ok" && <div className="mt-2 flex items-center gap-2 text-status-validated text-sm"><CheckCircle2 className="w-4 h-4" /> Disponível</div>}
            {openApiStatus === "error" && <div className="mt-2 flex items-center gap-2 text-destructive text-sm"><XCircle className="w-4 h-4" /> Indisponível</div>}
          </motion.section>

          {/* Contracts */}
          <motion.section className="p-6 rounded-xl border border-border bg-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-serif text-lg font-medium text-foreground">Contratos</h2>
              <Button size="sm" onClick={fetchContracts} disabled={contractsLoading} className="gap-2">
                {contractsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Buscar
              </Button>
            </div>
            {contracts && (
              <pre className="mt-2 text-xs font-mono text-muted-foreground bg-muted/50 p-3 rounded-lg overflow-x-auto max-h-48">
                {JSON.stringify(contracts, null, 2)}
              </pre>
            )}
          </motion.section>

          {/* Job lookup */}
          <motion.section className="p-6 rounded-xl border border-border bg-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h2 className="font-serif text-lg font-medium text-foreground mb-3">Consultar Job</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
                placeholder="Job ID"
                className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm font-mono"
              />
              <Button size="sm" onClick={fetchJob} disabled={jobLoading || !jobId.trim()} className="gap-2">
                {jobLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Buscar
              </Button>
            </div>
            {jobResult && (
              <pre className="mt-3 text-xs font-mono text-muted-foreground bg-muted/50 p-3 rounded-lg overflow-x-auto max-h-48">
                {JSON.stringify(jobResult, null, 2)}
              </pre>
            )}
          </motion.section>

          {/* QA Simulator */}
          <motion.section className="p-6 rounded-xl border-2 border-destructive/20 bg-destructive/5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <h2 className="font-serif text-lg font-medium text-destructive">Simulador QA</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Simula evento WORKER_KILLED no webhook do transcriber para testar recuperação de estado.
            </p>
            <Button variant="destructive" size="sm" onClick={simulateWorkerKilled} disabled={webhookLoading} className="gap-2">
              {webhookLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
              Enviar WORKER_KILLED
            </Button>
          </motion.section>
        </div>
      </div>
    </div>
  );
};

export default DiagnosticsPage;
