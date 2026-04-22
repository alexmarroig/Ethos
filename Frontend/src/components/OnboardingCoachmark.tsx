import { Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";

type OnboardingCoachmarkProps = {
  title: string;
  description: string;
  onDismiss: () => void;
};

export default function OnboardingCoachmark({ title, description, onDismiss }: OnboardingCoachmarkProps) {
  return (
    <div className="mb-4 rounded-2xl border border-primary/35 bg-primary/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
            <Lightbulb className="h-3.5 w-3.5" /> Dica guiada
          </p>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onDismiss} className="h-7 px-2 text-xs">
          Entendi
        </Button>
      </div>
    </div>
  );
}
