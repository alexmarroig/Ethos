import { Bell, CheckCircle2, ClipboardList, Copy, Scale, ShieldAlert, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  formatPreSessionBriefingText,
  formatPreSessionDate,
  type PreSessionBriefing,
} from "@/services/preSessionBriefingService";
import { cn } from "@/lib/utils";

type PreSessionBriefingPanelProps = {
  briefing: PreSessionBriefing;
  compact?: boolean;
  onCopy?: () => void;
  onNotify?: () => void;
  onOpenPatient?: () => void;
};

const emptyText = "Nao registrado.";

export function PreSessionBriefingPanel({
  briefing,
  compact = false,
  onCopy,
  onNotify,
  onOpenPatient,
}: PreSessionBriefingPanelProps) {
  const text = formatPreSessionBriefingText(briefing);
  const highPriorityNotes = briefing.supervisionHighlights.filter((note) => note.pinned || note.priority === "high");

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Pre-sessao inteligente</p>
            <h3 className="mt-1 font-serif text-2xl text-foreground">{briefing.patientName}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{formatPreSessionDate(briefing.sessionAt)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {onOpenPatient ? (
              <Button variant="secondary" size="sm" onClick={onOpenPatient}>
                Abrir ficha
              </Button>
            ) : null}
            {onCopy ? (
              <Button variant="outline" size="sm" className="gap-2" onClick={onCopy}>
                <Copy className="h-4 w-4" />
                Copiar
              </Button>
            ) : null}
            {onNotify ? (
              <Button variant="outline" size="sm" className="gap-2" onClick={onNotify}>
                <Bell className="h-4 w-4" />
                Notificar agora
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className={cn("grid gap-3", compact ? "md:grid-cols-2" : "lg:grid-cols-2")}>
        <BriefingCard title="Queixa principal" icon={<ClipboardList className="h-4 w-4" />}>
          {briefing.mainComplaint || emptyText}
        </BriefingCard>
        <BriefingCard title="Evolucao clinica" icon={<Sparkles className="h-4 w-4" />}>
          {briefing.clinicalEvolution || "Sem sintese registrada."}
        </BriefingCard>
      </div>

      <div className="rounded-xl border border-border bg-background/70 p-4">
        <div className="mb-3 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-primary" />
          <h4 className="font-medium text-foreground">Supervisao e pontos para levar</h4>
        </div>
        {briefing.supervisionHighlights.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem anotacoes de supervisao registradas.</p>
        ) : (
          <div className="space-y-3">
            {briefing.supervisionHighlights.map((note) => (
              <div
                key={note.id}
                className={cn(
                  "rounded-lg border p-3 text-sm",
                  note.pinned || note.priority === "high" ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-foreground">{note.title}</p>
                  {note.pinned ? <Badge>Fixada</Badge> : null}
                  {note.priority === "high" ? <Badge tone="danger">Alta</Badge> : null}
                </div>
                {note.focus ? <p className="mt-1 text-xs text-muted-foreground">Foco: {note.focus}</p> : null}
                <p className="mt-2 leading-6 text-foreground">{note.content}</p>
                {note.nextSessionPrompt ? (
                  <p className="mt-2 rounded-md bg-background/70 p-2 text-foreground">
                    <strong>Levar para a sessao:</strong> {note.nextSessionPrompt}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <ListCard title="Tarefas" items={briefing.tasks.map((task) => task.title)} empty="Sem tarefas pendentes." />
        <ListCard
          title="Escalas"
          icon={<Scale className="h-4 w-4" />}
          items={briefing.scaleHighlights.map((scale) => `${scale.scaleId}: ${scale.score}`)}
          empty="Sem escalas recentes."
        />
        <ListCard title="Alertas" items={briefing.adminAlerts} empty="Sem alertas administrativos." />
      </div>

      {!compact ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Texto completo</p>
          <Textarea value={text} readOnly className="min-h-[260px] font-mono text-sm" />
        </div>
      ) : highPriorityNotes.length > 0 ? (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-foreground">
          <strong>Prioridade:</strong> {highPriorityNotes[0].nextSessionPrompt || highPriorityNotes[0].content}
        </div>
      ) : null}
    </div>
  );
}

function BriefingCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-background/70 p-4">
      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-wide">{title}</p>
      </div>
      <p className="line-clamp-5 text-sm leading-6 text-foreground">{children}</p>
    </div>
  );
}

function ListCard({
  title,
  items,
  empty,
  icon = <CheckCircle2 className="h-4 w-4" />,
}: {
  title: string;
  items: string[];
  empty: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-background/70 p-4">
      <div className="mb-3 flex items-center gap-2 text-muted-foreground">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-wide">{title}</p>
      </div>
      {items.length ? (
        <ul className="space-y-2 text-sm text-foreground">
          {items.slice(0, 4).map((item) => (
            <li key={item} className="leading-5">- {item}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}

function Badge({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "danger" }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        tone === "danger" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
      )}
    >
      {children}
    </span>
  );
}
