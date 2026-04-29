import { BookOpen, Share2 } from 'lucide-react';
import { APPROACH_FULL_LABELS, APPROACH_COLORS, type Approach } from '../types/approach';
import { getPsychoeducational } from '../services/packageService';
import { cn } from '../lib/utils';

interface PsychoeducationalSectionProps {
  approach: Approach;
  onShare: (materialId: string, title: string) => void;
}

export function PsychoeducationalSection({ approach, onShare }: PsychoeducationalSectionProps) {
  const materials = getPsychoeducational(approach);

  if (materials.length === 0) return null;

  return (
    <div className="mb-8 space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-primary" />
        <h3 className="text-[1.4rem] font-semibold tracking-[-0.03em] text-foreground">
          Materiais psicoeducativos
        </h3>
        <span className={cn('rounded-full border px-2 py-0.5 text-xs font-medium', APPROACH_COLORS[approach])}>
          {APPROACH_FULL_LABELS[approach]}
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {materials.map(material => (
          <div key={material.id} className="session-card flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{material.title}</p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{material.summary}</p>
            </div>
            <button
              type="button"
              onClick={() => onShare(material.id, material.title)}
              className="mt-0.5 shrink-0 flex items-center gap-1 rounded-lg border border-border/60 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
            >
              <Share2 className="h-3 w-3" />
              Compartilhar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
