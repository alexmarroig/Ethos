import { useState } from "react";
import { motion } from "framer-motion";
import { TicketCheck, Plus, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: "open" | "resolved";
  created_at: string;
}

const TICKETS_KEY = "ethos_tickets";

function loadTickets(): Ticket[] {
  try {
    return JSON.parse(localStorage.getItem(TICKETS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveTickets(tickets: Ticket[]) {
  localStorage.setItem(TICKETS_KEY, JSON.stringify(tickets));
}

const AdminTicketsPage = () => {
  const [tickets, setTickets] = useState<Ticket[]>(loadTickets);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const { toast } = useToast();

  const handleCreate = () => {
    if (!title.trim()) return;
    const ticket: Ticket = {
      id: Date.now().toString(),
      title: title.trim(),
      description: description.trim(),
      status: "open",
      created_at: new Date().toISOString(),
    };
    const updated = [ticket, ...tickets];
    setTickets(updated);
    saveTickets(updated);
    setTitle("");
    setDescription("");
    toast({ title: "Ticket criado" });
  };

  const handleExportDiagnostics = () => {
    const data = {
      tickets,
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      screen: { width: window.innerWidth, height: window.innerHeight },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ethos-diagnostics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Pacote de diagnóstico exportado" });
  };

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12">
        <motion.header className="mb-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-serif text-3xl md:text-4xl font-medium text-foreground">Tickets de Suporte</h1>
          <p className="mt-2 text-muted-foreground">Registro local de problemas e diagnóstico.</p>
        </motion.header>

        {/* New ticket */}
        <motion.div
          className="mb-8 p-6 rounded-xl border border-border bg-card space-y-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título do ticket"
            className="h-11"
          />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descreva o problema..."
            className="min-h-[80px] resize-none"
          />
          <div className="flex gap-3">
            <Button onClick={handleCreate} disabled={!title.trim()} className="gap-2">
              <Plus className="w-4 h-4" strokeWidth={1.5} />
              Criar ticket
            </Button>
            <Button variant="secondary" onClick={handleExportDiagnostics} className="gap-2">
              <Download className="w-4 h-4" strokeWidth={1.5} />
              Exportar diagnóstico
            </Button>
          </div>
        </motion.div>

        {/* Tickets list */}
        <div className="space-y-3">
          {tickets.length === 0 ? (
            <div className="text-center py-12">
              <TicketCheck className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Nenhum ticket registrado.</p>
            </div>
          ) : (
            tickets.map((t) => (
              <div key={t.id} className="session-card">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-foreground">{t.title}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${t.status === "open" ? "bg-status-pending/10 text-status-pending" : "bg-status-validated/10 text-status-validated"}`}>
                    {t.status === "open" ? "Aberto" : "Resolvido"}
                  </span>
                </div>
                {t.description && <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>}
                <p className="mt-2 text-xs text-muted-foreground/60">
                  {new Date(t.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminTicketsPage;
