import { motion } from "framer-motion";
import {
  Calendar,
  Users,
  Shield,
  LogOut,
  FileText,
  ClipboardList,
  DollarSign,
  FolderOpen,
  Sparkles,
  User,
  FlaskConical,
  UserCog,
  TicketCheck,
  BookOpen,
  Stethoscope,
  Home,
  MessageCircle,
  DatabaseBackup,
  ScrollText,
  Moon,
  Sun,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";

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
  { id: "home", label: "Linha do tempo", icon: Home, roles: ["professional", "admin"] },
  { id: "agenda", label: "Agenda clínica", icon: Calendar, roles: ["professional"] },
  { id: "patients", label: "Pacientes", icon: Users, roles: ["professional"] },
  { id: "forms", label: "Diário e formulários", icon: ClipboardList, roles: ["professional"] },
  { id: "anamnesis", label: "Anamnese", icon: BookOpen, roles: ["professional"] },
  { id: "finance", label: "Financeiro", icon: DollarSign, roles: ["professional"], separator: true },
  { id: "reports", label: "Relatórios", icon: FileText, roles: ["professional"] },
  { id: "documents", label: "Documentos", icon: FolderOpen, roles: ["professional"] },
  { id: "contracts", label: "Contratos", icon: ScrollText, roles: ["professional"] },
  { id: "ai", label: "IA — Organizar texto", icon: Sparkles, roles: ["professional"], separator: true },
  { id: "backup", label: "Backup e dados", icon: DatabaseBackup, roles: ["professional"] },
  { id: "ethics", label: "Ética e sigilo", icon: Shield, roles: ["professional"] },

  { id: "patient-home", label: "Início", icon: Home, roles: ["patient"] },
  { id: "patient-sessions", label: "Sessões", icon: Calendar, roles: ["patient"] },
  { id: "patient-diary", label: "Diário e formulários", icon: ClipboardList, roles: ["patient"] },
  { id: "patient-messages", label: "Mensagens", icon: MessageCircle, roles: ["patient"] },

  { id: "admin-dashboard", label: "Painel Admin", icon: UserCog, roles: ["admin"], separator: true },
  { id: "admin-users", label: "Usuários", icon: Users, roles: ["admin"] },
  { id: "admin-testlab", label: "Test Lab", icon: FlaskConical, roles: ["admin"] },
  { id: "admin-tickets", label: "Tickets", icon: TicketCheck, roles: ["admin"] },
  { id: "diagnostics", label: "Diagnóstico técnico", icon: Stethoscope, roles: ["admin"], separator: true },
];

const Sidebar = ({ currentPage, onNavigate }: SidebarProps) => {
  const { user, logout, hasRole } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();

  const visibleItems = navigation.filter((item) => item.roles.some((role) => hasRole(role)));

  const roleBadge =
    user?.role === "admin"
      ? "Conta admin"
      : user?.role === "patient"
        ? "Conta paciente"
        : "Conta clínica";

  const initials = user?.name
    ? user.name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("")
    : "ET";

  return (
    <motion.aside
      className="fixed left-0 top-0 bottom-0 w-72 bg-sidebar border-r border-sidebar-border z-40 hidden md:flex flex-col"
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="px-6 py-6 border-b border-sidebar-border bg-gradient-to-br from-sidebar to-sidebar-accent/40">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt="Foto de perfil"
                className="h-12 w-12 rounded-2xl object-cover ring-1 ring-sidebar-border"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sidebar-primary/10 text-sidebar-primary font-semibold">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="font-serif text-2xl font-medium text-sidebar-primary tracking-tight">ETHOS</h1>
              {user ? (
                <div className="mt-1 space-y-2 min-w-0">
                  <p className="text-sm text-muted-foreground break-words leading-snug">{user.name}</p>
                  <span className="inline-flex text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                    {roleBadge}
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-sidebar-border bg-card/70 text-sidebar-foreground hover:border-primary/40 hover:text-primary"
            aria-label="Alternar tema"
          >
            {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <nav className="flex-1 px-3 py-2 overflow-y-auto">
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
                    "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-all duration-200",
                    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    "active:translate-y-[1px]",
                    isActive ? "bg-sidebar-accent text-sidebar-primary font-medium" : "text-sidebar-foreground",
                  )}
                >
                  <Icon
                    className={cn(
                      "w-[18px] h-[18px] transition-colors duration-200 shrink-0",
                      isActive ? "text-sidebar-primary" : "text-muted-foreground",
                    )}
                    strokeWidth={1.5}
                  />
                  <span className="text-sm truncate">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-3 pb-4 space-y-0.5 border-t border-sidebar-border pt-2">
        <button
          onClick={() => onNavigate("account")}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-all duration-200",
            "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            currentPage === "account" ? "bg-sidebar-accent text-sidebar-primary font-medium" : "text-sidebar-foreground",
          )}
        >
          <User
            className={cn(
              "w-[18px] h-[18px] transition-colors duration-200",
              currentPage === "account" ? "text-sidebar-primary" : "text-muted-foreground",
            )}
            strokeWidth={1.5}
          />
          <span className="text-sm">Conta</span>
        </button>

        {user ? (
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-all duration-200 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
          >
            <LogOut className="w-[18px] h-[18px]" strokeWidth={1.5} />
            <span className="text-sm">Sair</span>
          </button>
        ) : null}
      </div>
    </motion.aside>
  );
};

export default Sidebar;
