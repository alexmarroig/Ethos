import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, Plus, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { availabilityService, type AvailabilityBlock, type SlotRequestItem } from "@/services/availabilityService";
import { patientService } from "@/services/patientService";
import { useToast } from "@/hooks/use-toast";

const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const WEEK_DAYS: Array<0 | 1 | 2 | 3 | 4 | 5 | 6> = [1, 2, 3, 4, 5, 0, 6];

const formatDate = (iso: string) => {
  try {
    return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" });
  } catch {
    return iso;
  }
};

const AvailabilitySettingsPage = () => {
  const { toast } = useToast();
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [requests, setRequests] = useState<SlotRequestItem[]>([]);
  const [patientNames, setPatientNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);
  const [newBlock, setNewBlock] = useState<{
    day_of_week: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    start_time: string;
    end_time: string;
    slot_duration_minutes: number;
  }>({ day_of_week: 1, start_time: "09:00", end_time: "18:00", slot_duration_minutes: 50 });
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [blocksRes, reqRes, patientsRes] = await Promise.all([
        availabilityService.list(),
        availabilityService.listSlotRequests(),
        patientService.list(),
      ]);
      if (blocksRes.success) setBlocks(blocksRes.data);
      if (reqRes.success) setRequests(reqRes.data);
      if (patientsRes.success) {
        const map: Record<string, string> = {};
        for (const p of patientsRes.data) map[p.id] = p.name;
        setPatientNames(map);
      }
      setLoading(false);
    };
    void load();
  }, []);

  const handleAdd = async () => {
    setAdding(true);
    const res = await availabilityService.create({ ...newBlock, enabled: true });
    setAdding(false);
    if (res.success) {
      setBlocks((prev) => [...prev, res.data]);
      setShowForm(false);
      toast({ title: "Bloco de horário adicionado" });
    } else {
      toast({ title: "Erro", description: res.error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    const res = await availabilityService.delete(id);
    if (res.success) {
      setBlocks((prev) => prev.filter((b) => b.id !== id));
      toast({ title: "Bloco removido" });
    }
  };

  const handleToggle = async (block: AvailabilityBlock) => {
    const res = await availabilityService.update(block.id, { enabled: !block.enabled });
    if (res.success) {
      setBlocks((prev) => prev.map((b) => (b.id === block.id ? res.data : b)));
    }
  };

  const handleRespond = async (req: SlotRequestItem, approved: boolean) => {
    setResponding(req.id);
    const res = await availabilityService.respondSlotRequest(req.id, approved);
    setResponding(null);
    if (res.success) {
      setRequests((prev) => prev.map((r) => (r.id === req.id ? res.data : r)));
      toast({ title: approved ? "Sessão confirmada!" : "Solicitação recusada" });
    } else {
      toast({ title: "Erro", description: res.error.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="content-container py-12 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pendingRequests = requests.filter((r) => r.status === "pending");

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12 space-y-10">
        <motion.header className="mb-2" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-serif text-3xl md:text-4xl font-medium text-foreground">Disponibilidade</h1>
          <p className="mt-2 text-muted-foreground">Defina horários disponíveis para que pacientes possam solicitar sessões.</p>
        </motion.header>

        {/* Pending slot requests */}
        {pendingRequests.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <h2 className="font-serif text-xl font-medium text-foreground mb-4">
              Solicitações pendentes
              <span className="ml-2 text-sm px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{pendingRequests.length}</span>
            </h2>
            <div className="space-y-3">
              {pendingRequests.map((req) => (
                <div key={req.id} className="session-card flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-foreground">
                      {patientNames[req.patient_id] ?? "Paciente"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(req.requested_date)} às {req.requested_time} · {req.duration_minutes} min
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      className="gap-1.5"
                      onClick={() => void handleRespond(req, true)}
                      disabled={responding === req.id}
                    >
                      {responding === req.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      Aceitar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => void handleRespond(req, false)}
                      disabled={responding === req.id}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Recusar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Availability blocks */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl font-medium text-foreground">Blocos de horário</h2>
            <Button size="sm" className="gap-1.5" onClick={() => setShowForm((v) => !v)}>
              <Plus className="w-3.5 h-3.5" />
              Adicionar bloco
            </Button>
          </div>

          {showForm && (
            <div className="session-card mb-4 space-y-4">
              <h3 className="font-medium text-foreground">Novo bloco recorrente</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Dia da semana</label>
                  <select
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    value={newBlock.day_of_week}
                    onChange={(e) => setNewBlock((prev) => ({ ...prev, day_of_week: Number(e.target.value) as typeof prev.day_of_week }))}
                  >
                    {WEEK_DAYS.map((d) => <option key={d} value={d}>{DAY_NAMES[d]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Início</label>
                  <Input
                    type="time"
                    value={newBlock.start_time}
                    onChange={(e) => setNewBlock((prev) => ({ ...prev, start_time: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Fim</label>
                  <Input
                    type="time"
                    value={newBlock.end_time}
                    onChange={(e) => setNewBlock((prev) => ({ ...prev, end_time: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Duração (min)</label>
                  <Input
                    type="number"
                    min={30}
                    max={120}
                    step={10}
                    value={newBlock.slot_duration_minutes}
                    onChange={(e) => setNewBlock((prev) => ({ ...prev, slot_duration_minutes: Number(e.target.value) }))}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => void handleAdd()} disabled={adding} className="gap-1.5">
                  {adding && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Salvar bloco
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              </div>
            </div>
          )}

          {blocks.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground text-sm">Nenhum bloco configurado. Adicione blocos para que pacientes possam solicitar sessões.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {WEEK_DAYS.filter((d) => blocks.some((b) => b.day_of_week === d)).map((dow) => (
                <div key={dow}>
                  <p className="text-xs font-medium text-muted-foreground uppercase mb-2">{DAY_NAMES[dow]}</p>
                  {blocks.filter((b) => b.day_of_week === dow).map((block) => (
                    <div key={block.id} className="session-card flex items-center justify-between gap-4 mb-2">
                      <div>
                        <p className="font-medium text-foreground">{block.start_time} – {block.end_time}</p>
                        <p className="text-xs text-muted-foreground">Slots de {block.slot_duration_minutes} min</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant={block.enabled ? "default" : "outline"}
                          size="sm"
                          onClick={() => void handleToggle(block)}
                        >
                          {block.enabled ? "Ativo" : "Inativo"}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => void handleDelete(block.id)}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </motion.section>

        {/* All requests history */}
        {requests.filter((r) => r.status !== "pending").length > 0 && (
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <h2 className="font-serif text-xl font-medium text-foreground mb-4">Histórico de solicitações</h2>
            <div className="space-y-2">
              {requests.filter((r) => r.status !== "pending").map((req) => (
                <div key={req.id} className="session-card flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-foreground text-sm">{patientNames[req.patient_id] ?? "Paciente"}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(req.requested_date)} às {req.requested_time}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${req.status === "confirmed" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                    {req.status === "confirmed" ? "Confirmado" : "Recusado"}
                  </span>
                </div>
              ))}
            </div>
          </motion.section>
        )}
      </div>
    </div>
  );
};

export default AvailabilitySettingsPage;
