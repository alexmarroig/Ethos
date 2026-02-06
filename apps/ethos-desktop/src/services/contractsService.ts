export type ContractStatus = "draft" | "sent" | "signed";

export type ContractSignature = {
  acceptedBy: string;
  acceptedAt: string;
  acceptedIp: string;
};

export type Contract = {
  id: string;
  createdAt: string;
  status: ContractStatus;
  patient: {
    name: string;
    email: string;
    document: string;
  };
  psychologist: {
    name: string;
    license: string;
    email: string;
    phone?: string;
  };
  terms: {
    value: string;
    periodicity: string;
    absencePolicy: string;
    paymentMethod: string;
  };
  sentAt?: string;
  portalToken?: string;
  signature?: ContractSignature;
  recordedInChartAt?: string;
};

const now = () => new Date().toISOString();

const buildPortalToken = () => Math.random().toString(36).slice(2, 12);

const contracts = new Map<string, Contract>();

const seedContractId = "ct-001";
contracts.set(seedContractId, {
  id: seedContractId,
  createdAt: now(),
  status: "draft",
  patient: {
    name: "Marina Alves",
    email: "marina.alves@email.com",
    document: "CPF 123.456.789-00",
  },
  psychologist: {
    name: "Dra. Camila Souza",
    license: "CRP 00/00000",
    email: "camila@ethos.local",
    phone: "(11) 99999-0000",
  },
  terms: {
    value: "R$ 220,00 por sessão",
    periodicity: "Semanal",
    absencePolicy: "Faltas sem aviso prévio (24h) são cobradas.",
    paymentMethod: "PIX ou transferência bancária",
  },
});

export const contractsService = {
  list: () => Array.from(contracts.values()),
  create: (payload: Omit<Contract, "id" | "createdAt" | "status">) => {
    const id = `ct-${Math.random().toString(36).slice(2, 7)}`;
    const contract: Contract = {
      ...payload,
      id,
      createdAt: now(),
      status: "draft",
    };
    contracts.set(id, contract);
    return contract;
  },
  send: (id: string) => {
    const contract = contracts.get(id);
    if (!contract) return null;
    contract.status = "sent";
    contract.sentAt = now();
    contract.portalToken = contract.portalToken ?? buildPortalToken();
    contracts.set(id, contract);
    return contract;
  },
  getByPortalToken: (token: string) => Array.from(contracts.values()).find((contract) => contract.portalToken === token) ?? null,
  sign: (token: string, acceptedBy: string, acceptedIp: string) => {
    const contract = contractsService.getByPortalToken(token);
    if (!contract) return null;
    contract.status = "signed";
    contract.signature = {
      acceptedBy,
      acceptedAt: now(),
      acceptedIp,
    };
    contract.recordedInChartAt = now();
    contracts.set(contract.id, contract);
    return contract;
  },
  export: (id: string, format: "pdf" | "docx") => {
    const contract = contracts.get(id);
    if (!contract) return null;
    return {
      format,
      filename: `contrato-${contract.patient.name.replace(/\s+/g, "-").toLowerCase()}.${format}`,
      generatedAt: now(),
    };
  },
};
