import { Suspense, useEffect, useState, lazy } from "react";
import { AnimatePresence, motion } from "framer-motion";
import SplashScreen from "@/components/SplashScreen";
import LogoRevealSplash from "@/components/LogoRevealSplash";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import RoleGate from "@/components/RoleGate";
import HomePage from "@/pages/HomePage";
import SessionPage from "@/pages/SessionPage";
import AgendaPage from "@/pages/AgendaPage";
import PatientsPage from "@/pages/PatientsPage";
import PatientDetailPage from "@/pages/PatientDetailPage";
import EthicsPage from "@/pages/EthicsPage";
import LoginPage from "@/pages/LoginPage";
import ProntuarioPage from "@/pages/ProntuarioPage";
import FormsPage from "@/pages/FormsPage";
import AnamnesisPage from "@/pages/AnamnesisPage";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { lazyRetry } from "@/lib/lazyRetry";

const ReportsPage = lazyRetry(() => import("@/pages/ReportsPage"));
const FinancePage = lazyRetry(() => import("@/pages/FinancePage"));
const DocumentsPage = lazyRetry(() => import("@/pages/DocumentsPage"));
const AccountPage = lazyRetry(() => import("@/pages/AccountPage"));
const BackupPage = lazyRetry(() => import("@/pages/BackupPage"));
const ContractsPage = lazyRetry(() => import("@/pages/ContractsPage"));
const PatientHomePage = lazyRetry(() => import("@/pages/patient/PatientHomePage"));
const PatientSessionsPage = lazyRetry(() => import("@/pages/patient/PatientSessionsPage"));
const PatientDiaryPage = lazyRetry(() => import("@/pages/patient/PatientDiaryPage"));
const PatientMessagesPage = lazyRetry(() => import("@/pages/patient/PatientMessagesPage"));
const PatientDocumentsPage = lazyRetry(() => import("@/pages/patient/PatientDocumentsPage"));
const PatientPaymentsPage = lazyRetry(() => import("@/pages/patient/PatientPaymentsPage"));
const PatientBookingPage = lazyRetry(() => import("@/pages/patient/PatientBookingPage"));
const DreamDiaryPage = lazyRetry(() => import("@/pages/patient/DreamDiaryPage"));
const AvailabilitySettingsPage = lazyRetry(() => import("@/pages/AvailabilitySettingsPage"));
const AdminDashboard = lazyRetry(() => import("@/pages/admin/AdminDashboard"));
const AdminUsersPage = lazyRetry(() => import("@/pages/admin/AdminUsersPage"));
const AdminTestLab = lazyRetry(() => import("@/pages/admin/AdminTestLab"));
const AdminTicketsPage = lazyRetry(() => import("@/pages/admin/AdminTicketsPage"));
const DiagnosticsPage = lazyRetry(() => import("@/pages/DiagnosticsPage"));

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

const Index = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [showLogoReveal, setShowLogoReveal] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>("home");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const { user, isAuthenticated, isLoading, hasRole } = useAuth();
  const isMobile = useIsMobile();

  const handleSplashComplete = () => {
    setShowSplash(false);
    setShowLogoReveal(true);
  };

  const handleLogoRevealComplete = () => {
    setShowLogoReveal(false);
  };

  useEffect(() => {
    if (!showSplash && !showLogoReveal && !isAuthenticated && !isLoading) {
      setShowLogin(true);
    }
  }, [showSplash, showLogoReveal, isAuthenticated, isLoading]);

  const handleLoginSuccess = () => {
    setShowLogin(false);
  };


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
    // Redirect merged pages to their new unified home
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
        {!showSplash && !showLogoReveal && showLogin && !isAuthenticated && (
          <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <LoginPage onLoginSuccess={handleLoginSuccess} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!showSplash && !showLogoReveal && !showLogin && isAuthenticated && (
          <motion.div className="min-h-screen bg-background" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}>
            <Sidebar currentPage={currentPage} onNavigate={handleNavigate} />
            <main className={cn("pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0", !isMobile && "md:pl-64")}>
              <AnimatePresence mode="wait">
                <motion.div key={currentPage + (selectedSessionId?.toString() || "") + (selectedPatientId?.toString() || "")} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}>
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
