import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import CookieConsent from "@/components/CookieConsent";
import RouteTracker from "@/components/RouteTracker";
import ArticlePage from "./pages/ArticlePage.tsx";
import AdsLandingPage from "./pages/AdsLandingPage.tsx";
import BlogPage from "./pages/BlogPage.tsx";
import CommercialPage from "./pages/CommercialPage.tsx";
import ContactPage from "./pages/ContactPage.tsx";
import Index from "./pages/Index.tsx";
import LegalPage from "./pages/LegalPage.tsx";
import Login from "./pages/Login.tsx";
import NotFound from "./pages/NotFound.tsx";
import ThankYouPage from "./pages/ThankYouPage.tsx";

const queryClient = new QueryClient();

export const AppProviders = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      {children}
    </TooltipProvider>
  </QueryClientProvider>
);

export const AppRoutes = () => (
  <>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route path="/blog" element={<BlogPage />} />
      <Route path="/blog/:slug" element={<ArticlePage />} />
      <Route path="/psicologos" element={<AdsLandingPage />} />
      <Route path="/privacidade" element={<LegalPage type="privacy" />} />
      <Route path="/termos" element={<LegalPage type="terms" />} />
      <Route path="/cookies" element={<LegalPage type="cookies" />} />
      <Route path="/contato" element={<ContactPage />} />
      <Route path="/obrigado" element={<ThankYouPage />} />
      <Route path="/:slug" element={<CommercialPage />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
    <RouteTracker />
    <CookieConsent />
  </>
);

const App = () => (
  <AppProviders>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </AppProviders>
);

export default App;
