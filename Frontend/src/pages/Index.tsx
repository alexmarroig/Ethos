import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import SplashScreen from "@/components/SplashScreen";
import LogoRevealSplash from "@/components/LogoRevealSplash";
import LoginPage from "@/pages/LoginPage";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { ENABLE_INTRO_SPLASH } from "@/config/runtime";
import { AppShell } from "@/pages/AppShell";
import { ProtectedPage } from "@/pages/ProtectedPage";
import { pageRedirects, pages, prefetchByRole, prefetchPage, type Page } from "@/pages/pageRegistry";

const {
  HomePage,
  SessionPage,
  AgendaPage,
  PatientsPage,
  PatientDetailPage,
  EthicsPage,
  ProntuarioPage,
  FormsPage,
  AnamnesisPage,
  ReportsPage,
  FinancePage,
  DocumentsPage,
  AccountPage,
  BackupPage,
  ContractsPage,
  PatientHomePage,
  PatientSessionsPage,
  PatientDiaryPage,
  PatientMessagesPage,
  PatientDocumentsPage,
  PatientPaymentsPage,
  PatientBookingPage,
  DreamDiaryPage,
  AvailabilitySettingsPage,
  AdminDashboard,
  AdminUsersPage,
  AdminTestLab,
  AdminTicketsPage,
  DiagnosticsPage,
  BioHubPage,
} = pages;

const Index = () => {
  const [showSplash, setShowSplash] = useState(() => ENABLE_INTRO_SPLASH);
  const [showLogoReveal, setShowLogoReveal] = useState(() => ENABLE_INTRO_SPLASH);
  const [currentPage, setCurrentPage] = useState<Page>("home");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const { user, isAuthenticated, isLoading, hasRole } = useAuth();
  const isMobile = useIsMobile();
  const visibleStartRef = useRef<number>(typeof performance !== "undefined" ? performance.now() : Date.now());
  const visibilityReportedRef = useRef(false);

  useEffect(() => {
    if (!ENABLE_INTRO_SPLASH || isAuthenticated) {
      setShowSplash(false);
      setShowLogoReveal(false);
      return;
    }

    if (!isLoading) {
      setShowSplash(false);
      setShowLogoReveal(false);
      return;
    }

    setShowSplash(true);
    setShowLogoReveal(true);
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    const loginOrAppVisible = !isLoading && (isAuthenticated || !isAuthenticated);
    if (!loginOrAppVisible || visibilityReportedRef.current) return;

    visibilityReportedRef.current = true;
    const elapsedMs = (typeof performance !== "undefined" ? performance.now() : Date.now()) - visibleStartRef.current;

    if (elapsedMs > 800) {
      console.warn(`[perf] time-to-login-visible acima da meta: ${Math.round(elapsedMs)}ms (alvo <= 800ms)`);
      return;
    }

    console.info(`[perf] time-to-login-visible: ${Math.round(elapsedMs)}ms`);
  }, [isLoading, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const importers = prefetchByRole[user.role as keyof typeof prefetchByRole] ?? [];
    for (const importer of importers) void importer();
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (isAuthenticated && user && user.role === "professional") {
      const isComplete = !!(user.crp && user.specialty && user.clinical_approach);
      if (!isComplete && currentPage !== "account") {
        setCurrentPage("account");
      }
    }
  }, [isAuthenticated, user, currentPage]);

  const handleSessionClick = useCallback((sessionId: string) => {
    setSelectedSessionId(sessionId);
    setCurrentPage("session");
  }, []);

  const handleBackFromSession = useCallback(() => {
    setSelectedSessionId(null);
    setCurrentPage("home");
  }, []);

  const handleOpenProntuario = useCallback((sessionId: string) => {
    setSelectedSessionId(sessionId);
    setCurrentPage("prontuario");
  }, []);

  const handleBackFromProntuario = useCallback(() => {
    setSelectedSessionId(null);
    setCurrentPage("home");
  }, []);

  const handleOpenPatient = useCallback((patientId: string) => {
    setSelectedPatientId(patientId);
    setCurrentPage("patient-detail");
  }, []);

  const handleBackFromPatient = useCallback(() => {
    setSelectedPatientId(null);
    setCurrentPage("patients");
  }, []);

  const handleNavigate = useCallback((page: string) => {
    const resolved = pageRedirects[page] ?? page;
    setCurrentPage(resolved as Page);
    setSelectedSessionId(null);
    if (resolved !== "patient-detail") {
      setSelectedPatientId(null);
    }
  }, []);

  const handlePrefetch = useCallback((page: string) => {
    prefetchPage(page);
  }, []);

  const renderPageContent = () => {
    switch (currentPage) {
      case "home":
        return <HomePage onSessionClick={handleSessionClick} onNavigate={handleNavigate} onPatientClick={handleOpenPatient} />;
      case "session":
        return <SessionPage sessionId={selectedSessionId!} onBack={handleBackFromSession} onOpenProntuario={handleOpenProntuario} />;
      case "prontuario":
        return <ProntuarioPage sessionId={selectedSessionId!} onBack={handleBackFromProntuario} />;
      case "agenda":
        return <AgendaPage onSessionClick={handleSessionClick} />;
      case "patients":
        return <PatientsPage onOpenPatient={handleOpenPatient} />;
      case "patient-detail":
        return <PatientDetailPage patientId={selectedPatientId!} onBack={handleBackFromPatient} onOpenSession={handleSessionClick} onOpenProntuario={handleOpenProntuario} />;
      case "ethics":
        return <EthicsPage />;
      case "forms":
        return <FormsPage />;
      case "anamnesis":
        return <AnamnesisPage />;
      case "reports":
        return <ReportsPage />;
      case "finance":
        return <FinancePage />;
      case "documents":
        return <DocumentsPage onNavigate={handleNavigate} />;
      case "contracts":
        return <ContractsPage />;
      case "account":
        return <AccountPage />;
      case "backup":
        return <BackupPage />;
      case "patient-home":
        return <PatientHomePage />;
      case "patient-sessions":
        return <PatientSessionsPage />;
      case "patient-diary":
        return <PatientDiaryPage />;
      case "patient-messages":
        return <PatientMessagesPage />;
      case "patient-documents":
        return <PatientDocumentsPage />;
      case "patient-payments":
        return <PatientPaymentsPage />;
      case "patient-booking":
        return <PatientBookingPage />;
      case "patient-dream-diary":
        return <DreamDiaryPage />;
      case "availability":
        return <AvailabilitySettingsPage />;
      case "admin-dashboard":
        return <AdminDashboard />;
      case "admin-users":
        return <AdminUsersPage />;
      case "admin-testlab":
        return <AdminTestLab />;
      case "diagnostics":
        return <DiagnosticsPage />;
      case "admin-tickets":
        return <AdminTicketsPage />;
      case "biohub":
        return <BioHubPage />;
      case "settings":
        return (
          <div className="content-container py-12">
            <h1 className="font-serif text-3xl font-medium text-foreground">Configurações</h1>
            <p className="mt-2 text-muted-foreground">Em breve.</p>
          </div>
        );
      default:
        return <HomePage onSessionClick={handleSessionClick} onNavigate={handleNavigate} onPatientClick={handleOpenPatient} />;
    }
  };

  return (
    <>
      <AnimatePresence>{showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}</AnimatePresence>
      <AnimatePresence>{!showSplash && showLogoReveal && <LogoRevealSplash onComplete={() => setShowLogoReveal(false)} />}</AnimatePresence>

      <AnimatePresence>
        {!isLoading && !isAuthenticated && (
          <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <LoginPage onLoginSuccess={() => undefined} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!isLoading && isAuthenticated && (
          <AppShell
            currentPage={currentPage}
            isMobile={isMobile}
            selectedSessionId={selectedSessionId}
            selectedPatientId={selectedPatientId}
            onNavigate={handleNavigate}
            onPrefetch={handlePrefetch}
          >
            <ProtectedPage page={currentPage} hasRole={hasRole} onNavigate={handleNavigate}>
              {renderPageContent()}
            </ProtectedPage>
          </AppShell>
        )}
      </AnimatePresence>
    </>
  );
};

export default Index;
