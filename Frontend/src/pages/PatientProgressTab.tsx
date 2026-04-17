import { useEffect, useState } from "react";
import { Plus, Trash2, Check, ChevronDown, ChevronUp, Target, ClipboardList, TrendingUp, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { goalsService, type TherapeuticGoal, type GoalMilestone, type GoalStatus } from "@/services/goalsService";
import { homeworkService, type HomeworkTask } from "@/services/homeworkService";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

type Props = {
  patientId: string;
  sessionCount: number;
  attendanceRate: number;
  weeksInTherapy: number;
};

const STATUS_LABEL: Record<GoalStatus, string> = {
  active: "Em andamento",
  achieved: "Concluído",
  paused: "Pausado",
  abandoned: "Abandonado",
};

const STATUS_COLOR: Record<GoalStatus, string> = {
  active: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  achieved: "bg-green-500/10 text-green-400 border-green-500/20",
  paused: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  abandoned: "bg-red-500/10 text-red-400 border-red-500/20",
};

function buildWeeklyChart(tasks: HomeworkTask[]) {
  const weeks: Record<number, { total: number; done: number }> = {};
  for (const t of tasks) {
    if (!weeks[t.week_number]) weeks[t.week_number] = { total: 0, done: 0 };
    weeks[t.week_number].total++;
    if (t.completed) weeks[t.week_number].done++;
  }
  return Object.entries(weeks)
    .sort(([a], [b]) => Number(a) - Number(b))
    .slice(-8)
    .map(([week, { total, done }]) => ({
      week: `Sem. ${week}`,
      taxa: total === 0 ? 0 : Math.round((done / total) * 100),
    }));
}

export default function PatientProgressTab({ patientId, sessionCount, attendanceRate, weeksInTherapy }: Props) {
  const { toast } = useToast();
  const [goals, setGoals] = useState<TherapeuticGoal[]>([]);
  const [homework, setHomework] = useState<HomeworkTask[]>([]);
  const [loadingGoals, setLoadingGoals] = useState(true);
  const [loadingHw, setLoadingHw] = useState(true);

  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalDesc, setNewGoalDesc] = useState("");
  const [addingGoal, setAddingGoal] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);

  const [newHwTitle, setNewHwTitle] = useState("");
  const [newHwDue, setNewHwDue] = useState("");
  const [addingHw, setAddingHw] = useState(false);
  const [showHwForm, setShowHwForm] = useState(false);

  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);
  const [newMilestone, setNewMilestone] = useState<Record<string, string>>({});

  useEffect(() => {
    goalsService.list(patientId).then((r) => {
      if (r.success) setGoals(r.data);
      setLoadingGoals(false);
    });
    homeworkService.list(patientId).then((r) => {
      if (r.success) setHomework(r.data);
      setLoadingHw(false);
    });
  }, [patientId]);

  const handleAddGoal = async () => {
    if (!newGoalTitle.trim()) return;
    setAddingGoal(true);
    const r = await goalsService.create(patientId, newGoalTitle.trim(), newGoalDesc.trim() || undefined);
    setAddingGoal(false);
    if (r.success) {
      setGoals((prev) => [r.data, ...prev]);
      setNewGoalTitle("");
      setNewGoalDesc("");
      setShowGoalForm(false);
    } else {
      toast({ title: "Erro ao criar objetivo", variant: "destructive" });
    }
  };

  const handleUpdateProgress = async (goal: TherapeuticGoal, progress: number) => {
    const r = await goalsService.update(goal.id, { progress });
    if (r.success) setGoals((prev) => prev.map((g) => (g.id === goal.id ? r.data : g)));
  };

  const handleUpdateStatus = async (goal: TherapeuticGoal, status: GoalStatus) => {
    const r = await goalsService.update(goal.id, { status });
    if (r.success) setGoals((prev) => prev.map((g) => (g.id === goal.id ? r.data : g)));
  };

  const handleDeleteGoal = async (goalId: string) => {
    const r = await goalsService.delete(goalId);
    if (r.success) setGoals((prev) => prev.filter((g) => g.id !== goalId));
  };

  const handleAddMilestone = async (goal: TherapeuticGoal) => {
    const title = (newMilestone[goal.id] ?? "").trim();
    if (!title) return;
    const milestone: GoalMilestone = {
      id: crypto.randomUUID(),
      title,
      achieved: false,
    };
    const r = await goalsService.update(goal.id, { milestones: [...goal.milestones, milestone] });
    if (r.success) {
      setGoals((prev) => prev.map((g) => (g.id === goal.id ? r.data : g)));
      setNewMilestone((prev) => ({ ...prev, [goal.id]: "" }));
    }
  };

  const handleToggleMilestone = async (goal: TherapeuticGoal, milestoneId: string) => {
    const milestones = goal.milestones.map((m) =>
      m.id === milestoneId
        ? { ...m, achieved: !m.achieved, achieved_at: !m.achieved ? new Date().toISOString() : undefined }
        : m,
    );
    const r = await goalsService.update(goal.id, { milestones });
    if (r.success) setGoals((prev) => prev.map((g) => (g.id === goal.id ? r.data : g)));
  };

  const handleAddHw = async () => {
    if (!newHwTitle.trim()) return;
    setAddingHw(true);
    const r = await homeworkService.create(patientId, newHwTitle.trim(), undefined, newHwDue || undefined);
    setAddingHw(false);
    if (r.success) {
      setHomework((prev) => [r.data, ...prev]);
      setNewHwTitle("");
      setNewHwDue("");
      setShowHwForm(false);
    } else {
      toast({ title: "Erro ao criar tarefa", variant: "destructive" });
    }
  };

  const handleToggleHw = async (task: HomeworkTask) => {
    const r = await homeworkService.update(task.id, { completed: !task.completed });
    if (r.success) setHomework((prev) => prev.map((t) => (t.id === task.id ? r.data : t)));
  };

  const handleDeleteHw = async (taskId: string) => {
    const r = await homeworkService.delete(taskId);
    if (r.success) setHomework((prev) => prev.filter((t) => t.id !== taskId));
  };

  const chartData = buildWeeklyChart(homework);
  const pendingHw = homework.filter((t) => !t.completed).length;
  const doneHw = homework.filter((t) => t.completed).length;

  return (
    <div className="space-y-6 py-2">
      {/* Métricas rápidas */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { icon: <Calendar className="w-4 h-4" />, value: sessionCount, label: "Sessões realizadas" },
          { icon: <TrendingUp className="w-4 h-4" />, value: `${Math.round(attendanceRate * 100)}%`, label: "Taxa de presença" },
          { icon: <Target className="w-4 h-4" />, value: weeksInTherapy, label: "Semanas em terapia" },
          { icon: <ClipboardList className="w-4 h-4" />, value: `${doneHw}/${doneHw + pendingHw}`, label: "Tarefas concluídas" },
        ].map(({ icon, value, label }) => (
          <div key={label} className="rounded-xl border border-border bg-background/60 p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">{icon}<span className="text-xs">{label}</span></div>
            <p className="font-serif text-2xl text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {/* Objetivos Terapêuticos */}
      <section className="session-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif text-xl text-foreground">Objetivos Terapêuticos</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Metas do processo terapêutico com acompanhamento de progresso.</p>
          </div>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowGoalForm((v) => !v)}>
            <Plus className="w-4 h-4" />
            Novo objetivo
          </Button>
        </div>

        {showGoalForm && (
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
            <Input placeholder="Título do objetivo" value={newGoalTitle} onChange={(e) => setNewGoalTitle(e.target.value)} />
            <Textarea placeholder="Descrição (opcional)" value={newGoalDesc} onChange={(e) => setNewGoalDesc(e.target.value)} className="min-h-[80px]" />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowGoalForm(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleAddGoal} disabled={addingGoal || !newGoalTitle.trim()}>Adicionar</Button>
            </div>
          </div>
        )}

        {loadingGoals ? (
          <div className="h-16 rounded-xl bg-muted/30 animate-pulse" />
        ) : goals.length === 0 ? (
          <div className="rounded-xl border border-border bg-muted/30 p-6 text-sm text-muted-foreground text-center">
            Nenhum objetivo cadastrado ainda.
          </div>
        ) : (
          <div className="space-y-3">
            {goals.map((goal) => (
              <div key={goal.id} className="rounded-xl border border-border bg-background/60 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-foreground">{goal.title}</p>
                      <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[goal.status]}`}>
                        {STATUS_LABEL[goal.status]}
                      </span>
                    </div>
                    {goal.description && (
                      <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setExpandedGoal(expandedGoal === goal.id ? null : goal.id)}>
                      {expandedGoal === goal.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteGoal(goal.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Barra de progresso */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Progresso</span>
                    <span>{goal.progress}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                  <input
                    type="range" min={0} max={100} step={5}
                    value={goal.progress}
                    onChange={(e) => handleUpdateProgress(goal, Number(e.target.value))}
                    className="w-full accent-primary cursor-pointer"
                  />
                </div>

                {/* Status selector */}
                <div className="flex gap-2 flex-wrap">
                  {(["active", "achieved", "paused", "abandoned"] as GoalStatus[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => handleUpdateStatus(goal, s)}
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-opacity ${STATUS_COLOR[s]} ${goal.status === s ? "opacity-100" : "opacity-40 hover:opacity-70"}`}
                    >
                      {STATUS_LABEL[s]}
                    </button>
                  ))}
                </div>

                {/* Milestones (expandido) */}
                {expandedGoal === goal.id && (
                  <div className="space-y-2 border-t border-border pt-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Marcos</p>
                    {goal.milestones.length === 0 && (
                      <p className="text-xs text-muted-foreground">Nenhum marco ainda.</p>
                    )}
                    {goal.milestones.map((m) => (
                      <div key={m.id} className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleMilestone(goal, m.id)}
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            m.achieved ? "border-green-500 bg-green-500" : "border-muted-foreground"
                          }`}
                        >
                          {m.achieved && <Check className="w-3 h-3 text-white" />}
                        </button>
                        <span className={`text-sm ${m.achieved ? "line-through text-muted-foreground" : "text-foreground"}`}>{m.title}</span>
                      </div>
                    ))}
                    <div className="flex gap-2 mt-2">
                      <Input
                        placeholder="Novo marco..."
                        value={newMilestone[goal.id] ?? ""}
                        onChange={(e) => setNewMilestone((prev) => ({ ...prev, [goal.id]: e.target.value }))}
                        className="h-8 text-sm"
                        onKeyDown={(e) => e.key === "Enter" && handleAddMilestone(goal)}
                      />
                      <Button size="sm" variant="outline" className="h-8 px-3" onClick={() => handleAddMilestone(goal)}>
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Homework */}
      <section className="session-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif text-xl text-foreground">Homework / Tarefas</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Atividades atribuídas para realização entre as sessões.</p>
          </div>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowHwForm((v) => !v)}>
            <Plus className="w-4 h-4" />
            Nova tarefa
          </Button>
        </div>

        {showHwForm && (
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
            <Input placeholder="Título da tarefa" value={newHwTitle} onChange={(e) => setNewHwTitle(e.target.value)} />
            <Input type="date" value={newHwDue} onChange={(e) => setNewHwDue(e.target.value)} className="text-sm" />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowHwForm(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleAddHw} disabled={addingHw || !newHwTitle.trim()}>Adicionar</Button>
            </div>
          </div>
        )}

        {/* Gráfico semanal */}
        {chartData.length > 0 && (
          <div className="rounded-xl border border-border bg-background/60 p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Taxa de conclusão por semana (%)</p>
            <ResponsiveContainer width="100%" height={80}>
              <BarChart data={chartData} barSize={20}>
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "#1e1e2e", border: "1px solid #313244", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [`${v}%`, "Conclusão"]}
                />
                <Bar dataKey="taxa" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.taxa >= 70 ? "#7c3aed" : entry.taxa >= 40 ? "#7c3aed88" : "#7c3aed33"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {loadingHw ? (
          <div className="h-16 rounded-xl bg-muted/30 animate-pulse" />
        ) : homework.length === 0 ? (
          <div className="rounded-xl border border-border bg-muted/30 p-6 text-sm text-muted-foreground text-center">
            Nenhuma tarefa cadastrada ainda.
          </div>
        ) : (
          <div className="space-y-2">
            {homework.map((task) => (
              <div key={task.id} className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-opacity ${task.completed ? "border-border opacity-60" : "border-border bg-background/60"}`}>
                <button
                  onClick={() => handleToggleHw(task)}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    task.completed ? "border-green-500 bg-green-500" : "border-muted-foreground hover:border-primary"
                  }`}
                >
                  {task.completed && <Check className="w-3 h-3 text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {task.title}
                  </p>
                  {task.due_date && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Prazo: {new Date(task.due_date + "T00:00:00").toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0" onClick={() => handleDeleteHw(task.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
