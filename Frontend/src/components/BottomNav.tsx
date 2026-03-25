import { Home, Calendar, PlusCircle, Users, User, BarChart3, FlaskConical, Clipboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface BottomNavProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

const BottomNav = ({ currentPage, onNavigate }: BottomNavProps) => {
  const { hasRole } = useAuth();

  const getNavItems = () => {
    if (hasRole("patient")) {
      return [
        { id: "patient-home", label: "Início", icon: Home },
        { id: "patient-sessions", label: "Sessões", icon: Calendar },
        { id: "patient-scales", label: "Escalas", icon: BarChart3 },
        { id: "patient-diary", label: "Diário", icon: Clipboard },
        { id: "account", label: "Conta", icon: User },
      ];
    }

    if (hasRole("admin")) {
      return [
        { id: "home", label: "Início", icon: Home },
        { id: "admin-users", label: "Usuários", icon: Users },
        { id: "admin-dashboard", label: "Métricas", icon: BarChart3 },
        { id: "admin-testlab", label: "Test Lab", icon: FlaskConical },
        { id: "account", label: "Conta", icon: User },
      ];
    }

    // Professional
    return [
      { id: "home", label: "Início", icon: Home },
      { id: "agenda", label: "Agenda", icon: Calendar },
      { id: "session", label: "Registrar", icon: PlusCircle },
      { id: "patients", label: "Pacientes", icon: Users },
      { id: "account", label: "Conta", icon: User },
    ];
  };

  const items = getNavItems();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:hidden">
      <div className="flex items-center justify-around">
        {items.map((item) => {
          const isActive = currentPage === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-3 min-h-[56px] min-w-[56px] transition-colors duration-200",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <Icon className="w-5 h-5 mb-1" strokeWidth={1.5} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
      {/* Safe area for iOS */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
};

export default BottomNav;
