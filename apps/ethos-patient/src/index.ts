import { EthosPatientClient } from "@ethos/sdk";

export const patientDisclaimer = "Aviso: mensagem assíncrona não substitui sessão.";

export const patientAppCapabilities = {
  web: {
    scales: true,
    diary: true,
    sessionConfirmation: true,
    asyncMessagesLimitPerDay: 3,
    asyncMessagesDisclaimer: patientDisclaimer,
  },
  mobile: {
    scales: true,
    diary: true,
    sessionConfirmation: true,
    asyncMessagesLimitPerDay: 3,
    asyncMessagesDisclaimer: patientDisclaimer,
  },
  desktop: {
    scales: true,
    diary: true,
    sessionConfirmation: true,
    asyncMessagesLimitPerDay: 3,
    asyncMessagesDisclaimer: patientDisclaimer,
  },
};

export const patientClient = new EthosPatientClient("http://localhost:8787");
