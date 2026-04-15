import { useState } from "react";
import { Eye, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { shareApi } from "@/services/patientPortalService";
import { useToast } from "@/hooks/use-toast";

interface Props {
  type: "contracts" | "reports" | "documents" | "financial/entries";
  id: string;
  shared: boolean;
  onToggle?: (shared: boolean) => void;
  size?: "sm" | "default";
}

export const ShareWithPatientButton = ({ type, id, shared, onToggle, size = "sm" }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isShared, setIsShared] = useState(shared);

  const toggle = async () => {
    setLoading(true);
    const next = !isShared;
    const result = await shareApi.toggleShare(type, id, next);
    setLoading(false);

    if (!result.success) {
      toast({ title: "Erro", description: result.error.message, variant: "destructive" });
      return;
    }

    setIsShared(next);
    onToggle?.(next);
    toast({
      title: next ? "Disponibilizado para o paciente" : "Removido do portal do paciente",
      description: next ? "O paciente pode ver este item no portal." : "O paciente não verá mais este item.",
    });
  };

  return (
    <Button
      variant={isShared ? "default" : "outline"}
      size={size}
      className={`gap-1.5 ${isShared ? "bg-ethos-primary hover:bg-ethos-primary/90" : ""}`}
      onClick={toggle}
      disabled={loading}
      title={isShared ? "Remover do portal do paciente" : "Disponibilizar para o paciente"}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : isShared ? (
        <CheckCircle2 className="w-3.5 h-3.5" />
      ) : (
        <Eye className="w-3.5 h-3.5" />
      )}
      {isShared ? "Compartilhado" : "Disponibilizar"}
    </Button>
  );
};
