import { useState } from 'react';
import { Package } from 'lucide-react';
import { APPROACH_FULL_LABELS, APPROACH_COLORS, type Approach } from '../types/approach';
import { getPackage } from '../services/packageService';
import { getPsychologistApproaches } from '../services/approachStorageService';
import { cn } from '../lib/utils';

interface PatientApproachSelectorProps {
  patientId: string;
  value: Approach | null;
  onChange: (approach: Approach | null) => void;
}

export function PatientApproachSelector({ patientId: _patientId, value, onChange }: PatientApproachSelectorProps) {
  const psychologistApproaches = getPsychologistApproaches();
  const [showPreview, setShowPreview] = useState(false);
  const pkg = value ? getPackage(value) : null;

  if (psychologistApproaches.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Configure suas abordagens clínicas em{' '}
        <span className="font-medium text-primary">Conta → Abordagens clínicas</span>{' '}
        para ativar pacotes.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value ? (e.target.value as Approach) : null)}
        className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        <option value="">Sem abordagem definida</option>
        {psychologistApproaches.map(a => (
          <option key={a} value={a}>{APPROACH_FULL_LABELS[a]}</option>
        ))}
      </select>

      {value && pkg && (
        <div className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              <span className={cn('rounded-full border px-2 py-0.5 text-xs font-medium', APPROACH_COLORS[value])}>
                Pacote {APPROACH_FULL_LABELS[value]}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowPreview(v => !v)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {showPreview ? 'Ocultar detalhes' : 'Ver o que inclui'}
            </button>
          </div>

          {showPreview && (
            <div className="space-y-2 text-xs text-muted-foreground">
              <p><span className="font-medium text-foreground">Escalas:</span> {pkg.scales.map(s => s.abbreviation).join(', ')}</p>
              <p><span className="font-medium text-foreground">Fichas:</span> {pkg.homework.map(h => h.title).join(', ')}</p>
              <p><span className="font-medium text-foreground">Template de prontuário:</span> {pkg.noteTemplate.title}</p>
              <p><span className="font-medium text-foreground">Diário do paciente:</span> {pkg.diaryConfig.title}</p>
              <p><span className="font-medium text-foreground">Materiais psicoeducativos:</span> {pkg.psychoeducational.map(p => p.title).join(', ')}</p>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            As ferramentas do pacote ficam em destaque nas páginas de formulários, escalas, prontuário e documentos.
            Nada é atribuído automaticamente — você decide o que usar.
          </p>
        </div>
      )}
    </div>
  );
}
