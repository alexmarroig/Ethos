import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Moon, Plus, ChevronLeft, Trash2, Loader2, Star, Sparkles,
  Wind, CloudLightning, Eye, Users, MapPin, Lightbulb, Link2, RotateCcw, Sunrise,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { patientPortalService, type DreamDiaryEntry, type DreamDiaryEntryPayload } from "@/services/patientPortalService";
import { useToast } from "@/hooks/use-toast";
import IntegrationUnavailable from "@/components/IntegrationUnavailable";

/* ─── helpers ─────────────────────────────────────────── */
const formatDate = (iso: string) => {
  try {
    return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return iso;
  }
};

const today = () => new Date().toISOString().slice(0, 10);

/* ─── emotion options ─────────────────────────────────── */
const EMOTION_OPTIONS = [
  { value: "medo", label: "Medo", emoji: "😨" },
  { value: "alegria", label: "Alegria", emoji: "😊" },
  { value: "tristeza", label: "Tristeza", emoji: "😢" },
  { value: "ansiedade", label: "Ansiedade", emoji: "😰" },
  { value: "paz", label: "Paz", emoji: "😌" },
  { value: "raiva", label: "Raiva", emoji: "😠" },
  { value: "confusao", label: "Confusão", emoji: "😵" },
  { value: "nostalgia", label: "Nostalgia", emoji: "🥺" },
  { value: "euforia", label: "Euforia", emoji: "🤩" },
  { value: "culpa", label: "Culpa", emoji: "😞" },
  { value: "amor", label: "Amor", emoji: "❤️" },
  { value: "solidao", label: "Solidão", emoji: "🌑" },
];

const WAKE_OPTIONS: { value: DreamDiaryEntryPayload["wake_state"]; label: string; emoji: string }[] = [
  { value: "tranquilo", label: "Tranquilo", emoji: "😌" },
  { value: "agitado", label: "Agitado", emoji: "😤" },
  { value: "confuso", label: "Confuso", emoji: "😵" },
  { value: "assustado", label: "Assustado", emoji: "😨" },
  { value: "neutro", label: "Neutro", emoji: "😐" },
];

/* ─── empty form ──────────────────────────────────────── */
const emptyForm = (): DreamDiaryEntryPayload => ({
  dream_date: today(),
  title: "",
  narrative: "",
  emotions: [],
  emotional_intensity: 3,
  physical_sensations: "",
  characters: "",
  setting: "",
  patient_interpretation: "",
  associations: "",
  is_recurring: false,
  wake_state: "neutro",
});

/* ─── step configuration ──────────────────────────────── */
const STEPS = [
  { id: "basics", label: "O sonho", icon: Moon },
  { id: "emotions", label: "Emoções", icon: Star },
  { id: "details", label: "Detalhes", icon: Eye },
  { id: "reflection", label: "Reflexão", icon: Lightbulb },
];

type View = "list" | "form";

export default function DreamDiaryPage() {
  const { toast } = useToast();
  const [view, setView] = useState<View>("list");
  const [entries, setEntries] = useState<DreamDiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<{ message: string; requestId: string } | null>(null);

  // Form state
  const [form, setForm] = useState<DreamDiaryEntryPayload>(emptyForm());
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  /* load entries */
  useEffect(() => {
    void (async () => {
      setLoading(true);
      const result = await patientPortalService.getDreamDiary();
      setLoading(false);
      if (!result.success) {
        setApiError({ message: result.error.message, requestId: result.request_id });
        return;
      }
      setEntries(result.data);
    })();
  }, []);

  /* form helpers */
  const set = <K extends keyof DreamDiaryEntryPayload>(key: K, value: DreamDiaryEntryPayload[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleEmotion = (val: string) => {
    setForm((prev) => ({
      ...prev,
      emotions: prev.emotions.includes(val)
        ? prev.emotions.filter((e) => e !== val)
        : [...prev.emotions, val],
    }));
  };

  const canAdvance = () => {
    if (step === 0) return form.dream_date.length > 0 && form.narrative.trim().length > 0;
    if (step === 1) return form.emotions.length > 0;
    return true;
  };

  const handleSave = async () => {
    setSaving(true);
    const result = await patientPortalService.createDreamDiaryEntry(form);
    setSaving(false);
    if (!result.success) {
      toast({ title: "Erro ao salvar", description: result.error.message, variant: "destructive" });
      return;
    }
    setEntries((prev) => [result.data, ...prev]);
    setView("list");
    setForm(emptyForm());
    setStep(0);
    toast({ title: "Sonho registrado", description: "Seu diário foi salvo com sucesso." });
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const result = await patientPortalService.deleteDreamDiaryEntry(id);
    setDeletingId(null);
    if (!result.success) {
      toast({ title: "Erro ao excluir", variant: "destructive" });
      return;
    }
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  /* ─── render list ─────────────────────────────────────── */
  if (view === "list") {
    return (
      <div className="min-h-screen">
        <div className="content-container py-8 md:py-12">
          {/* header */}
          <motion.header
            className="mb-8"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-500">
                  <Moon className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="font-serif text-2xl font-medium text-foreground md:text-3xl">
                    Diário dos sonhos
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Registre e reflita sobre seus sonhos.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => { setForm(emptyForm()); setStep(0); setView("form"); }}
                className="gap-2 shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Novo sonho</span>
              </Button>
            </div>
          </motion.header>

          {apiError && <IntegrationUnavailable message={apiError.message} requestId={apiError.requestId} />}

          {loading ? (
            <div className="flex items-center gap-3 py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Carregando diário...</span>
            </div>
          ) : entries.length === 0 ? (
            <motion.div
              className="flex flex-col items-center justify-center py-20 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-500/10">
                <Moon className="h-8 w-8 text-indigo-400" />
              </div>
              <h2 className="font-serif text-xl text-foreground">Nenhum sonho registrado</h2>
              <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                Registrar seus sonhos pode revelar padrões importantes para o seu processo terapêutico.
              </p>
              <Button
                className="mt-6 gap-2"
                onClick={() => { setForm(emptyForm()); setStep(0); setView("form"); }}
              >
                <Plus className="h-4 w-4" />
                Registrar primeiro sonho
              </Button>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {entries.map((entry, i) => (
                <motion.article
                  key={entry.id}
                  className="session-card group"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  {/* top row */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10">
                        <Moon className="h-4 w-4 text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                          {formatDate(entry.dream_date)}
                        </p>
                        <h3 className="font-serif text-base font-medium text-foreground">
                          {entry.title || "Sonho sem título"}
                        </h3>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDelete(entry.id)}
                      disabled={deletingId === entry.id}
                      className="shrink-0 rounded-lg p-1.5 text-muted-foreground/40 opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                    >
                      {deletingId === entry.id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* narrative preview */}
                  <p className="mt-3 line-clamp-2 text-sm text-muted-foreground leading-relaxed">
                    {entry.narrative}
                  </p>

                  {/* meta */}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {/* emotions */}
                    {entry.emotions.slice(0, 4).map((emo) => {
                      const opt = EMOTION_OPTIONS.find((o) => o.value === emo);
                      return (
                        <span
                          key={emo}
                          className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-300"
                        >
                          {opt?.emoji} {opt?.label ?? emo}
                        </span>
                      );
                    })}
                    {entry.emotions.length > 4 && (
                      <span className="text-xs text-muted-foreground">+{entry.emotions.length - 4}</span>
                    )}
                    {/* intensity */}
                    <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="h-3 w-3" />
                      {"★".repeat(entry.emotional_intensity)}{"☆".repeat(5 - entry.emotional_intensity)}
                    </span>
                    {/* recurring */}
                    {entry.is_recurring && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                        <RotateCcw className="h-3 w-3" />
                        Recorrente
                      </span>
                    )}
                    {/* wake state */}
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] text-muted-foreground">
                      <Sunrise className="h-3 w-3" />
                      {WAKE_OPTIONS.find((w) => w.value === entry.wake_state)?.label ?? entry.wake_state}
                    </span>
                  </div>

                  {/* patient interpretation preview */}
                  {entry.patient_interpretation && (
                    <div className="mt-3 rounded-xl bg-amber-500/8 border border-amber-500/20 px-3 py-2.5">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                        Minha interpretação
                      </p>
                      <p className="line-clamp-2 text-sm text-foreground/80">{entry.patient_interpretation}</p>
                    </div>
                  )}
                </motion.article>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ─── render form ─────────────────────────────────────── */
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12 max-w-2xl">
        {/* back + progress */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button
            type="button"
            onClick={() => { setView("list"); setStep(0); }}
            className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar ao diário
          </button>

          {/* step indicators */}
          <div className="flex items-center gap-2 mb-3">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.id}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                    i === step
                      ? "bg-primary text-primary-foreground"
                      : i < step
                      ? "bg-primary/20 text-primary"
                      : "bg-secondary text-muted-foreground",
                  )}
                >
                  <Icon className="h-3 w-3" />
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
              );
            })}
          </div>

          {/* progress bar */}
          <div className="h-1.5 w-full rounded-full bg-secondary">
            <motion.div
              className="h-1.5 rounded-full bg-primary"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        </motion.div>

        {/* step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
          >
            {/* ── STEP 0: basics ── */}
            {step === 0 && (
              <div className="session-card space-y-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/15">
                    <Moon className="h-5 w-5 text-indigo-500" />
                  </div>
                  <div>
                    <h2 className="font-serif text-xl font-medium text-foreground">O sonho</h2>
                    <p className="text-sm text-muted-foreground">Quando ocorreu e o que aconteceu.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                      Data do sonho <span className="text-destructive">*</span>
                    </label>
                    <Input
                      type="date"
                      value={form.dream_date}
                      max={today()}
                      onChange={(e) => set("dream_date", e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                      Título ou resumo
                      <span className="ml-1 text-xs text-muted-foreground">(opcional)</span>
                    </label>
                    <Input
                      placeholder="Ex: A casa da infância, O corredor infinito..."
                      value={form.title ?? ""}
                      onChange={(e) => set("title", e.target.value)}
                      maxLength={80}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                      Narrativa do sonho <span className="text-destructive">*</span>
                    </label>
                    <p className="mb-2 text-xs text-muted-foreground">
                      Descreva o sonho como uma história, com o máximo de detalhes que conseguir lembrar.
                    </p>
                    <Textarea
                      placeholder="Eu estava em um lugar que parecia familiar, mas ao mesmo tempo diferente..."
                      value={form.narrative}
                      onChange={(e) => set("narrative", e.target.value)}
                      rows={6}
                      className="resize-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 1: emotions ── */}
            {step === 1 && (
              <div className="session-card space-y-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/15">
                    <Star className="h-5 w-5 text-rose-500" />
                  </div>
                  <div>
                    <h2 className="font-serif text-xl font-medium text-foreground">Emoções no sonho</h2>
                    <p className="text-sm text-muted-foreground">O que você sentiu durante o sonho?</p>
                  </div>
                </div>

                <div>
                  <label className="mb-3 block text-sm font-medium text-foreground">
                    Selecione todas que se aplicam <span className="text-destructive">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {EMOTION_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleEmotion(opt.value)}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-all",
                          form.emotions.includes(opt.value)
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                        )}
                      >
                        <span>{opt.emoji}</span>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Intensidade emocional
                  </label>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">Suave</span>
                    <div className="flex gap-2">
                      {([1, 2, 3, 4, 5] as const).map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => set("emotional_intensity", n)}
                          className={cn(
                            "h-8 w-8 rounded-full text-sm transition-all",
                            n <= form.emotional_intensity
                              ? "bg-primary text-primary-foreground scale-110"
                              : "bg-secondary text-muted-foreground hover:bg-primary/20",
                          )}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">Intenso</span>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Como você acordou?
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {WAKE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => set("wake_state", opt.value)}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-all",
                          form.wake_state === opt.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background text-muted-foreground hover:border-primary/40",
                        )}
                      >
                        <span>{opt.emoji}</span>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 2: details ── */}
            {step === 2 && (
              <div className="session-card space-y-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/15">
                    <Eye className="h-5 w-5 text-sky-500" />
                  </div>
                  <div>
                    <h2 className="font-serif text-xl font-medium text-foreground">Detalhes do sonho</h2>
                    <p className="text-sm text-muted-foreground">Todos os campos são opcionais.</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground">
                      <Wind className="h-3.5 w-3.5 text-muted-foreground" />
                      Sensações físicas
                    </label>
                    <Textarea
                      placeholder="Ex: Coração acelerado, leveza, peso no peito, calor, frio..."
                      value={form.physical_sensations ?? ""}
                      onChange={(e) => set("physical_sensations", e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      Personagens ou figuras presentes
                    </label>
                    <Textarea
                      placeholder="Ex: Minha mãe, um desconhecido, uma figura sombria, eu mesmo mais jovem..."
                      value={form.characters ?? ""}
                      onChange={(e) => set("characters", e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      Ambiente ou cenário
                    </label>
                    <Textarea
                      placeholder="Ex: A casa onde cresci, uma cidade estranha, um corredor escuro, céu aberto..."
                      value={form.setting ?? ""}
                      onChange={(e) => set("setting", e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                  </div>

                  <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/50 px-4 py-3">
                    <input
                      id="is_recurring"
                      type="checkbox"
                      checked={form.is_recurring}
                      onChange={(e) => set("is_recurring", e.target.checked)}
                      className="h-4 w-4 rounded accent-primary"
                    />
                    <label htmlFor="is_recurring" className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer">
                      <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
                      Este é um sonho recorrente (já tive antes)
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 3: reflection ── */}
            {step === 3 && (
              <div className="session-card space-y-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/15">
                    <Lightbulb className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <h2 className="font-serif text-xl font-medium text-foreground">Reflexão pessoal</h2>
                    <p className="text-sm text-muted-foreground">
                      O que você acha que este sonho pode significar?
                    </p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground">
                      <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                      Minha interpretação
                    </label>
                    <p className="mb-2 text-xs text-muted-foreground">
                      Não existe resposta certa. Compartilhe o que esse sonho parece dizer sobre o que você está vivendo.
                    </p>
                    <Textarea
                      placeholder="Acho que esse sonho pode estar relacionado com... Sinto que representa..."
                      value={form.patient_interpretation ?? ""}
                      onChange={(e) => set("patient_interpretation", e.target.value)}
                      rows={5}
                      className="resize-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground">
                      <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                      Isso me lembrou de...
                    </label>
                    <p className="mb-2 text-xs text-muted-foreground">
                      Memórias, situações, pessoas ou sentimentos que esse sonho trouxe à tona.
                    </p>
                    <Textarea
                      placeholder="Lembrei de uma situação da infância, de alguém, de um medo antigo..."
                      value={form.associations ?? ""}
                      onChange={(e) => set("associations", e.target.value)}
                      rows={4}
                      className="resize-none"
                    />
                  </div>

                  {/* summary preview */}
                  <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-indigo-400" />
                      <span className="text-sm font-medium text-indigo-600 dark:text-indigo-300">
                        Resumo do registro
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Data:</span> {formatDate(form.dream_date)}
                    </p>
                    {form.title && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Título:</span> {form.title}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Emoções:</span>{" "}
                      {form.emotions.length > 0
                        ? form.emotions.map((e) => EMOTION_OPTIONS.find((o) => o.value === e)?.label ?? e).join(", ")
                        : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Intensidade:</span>{" "}
                      {"★".repeat(form.emotional_intensity)}{"☆".repeat(5 - form.emotional_intensity)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Acordou:</span>{" "}
                      {WAKE_OPTIONS.find((w) => w.value === form.wake_state)?.label}
                    </p>
                    {form.is_recurring && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">⟳ Sonho recorrente</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* navigation buttons */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => step > 0 ? setStep(step - 1) : setView("list")}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            {step === 0 ? "Cancelar" : "Voltar"}
          </Button>

          {step < STEPS.length - 1 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canAdvance()}
              className="gap-2"
            >
              Próximo
              <CloudLightning className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={() => void handleSave()}
              disabled={saving}
              className="gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Moon className="h-4 w-4" />}
              Salvar sonho
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
