import { Suspense, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import SplashScreen from "@/components/SplashScreen";
import LogoRevealSplash from "@/components/LogoRevealSplash";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import RoleGate from "@/components/RoleGate";
import LoginPage from "@/pages/LoginPage";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { lazyRetry } from "@/lib/lazyRetry";
import { ENABLE_INTRO_SPLASH } from "@/config/runtime";

const importHomePage = () => import("@/pages/HomePage");
const importSessionPage = () => import("@/pages/SessionPage");
const importAgendaPage = () => import("@/pages/AgendaPage");
const importPatientsPage = () => import("@/pages/PatientsPage");
const importPatientDetailPage = () => import("@/pages/PatientDetailPage");
const importEthicsPage = () => import("@/pages/EthicsPage");
const importProntuarioPage = () => import("@/pages/ProntuarioPage");
const importFormsPage = () => import("@/pages/FormsPage");
const importAnamnesisPage = () => import("@/pages/AnamnesisPage");
const importReportsPage = () => import("@/pages/ReportsPage");
const importFinancePage = () => import("@/pages/FinancePage");
const importDocumentsPage = () => import("@/pages/DocumentsPage");
const importAccountPage = () => import("@/pages/AccountPage");
const importBackupPage = () => import("@/pages/BackupPage");
const importContractsPage = () => import("@/pages/ContractsPage");
const importPatientHomePage = () => import("@/pages/patient/PatientHomePage");
const importPatientSessionsPage = () => import("@/pages/patient/PatientSessionsPage");
const importPatientDiaryPage = () => import("@/pages/patient/PatientDiaryPage");
const importPatientMessagesPage = () => import("@/pages/patient/PatientMessagesPage");
const importPatientDocumentsPage = () => import("@/pages/patient/PatientDocumentsPage");
const importPatientPaymentsPage = () => import("@/pages/patient/PatientPaymentsPage");
const importPatientBookingPage = () => import("@/pages/patient/PatientBookingPage");
const importDreamDiaryPage = () => import("@/pages/patient/DreamDiaryPage");
const importAvailabilitySettingsPage = () => import("@/pages/AvailabilitySettingsPage");
const importAdminDashboard = () => import("@/pages/admin/AdminDashboard");
const importAdminUsersPage = () => import("@/pages/admin/AdminUsersPage");
const importAdminTestLab = () => import("@/pages/admin/AdminTestLab");
const importAdminTicketsPage = () => import("@/pages/admin/AdminTicketsPage");
const importDiagnosticsPage = () => import("@/pages/DiagnosticsPage");

const HomePage = lazyRetry(importHomePage);
const SessionPage = lazyRetry(importSessionPage);
const AgendaPage = lazyRetry(importAgendaPage);
const PatientsPage = lazyRetry(importPatientsPage);
const PatientDetailPage = lazyRetry(importPatientDetailPage);
const EthicsPage = lazyRetry(importEthicsPage);
const ProntuarioPage = lazyRetry(importProntuarioPage);
const FormsPage = lazyRetry(importFormsPage);
const AnamnesisPage = lazyRetry(importAnamnesisPage);
const ReportsPage = lazyRetry(importReportsPage);
const FinancePage = lazyRetry(importFinancePage);
const DocumentsPage = lazyRetry(importDocumentsPage);
const AccountPage = lazyRetry(importAccountPage);
const BackupPage = lazyRetry(importBackupPage);
const ContractsPage = lazyRetry(importContractsPage);
const PatientHomePage = lazyRetry(importPatientHomePage);
const PatientSessionsPage = lazyRetry(importPatientSessionsPage);
const PatientDiaryPage = lazyRetry(importPatientDiaryPage);
const PatientMessagesPage = lazyRetry(importPatientMessagesPage);
const PatientDocumentsPage = lazyRetry(importPatientDocumentsPage);
const PatientPaymentsPage = lazyRetry(importPatientPaymentsPage);
const PatientBookingPage = lazyRetry(importPatientBookingPage);
const DreamDiaryPage = lazyRetry(importDreamDiaryPage);
const AvailabilitySettingsPage = lazyRetry(importAvailabilitySettingsPage);
const AdminDashboard = lazyRetry(importAdminDashboard);
const AdminUsersPage = lazyRetry(importAdminUsersPage);
const AdminTestLab = lazyRetry(importAdminTestLab);
const AdminTicketsPage = lazyRetry(importAdminTicketsPage);
const DiagnosticsPage = lazyRetry(importDiagnosticsPage);

type Page =
  | "home" | "agenda" | "patients" | "patient-detail" | "ethics" | "settings" | "session" | "prontuario"
  | "forms" | "anamnesis" | "reports" | "finance" | "documents" | "account" | "backup"
  | "contracts"
  | "patient-home" | "patient-sessions" | "patient-diary" | "patient-messages"
  | "patient-documents" | "patient-payments" | "patient-booking" | "patient-dream-diary"
  | "availability"
  | "admin-dashboard" | "admin-users" | "admin-testlab" | "admin-tickets"
  | "diagnostics";

function PageFallback() {
  return (
    <div className="content-container py-12 flex items-center gap-3">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
      <p className="text-sm text-muted-foreground">Carregando tela...</p>
    </div>
  );
}

const prefetchByRole: Record<"professional" | "patient" | "admin", Array<() => Promise<unknown>>> = {
  professional: [importHomePage, importAgendaPage, importPatientsPage],
  patient: [importPatientHomePage, importPatientSessionsPage, importPatientDiaryPage],
  admin: [importAdminDashboard, importAdminUsersPage, importAdminTicketsPage],
};

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

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  const handleLogoRevealComplete = () => {
    setShowLogoReveal(false);
  };

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
    if (isAuthenticated && user && user.role === "professional") {
      const isComplete = !!(user.crp && user.specialty && user.clinical_approach);
      if (!isComplete && currentPage !== "account") {
        setCurrentPage("account");
      }
    }
  }, [isAuthenticated, user, currentPage]);

  const handleSessionClick = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setCurrentPage("session");
  };

  const handleBackFromSession = () => {
    setSelectedSessionId(null);
    setCurrentPage("home");
  };

  const handleOpenProntuario = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setCurrentPage("prontuario");
  };

  const handleBackFromProntuario = () => {
    setSelectedSessionId(null);
    setCurrentPage("home");
  };

  const handleOpenPatient = (patientId: string) => {
    setSelectedPatientId(patientId);
    setCurrentPage("patient-detail");
  };

  const handleBackFromPatient = () => {
    setSelectedPatientId(null);
    setCurrentPage("patients");
  };

  const handleNavigate = (page: string) => {
    const redirects: Record<string, string> = {
      anamnesis: "forms",
      reports: "documents",
      contracts: "documents",
      "patient-dream-diary": "patient-diary",
    };
    const resolved = redirects[page] ?? page;
    setCurrentPage(resolved as Page);
    setSelectedSessionId(null);
    if (resolved !== "patient-detail") {
      setSelectedPatientId(null);
    }
  };

  const renderPage = () => {
    const professionalPages = [
      "home",
      "agenda",
      "patients",
      "patient-detail",
      "forms",
      "anamnesis",
      "finance",
      "reports",
      "documents",
      "contracts",
      "backup",
      "ethics",
      "session",
      "prontuario",
      "account",
      "settings",
    ];

    if (professionalPages.includes(currentPage)) {
      return (
        <RoleGate allowed={["professional", "admin"]} fallback={<FallbackRedirect hasRole={hasRole} onNavigate={handleNavigate} />}>
          {renderPageContent()}
        </RoleGate>
      );
    }

    if (currentPage.startsWith("patient-")) {
      return (
        <RoleGate allowed={["patient"]} fallback={<FallbackRedirect hasRole={hasRole} onNavigate={handleNavigate} />}>
          {renderPageContent()}
        </RoleGate>
      );
    }

    if (currentPage.startsWith("admin-")) {
      return (
        <RoleGate allowed={["admin"]} fallback={<FallbackRedirect hasRole={hasRole} onNavigate={handleNavigate} />}>
          {renderPageContent()}
        </RoleGate>
      );
    }

    if (currentPage === "diagnostics") {
      return (
        <RoleGate allowed={["admin"]} fallback={<FallbackRedirect hasRole={hasRole} onNavigate={handleNavigate} />}>
          {renderPageContent()}
        </RoleGate>
      );
    }

    return renderPageContent();
  };

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
      <AnimatePresence>{showSplash && <SplashScreen onComplete={handleSplashComplete} />}</AnimatePresence>
      <AnimatePresence>{!showSplash && showLogoReveal && <LogoRevealSplash onComplete={handleLogoRevealComplete} />}</AnimatePresence>

      <AnimatePresence>
        {!isLoading && !isAuthenticated && (
          <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <LoginPage onLoginSuccess={() => undefined} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!isLoading && isAuthenticated && (
          <motion.div className="min-h-screen bg-background" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}>
            <Sidebar currentPage={currentPage} onNavigate={handleNavigate} />
            <main className={cn("pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0", !isMobile && "md:pl-64")}>
              <AnimatePresence mode="wait">
                <motion.div key={currentPage + (selectedSessionId?.toString() || "") + (selectedPatientId?.toString() || "")} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}>
                  <Suspense fallback={<PageFallback />}>{renderPage()}</Suspense>
                </motion.div>
              </AnimatePresence>
            </main>
            {isMobile && <BottomNav currentPage={currentPage} onNavigate={handleNavigate} />}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

function FallbackRedirect({ hasRole, onNavigate }: { hasRole: (...r: string[]) => boolean; onNavigate: (p: string) => void }) {
  const defaultPage = hasRole("patient") ? "patient-home" : hasRole("admin") ? "admin-dashboard" : "home";
  useEffect(() => {
    onNavigate(defaultPage);
  }, [defaultPage, onNavigate]);

  return (
    <div className="content-container py-12 text-center">
      <p className="text-muted-foreground">Acesso não permitido.</p>
      <button onClick={() => onNavigate(defaultPage)} className="mt-4 text-primary text-sm hover:underline">
        Ir para página inicial
      </button>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export default Index;
