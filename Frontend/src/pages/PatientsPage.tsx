import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Plus, ChevronRight, KeyRound, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { patientService, Patient } from "@/services/patientService";
import IntegrationUnavailable from "@/components/IntegrationUnavailable";
import { Skeleton } from "@/components/ui/skeleton";
import { PatientCardSkeleton } from "@/components/SkeletonCards";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";

const PatientsPage = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId: string } | null>(null);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");

  // Access dialog
  const [accessOpen, setAccessOpen] = useState(false);
  const [accessPatientId, setAccessPatientId] = useState("");
  const [granting, setGranting] = useState(false);
  const [accessCredentials, setAccessCredentials] = useState<string | null>(null);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    const res = await patientService.list();
    if (!res.success) {
      setError({ message: res.error.message, requestId: res.request_id });
    } else {
      setPatients(res.data);
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const res = await patientService.create({ name: newName, email: newEmail, phone: newPhone });
    if (res.success) {
      setPatients((prev) => [res.data, ...prev]);
      setCreateOpen(false);
      setNewName(""); setNewEmail(""); setNewPhone("");
      toast({ title: "Paciente criado" });
    } else {
      toast({ title: "Erro", description: res.error.message, variant: "destructive" });
    }
    setCreating(false);
  };

  const handleGrantAccess = async () => {
    if (!accessPatientId.trim()) return;
    setGranting(true);
    const res = await patientService.grantAccess(accessPatientId);
    if (res.success) {
      setAccessCredentials(res.data.credentials);
      toast({ title: "Acesso criado" });
    } else {
      toast({ title: "Erro", description: res.error.message, variant: "destructive" });
    }
    setGranting(false);
  };

  const filteredPatients = patients.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="content-container py-8 md:py-12">
        <Skeleton className="h-10 w-48 mb-2" />
        <Skeleton className="h-5 w-64 mb-8" />
        <Skeleton className="h-11 w-full max-w-md mb-8" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <PatientCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-container py-12">
        <h1 className="font-serif text-3xl font-medium text-foreground mb-6">Pacientes</h1>
        <IntegrationUnavailable message={error.message} requestId={error.requestId} />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12">
        <motion.header className="mb-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="font-serif text-3xl md:text-4xl font-medium text-foreground">Pacientes</h1>
          <p className="mt-2 text-muted-foreground">Registros organizados ao longo do tempo.</p>
        </motion.header>

        <motion.div className="flex flex-col sm:flex-row gap-4 mb-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input type="text" placeholder="Buscar por nome" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-11" />
          </div>

          <div className="flex gap-2">
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" className="gap-2 h-11">
                  <Plus className="w-4 h-4" strokeWidth={1.5} />
                  Novo paciente
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-serif text-xl">Novo paciente</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input placeholder="Nome completo *" value={newName} onChange={(e) => setNewName(e.target.value)} />
                  <Input placeholder="Email (opcional)" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                  <Input placeholder="Telefone (opcional)" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
                </div>
                <DialogFooter>
                  <Button onClick={handleCreate} disabled={creating || !newName.trim()} className="gap-2">
                    {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                    Criar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={accessOpen} onOpenChange={(o) => { setAccessOpen(o); if (!o) { setAccessCredentials(null); setAccessPatientId(""); } }}>
              <DialogTrigger asChild>
                <Button variant="ghost" className="gap-2 h-11">
                  <KeyRound className="w-4 h-4" strokeWidth={1.5} />
                  Criar acesso
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-serif text-xl">Criar acesso do paciente</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input placeholder="ID do paciente" value={accessPatientId} onChange={(e) => setAccessPatientId(e.target.value)} />
                  {accessCredentials && (
                    <div className="p-4 rounded-lg bg-status-validated/10 border border-status-validated/20">
                      <p className="text-sm font-medium text-foreground mb-1">Credenciais geradas:</p>
                      <code className="text-xs bg-muted px-2 py-1 rounded block break-all">{accessCredentials}</code>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button onClick={handleGrantAccess} disabled={granting || !accessPatientId.trim()} className="gap-2">
                    {granting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Gerar credenciais
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>

        <motion.div className="space-y-2" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          {filteredPatients.map((patient, index) => (
            <motion.button
              key={patient.id}
              className="w-full session-card flex items-center justify-between group"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + index * 0.05, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <div className="text-left">
                <h3 className="font-serif text-lg font-medium text-foreground">{patient.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {patient.last_session ? `Última sessão: ${patient.last_session}` : "Sem sessões"}
                  {patient.total_sessions ? ` · ${patient.total_sessions} sessões` : ""}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors duration-200" strokeWidth={1.5} />
            </motion.button>
          ))}
          {filteredPatients.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Nenhum paciente encontrado.</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default PatientsPage;
