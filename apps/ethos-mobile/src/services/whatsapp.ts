import * as SecureStore from 'expo-secure-store';
import { Linking } from 'react-native';

export type WhatsAppMessageSettings = {
  sessionReminderTemplate: string;
  paymentReminderTemplate: string;
  pixKey: string;
};

const STORAGE_KEY = 'ethos_whatsapp_message_settings';

export const defaultWhatsAppMessageSettings: WhatsAppMessageSettings = {
  sessionReminderTemplate:
    'Ola, [NOME]! 😊\n\nSo passando para lembrar que sua sessao sera hoje as [HORARIO].\n\nQualquer imprevisto, me avise.\n\nAte mais!',
  paymentReminderTemplate:
    'Ola, [NOME]! 😊\n\nIdentifiquei um pagamento pendente referente a sessao.\n\nValor: [VALOR]\n\nChave PIX: [CHAVE]\n\nQualquer duvida, me avise!',
  pixKey: '',
};

export const loadWhatsAppMessageSettings = async (): Promise<WhatsAppMessageSettings> => {
  const raw = await SecureStore.getItemAsync(STORAGE_KEY);
  if (!raw) return defaultWhatsAppMessageSettings;

  try {
    const parsed = JSON.parse(raw) as Partial<WhatsAppMessageSettings>;
    return {
      sessionReminderTemplate: parsed.sessionReminderTemplate?.trim() || defaultWhatsAppMessageSettings.sessionReminderTemplate,
      paymentReminderTemplate: parsed.paymentReminderTemplate?.trim() || defaultWhatsAppMessageSettings.paymentReminderTemplate,
      pixKey: parsed.pixKey?.trim() || '',
    };
  } catch {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
    return defaultWhatsAppMessageSettings;
  }
};

export const saveWhatsAppMessageSettings = async (settings: WhatsAppMessageSettings) => {
  await SecureStore.setItemAsync(
    STORAGE_KEY,
    JSON.stringify({
      sessionReminderTemplate: settings.sessionReminderTemplate.trim() || defaultWhatsAppMessageSettings.sessionReminderTemplate,
      paymentReminderTemplate: settings.paymentReminderTemplate.trim() || defaultWhatsAppMessageSettings.paymentReminderTemplate,
      pixKey: settings.pixKey.trim(),
    }),
  );
};

export const applyWhatsAppTemplate = (template: string, variables: Record<string, string>) => {
  let next = template;

  for (const [key, value] of Object.entries(variables)) {
    next = next.split(`[${key}]`).join(value);
  }

  return next;
};

export const formatPhoneForWhatsApp = (phone?: string | null) => {
  if (!phone) return null;

  let digits = phone.replace(/\D/g, '');
  if (!digits) return null;

  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  if (!digits.startsWith('55') && (digits.length === 10 || digits.length === 11)) {
    digits = `55${digits}`;
  }

  return digits.length >= 12 ? digits : null;
};

export const openWhatsAppLink = async (phone: string, message: string) => {
  const formattedPhone = formatPhoneForWhatsApp(phone);
  if (!formattedPhone) {
    throw new Error('Telefone do paciente ausente ou invalido.');
  }

  const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) {
    throw new Error('Nao foi possivel abrir o WhatsApp neste dispositivo.');
  }

  await Linking.openURL(url);
};
