export type PaymentReminderSettings = {
  paymentMethodLabel: string;
  paymentDestination: string;
  defaultTemplate: string;
};

const STORAGE_KEY = "ethos_web_payment_reminder_settings_v1";

export const defaultPaymentReminderSettings: PaymentReminderSettings = {
  paymentMethodLabel: "PIX",
  paymentDestination: "",
  defaultTemplate:
    "Lembrete ETHOS\n\nOlá, {patient_name}. Gostaria de lembrar que hoje é o dia combinado para o pagamento.\n\nConsta o valor de {amount}.\n\nForma de pagamento: {payment_method}\n{payment_destination}\n\nSe já realizou, pode desconsiderar esta mensagem.",
};

export const readPaymentReminderSettings = (): PaymentReminderSettings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPaymentReminderSettings;
    const parsed = JSON.parse(raw) as Partial<PaymentReminderSettings>;
    return {
      paymentMethodLabel: parsed.paymentMethodLabel || defaultPaymentReminderSettings.paymentMethodLabel,
      paymentDestination: parsed.paymentDestination || defaultPaymentReminderSettings.paymentDestination,
      defaultTemplate: parsed.defaultTemplate || defaultPaymentReminderSettings.defaultTemplate,
    };
  } catch {
    return defaultPaymentReminderSettings;
  }
};

export const savePaymentReminderSettings = (settings: PaymentReminderSettings) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};

export const buildPaymentReminderMessage = (
  template: string,
  values: {
    patient_name: string;
    amount: string;
    payment_method: string;
    payment_destination: string;
    preferred_day: string;
  },
) =>
  template
    .replaceAll("{patient_name}", values.patient_name)
    .replaceAll("{amount}", values.amount)
    .replaceAll("{payment_method}", values.payment_method)
    .replaceAll("{payment_destination}", values.payment_destination)
    .replaceAll("{preferred_day}", values.preferred_day);
