import { Package } from 'lucide-react';
import { APPROACH_FULL_LABELS, APPROACH_COLORS, type Approach } from '../types/approach';
import { cn } from '../lib/utils';

interface PackageBannerItem {
  id: string;
  title: string;
  description: string;
}

interface PackageBannerProps {
  approach: Approach;
  items: PackageBannerItem[];
  onAssign: (item: PackageBannerItem) => void;
  assignLabel?: string;
}

export function PackageBanner({ approach, items, onAssign, assignLabel = 'Atribuir' }: PackageBannerProps) {
  return (
    <div className="mb-6 rounded-2xl border border-border bg-card/60 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4 text-primary shrink-0" />
        <span className={cn('rounded-full border px-2.5 py-1 text-xs font-semibold', APPROACH_COLORS[approach])}>
          Pacote {APPROACH_FULL_LABELS[approach]}
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map(item => (
          <div
            key={item.id}
            className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-background/60 px-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
            <button
              type="button"
              onClick={() => onAssign(item)}
              className="shrink-0 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              {assignLabel}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
