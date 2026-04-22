import { describe, expect, it } from "vitest";
import { calculateSessionPayment, getSessionPaymentFieldState, validateSessionPayment } from "./sessionPaymentRules";

describe("sessionPaymentRules", () => {
  it("desabilita obrigatoriedade de forma e valor pago quando isento", () => {
    const state = getSessionPaymentFieldState({
      totalAmount: 200,
      paidAmount: 0,
      isExempt: true,
      isPartial: true,
      insuranceProvider: "none",
      sessionPackageId: "",
    });

    expect(state.paidAmountDisabled).toBe(true);
    expect(state.paymentMethodRequired).toBe(false);
    expect(state.paidAmountRequired).toBe(false);
  });

  it("valida que parcial exige pago menor que total", () => {
    const validation = validateSessionPayment({
      totalAmount: 250,
      paidAmount: 250,
      isExempt: false,
      isPartial: true,
      insuranceProvider: "none",
      sessionPackageId: "",
    });

    expect(validation).toContain("menor que o valor total");
  });

  it("aplica cálculo de convênio para recebível e repasse", () => {
    const calc = calculateSessionPayment({
      totalAmount: 300,
      paidAmount: 300,
      isExempt: false,
      isPartial: false,
      insuranceProvider: "unimed",
      sessionPackageId: "",
    });

    expect(calc.origin).toBe("convenio");
    expect(calc.receivable).toBe(210);
    expect(calc.transfer).toBe(90);
  });

  it("origem pacote zera recebível e mantém saldo pago", () => {
    const calc = calculateSessionPayment({
      totalAmount: 400,
      paidAmount: 200,
      isExempt: false,
      isPartial: true,
      insuranceProvider: "none",
      sessionPackageId: "pkg-8",
    });

    expect(calc.origin).toBe("pacote");
    expect(calc.receivable).toBe(0);
    expect(calc.balance).toBe(200);
  });
});
