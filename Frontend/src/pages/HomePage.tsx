import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Ban, Bell, CalendarPlus, Clock3, ExternalLink, Gift, UserPlus, Wrench } from "lucide-react";
import SessionCard, { SessionStatus } from "@/components/SessionCard";
import FloatingActionButton, { SessionState } from "@/components/FloatingActionButton";
import { BioHubIntegrationCard } from "@/components/BioHubIntegrationCard";
import { PreSessionBriefingPanel } from "@/components/PreSessionBriefingPanel";
import { sessionService, type Session } from "@/services/sessionService";
import { useAppStore } from "@/stores/appStore";
import { financeService, type FinancialEntry, type FinancialSummary } from "@/services/financeService";
import { type Patient } from "@/services/patientService";
import { getPatientsIndex } from "@/services/patientIndexCache";
import IntegrationUnavailable from "@/components/IntegrationUnavailable";
import { Skeleton } from "@/components/ui/skeleton";
import { SessionCardSkeleton } from "@/components/SkeletonCards";
import { Button } from "@/components/ui/button";
import { usePrivacy } from "@/hooks/usePrivacy";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  buildPreSessionBriefing,
  formatPreSessionBriefingText,
  notifyPreSessionBriefing,
  schedulePreSessionNotifications,
  type PreSessionBriefing,
} from "@/services/preSessionBriefingService";
import { listSupervisionNotes } from "@/services/supervisionNotesService";

interface HomePageProps {
  onSessionClick: (sessionId: string) => void;
  onNavigate: (page: string) => void;
  onPatientClick?: (patientId: string) => void;
}

const SESSION_CACHE_TTL_MS = 60_000;
const HOME_DASHBOARD_CACHE_KEY = "ethos_home_dashboard_cache_v1";
const HOME_DASHBOARD_CACHE_TTL_MS = 5 * 60_000;
const SLOW_LOAD_NOTICE_MS = 4_500;
const ETHOS_TOOLS_URL = "https://ethos-clinic.com/ferramentas";
const BIOHUB_LOGIN_URL = "https://biohub.ethos-clinic.com/auth/login";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatDateLabel = (value?: string) => {
  if (!value) return "Sem data";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
};

const formatBirthdayLabel = (value?: string) => {
  if (!value) return "Sem data";
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!month || !day) return value;
  return new Date(2000, month - 1, day).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
};

const getDaysUntilBirthday = (birthDate?: string) => {
  if (!birthDate) return Number.POSITIVE_INFINITY;

  const [year, month, day] = birthDate.slice(0, 10).split("-").map(Number);
  if (!month || !day) return Number.POSITIVE_INFINITY;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const currentYearBirthday = new Date(today.getFullYear(), month - 1, day);

  if (currentYearBirthday.getMonth() === today.getMonth()) {
    return Math.round((currentYearBirthday.getTime() - today.getTime()) / 86_400_000);
  }

  let nextBirthday = currentYearBirthday;
  if (nextBirthday < today) nextBirthday = new Date(today.getFullYear() + 1, month - 1, day);
  return Math.round((nextBirthday.getTime() - today.getTime()) / 86_400_000);
};

const getBirthdayAge = (birthDate?: string) => {
  if (!birthDate) return null;
  const [year, month, day] = birthDate.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return null;

  const today = new Date();
  let age = today.getFullYear() - year;
  const birthdayThisYear = new Date(today.getFullYear(), month - 1, day);
  if (birthdayThisYear < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
    age += 1;
  }
  return age;
};

const getBirthdayDistanceLabel = (birthDate?: string) => {
  const distance = getDaysUntilBirthday(birthDate);
  if (!Number.isFinite(distance)) return "Data inválida";
  if (distance === 0) return "É hoje";
  if (distance > 0) return `Faltam ${distance} dia(s)`;
  return `Passou há ${Math.abs(distance)} dia(s)`;
};

const getBirthdayBadge = (birthDate?: string) => {
  const distance = getDaysUntilBirthday(birthDate);
  if (!Number.isFinite(distance)) return null;
  if (distance === 0) return "Hoje";
  if (distance === 1) return "Amanhã";
  return null;
};

type HomeDashboardCache = {
  version: 1;
  savedAt: number;
  today: string;
  todaySessions: Session[];
  upcomingSessions: Session[];
  pendingSessions: Session[];
  pendingPayments: FinancialEntry[];
  upcomingPayments: FinancialEntry[];
  birthdayPatients: Patient[];
  financialSummary: FinancialSummary | null;
};

function readHomeDashboardCache(today: string): HomeDashboardCache | null {
  try {
    const raw = window.localStorage.getItem(HOME_DASHBOARD_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<HomeDashboardCache>;
    if (
      parsed.version !== 1 ||
      parsed.today !== today ||
      !parsed.savedAt ||
      Date.now() - parsed.savedAt > HOME_DASHBOARD_CACHE_TTL_MS
    ) {
      return null;
    }
    return parsed as HomeDashboardCache;
  } catch {
    return null;
  }
}

function writeHomeDashboardCache(cache: Omit<HomeDashboardCache, "version" | "savedAt">) {
  try {
    window.localStorage.setItem(
      HOME_DASHBOARD_CACHE_KEY,
      JSON.stringify({
        version: 1,
        savedAt: Date.now(),
        ...cache,
      }),
    );
  } catch {
    // Best effort cache only. The dashboard must keep working if storage is unavailable.
  }
}

const HomePage = ({ onSessionClick, onNavigate, onPatientClick }: HomePageProps) => {
  const { maskName } = usePrivacy();
  const { toast } = useToast();
  const setSessionCache = useAppStore((s) => s.setSessionCache);
  const [todaySessions, setTodaySessions] = useState<Session[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [pendingSessions, setPendingSessions] = useState<Session[]>([]);
  const [pendingPayments, setPendingPayments] = useState<FinancialEntry[]>([]);
  const [upcomingPayments, setUpcomingPayments] = useState<FinancialEntry[]>([]);
  const [birthdayPatients, setBirthdayPatients] = useState<Patient[]>([]);
  const [patientsIndex, setPatientsIndex] = useState<Patient[]>([]);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [selectedBriefing, setSelectedBriefing] = useState<PreSessionBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId: string } | null>(null);
  const [loadNotice, setLoadNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let hasRenderedUsefulData = false;
    let slowNoticeTimer: number | undefined;

    const load = async () => {
      const todayDate = new Date();
      const today = todayDate.toISOString().slice(0, 10);
      const monthEndDate = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0);
      const monthEnd = monthEndDate.toISOString().slice(0, 10);
      const upcomingWindowEndDate = new Date(todayDate);
      upcomingWindowEndDate.setDate(upcomingWindowEndDate.getDate() + 14);
      const upcomingWindowEnd = upcomingWindowEndDate.toISOString().slice(0, 10);

      setError(null);
      setLoadNotice(null);

      const {
        sessionCache: cachedSessions,
        sessionCacheAt: cachedSessionsAt,
      } = useAppStore.getState();
      const cacheIsFresh =
        cachedSessions.length > 0 &&
        Date.now() - cachedSessionsAt < SESSION_CACHE_TTL_MS;
      const cachedDashboard = readHomeDashboardCache(today);

      if (cacheIsFresh) {
        const todayData = [...cachedSessions]
          .filter((session) => session.date === today)
          .sort((a, b) => a.time.localeCompare(b.time));
        const upcomingData = [...cachedSessions]
          .filter((session) => session.event_type !== "block" && session.date > today)
          .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
          .slice(0, 6);
        setTodaySessions(todayData);
        setUpcomingSessions(upcomingData);
        hasRenderedUsefulData = todayData.length > 0 || upcomingData.length > 0;
      } else if (cachedDashboard) {
        setTodaySessions(cachedDashboard.todaySessions);
        setUpcomingSessions(cachedDashboard.upcomingSessions);
        setPendingSessions(cachedDashboard.pendingSessions);
        setPendingPayments(cachedDashboard.pendingPayments);
        setUpcomingPayments(cachedDashboard.upcomingPayments);
        setBirthdayPatients(cachedDashboard.birthdayPatients);
        setFinancialSummary(cachedDashboard.financialSummary);
        hasRenderedUsefulData = true;
      }

      setLoading(false);

      slowNoticeTimer = window.setTimeout(() => {
        if (!cancelled && !hasRenderedUsefulData) {
          setLoadNotice("Ainda sincronizando os dados. A tela ja esta pronta e os blocos serao atualizados em segundo plano.");
        }
      }, SLOW_LOAD_NOTICE_MS);

      try {

        const patientsPromise = getPatientsIndex({ ttlMs: 60_000 }).catch(() => []);
        const allSessionsPromise = cacheIsFresh
          ? Promise.resolve({ success: true as const, data: cachedSessions, request_id: "cache" })
          : sessionService.list({ from: today, to: monthEnd }, undefined, { retry: true }).then((result) => {
              if (result.success) setSessionCache(result.data);
              return result;
            });
        const pendingSessionsPromise = sessionService.list(
          { status: "pending", exclude_blocks: true },
          undefined,
          { retry: true },
        );
        const financePromise = financeService.listEntriesPage(
          { status: "open", page_size: 200 },
          undefined,
          { retry: true },
        );

        if (cancelled) return;

        void patientsPromise
          .then((patients) => {
            if (cancelled) return;
            setPatientsIndex(patients);
            const birthdays = patients
              .filter((patient) => {
                if (!patient.birth_date) return false;
                const [, month] = patient.birth_date.split("-").map(Number);
                return month === todayDate.getMonth() + 1;
              })
              .sort((a, b) => getDaysUntilBirthday(a.birth_date) - getDaysUntilBirthday(b.birth_date))
              .slice(0, 8);
            setBirthdayPatients(birthdays);
            if (birthdays.length > 0) hasRenderedUsefulData = true;
          })
          .catch(() => {
            if (!cancelled) setBirthdayPatients([]);
          });

        void allSessionsPromise
          .then((allSessionsResult) => {
            if (cancelled) return;
            if (!allSessionsResult.success) {
              setLoadNotice("Não foi possível atualizar as sessões agora. O painel continua disponível e tentará novamente ao recarregar.");
              return;
            }
            const todayData = [...allSessionsResult.data]
              .filter((session) => session.date === today)
              .sort((a, b) => a.time.localeCompare(b.time));
            setTodaySessions(todayData);
            if (todayData.length > 0) hasRenderedUsefulData = true;
            setError(null);
            setLoadNotice(null);
          })
          .catch(() => {
            if (!cancelled) {
              setLoadNotice("Não foi possível atualizar as sessões agora. O painel continua disponível e tentará novamente ao recarregar.");
            }
          });

        void pendingSessionsPromise
          .then((pendingResult) => {
            if (cancelled) return;
            if (!pendingResult.success) {
              setPendingSessions([]);
              return;
            }
            const pendingData = pendingResult.data
              .filter(
                (item) =>
                  item.event_type !== "block" &&
                  !item.patient_id.startsWith("block-") &&
                  item.date <= today &&
                  (item.clinical_note_status === "draft" || !item.has_clinical_note),
              )
              .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
            setPendingSessions(pendingData);
            if (pendingData.length > 0) hasRenderedUsefulData = true;
          })
          .catch(() => {
            if (!cancelled) setPendingSessions([]);
          });

        void financePromise
          .then((financeResult) => {
            if (cancelled) return;
            if (!financeResult.success) {
              setFinancialSummary(null);
              return;
            }
            const overdue = financeResult.data.items.filter(
              (entry) => (entry.due_date ?? "").slice(0, 10) < today,
            );
            setFinancialSummary({
              overdue_count: overdue.length,
              overdue_total: overdue.reduce((sum, entry) => sum + entry.amount, 0),
              due_soon_count: financeResult.data.items.filter(
                (entry) => (entry.due_date ?? "").slice(0, 10) >= today,
              ).length,
            });
            if (financeResult.data.items.length > 0) hasRenderedUsefulData = true;
          })
          .catch(() => {
            if (!cancelled) setFinancialSummary(null);
          });

        void Promise.all([
          sessionService.list({
            from: today,
            to: upcomingWindowEnd,
            exclude_blocks: true,
            page_size: 30,
          }, undefined, { retry: true }),
          financeService.listEntriesPage(
            {
              status: "open",
              due_from: today,
              due_to: upcomingWindowEnd,
              page_size: 40,
            },
            undefined,
            { retry: true },
          ),
        ])
          .then(([upcomingRes, futureFinanceRes]) => {
            if (cancelled) return;

            if (upcomingRes.success) {
              setSessionCache(upcomingRes.data);
              setUpcomingSessions(
                upcomingRes.data
                  .filter((item) => item.date > today)
                  .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
                  .slice(0, 6),
              );
              if (upcomingRes.data.length > 0) hasRenderedUsefulData = true;
            } else {
              setUpcomingSessions([]);
            }

            if (futureFinanceRes.success) {
              const ordered = [...futureFinanceRes.data.items].sort((a, b) => {
                const left = a.due_date ?? a.created_at;
                const right = b.due_date ?? b.created_at;
                return left.localeCompare(right);
              });
              setPendingPayments(ordered.filter((entry) => (entry.due_date ?? "").slice(0, 10) < today));
              setUpcomingPayments(
                ordered.filter((entry) => (entry.due_date ?? "").slice(0, 10) >= today).slice(0, 6),
              );
              if (ordered.length > 0) hasRenderedUsefulData = true;
            } else {
              setPendingPayments([]);
              setUpcomingPayments([]);
            }
          })
          .catch(() => {
            if (cancelled) return;
            setUpcomingSessions([]);
            setPendingPayments([]);
            setUpcomingPayments([]);
          });
      } catch {
        if (!cancelled) {
          setError({ message: "Erro inesperado ao carregar o painel inicial.", requestId: "" });
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
      if (slowNoticeTimer) window.clearTimeout(slowNoticeTimer);
    };
  }, [setSessionCache]);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const hasAnyDashboardData =
      todaySessions.length > 0 ||
      upcomingSessions.length > 0 ||
      pendingSessions.length > 0 ||
      pendingPayments.length > 0 ||
      upcomingPayments.length > 0 ||
      birthdayPatients.length > 0 ||
      !!financialSummary;

    if (!hasAnyDashboardData) return;

    writeHomeDashboardCache({
      today,
      todaySessions,
      upcomingSessions,
      pendingSessions,
      pendingPayments,
      upcomingPayments,
      birthdayPatients,
      financialSummary,
    });
  }, [
    todaySessions,
    upcomingSessions,
    pendingSessions,
    pendingPayments,
    upcomingPayments,
    birthdayPatients,
    financialSummary,
  ]);

  const mapStatus = (session: Session): SessionStatus => {
    if (session.clinical_note_status === "validated") return "validated";
    if (session.clinical_note_status === "draft") return "draft";
    return "pending";
  };

  const mapStatusLabel = (session: Session) => {
    if (session.clinical_note_status === "validated") return "Prontuário validado";
    if (session.clinical_note_status === "draft") return "Rascunho pendente";
    return "Prontuário pendente";
  };

  const getFabState = (): SessionState => {
    const all = [...todaySessions, ...pendingSessions];
    if (all.some((item) => !item.has_audio && !item.has_clinical_note)) return "no-record";
    if (all.some((item) => item.clinical_note_status === "draft")) return "draft-prontuario";
    return "no-session";
  };

  const isFirstRun = useMemo(
    () =>
      todaySessions.length === 0 &&
      upcomingSessions.length === 0 &&
      pendingSessions.length === 0 &&
      pendingPayments.length === 0 &&
      upcomingPayments.length === 0,
    [todaySessions, upcomingSessions, pendingSessions, pendingPayments, upcomingPayments],
  );

  const preSessionBriefings = useMemo(() => {
    const now = new Date();
    const windowEnd = new Date(now);
    windowEnd.setHours(windowEnd.getHours() + 48);

    return [...todaySessions, ...upcomingSessions]
      .filter((session) => session.event_type !== "block")
      .filter((session) => {
        const parsed = new Date(session.scheduled_at || `${session.date}T${session.time}:00`);
        return !Number.isNaN(parsed.getTime()) && parsed >= now && parsed <= windowEnd;
      })
      .slice(0, 6)
      .map((session) => {
        const patient =
          patientsIndex.find((item) => item.id === session.patient_id || item.external_id === session.patient_id) ??
          ({ id: session.patient_id, name: session.patient_name } as Patient);
        return buildPreSessionBriefing({
          patient,
          session,
          supervisionNotes: listSupervisionNotes(patient.id),
          financialEntries: pendingPayments.filter((entry) => entry.patient_id === patient.id || entry.patient_id === patient.external_id),
        });
      });
  }, [patientsIndex, pendingPayments, todaySessions, upcomingSessions]);

  const nextActions = useMemo(() => {
    const actions: Array<{
      id: string;
      title: string;
      description: string;
      meta: string;
      tone?: "default" | "warning";
      icon: React.ReactNode;
      onClick: () => void;
    }> = [];

    const nextBriefing = preSessionBriefings[0];
    if (nextBriefing) {
      actions.push({
        id: "prepare-session",
        title: "Preparar próxima sessão",
        description: `${maskName(nextBriefing.patientName)} · ${nextBriefing.mainComplaint || "queixa principal não registrada"}`,
        meta: nextBriefing.sessionAt ? formatDateLabel(nextBriefing.sessionAt) : "Próxima",
        icon: <Bell className="h-4 w-4" />,
        onClick: () => setSelectedBriefing(nextBriefing),
      });
    }

    const nextPendingPayment = pendingPayments[0];
    if (nextPendingPayment) {
      actions.push({
        id: "pending-payment",
        title: "Revisar pagamento pendente",
        description: `${maskName(nextPendingPayment.patient_name) || "Paciente"} · ${formatCurrency(nextPendingPayment.amount)}`,
        meta: "Financeiro",
        tone: "warning",
        icon: <AlertCircle className="h-4 w-4" />,
        onClick: () => onNavigate("finance"),
      });
    }

    const incompletePatient = patientsIndex.find((patient) => {
      const maybePatient = patient as Patient & { main_complaint?: string };
      return !maybePatient.main_complaint && (!patient.email || !patient.phone);
    });
    if (incompletePatient) {
      actions.push({
        id: "complete-patient",
        title: "Completar ficha incompleta",
        description: `${maskName(incompletePatient.name)} ainda tem campos importantes vazios.`,
        meta: "Ficha",
        icon: <UserPlus className="h-4 w-4" />,
        onClick: () => onPatientClick?.(incompletePatient.id),
      });
    }

    actions.push(
      {
        id: "tools",
        title: "Abrir ferramentas gratuitas",
        description: "Checklists, calculadoras e modelos para organizar a rotina clínica.",
        meta: "Site ETHOS",
        icon: <Wrench className="h-4 w-4" />,
        onClick: () => window.open(ETHOS_TOOLS_URL, "_blank", "noopener,noreferrer"),
      },
      {
        id: "biohub",
        title: "Ver BioHub",
        description: "BioHub atrai contatos. ETHOS organiza o cuidado.",
        meta: "Ecossistema",
        icon: <ExternalLink className="h-4 w-4" />,
        onClick: () => window.open(BIOHUB_LOGIN_URL, "_blank", "noopener,noreferrer"),
      },
    );

    return actions.slice(0, 5);
  }, [maskName, onNavigate, onPatientClick, patientsIndex, pendingPayments, preSessionBriefings]);

  useEffect(() => {
    const timers = schedulePreSessionNotifications({
      briefings: preSessionBriefings,
      enabled: true,
      minutesBeforeSession: 60,
      onClick: (briefing) => onPatientClick?.(briefing.patientId),
    });
    return () => timers.forEach((timer) => timer.clear());
  }, [onPatientClick, preSessionBriefings]);

  const copyBriefing = async (briefing: PreSessionBriefing) => {
    await navigator.clipboard.writeText(formatPreSessionBriefingText(briefing));
    toast({ title: "Briefing copiado", description: "Resumo pre-sessao copiado para a area de transferencia." });
  };

  const notifyBriefing = async (briefing: PreSessionBriefing) => {
    const result = await notifyPreSessionBriefing(briefing, {
      requireInteraction: true,
      onClick: () => onPatientClick?.(briefing.patientId),
    });
    if (result.ok) {
      toast({ title: "Notificacao enviada", description: "O briefing interno foi exibido no navegador." });
      return;
    }
    toast({
      title: result.reason === "unsupported" ? "Notificacao indisponivel" : "Permissao necessaria",
      description: "Autorize notificacoes do navegador para receber o briefing.",
      variant: "destructive",
    });
  };

  if (loading) {
    return (
      <div className="content-container py-8 md:py-12">
        <Skeleton className="mb-3 h-10 w-40" />
        <Skeleton className="mb-10 h-5 w-80" />
        <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="session-card space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-4 w-40" />
            </div>
          ))}
        </div>
        <div className="mt-8 space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <SessionCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <div className="content-container py-12">
          <h1 className="mb-8 font-serif text-3xl font-medium text-foreground md:text-4xl">
            Início
          </h1>
          <IntegrationUnavailable
            message={error.message ?? "Erro ao carregar sessões"}
            requestId={error.requestId}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12">
        <motion.header
          className="mb-10 rounded-[2rem] border border-border/80 bg-card px-4 py-5 shadow-[0_18px_44px_-28px_rgba(15,23,42,0.22)] md:px-7 md:py-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">
            ETHOS Web
          </p>
          <h1 className="max-w-3xl text-balance text-2xl font-semibold tracking-[-0.05em] text-foreground md:text-[2.35rem] xl:text-[3.4rem]">
            Início
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground md:text-[1.05rem]">
            Um panorama rápido da clínica para hoje e para os próximos dias.
          </p>
        </motion.header>

        {loadNotice ? (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p>{loadNotice}</p>
          </div>
        ) : null}

        <section className="mb-8 grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
          <SummaryCard
            title="Sessões de hoje"
            value={String(todaySessions.length)}
            description={todaySessions.length ? "Atendimentos confirmados para hoje" : "Nenhuma sessão agendada hoje"}
            icon={<Clock3 className="h-4 w-4" />}
            onClick={() => onNavigate("agenda")}
          />
          <SummaryCard
            title="Próximas sessões"
            value={String(upcomingSessions.length)}
            description={upcomingSessions.length ? "Já previstas no restante do mês" : "Sem novas sessões no mês"}
            icon={<CalendarPlus className="h-4 w-4" />}
            onClick={() => onNavigate("agenda")}
          />
          <SummaryCard
            title="Pagamentos pendentes"
            value={String(pendingPayments.length)}
            description={
              pendingPayments.length
                ? `${formatCurrency(pendingPayments.reduce((sum, entry) => sum + entry.amount, 0))} em aberto`
                : "Nenhum atraso financeiro"
            }
            icon={<AlertCircle className="h-4 w-4" />}
            onClick={() => onNavigate("finance")}
          />
          <SummaryCard
            title="Aniversariantes do mês"
            value={String(birthdayPatients.length)}
            description={birthdayPatients.length ? "Pacientes fazem aniversário neste mês" : "Sem aniversários neste mês"}
            icon={<Gift className="h-4 w-4" />}
            onClick={() => onNavigate("patients")}
          />
        </section>

        {financialSummary && financialSummary.overdue_count > 0 ? (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="flex-1">
              <span className="font-semibold text-amber-700 dark:text-amber-300">
                {financialSummary.overdue_count}{" "}
                {financialSummary.overdue_count === 1
                  ? "paciente com cobrança em atraso"
                  : "pacientes com cobranças em atraso"}
              </span>
              <span className="text-muted-foreground">
                {" · "}
                {financialSummary.overdue_total.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            </div>
            <a
              href="/financeiro?filter=overdue"
              className="text-xs font-medium text-amber-700 dark:text-amber-300 underline-offset-2 hover:underline"
            >
              Ver →
            </a>
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
          <div className="space-y-6">
            <SectionCard
              title="Sessoes para preparar"
              actionLabel={preSessionBriefings.length ? "Ver agenda" : undefined}
              onAction={preSessionBriefings.length ? () => onNavigate("agenda") : undefined}
            >
              {preSessionBriefings.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma sessao nas proximas 48h precisando de preparo agora.</p>
              ) : (
                <div className="space-y-3">
                  {preSessionBriefings.map((briefing) => (
                    <div key={`${briefing.patientId}-${briefing.sessionId}`} className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground">{maskName(briefing.patientName)}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {briefing.sessionAt ? formatDateLabel(briefing.sessionAt) : "Sem data"} · {briefing.mainComplaint || "Queixa nao registrada"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="secondary" size="sm" onClick={() => setSelectedBriefing(briefing)}>
                            Abrir briefing
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => void copyBriefing(briefing)}>
                            Copiar
                          </Button>
                          <Button variant="outline" size="sm" className="gap-1" onClick={() => void notifyBriefing(briefing)}>
                            <Bell className="h-3.5 w-3.5" />
                            Notificar antes
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
            <SectionCard title="Próximas ações" actionLabel="Ver agenda" onAction={() => onNavigate("agenda")}>
              <div className="space-y-3">
                {nextActions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    onClick={action.onClick}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-soft ${
                      action.tone === "warning"
                        ? "border-amber-500/30 bg-amber-500/10"
                        : "border-border bg-background/60 hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        {action.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold text-foreground">{action.title}</span>
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            {action.meta}
                          </span>
                        </span>
                        <span className="mt-1 block text-sm leading-6 text-muted-foreground">{action.description}</span>
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </SectionCard>
            <SectionCard
              title="Sessões de hoje"
              actionLabel={todaySessions.length ? "Abrir agenda" : undefined}
              onAction={todaySessions.length ? () => onNavigate("agenda") : undefined}
            >
              {todaySessions.length === 0 ? (
                <EmptyState
                  title="Nenhuma sessão agendada para hoje."
                  description="Cadastre um paciente ou marque o primeiro atendimento para começar."
                  primaryActionLabel="Agendar sessão"
                  onPrimaryAction={() => onNavigate("agenda")}
                  secondaryActionLabel="Cadastrar paciente"
                  onSecondaryAction={() => onNavigate("patients")}
                />
              ) : (
                <div className="space-y-3">
                  {todaySessions.map((session, index) =>
                    session.event_type === "block" ? (
                      <div
                        key={session.id}
                        className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border/70 bg-muted/30 px-3 py-2.5 transition-colors hover:bg-muted/50"
                        onClick={() => onNavigate("agenda")}
                      >
                        <Ban className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">{maskName(session.patient_name)}</p>
                          <p className="text-xs text-muted-foreground">Hoje · {session.time}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          Bloqueio
                        </span>
                      </div>
                    ) : (
                      <SessionCard
                        key={session.id}
                        patientName={maskName(session.patient_name)}
                        date="Hoje"
                        time={session.time}
                        status={mapStatus(session)}
                        statusLabel={mapStatusLabel(session)}
                        onClick={() => onSessionClick(session.id)}
                        index={index}
                      />
                    ),
                  )}
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Próximas atividades"
              actionLabel={upcomingSessions.length ? "Ver agenda" : undefined}
              onAction={upcomingSessions.length ? () => onNavigate("agenda") : undefined}
            >
              {upcomingSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma atividade cadastrada para os próximos dias.</p>
              ) : (
                <div className="space-y-3">
                  {upcomingSessions.map((session) =>
                    session.event_type === "block" ? (
                      <div
                        key={session.id}
                        className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border/70 bg-muted/30 px-3 py-2.5 transition-colors hover:bg-muted/50"
                        onClick={() => onNavigate("agenda")}
                      >
                        <Ban className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">{maskName(session.patient_name)}</p>
                          <p className="text-xs text-muted-foreground">{formatDateLabel(session.date)} · {session.time}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          Bloqueio
                        </span>
                      </div>
                    ) : (
                      <CompactRow
                        key={session.id}
                        title={maskName(session.patient_name)}
                        subtitle={`${formatDateLabel(session.date)} · ${session.time}`}
                        meta={
                          session.status === "confirmed"
                            ? "Confirmada"
                            : session.status === "cancelled_with_notice"
                              ? "Cancelado c/ aviso"
                              : session.status === "cancelled_no_show"
                                ? "Cancelado s/ aviso"
                                : session.status === "rescheduled_by_patient"
                                  ? "Remarcado"
                                  : session.status === "rescheduled_by_psychologist"
                                    ? "Remarcado p/ psicólogo"
                                    : "Agendada"
                        }
                        onClick={() => onSessionClick(session.id)}
                      />
                    ),
                  )}
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Prontuários pendentes"
              actionLabel={pendingSessions.length ? "Revisar agenda" : undefined}
              onAction={pendingSessions.length ? () => onNavigate("agenda") : undefined}
            >
              {pendingSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum prontuário pendente no momento.</p>
              ) : (
                <div className="space-y-3">
                  {pendingSessions.map((session, index) => (
                    <SessionCard
                      key={session.id}
                      patientName={maskName(session.patient_name)}
                      date={formatDateLabel(session.date)}
                      time={session.time}
                      status={mapStatus(session)}
                      statusLabel={mapStatusLabel(session)}
                      onClick={() => onSessionClick(session.id)}
                      index={index}
                    />
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

          <div className="space-y-6">
            <SectionCard title="Ferramentas gratuitas ETHOS">
              <div className="rounded-[1.25rem] border border-primary/15 bg-[linear-gradient(180deg,rgba(var(--primary-rgb),0.02),rgba(var(--primary-rgb),0.06))] p-5">
                <div className="mb-2 flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-primary" />
                  <h3 className="font-medium text-foreground">Recursos para organizar sua pratica</h3>
                </div>
                <p className="mb-4 text-sm leading-6 text-muted-foreground">
                  Checklists, calculadoras e geradores gratuitos para contrato, LGPD, agenda, prontuario e presenca digital.
                </p>
                <Button asChild className="gap-2">
                  <a href={ETHOS_TOOLS_URL} target="_blank" rel="noreferrer">
                    Abrir ferramentas <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </SectionCard>

            <SectionCard title="Produto do ecossistema ETHOS: BioHub">
              <BioHubIntegrationCard />
            </SectionCard>

            <SectionCard title="Próximos pagamentos" actionLabel="Financeiro" onAction={() => onNavigate("finance")}>
              {upcomingPayments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum próximo vencimento registrado.</p>
              ) : (
                <div className="space-y-3">
                  {upcomingPayments.map((entry) => (
                    <CompactRow
                      key={entry.id}
                      title={maskName(entry.patient_name) || "Paciente"}
                      subtitle={`Vence em ${formatDateLabel(entry.due_date)}`}
                      meta={formatCurrency(entry.amount)}
                      onClick={() => onNavigate("finance")}
                    />
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Pagamentos pendentes"
              actionLabel={pendingPayments.length ? "Cobrar no financeiro" : undefined}
              onAction={pendingPayments.length ? () => onNavigate("finance") : undefined}
            >
              {pendingPayments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum pagamento em atraso.</p>
              ) : (
                <div className="space-y-3">
                  {pendingPayments.map((entry) => (
                    <CompactRow
                      key={entry.id}
                      title={maskName(entry.patient_name) || "Paciente"}
                      subtitle={`Vencimento ${formatDateLabel(entry.due_date)}`}
                      meta={formatCurrency(entry.amount)}
                      tone="warning"
                      onClick={() => onNavigate("finance")}
                    />
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Aniversariantes do mês"
              actionLabel={birthdayPatients.length ? "Pacientes" : undefined}
              onAction={birthdayPatients.length ? () => onNavigate("patients") : undefined}
            >
              {birthdayPatients.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum aniversariante cadastrado neste mês.</p>
              ) : (
                <div className="space-y-3">
                  {birthdayPatients.map((patient) => (
                    <CompactRow
                      key={patient.id}
                      title={maskName(patient.name)}
                      subtitle={`${formatBirthdayLabel(patient.birth_date)}${getBirthdayAge(patient.birth_date) ? ` · Faz ${getBirthdayAge(patient.birth_date)} anos` : ""}`}
                      meta={getBirthdayDistanceLabel(patient.birth_date)}
                      badge={getBirthdayBadge(patient.birth_date)}
                      stackedMeta
                      onClick={() => onPatientClick?.(patient.id)}
                    />
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      </div>

      <FloatingActionButton
        state={getFabState()}
        onClick={() => onNavigate(isFirstRun ? "patients" : "agenda")}
      />
      <Dialog open={!!selectedBriefing} onOpenChange={(open) => !open && setSelectedBriefing(null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Briefing pre-sessao</DialogTitle>
          </DialogHeader>
          {selectedBriefing ? (
            <PreSessionBriefingPanel
              briefing={selectedBriefing}
              onCopy={() => void copyBriefing(selectedBriefing)}
              onNotify={() => void notifyBriefing(selectedBriefing)}
              onOpenPatient={onPatientClick ? () => onPatientClick(selectedBriefing.patientId) : undefined}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

function SummaryCard({
  title,
  value,
  description,
  icon,
  onClick,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  onClick?: () => void;
}) {
  const body = (
    <motion.div
      className="session-card overflow-hidden"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {title}
        </p>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/[0.08] text-primary">
          {icon}
        </span>
      </div>
      <p className="mt-4 text-[1.6rem] font-semibold tracking-[-0.04em] text-foreground md:mt-5 md:text-[2.2rem]">
        {value}
      </p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground md:mt-2 md:text-sm md:leading-6">{description}</p>
    </motion.div>
  );

  if (!onClick) return body;

  return (
    <button type="button" className="w-full text-left" onClick={onClick}>
      {body}
    </button>
  );
}

function SectionCard({
  title,
  actionLabel,
  onAction,
  children,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      className="session-card space-y-5"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-[1.4rem] font-semibold tracking-[-0.03em] text-foreground">
            {title}
          </h2>
        </div>
        {actionLabel && onAction ? (
          <Button variant="ghost" size="sm" className="shrink-0 text-primary" onClick={onAction}>
            {actionLabel}
          </Button>
        ) : null}
      </div>
      {children}
    </motion.section>
  );
}

function CompactRow({
  title,
  subtitle,
  meta,
  badge,
  stackedMeta = false,
  onClick,
  tone = "default",
}: {
  title: string;
  subtitle: string;
  meta: string;
  badge?: string | null;
  stackedMeta?: boolean;
  onClick?: () => void;
  tone?: "default" | "warning";
}) {
  const body = (
    <div
      className={`rounded-xl border px-4 py-3 transition-colors ${
        tone === "warning"
          ? "border-status-pending/30 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(255,248,235,1))] dark:border-status-pending/45 dark:bg-[linear-gradient(180deg,rgba(86,60,18,0.55),rgba(56,39,14,0.86))]"
          : "border-border bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(248,250,252,0.82))] dark:border-border/90 dark:bg-[linear-gradient(180deg,rgba(40,46,54,0.92),rgba(26,31,37,0.98))]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-[15px] font-semibold text-foreground">{title}</p>
            {badge ? (
              <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary dark:bg-primary/20">
                {badge}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground dark:text-foreground/72">{subtitle}</p>
        </div>
        <div className={`shrink-0 text-right ${stackedMeta ? "self-start pt-0.5" : ""}`}>
          <p className="text-sm font-semibold text-foreground dark:text-foreground">{meta}</p>
        </div>
      </div>
    </div>
  );

  if (!onClick) return body;

  return (
    <button type="button" className="w-full text-left" onClick={onClick}>
      {body}
    </button>
  );
}

function EmptyState({
  title,
  description,
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
}: {
  title: string;
  description: string;
  primaryActionLabel: string;
  onPrimaryAction: () => void;
  secondaryActionLabel: string;
  onSecondaryAction: () => void;
}) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-border bg-secondary/40 p-6">
      <p className="text-[1rem] font-semibold text-foreground">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button className="gap-2" onClick={onPrimaryAction}>
          <CalendarPlus className="h-4 w-4" />
          {primaryActionLabel}
        </Button>
        <Button variant="secondary" className="gap-2" onClick={onSecondaryAction}>
          <UserPlus className="h-4 w-4" />
          {secondaryActionLabel}
        </Button>
      </div>
    </div>
  );
}

export default HomePage;
