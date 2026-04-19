import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface BillingConfirmDialogProps {
  open: boolean;
  patientName: string;
  suggestedAmount: number;
  suggestedDueDate: string;
  onConfirm: () => void;
  onDismiss: () => void;
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(iso: string): string {
  const date = new Date(iso.length === 10 ? iso + "T12:00:00" : iso);
  return date.toLocaleDateString("pt-BR");
}

export function BillingConfirmDialog({
  open,
  patientName,
  suggestedAmount,
  suggestedDueDate,
  onConfirm,
  onDismiss,
}: BillingConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onDismiss(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gerar cobrança?</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2 text-sm text-muted-foreground">
          <p>
            Deseja gerar uma cobrança para{" "}
            <span className="font-medium text-foreground">{patientName}</span>?
          </p>
          <div className="rounded-md border bg-muted/50 p-3 space-y-1">
            <p>
              <span className="text-muted-foreground">Valor: </span>
              <span className="font-semibold text-foreground">{formatCurrency(suggestedAmount)}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Vencimento: </span>
              <span className="font-semibold text-foreground">{formatDate(suggestedDueDate)}</span>
            </p>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onDismiss}>
            Agora não
          </Button>
          <Button onClick={onConfirm}>
            Gerar cobrança
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
