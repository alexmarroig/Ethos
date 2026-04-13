import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, CalendarPlus, Clock3, Gift, UserPlus } from "lucide-react";
import SessionCard, { SessionStatus } from "@/components/SessionCard";
import FloatingActionButton, { SessionState } from "@/components/FloatingActionButton";
import { sessionService, type Session } from "@/services/sessionService";
import { financeService, type FinancialEntry } from "@/services/financeService";
import { patientService, type Patient } from "@/services/patientService";
import IntegrationUnavailable from "@/components/IntegrationUnavailable";
import { Skeleton } from "@/components/ui/skeleton";
import { SessionCardSkeleton } from "@/components/SkeletonCards";
import { Button } from "@/components/ui/button";

interface HomePageProps {
  onSessionClick: (sessionId: string) => void;
  onNavigate: (page: string) => void;
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
  const [year, month, day] = value.split("-").map(Number);
  if (!month || !day) return value;
  return new Date(2000, month - 1, day).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
  });
};

const getDaysUntilBirthday = (birthDate?: string) => {
  if (!birthDate) return Number.POSITIVE_INFINITY;

  const [year, month, day] = birthDate.split("-").map(Number);
  if (!month || !day) return Number.POSITIVE_INFINITY;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let nextBirthday = new Date(today.getFullYear(), month - 1, day);

  if (nextBirthday < today) {
    nextBirthday = new Date(today.getFullYear() + 1, month - 1, day);
  }

  return Math.round((nextBirthday.getTime() - today.getTime()) / 86_400_000);
};

const HomePage = ({ onSessionClick, onNavigate }: HomePageProps) => {
  const [todaySessions, setTodaySessions] = useState<Session[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [pendingSessions, setPendingSessions] = useState<Session[]>([]);
  const [pendingPayments, setPendingPayments] = useState<FinancialEntry[]>([]);
  const [upcomingPayments, setUpcomingPayments] = useState<FinancialEntry[]>([]);
  const [birthdayPatients, setBirthdayPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const todayDate = new Date();
      const today = todayDate.toISOString().slice(0, 10);
      const monthStart = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1).toISOString().slice(0, 10);
      const monthEnd = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0).toISOString().slice(0, 10);

      const [todayRes, pendingRes, upcomingRes, financeRes, patientsRes] = await Promise.all([
        sessionService.list({ from: today, to: today }),
        sessionService.list({ status: "pending" }),
        sessionService.list({ from: today, to: monthEnd }),
        financeService.listEntries({ status: "open" }),
        patientService.list(),
      ]);

      if (!todayRes.success) {
        setError({ message: todayRes.error.message, requestId: todayRes.request_id });
        setLoading(false);
        return;
      }

      const todayData = [...todayRes.data].sort((a, b) => a.time.localeCompare(b.time));
      setTodaySessions(todayData);

      if (pendingRes.success) {
        const pendingData = pendingRes.data
          .filter((item) => item.date < today || item.clinical_note_status === "draft" || !item.has_clinical_note)
          .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
        setPendingSessions(pendingData);
      } else {
        setPendingSessions([]);
      }

      if (upcomingRes.success) {
        const upcomingData = upcomingRes.data
          .filter((item) => item.date > today)
          .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
          .slice(0, 6);
        setUpcomingSessions(upcomingData);
      } else {
        setUpcomingSessions([]);
      }

      if (financeRes.success) {
        const ordered = [...financeRes.data].sort((a, b) => {
          const left = a.due_date ?? a.created_at;
          const right = b.due_date ?? b.created_at;
          return left.localeCompare(right);
        });

        setPendingPayments(ordered.filter((entry) => (entry.due_date ?? "").slice(0, 10) < today));
        setUpcomingPayments(
          ordered.filter((entry) => {
            const dueDate = (entry.due_date ?? "").slice(0, 10);
            return dueDate >= today && dueDate >= monthStart;
          }).slice(0, 6),
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
          .sort((a, b) => getDaysUntilBirthday(a.birth_date) - getDaysUntilBirthday(b.birth_date))
          .slice(0, 8);
        setBirthdayPatients(birthdays);
      } else {
        setBirthdayPatients([]);
      }

      setError(null);
      setLoading(false);
    };

    void load();
  }, []);

  const mapStatus = (session: Session): SessionStatus => {
    if (session.clinical_note_status === "validated") return "validated";
    if (session.clinical_note_status === "draft") return "draft";
    return "pending";
  };

  const mapStatusLabel = (session: Session) => {
    if (session.clinical_note_status === "validated") return "Prontuario validado";
    if (session.clinical_note_status === "draft") return "Rascunho pendente";
    return "Prontuario pendente";
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

  if (loading) {
    return (
      <div className="content-container py-8 md:py-12">
        <Skeleton className="mb-3 h-10 w-40" />
        <Skeleton className="mb-10 h-5 w-80" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
          <IntegrationUnavailable message={error.message} requestId={error.requestId} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12">
        <motion.header
          className="mb-10 rounded-[2rem] border border-border/80 bg-card px-7 py-8 shadow-[0_18px_44px_-28px_rgba(15,23,42,0.22)] md:px-10 md:py-10"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">
            ETHOS Web
          </p>
          <h1 className="max-w-3xl text-balance text-[2.35rem] font-semibold tracking-[-0.05em] text-foreground md:text-[3.4rem]">
            Início
          </h1>
          <p className="mt-4 max-w-2xl text-[1.05rem] leading-7 text-muted-foreground">
            Um panorama rápido da clínica para hoje e para os próximos dias.
          </p>
        </motion.header>

        <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Sessões de hoje"
            value={String(todaySessions.length)}
            description={todaySessions.length ? "atendimentos confirmados para hoje" : "nenhuma sessão agendada hoje"}
            icon={<Clock3 className="h-4 w-4" />}
          />
          <SummaryCard
            title="Próximas sessões"
            value={String(upcomingSessions.length)}
            description={upcomingSessions.length ? "já previstas no restante do mês" : "sem novas sessões no mês"}
            icon={<CalendarPlus className="h-4 w-4" />}
          />
          <SummaryCard
            title="Pagamentos pendentes"
            value={String(pendingPayments.length)}
            description={
              pendingPayments.length
                ? `${formatCurrency(pendingPayments.reduce((sum, entry) => sum + entry.amount, 0))} em aberto`
                : "nenhum atraso financeiro"
            }
            icon={<AlertCircle className="h-4 w-4" />}
          />
          <SummaryCard
            title="Aniversariantes do mês"
            value={String(birthdayPatients.length)}
            description={birthdayPatients.length ? "pacientes fazem aniversário neste mês" : "sem aniversários neste mês"}
            icon={<Gift className="h-4 w-4" />}
          />
        </section>

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
                  {todaySessions.map((session, index) => (
                    <SessionCard
                      key={session.id}
                      patientName={session.patient_name}
                      date="Hoje"
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

            <SectionCard
              title="Próximas sessões"
              actionLabel={upcomingSessions.length ? "Ver agenda" : undefined}
              onAction={upcomingSessions.length ? () => onNavigate("agenda") : undefined}
            >
              {upcomingSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma próxima sessão cadastrada para os próximos dias.</p>
              ) : (
                <div className="space-y-3">
                  {upcomingSessions.map((session) => (
                    <CompactRow
                      key={session.id}
                      title={session.patient_name}
                      subtitle={`${formatDateLabel(session.date)} · ${session.time}`}
                      meta={session.status === "confirmed" ? "Confirmada" : "Agendada"}
                      onClick={() => onSessionClick(session.id)}
                    />
                  ))}
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
                      patientName={session.patient_name}
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
                <p className="text-sm text-muted-foreground">Nenhum próximo vencimento registrado.</p>
              ) : (
                <div className="space-y-3">
                  {upcomingPayments.map((entry) => (
                    <CompactRow
                      key={entry.id}
                      title={entry.patient_name || "Paciente"}
                      subtitle={`Vence em ${formatDateLabel(entry.due_date)}`}
                      meta={formatCurrency(entry.amount)}
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
                      title={entry.patient_name || "Paciente"}
                      subtitle={`Vencimento ${formatDateLabel(entry.due_date)}`}
                      meta={formatCurrency(entry.amount)}
                      tone="warning"
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
                      title={patient.name}
                      subtitle={formatBirthdayLabel(patient.birth_date)}
                      meta={getDaysUntilBirthday(patient.birth_date) === 0 ? "Hoje" : `Em ${getDaysUntilBirthday(patient.birth_date)} dia(s)`}
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
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{title}</p>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/[0.08] text-primary">{icon}</span>
      </div>
      <p className="mt-5 text-[2.2rem] font-semibold tracking-[-0.04em] text-foreground">{value}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
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
        <div>
          <h2 className="text-[1.4rem] font-semibold tracking-[-0.03em] text-foreground">{title}</h2>
        </div>
        {actionLabel && onAction ? (
          <Button variant="ghost" size="sm" className="text-primary" onClick={onAction}>
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
  onClick,
  tone = "default",
}: {
  title: string;
  subtitle: string;
  meta: string;
  onClick?: () => void;
  tone?: "default" | "warning";
}) {
  const body = (
    <div
      className={`rounded-xl border px-4 py-3 transition-colors ${
        tone === "warning"
          ? "border-status-pending/25 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,248,235,1))]"
          : "border-border bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(248,250,252,0.82))]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold text-foreground">{meta}</p>
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
