import { motion } from "framer-motion";
import {
  Calendar, Clock, Users, Shield, Settings, LogOut, Smartphone,
  FileText, BarChart3, ClipboardList, DollarSign, FolderOpen,
  Sparkles, User, FlaskConical, UserCog, TicketCheck, BookOpen, Stethoscope,
  Home, MessageCircle, DatabaseBackup, ScrollText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth, UserRole } from "@/contexts/AuthContext";

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
  // Professional + Admin
  { id: "home", label: "Linha do tempo", icon: Home, roles: ["professional", "admin"] },
  { id: "agenda", label: "Agenda clínica", icon: Calendar, roles: ["professional"] },
  { id: "patients", label: "Pacientes", icon: Users, roles: ["professional"] },
  { id: "scales", label: "Escalas", icon: BarChart3, roles: ["professional"] },
  { id: "forms", label: "Formulários / Diários", icon: ClipboardList, roles: ["professional"] },
  { id: "anamnesis", label: "Anamnese", icon: BookOpen, roles: ["professional"] },
  { id: "finance", label: "Financeiro", icon: DollarSign, roles: ["professional"], separator: true },
  { id: "reports", label: "Relatórios", icon: FileText, roles: ["professional"] },
  { id: "documents", label: "Documentos", icon: FolderOpen, roles: ["professional"] },
  { id: "contracts", label: "Contratos", icon: ScrollText, roles: ["professional"] },
  { id: "ai", label: "IA — Organizar texto", icon: Sparkles, roles: ["professional"], separator: true },
  { id: "backup", label: "Backup e dados", icon: DatabaseBackup, roles: ["professional"] },
  { id: "ethics", label: "Ética e sigilo", icon: Shield, roles: ["professional"] },
  { id: "install", label: "Instalar no celular", icon: Smartphone, roles: ["professional", "admin"] },

  // Patient
  { id: "patient-home", label: "Início", icon: Home, roles: ["patient"] },
  { id: "patient-sessions", label: "Sessões", icon: Calendar, roles: ["patient"] },
  { id: "patient-scales", label: "Escalas", icon: BarChart3, roles: ["patient"] },
  { id: "patient-diary", label: "Diário", icon: ClipboardList, roles: ["patient"] },
  { id: "patient-messages", label: "Mensagens", icon: MessageCircle, roles: ["patient"] },

  // Admin
  { id: "admin-dashboard", label: "Painel Admin", icon: UserCog, roles: ["admin"], separator: true },
  { id: "admin-users", label: "Usuários", icon: Users, roles: ["admin"] },
  { id: "admin-testlab", label: "Test Lab", icon: FlaskConical, roles: ["admin"] },
  { id: "admin-tickets", label: "Tickets", icon: TicketCheck, roles: ["admin"] },

  // Diagnostics — admin + professional
  { id: "diagnostics", label: "Diagnóstico", icon: Stethoscope, roles: ["admin", "professional"], separator: true },
];

const Sidebar = ({ currentPage, onNavigate }: SidebarProps) => {
  const { user, logout, hasRole } = useAuth();

  const visibleItems = navigation.filter((item) =>
    item.roles.some((r) => hasRole(r))
  );

  const roleBadge = user?.role === "admin"
    ? "Admin"
    : user?.role === "patient"
    ? "Paciente"
    : "Profissional";

  return (
    <motion.aside
      className="fixed left-0 top-0 bottom-0 w-64 bg-sidebar border-r border-sidebar-border z-40 hidden md:flex flex-col"
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {/* Logo and User */}
      <div className="px-6 py-6 border-b border-sidebar-border">
        <h1 className="font-serif text-2xl font-medium text-sidebar-primary tracking-tight">
          ETHOS
        </h1>
        {user && (
          <div className="mt-2 flex items-center gap-2">
            <p className="text-sm text-muted-foreground truncate flex-1">
              {user.name}
            </p>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              {roleBadge}
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        <ul className="space-y-0.5">
          {visibleItems.map((item) => {
            const isActive = currentPage === item.id;
            const Icon = item.icon;

            return (
              <li key={item.id}>
                {item.separator && (
                  <div className="my-3 border-t border-sidebar-border" />
                )}
                <button
                  onClick={() => onNavigate(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-all duration-200",
                    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    "active:translate-y-[1px]",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-primary font-medium"
                      : "text-sidebar-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-[18px] h-[18px] transition-colors duration-200 shrink-0",
                      isActive ? "text-sidebar-primary" : "text-muted-foreground"
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

      {/* Footer */}
      <div className="px-3 pb-4 space-y-0.5 border-t border-sidebar-border pt-2">
        <button
          onClick={() => onNavigate("account")}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-all duration-200",
            "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            currentPage === "account"
              ? "bg-sidebar-accent text-sidebar-primary font-medium"
              : "text-sidebar-foreground"
          )}
        >
          <User
            className={cn(
              "w-[18px] h-[18px] transition-colors duration-200",
              currentPage === "account" ? "text-sidebar-primary" : "text-muted-foreground"
            )}
            strokeWidth={1.5}
          />
          <span className="text-sm">Conta</span>
        </button>

        {user && (
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-all duration-200 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
          >
            <LogOut className="w-[18px] h-[18px]" strokeWidth={1.5} />
            <span className="text-sm">Sair</span>
          </button>
        )}
      </div>
    </motion.aside>
  );
};

export default Sidebar;
