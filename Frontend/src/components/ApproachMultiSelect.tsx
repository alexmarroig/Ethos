import { APPROACHES, APPROACH_LABELS, APPROACH_COLORS, type Approach } from '../types/approach';
import { cn } from '../lib/utils';

interface ApproachMultiSelectProps {
  value: Approach[];
  onChange: (approaches: Approach[]) => void;
}

export function ApproachMultiSelect({ value, onChange }: ApproachMultiSelectProps) {
  const toggle = (approach: Approach) => {
    if (value.includes(approach)) {
      onChange(value.filter(a => a !== approach));
    } else {
      onChange([...value, approach]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {APPROACHES.map(approach => {
        const selected = value.includes(approach);
        return (
          <button
            key={approach}
            type="button"
            onClick={() => toggle(approach)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-150',
              selected
                ? APPROACH_COLORS[approach]
                : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground',
            )}
          >
            {APPROACH_LABELS[approach]}
          </button>
        );
      })}
    </div>
  );
}
