import { api } from "@/services/apiClient";

export type OnboardingMissionId =
  | "register-client"
  | "schedule-session"
  | "register-attendance"
  | "register-payment"
  | "session-note"
  | "finish-onboarding";

export interface MissionState {
  id: OnboardingMissionId;
  title: string;
  description: string;
  page: "patients" | "agenda" | "session" | "finance" | "home";
  completedAt: string | null;
}

export interface OnboardingState {
  version: number;
  userId: string;
  startedAt: string;
  updatedAt: string;
  paused: boolean;
  disabled: boolean;
  missions: MissionState[];
  events: Array<{
    missionId: OnboardingMissionId;
    type: "started" | "completed" | "paused" | "resumed" | "disabled";
    at: string;
  }>;
}

const STORAGE_PREFIX = "ethos:onboarding:v1";

const defaultMissions = (): MissionState[] => [
  {
    id: "register-client",
    title: "Cadastrar cliente",
    description: "Adicione seu primeiro paciente para iniciar os fluxos clínicos.",
    page: "patients",
    completedAt: null,
  },
  {
    id: "schedule-session",
    title: "Agendar sessão",
    description: "Crie uma sessão na agenda para organizar sua rotina.",
    page: "agenda",
    completedAt: null,
  },
  {
    id: "register-attendance",
    title: "Registrar frequência",
    description: "Marque a sessão como confirmada ou concluída.",
    page: "session",
    completedAt: null,
  },
  {
    id: "register-payment",
    title: "Registrar pagamento",
    description: "Cadastre a cobrança/pagamento para acompanhar receitas.",
    page: "finance",
    completedAt: null,
  },
  {
    id: "session-note",
    title: "Anotar sessão",
    description: "Registre observações clínicas da sessão.",
    page: "session",
    completedAt: null,
  },
  {
    id: "finish-onboarding",
    title: "Concluir setup inicial",
    description: "Finalize as missões iniciais para concluir sua ativação.",
    page: "home",
    completedAt: null,
  },
];

const now = () => new Date().toISOString();

function keyFor(userId: string) {
  return `${STORAGE_PREFIX}:${userId}`;
}

export function createInitialOnboardingState(userId: string): OnboardingState {
  const startedAt = now();
  return {
    version: 1,
    userId,
    startedAt,
    updatedAt: startedAt,
    paused: false,
    disabled: false,
    missions: defaultMissions(),
    events: [{ missionId: "register-client", type: "started", at: startedAt }],
  };
}

export function loadOnboardingState(userId: string): OnboardingState {
  const raw = localStorage.getItem(keyFor(userId));
  if (!raw) return createInitialOnboardingState(userId);
  try {
    const parsed = JSON.parse(raw) as OnboardingState;
    if (parsed.userId !== userId) return createInitialOnboardingState(userId);
    return {
      ...parsed,
      missions: defaultMissions().map((mission) => parsed.missions.find((m) => m.id === mission.id) ?? mission),
      events: Array.isArray(parsed.events) ? parsed.events : [],
    };
  } catch {
    return createInitialOnboardingState(userId);
  }
}

export function persistOnboardingState(state: OnboardingState) {
  localStorage.setItem(keyFor(state.userId), JSON.stringify(state));
}

export function getConversionRate(state: OnboardingState): number {
  const trackable = state.missions.filter((mission) => mission.id !== "finish-onboarding");
  const completed = trackable.filter((mission) => mission.completedAt).length;
  return Math.round((completed / trackable.length) * 100);
}

export function syncOnboardingStateToBackend(state: OnboardingState) {
  void api.post("/analytics/onboarding", {
    conversion_rate: getConversionRate(state),
    missions: state.missions.map((mission) => ({ id: mission.id, completed_at: mission.completedAt })),
    updated_at: state.updatedAt,
  }).catch(() => {
    // Endpoint opcional: mantém persistência local caso backend não suporte.
  });
}
