import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AcceptInvitePage from "./pages/AcceptInvitePage";
import ContractPortalPage from "./pages/ContractPortalPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import { AuthProvider } from "./contexts/AuthContext";
import { EntitlementsProvider } from "./contexts/EntitlementsContext";
import { rehydratePendingJobs } from "./stores/appStore";

const queryClient = new QueryClient();

const JobRehydrator = () => {
  useEffect(() => {
    rehydratePendingJobs();
  }, []);
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AuthProvider>
        <EntitlementsProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <JobRehydrator />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Navigate to="/" replace />} />
                <Route path="/register" element={<Navigate to="/" replace />} />
                <Route path="/accept-invite" element={<AcceptInvitePage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/portal/contract" element={<ContractPortalPage />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </EntitlementsProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
