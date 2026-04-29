import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  createInitialOnboardingState,
  getConversionRate,
  loadOnboardingState,
  persistOnboardingState,
  syncOnboardingStateToBackend,
  type OnboardingMissionId,
  type OnboardingRole,
  type OnboardingState,
} from "@/services/onboardingService";

interface OnboardingContextValue {
  state: OnboardingState | null;
  progress: number;
  currentMissionId: OnboardingMissionId | null;
  conversionRate: number;
  markMissionCompleted: (missionId: OnboardingMissionId) => void;
  pauseOnboarding: () => void;
  resumeOnboarding: () => void;
  disableOnboarding: () => void;
  shouldShowCoachmarks: boolean;
}

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

function resolveCurrentMission(state: OnboardingState): OnboardingMissionId | null {
  const next = state.missions.find((mission) => !mission.completedAt);
  return next?.id ?? null;
}

function evolveState(
  prev: OnboardingState,
  updater: (draft: OnboardingState) => OnboardingState,
): OnboardingState {
  const next = updater(prev);
  next.updatedAt = new Date().toISOString();
  persistOnboardingState(next);
  syncOnboardingStateToBackend(next);
  return next;
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [state, setState] = useState<OnboardingState | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setState(null);
      return;
    }
    const role: OnboardingRole = user.role === "patient" ? "patient" : "professional";
    setState(loadOnboardingState(user.id, role));
  }, [isAuthenticated, user?.id, user?.role]);

  const markMissionCompleted = (missionId: OnboardingMissionId) => {
    setState((current) => {
      if (!current || current.disabled) return current;
      const mission = current.missions.find((item) => item.id === missionId);
      if (!mission || mission.completedAt) return current;

      const now = new Date().toISOString();
      let next = evolveState(current, (draft) => ({
        ...draft,
        paused: false,
        missions: draft.missions.map((item) =>
          item.id === missionId ? { ...item, completedAt: now } : item,
        ),
        events: [...draft.events, { missionId, type: "completed", at: now }],
      }));

      const primaryDone = next.missions
        .filter((missionItem) => missionItem.id !== "finish-onboarding")
        .every((missionItem) => missionItem.completedAt);

      if (primaryDone && !next.missions.find((missionItem) => missionItem.id === "finish-onboarding")?.completedAt) {
        next = evolveState(next, (draft) => ({
          ...draft,
          missions: draft.missions.map((item) =>
            item.id === "finish-onboarding" ? { ...item, completedAt: now } : item,
          ),
          events: [...draft.events, { missionId: "finish-onboarding", type: "completed", at: now }],
        }));
      }

      return next;
    });
  };

  const pauseOnboarding = () => {
    setState((current) => {
      if (!current || current.disabled || current.paused) return current;
      const missionId = resolveCurrentMission(current) ?? "finish-onboarding";
      return evolveState(current, (draft) => ({
        ...draft,
        paused: true,
        events: [...draft.events, { missionId, type: "paused", at: new Date().toISOString() }],
      }));
    });
  };

  const resumeOnboarding = () => {
    setState((current) => {
      if (!current || current.disabled || !current.paused) return current;
      const missionId = resolveCurrentMission(current) ?? "finish-onboarding";
      return evolveState(current, (draft) => ({
        ...draft,
        paused: false,
        events: [...draft.events, { missionId, type: "resumed", at: new Date().toISOString() }],
      }));
    });
  };

  const disableOnboarding = () => {
    setState((current) => {
      if (!current || current.disabled) return current;
      const missionId = resolveCurrentMission(current) ?? "finish-onboarding";
      return evolveState(current, (draft) => ({
        ...draft,
        disabled: true,
        paused: true,
        events: [...draft.events, { missionId, type: "disabled", at: new Date().toISOString() }],
      }));
    });
  };

  const value = useMemo<OnboardingContextValue>(() => {
    if (!state) {
      return {
        state: null,
        progress: 0,
        currentMissionId: null,
        conversionRate: 0,
        markMissionCompleted: () => undefined,
        pauseOnboarding: () => undefined,
        resumeOnboarding: () => undefined,
        disableOnboarding: () => undefined,
        shouldShowCoachmarks: false,
      };
    }

    const completed = state.missions.filter((mission) => mission.completedAt).length;
    return {
      state,
      progress: completed,
      currentMissionId: resolveCurrentMission(state),
      conversionRate: getConversionRate(state),
      markMissionCompleted,
      pauseOnboarding,
      resumeOnboarding,
      disableOnboarding,
      shouldShowCoachmarks: !state.paused && !state.disabled,
    };
  }, [state]);

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return context;
}

export function useOptionalOnboarding() {
  return useContext(OnboardingContext);
}
