import { lazyRetry } from "@/lib/lazyRetry";

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

export type Page =
  | "home" | "agenda" | "patients" | "patient-detail" | "ethics" | "settings" | "session" | "prontuario"
  | "forms" | "anamnesis" | "reports" | "finance" | "documents" | "account" | "backup"
  | "contracts"
  | "patient-home" | "patient-sessions" | "patient-diary" | "patient-messages"
  | "patient-documents" | "patient-payments" | "patient-booking" | "patient-dream-diary"
  | "availability"
  | "admin-dashboard" | "admin-users" | "admin-testlab" | "admin-tickets"
  | "diagnostics";

export type PageRole = "professional" | "patient" | "admin";

export function PageFallback() {
  return (
    <div className="content-container flex items-center gap-3 py-12">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
      <p className="text-sm text-muted-foreground">Carregando tela...</p>
    </div>
  );
}

export const pageRedirects: Partial<Record<Page | string, Page>> = {
  anamnesis: "forms",
  reports: "documents",
  contracts: "documents",
  "patient-dream-diary": "patient-diary",
};

export const pageAccess: Partial<Record<Page, PageRole[]>> = {
  home: ["professional", "admin"],
  agenda: ["professional", "admin"],
  patients: ["professional", "admin"],
  "patient-detail": ["professional", "admin"],
  forms: ["professional", "admin"],
  anamnesis: ["professional", "admin"],
  finance: ["professional", "admin"],
  reports: ["professional", "admin"],
  documents: ["professional", "admin"],
  contracts: ["professional", "admin"],
  backup: ["professional", "admin"],
  ethics: ["professional", "admin"],
  session: ["professional", "admin"],
  prontuario: ["professional", "admin"],
  account: ["professional", "admin"],
  settings: ["professional", "admin"],
  availability: ["professional", "admin"],
  "patient-home": ["patient"],
  "patient-sessions": ["patient"],
  "patient-diary": ["patient"],
  "patient-messages": ["patient"],
  "patient-documents": ["patient"],
  "patient-payments": ["patient"],
  "patient-booking": ["patient"],
  "patient-dream-diary": ["patient"],
  "admin-dashboard": ["admin"],
  "admin-users": ["admin"],
  "admin-testlab": ["admin"],
  "admin-tickets": ["admin"],
  diagnostics: ["admin"],
};

export const pages = {
  HomePage: lazyRetry(importHomePage),
  SessionPage: lazyRetry(importSessionPage),
  AgendaPage: lazyRetry(importAgendaPage),
  PatientsPage: lazyRetry(importPatientsPage),
  PatientDetailPage: lazyRetry(importPatientDetailPage),
  EthicsPage: lazyRetry(importEthicsPage),
  ProntuarioPage: lazyRetry(importProntuarioPage),
  FormsPage: lazyRetry(importFormsPage),
  AnamnesisPage: lazyRetry(importAnamnesisPage),
  ReportsPage: lazyRetry(importReportsPage),
  FinancePage: lazyRetry(importFinancePage),
  DocumentsPage: lazyRetry(importDocumentsPage),
  AccountPage: lazyRetry(importAccountPage),
  BackupPage: lazyRetry(importBackupPage),
  ContractsPage: lazyRetry(importContractsPage),
  PatientHomePage: lazyRetry(importPatientHomePage),
  PatientSessionsPage: lazyRetry(importPatientSessionsPage),
  PatientDiaryPage: lazyRetry(importPatientDiaryPage),
  PatientMessagesPage: lazyRetry(importPatientMessagesPage),
  PatientDocumentsPage: lazyRetry(importPatientDocumentsPage),
  PatientPaymentsPage: lazyRetry(importPatientPaymentsPage),
  PatientBookingPage: lazyRetry(importPatientBookingPage),
  DreamDiaryPage: lazyRetry(importDreamDiaryPage),
  AvailabilitySettingsPage: lazyRetry(importAvailabilitySettingsPage),
  AdminDashboard: lazyRetry(importAdminDashboard),
  AdminUsersPage: lazyRetry(importAdminUsersPage),
  AdminTestLab: lazyRetry(importAdminTestLab),
  AdminTicketsPage: lazyRetry(importAdminTicketsPage),
  DiagnosticsPage: lazyRetry(importDiagnosticsPage),
};

export const pageImporters: Partial<Record<Page, () => Promise<unknown>>> = {
  home: importHomePage,
  agenda: importAgendaPage,
  patients: importPatientsPage,
  "patient-detail": importPatientDetailPage,
  forms: importFormsPage,
  anamnesis: importAnamnesisPage,
  finance: importFinancePage,
  reports: importReportsPage,
  documents: importDocumentsPage,
  contracts: importContractsPage,
  backup: importBackupPage,
  ethics: importEthicsPage,
  session: importSessionPage,
  prontuario: importProntuarioPage,
  account: importAccountPage,
  availability: importAvailabilitySettingsPage,
  "patient-home": importPatientHomePage,
  "patient-sessions": importPatientSessionsPage,
  "patient-diary": importPatientDiaryPage,
  "patient-messages": importPatientMessagesPage,
  "patient-documents": importPatientDocumentsPage,
  "patient-payments": importPatientPaymentsPage,
  "patient-booking": importPatientBookingPage,
  "patient-dream-diary": importDreamDiaryPage,
  "admin-dashboard": importAdminDashboard,
  "admin-users": importAdminUsersPage,
  "admin-testlab": importAdminTestLab,
  "admin-tickets": importAdminTicketsPage,
  diagnostics: importDiagnosticsPage,
};

export const prefetchByRole: Record<PageRole, Array<() => Promise<unknown>>> = {
  professional: [importHomePage, importAgendaPage, importPatientsPage],
  patient: [importPatientHomePage, importPatientSessionsPage, importPatientDiaryPage],
  admin: [importAdminDashboard, importAdminUsersPage, importAdminTicketsPage],
};

export function prefetchPage(page: string) {
  const resolved = pageRedirects[page] ?? page;
  void pageImporters[resolved as Page]?.();
}
