export type InsuranceProvider = "none" | "unimed" | "amil" | "bradesco";

export type SessionPaymentValues = {
  totalAmount: number;
  paidAmount: number;
  isExempt: boolean;
  isPartial: boolean;
  insuranceProvider: InsuranceProvider;
  sessionPackageId?: string;
};

export type SessionPaymentCalculation = {
  total: number;
  paid: number;
  balance: number;
  receivable: number;
  transfer: number;
  origin: "isento" | "pacote" | "convenio" | "particular";
};

const INSURANCE_RECEIVABLE_RATE: Record<Exclude<InsuranceProvider, "none">, number> = {
  unimed: 0.7,
  amil: 0.65,
  bradesco: 0.6,
};

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function clampMoney(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return roundCurrency(value);
}

export function calculateSessionPayment(values: SessionPaymentValues): SessionPaymentCalculation {
  const total = clampMoney(values.totalAmount);

  if (values.isExempt) {
    return {
      total,
      paid: 0,
      balance: 0,
      receivable: 0,
      transfer: 0,
      origin: "isento",
    };
  }

  const isPackage = Boolean(values.sessionPackageId);
  const origin = isPackage
    ? "pacote"
    : values.insuranceProvider === "none"
      ? "particular"
      : "convenio";

  const paid = values.isPartial ? clampMoney(values.paidAmount) : total;
  const balance = roundCurrency(Math.max(total - paid, 0));

  const receivableBase = isPackage
    ? 0
    : values.insuranceProvider === "none"
      ? total
      : total * INSURANCE_RECEIVABLE_RATE[values.insuranceProvider];

  const receivable = roundCurrency(receivableBase);
  const transfer = roundCurrency(Math.max(total - receivable, 0));

  return {
    total,
    paid,
    balance,
    receivable,
    transfer,
    origin,
  };
}

export function getSessionPaymentFieldState(values: SessionPaymentValues) {
  const isPackage = Boolean(values.sessionPackageId);

  return {
    paidAmountDisabled: values.isExempt,
    paymentMethodRequired: !values.isExempt,
    paidAmountRequired: !values.isExempt && values.isPartial,
    insuranceDisabled: values.isExempt,
    packageDisabled: values.isExempt,
    canMarkPaid: values.isExempt || !values.isPartial || values.paidAmount >= values.totalAmount,
    isPackage,
  };
}

export function validateSessionPayment(values: SessionPaymentValues): string | null {
  if (values.totalAmount <= 0) return "Informe um valor total válido da sessão.";
  if (values.isExempt) return null;
  if (values.isPartial) {
    if (values.paidAmount <= 0) return "No pagamento parcial, informe um valor pago maior que zero.";
    if (values.paidAmount >= values.totalAmount) return "No pagamento parcial, o valor pago deve ser menor que o valor total.";
  }
  return null;
}
