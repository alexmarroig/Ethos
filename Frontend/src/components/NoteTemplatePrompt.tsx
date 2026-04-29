import { FileText } from 'lucide-react';
import { APPROACH_FULL_LABELS, type Approach } from '../types/approach';
import { getNoteTemplate } from '../services/packageService';
import { Button } from './ui/button';

interface NoteTemplatePromptProps {
  approach: Approach;
  onUseTemplate: (scaffoldText: string) => void;
  onDismiss: () => void;
}

export function NoteTemplatePrompt({ approach, onUseTemplate, onDismiss }: NoteTemplatePromptProps) {
  const template = getNoteTemplate(approach);

  const handleUse = () => {
    const scaffoldText = template.sections
      .map(s => `${s.label}:\n`)
      .join('\n');
    onUseTemplate(scaffoldText);
  };

  return (
    <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            Usar template {APPROACH_FULL_LABELS[approach]}?
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Seções: {template.sections.map(s => s.label).join(' · ')}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button size="sm" onClick={handleUse} className="h-8 text-xs">
            Usar template
          </Button>
          <Button size="sm" variant="ghost" onClick={onDismiss} className="h-8 text-xs">
            Começar em branco
          </Button>
        </div>
      </div>
    </div>
  );
}
