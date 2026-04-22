import { useMemo } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Ban, CalendarPlus, Clock3, Gift, UserPlus } from "lucide-react";
import SessionCard, { SessionStatus } from "@/components/SessionCard";
import FloatingActionButton, { SessionState } from "@/components/FloatingActionButton";
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
import {
  useFinancialEntries,
  useFinancialSummary,
  usePatients,
  useSessions,
} from "@/hooks/useDomainQueries";

interface HomePageProps {
  onSessionClick: (sessionId: string) => void;
  onNavigate: (page: string) => void;
  onPatientClick?: (patientId: string) => void;
}

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
  if (distance === 0) return "É Hoje";
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

const HomePage = ({ onSessionClick, onNavigate }: HomePageProps) => {
  const { maskName } = usePrivacy();
  const sessionCache = useAppStore((s) => s.sessionCache);
  const sessionCacheAt = useAppStore((s) => s.sessionCacheAt);
  const setSessionCache = useAppStore((s) => s.setSessionCache);
  const [todaySessions, setTodaySessions] = useState<Session[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [pendingSessions, setPendingSessions] = useState<Session[]>([]);
  const [pendingPayments, setPendingPayments] = useState<FinancialEntry[]>([]);
  const [upcomingPayments, setUpcomingPayments] = useState<FinancialEntry[]>([]);
  const [birthdayPatients, setBirthdayPatients] = useState<Patient[]>([]);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const todayDate = new Date();
      const today = todayDate.toISOString().slice(0, 10);
      const upcomingWindowEndDate = new Date(todayDate);
      upcomingWindowEndDate.setDate(upcomingWindowEndDate.getDate() + 14);
      const upcomingWindowEnd = upcomingWindowEndDate.toISOString().slice(0, 10);

      // Use cache if fresh (< 60s) — avoids redundant API call when navigating from Agenda
      const cacheIsFresh = sessionCache.length > 0 && (Date.now() - sessionCacheAt) < SESSION_CACHE_TTL_MS;

      const patientsPromise = getPatientsIndex();
      const allSessionsPromise = patientsPromise.then((patients) => (
        cacheIsFresh
          ? Promise.resolve({ success: true as const, data: sessionCache, request_id: "cache" })
          : sessionService.list({ from: today, to: monthEnd }, patients).then((r) => {
              if (r.success) setSessionCache(r.data);
              return r;
            })
      ));
      const pendingSessionsPromise = patientsPromise.then((patients) =>
        sessionService.list({ status: "pending", exclude_blocks: true }, patients),
      );
      const financePromise = patientsPromise.then((patients) =>
        financeService.listEntries({ status: "open" }, patients),
      );

      const [patients, allSessionsData, pendingRes, financeRes] = await Promise.all([
        patientsPromise,
        allSessionsPromise,
        pendingSessionsPromise,
        financePromise,
      ]);
      if (!todayRes.success) {
        setError({ message: (todayRes as any).error?.message ?? "Erro ao carregar sessões", requestId: (todayRes as any).request_id ?? "" });
        setLoading(false);
        return;
      }

      const todayData = [...todayRes.data].sort((a, b) => a.time.localeCompare(b.time));
      setTodaySessions(todayData);

      if (pendingRes.success) {
        const pendingData = pendingRes.data
          .filter(
            (item) =>
              item.event_type !== "block" &&
              !item.patient_id.startsWith("block-") &&
              (item.date <= today) && // Only past or today
              (item.clinical_note_status === "draft" || !item.has_clinical_note)
          )
          .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
        setPendingSessions(pendingData);
      } else {
        setPendingSessions([]);
      }

      if (financeSummaryRes.success) setFinancialSummary(financeSummaryRes.data);

      setError(null);
      setLoading(false);

      // Load non-critical sections in background.
      void Promise.all([
        sessionService.list({
          from: today,
          to: upcomingWindowEnd,
          exclude_blocks: true,
          page_size: 30,
        }),
        financeService.listEntriesPage({
          status: "open",
          due_from: today,
          due_to: upcomingWindowEnd,
          page_size: 40,
        }),
        patientService.list(),
      ]).then(([upcomingRes, financeRes, patientsRes]) => {
        if (upcomingRes.success) {
          setSessionCache(upcomingRes.data);
          setUpcomingSessions(
            upcomingRes.data
              .filter((item) => item.date > today)
              .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
              .slice(0, 6),
          );
        } else {
          setUpcomingSessions([]);
        }

        if (financeRes.success) {
          const ordered = [...financeRes.data.items].sort((a, b) => {
            const left = a.due_date ?? a.created_at;
            const right = b.due_date ?? b.created_at;
            return left.localeCompare(right);
          });
          setPendingPayments(
            ordered.filter((entry) => (entry.due_date ?? "").slice(0, 10) < today),
          );
          setUpcomingPayments(
            ordered.filter((entry) => (entry.due_date ?? "").slice(0, 10) >= today).slice(0, 6),
          );
        } else {
          setPendingPayments([]);
          setUpcomingPayments([]);
        }

        if (patientsRes.success) {
          const birthdays = patientsRes.data
            .filter((patient) => {
              if (!patient.birth_date) return false;
              const [, month] = patient.birth_date.split("-").map(Number);
              return month === todayDate.getMonth() + 1;
            })
            .sort(
              (a, b) => getDaysUntilBirthday(a.birth_date) - getDaysUntilBirthday(b.birth_date),
            )
            .slice(0, 8);
          setBirthdayPatients(birthdays);
        } else {
          setBirthdayPatients([]);
        }
      }).catch(() => {
        setUpcomingSessions([]);
        setPendingPayments([]);
        setUpcomingPayments([]);
      }

      const birthdays = patients
        .filter((patient) => {
          if (!patient.birth_date) return false;
          const [, month] = patient.birth_date.split("-").map(Number);
          return month === todayDate.getMonth() + 1;
        })
        .sort(
          (a, b) => getDaysUntilBirthday(a.birth_date) - getDaysUntilBirthday(b.birth_date),
        )
        .slice(0, 8);
      setBirthdayPatients(birthdays);

      setError(null);
      setLoading(false);
    };

    void load();
  // Re-run when session cache updates so the home page reflects changes instantly
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionCacheAt]);

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
    if (all.some((item) => item.clinical_note_status === "draft")) {
      return "draft-prontuario";
    }
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

  if (criticalError) {
    return (
      <div className="min-h-screen">
        <div className="content-container py-12">
          <h1 className="mb-8 font-serif text-3xl font-medium text-foreground md:text-4xl">
            Início
          </h1>
          <IntegrationUnavailable message={criticalError.message ?? "Erro ao carregar sessões"} requestId="" />
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

        <section className="mb-8 grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
          <SummaryCard
            title="Sessões de hoje"
            value={String(todaySessions.length)}
            description={
              todaySessions.length
                ? "Atendimentos confirmados para hoje"
                : "Nenhuma sessão agendada hoje"
            }
            icon={<Clock3 className="h-4 w-4" />}
            onClick={() => onNavigate("agenda")}
          />
          <SummaryCard
            title="Próximas sessões"
            value={String(upcomingSessions.length)}
            description={
              upcomingSessions.length
                ? "Já previstas no restante do mês"
                : "Sem novas sessões no mês"
            }
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
            description={
              birthdayPatients.length
                ? "Pacientes fazem aniversário neste mês"
                : "Sem aniversários neste mês"
            }
            icon={<Gift className="h-4 w-4" />}
            onClick={() => onNavigate("patients")}
          />
        </section>

        {financialSummary && financialSummary.overdue_count > 0 && (
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
        )}

        <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
          <div className="space-y-6">
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
                        className="flex items-center gap-3 rounded-xl border border-dashed border-border/70 bg-muted/30 px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
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
                    )
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
                <p className="text-sm text-muted-foreground">
                  Nenhuma atividade cadastrada para os próximos dias.
                </p>
              ) : (
                <div className="space-y-3">
                  {upcomingSessions.map((session) =>
                    session.event_type === "block" ? (
                      <div
                        key={session.id}
                        className="flex items-center gap-3 rounded-xl border border-dashed border-border/70 bg-muted/30 px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
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
                          session.status === "confirmed" ? "Confirmada"
                          : session.status === "cancelled_with_notice" ? "Cancelado c/ aviso"
                          : session.status === "cancelled_no_show" ? "Cancelado s/ aviso"
                          : session.status === "rescheduled_by_patient" ? "Remarcado"
                          : session.status === "rescheduled_by_psychologist" ? "Remarcado p/ psicólogo"
                          : "Agendada"
                        }
                        onClick={() => onSessionClick(session.id)}
                      />
                    )
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
                <p className="text-sm text-muted-foreground">
                  Nenhum prontuário pendente no momento.
                </p>
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
            <SectionCard
              title="Próximos pagamentos"
              actionLabel="Financeiro"
              onAction={() => onNavigate("finance")}
            >
              {upcomingPayments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum próximo vencimento registrado.
                </p>
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
                <p className="text-sm text-muted-foreground">
                  Nenhum aniversariante cadastrado neste mês.
                </p>
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
    </div>
  );
};

function SummaryCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
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
          <p className="mt-1 text-sm text-muted-foreground dark:text-foreground/72">
            {subtitle}
          </p>
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
