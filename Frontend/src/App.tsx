import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AcceptInvitePage from "./pages/AcceptInvitePage";
import ContractPortalPage from "./pages/ContractPortalPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import { AuthProvider } from "./contexts/AuthContext";
import { EntitlementsProvider } from "./contexts/EntitlementsContext";
import { OnboardingProvider } from "./contexts/OnboardingContext";
import { rehydratePendingJobs } from "./stores/appStore";
import { queryClient } from "./lib/queryClient";
import { CLINICAL_BASE_URL } from "./config/runtime";
import { primeReadiness, resetReadiness } from "./services/apiClient";

const KEEP_ALIVE_MS = 4 * 60 * 1000;       // ping a cada 4 min — Render dorme após ~15 min
const SLOW_BANNER_AFTER_MS = 2_000;
const REWAKE_HIDDEN_THRESHOLD_MS = 8 * 60 * 1000; // re-prime gate se tab ficou escondida >8 min

const WakingBanner = ({ seconds }: { seconds: number }) => (
  <div className="fixed top-3 left-1/2 z-[100] -translate-x-1/2 rounded-full border bg-background/95 px-4 py-2 text-sm shadow-lg backdrop-blur">
    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-500 mr-2 align-middle" />
    Aguardando servidor{seconds > 0 ? ` · ${seconds}s` : ""}… (pode levar até 1 min na primeira vez)
  </div>
);

const JobRehydrator = () => {
  const [waking, setWaking] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    rehydratePendingJobs();

    const startWake = () => {
      const readiness = primeReadiness(CLINICAL_BASE_URL, 60_000);
      const slowTimer = setTimeout(() => setWaking(true), SLOW_BANNER_AFTER_MS);
      readiness.finally(() => {
        clearTimeout(slowTimer);
        setWaking(false);
        setElapsed(0);
      });
    };

    startWake();

    // Contador de segundos visível no banner
    const ticker = setInterval(() => {
      setElapsed((s) => s + 1);
    }, 1_000);

    // Keep-alive periódico
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        void fetch(`${CLINICAL_BASE_URL}/health`, { method: "GET" }).catch(() => {});
      }
    }, KEEP_ALIVE_MS);

    // Re-prime gate quando tab volta após longa ausência
    let hiddenAt = 0;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
      } else if (hiddenAt > 0 && Date.now() - hiddenAt > REWAKE_HIDDEN_THRESHOLD_MS) {
        hiddenAt = 0;
        resetReadiness();
        startWake();
        void fetch(`${CLINICAL_BASE_URL}/health`, { method: "GET" }).catch(() => {});
      } else {
        hiddenAt = 0;
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(ticker);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return waking ? <WakingBanner seconds={elapsed} /> : null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AuthProvider>
        <EntitlementsProvider>
          <OnboardingProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <JobRehydrator />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Index />} />
                <Route path="/register" element={<Index />} />
                <Route path="/accept-invite" element={<AcceptInvitePage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/portal/contract" element={<ContractPortalPage />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
          </OnboardingProvider>
        </EntitlementsProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
