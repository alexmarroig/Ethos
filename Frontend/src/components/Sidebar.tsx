import { motion } from "framer-motion";
import {
  BookOpen,
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
  ScrollText,
  Shield,
  Stethoscope,
  Sun,
  TicketCheck,
  User,
  UserCog,
  Users,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import BrandWordmark from "@/components/BrandWordmark";

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
  { id: "home", label: "In\u00edcio", icon: Home, roles: ["professional", "admin"] },
  { id: "agenda", label: "Agenda cl\u00ednica", icon: Calendar, roles: ["professional"] },
  { id: "patients", label: "Pacientes", icon: Users, roles: ["professional"] },
  { id: "forms", label: "Di\u00e1rio e formul\u00e1rios", icon: ClipboardList, roles: ["professional"] },
  { id: "anamnesis", label: "Anamnese", icon: BookOpen, roles: ["professional"] },
  { id: "finance", label: "Financeiro", icon: DollarSign, roles: ["professional"], separator: true },
  { id: "reports", label: "Relat\u00f3rios", icon: FileText, roles: ["professional"] },
  { id: "documents", label: "Documentos", icon: FolderOpen, roles: ["professional"] },
  { id: "contracts", label: "Contratos", icon: ScrollText, roles: ["professional"] },
  { id: "availability", label: "Disponibilidade", icon: Clock, roles: ["professional"], separator: true },
  { id: "backup", label: "Backup e dados", icon: DatabaseBackup, roles: ["professional"] },
  { id: "ethics", label: "\u00c9tica e sigilo", icon: Shield, roles: ["professional"] },

  { id: "patient-home", label: "In\u00edcio", icon: Home, roles: ["patient"] },
  { id: "patient-sessions", label: "Sess\u00f5es", icon: Calendar, roles: ["patient"] },
  { id: "patient-documents", label: "Documentos", icon: FileText, roles: ["patient"] },
  { id: "patient-payments", label: "Pagamentos", icon: CreditCard, roles: ["patient"] },
  { id: "patient-booking", label: "Agendar sess\u00e3o", icon: CalendarPlus, roles: ["patient"] },
  { id: "patient-diary", label: "Di\u00e1rio e formul\u00e1rios", icon: ClipboardList, roles: ["patient"] },

  { id: "admin-dashboard", label: "Painel Admin", icon: UserCog, roles: ["admin"], separator: true },
  { id: "admin-users", label: "Usu\u00e1rios", icon: Users, roles: ["admin"] },
  { id: "admin-testlab", label: "Test Lab", icon: FlaskConical, roles: ["admin"] },
  { id: "admin-tickets", label: "Tickets", icon: TicketCheck, roles: ["admin"] },
  { id: "diagnostics", label: "Diagn\u00f3stico t\u00e9cnico", icon: Stethoscope, roles: ["admin"], separator: true },
];

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { user, logout, hasRole } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();

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
          ? "Psic\u00f3loga"
          : "Psic\u00f3logo";

  const initials = user?.name
    ? user.name
        .replace(/\(.*?\)/g, "")
        .trim()
        .split(/\s+/)
        .filter((part) => /^[A-Za-z?-??-??-?]/.test(part))
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("")
    : "ET";

  return (
    <motion.aside
      className="fixed bottom-0 left-0 top-0 z-40 hidden w-72 flex-col border-r border-sidebar-border/80 bg-sidebar/92 backdrop-blur-xl md:flex"
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
                <div className="mt-1 min-w-0 space-y-2">
                  <p className="break-words text-sm leading-snug text-muted-foreground">{user.name}</p>
                  <span className="inline-flex rounded-full bg-primary/[0.08] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-primary">
                    {roleBadge}
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-sidebar-border/80 bg-card text-sidebar-foreground transition-colors hover:border-primary/30 hover:text-primary"
            aria-label="Alternar tema"
          >
            {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
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
    </motion.aside>
  );
}
