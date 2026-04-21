import React from "react";
import { Brain, RefreshCw, ChevronRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type Props = {
  content?: string;
  lastUpdated?: string;
  isStale?: boolean;
  onViewFull: () => void;
  onRefresh: () => void;
  isLoading?: boolean;
};

export function ClinicalSynthesisCard({ content, lastUpdated, isStale, onViewFull, onRefresh, isLoading }: Props) {
  const truncatedContent = content
    ? content.split("\n").slice(0, 4).join("\n").slice(0, 200) + (content.length > 200 ? "..." : "")
    : "Nenhuma síntese gerada ainda. Use o botão para consolidar o histórico clínico.";

  return (
    <Card className="p-5 border-primary/20 bg-primary/5 shadow-sm overflow-hidden relative group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground tracking-tight">Estado Clínico Atual</h3>
              {isStale && (
                <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-amber-500/30 text-amber-600 bg-amber-500/5 gap-1">
                  <AlertCircle className="w-2 h-2" />
                  Desatualizada
                </Badge>
              )}
            </div>
            {lastUpdated && (
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                Atualizado em {new Date(lastUpdated).toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => { e.stopPropagation(); onRefresh(); }}
          disabled={isLoading}
          className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
        >
          <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
        </Button>
      </div>

      <div className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed italic whitespace-pre-wrap">
          "{truncatedContent}"
        </p>

        <div className="flex justify-end pt-2 border-t border-primary/10">
          <Button
            variant="link"
            className="text-primary text-xs font-semibold p-0 h-auto gap-1"
            onClick={onViewFull}
          >
            Ver evolução completa
            <ChevronRight className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
