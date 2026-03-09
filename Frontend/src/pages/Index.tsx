import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import SplashScreen from "@/components/SplashScreen";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import RoleGate from "@/components/RoleGate";
import HomePage from "@/pages/HomePage";
import SessionPage from "@/pages/SessionPage";
import AgendaPage from "@/pages/AgendaPage";
import PatientsPage from "@/pages/PatientsPage";
import EthicsPage from "@/pages/EthicsPage";
import LoginPage from "@/pages/LoginPage";
import ProntuarioPage from "@/pages/ProntuarioPage";
import InstallPage from "@/pages/InstallPage";
import ScalesPage from "@/pages/ScalesPage";
import FormsPage from "@/pages/FormsPage";
import AnamnesisPage from "@/pages/AnamnesisPage";
import ReportsPage from "@/pages/ReportsPage";
import FinancePage from "@/pages/FinancePage";
import DocumentsPage from "@/pages/DocumentsPage";
import AIPage from "@/pages/AIPage";
import AccountPage from "@/pages/AccountPage";
import BackupPage from "@/pages/BackupPage";
import ContractsPage from "@/pages/ContractsPage";
import PatientHomePage from "@/pages/patient/PatientHomePage";
import PatientSessionsPage from "@/pages/patient/PatientSessionsPage";
import PatientScalesPage from "@/pages/patient/PatientScalesPage";
import PatientDiaryPage from "@/pages/patient/PatientDiaryPage";
import PatientMessagesPage from "@/pages/patient/PatientMessagesPage";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminUsersPage from "@/pages/admin/AdminUsersPage";
import AdminTestLab from "@/pages/admin/AdminTestLab";
import AdminTicketsPage from "@/pages/admin/AdminTicketsPage";
import DiagnosticsPage from "@/pages/DiagnosticsPage";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";

type Page =
  | "home" | "agenda" | "patients" | "ethics" | "settings" | "session" | "prontuario" | "install"
  | "scales" | "forms" | "anamnesis" | "reports" | "finance" | "documents" | "ai" | "account" | "backup"
  | "contracts"
  | "patient-home" | "patient-sessions" | "patient-scales" | "patient-diary" | "patient-messages"
  | "admin-dashboard" | "admin-users" | "admin-testlab" | "admin-tickets"
  | "diagnostics";

const Index = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>("home");
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const { isAuthenticated, isLoading, hasRole } = useAuth();
  const isMobile = useIsMobile();

  const handleSplashComplete = () => {
    setShowSplash(false);
    if (!isAuthenticated && !isLoading) {
      setShowLogin(true);
    }
  };

  const handleLoginSuccess = () => {
    setShowLogin(false);
  };

  const handleSessionClick = (sessionId: number) => {
    setSelectedSessionId(sessionId);
    setCurrentPage("session");
  };

  const handleBackFromSession = () => {
    setSelectedSessionId(null);
    setCurrentPage("home");
  };

  const handleOpenProntuario = (sessionId: number) => {
    setSelectedSessionId(sessionId);
    setCurrentPage("prontuario");
  };

  const handleBackFromProntuario = () => {
    setSelectedSessionId(null);
    setCurrentPage("home");
  };

  const handleNavigate = (page: string) => {
    setCurrentPage(page as Page);
    setSelectedSessionId(null);
  };

  // Render page content with role guards
  const renderPage = () => {
    // Professional pages
    const professionalPages = ["home", "agenda", "patients", "scales", "forms", "anamnesis",
      "finance", "reports", "documents", "contracts", "ai", "backup", "ethics", "install",
      "session", "prontuario", "account", "settings"];

    if (professionalPages.includes(currentPage)) {
      return (
        <RoleGate allowed={["professional", "admin"]} fallback={<FallbackRedirect hasRole={hasRole} onNavigate={handleNavigate} />}>
          {renderPageContent()}
        </RoleGate>
      );
    }

    // Patient pages
    if (currentPage.startsWith("patient-")) {
      return (
        <RoleGate allowed={["patient"]} fallback={<FallbackRedirect hasRole={hasRole} onNavigate={handleNavigate} />}>
          {renderPageContent()}
        </RoleGate>
      );
    }

    // Admin pages
    if (currentPage.startsWith("admin-")) {
      return (
        <RoleGate allowed={["admin"]} fallback={<FallbackRedirect hasRole={hasRole} onNavigate={handleNavigate} />}>
          {renderPageContent()}
        </RoleGate>
      );
    }

    // Diagnostics — admin + professional
    if (currentPage === "diagnostics") {
      return (
        <RoleGate allowed={["admin", "professional"]} fallback={<FallbackRedirect hasRole={hasRole} onNavigate={handleNavigate} />}>
          {renderPageContent()}
        </RoleGate>
      );
    }

    return renderPageContent();
  };

  const renderPageContent = () => {
    switch (currentPage) {
      case "home":
        return <HomePage onSessionClick={handleSessionClick} />;
      case "session":
        return (
          <SessionPage
            sessionId={selectedSessionId!}
            onBack={handleBackFromSession}
            onOpenProntuario={handleOpenProntuario}
          />
        );
      case "prontuario":
        return (
          <ProntuarioPage
            sessionId={selectedSessionId!}
            onBack={handleBackFromProntuario}
          />
        );
      case "agenda":
        return <AgendaPage onSessionClick={handleSessionClick} />;
      case "patients":
        return <PatientsPage />;
      case "ethics":
        return <EthicsPage />;
      case "install":
        return <InstallPage onBack={() => setCurrentPage("home")} />;
      case "scales":
        return <ScalesPage />;
      case "forms":
        return <FormsPage />;
      case "anamnesis":
        return <AnamnesisPage />;
      case "reports":
        return <ReportsPage />;
      case "finance":
        return <FinancePage />;
      case "documents":
        return <DocumentsPage />;
      case "contracts":
        return <ContractsPage />;
      case "ai":
        return <AIPage />;
      case "account":
        return <AccountPage />;
      case "backup":
        return <BackupPage />;

      // Patient pages
      case "patient-home":
        return <PatientHomePage />;
      case "patient-sessions":
        return <PatientSessionsPage />;
      case "patient-scales":
        return <PatientScalesPage />;
      case "patient-diary":
        return <PatientDiaryPage />;
      case "patient-messages":
        return <PatientMessagesPage />;

      // Admin pages
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
            <h1 className="font-serif text-3xl font-medium text-foreground">
              Configurações
            </h1>
            <p className="mt-2 text-muted-foreground">Em breve.</p>
          </div>
        );
      default:
        return <HomePage onSessionClick={handleSessionClick} />;
    }
  };

  return (
    <>
      <AnimatePresence>
        {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      </AnimatePresence>

      <AnimatePresence>
        {!showSplash && showLogin && !isAuthenticated && (
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <LoginPage onLoginSuccess={handleLoginSuccess} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!showSplash && !showLogin && isAuthenticated && (
          <motion.div
            className="min-h-screen bg-background"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <Sidebar currentPage={currentPage} onNavigate={handleNavigate} />

            <main className={cn(
              "pb-20 md:pb-0",
              !isMobile && "md:pl-64"
            )}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPage + (selectedSessionId?.toString() || "")}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  {renderPage()}
                </motion.div>
              </AnimatePresence>
            </main>

            {isMobile && (
              <BottomNav currentPage={currentPage} onNavigate={handleNavigate} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// Redirect to role-appropriate default page
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

// Helper
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export default Index;
