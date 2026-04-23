import { motion } from "framer-motion";
import {
  Calendar,
  CalendarPlus,
  Clock,
  CreditCard,
  DatabaseBackup,
  DollarSign,
  FileText,
  FlaskConical,
  FolderOpen,
  Home,
  LogOut,
  Moon,
  Eye,
  EyeOff,
  Shield,
  Stethoscope,
  Sun,
  TicketCheck,
  User,
  UserCog,
  Users,
  ClipboardList,
  Bell,
  X,
  Loader2,
  Calendar as CalendarIcon,
  CreditCard as CreditCardIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import BrandWordmark from "@/components/BrandWordmark";
import { useAppStore } from "@/stores/appStore";
import { useEffect, useState } from "react";
import { patientPortalService, type PatientNotification } from "@/services/patientPortalService";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  roles: UserRole[];
  separator?: boolean;
}

const navigation: NavItem[] = [
  // Profissional
  { id: "home", label: "Início", icon: Home, roles: ["professional", "admin"] },
  { id: "agenda", label: "Agenda clínica", icon: Calendar, roles: ["professional"] },
  { id: "patients", label: "Pacientes", icon: Users, roles: ["professional"] },
  { id: "forms", label: "Formulários e anamnese", icon: ClipboardList, roles: ["professional"] },
  { id: "finance", label: "Financeiro", icon: DollarSign, roles: ["professional"], separator: true },
  { id: "documents", label: "Documentos", icon: FolderOpen, roles: ["professional"] },
  { id: "availability", label: "Disponibilidade", icon: Clock, roles: ["professional"], separator: true },
  { id: "backup", label: "Backup e dados", icon: DatabaseBackup, roles: ["professional"] },
  { id: "ethics", label: "Ética e sigilo", icon: Shield, roles: ["professional"] },

  // Paciente
  { id: "patient-home", label: "Início", icon: Home, roles: ["patient"] },
  { id: "patient-sessions", label: "Sessões", icon: Calendar, roles: ["patient"] },
  { id: "patient-documents", label: "Documentos", icon: FileText, roles: ["patient"] },
  { id: "patient-payments", label: "Pagamentos", icon: CreditCard, roles: ["patient"] },
  { id: "patient-booking", label: "Agendar sessão", icon: CalendarPlus, roles: ["patient"] },
  { id: "patient-diary", label: "Diário e formulários", icon: ClipboardList, roles: ["patient"] },

  // Admin
  { id: "admin-dashboard", label: "Painel Admin", icon: UserCog, roles: ["admin"], separator: true },
  { id: "admin-users", label: "Usuários", icon: Users, roles: ["admin"] },
  { id: "admin-testlab", label: "Test Lab", icon: FlaskConical, roles: ["admin"] },
  { id: "admin-tickets", label: "Tickets", icon: TicketCheck, roles: ["admin"] },
  { id: "diagnostics", label: "Diagnóstico técnico", icon: Stethoscope, roles: ["admin"], separator: true },
];

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { user, logout, hasRole } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const privacyMode = useAppStore((s) => s.privacyMode);
  const togglePrivacyMode = useAppStore((s) => s.togglePrivacyMode);
  const [notifications, setNotifications] = useState<PatientNotification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  useEffect(() => {
    if (user?.role !== "patient") return;
    
    const loadNotifs = async () => {
      setLoadingNotifs(true);
      const res = await patientPortalService.getNotifications();
      if (res.success) setNotifications(res.data);
      setLoadingNotifs(false);
    };

    void loadNotifs();
    // Refresh notifications every 5 minutes
    const interval = setInterval(() => void loadNotifs(), 5 * 60000);
    return () => clearInterval(interval);
  }, [user?.role]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const dismissNotification = async (id: string) => {
    await patientPortalService.markNotificationRead(id);
    setNotifications((current) =>
      current.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  };

  const translateDocTitle = (raw?: string) => {
    if (!raw) return "Documento compartilhado";
    const map: Record<string, string> = {
      session_report: "Relatório de sessão",
      longitudinal_record: "Registro longitudinal",
      contract: "Contrato terapêutico",
      anamnesis: "Anamnese",
      informed_consent: "Termo de consentimento",
    };
    return map[raw] ?? raw;
  };

  const notificationLabel = (n: PatientNotification) => {
    switch (n.type) {
      case "session_reminder": return `Sessão amanhã às ${n.data.time ?? ""}`;
      case "payment_due": return `Pagamento pendente`;
      case "document_shared": return `Novo documento: ${translateDocTitle(n.data.title ?? n.data.kind)}`;
      case "slot_response": return `Sessão ${n.data.status === "confirmed" ? "confirmada" : "recusada"}`;
      default: return "Nova notificação";
    }
  };

  const NotificationIcon = (type: string) => {
    switch (type) {
      case "session_reminder": return CalendarIcon;
      case "payment_due": return CreditCardIcon;
      default: return Bell;
    }
  };

  const visibleItems = navigation.filter((item) => item.roles.some((role) => hasRole(role)));

  const isLikelyFemaleName = (value?: string) => {
    const firstName = value?.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
    return firstName.endsWith("a");
  };

  const roleBadge =
    user?.role === "admin"
      ? "Conta admin"
      : user?.role === "patient"
        ? "Conta paciente"
        : isLikelyFemaleName(user?.name)
          ? "Psicóloga"
          : "Psicólogo";

  const initials = user?.name
    ? user.name
        .replace(/\(.*?\)/g, "")
        .trim()
        .split(/\s+/)
        .filter((part) => /^[A-Za-z\u00c0-\u00d6\u00d8-\u00f6\u00f8-\u00ff]/.test(part))
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("")
    : "ET";

  return (
    <motion.aside
      className="fixed bottom-0 left-0 top-0 z-40 hidden w-64 flex-col border-r border-sidebar-border/80 bg-sidebar/92 backdrop-blur-xl md:flex"
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="border-b border-sidebar-border/80 px-6 py-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt="Foto de perfil"
                className="h-12 w-12 rounded-2xl object-cover ring-1 ring-sidebar-border/80"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sidebar-primary/[0.08] font-semibold text-sidebar-primary">
                {initials}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <BrandWordmark />
              {user ? (
                <div className="mt-1 min-w-0">
                  <p className="truncate whitespace-nowrap text-sm font-medium leading-snug text-muted-foreground">
                    {user.name}
                  </p>
                  <span className="mt-2 inline-flex rounded-full bg-primary/[0.08] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-primary">
                    {roleBadge}
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-1.5 pt-1">
            {user?.role === "patient" && (
              <button
                type="button"
                onClick={() => setNotifOpen(true)}
                className="relative flex h-10 w-10 items-center justify-center rounded-full border border-sidebar-border/80 bg-card text-sidebar-foreground transition-colors hover:border-primary/30 hover:text-primary"
                aria-label="Notificações"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground animate-in zoom-in">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <ul className="space-y-0.5">
          {visibleItems.map((item) => {
            const isActive = currentPage === item.id;
            const Icon = item.icon;

            return (
              <li key={item.id}>
                {item.separator ? <div className="my-3 border-t border-sidebar-border" /> : null}
                <button
                  onClick={() => onNavigate(item.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all duration-200",
                    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    "active:translate-y-[1px]",
                    isActive
                      ? "bg-sidebar-accent font-medium text-sidebar-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.06)]"
                      : "text-sidebar-foreground",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-[18px] w-[18px] shrink-0 transition-colors duration-200",
                      isActive ? "text-sidebar-primary" : "text-muted-foreground",
                    )}
                    strokeWidth={1.5}
                  />
                  <span className="truncate text-[15px]">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="space-y-1 border-t border-sidebar-border/80 px-3 pb-4 pt-3">
        <div className="flex items-center gap-2 px-2 pb-2">
          {user?.role !== "patient" && (
            <button
              type="button"
              onClick={togglePrivacyMode}
              className={cn(
                "flex h-9 flex-1 items-center justify-center gap-2 rounded-xl border transition-all duration-200 text-xs font-medium",
                privacyMode
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-sidebar-border/60 text-muted-foreground hover:border-primary/30 hover:bg-sidebar-accent hover:text-foreground",
              )}
              title={privacyMode ? "Privacidade ativa" : "Modo privacidade"}
            >
              {privacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {privacyMode ? "Privado" : "Público"}
            </button>
          )}
          <button
            type="button"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="flex h-9 w-12 items-center justify-center rounded-xl border border-sidebar-border/60 text-muted-foreground transition-all duration-200 hover:border-primary/30 hover:bg-sidebar-accent hover:text-foreground"
            aria-label="Alternar tema"
          >
            {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>

        <button
          onClick={() => onNavigate("account")}
          className={cn(
            "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all duration-200",
            "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            currentPage === "account" ? "bg-sidebar-accent font-medium text-sidebar-primary" : "text-sidebar-foreground",
          )}
        >
          <User
            className={cn(
              "h-[18px] w-[18px] transition-colors duration-200",
              currentPage === "account" ? "text-sidebar-primary" : "text-muted-foreground",
            )}
            strokeWidth={1.5}
          />
          <span className="text-[15px]">Conta</span>
        </button>

        {user ? (
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-muted-foreground transition-all duration-200 hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-[18px] w-[18px]" strokeWidth={1.5} />
            <span className="text-[15px]">Sair</span>
          </button>
        ) : null}
      </div>

      <Sheet open={notifOpen} onOpenChange={setNotifOpen}>
        <SheetContent side="right" className="w-full max-w-sm">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2 text-left text-base">
              <Bell className="h-4 w-4" />
              Notificações
              {unreadCount > 0 && (
                <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {unreadCount} nova{unreadCount !== 1 ? "s" : ""}
                </span>
              )}
            </SheetTitle>
          </SheetHeader>

          {loadingNotifs && notifications.length === 0 ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Nenhuma notificação ainda.</p>
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-[80vh] pr-1">
              {notifications.map((n) => {
                const Icon = NotificationIcon(n.type);
                return (
                  <div
                    key={n.id}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border px-3 py-3 transition-colors",
                      n.read ? "border-border/50 bg-card/50 opacity-60" : "border-border bg-card",
                    )}
                  >
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Icon className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground leading-snug">{notificationLabel(n)}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {new Date(n.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    {!n.read && (
                      <button
                        type="button"
                        className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
                        onClick={() => void dismissNotification(n.id)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </motion.aside>
  );
}
