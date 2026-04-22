import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { financeService, type FinancialPackage } from "@/services/financeService";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface PackageModalProps {
  open: boolean;
  patientId: string;
  onOpenChange: (open: boolean) => void;
  onCreated?: (pkg: FinancialPackage) => void;
}

export function PackageModal({ open, patientId, onOpenChange, onCreated }: PackageModalProps) {
  const { toast } = useToast();
  const [quantity, setQuantity] = useState("4");
  const [totalAmount, setTotalAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    const parsedQuantity = Number(quantity);
    const parsedAmount = Number(totalAmount);
    if (!parsedQuantity || parsedQuantity <= 0 || !parsedAmount || parsedAmount <= 0) {
      toast({ title: "Dados inválidos", description: "Informe quantidade e valor total válidos.", variant: "destructive" });
      return;
    }

    setSaving(true);
    const result = await financeService.createPackage({
      patient_id: patientId,
      quantity: parsedQuantity,
      total_amount: parsedAmount,
    });
    setSaving(false);

    if (!result.success) {
      toast({ title: "Erro ao criar pacote", description: result.error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Pacote criado", description: `Pacote com ${result.data.quantity} sessão(ões) criado.` });
    onCreated?.(result.data);
    onOpenChange(false);
    setTotalAmount("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inserir pacote</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Quantidade de sessões</p>
            <Input type="number" min={1} value={quantity} onChange={(event) => setQuantity(event.target.value)} />
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Valor total</p>
            <Input type="number" min={0} step="0.01" value={totalAmount} onChange={(event) => setTotalAmount(event.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={() => void handleCreate()} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar pacote
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
