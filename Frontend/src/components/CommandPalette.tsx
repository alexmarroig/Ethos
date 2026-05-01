import React, { useState, useEffect } from "react";
import { Command } from "cmdk";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar, Users, FileText, Settings, Search, Home } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0 shadow-2xl rounded-2xl sm:max-w-[600px] gap-0 border-sidebar-border/80 bg-background/95 backdrop-blur-md">
        <DialogTitle className="sr-only">Busca Global</DialogTitle>
        <DialogDescription className="sr-only">Use a busca para navegar rapidamente pelo sistema.</DialogDescription>
        
        <Command className="flex w-full flex-col bg-transparent overflow-hidden">
          <div className="flex items-center border-b px-3 text-muted-foreground border-sidebar-border/80">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Command.Input 
              placeholder="Digite um comando ou busque algo... (Cmd/Ctrl + K)" 
              className="flex h-14 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              Nenhum resultado encontrado.
            </Command.Empty>
            
            <Command.Group heading="Navegação" className="text-xs font-medium text-muted-foreground px-2 py-1.5">
              <Command.Item
                onSelect={() => runCommand(() => navigate(user?.role === "patient" ? "/patient-home" : "/home"))}
                className="flex cursor-pointer items-center rounded-xl px-3 py-3 text-sm aria-selected:bg-sidebar-accent aria-selected:text-sidebar-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 transition-colors"
              >
                <Home className="mr-2 h-4 w-4" />
                Início
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate("/agenda"))}
                className="flex cursor-pointer items-center rounded-xl px-3 py-3 text-sm aria-selected:bg-sidebar-accent aria-selected:text-sidebar-accent-foreground transition-colors"
              >
                <Calendar className="mr-2 h-4 w-4" />
                Agenda Clínica
              </Command.Item>
              {user?.role !== "patient" && (
                <>
                  <Command.Item
                    onSelect={() => runCommand(() => navigate("/patients"))}
                    className="flex cursor-pointer items-center rounded-xl px-3 py-3 text-sm aria-selected:bg-sidebar-accent aria-selected:text-sidebar-accent-foreground transition-colors"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Pacientes
                  </Command.Item>
                  <Command.Item
                    onSelect={() => runCommand(() => navigate("/documents"))}
                    className="flex cursor-pointer items-center rounded-xl px-3 py-3 text-sm aria-selected:bg-sidebar-accent aria-selected:text-sidebar-accent-foreground transition-colors"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Documentos
                  </Command.Item>
                </>
              )}
            </Command.Group>

            <Command.Group heading="Configurações" className="text-xs font-medium text-muted-foreground px-2 py-1.5 mt-2">
              <Command.Item
                onSelect={() => runCommand(() => navigate("/account"))}
                className="flex cursor-pointer items-center rounded-xl px-3 py-3 text-sm aria-selected:bg-sidebar-accent aria-selected:text-sidebar-accent-foreground transition-colors"
              >
                <Settings className="mr-2 h-4 w-4" />
                Minha Conta
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
