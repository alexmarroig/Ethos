import { useEffect, useMemo, useState } from "react";
import { Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { financeService, type FinancialEntry } from "@/services/financeService";
import type { Session } from "@/services/sessionService";
import type { ToastProps } from "@/hooks/use-toast";
import { calculateSessionPayment, getSessionPaymentFieldState, type InsuranceProvider, validateSessionPayment } from "./sessionPaymentRules";

const INSURANCE_OPTIONS: Array<{ value: InsuranceProvider; label: string }> = [
  { value: "none", label: "Particular" },
  { value: "unimed", label: "Unimed" },
  { value: "amil", label: "Amil" },
  { value: "bradesco", label: "Bradesco" },
];

const PACKAGE_OPTIONS = [
  { value: "", label: "Sem pacote" },
  { value: "pkg-8", label: "Pacote 8 sessões" },
  { value: "pkg-12", label: "Pacote 12 sessões" },
  { value: "pkg-16", label: "Pacote 16 sessões" },
];

type SessionPaymentFormProps = {
  session: Session;
  onToast: (props: ToastProps) => void;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default function SessionPaymentForm({ session, onToast }: SessionPaymentFormProps) {
  const [linkedEntry, setLinkedEntry] = useState<FinancialEntry | null>(null);
  const [totalAmount, setTotalAmount] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentDueDate, setPaymentDueDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [isExempt, setIsExempt] = useState(false);
  const [isPartial, setIsPartial] = useState(false);
  const [insuranceProvider, setInsuranceProvider] = useState<InsuranceProvider>("none");
  const [sessionPackageId, setSessionPackageId] = useState("");
  const [paymentSaving, setPaymentSaving] = useState(false);

  useEffect(() => {
    const loadLinkedPayment = async () => {
      const result = await financeService.listEntries({ session_id: session.id, page_size: 1 });
      if (!result.success) return;

      const entry = result.data.find((item) => item.session_id === session.id) ?? null;
      setLinkedEntry(entry);
      setTotalAmount(entry ? String(entry.total_amount ?? entry.amount) : "");
      setPaidAmount(entry ? String(entry.amount_paid ?? entry.paid_amount ?? entry.amount) : "");
      setPaymentDueDate(entry?.due_date ? new Date(entry.due_date).toISOString().slice(0, 10) : "");
      setPaymentMethod(entry?.payment_method ?? "");
      setIsExempt(Boolean(entry?.is_exempt));
      setIsPartial(Boolean(entry?.is_partial));
      setInsuranceProvider((entry?.insurance_provider as InsuranceProvider | undefined) ?? "none");
      setSessionPackageId(entry?.session_package_id ?? "");
    };

    void loadLinkedPayment();
  }, [session.id]);

  const paymentValues = useMemo(
    () => ({
      totalAmount: Number(totalAmount || 0),
      paidAmount: Number(paidAmount || 0),
      isExempt,
      isPartial,
      insuranceProvider,
      sessionPackageId,
    }),
    [totalAmount, paidAmount, isExempt, isPartial, insuranceProvider, sessionPackageId],
  );

  const calculated = useMemo(() => calculateSessionPayment(paymentValues), [paymentValues]);
  const fieldState = useMemo(() => getSessionPaymentFieldState(paymentValues), [paymentValues]);

  useEffect(() => {
    if (isExempt) {
      setIsPartial(false);
      setPaidAmount("");
      setPaymentMethod("");
    }
  }, [isExempt]);

  useEffect(() => {
    if (!isPartial && totalAmount) {
      setPaidAmount(totalAmount);
    }
  }, [isPartial, totalAmount]);

  const persistPayment = async (markAsPaid: boolean) => {
    const validationError = validateSessionPayment(paymentValues);
    if (validationError) {
      onToast({ title: "Pagamento inválido", description: validationError, variant: "destructive" });
      return;
    }

    if (!isExempt && fieldState.paymentMethodRequired && !paymentMethod.trim()) {
      onToast({ title: "Forma de pagamento obrigatória", description: "Informe a forma de pagamento para continuar.", variant: "destructive" });
      return;
    }

    setPaymentSaving(true);

    const payload = {
      session_id: session.id,
      patient_id: session.patient_id,
      amount: calculated.receivable,
      total_amount: calculated.total,
      amount_paid: calculated.paid,
      paid_amount: calculated.paid,
      is_exempt: isExempt,
      is_partial: isPartial,
      insurance_provider: insuranceProvider === "none" ? undefined : insuranceProvider,
      session_package_id: sessionPackageId || undefined,
      due_date: paymentDueDate ? new Date(`${paymentDueDate}T12:00:00`).toISOString() : undefined,
      payment_method: isExempt ? undefined : paymentMethod || undefined,
      repasse_amount: calculated.transfer,
      receivable_amount: calculated.receivable,
      payment_origin: calculated.origin,
      status: isExempt
        ? ("exempt" as const)
        : sessionPackageId
          ? ("package" as const)
          : markAsPaid && calculated.balance <= 0
            ? ("paid" as const)
            : ("open" as const),
      paid_at: markAsPaid && calculated.balance <= 0 ? new Date().toISOString() : undefined,
      description: "Sessão de psicoterapia",
    };

    const result = linkedEntry
      ? await financeService.updateEntry(linkedEntry.id, payload)
      : await financeService.createEntry(payload);

    setPaymentSaving(false);

    if (!result.success) {
      onToast({ title: "Erro ao salvar pagamento", description: result.error.message, variant: "destructive" });
      return;
    }

    setLinkedEntry(result.data);
    onToast({
      title: markAsPaid ? "Pagamento atualizado" : linkedEntry ? "Cobrança atualizada" : "Cobrança registrada",
      description: "O vínculo financeiro desta sessão foi salvo com sucesso.",
    });
  };

  return (
    <>
      <h2 className="font-serif text-xl font-medium text-foreground mb-4">Pagamento da sessão</h2>
      <div className="session-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">
              {linkedEntry
                ? linkedEntry.status === "paid"
                  ? "Pagamento já registrado como pago"
                  : "Cobrança pendente vinculada a esta sessão"
                : "Nenhuma cobrança vinculada a esta sessão ainda"}
            </span>
          </div>
          {linkedEntry ? (
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              {linkedEntry.status === "paid" ? "Pago" : linkedEntry.status === "exempt" ? "Isento" : linkedEntry.status === "package" ? "Pacote" : "Pendente"}
            </span>
          ) : null}
        </div>

        {!linkedEntry && (
          <div className="rounded-lg bg-muted/50 border border-border/50 px-3 py-2.5 text-xs text-muted-foreground">
            💡 <strong>Cobrança automática:</strong> se o valor de sessão estiver configurado no perfil do paciente e a cobrança automática estiver ativa, o lançamento é gerado ao marcar a sessão como <strong>"Concluída"</strong> na Agenda. Ou registre manualmente abaixo.
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="payment-exempt">Pagamento isento</Label>
              <Switch id="payment-exempt" checked={isExempt} onCheckedChange={setIsExempt} />
            </div>
            <p className="text-xs text-muted-foreground">Quando ativo, forma de pagamento e valor pago deixam de ser obrigatórios.</p>
          </div>

          <div className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="payment-partial">Pagar parcialmente</Label>
              <Switch id="payment-partial" checked={isPartial} onCheckedChange={setIsPartial} disabled={isExempt} />
            </div>
            <p className="text-xs text-muted-foreground">No parcial, o valor pago precisa ser menor que o valor total.</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="total-amount">Valor total</Label>
            <Input id="total-amount" type="number" step="0.01" placeholder="Valor da sessão" value={totalAmount} onChange={(event) => setTotalAmount(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="paid-amount">Valor pago</Label>
            <Input id="paid-amount" type="number" step="0.01" placeholder="Valor pago" value={paidAmount} onChange={(event) => setPaidAmount(event.target.value)} disabled={fieldState.paidAmountDisabled} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="due-date">Vencimento</Label>
            <Input id="due-date" type="date" value={paymentDueDate} onChange={(event) => setPaymentDueDate(event.target.value)} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="payment-method">Forma de pagamento</Label>
            <Input
              id="payment-method"
              placeholder="Pix, cartão, boleto..."
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
              disabled={isExempt}
            />
          </div>

          <div className="space-y-2">
            <Label>Convênio</Label>
            <Select value={insuranceProvider} onValueChange={(value) => setInsuranceProvider(value as InsuranceProvider)} disabled={fieldState.insuranceDisabled}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {INSURANCE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Pacote de sessões</Label>
            <Select value={sessionPackageId} onValueChange={setSessionPackageId} disabled={fieldState.packageDisabled}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {PACKAGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value || "none"} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
          <p className="font-medium text-foreground mb-2">Resumo antes de salvar</p>
          <div className="grid gap-2 md:grid-cols-2">
            <p>Total: <strong>{currencyFormatter.format(calculated.total)}</strong></p>
            <p>Pago: <strong>{currencyFormatter.format(calculated.paid)}</strong></p>
            <p>Saldo: <strong>{currencyFormatter.format(calculated.balance)}</strong></p>
            <p>Origem: <strong className="capitalize">{calculated.origin}</strong></p>
            <p>Recebível: <strong>{currencyFormatter.format(calculated.receivable)}</strong></p>
            <p>Repasse: <strong>{currencyFormatter.format(calculated.transfer)}</strong></p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => void persistPayment(false)} disabled={paymentSaving}>
            {paymentSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {linkedEntry ? "Atualizar cobrança" : "Lançar cobrança da sessão"}
          </Button>
          <Button onClick={() => void persistPayment(true)} disabled={paymentSaving || !fieldState.canMarkPaid}>
            {paymentSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Salvar e marcar como pago
          </Button>
        </div>
      </div>
    </>
  );
}
