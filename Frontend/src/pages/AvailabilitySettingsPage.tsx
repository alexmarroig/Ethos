import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Loader2,
  Trash2,
  XCircle,
  Users,
  Clock,
  ChevronDown,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { availabilityService, type AvailabilityBlock, type SlotRequestItem } from "@/services/availabilityService";
import { patientService } from "@/services/patientService";
import { useToast } from "@/hooks/use-toast";
import type { Patient } from "@/services/patientService";

const DAY_NAMES_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DAY_NAMES_FULL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
// Mon–Fri displayed first, then Sat, Sun
const DISPLAY_DAYS: Array<0 | 1 | 2 | 3 | 4 | 5 | 6> = [1, 2, 3, 4, 5, 6, 0];
const HOUR_START = 7;
const HOUR_END = 21;
const HOURS = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);

const timeToMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

const minutesToTime = (m: number) => {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
};

const formatDateShort = (iso: string) => {
  try {
    return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
  } catch {
    return iso;
  }
};

// Colors per block index for visual variety
const BLOCK_COLORS = [
  { bg: "bg-primary/15 border-primary/30", text: "text-primary", dot: "bg-primary" },
  { bg: "bg-emerald-500/15 border-emerald-500/30", text: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" },
  { bg: "bg-violet-500/15 border-violet-500/30", text: "text-violet-600 dark:text-violet-400", dot: "bg-violet-500" },
  { bg: "bg-amber-500/15 border-amber-500/30", text: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500" },
  { bg: "bg-rose-500/15 border-rose-500/30", text: "text-rose-600 dark:text-rose-400", dot: "bg-rose-500" },
];

interface DraftBlock {
  day_of_week: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  start_hour: number;
  end_hour: number;
  slot_duration_minutes: number;
  patient_ids: string[];
}

interface PatientPickerProps {
  patients: Patient[];
  selected: string[];
  onChange: (ids: string[]) => void;
}

const PatientPicker = ({ patients, selected, onChange }: PatientPickerProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-muted-foreground hover:border-primary/40 transition-colors w-full"
      >
        <Users className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 text-left truncate">
          {selected.length === 0
            ? "Todos os pacientes"
            : selected.length === 1
            ? patients.find((p) => p.id === selected[0])?.name ?? "1 paciente"
            : `${selected.length} pacientes`}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-card shadow-xl overflow-hidden max-h-48 overflow-y-auto"
          >
            <button
              type="button"
              onClick={() => { onChange([]); setOpen(false); }}
              className={`w-full px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted ${selected.length === 0 ? "font-medium text-foreground" : "text-muted-foreground"}`}
            >
              Todos os pacientes
            </button>
            {patients.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(p.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted ${selected.includes(p.id) ? "text-foreground font-medium" : "text-muted-foreground"}`}
              >
                <span>{p.name}</span>
                {selected.includes(p.id) && <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Block panel shown when a cell is clicked
interface BlockPanelProps {
  draft: DraftBlock | null;
  patients: Patient[];
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
  onChange: (d: DraftBlock) => void;
  existingBlock: AvailabilityBlock | null;
  onDelete: () => void;
  colorIdx: number;
}

const BlockPanel = ({ draft, patients, saving, onSave, onClose, onChange, existingBlock, onDelete, colorIdx }: BlockPanelProps) => {
  if (!draft) return null;
  const color = BLOCK_COLORS[colorIdx % BLOCK_COLORS.length]!;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-lg"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`h-3 w-3 rounded-full ${color.dot}`} />
          <span className="font-medium text-foreground text-sm">
            {existingBlock ? "Editar bloco" : "Novo bloco"} · {DAY_NAMES_FULL[draft.day_of_week]}
          </span>
        </div>
        <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Time range */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 block">Início</label>
          <select
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            value={draft.start_hour}
            onChange={(e) => onChange({ ...draft, start_hour: Number(e.target.value) })}
          >
            {HOURS.filter((h) => h < draft.end_hour).map((h) => (
              <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 block">Fim</label>
          <select
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            value={draft.end_hour}
            onChange={(e) => onChange({ ...draft, end_hour: Number(e.target.value) })}
          >
            {HOURS.filter((h) => h > draft.start_hour).map((h) => (
              <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
            ))}
          </select>
        </div>
      </div>

      {/* Slot duration */}
      <div>
        <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 block">
          <Clock className="inline h-3 w-3 mr-1" />Duração por slot
        </label>
        <div className="flex gap-2 flex-wrap">
          {[30, 45, 50, 60, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onChange({ ...draft, slot_duration_minutes: d })}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors border ${draft.slot_duration_minutes === d ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}
            >
              {d} min
            </button>
          ))}
        </div>
      </div>

      {/* Patient picker */}
      {patients.length > 0 && (
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 block">Disponível para</label>
          <PatientPicker
            patients={patients}
            selected={draft.patient_ids}
            onChange={(ids) => onChange({ ...draft, patient_ids: ids })}
          />
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button onClick={onSave} disabled={saving} className="flex-1 gap-1.5">
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {existingBlock ? "Atualizar" : "Salvar bloco"}
        </Button>
        {existingBlock && (
          <Button variant="ghost" size="icon" onClick={onDelete} className="text-destructive hover:bg-destructive/10">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </motion.div>
  );
};

const AvailabilitySettingsPage = () => {
  const { toast } = useToast();
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [requests, setRequests] = useState<SlotRequestItem[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientNames, setPatientNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Draft state for the click-to-create panel
  const [draft, setDraft] = useState<DraftBlock | null>(null);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);

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
        setPatients(patientsRes.data);
        const map: Record<string, string> = {};
        for (const p of patientsRes.data) map[p.id] = p.name;
        setPatientNames(map);
      }
      setLoading(false);
    };
    void load();
  }, []);

  const handleCellClick = (dow: 0 | 1 | 2 | 3 | 4 | 5 | 6, hour: number) => {
    // Check if there's already a block covering this cell
    const existing = blocks.find(
      (b) => b.day_of_week === dow && timeToMinutes(b.start_time) <= hour * 60 && timeToMinutes(b.end_time) > hour * 60,
    );
    if (existing) {
      setEditingBlockId(existing.id);
      setDraft({
        day_of_week: existing.day_of_week,
        start_hour: Math.floor(timeToMinutes(existing.start_time) / 60),
        end_hour: Math.ceil(timeToMinutes(existing.end_time) / 60),
        slot_duration_minutes: existing.slot_duration_minutes,
        patient_ids: existing.patient_ids ?? [],
      });
    } else {
      setEditingBlockId(null);
      setDraft({
        day_of_week: dow,
        start_hour: hour,
        end_hour: Math.min(hour + 2, HOUR_END),
        slot_duration_minutes: 50,
        patient_ids: [],
      });
    }
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    const payload = {
      day_of_week: draft.day_of_week,
      start_time: minutesToTime(draft.start_hour * 60),
      end_time: minutesToTime(draft.end_hour * 60),
      slot_duration_minutes: draft.slot_duration_minutes,
      patient_ids: draft.patient_ids,
      enabled: true,
    };

    if (editingBlockId) {
      const res = await availabilityService.update(editingBlockId, payload);
      setSaving(false);
      if (res.success) {
        setBlocks((prev) => prev.map((b) => (b.id === editingBlockId ? res.data : b)));
        toast({ title: "Bloco atualizado" });
        setDraft(null);
        setEditingBlockId(null);
      } else {
        toast({ title: "Erro", description: res.error.message, variant: "destructive" });
      }
    } else {
      const res = await availabilityService.create(payload);
      setSaving(false);
      if (res.success) {
        setBlocks((prev) => [...prev, res.data]);
        toast({ title: "Bloco de horário adicionado" });
        setDraft(null);
      } else {
        toast({ title: "Erro", description: res.error.message, variant: "destructive" });
      }
    }
  };

  const handleDelete = async (id?: string) => {
    const targetId = id ?? editingBlockId;
    if (!targetId) return;
    const res = await availabilityService.delete(targetId);
    if (res.success) {
      setBlocks((prev) => prev.filter((b) => b.id !== targetId));
      setDraft(null);
      setEditingBlockId(null);
      toast({ title: "Bloco removido" });
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

  // For grid: determine which cells are "filled" and by which block (for coloring)
  const blockColorMap: Record<string, number> = {};
  blocks.forEach((b, i) => { blockColorMap[b.id] = i; });

  const cellHasBlock = (dow: number, hour: number) =>
    blocks.find(
      (b) =>
        b.day_of_week === dow &&
        b.enabled &&
        timeToMinutes(b.start_time) <= hour * 60 &&
        timeToMinutes(b.end_time) > hour * 60,
    );

  const editingBlock = editingBlockId ? blocks.find((b) => b.id === editingBlockId) ?? null : null;

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12">
        <motion.header className="mb-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-serif text-3xl md:text-4xl font-medium text-foreground">Disponibilidade</h1>
          <p className="mt-2 text-muted-foreground">
            Clique nas células para criar ou editar blocos de horário. Pacientes podem solicitar sessões nos blocos ativos.
          </p>
        </motion.header>

        <div className="flex gap-6 items-start">
          {/* Weekly grid */}
          <motion.div
            className="flex-1 min-w-0"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              {/* Header row: day names */}
              <div className="grid border-b border-border" style={{ gridTemplateColumns: "3rem repeat(7, 1fr)" }}>
                <div className="border-r border-border" />
                {DISPLAY_DAYS.map((dow) => (
                  <div
                    key={dow}
                    className="py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-r border-border last:border-r-0"
                  >
                    {DAY_NAMES_SHORT[dow]}
                  </div>
                ))}
              </div>

              {/* Hour rows */}
              <div className="overflow-y-auto max-h-[500px]">
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="grid border-b border-border/50 last:border-b-0"
                    style={{ gridTemplateColumns: "3rem repeat(7, 1fr)" }}
                  >
                    {/* Hour label */}
                    <div className="flex items-center justify-center border-r border-border/50 py-2">
                      <span className="text-[10px] text-muted-foreground/60 font-mono">{String(hour).padStart(2, "0")}h</span>
                    </div>
                    {/* Day cells */}
                    {DISPLAY_DAYS.map((dow) => {
                      const block = cellHasBlock(dow, hour);
                      const colorIdx = block ? (blockColorMap[block.id] ?? 0) : 0;
                      const color = BLOCK_COLORS[colorIdx % BLOCK_COLORS.length]!;
                      const isEditing = block && block.id === editingBlockId;
                      const isDraftCell =
                        draft &&
                        draft.day_of_week === dow &&
                        !editingBlockId &&
                        draft.start_hour <= hour &&
                        draft.end_hour > hour;

                      return (
                        <button
                          key={dow}
                          type="button"
                          onClick={() => handleCellClick(dow, hour)}
                          className={[
                            "border-r border-border/30 last:border-r-0 h-8 transition-all relative group",
                            block
                              ? `${color.bg} border ${isEditing ? "ring-2 ring-primary/50 ring-inset" : ""}`
                              : isDraftCell
                              ? "bg-primary/10 border border-primary/20"
                              : "hover:bg-muted/50",
                          ].join(" ")}
                        >
                          {block && block.patient_ids && block.patient_ids.length > 0 && timeToMinutes(block.start_time) === hour * 60 && (
                            <span className="absolute top-0.5 right-1 text-[8px] text-muted-foreground font-medium">
                              {block.patient_ids.length}p
                            </span>
                          )}
                          {!block && (
                            <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 text-muted-foreground/40 text-xs">
                              +
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-primary/20 border border-primary/30 inline-block" />
                Bloco ativo
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block text-muted-foreground/50">Clique</span> para criar ou editar
              </span>
              {blocks.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <Users className="h-3 w-3" />
                  Nº = pacientes restritos
                </span>
              )}
            </div>

            {/* Existing blocks summary */}
            {blocks.length > 0 && (
              <div className="mt-6 space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Blocos configurados</h3>
                {blocks.map((block, i) => {
                  const color = BLOCK_COLORS[i % BLOCK_COLORS.length]!;
                  return (
                    <div
                      key={block.id}
                      onClick={() => {
                        setEditingBlockId(block.id);
                        setDraft({
                          day_of_week: block.day_of_week,
                          start_hour: Math.floor(timeToMinutes(block.start_time) / 60),
                          end_hour: Math.ceil(timeToMinutes(block.end_time) / 60),
                          slot_duration_minutes: block.slot_duration_minutes,
                          patient_ids: block.patient_ids ?? [],
                        });
                      }}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card/50 px-4 py-3 hover:border-primary/30 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-2.5 w-2.5 rounded-full ${color.dot}`} />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {DAY_NAMES_FULL[block.day_of_week]} · {block.start_time}–{block.end_time}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Slots de {block.slot_duration_minutes} min
                            {block.patient_ids && block.patient_ids.length > 0 && (
                              <> · {block.patient_ids.map((id) => patientNames[id] ?? id).join(", ")}</>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${block.enabled ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                          {block.enabled ? "Ativo" : "Inativo"}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); void handleDelete(block.id); }}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Side panel */}
          <div className="w-72 shrink-0 space-y-4">
            <AnimatePresence mode="wait">
              {draft ? (
                <BlockPanel
                  key="panel"
                  draft={draft}
                  patients={patients}
                  saving={saving}
                  onSave={() => void handleSave()}
                  onClose={() => { setDraft(null); setEditingBlockId(null); }}
                  onChange={setDraft}
                  existingBlock={editingBlock}
                  onDelete={() => void handleDelete()}
                  colorIdx={editingBlock ? (blockColorMap[editingBlock.id] ?? 0) : blocks.length}
                />
              ) : (
                <motion.div
                  key="hint"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="rounded-2xl border border-dashed border-border bg-card/30 p-6 text-center"
                >
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Clique em qualquer célula</p>
                  <p className="mt-1 text-xs text-muted-foreground">para criar um novo bloco de horário disponível</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Pending requests */}
            {pendingRequests.length > 0 && (
              <motion.div
                className="rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/10 p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <h3 className="mb-3 text-sm font-semibold text-amber-800 dark:text-amber-400 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-200 dark:bg-amber-800 text-[10px] font-bold">
                    {pendingRequests.length}
                  </span>
                  Solicitações pendentes
                </h3>
                <div className="space-y-3">
                  {pendingRequests.map((req) => (
                    <div key={req.id} className="space-y-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">{patientNames[req.patient_id] ?? "Paciente"}</p>
                        <p className="text-xs text-muted-foreground">{formatDateShort(req.requested_date)} às {req.requested_time}</p>
                      </div>
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          className="flex-1 h-7 text-xs gap-1"
                          onClick={() => void handleRespond(req, true)}
                          disabled={responding === req.id}
                        >
                          {responding === req.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                          Aceitar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-7 text-xs gap-1"
                          onClick={() => void handleRespond(req, false)}
                          disabled={responding === req.id}
                        >
                          <XCircle className="h-3 w-3" />
                          Recusar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Historical requests */}
            {requests.filter((r) => r.status !== "pending").length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Histórico</h3>
                <div className="space-y-2">
                  {requests.filter((r) => r.status !== "pending").slice(0, 5).map((req) => (
                    <div key={req.id} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card/50 px-3 py-2">
                      <div>
                        <p className="text-xs font-medium text-foreground">{patientNames[req.patient_id] ?? "Paciente"}</p>
                        <p className="text-[10px] text-muted-foreground">{formatDateShort(req.requested_date)}</p>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${req.status === "confirmed" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                        {req.status === "confirmed" ? "✓" : "✕"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvailabilitySettingsPage;
