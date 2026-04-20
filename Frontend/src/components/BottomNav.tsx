import { Home, Calendar, Users, User, FlaskConical, Clipboard, MoreHorizontal, FileText, DollarSign, FileCheck, BookOpen, Shield, HardDrive, LayoutDashboard, Ticket, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface BottomNavProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

const BottomNav = ({ currentPage, onNavigate }: BottomNavProps) => {
  const { hasRole } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  const handleNav = (id: string) => {
    setMoreOpen(false);
    onNavigate(id);
  };

  if (hasRole("patient")) {
    const items = [
      { id: "patient-home", label: "Início", icon: Home },
      { id: "patient-sessions", label: "Sessões", icon: Calendar },
      { id: "patient-diary", label: "Formulários", icon: Clipboard },
      { id: "account", label: "Conta", icon: User },
    ];
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:hidden">
        <div className="flex items-center justify-around">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={cn(
                  "flex flex-col items-center justify-center py-2 px-3 min-h-[56px] min-w-[56px] transition-colors duration-200",
                  currentPage === item.id ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="w-5 h-5 mb-1" strokeWidth={1.5} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    );
  }

  if (hasRole("admin")) {
    const mainItems = [
      { id: "home", label: "Início", icon: Home },
      { id: "admin-users", label: "Usuários", icon: Users },
      { id: "admin-dashboard", label: "Métricas", icon: LayoutDashboard },
      { id: "account", label: "Conta", icon: User },
    ];
    const moreItems = [
      { id: "admin-testlab", label: "Test Lab", icon: FlaskConical },
      { id: "admin-tickets", label: "Tickets", icon: Ticket },
      { id: "diagnostics", label: "Diagnósticos", icon: Activity },
    ];
    return (
      <>
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:hidden">
          <div className="flex items-center justify-around">
            {mainItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={cn(
                    "flex flex-col items-center justify-center py-2 px-3 min-h-[56px] min-w-[56px] transition-colors duration-200",
                    currentPage === item.id ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <Icon className="w-5 h-5 mb-1" strokeWidth={1.5} />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </button>
              );
            })}
            <button
              onClick={() => setMoreOpen(true)}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-3 min-h-[56px] min-w-[56px] transition-colors duration-200",
                moreItems.some((i) => i.id === currentPage) ? "text-primary" : "text-muted-foreground",
              )}
            >
              <MoreHorizontal className="w-5 h-5 mb-1" strokeWidth={1.5} />
              <span className="text-[10px] font-medium">Mais</span>
            </button>
          </div>
          <div className="h-[env(safe-area-inset-bottom)]" />
        </nav>
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetContent side="bottom" className="pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <SheetHeader className="mb-4">
              <SheetTitle className="text-left text-base">Mais opções</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-3 gap-3">
              {moreItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.id)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card p-4 transition-colors",
                      currentPage === item.id ? "border-primary/50 bg-primary/5 text-primary" : "text-muted-foreground hover:bg-secondary",
                    )}
                  >
                    <Icon className="w-5 h-5" strokeWidth={1.5} />
                    <span className="text-[11px] font-medium text-center leading-tight">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // Professional role
  const mainItems = [
    { id: "home", label: "Início", icon: Home },
    { id: "agenda", label: "Agenda", icon: Calendar },
    { id: "patients", label: "Pacientes", icon: Users },
    { id: "account", label: "Conta", icon: User },
  ];

  const moreItems = [
    { id: "reports", label: "Relatórios", icon: FileText },
    { id: "finance", label: "Financeiro", icon: DollarSign },
    { id: "contracts", label: "Contratos", icon: FileCheck },
    { id: "documents", label: "Documentos", icon: BookOpen },
    { id: "forms", label: "Formulários", icon: Clipboard },
    { id: "anamnesis", label: "Anamnese", icon: Clipboard },
    { id: "ethics", label: "Ética", icon: Shield },
    { id: "availability", label: "Disponibilidade", icon: LayoutDashboard },
    { id: "backup", label: "Backup", icon: HardDrive },
  ];

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:hidden">
        <div className="flex items-center justify-around">
          {mainItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={cn(
                  "flex flex-col items-center justify-center py-2 px-3 min-h-[56px] min-w-[56px] transition-colors duration-200",
                  currentPage === item.id ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="w-5 h-5 mb-1" strokeWidth={1.5} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center py-2 px-3 min-h-[56px] min-w-[56px] transition-colors duration-200",
              moreItems.some((i) => i.id === currentPage) ? "text-primary" : "text-muted-foreground",
            )}
          >
            <MoreHorizontal className="w-5 h-5 mb-1" strokeWidth={1.5} />
            <span className="text-[10px] font-medium">Mais</span>
          </button>
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-left text-base">Mais opções</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-3">
            {moreItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card p-4 transition-colors",
                    currentPage === item.id ? "border-primary/50 bg-primary/5 text-primary" : "text-muted-foreground hover:bg-secondary",
                  )}
                >
                  <Icon className="w-5 h-5" strokeWidth={1.5} />
                  <span className="text-[11px] font-medium text-center leading-tight">{item.label}</span>
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default BottomNav;
