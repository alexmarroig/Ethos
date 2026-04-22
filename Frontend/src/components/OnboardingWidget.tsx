import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { cn } from "@/lib/utils";

export default function OnboardingWidget() {
  const {
    state,
    progress,
    conversionRate,
    pauseOnboarding,
    resumeOnboarding,
    disableOnboarding,
  } = useOnboarding();

  if (!state || state.disabled) return null;

  const total = state.missions.length;
  const current = state.missions.find((mission) => !mission.completedAt);
  const pct = Math.round((progress / total) * 100);

  return (
    <aside className="hidden xl:block fixed right-5 top-24 z-40 w-80 rounded-2xl border border-border/70 bg-card/95 p-4 shadow-lg backdrop-blur-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/80">Onboarding inicial</p>
      <h3 className="mt-1 text-lg font-semibold text-foreground">Progresso {progress}/{total}</h3>
      <Progress value={pct} className="mt-3 h-2" />
      <p className="mt-2 text-xs text-muted-foreground">Conversão atual: {conversionRate}% das missões principais.</p>

      {current ? (
        <div className="mt-4 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3">
          <p className="text-xs text-muted-foreground">Próxima missão</p>
          <p className="font-medium text-sm text-foreground">{current.title}</p>
          <p className="text-xs text-muted-foreground mt-1">{current.description}</p>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
          Onboarding concluído. Excelente início!
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={state.paused ? resumeOnboarding : pauseOnboarding}
          className={cn("justify-start", state.paused && "border-primary text-primary")}
        >
          {state.paused ? "Retomar onboarding" : "Continuar depois"}
        </Button>
        <Button variant="ghost" size="sm" onClick={disableOnboarding} className="justify-start text-muted-foreground hover:text-destructive">
          Desativar onboarding
        </Button>
      </div>
    </aside>
  );
}
