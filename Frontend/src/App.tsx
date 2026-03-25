import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AcceptInvitePage from "./pages/AcceptInvitePage";
import ContractPortalPage from "./pages/ContractPortalPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import { AuthProvider } from "./contexts/AuthContext";
import { EntitlementsProvider } from "./contexts/EntitlementsContext";
import ConnectivityBanner from "./components/ConnectivityBanner";
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
    <AuthProvider>
      <EntitlementsProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <JobRehydrator />
          <BrowserRouter>
            <ConnectivityBanner />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/accept-invite" element={<AcceptInvitePage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/portal/contract" element={<ContractPortalPage />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </EntitlementsProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
