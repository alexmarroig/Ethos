import { useEffect, useRef, useCallback } from "react";
import { Loader2, WifiOff, ShieldAlert, AlertTriangle, RefreshCw } from "lucide-react";
import { useAppStore, type ServiceStatus } from "@/stores/appStore";
import { CLINICAL_BASE_URL, CONTROL_BASE_URL, IS_DEV } from "@/config/runtime";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { isDemoModeEnabled } from "@/services/demoMode";

/* ------------------------------------------------------------------ */
/*  Image probe – bypasses CORS to check if server is reachable        */
/* ------------------------------------------------------------------ */

function probeWithImage(baseUrl: string, timeout = 8000): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => {
      img.onload = img.onerror = null;
      resolve(false);
    }, timeout);
    img.onload = () => { clearTimeout(timer); resolve(true); };
    img.onerror = () => { clearTimeout(timer); resolve(false); };
    img.src = `${baseUrl}/favicon.ico?_t=${Date.now()}`;
  });
}

/* ------------------------------------------------------------------ */
/*  Health-check with retry                                            */
/* ------------------------------------------------------------------ */

async function singleCheck(url: string, timeout: number): Promise<{ ok: boolean; error?: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timer);
    return { ok: res.ok || res.status === 401 || res.status === 404 };
  } catch (err) {
    clearTimeout(timer);
    return { ok: false, error: err };
  }
}

function classifyError(err: unknown, attempt: number): ServiceStatus {
  if (!navigator.onLine) return "offline";
  if (err instanceof DOMException && err.name === "AbortError") {
    return attempt === 1 ? "waking" : "error";
  }
  if (err instanceof TypeError) return "cors_blocked";
  return "error";
}

async function checkEndpoint(baseUrl: string): Promise<ServiceStatus> {
  const url = `${baseUrl}/health`;
  const start = performance.now();

  // Attempt 1
  const r1 = await singleCheck(url, 12_000);
  if (r1.ok) {
    if (IS_DEV) console.info(`[health] ${url} OK in ${Math.round(performance.now() - start)}ms`);
    return "online";
  }

  const status1 = classifyError(r1.error, 1);
  if (status1 === "offline") {
    if (IS_DEV) console.warn(`[health] ${url} → offline`, r1.error);
    return "offline";
  }
  if (status1 === "cors_blocked") {
    const reachable = await probeWithImage(baseUrl);
    if (IS_DEV) console.warn(`[health] ${url} → CORS, image probe: ${reachable ? "reachable" : "unreachable"}`);
    return reachable ? "cors_blocked" : "error";
  }

  // Backoff 1s
  await new Promise((r) => setTimeout(r, 1000));

  // Attempt 2
  const r2 = await singleCheck(url, 18_000);
  if (r2.ok) {
    if (IS_DEV) console.info(`[health] ${url} OK (retry) in ${Math.round(performance.now() - start)}ms`);
    return "online";
  }

  const status2 = classifyError(r2.error, 2);
  if (IS_DEV) console.warn(`[health] ${url} → ${status2} after retry`, r2.error);
  return status2;
}

/* ------------------------------------------------------------------ */
/*  Status → visual config                                             */
/* ------------------------------------------------------------------ */

interface StatusVisual {
  icon: React.ReactNode;
  label: string;
  className: string;
  showRetry: boolean;
}

function getVisual(status: ServiceStatus, service: string): StatusVisual | null {
  switch (status) {
    case "online":
      return null;
    case "checking":
      return {
        icon: <Loader2 className="w-4 h-4 shrink-0 animate-spin" />,
        label: `Verificando ${service}…`,
        className: "bg-muted text-muted-foreground border-b border-border",
        showRetry: false,
      };
    case "waking":
      return {
        icon: <Loader2 className="w-4 h-4 shrink-0 animate-spin" />,
        label: `${service} está inicializando — isso geralmente leva de 30 a 60 segundos. Conectaremos automaticamente.`,
        className: "bg-status-pending/10 text-status-pending border-b border-status-pending/20",
        showRetry: true,
      };
    case "cors_blocked":
      return {
        icon: <ShieldAlert className="w-4 h-4 shrink-0" />,
        label: `${service}: servidor online, mas CORS não configurado. Adicione o domínio de origem nas configurações do backend.`,
        className: "bg-destructive/10 text-destructive border-b border-destructive/20",
        showRetry: true,
      };
    case "error":
      return {
        icon: <AlertTriangle className="w-4 h-4 shrink-0" />,
        label: `${service} respondeu com erro. Verifique logs do backend.`,
        className: "bg-destructive/10 text-destructive border-b border-destructive/20",
        showRetry: true,
      };
    case "offline":
      return {
        icon: <WifiOff className="w-4 h-4 shrink-0" />,
        label: "Sem internet.",
        className: "bg-destructive/10 text-destructive border-b border-destructive/20",
        showRetry: true,
      };
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const ConnectivityBanner = () => {
  const clinicalStatus = useAppStore((s) => s.clinicalStatus);
  const controlStatus = useAppStore((s) => s.controlStatus);
  const setClinicalStatus = useAppStore((s) => s.setClinicalStatus);
  const setControlStatus = useAppStore((s) => s.setControlStatus);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const runCheck = useCallback(async () => {
    if (isDemoModeEnabled()) {
      setClinicalStatus("online");
      setControlStatus("online");
      return;
    }

    setClinicalStatus("checking");
    setControlStatus("checking");

    const [clinical, control] = await Promise.all([
      checkEndpoint(CLINICAL_BASE_URL),
      checkEndpoint(CONTROL_BASE_URL),
    ]);

    setClinicalStatus(clinical);
    setControlStatus(control);
  }, [setClinicalStatus, setControlStatus]);

  useEffect(() => {
    runCheck();
    intervalRef.current = setInterval(runCheck, 30_000);
    return () => clearInterval(intervalRef.current);
  }, [runCheck]);

  const clinicalVisual = getVisual(clinicalStatus, "Plano clínico");
  const controlVisual = getVisual(controlStatus, "Serviços cloud");

  if (!clinicalVisual && !controlVisual) return null;

  return (
    <div className="w-full space-y-0">
      {clinicalVisual && (
        <BannerRow visual={clinicalVisual} onRetry={runCheck} />
      )}
      {controlVisual && (
        <BannerRow visual={controlVisual} onRetry={runCheck} />
      )}
    </div>
  );
};

function BannerRow({ visual, onRetry }: { visual: StatusVisual; onRetry: () => void }) {
  return (
    <div className={cn("flex items-center gap-2 px-4 py-2 text-sm", visual.className)}>
      {visual.icon}
      <span className="flex-1">{visual.label}</span>
      {visual.showRetry && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs gap-1"
          onClick={onRetry}
        >
          <RefreshCw className="w-3 h-3" />
          Tentar novamente
        </Button>
      )}
    </div>
  );
}

export default ConnectivityBanner;
