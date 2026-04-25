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
import { primeReadiness } from "./services/apiClient";

const KEEP_ALIVE_MS = 10 * 60 * 1000;
const SLOW_BANNER_AFTER_MS = 2_000;

const WakingBanner = () => (
  <div className="fixed top-3 left-1/2 z-[100] -translate-x-1/2 rounded-full border bg-background/95 px-4 py-2 text-sm shadow-lg backdrop-blur">
    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-500 mr-2 align-middle" />
    Aguardando servidor (pode levar até 1 minuto na primeira requisição)…
  </div>
);

const JobRehydrator = () => {
  const [waking, setWaking] = useState(false);
  useEffect(() => {
    rehydratePendingJobs();
    const readiness = primeReadiness(CLINICAL_BASE_URL, 60_000);
    const slowTimer = setTimeout(() => setWaking(true), SLOW_BANNER_AFTER_MS);
    readiness.finally(() => {
      clearTimeout(slowTimer);
      setWaking(false);
    });

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        void fetch(`${CLINICAL_BASE_URL}/health`, { method: "GET" }).catch(() => {});
      }
    }, KEEP_ALIVE_MS);

    return () => {
      clearTimeout(slowTimer);
      clearInterval(interval);
    };
  }, []);
  return waking ? <WakingBanner /> : null;
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
