import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import PatientProgressTab from "./PatientProgressTab";
import { motion } from "framer-motion";
import {
  Sparkles,
  ArrowLeft,
  Bell,
  CalendarPlus,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  FileText,
  History,
  KeyRound,
  Loader2,
  MessageCircle,
  Moon,
  MoreHorizontal,
  RotateCcw,
  Save,
  Brain,
  RefreshCw,
  Trash,
  Trash2,
  User,
  Pin,
  PinOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { usePrivacy } from "@/hooks/usePrivacy";
import { buildPaymentReminderMessage, readPaymentReminderSettings } from "@/services/paymentReminderSettings";
import { buildSessionReminderMessage, readSessionReminderSettings } from "@/services/sessionReminderSettings";
import { sessionReminderApi } from "@/api/clinical";
import { formatPhone, cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import IntegrationUnavailable from "@/components/IntegrationUnavailable";
import { useAuth } from "@/contexts/AuthContext";
import { patientService, type PatientDetail } from "@/services/patientService";
import { formService, type FormAssignment, type FormEntry } from "@/services/formService";
import { sessionService } from "@/services/sessionService";
import { useAppStore } from "@/stores/appStore";
import { contractsApi, documentsApi } from "@/api/clinical";
import { api } from "@/services/apiClient";
import type { DreamDiaryEntry } from "@/services/patientPortalService";
import type { Contract } from "@/api/types";
import { reportService } from "@/services/reportService";
import { financeService, type FinancialPackage, type FinancialPackageConsumption } from "@/services/financeService";
import { clinicalSynthesisService, type ClinicalSynthesis } from "@/services/clinicalSynthesisService";
import {
  buildPreSessionBriefingText,
  deleteSupervisionNote,
  listSupervisionNotes,
  normalizeSupervisionTags,
  readPreSessionBriefingSettings,
  savePreSessionBriefingSettings,
  saveSupervisionNote,
  toggleSupervisionNotePinned,
  type PreSessionBriefingSettings,
  type SupervisionNote,
  type SupervisionPriority,
} from "@/services/supervisionNotesService";
import { ClinicalSynthesisCard } from "@/components/ClinicalSynthesisCard";
import { buildClinicalDocumentHtml } from "@/lib/documentBuilders";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { PatientApproachSelector } from '../components/PatientApproachSelector';
import { getPatientApproach, setPatientApproach } from '../services/approachStorageService';
import type { Approach } from '../types/approach';

type PatientDetailPageProps = {
  patientId: string;
  onBack: () => void;
  onOpenSession: (sessionId: string) => void;
  onOpenProntuario: (sessionId: string) => void;
};

type DocumentFormValues = Record<string, string>;

type SupervisionDraftState = {
  title: string;
  content: string;
  focus: string;
  nextSessionPrompt: string;
  tags: string;
  priority: SupervisionPriority;
};

type PatientFormState = {
  name: string;
  care_status: "active" | "paused" | "transferred" | "inactive";
  email: string;
  phone: string;
  whatsapp: string;
  birth_date: string;
  address: string;
  address_street: string;
  address_number: string;
  address_complement: string;
  address_neighborhood: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  cpf: string;
  profession: string;
  referral_source: string;
  care_interest: string;
  therapy_goals: string;
  main_complaint: string;
  psychiatric_medications: string;
  has_psychiatric_followup: boolean;
  psychiatrist_name: string;
  psychiatrist_contact: string;
  emergency_contact_name: string;
  emergency_contact_relationship: string;
  emergency_contact_phone: string;
  education_level: string;
  marital_status: string;
  legal_guardian_name: string;
  legal_guardian_relationship: string;
  report_indication: string;
  recurring_techniques: string;
  report_notes: string;
  notes: string;
  billing_mode: "per_session" | "package";
  weekly_frequency: string;
  session_price: string;
  package_total_price: string;
  package_session_count: string;
  payment_timing: "advance" | "after";
  preferred_payment_day: string;
  billing_reminder_days: number;
  billing_auto_charge: boolean;
};

const emptyForm: PatientFormState = {
  name: "",
  care_status: "active",
  email: "",
  phone: "",
  whatsapp: "",
  birth_date: "",
  address: "",
  address_street: "",
  address_number: "",
  address_complement: "",
  address_neighborhood: "",
  address_city: "",
  address_state: "",
  address_zip: "",
  cpf: "",
  profession: "",
  referral_source: "",
  care_interest: "",
  therapy_goals: "",
  main_complaint: "",
  psychiatric_medications: "",
  has_psychiatric_followup: false,
  psychiatrist_name: "",
  psychiatrist_contact: "",
  emergency_contact_name: "",
  emergency_contact_relationship: "",
  emergency_contact_phone: "",
  education_level: "",
  marital_status: "",
  legal_guardian_name: "",
  legal_guardian_relationship: "",
  report_indication: "",
  recurring_techniques: "",
  report_notes: "",
  notes: "",
  billing_mode: "per_session",
  weekly_frequency: "1",
  session_price: "",
  package_total_price: "",
  package_session_count: "",
  payment_timing: "after",
  preferred_payment_day: "",
  billing_reminder_days: 0,
  billing_auto_charge: true,
};

const emptySupervisionDraft: SupervisionDraftState = {
  title: "",
  content: "",
  focus: "",
  nextSessionPrompt: "",
  tags: "",
  priority: "normal",
};

const CollapsibleSection = ({
  title,
  subtitle,
  children,
  isOpen,
  onToggle,
  icon: Icon,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  icon?: any;
}) => {
  return (
    <Collapsible open={isOpen} onOpenChange={onToggle} className="session-card space-y-5">
      <div className="flex items-center justify-between">
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              {Icon ? <Icon className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="font-serif text-2xl text-foreground flex items-center gap-2">
                {title}
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </h2>
              {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
            </div>
          </button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="space-y-5 pt-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Não definido";

const formatDateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Não definido";

const normalizeStr = (str?: string) => 
  str?.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim() ?? "";

const formatCurrency = (value?: number) =>
  typeof value === "number"
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
    : "Não definido";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const CEP_REGEX = /^\d{5}-?\d{3}$/;
const CPF_REGEX = /^\d{11}$|^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
const PHONE_REGEX = /^\d{10,11}$/;

const toInputDate = (value?: string) => (value ? new Date(value).toISOString().slice(0, 10) : "");
const onlyDigits = (value: string) => value.replace(/\D/g, "");
const formatCpfInput = (value: string) => {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
};
const formatCepInput = (value: string) => {
  const digits = onlyDigits(value).slice(0, 8);
  return digits.replace(/^(\d{5})(\d)/, "$1-$2");
};

const parseAccessCredentials = (credentials?: string | null) => {
  if (!credentials) return null;
  const emailMatch = credentials.match(/Email:\s*([^|]+)/i);
  const passwordMatch = credentials.match(/Senha:\s*(.+)$/i);
  return {
    email: emailMatch?.[1]?.trim() ?? "",
    password: passwordMatch?.[1]?.trim() ?? "",
  };
};

const isValidCpf = (value: string) => {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  for (let index = 0; index < 9; index += 1) {
    sum += Number(cpf[index]) * (10 - index);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== Number(cpf[9])) return false;

  sum = 0;
  for (let index = 0; index < 10; index += 1) {
    sum += Number(cpf[index]) * (11 - index);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  return remainder === Number(cpf[10]);
};

const buildDocumentTitle = (patientName: string, label: string) => `${label} - ${patientName}`;
const sessionStatusLabel = (status?: string) => {
  switch (status) {
    case "scheduled":
    case "pending": return "Agendado";
    case "confirmed": return "Confirmado";
    case "completed": return "Concluído";
    case "missed": return "Faltou";
    case "cancelled_with_notice": return "Cancelado c/ aviso";
    case "cancelled_no_show": return "Cancelado s/ aviso";
    case "rescheduled_by_patient": return "Remarcado";
    case "rescheduled_by_psychologist": return "Remarcado p/ psicólogo";
    default: return status ?? "Não definido";
  }
};

function extractClinicalEvolutionFromNotes(notes: unknown[]) {
  const normalized = notes
    .map((note) => note as {
      created_at?: string;
      updated_at?: string;
      content?: { evolucao?: string; evolution?: string };
      evolucao?: string;
      evolution?: string;
      text?: string;
    })
    .sort((a, b) =>
      Date.parse(b.updated_at ?? b.created_at ?? "") - Date.parse(a.updated_at ?? a.created_at ?? ""),
    );

  for (const note of normalized) {
    const value = note.content?.evolucao ?? note.content?.evolution ?? note.evolucao ?? note.evolution ?? note.text;
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return "";
}

const documentTemplateLabel = (templateId?: string) => {
  switch (templateId) {
    case "payment-receipt":
      return "Recibo";
    case "attendance-declaration":
      return "Declaração";
    case "psychological-certificate":
      return "Atestado psicológico";
    case "therapy-contract":
      return "Contrato terapêutico";
    case "psychological-report":
      return "Relatório psicológico";
    default:
      return "Documento";
  }
};

const supportsGuidedDocumentEditor = (templateId?: string) =>
  templateId === "payment-receipt" ||
  templateId === "attendance-declaration" ||
  templateId === "psychological-certificate";

const buildDefaultDocumentFormValues = (
  templateId: string,
  detail: PatientDetail,
  profile: PatientFormState,
) => {
  const today = new Date().toLocaleDateString("pt-BR");

  switch (templateId) {
    case "payment-receipt":
      return {
        amount: profile.session_price || "",
        payment_method: "",
        service_type: "session",
        attendance_date: today,
        date_label: today,
      };
    case "attendance-declaration":
      return {
        attendance_date: today,
        attendance_time: "",
        date_label: today,
      };
    case "psychological-certificate":
      return {
        period_start: today,
        period_end: today,
        cid_code: "",
        date_label: today,
      };
    default:
      return {
        patient_name: detail.patient.name,
        date_label: today,
      };
  }
};

export default function PatientDetailPage({
  patientId,
  onBack,
  onOpenSession,
  onOpenProntuario,
}: PatientDetailPageProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const upsertSession = useAppStore((s) => s.upsertSession);
  const { maskName } = usePrivacy();
  const [detail, setDetail] = useState<PatientDetail | null>(null);
  const [form, setForm] = useState<PatientFormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [synthesis, setSynthesis] = useState<ClinicalSynthesis | null>(null);
  const [loadingSynthesis, setLoadingSynthesis] = useState(false);
  const evolucaoRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<{ message: string; requestId: string } | null>(null);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [sessionDate, setSessionDate] = useState("");
  const [sessionTime, setSessionTime] = useState("");
  const [sessionDuration, setSessionDuration] = useState("50");
  const [accessOpen, setAccessOpen] = useState(false);
  const [grantingAccess, setGrantingAccess] = useState(false);
  const [portalEmail, setPortalEmail] = useState("");
  const [portalName, setPortalName] = useState("");
  const [portalPassword, setPortalPassword] = useState("");
  const [accessCredentials, setAccessCredentials] = useState<string | null>(null);
  const [resettingAccess, setResettingAccess] = useState(false);
  const [shortcutLoading, setShortcutLoading] = useState<string | null>(null);
  const [paymentReminderOpen, setPaymentReminderOpen] = useState(false);
  const [paymentReminderMessage, setPaymentReminderMessage] = useState("");
  const [sessionReminderOpen, setSessionReminderOpen] = useState(false);
  const [sessionReminderMessage, setSessionReminderMessage] = useState("");
  const [sessionReminderEnabled, setSessionReminderEnabled] = useState(false);
  const [supervisionNotes, setSupervisionNotes] = useState<SupervisionNote[]>(() => listSupervisionNotes(patientId));
  const [supervisionDraft, setSupervisionDraft] = useState<SupervisionDraftState>(emptySupervisionDraft);
  const [editingSupervisionId, setEditingSupervisionId] = useState<string | null>(null);
  const [preSessionBriefingOpen, setPreSessionBriefingOpen] = useState(false);
  const [preSessionSettings, setPreSessionSettings] = useState<PreSessionBriefingSettings>(() => readPreSessionBriefingSettings(patientId));
  const preSessionTimerRef = useRef<number | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [formAssignments, setFormAssignments] = useState<FormAssignment[]>([]);
  const [allFormEntries, setAllFormEntries] = useState<FormEntry[]>([]);
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [dreamDiaryEntries, setDreamDiaryEntries] = useState<DreamDiaryEntry[]>([]);
  const [financialPackages, setFinancialPackages] = useState<FinancialPackage[]>([]);
  const [packageConsumptions, setPackageConsumptions] = useState<FinancialPackageConsumption[]>([]);
  const [dreamDiaryLoading, setDreamDiaryLoading] = useState(false);
  const [dreamDiaryLoaded, setDreamDiaryLoaded] = useState(false);
  const [patientApproach, setPatientApproachState] = useState<Approach | null>(
    () => getPatientApproach(patientId)
  );

  const handleApproachChange = (approach: Approach | null) => {
    setPatientApproachState(approach);
    setPatientApproach(patientId, approach);
  };

  useEffect(() => {
    setSupervisionNotes(listSupervisionNotes(patientId));
    setPreSessionSettings(readPreSessionBriefingSettings(patientId));
    setSupervisionDraft(emptySupervisionDraft);
    setEditingSupervisionId(null);
  }, [patientId]);

  const [sectionVisibility, setSectionVisibility] = useState<Record<string, boolean>>({
    observacoes: true,
    sessoes: true,
    documentos: true,
    contratos: true,
    diario: true,
    formularios: true,
    sonhos: false,
    progresso: true,
    evolucao: true,
    supervisao: true,
    objetivos: true,
    homework: true,
  });
  const [selectedDocument, setSelectedDocument] = useState<any | null>(null);
  const [selectedDocumentHtml, setSelectedDocumentHtml] = useState<string>("");
  const [documentFormValues, setDocumentFormValues] = useState<DocumentFormValues>({});
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [documentPreviewLoading, setDocumentPreviewLoading] = useState(false);
  const [savingDocumentVersion, setSavingDocumentVersion] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);
  const [lookingUpCep, setLookingUpCep] = useState(false);
  const [lastCepLookup, setLastCepLookup] = useState("");
  const loadSynthesis = useCallback(async () => {
    const result = await clinicalSynthesisService.get(patientId);
    if (result.success) {
      setSynthesis(result.data);
    }
  }, [patientId]);

  useEffect(() => {
    const loadPackages = async () => {
      const [packagesResult, consumptionsResult] = await Promise.all([
        financeService.listPackages({ patient_id: patientId }),
        financeService.listPackageConsumptions({ patient_id: patientId }),
      ]);
      if (packagesResult.success) setFinancialPackages(packagesResult.data);
      if (consumptionsResult.success) setPackageConsumptions(consumptionsResult.data);
    };
    void loadPackages();
  }, [patientId]);

  const handleRefreshSynthesis = async () => {
    setLoadingSynthesis(true);
    const result = await clinicalSynthesisService.refresh(patientId, 5, true);
    setLoadingSynthesis(false);
    if (result.success) {
      setSynthesis(result.data);
      toast({ title: "Síntese atualizada", description: "O estado clínico foi consolidado com sucesso." });
    } else {
      toast({ title: "Erro ao atualizar síntese", variant: "destructive" });
    }
  };

  const handleUpdateSynthesisContent = async (newContent: string) => {
    const result = await clinicalSynthesisService.update(patientId, newContent);
    if (result.success) {
      setSynthesis(result.data);
      toast({ title: "Alterações salvas" });
    } else {
      toast({ title: "Erro ao salvar alterações", variant: "destructive" });
    }
  };

  const [documentFilter, setDocumentFilter] = useState<"all" | "portal" | "recent">("all");
  const [formFilter, setFormFilter] = useState<"all" | "with_response" | "without_response" | "recent">("all");

  const handleUpdateSessionStatus = async (sessionId: string, status: "pending" | "confirmed" | "missed" | "completed") => {
    const result = await sessionService.updateStatus(sessionId, status);
    if (!result.success) {
      toast({ title: "Erro ao atualizar sessão", description: result.error.message, variant: "destructive" });
      return;
    }
    
    if (detail) {
      setDetail({
        ...detail,
        sessions: (detail.sessions || []).map(s => s.id === sessionId ? result.data as any : s)
      });
    }
    toast({ title: "Sessão atualizada" });
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta sessão?")) return;
    
    setDeletingSessionId(sessionId);
    const result = await sessionService.delete(sessionId);
    setDeletingSessionId(null);
    
    if (!result.success) {
      toast({ title: "Erro ao excluir sessão", description: result.error.message, variant: "destructive" });
      return;
    }
    
    if (detail) {
      setDetail({
        ...detail,
        sessions: (detail.sessions || []).filter(s => s.id !== sessionId)
      });
    }
    toast({ title: "Sessão excluída" });
  };

  const toggleSection = (section: string) => {
    setSectionVisibility(prev => {
      const newVal = !prev[section];
      if (section === "sonhos" && newVal && !dreamDiaryLoaded) {
        void (async () => {
          setDreamDiaryLoading(true);
          const result = await api.get<DreamDiaryEntry[]>(`/patients/${patientId}/dream-diary`);
          setDreamDiaryLoading(false);
          setDreamDiaryLoaded(true);
          if (result.success) setDreamDiaryEntries(result.data);
        })();
      }
      return { ...prev, [section]: newVal };
    });
  };

  const loadPatient = useCallback(async () => {
    setLoading(true);
    const [result, entriesResult] = await Promise.all([
      patientService.getById(patientId),
      formService.listEntries({ patient_id: patientId }),
    ]);

    if (!result.success) {
      setError({ message: result.error.message, requestId: result.request_id });
      setDetail(null);
      setLoading(false);
      return;
    }

    setDetail(result.data);
    if (entriesResult.success) {
      setAllFormEntries(entriesResult.data);
    }
    setError(null);
    setLoading(false);
  }, [patientId]);

  useEffect(() => {
    void loadPatient();
    void loadSynthesis();
    void sessionReminderApi.getPatientEnabled(patientId).then((r) => {
      if (r.success) setSessionReminderEnabled(r.data.enabled);
    });
  }, [loadPatient, loadSynthesis, patientId]);

  useEffect(() => {
    const loadContracts = async () => {
      const [contractsResult, assignmentsResult] = await Promise.all([
        contractsApi.list(),
        formService.listAssignments({ patient_id: patientId }),
      ]);

      if (contractsResult.success) {
        setContracts(contractsResult.data.filter((contract) => contract.patient_id === patientId));
      }

      if (assignmentsResult.success) {
        setFormAssignments(assignmentsResult.data);
      }
    };

    void loadContracts();
  }, [patientId]);

  useEffect(() => {
    if (!detail) return;

    setForm({
      name: detail.patient.name,
      care_status: detail.patient.care_status ?? "active",
      email: detail.patient.email ?? "",
      phone: formatPhone(detail.patient.phone ?? ""),
      whatsapp: formatPhone(detail.patient.whatsapp ?? detail.patient.phone ?? ""),
      birth_date: toInputDate(detail.patient.birth_date),
      address: detail.patient.address ?? "",
      address_street: detail.patient.address_street ?? "",
      address_number: detail.patient.address_number ?? "",
      address_complement: detail.patient.address_complement ?? "",
      address_neighborhood: detail.patient.address_neighborhood ?? "",
      address_city: detail.patient.address_city ?? "",
      address_state: detail.patient.address_state ?? "",
      address_zip: detail.patient.address_zip ?? "",
      cpf: detail.patient.cpf ?? "",
      profession: detail.patient.profession ?? "",
      referral_source: detail.patient.referral_source ?? "",
      care_interest: detail.patient.care_interest ?? "",
      therapy_goals: detail.patient.therapy_goals ?? "",
      main_complaint: detail.patient.main_complaint ?? "",
      psychiatric_medications: detail.patient.psychiatric_medications ?? "",
      has_psychiatric_followup: Boolean(detail.patient.has_psychiatric_followup),
      psychiatrist_name: detail.patient.psychiatrist_name ?? "",
      psychiatrist_contact: formatPhone(detail.patient.psychiatrist_contact ?? ""),
      emergency_contact_name: detail.patient.emergency_contact_name ?? "",
      emergency_contact_relationship: detail.patient.emergency_contact_relationship ?? "",
      emergency_contact_phone: formatPhone(detail.patient.emergency_contact_phone ?? ""),
      education_level: detail.patient.education_level ?? "",
      marital_status: detail.patient.marital_status ?? "",
      legal_guardian_name: detail.patient.legal_guardian_name ?? "",
      legal_guardian_relationship: detail.patient.legal_guardian_relationship ?? "",
      report_indication: detail.patient.report_indication ?? "",
      recurring_techniques: detail.patient.recurring_techniques ?? "",
      report_notes: detail.patient.report_notes ?? "",
      notes: detail.patient.notes ?? "",
      billing_mode: detail.patient.billing?.mode ?? "per_session",
      weekly_frequency: detail.patient.billing?.weekly_frequency?.toString() ?? "1",
      session_price: detail.patient.billing?.session_price?.toString() ?? "",
      package_total_price: detail.patient.billing?.package_total_price?.toString() ?? "",
      package_session_count: detail.patient.billing?.package_session_count?.toString() ?? "",
      payment_timing: detail.patient.billing?.payment_timing ?? "after",
      preferred_payment_day: detail.patient.billing?.preferred_payment_day?.toString() ?? "",
      billing_reminder_days: detail.patient.billing?.billing_reminder_days ?? 0,
      billing_auto_charge: detail.patient.billing?.billing_auto_charge ?? false,
    });

    setPortalEmail(detail.patient.email ?? "");
    setPortalName(detail.patient.name);
    setPortalPassword("");
    setAccessCredentials(null);
  }, [detail]);

  const hasPortalAccess = Boolean(detail?.portal_access);

  const latestSessionId = detail?.summary.last_session?.id ?? detail?.summary.next_session?.id ?? detail?.sessions[0]?.id;
  const signedContracts = useMemo(
    () => contracts.filter((contract) => Boolean(contract.signed_attachment)),
    [contracts],
  );
  const sharedDocuments = useMemo(
    () =>
      detail?.documents.filter((document: any) => Boolean(document.shared_with_patient)) ?? [],
    [detail?.documents],
  );
  const activeAssignments = useMemo(
    () => formAssignments.filter((assignment) => assignment.active),
    [formAssignments],
  );
  const formEntries = useMemo(() => {
    const fromDetail = detail?.form_entries ?? [];
    const fromService = allFormEntries ?? [];
    
    // Merge and remove duplicates by ID
    const merged = [...fromDetail, ...fromService];
    const unique = Array.from(new Map(merged.map(item => [((item as any).id), item])).values());
    return unique;
  }, [detail?.form_entries, allFormEntries]);

  const sessionStats = useMemo(() => {
    const sessions = detail?.sessions ?? [];
    return {
      total: sessions.length,
      confirmed: sessions.filter(s => s.status === "confirmed" || s.status === "completed").length,
      missed: sessions.filter(s => s.status === "missed").length,
      pending: sessions.filter(s => s.status === "pending").length,
      presenceRate: sessions.length > 0
        ? Math.round((sessions.filter(s => s.status === "confirmed" || s.status === "completed").length / (sessions.filter(s => s.status !== "pending").length || 1)) * 100)
        : 100
    };
  }, [detail?.sessions]);

  const formEntryGroups = useMemo(() => {
    return formEntries.reduce<Record<string, any[]>>((acc, entry: any) => {
      // Priority: explicit assignment_id
      const key = entry.assignment_id ?? entry.form_id ?? "sem-formulario";
      if (!acc[key]) acc[key] = [];
      acc[key].push(entry);
      
      // Fallback: If entry doesn't have assignment_id, try to link it to an existing assignment
      // using form_id or normalized name matching
      if (!entry.assignment_id) {
         const matchingAssignment = formAssignments.find(a => {
           const aName = normalizeStr(a.form?.name ?? a.form?.title ?? "");
           const eName = normalizeStr(entry.form_id); 
           return a.form_id === entry.form_id || aName === eName || (eName.includes("diario") && aName.includes("diario"));
         });
         
         if (matchingAssignment && matchingAssignment.id !== key) {
           if (!acc[matchingAssignment.id]) acc[matchingAssignment.id] = [];
           acc[matchingAssignment.id].push(entry);
         }
      }
      
      return acc;
    }, {});
  }, [formEntries, formAssignments]);

  const filteredDocuments = useMemo(() => {
    const source = detail?.documents ?? [];
    const nowMs = Date.now();
    return source.filter((document: any) => {
      if (documentFilter === "portal") return Boolean(document.shared_with_patient);
      if (documentFilter === "recent") {
        const createdAt = Date.parse(document.created_at ?? "");
        return Number.isFinite(createdAt) && nowMs - createdAt <= 30 * 24 * 60 * 60 * 1000;
      }
      return true;
    });
  }, [detail?.documents, documentFilter]);
  const filteredAssignments = useMemo(() => {
    const nowMs = Date.now();
    return activeAssignments.filter((assignment) => {
      const responses = formEntryGroups[assignment.id] ?? [];
      if (formFilter === "with_response") return responses.length > 0;
      if (formFilter === "without_response") return responses.length === 0;
      if (formFilter === "recent") {
        const relevantDate = assignment.last_submitted_at ?? assignment.shared_at;
        const parsed = Date.parse(relevantDate ?? "");
        return Number.isFinite(parsed) && nowMs - parsed <= 30 * 24 * 60 * 60 * 1000;
      }
      return true;
    });
  }, [activeAssignments, formEntryGroups, formFilter]);

  const summaryCards = useMemo(() => {
    if (!detail) return [];
    return [
      { label: "Total de sessões", value: String(detail.summary.total_sessions) },
      { label: "Próxima sessão", value: formatDateTime(detail.summary.next_session?.scheduled_at) },
      { label: "Última sessão", value: formatDateTime(detail.summary.last_session?.scheduled_at) },
      { label: "Docs no portal", value: String(sharedDocuments.length) },
      { label: "Formulários ativos", value: String(activeAssignments.length) },
    ];
  }, [detail, sharedDocuments.length, activeAssignments.length]);

  const clinicalEvolutionForBriefing = useMemo(() => {
    const synthesisContent = synthesis?.content?.trim();
    if (synthesisContent) return synthesisContent;
    const noteEvolution = extractClinicalEvolutionFromNotes(detail?.clinical_notes ?? []);
    if (noteEvolution) return noteEvolution;
    return form.notes.trim();
  }, [detail?.clinical_notes, form.notes, synthesis?.content]);

  const preSessionBriefingText = useMemo(() => {
    if (!detail) return "";
    return buildPreSessionBriefingText({
      patientName: detail.patient.name,
      nextSessionLabel: formatDateTime(detail.summary.next_session?.scheduled_at),
      mainComplaint: form.main_complaint,
      clinicalEvolution: clinicalEvolutionForBriefing,
      supervisionNotes,
    });
  }, [clinicalEvolutionForBriefing, detail, form.main_complaint, supervisionNotes]);

  const updatePreSessionSettings = (next: PreSessionBriefingSettings) => {
    setPreSessionSettings(next);
    savePreSessionBriefingSettings(patientId, next);
  };

  const refreshSupervisionNotes = () => {
    setSupervisionNotes(listSupervisionNotes(patientId));
  };

  const handleSaveSupervisionNote = () => {
    if (!supervisionDraft.content.trim() && !supervisionDraft.nextSessionPrompt.trim()) {
      toast({
        title: "Anotacao vazia",
        description: "Inclua uma dica de supervisao ou um foco para a proxima sessao.",
        variant: "destructive",
      });
      return;
    }

    saveSupervisionNote(patientId, supervisionDraft, editingSupervisionId ?? undefined);
    refreshSupervisionNotes();
    setSupervisionDraft(emptySupervisionDraft);
    setEditingSupervisionId(null);
    toast({ title: editingSupervisionId ? "Anotacao atualizada" : "Anotacao de supervisao salva" });
  };

  const handleEditSupervisionNote = (note: SupervisionNote) => {
    setEditingSupervisionId(note.id);
    setSupervisionDraft({
      title: note.title,
      content: note.content,
      focus: note.focus,
      nextSessionPrompt: note.nextSessionPrompt,
      tags: note.tags.join(", "),
      priority: note.priority,
    });
  };

  const handleDeleteSupervisionNote = (noteId: string) => {
    deleteSupervisionNote(noteId);
    refreshSupervisionNotes();
    if (editingSupervisionId === noteId) {
      setEditingSupervisionId(null);
      setSupervisionDraft(emptySupervisionDraft);
    }
    toast({ title: "Anotacao removida" });
  };

  const handleToggleSupervisionPin = (noteId: string) => {
    toggleSupervisionNotePinned(noteId);
    refreshSupervisionNotes();
  };

  const copyPreSessionBriefing = async () => {
    if (!preSessionBriefingText) return;
    await navigator.clipboard.writeText(preSessionBriefingText);
    toast({ title: "Briefing copiado", description: "Resumo pre-sessao copiado para a area de transferencia." });
  };

  const sendPreSessionNotification = useCallback(async (manual = false) => {
    if (!detail || !preSessionBriefingText) return;
    if (!("Notification" in window)) {
      toast({ title: "Notificacao indisponivel", description: "Este navegador nao suporta notificacoes locais.", variant: "destructive" });
      return;
    }

    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }

    if (permission !== "granted") {
      toast({ title: "Permissao necessaria", description: "Autorize notificacoes do navegador para receber o briefing.", variant: "destructive" });
      return;
    }

    const notesSummary = supervisionNotes
      .filter((note) => note.pinned || note.priority === "high")
      .slice(0, 2)
      .map((note) => note.nextSessionPrompt || note.content)
      .filter(Boolean)
      .join(" | ");

    new Notification(`Preparar sessao - ${detail.patient.name}`, {
      body: [
        form.main_complaint ? `Queixa: ${form.main_complaint}` : "",
        clinicalEvolutionForBriefing ? `Evolucao: ${clinicalEvolutionForBriefing}` : "",
        notesSummary ? `Supervisao: ${notesSummary}` : "",
      ].filter(Boolean).join("\n").slice(0, 260),
      tag: `ethos-pre-session-${patientId}-${detail.summary.next_session?.id ?? "manual"}`,
      requireInteraction: manual,
    });

    if (manual) toast({ title: "Notificacao enviada", description: "O briefing interno foi exibido no navegador." });
  }, [clinicalEvolutionForBriefing, detail, form.main_complaint, patientId, preSessionBriefingText, supervisionNotes, toast]);

  useEffect(() => {
    if (preSessionTimerRef.current) {
      window.clearTimeout(preSessionTimerRef.current);
      preSessionTimerRef.current = null;
    }

    const nextSessionAt = detail?.summary.next_session?.scheduled_at;
    if (!detail || !preSessionSettings.enabled || !nextSessionAt) return;

    const targetMs = new Date(nextSessionAt).getTime() - preSessionSettings.minutesBeforeSession * 60_000;
    const delay = targetMs - Date.now();
    if (!Number.isFinite(delay) || delay <= 0 || delay > 2_147_483_647) return;

    preSessionTimerRef.current = window.setTimeout(() => {
      void sendPreSessionNotification(false);
    }, delay);

    return () => {
      if (preSessionTimerRef.current) {
        window.clearTimeout(preSessionTimerRef.current);
        preSessionTimerRef.current = null;
      }
    };
  }, [detail, preSessionSettings, sendPreSessionNotification]);

  const updateForm = <K extends keyof PatientFormState>(key: K, value: PatientFormState[K]) => {
    if (["phone", "whatsapp", "psychiatrist_contact", "emergency_contact_phone"].includes(key as string)) {
      value = formatPhone(value as string) as any;
    }
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleCepLookup = async () => {
    const cepDigits = onlyDigits(form.address_zip);
    if (cepDigits.length !== 8 || cepDigits === lastCepLookup) return;

    setLookingUpCep(true);
    setLastCepLookup(cepDigits);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`);
      const payload = await response.json() as {
        erro?: boolean;
        logradouro?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
      };

      if (payload.erro) {
        toast({ title: "CEP não encontrado", description: "Revise o CEP informado.", variant: "destructive" });
        return;
      }

      setForm((current) => ({
        ...current,
        address_street: payload.logradouro ?? current.address_street,
        address_neighborhood: payload.bairro ?? current.address_neighborhood,
        address_city: payload.localidade ?? current.address_city,
        address_state: payload.uf ?? current.address_state,
      }));
    } catch {
      toast({ title: "Falha ao buscar CEP", description: "Não foi possível consultar o endereço agora.", variant: "destructive" });
    } finally {
      setLookingUpCep(false);
    }
  };

  useEffect(() => {
    if (onlyDigits(form.address_zip).length === 8) {
      void handleCepLookup();
    }
  }, [form.address_zip]);

  const updateDocumentFormValue = (key: string, value: string) => {
    setDocumentFormValues((current) => ({ ...current, [key]: value }));
  };

  const buildDocumentHtmlFromValues = (
    templateId: string,
    title: string,
    values: DocumentFormValues,
  ) =>
    buildClinicalDocumentHtml(templateId, {
      psychologist: {
        name: user?.name ?? "Psicóloga responsável",
        email: user?.email,
        crp: user?.crp,
      },
      patient: {
        name: detail?.patient.name ?? "",
        email: detail?.patient.email,
        cpf: detail?.patient.cpf,
      },
      documentTitle: title,
      dateLabel: values.date_label || new Date().toLocaleDateString("pt-BR"),
      priceLabel:
        form.billing_mode === "per_session"
          ? formatCurrency(Number(form.session_price || 0))
          : formatCurrency(Number(form.package_total_price || 0)),
      frequencyLabel: `${form.weekly_frequency || "1"}x por semana`,
      attendanceDate: values.attendance_date,
      attendanceTime: values.attendance_time,
      periodStart: values.period_start,
      periodEnd: values.period_end,
      cidCode: values.cid_code,
      amount: values.amount,
      paymentMethod: values.payment_method,
      serviceType: values.service_type,
      specialty: user?.specialty,
      clinicalApproach: user?.clinical_approach,
      patientBirthDate: detail?.patient.birth_date,
      patientProfession: detail?.patient.profession,
      patientPhone: detail?.patient.phone,
    });

  const liveDocumentPreviewHtml = useMemo(() => {
    const templateId = (selectedDocument as { template_id?: string } | null)?.template_id;
    const title = (selectedDocument as { title?: string } | null)?.title;
    if (!templateId || !title || !detail || !supportsGuidedDocumentEditor(templateId)) {
      return selectedDocumentHtml;
    }
    return buildDocumentHtmlFromValues(templateId, title, documentFormValues);
  }, [selectedDocument, detail, documentFormValues, selectedDocumentHtml, form, user]);

  const handleSave = async () => {
    if (!detail || !form.name.trim()) return;

    if (form.email.trim() && !EMAIL_REGEX.test(form.email.trim())) {
      toast({ title: "E-mail inválido", description: "Revise o e-mail informado.", variant: "destructive" });
      return;
    }
    if (form.address_zip.trim() && !CEP_REGEX.test(form.address_zip.trim())) {
      toast({ title: "CEP inválido", description: "Use o formato 00000-000.", variant: "destructive" });
      return;
    }
    if (form.cpf.trim() && !CPF_REGEX.test(form.cpf.trim())) {
      toast({ title: "CPF inválido", description: "Use 11 dígitos ou 000.000.000-00.", variant: "destructive" });
      return;
    }
    if (form.cpf.trim() && !isValidCpf(form.cpf.trim())) {
      toast({ title: "CPF inválido", description: "O número do CPF informado não é válido.", variant: "destructive" });
      return;
    }
    if (form.whatsapp.trim() && !PHONE_REGEX.test(onlyDigits(form.whatsapp))) {
      toast({ title: "WhatsApp inválido", description: "Informe DDD + número com 10 ou 11 dígitos.", variant: "destructive" });
      return;
    }

    setSaving(true);
    const result = await patientService.update(detail.patient.id, {
      name: form.name.trim(),
      care_status: form.care_status,
      email: form.email.trim() || undefined,
      phone: onlyDigits(form.phone) || undefined,
      whatsapp: onlyDigits(form.whatsapp) || undefined,
      birth_date: form.birth_date || undefined,
      address_street: form.address_street.trim() || undefined,
      address_number: form.address_number.trim() || undefined,
      address_complement: form.address_complement.trim() || undefined,
      address_neighborhood: form.address_neighborhood.trim() || undefined,
      address_city: form.address_city.trim() || undefined,
      address_state: form.address_state.trim() || undefined,
      address_zip: form.address_zip.trim() || undefined,
      cpf: form.cpf.trim() || undefined,
      profession: form.profession.trim() || undefined,
      referral_source: form.referral_source.trim() || undefined,
      care_interest: form.care_interest.trim() || undefined,
      therapy_goals: form.therapy_goals.trim() || undefined,
      main_complaint: form.main_complaint.trim() || undefined,
      psychiatric_medications: form.psychiatric_medications.trim() || undefined,
      has_psychiatric_followup: form.has_psychiatric_followup,
      psychiatrist_name: form.psychiatrist_name.trim() || undefined,
      psychiatrist_contact: onlyDigits(form.psychiatrist_contact) || undefined,
      emergency_contact_name: form.emergency_contact_name.trim() || undefined,
      emergency_contact_relationship: form.emergency_contact_relationship.trim() || undefined,
      emergency_contact_phone: onlyDigits(form.emergency_contact_phone) || undefined,
      education_level: form.education_level.trim() || undefined,
      marital_status: form.marital_status.trim() || undefined,
      legal_guardian_name: form.legal_guardian_name.trim() || undefined,
      legal_guardian_relationship: form.legal_guardian_relationship.trim() || undefined,
      report_indication: form.report_indication.trim() || undefined,
      recurring_techniques: form.recurring_techniques.trim() || undefined,
      report_notes: form.report_notes.trim() || undefined,
      billing: {
        mode: form.billing_mode,
        weekly_frequency: form.weekly_frequency ? Number(form.weekly_frequency) as 1 | 2 | 3 | 4 | 5 : undefined,
        session_price: form.billing_mode === "per_session" && form.session_price ? Number(form.session_price) : undefined,
        package_total_price: form.billing_mode === "package" && form.package_total_price ? Number(form.package_total_price) : undefined,
        package_session_count: form.billing_mode === "package" && form.package_session_count ? Number(form.package_session_count) : undefined,
        payment_timing: form.payment_timing,
        preferred_payment_day: form.preferred_payment_day ? Number(form.preferred_payment_day) : undefined,
        billing_reminder_days: form.billing_reminder_days,
        billing_auto_charge: form.billing_auto_charge,
      },
      notes: form.notes.trim() || undefined,
    });

    if (!result.success) {
      toast({ title: "Erro ao salvar", description: result.error.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    toast({ title: "Ficha do paciente atualizada" });
    setSaving(false);
    await loadPatient();
  };

  const handleCreateSession = async () => {
    if (!detail || !sessionDate || !sessionTime) return;

    setCreatingSession(true);
    const scheduledAt = new Date(`${sessionDate}T${sessionTime}:00`).toISOString();
    const result = await sessionService.create({
      patient_id: detail.patient.id,
      scheduled_at: scheduledAt,
      duration_minutes: Number(sessionDuration) || 50,
    });

    if (!result.success) {
      toast({ title: "Erro ao agendar", description: result.error.message, variant: "destructive" });
      setCreatingSession(false);
      return;
    }

    upsertSession(result.data); // sync global store instantly
    setCreatingSession(false);
    setSessionDialogOpen(false);
    setSessionDate("");
    setSessionTime("");
    setSessionDuration("50");
    toast({ title: "Sessão criada" });
    await loadPatient();
  };

  const handleOpenLatestProntuario = () => {
    if (!latestSessionId) {
      toast({
        title: "Sessão necessária",
        description: "Crie uma sessão antes de abrir uma nova nota clínica.",
        variant: "destructive",
      });
      return;
    }
    onOpenProntuario(latestSessionId);
  };

  const createTemplateDocument = async (templateId: string, title: string) => {
    if (!detail) return;

    setShortcutLoading(templateId);
    const result = await documentsApi.create({
      patient_id: detail.patient.id,
      case_id: detail.patient.id,
      template_id: templateId,
      title,
    });
    setShortcutLoading(null);

    if (!result.success) {
      toast({ title: "Erro ao criar documento", description: result.error.message, variant: "destructive" });
      return;
    }

    const initialValues = buildDefaultDocumentFormValues(templateId, detail, form);
    const generatedHtml = buildDocumentHtmlFromValues(templateId, title, initialValues);

    await documentsApi.createVersion(result.data.id, generatedHtml, {
      ...initialValues,
    });

    setSelectedDocument(result.data);
    setSelectedDocumentHtml(generatedHtml);
    setDocumentFormValues(initialValues);
    setDocumentDialogOpen(true);
    toast({ title: `${title} criado com sucesso`, description: "O preview completo foi preparado abaixo." });
    await loadPatient();
  };

  const openDocumentPreview = async (document: { id: string; title?: string; template_id?: string; created_at?: string; status?: string }) => {
    setSelectedDocument(document);
    setSelectedDocumentHtml("");
    setDocumentDialogOpen(true);
    setDocumentPreviewLoading(true);

    const versions = await documentsApi.listVersions(document.id);
    if (versions.success && versions.data.length > 0) {
      const latestVersion = versions.data[versions.data.length - 1];
      const latestContent = latestVersion.content;
      setSelectedDocumentHtml(latestContent);
      setDocumentFormValues(
        latestVersion.global_values && Object.keys(latestVersion.global_values).length > 0
          ? latestVersion.global_values
          : detail && document.template_id
            ? buildDefaultDocumentFormValues(document.template_id, detail, form)
            : {},
      );
    } else {
      setSelectedDocumentHtml("");
      setDocumentFormValues(
        detail && document.template_id ? buildDefaultDocumentFormValues(document.template_id, detail, form) : {},
      );
      if (!versions.success) {
        toast({ title: "Não foi possível abrir o documento", description: versions.error.message, variant: "destructive" });
      }
    }

    setDocumentPreviewLoading(false);
  };

  const closeDocumentPreview = () => {
    setDocumentDialogOpen(false);
    setSelectedDocument(null);
    setSelectedDocumentHtml("");
    setDocumentFormValues({});
    setDocumentPreviewLoading(false);
    setSavingDocumentVersion(false);
  };

  const handleSaveDocumentVersion = async () => {
    const templateId = (selectedDocument as { template_id?: string } | null)?.template_id;
    const title = (selectedDocument as { title?: string } | null)?.title;
    if (!selectedDocument || !templateId || !title) return;

    setSavingDocumentVersion(true);
    const nextHtml = supportsGuidedDocumentEditor(templateId)
      ? buildDocumentHtmlFromValues(templateId, title, documentFormValues)
      : selectedDocumentHtml;
    const result = await documentsApi.createVersion(
      (selectedDocument as { id: string }).id,
      nextHtml,
      documentFormValues,
    );
    setSavingDocumentVersion(false);

    if (!result.success) {
      toast({ title: "Erro ao salvar documento", description: result.error.message, variant: "destructive" });
      return;
    }

    setSelectedDocumentHtml(nextHtml);
    toast({ title: "Nova versão salva" });
    await loadPatient();
  };

  const handleOpenDocumentInNewTab = () => {
    const html = liveDocumentPreviewHtml.trim();
    if (!html) return;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
  };

  const handleDeleteDocument = async (document: { id: string; title?: string }) => {
    const confirmed = window.confirm(`Excluir "${document.title ?? "Documento"}"? Essa ação não pode ser desfeita.`);
    if (!confirmed) return;

    setDeletingDocumentId(document.id);
    const result = await documentsApi.remove(document.id);
    setDeletingDocumentId(null);

    if (!result.success) {
      toast({ title: "Erro ao excluir documento", description: result.error.message, variant: "destructive" });
      return;
    }

    if (selectedDocument && (selectedDocument as { id?: string }).id === document.id) {
      closeDocumentPreview();
    }

    toast({ title: "Documento excluído" });
    await loadPatient();
  };

  const handleCreateContract = async () => {
    if (!detail) return;

    setShortcutLoading("contract");
    const contractResult = await contractsApi.create({
      patient_id: detail.patient.id,
      psychologist: {
        name: user?.name ?? "Psicólogo responsável",
        license: "",
        email: user?.email ?? "",
      },
      patient: {
        name: detail.patient.name,
        email: detail.patient.email ?? "",
        document: detail.patient.cpf ?? "",
      },
      terms: {
        value:
          form.billing_mode === "package"
            ? `${formatCurrency(Number(form.package_total_price || 0))} por acompanhamento`
            : `${formatCurrency(Number(form.session_price || 0))} por sessão`,
        periodicity:
          form.billing_mode === "package"
            ? `${form.weekly_frequency || "1"}x por semana`
            : "sessão avulsa",
        absence_policy: "Cancelamentos devem ser informados com antecedência mínima de 24 horas.",
        payment_method: "A combinar",
      },
    } as any);

    if (!contractResult.success) {
      setShortcutLoading(null);
      toast({ title: "Erro ao criar contrato", description: contractResult.error.message, variant: "destructive" });
      return;
    }

    if (detail.patient.email) {
      const sendResult = await contractsApi.send(contractResult.data.id);
      setShortcutLoading(null);
      if (!sendResult.success) {
        toast({ title: "Contrato criado", description: "O envio ficou pendente. Revise depois na página Contratos." });
        return;
      }

      toast({
        title: "Contrato criado e enviado",
        description: sendResult.data.portal_url ? `Portal: ${sendResult.data.portal_url}` : "O link do portal foi gerado.",
      });
      return;
    }

    setShortcutLoading(null);
    toast({ title: "Contrato criado", description: "Paciente sem e-mail. Revise depois na página Contratos." });
  };

  const handleCreateReport = async () => {
    if (!detail) return;

    setShortcutLoading("report");
    const result = await reportService.create({
      patient_id: detail.patient.id,
      purpose: "profissional",
      content: `Relatório psicológico em elaboração referente ao acompanhamento clínico de ${detail.patient.name}.`,
    });
    setShortcutLoading(null);

    if (!result.success) {
      toast({ title: "Erro ao criar relatório", description: result.error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Relatório criado", description: "Revise o conteúdo depois na página Relatórios." });
  };

  const handleGrantAccess = async () => {
    if (!detail || !portalEmail.trim() || !portalName.trim()) return;

    setGrantingAccess(true);
    const result = await patientService.grantAccess({
      patient_id: detail.patient.id,
      patient_email: portalEmail.trim(),
      patient_name: portalName.trim(),
      patient_password: portalPassword.trim() || undefined,
    });
    setGrantingAccess(false);

    if (!result.success) {
      toast({ title: "Erro ao criar acesso", description: result.error.message, variant: "destructive" });
      return;
    }

    setAccessCredentials(result.data.credentials);
    toast({
      title: "Acesso do paciente criado",
      description:
        result.data.email_delivery?.status === "sent"
          ? "As credenciais também foram enviadas por email."
          : "Copie as credenciais exibidas abaixo para compartilhar com o paciente.",
    });
  };

  const handleResetAccess = async () => {
    if (!detail || !portalEmail.trim() || !portalName.trim()) return;
    setResettingAccess(true);
    const result = await patientService.grantAccess({
      patient_id: detail.patient.id,
      patient_email: portalEmail.trim(),
      patient_name: portalName.trim(),
      patient_password: portalPassword.trim() || undefined,
      reset_password: true,
    });
    setResettingAccess(false);

    if (!result.success) {
      toast({ title: "Erro ao redefinir acesso", description: result.error.message, variant: "destructive" });
      return;
    }

    setAccessCredentials(result.data.credentials);
    toast({
      title: "Acesso redefinido",
      description:
        result.data.email_delivery?.status === "sent"
          ? "As novas credenciais também foram enviadas por email."
          : "Copie ou envie as novas credenciais ao paciente.",
    });
    await loadPatient();
  };

  const accessPayload = useMemo(() => parseAccessCredentials(accessCredentials), [accessCredentials]);

  const handleCopyAccess = async () => {
    if (!accessCredentials) return;
    try {
      await navigator.clipboard.writeText(accessCredentials);
      toast({ title: "Acesso copiado", description: "As credenciais foram copiadas para a área de transferência." });
    } catch {
      toast({ title: "Não foi possível copiar", description: "Copie manualmente as credenciais exibidas.", variant: "destructive" });
    }
  };

  const handleSendAccessWhatsApp = () => {
    if (!accessPayload) return;
    const phone = onlyDigits(form.whatsapp || detail?.patient.whatsapp || detail?.patient.phone || "");
    if (!phone) {
      toast({ title: "WhatsApp indisponível", description: "Cadastre o WhatsApp do paciente para enviar o acesso.", variant: "destructive" });
      return;
    }
    const message = [
      `Olá, ${portalName || detail?.patient.name || "paciente"}!`,
      "",
      "Seu acesso ao portal do paciente ETHOS foi criado.",
      "",
      `Email: ${accessPayload.email}`,
      accessPayload.password ? `Senha: ${accessPayload.password}` : "",
    ].filter(Boolean).join("\n");
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };

  const handleSendAccessEmail = () => {
    if (!accessPayload) return;
    const subject = encodeURIComponent("Seu acesso ao portal do paciente ETHOS");
    const body = encodeURIComponent(
      [
        `Olá, ${portalName || detail?.patient.name || "paciente"}!`,
        "",
        "Seu acesso ao portal do paciente ETHOS foi criado.",
        "",
        `Email: ${accessPayload.email}`,
        accessPayload.password ? `Senha: ${accessPayload.password}` : "",
      ].filter(Boolean).join("\n"),
    );
    window.open(`mailto:${portalEmail.trim()}?subject=${subject}&body=${body}`, "_self");
  };

  const openPaymentReminder = () => {
    const settings = readPaymentReminderSettings();
    const amount =
      form.billing_mode === "package"
        ? formatCurrency(Number(form.package_total_price || 0))
        : formatCurrency(Number(form.session_price || 0));
    const message = buildPaymentReminderMessage(settings.defaultTemplate, {
      patient_name: form.name || detail?.patient.name || "Paciente",
      amount,
      payment_method: settings.paymentMethodLabel || "Forma de pagamento",
      payment_destination: settings.paymentDestination ? `Dados para pagamento: ${settings.paymentDestination}` : "",
      preferred_day: form.preferred_payment_day || "não definido",
    });
    setPaymentReminderMessage(message);
    setPaymentReminderOpen(true);
  };

  const handleSendPaymentReminder = () => {
    const phone = onlyDigits(form.whatsapp || detail?.patient.whatsapp || "");
    if (!phone) {
      toast({ title: "WhatsApp indisponível", description: "Cadastre o WhatsApp do paciente para enviar o lembrete.", variant: "destructive" });
      return;
    }
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(paymentReminderMessage)}`, "_blank", "noopener,noreferrer");
  };

  const openSessionReminder = () => {
    const settings = readSessionReminderSettings();
    const nextSessions = detail?.sessions
      ?.filter((s) => s.status === "scheduled" && s.scheduled_at && new Date(s.scheduled_at) > new Date())
      .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime());
    const next = nextSessions?.[0];
    const sessionDate = next?.scheduled_at
      ? new Date(next.scheduled_at).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })
      : "data a confirmar";
    const sessionTime = next?.scheduled_at
      ? new Date(next.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      : "horário a confirmar";
    const message = buildSessionReminderMessage(settings.defaultTemplate, {
      patient_name: form.name || detail?.patient.name || "Paciente",
      session_date: sessionDate,
      session_time: sessionTime,
      psychologist_name: "sua psicóloga",
    });
    setSessionReminderMessage(message);
    setSessionReminderOpen(true);
  };

  const handleSendSessionReminder = () => {
    const phone = onlyDigits(form.whatsapp || detail?.patient.whatsapp || "");
    if (!phone) {
      toast({ title: "WhatsApp indisponível", description: "Cadastre o WhatsApp do paciente para enviar o lembrete.", variant: "destructive" });
      return;
    }
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(sessionReminderMessage)}`, "_blank", "noopener,noreferrer");
  };

  const handleSendPaymentReminderDirectly = async () => {
      // Placeholder for actual implementation if needed
  };

  if (loading) {
    return (
      <div className="content-container py-12">
        <p className="text-muted-foreground">Carregando ficha do paciente...</p>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="content-container py-12">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" onClick={onBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
        </div>
        <IntegrationUnavailable message={error?.message ?? "Paciente não encontrado"} requestId={error?.requestId ?? "local"} />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12 space-y-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Button variant="ghost" onClick={onBack} className="gap-2 px-0 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Voltar para pacientes
          </Button>
          <div className="flex flex-col gap-4 rounded-[2rem] border border-border/80 bg-card px-4 py-5 shadow-[0_18px_44px_-28px_rgba(15,23,42,0.22)] md:flex-row md:items-start md:justify-between md:px-7 md:py-8">
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">Paciente</p>
              <h1 className="text-xl font-semibold tracking-[-0.05em] text-foreground md:text-[2.35rem]">{maskName(detail.patient.name)}</h1>
              <p className="mt-4 max-w-2xl text-[1.02rem] leading-7 text-muted-foreground">Ficha clínica completa do paciente, com visão operacional e atalhos de documentos.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {hasPortalAccess ? (
                  <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-600">
                    Portal ativo
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Sem portal
                  </span>
                )}
                {detail.portal_access?.last_email_delivery_status ? (
                  <span className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
                    Último envio: {detail.portal_access.last_email_delivery_status}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Dialog open={sessionDialogOpen} onOpenChange={setSessionDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary" className="gap-2">
                    <CalendarPlus className="w-4 h-4" />
                    Nova sessão
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="font-serif text-xl">Agendar sessão</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input type="date" value={sessionDate} onChange={(event) => setSessionDate(event.target.value)} />
                    <Input type="time" value={sessionTime} onChange={(event) => setSessionTime(event.target.value)} />
                    <Input type="number" min="20" step="10" value={sessionDuration} onChange={(event) => setSessionDuration(event.target.value)} />
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreateSession} disabled={creatingSession || !sessionDate || !sessionTime} className="gap-2">
                      {creatingSession && <Loader2 className="w-4 h-4 animate-spin" />}
                      Agendar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button variant="secondary" className="gap-2" onClick={handleOpenLatestProntuario}>
                <FileText className="w-4 h-4" />
                Nova nota clínica
              </Button>

              <Dialog open={accessOpen} onOpenChange={(open) => {
                if (open && detail) {
                  setPortalName((prev) => prev || detail.patient.name || "");
                  setPortalEmail((prev) => prev || detail.patient.email || "");
                }
                setAccessOpen(open);
              }}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <KeyRound className="w-4 h-4" />
                    {hasPortalAccess ? "Enviar acesso" : accessCredentials ? "Enviar acesso" : "Criar acesso"}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="font-serif text-xl">
                      {hasPortalAccess ? "Acesso do paciente" : "Criar acesso do paciente"}
                    </DialogTitle>
                    <DialogDescription>
                      Gere o acesso e depois compartilhe por cópia, email ou WhatsApp.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {hasPortalAccess && !accessCredentials ? (
                      <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-foreground">
                        <p className="font-medium mb-1">Acesso já criado</p>
                        <p className="text-muted-foreground">
                          {detail?.portal_access?.email ?? portalEmail}
                        </p>
                      </div>
                    ) : null}
                    <Input placeholder="Nome do paciente" value={portalName} onChange={(event) => setPortalName(event.target.value)} />
                    <Input placeholder="E-mail do paciente" value={portalEmail} onChange={(event) => setPortalEmail(event.target.value)} />
                    <Input placeholder="Senha temporária (opcional)" value={portalPassword} onChange={(event) => setPortalPassword(event.target.value)} />
                    {accessCredentials && (
                      <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-foreground">
                        <p className="font-medium mb-2">Credenciais geradas</p>
                        <code className="block break-all text-xs">{accessCredentials}</code>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    {accessCredentials ? (
                      <div className="flex w-full flex-wrap justify-end gap-2">
                        <Button variant="outline" onClick={handleResetAccess} disabled={resettingAccess}>
                          {resettingAccess && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                          Redefinir acesso
                        </Button>
                        <Button variant="outline" onClick={handleCopyAccess}>
                          Copiar acesso
                        </Button>
                        <Button variant="outline" onClick={handleSendAccessEmail} disabled={!portalEmail.trim()}>
                          Enviar por email
                        </Button>
                        <Button onClick={handleSendAccessWhatsApp}>
                          Enviar por WhatsApp
                        </Button>
                      </div>
                    ) : (
                      <div className="flex w-full flex-wrap justify-end gap-2">
                        {hasPortalAccess ? (
                          <Button variant="outline" onClick={handleResetAccess} disabled={resettingAccess || !portalName.trim() || !portalEmail.trim()} className="gap-2">
                            {resettingAccess && <Loader2 className="w-4 h-4 animate-spin" />}
                            Redefinir acesso
                          </Button>
                        ) : null}
                        <Button onClick={handleGrantAccess} disabled={grantingAccess || !portalName.trim() || !portalEmail.trim()} className="gap-2">
                          {grantingAccess && <Loader2 className="w-4 h-4 animate-spin" />}
                          {hasPortalAccess ? "Gerar novas credenciais" : "Gerar acesso"}
                        </Button>
                      </div>
                    )}
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button onClick={handleSave} disabled={saving || !form.name.trim()} className="gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar ficha
              </Button>
            </div>
          </div>
        </motion.div>

        <motion.div className="grid gap-4 md:grid-cols-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}>
          {summaryCards.map((card) => (
            <div key={card.label} className="session-card">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="mt-2 font-serif text-2xl text-foreground">{card.value}</p>
            </div>
          ))}
        </motion.div>

        <motion.section className="session-card space-y-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <div>
            <h2 className="font-serif text-2xl text-foreground">Abordagem Terapêutica</h2>
            <p className="text-sm text-muted-foreground mt-1">Define o pacote de ferramentas ativo para este paciente.</p>
          </div>
          <PatientApproachSelector
            patientId={patientId}
            value={patientApproach}
            onChange={handleApproachChange}
          />
        </motion.section>

        <motion.section className="session-card space-y-5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div>
            <h2 className="font-serif text-2xl text-foreground">Identificação</h2>
            <p className="text-sm text-muted-foreground mt-1">Dados de contato e identificação do paciente.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Nome do paciente</label>
              <Input value={form.name} onChange={(event) => updateForm("name", event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Status do acompanhamento</label>
              <select
                value={form.care_status}
                onChange={(event) => updateForm("care_status", event.target.value as PatientFormState["care_status"])}
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="active">Ativo</option>
                <option value="paused">Pausa</option>
                <option value="transferred">Transferido</option>
                <option value="inactive">Desativado</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">WhatsApp</label>
              <Input value={form.whatsapp} onChange={(event) => updateForm("whatsapp", formatPhone(event.target.value))} placeholder="(11) 99999-9999" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">E-mail</label>
              <Input value={form.email} onChange={(event) => updateForm("email", event.target.value)} placeholder="email@paciente.com" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Data de nascimento</label>
              <Input type="date" value={form.birth_date} onChange={(event) => updateForm("birth_date", event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">CPF</label>
              <Input value={form.cpf} onChange={(event) => updateForm("cpf", formatCpfInput(event.target.value))} placeholder="000.000.000-00" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Profissão</label>
              <Input value={form.profession} onChange={(event) => updateForm("profession", event.target.value)} placeholder="Profissão atual" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Interesse em</label>
              <Input value={form.care_interest} onChange={(event) => updateForm("care_interest", event.target.value)} placeholder="Online, presencial ou ambos" />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-foreground">Rua</label>
              <Input value={form.address_street} onChange={(event) => updateForm("address_street", event.target.value)} placeholder="Rua / Avenida" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Número</label>
              <Input value={form.address_number} onChange={(event) => updateForm("address_number", event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Complemento</label>
              <Input value={form.address_complement} onChange={(event) => updateForm("address_complement", event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Bairro</label>
              <Input value={form.address_neighborhood} onChange={(event) => updateForm("address_neighborhood", event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">CEP</label>
              <Input
                value={form.address_zip}
                onChange={(event) => updateForm("address_zip", formatCepInput(event.target.value))}
                placeholder="00000-000"
              />
              <p className="text-xs text-muted-foreground">{lookingUpCep ? "Buscando endereço..." : "Ao preencher o CEP, rua, bairro, cidade e estado podem ser completados automaticamente."}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Cidade</label>
              <Input value={form.address_city} onChange={(event) => updateForm("address_city", event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Estado</label>
              <Input value={form.address_state} onChange={(event) => updateForm("address_state", event.target.value)} placeholder="SP" />
            </div>
          </div>
        </motion.section>

        <motion.section className="session-card space-y-5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div>
            <h2 className="font-serif text-2xl text-foreground">Clínico</h2>
            <p className="text-sm text-muted-foreground mt-1">Contexto principal e observações clínicas permanentes.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Como chegou até a clínica</label>
            <Textarea value={form.referral_source} onChange={(event) => updateForm("referral_source", event.target.value)} className="min-h-[90px]" placeholder="Site, Instagram, indicação, etc." />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">O que faz procurar por psicoterapia</label>
            <Textarea value={form.therapy_goals} onChange={(event) => updateForm("therapy_goals", event.target.value)} className="min-h-[110px]" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Queixa principal</label>
            <Textarea value={form.main_complaint} onChange={(event) => updateForm("main_complaint", event.target.value)} className="min-h-[110px]" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Remédios psiquiátricos</label>
            <Textarea value={form.psychiatric_medications} onChange={(event) => updateForm("psychiatric_medications", event.target.value)} className="min-h-[100px]" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Observações adicionais</label>
            <Textarea value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} className="min-h-[120px]" />
          </div>
        </motion.section>

        <CollapsibleSection
          title="Supervisao clinica"
          subtitle="Dicas de supervisao, hipoteses e lembretes internos associados a este paciente."
          isOpen={sectionVisibility.supervisao}
          onToggle={() => toggleSection("supervisao")}
          icon={ClipboardList}
        >
          <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-4 rounded-xl border border-border bg-background/50 p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Titulo</Label>
                  <Input
                    value={supervisionDraft.title}
                    onChange={(event) => setSupervisionDraft((current) => ({ ...current, title: event.target.value }))}
                    placeholder="Ex.: manejo de esquiva"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <Select
                    value={supervisionDraft.priority}
                    onValueChange={(value) => setSupervisionDraft((current) => ({ ...current, priority: value as SupervisionPriority }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Foco clinico</Label>
                <Input
                  value={supervisionDraft.focus}
                  onChange={(event) => setSupervisionDraft((current) => ({ ...current, focus: event.target.value }))}
                  placeholder="Ex.: vinculo, regulacao emocional, exposicao gradual"
                />
              </div>

              <div className="space-y-2">
                <Label>Comentario ou dica da supervisao</Label>
                <Textarea
                  value={supervisionDraft.content}
                  onChange={(event) => setSupervisionDraft((current) => ({ ...current, content: event.target.value }))}
                  className="min-h-[120px]"
                  placeholder="Registre a orientacao, pergunta clinica ou cuidado discutido em supervisao."
                />
              </div>

              <div className="space-y-2">
                <Label>Levar para a proxima sessao</Label>
                <Textarea
                  value={supervisionDraft.nextSessionPrompt}
                  onChange={(event) => setSupervisionDraft((current) => ({ ...current, nextSessionPrompt: event.target.value }))}
                  className="min-h-[90px]"
                  placeholder="Ex.: retomar combinados, observar evitacao, validar progresso antes de desafiar."
                />
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <Input
                  value={supervisionDraft.tags}
                  onChange={(event) => setSupervisionDraft((current) => ({ ...current, tags: event.target.value }))}
                  placeholder="Ex.: ansiedade, vinculo, tarefa"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={handleSaveSupervisionNote} className="gap-2">
                  <Save className="h-4 w-4" />
                  {editingSupervisionId ? "Atualizar anotacao" : "Salvar anotacao"}
                </Button>
                {editingSupervisionId ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingSupervisionId(null);
                      setSupervisionDraft(emptySupervisionDraft);
                    }}
                  >
                    Cancelar edicao
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-serif text-xl text-foreground">Briefing pre-sessao</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Queixa principal, evolucao clinica e notas de supervisao para revisar antes do atendimento.
                    </p>
                  </div>
                  <Bell className="h-5 w-5 text-primary" />
                </div>

                <div className="mt-4 space-y-3 text-sm">
                  <div className="rounded-lg bg-background/70 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Proxima sessao</p>
                    <p className="mt-1 text-foreground">{formatDateTime(detail.summary.next_session?.scheduled_at)}</p>
                  </div>
                  <div className="rounded-lg bg-background/70 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Queixa principal</p>
                    <p className="mt-1 line-clamp-3 text-foreground">{form.main_complaint || "Nao registrada."}</p>
                  </div>
                  <div className="rounded-lg bg-background/70 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Evolucao clinica</p>
                    <p className="mt-1 line-clamp-4 text-foreground">{clinicalEvolutionForBriefing || "Sem sintese registrada."}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setPreSessionBriefingOpen(true)}>
                    Ver briefing
                  </Button>
                  <Button variant="outline" size="sm" onClick={copyPreSessionBriefing}>
                    Copiar
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => void sendPreSessionNotification(true)}>
                    Notificar agora
                  </Button>
                </div>

                <div className="mt-4 rounded-lg border border-border/70 bg-background/60 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Notificacao interna antes da sessao</p>
                      <p className="text-xs text-muted-foreground">
                        Funciona enquanto o ETHOS estiver aberto neste navegador.
                      </p>
                    </div>
                    <Switch
                      checked={preSessionSettings.enabled}
                      onCheckedChange={(checked) => updatePreSessionSettings({ ...preSessionSettings, enabled: checked })}
                    />
                  </div>
                  <div className="mt-3">
                    <Select
                      value={String(preSessionSettings.minutesBeforeSession)}
                      onValueChange={(value) => updatePreSessionSettings({ ...preSessionSettings, minutesBeforeSession: Number(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 min antes</SelectItem>
                        <SelectItem value="30">30 min antes</SelectItem>
                        <SelectItem value="60">1 hora antes</SelectItem>
                        <SelectItem value="180">3 horas antes</SelectItem>
                        <SelectItem value="1440">1 dia antes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {supervisionNotes.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                    Nenhuma anotacao de supervisao ainda. Salve uma dica para ela aparecer no briefing.
                  </div>
                ) : (
                  supervisionNotes.map((note) => (
                    <div key={note.id} className="rounded-xl border border-border bg-background/60 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-foreground">{note.title}</h3>
                            {note.priority === "high" ? (
                              <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">Alta</span>
                            ) : null}
                            {note.pinned ? (
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Fixada</span>
                            ) : null}
                          </div>
                          {note.focus ? <p className="mt-1 text-xs text-muted-foreground">Foco: {note.focus}</p> : null}
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggleSupervisionPin(note.id)}>
                            {note.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEditSupervisionNote(note)}>
                            Editar
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteSupervisionNote(note.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-foreground">{note.content}</p>
                      {note.nextSessionPrompt ? (
                        <p className="mt-3 rounded-lg bg-primary/5 p-3 text-sm text-foreground">
                          <strong>Proxima sessao:</strong> {note.nextSessionPrompt}
                        </p>
                      ) : null}
                      {note.tags.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {note.tags.map((tag) => (
                            <span key={tag} className="rounded-full bg-secondary px-2 py-1 text-[10px] font-semibold text-muted-foreground">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Observações e faturamento"
          subtitle="Histórico clínico, anotações de sessões e configurações de cobrança."
          isOpen={sectionVisibility.observacoes}
          onToggle={() => toggleSection("observacoes")}
          icon={FileText}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Notas e observações</label>
              <Textarea
                value={form.notes}
                onChange={(event) => updateForm("notes", event.target.value)}
                placeholder="Anotações gerais sobre o caso..."
                className="min-h-[150px] bg-background/50"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Modalidade de cobrança</label>
                <select
                  value={form.billing_mode}
                  onChange={(event) => updateForm("billing_mode", event.target.value as "per_session" | "package")}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="per_session">Por sessão</option>
                  <option value="package">Pacote mensal/fechado</option>
                </select>
              </div>

              {form.billing_mode === "per_session" ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Valor por sessão</label>
                  <Input value={form.session_price} onChange={(event) => updateForm("session_price", event.target.value)} placeholder="R$ 0,00" />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Valor total do pacote</label>
                    <Input value={form.package_total_price} onChange={(event) => updateForm("package_total_price", event.target.value)} placeholder="R$ 0,00" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Sessões incluídas</label>
                    <Input value={form.package_session_count} onChange={(event) => updateForm("package_session_count", event.target.value)} placeholder="Ex.: varia conforme o mês" />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Pagamento</label>
                <select
                  value={form.payment_timing}
                  onChange={(event) => updateForm("payment_timing", event.target.value as "advance" | "after")}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="advance">Antecipado</option>
                  <option value="after">Pós atendimento</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Dia preferido de pagamento</label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={form.preferred_payment_day}
                  onChange={(event) => updateForm("preferred_payment_day", event.target.value)}
                  placeholder="Ex.: 10"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="billing_reminder_days">Aviso de vencimento</Label>
                <Select
                  value={String(form.billing_reminder_days ?? 0)}
                  onValueChange={(v) => updateForm("billing_reminder_days", Number(v))}
                >
                  <SelectTrigger id="billing_reminder_days">
                    <SelectValue placeholder="Não enviar aviso" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Não enviar aviso</SelectItem>
                    <SelectItem value="1">1 dia antes</SelectItem>
                    <SelectItem value="2">2 dias antes</SelectItem>
                    <SelectItem value="3">3 dias antes</SelectItem>
                    <SelectItem value="7">7 dias antes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-start justify-between rounded-lg border p-3 gap-3">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Cobrança automática</Label>
                  <p className="text-xs text-muted-foreground">
                    Cria lançamento financeiro automaticamente ao marcar a sessão como "Concluída"
                  </p>
                  {!form.billing_auto_charge && form.session_price && (
                    <p className="text-xs text-amber-500 mt-1">
                      ⚠️ Desativada — cobranças não serão geradas automaticamente
                    </p>
                  )}
                  {!form.session_price && (
                    <p className="text-xs text-amber-500 mt-1">
                      ⚠️ Defina o valor por sessão para ativar a cobrança automática
                    </p>
                  )}
                </div>
                <Switch
                  checked={form.billing_auto_charge ?? true}
                  onCheckedChange={(checked: boolean) => updateForm("billing_auto_charge", checked)}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="gap-2" onClick={openPaymentReminder}>
                <MessageCircle className="w-4 h-4" />
                Lembrete de cobrança no WhatsApp
              </Button>
              <Button variant="outline" className="gap-2" onClick={openSessionReminder}>
                <MessageCircle className="w-4 h-4" />
                Lembrete de sessão no WhatsApp
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3 mt-2">
              <div>
                <p className="text-sm font-medium text-foreground">Lembrete automático de sessão</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {sessionReminderEnabled
                    ? "Ativado — este paciente receberá lembretes de sessão conforme configurado em Conta."
                    : "Desativado — ative para incluir este paciente nos lembretes automáticos de sessão."}
                </p>
              </div>
              <Switch
                checked={sessionReminderEnabled}
                onCheckedChange={async (checked: boolean) => {
                  setSessionReminderEnabled(checked);
                  const result = await sessionReminderApi.setPatientEnabled(patientId, checked);
                  if (!result.success) {
                    setSessionReminderEnabled(!checked);
                    toast({
                      title: "Erro ao atualizar lembrete",
                      description: result.error.message,
                      variant: "destructive",
                    });
                  }
                }}
              />
            </div>

            <div className="space-y-3 rounded-lg border border-border p-3">
              <h3 className="text-sm font-semibold text-foreground">Pacotes do paciente</h3>
              {financialPackages.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum pacote registrado para este paciente.</p>
              ) : (
                <div className="space-y-2">
                  {financialPackages.map((pkg) => (
                    <div key={pkg.id} className="rounded-md border border-border/70 p-2.5 text-sm">
                      <p className="font-medium text-foreground">
                        {pkg.quantity} sessões · saldo {pkg.sessions_remaining} · R$ {pkg.total_amount.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Criado em {formatDateTime(pkg.created_at)} · {pkg.status === "active" ? "Ativo" : "Consumido"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3 rounded-lg border border-border p-3">
              <h3 className="text-sm font-semibold text-foreground">Histórico de consumo do pacote</h3>
              {packageConsumptions.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum consumo registrado até o momento.</p>
              ) : (
                <div className="space-y-2">
                  {packageConsumptions.map((item) => (
                    <div key={item.id} className="rounded-md border border-border/70 p-2.5 text-sm">
                      <p className="font-medium text-foreground">{formatDateTime(item.consumed_at)} · sessão {item.session_id ?? "manual"}</p>
                      <p className="text-xs text-muted-foreground">
                        Pacote {item.package_id.slice(0, 8)}{item.note ? ` · ${item.note}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Psiquiatria e emergência"
          subtitle="Rede de cuidado e segurança do caso."
          isOpen={sectionVisibility.progresso}
          onToggle={() => toggleSection("progresso")}
          icon={User}
        >
          <label className="flex items-center gap-3 text-sm text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={form.has_psychiatric_followup}
              onChange={(event) => updateForm("has_psychiatric_followup", event.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            Em acompanhamento psiquiátrico
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Nome do psiquiatra</label>
              <Input value={form.psychiatrist_name} onChange={(event) => updateForm("psychiatrist_name", event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Contato do psiquiatra</label>
              <Input value={form.psychiatrist_contact} onChange={(event) => updateForm("psychiatrist_contact", formatPhone(event.target.value))} />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Contato de emergência</label>
              <Input value={form.emergency_contact_name} onChange={(event) => updateForm("emergency_contact_name", event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Relação com o paciente</label>
              <Input value={form.emergency_contact_relationship} onChange={(event) => updateForm("emergency_contact_relationship", event.target.value)} placeholder="Mãe, pai, irmã, parceiro..." />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Telefone de emergência</label>
              <Input value={form.emergency_contact_phone} onChange={(event) => updateForm("emergency_contact_phone", formatPhone(event.target.value))} />
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Dados para documentos e relatórios"
          subtitle="Informações de apoio para relatórios, declarações e documentos clínicos."
          isOpen={sectionVisibility.progresso}
          onToggle={() => toggleSection("progresso")}
          icon={FileText}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Escolaridade</label>
              <Input value={form.education_level} onChange={(event) => updateForm("education_level", event.target.value)} placeholder="Ex.: Ensino superior completo" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Estado civil</label>
              <Input value={form.marital_status} onChange={(event) => updateForm("marital_status", event.target.value)} placeholder="Ex.: Solteiro(a), casado(a)" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Responsável legal</label>
              <Input value={form.legal_guardian_name} onChange={(event) => updateForm("legal_guardian_name", event.target.value)} placeholder="Nome do responsável legal, se houver" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Vínculo do responsável</label>
              <Input value={form.legal_guardian_relationship} onChange={(event) => updateForm("legal_guardian_relationship", event.target.value)} placeholder="Ex.: Mãe, pai, tutor" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-foreground">Indicação ou finalidade documental</label>
              <Textarea value={form.report_indication} onChange={(event) => updateForm("report_indication", event.target.value)} className="min-h-[90px]" placeholder="Para que tipo de relatório ou documento essas informações costumam ser usadas?" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-foreground">Técnicas e abordagens recorrentes</label>
              <Textarea value={form.recurring_techniques} onChange={(event) => updateForm("recurring_techniques", event.target.value)} className="min-h-[110px]" placeholder="Ex.: escuta clínica, psicoeducação, TCC, regulação emocional..." />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-foreground">Observações para documentos e relatórios</label>
              <Textarea value={form.report_notes} onChange={(event) => updateForm("report_notes", event.target.value)} className="min-h-[120px]" placeholder="Observações que ajudam na redação de relatórios, sem misturar com o núcleo do prontuário." />
            </div>
          </div>
        </CollapsibleSection>


        <div ref={evolucaoRef}>
          <CollapsibleSection
            title="Evolução Clínica"
            subtitle="Síntese integrada do estado atual, temas recorrentes e padrões observados."
            isOpen={sectionVisibility.evolucao}
            onToggle={() => toggleSection("evolucao")}
            icon={Brain}
          >
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  <Sparkles className="w-3 h-3 text-primary" />
                  Gerado por IA
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshSynthesis}
                  disabled={loadingSynthesis}
                  className="h-8 gap-2"
                >
                  <RefreshCw className={cn("w-3 h-3", loadingSynthesis && "animate-spin")} />
                  {synthesis ? "Atualizar síntese" : "Gerar síntese"}
                </Button>
              </div>

              <div className="relative group">
                <Textarea
                  value={synthesis?.content ?? ""}
                  onChange={(e) => {
                    const newContent = e.target.value;
                    setSynthesis(prev => prev ? { ...prev, content: newContent } : null);
                  }}
                  onBlur={(e) => handleUpdateSynthesisContent(e.target.value)}
                  placeholder="Nenhuma síntese clínica gerada ainda. Clique em 'Gerar síntese' para consolidar o histórico do paciente."
                  className="min-h-[350px] bg-background/30 font-serif text-[1.05rem] leading-relaxed resize-none p-6 border-primary/10"
                />
                {!synthesis && !loadingSynthesis && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-[1px] rounded-md border border-dashed border-border">
                    <Button variant="ghost" onClick={handleRefreshSynthesis} className="gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      Começar análise integrada
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                <div className="flex items-center gap-4">
                  <span>Versão {synthesis?.version ?? 0}</span>
                  {synthesis?.is_stale && (
                    <span className="text-amber-500 font-medium">Conteúdo desatualizado (novas notas disponíveis)</span>
                  )}
                </div>
                {synthesis?.last_updated && (
                  <span>Última atualização: {new Date(synthesis.last_updated).toLocaleString('pt-BR')}</span>
                )}
              </div>
            </div>
          </CollapsibleSection>
        </div>

<CollapsibleSection
          title="Histórico de sessões"
          subtitle="Sessões registradas e acesso rápido ao prontuário."
          isOpen={sectionVisibility.sessoes}
          onToggle={() => toggleSection("sessoes")}
          icon={History}
        >
          <div className="flex justify-end">
            {latestSessionId && (
              <Button variant="outline" size="sm" onClick={() => onOpenProntuario(latestSessionId)}>
                Abrir prontuário mais recente
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-border bg-background/40 p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{sessionStats.total}</p>
            </div>
            <div className="rounded-xl border border-border bg-background/40 p-4">
              <p className="text-[10px] uppercase tracking-wider text-status-validated">Presença</p>
              <div className="flex items-baseline gap-1">
                <p className="mt-1 text-2xl font-bold text-foreground">{sessionStats.confirmed}</p>
                <p className="text-xs text-muted-foreground">{sessionStats.presenceRate}%</p>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-background/40 p-4">
              <p className="text-[10px] uppercase tracking-wider text-destructive">Faltas</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{sessionStats.missed}</p>
            </div>
            <div className="rounded-xl border border-border bg-background/40 p-4">
              <p className="text-[10px] uppercase tracking-wider text-status-pending">Pendentes</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{sessionStats.pending}</p>
            </div>
          </div>

          {detail.sessions.length === 0 ? (
            <div className="rounded-xl border border-border bg-muted/30 p-6 text-sm text-muted-foreground">
              Nenhuma sessão vinculada ainda.
            </div>
          ) : (
            <div className="space-y-3">
              {(showAllSessions ? detail.sessions : detail.sessions.slice(0, 5)).map((session) => (
                <div key={session.id} className="rounded-xl border border-border bg-background/60 p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between transition hover:border-primary/30">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-2 w-2 rounded-full",
                      session.status === "confirmed" || session.status === "completed" ? "bg-status-validated" :
                      session.status === "missed" ? "bg-destructive" : "bg-status-pending"
                    )} />
                    <div>
                      <p className="font-medium text-foreground">{formatDateTime(session.scheduled_at)}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        {session.duration_minutes ? `${session.duration_minutes} min` : ""}
                        <span>·</span>
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase",
                          session.status === "confirmed" || session.status === "completed" ? "bg-status-validated/10 text-status-validated" :
                          session.status === "missed" ? "bg-destructive/10 text-destructive" : "bg-status-pending/10 text-status-pending"
                        )}>
                          {sessionStatusLabel(session.status)}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={() => onOpenSession(session.id)}>
                      Abrir sessão
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onOpenProntuario(session.id)}>
                      Nota clínica
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          {deletingSessionId === session.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleUpdateSessionStatus(session.id, "confirmed")}>
                          Confirmar presença
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdateSessionStatus(session.id, "missed")}>
                          Marcar falta
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdateSessionStatus(session.id, "pending")}>
                          Voltar para pendente
                        </DropdownMenuItem>
                        <hr className="my-1 border-border" />
                        <DropdownMenuItem onClick={() => onOpenSession(session.id)}>
                          Remarcar / Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeleteSession(session.id)}>
                          <Trash className="mr-2 h-4 w-4" />
                          Excluir sessão
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
              
              {detail.sessions.length > 5 && (
                <Button 
                  variant="ghost" 
                  className="w-full text-muted-foreground hover:text-primary" 
                  onClick={() => setShowAllSessions(!showAllSessions)}
                >
                  {showAllSessions ? "Ver menos sessões" : `Ver mais ${detail.sessions.length - 5} sessões...`}
                </Button>
              )}
            </div>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title="Documentos"
          subtitle="Atalhos rápidos para os principais documentos do caso e visão do que já foi disponibilizado no portal."
          isOpen={sectionVisibility.documentos}
          onToggle={() => toggleSection("documentos")}
          icon={FileText}
        >
          <div className="grid gap-3 md:grid-cols-3">
            <Button variant="secondary" onClick={() => void createTemplateDocument("payment-receipt", buildDocumentTitle(detail.patient.name, "Recibo"))} disabled={shortcutLoading === "payment-receipt"} className="justify-start gap-2">
              {shortcutLoading === "payment-receipt" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Criar recibo
            </Button>
            <Button variant="secondary" onClick={() => void createTemplateDocument("attendance-declaration", buildDocumentTitle(detail.patient.name, "Declaração"))} disabled={shortcutLoading === "attendance-declaration"} className="justify-start gap-2">
              {shortcutLoading === "attendance-declaration" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Criar declaração
            </Button>
            <Button variant="secondary" onClick={() => void createTemplateDocument("psychological-certificate", buildDocumentTitle(detail.patient.name, "Atestado psicológico"))} disabled={shortcutLoading === "psychological-certificate"} className="justify-start gap-2">
              {shortcutLoading === "psychological-certificate" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Criar atestado
            </Button>
            <Button variant="outline" onClick={() => void handleCreateContract()} disabled={shortcutLoading === "contract"} className="justify-start gap-2">
              {shortcutLoading === "contract" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Criar contrato
            </Button>
            <Button variant="outline" onClick={() => void handleCreateReport()} disabled={shortcutLoading === "report"} className="justify-start gap-2">
              {shortcutLoading === "report" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Criar relatório
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-background/40 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total de documentos</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{detail.documents.length}</p>
            </div>
            <div className="rounded-xl border border-border bg-background/40 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Disponíveis no portal</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{sharedDocuments.length}</p>
            </div>
            <div className="rounded-xl border border-border bg-background/40 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Rascunhos internos</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{detail.documents.length - sharedDocuments.length}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { key: "all", label: "Todos" },
              { key: "portal", label: "Somente no portal" },
              { key: "recent", label: "Últimos 30 dias" },
            ].map((item) => (
              <Button
                key={item.key}
                type="button"
                variant={documentFilter === item.key ? "secondary" : "outline"}
                size="sm"
                onClick={() => setDocumentFilter(item.key as typeof documentFilter)}
              >
                {item.label}
              </Button>
            ))}
          </div>

          {detail.documents.length === 0 ? (
            <div className="rounded-xl border border-border bg-muted/30 p-6 text-sm text-muted-foreground">
              Nenhum documento clínico vinculado a este paciente ainda.
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="rounded-xl border border-border bg-muted/30 p-6 text-sm text-muted-foreground">
              Nenhum documento corresponde ao filtro selecionado.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDocuments.map((document) => (
                <div
                  key={(document as { id: string }).id}
                  className="rounded-xl border border-border bg-background/60 p-4 transition hover:border-primary/40 hover:bg-background"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-foreground">{(document as { title?: string }).title ?? "Documento"}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {documentTemplateLabel((document as { template_id?: string }).template_id)} · criado em {formatDate((document as { created_at?: string }).created_at)}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {(document as { shared_with_patient?: boolean }).shared_with_patient
                          ? `Disponível no portal${(document as { shared_at?: string }).shared_at ? ` desde ${formatDateTime((document as { shared_at?: string }).shared_at)}` : ""}`
                          : "Ainda não disponível no portal do paciente"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          (document as { shared_with_patient?: boolean }).shared_with_patient
                            ? "bg-status-validated/10 text-status-validated"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {(document as { shared_with_patient?: boolean }).shared_with_patient ? "No portal" : "Interno"}
                      </span>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => void openDocumentPreview(document as { id: string; title?: string; template_id?: string; created_at?: string; status?: string })}
                      >
                        Abrir
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2 text-destructive hover:text-destructive"
                        disabled={deletingDocumentId === (document as { id: string }).id}
                        onClick={() => void handleDeleteDocument(document as { id: string; title?: string })}
                      >
                        {deletingDocumentId === (document as { id: string }).id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                        Excluir
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title="Contrato assinado"
          subtitle="Visualização rápida do envio, aceite e anexo do contrato terapêutico."
          isOpen={sectionVisibility.contratos}
          onToggle={() => toggleSection("contratos")}
          icon={FileText}
        >
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-background/40 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Contratos criados</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{contracts.length}</p>
            </div>
            <div className="rounded-xl border border-border bg-background/40 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Enviados / aceitos</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {contracts.filter((contract) => contract.status === "sent" || contract.status === "accepted").length}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background/40 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Assinados</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{signedContracts.length}</p>
            </div>
          </div>

          {signedContracts.length === 0 ? (
            <div className="rounded-xl border border-border bg-muted/30 p-6 text-sm text-muted-foreground">
              Nenhum contrato assinado foi anexado ainda.
            </div>
          ) : (
            <div className="space-y-3">
              {signedContracts.map((contract) => (
                <div key={contract.id} className="rounded-xl border border-border bg-background/60 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{contract.title ?? "Contrato terapêutico"}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Arquivo: {contract.signed_attachment?.file_name ?? "Anexo"}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Status do fluxo: {contract.status === "accepted" ? "aceito pelo paciente" : contract.status === "sent" ? "enviado para aceite" : "rascunho"}
                      </p>
                    </div>
                    <span className="rounded-full bg-status-validated/10 px-3 py-1 text-xs font-medium text-status-validated">
                      Assinado
                    </span>
                  </div>
                  {contract.signed_attachment?.data_url ? (
                    <div className="mt-4">
                      <a
                        href={contract.signed_attachment.data_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        Abrir contrato assinado
                      </a>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title="Diário emocional"
          subtitle="Últimos registros do paciente para consulta rápida."
          isOpen={sectionVisibility.diario}
          onToggle={() => toggleSection("diario")}
          icon={History}
        >
          {(() => {
            const diaryEntriesFromForms = (formEntries ?? [])
              .filter((e: any) => {
                const assignment = formAssignments.find(a => a.id === e.assignment_id || a.form_id === e.form_id);
                const formName = normalizeStr(assignment?.form?.name ?? assignment?.form?.title ?? e.form_id ?? "");
                const matchesKeyword = ["diario", "humor", "emocao", "emocional", "sentimento"].some(k => formName.includes(k));
                const hasMoodData = e.data && ((e.data as any).mood !== undefined || (e.data as any).humor !== undefined);
                return matchesKeyword || hasMoodData;
              })
              .map((e: any) => ({
                id: e.id,
                date: e.created_at,
                mood: e.data?.mood ?? e.data?.humor ?? e.data?.humor_hoje ?? e.data?.nota ?? 0,
                intensity: e.data?.intensity ?? e.data?.intensidade ?? e.data?.nivel ?? 0,
                description: e.data?.description ?? e.data?.thoughts ?? e.data?.sentimentos ?? e.data?.relato ?? e.data?.texto ?? e.data?.resposta ?? e.data?.observacoes ?? "",
                is_from_form: true
              }));

            const allEntries = [...(detail.emotional_diary ?? []), ...diaryEntriesFromForms]
              .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

            if (allEntries.length === 0) {
              return (
                <div className="rounded-xl border border-border bg-muted/30 p-6 text-sm text-muted-foreground">
                  Ainda não há registros emocionais vinculados.
                </div>
              );
            }

            return (
              <div className="space-y-3">
                {allEntries.slice(0, 5).map((entry: any) => (
                  <div key={entry.id} className="rounded-xl border border-border bg-background/60 p-4">
                    <div className="flex items-center justify-between gap-2">
                       <p className="font-medium text-foreground">
                         {formatDateTime(entry.date)} 
                         {entry.mood > 0 && ` · Humor ${entry.mood}/5`}
                         {entry.intensity > 0 && ` · Intensidade ${entry.intensity}/10`}
                       </p>
                       {entry.is_from_form && (
                         <span className="text-[10px] uppercase tracking-wider text-primary/60 font-bold">Via Portal</span>
                       )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">{entry.description || entry.thoughts || "Sem descrição adicional."}</p>
                  </div>
                ))}
              </div>
            );
          })()}
        </CollapsibleSection>

        <CollapsibleSection
          title="Formulários do paciente"
          subtitle="Veja o que já foi disponibilizado para este paciente e o histórico de respostas enviadas."
          isOpen={sectionVisibility.formularios}
          onToggle={() => toggleSection("formularios")}
          icon={FileText}
        >
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-background/40 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Formulários ativos</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{activeAssignments.length}</p>
            </div>
            <div className="rounded-xl border border-border bg-background/40 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Respostas recebidas</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{formEntries.length}</p>
            </div>
            <div className="rounded-xl border border-border bg-background/40 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Última resposta</p>
              <p className="mt-2 text-sm font-medium text-foreground">
                {formEntries.length ? formatDateTime((formEntries[0] as any).created_at) : "Nenhuma ainda"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { key: "all", label: "Todos" },
              { key: "with_response", label: "Com resposta" },
              { key: "without_response", label: "Sem resposta" },
              { key: "recent", label: "Últimos 30 dias" },
            ].map((item) => (
              <Button
                key={item.key}
                type="button"
                variant={formFilter === item.key ? "secondary" : "outline"}
                size="sm"
                onClick={() => setFormFilter(item.key as typeof formFilter)}
              >
                {item.label}
              </Button>
            ))}
          </div>

          {activeAssignments.length === 0 ? (
            <div className="rounded-xl border border-border bg-muted/30 p-6 text-sm text-muted-foreground">
              Nenhum formulário foi disponibilizado para este paciente ainda.
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="rounded-xl border border-border bg-muted/30 p-6 text-sm text-muted-foreground">
              Nenhum formulário corresponde ao filtro selecionado.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAssignments.map((assignment) => {
                const assignmentEntries = formEntryGroups[assignment.id] ?? [];
                return (
                  <div key={assignment.id} className="rounded-xl border border-border bg-background/60 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">
                          {assignment.form?.name ?? assignment.form?.title ?? "Formulário"}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {assignment.mode === "single_use" ? "Envio único" : "Recorrente"} · disponibilizado em {formatDateTime(assignment.shared_at)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                          {assignment.response_count ?? assignmentEntries.length} resposta(s)
                        </span>
                        <span className="rounded-full bg-status-validated/10 px-3 py-1 text-xs font-medium text-status-validated">
                          No portal
                        </span>
                      </div>
                    </div>
                    {assignmentEntries.length > 0 ? (
                      <div className="mt-4 space-y-2">
                        {assignmentEntries.slice(0, 3).map((entry: any) => (
                          <div key={entry.id} className="rounded-lg bg-muted/40 px-4 py-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 mb-2">
                              {formatDateTime(entry.created_at)} · {entry.submitted_by === "patient" ? "enviado pelo paciente" : "registrado pelo profissional"}
                            </p>
                            <div className="space-y-3">
                              {Object.entries(entry.data ?? entry.content ?? {}).map(([key, val]) => (
                                <div key={key} className="border-l-2 border-primary/20 pl-3">
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase">{key.replace(/_/g, " ")}</p>
                                  <p className="text-sm text-foreground/90 mt-0.5 whitespace-pre-wrap">{String(val)}</p>
                                </div>
                              ))}
                              {Object.keys(entry.data ?? entry.content ?? {}).length === 0 && (
                                <p className="text-xs text-muted-foreground italic">Resposta vazia ou sem campos identificados.</p>
                              )}
                            </div>
                          </div>
                        ))}
                        {assignmentEntries.length > 3 ? (
                          <p className="text-xs text-muted-foreground mt-2">
                            + {assignmentEntries.length - 3} resposta(s) adicional(is) para este formulário.
                          </p>
                        ) : null}
                      </div>
                    ) : assignment.response_count && assignment.response_count > 0 ? (
                       <div className="mt-4 p-4 rounded-xl border border-dashed border-border bg-muted/20 text-center">
                          <p className="text-sm text-muted-foreground italic">
                            Há {assignment.response_count} resposta(s) registradas, mas elas não estão vinculadas diretamente a este envio. 
                            Verifique a lista geral abaixo.
                          </p>
                       </div>
                    ) : (
                      <p className="mt-4 text-sm text-muted-foreground">
                        Este formulário já está disponível no portal, mas o paciente ainda não respondeu.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {formEntries.length === 0 ? (
            <div className="rounded-xl border border-border bg-muted/30 p-6 text-sm text-muted-foreground">
              Nenhum formulário foi respondido ainda.
            </div>
          ) : (
            <div className="space-y-3">
              {formEntries.map((entry: any) => (
                <div key={entry.id} className="rounded-xl border border-border bg-background/60 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-bold text-foreground text-sm uppercase tracking-wider">{entry.form_id}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDateTime(entry.created_at)} · {entry.submitted_by === "patient" ? "enviado pelo paciente" : "registrado pelo profissional"}
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                     {Object.entries(entry.data ?? entry.content ?? {}).map(([key, val]) => (
                        <div key={key} className="bg-muted/30 rounded-lg p-2.5 border border-border/40">
                           <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">{key.replace(/_/g, " ")}</p>
                           <p className="text-xs text-foreground mt-1 whitespace-pre-wrap">{String(val)}</p>
                        </div>
                     ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title="Diário dos sonhos"
          subtitle="Registros do diário de sonhos enviados pelo paciente."
          isOpen={sectionVisibility.sonhos}
          onToggle={() => toggleSection("sonhos")}
          icon={Moon}
        >
          {dreamDiaryLoading ? (
            <div className="flex items-center gap-3 py-6 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Carregando diário...</span>
            </div>
          ) : dreamDiaryEntries.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground text-center">
              Nenhum sonho registrado pelo paciente ainda.
            </p>
          ) : (
            <div className="space-y-4">
              {dreamDiaryEntries.map((entry) => {
                const EMOTION_LABELS: Record<string, string> = {
                  medo:"Medo",alegria:"Alegria",tristeza:"Tristeza",ansiedade:"Ansiedade",
                  paz:"Paz",raiva:"Raiva",confusao:"Confusão",nostalgia:"Nostalgia",
                  euforia:"Euforia",culpa:"Culpa",amor:"Amor",solidao:"Solidão",
                };
                const WAKE_LABELS: Record<string, string> = {
                  tranquilo:"Tranquilo",agitado:"Agitado",confuso:"Confuso",assustado:"Assustado",neutro:"Neutro",
                };
                return (
                  <div key={entry.id} className="rounded-2xl border border-border bg-background p-5 space-y-3">
                    {/* header */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Moon className="h-4 w-4 text-indigo-400" />
                        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                          {new Date(entry.dream_date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
                          Acord. {WAKE_LABELS[entry.wake_state] ?? entry.wake_state}
                        </span>
                        {entry.is_recurring && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                            <RotateCcw className="h-2.5 w-2.5" /> Recorrente
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {"★".repeat(entry.emotional_intensity)}{"☆".repeat(5 - entry.emotional_intensity)}
                        </span>
                      </div>
                    </div>

                    {entry.title && (
                      <p className="font-serif text-base font-medium text-foreground">{entry.title}</p>
                    )}

                    {/* narrative */}
                    <div>
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Narrativa</p>
                      <p className="text-sm text-foreground leading-relaxed">{entry.narrative}</p>
                    </div>

                    {/* emotions */}
                    {entry.emotions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {entry.emotions.map((e) => (
                          <span key={e} className="rounded-full bg-indigo-500/10 px-2.5 py-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-300">
                            {EMOTION_LABELS[e] ?? e}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* detail fields */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      {entry.physical_sensations && (
                        <div>
                          <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Sensações físicas</p>
                          <p className="text-sm text-foreground">{entry.physical_sensations}</p>
                        </div>
                      )}
                      {entry.characters && (
                        <div>
                          <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Personagens</p>
                          <p className="text-sm text-foreground">{entry.characters}</p>
                        </div>
                      )}
                      {entry.setting && (
                        <div>
                          <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Cenário</p>
                          <p className="text-sm text-foreground">{entry.setting}</p>
                        </div>
                      )}
                    </div>

                    {/* patient interpretation */}
                    {entry.patient_interpretation && (
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                          Interpretação do paciente
                        </p>
                        <p className="text-sm text-foreground leading-relaxed">{entry.patient_interpretation}</p>
                      </div>
                    )}

                    {/* associations */}
                    {entry.associations && (
                      <div>
                        <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Isso lembrou de...</p>
                        <p className="text-sm text-foreground">{entry.associations}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title="Progresso e objetivos"
          subtitle="Objetivos terapêuticos, homework e evolução do tratamento."
          isOpen={sectionVisibility.progresso}
          onToggle={() => toggleSection("progresso")}
          icon={CalendarPlus}
        >
          <PatientProgressTab
            patientId={patientId}
            sessionCount={detail.summary.total_sessions}
            attendanceRate={
              detail.sessions.length === 0
                ? 0
                : detail.sessions.filter((s) => s.status === "completed" || s.status === "confirmed").length / 
                  (detail.sessions.filter((s) => s.status !== "scheduled").length || 1)
            }
            weeksInTherapy={
              detail.sessions.length === 0
                ? 0
                : Math.max(1, Math.round((Date.now() - new Date(detail.sessions[detail.sessions.length - 1].scheduled_at).getTime()) / (7 * 24 * 60 * 60 * 1000)))
            }
          />
        </CollapsibleSection>

        <Dialog open={documentDialogOpen} onOpenChange={(open) => !open && closeDocumentPreview()}>
          <DialogContent className="max-h-[92vh] max-w-[min(96vw,1200px)] overflow-hidden p-0">
            <DialogHeader>
              <DialogTitle className="px-6 pt-6 font-serif text-xl">
                {(selectedDocument as { title?: string } | null)?.title ?? "Documento"}
              </DialogTitle>
            </DialogHeader>
            {selectedDocument ? (
              <div className="flex h-[calc(92vh-84px)] flex-col overflow-hidden">
                <div className="grid gap-3 border-b border-border px-6 pb-4 text-sm text-muted-foreground md:grid-cols-3">
                  <p>
                    <span className="font-medium text-foreground">Template:</span>{" "}
                    {documentTemplateLabel((selectedDocument as { template_id?: string }).template_id)}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Criado em:</span>{" "}
                    {formatDateTime((selectedDocument as { created_at?: string }).created_at)}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Status:</span>{" "}
                    {(selectedDocument as { status?: string }).status ?? "draft"}
                  </p>
                </div>

                {documentPreviewLoading ? (
                  <div className="px-6 py-4 text-sm text-muted-foreground">
                    Carregando visualização do documento...
                  </div>
                ) : (
                  <div className="grid flex-1 gap-0 overflow-hidden lg:grid-cols-[1.05fr_0.95fr]">
                    <div className="flex min-h-0 flex-col border-b border-border lg:border-b-0 lg:border-r">
                      <div className="flex items-center justify-between gap-3 px-6 py-4">
                        <div>
                          <p className="font-medium text-foreground">Visualização</p>
                          <p className="text-sm text-muted-foreground">Prévia mais ampla do documento.</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleOpenDocumentInNewTab}>
                          Abrir em nova aba
                        </Button>
                      </div>
                      <div className="min-h-0 flex-1 overflow-auto bg-muted/20 px-6 pb-6">
                        {liveDocumentPreviewHtml ? (
                          <div className="mx-auto min-h-full rounded-lg border border-border bg-background shadow-sm">
                            <iframe
                              title="Preview do documento"
                              srcDoc={liveDocumentPreviewHtml}
                              className="h-[72vh] min-h-[720px] w-full bg-white"
                            />
                          </div>
                        ) : (
                          <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                            Ainda não há visualização disponível para este documento.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex min-h-0 flex-col">
                      <div className="px-6 py-4">
                        <p className="font-medium text-foreground">Editar conteúdo</p>
                        <p className="text-sm text-muted-foreground">
                          Preencha os campos do documento e o preview será atualizado automaticamente.
                        </p>
                      </div>
                      <div className="min-h-0 flex-1 px-6 pb-6">
                        {supportsGuidedDocumentEditor((selectedDocument as { template_id?: string } | null)?.template_id) ? (
                          <div className="space-y-4 overflow-auto pr-1">
                            {(selectedDocument as { template_id?: string } | null)?.template_id === "payment-receipt" ? (
                              <>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-foreground">Valor</label>
                                  <Input
                                    value={documentFormValues.amount ?? ""}
                                    onChange={(event) => updateDocumentFormValue("amount", event.target.value)}
                                    placeholder="200,00"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-foreground">Forma de pagamento</label>
                                  <Input
                                    value={documentFormValues.payment_method ?? ""}
                                    onChange={(event) => updateDocumentFormValue("payment_method", event.target.value)}
                                    placeholder="PIX, cartão, dinheiro..."
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-foreground">Tipo de serviço</label>
                                  <select
                                    value={documentFormValues.service_type ?? "session"}
                                    onChange={(event) => updateDocumentFormValue("service_type", event.target.value)}
                                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                  >
                                    <option value="session">Sessão de psicoterapia</option>
                                    <option value="evaluation">Avaliação psicológica</option>
                                    <option value="other">Outro</option>
                                  </select>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">Data do atendimento</label>
                                    <Input
                                      value={documentFormValues.attendance_date ?? ""}
                                      onChange={(event) => updateDocumentFormValue("attendance_date", event.target.value)}
                                      placeholder="13/04/2026"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">Data do documento</label>
                                    <Input
                                      value={documentFormValues.date_label ?? ""}
                                      onChange={(event) => updateDocumentFormValue("date_label", event.target.value)}
                                      placeholder="13/04/2026"
                                    />
                                  </div>
                                </div>
                              </>
                            ) : null}

                            {(selectedDocument as { template_id?: string } | null)?.template_id === "attendance-declaration" ? (
                              <>
                                <div className="grid gap-4 md:grid-cols-2">
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">Data do atendimento</label>
                                    <Input
                                      value={documentFormValues.attendance_date ?? ""}
                                      onChange={(event) => updateDocumentFormValue("attendance_date", event.target.value)}
                                      placeholder="13/04/2026"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">Horário</label>
                                    <Input
                                      value={documentFormValues.attendance_time ?? ""}
                                      onChange={(event) => updateDocumentFormValue("attendance_time", event.target.value)}
                                      placeholder="14:00"
                                    />
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-foreground">Data do documento</label>
                                  <Input
                                    value={documentFormValues.date_label ?? ""}
                                    onChange={(event) => updateDocumentFormValue("date_label", event.target.value)}
                                    placeholder="13/04/2026"
                                  />
                                </div>
                              </>
                            ) : null}

                            {(selectedDocument as { template_id?: string } | null)?.template_id === "psychological-certificate" ? (
                              <>
                                <div className="grid gap-4 md:grid-cols-2">
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">Início do período</label>
                                    <Input
                                      value={documentFormValues.period_start ?? ""}
                                      onChange={(event) => updateDocumentFormValue("period_start", event.target.value)}
                                      placeholder="13/04/2026"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">Fim do período</label>
                                    <Input
                                      value={documentFormValues.period_end ?? ""}
                                      onChange={(event) => updateDocumentFormValue("period_end", event.target.value)}
                                      placeholder="20/04/2026"
                                    />
                                  </div>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">CID</label>
                                    <Input
                                      value={documentFormValues.cid_code ?? ""}
                                      onChange={(event) => updateDocumentFormValue("cid_code", event.target.value)}
                                      placeholder="Opcional"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">Data do documento</label>
                                    <Input
                                      value={documentFormValues.date_label ?? ""}
                                      onChange={(event) => updateDocumentFormValue("date_label", event.target.value)}
                                      placeholder="13/04/2026"
                                    />
                                  </div>
                                </div>
                              </>
                            ) : null}
                          </div>
                        ) : (
                          <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                            Este tipo de documento ainda não tem edição guiada. Por enquanto, ele fica disponível apenas para visualização.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
            <DialogFooter className="border-t border-border px-6 py-4">
              <Button
                onClick={() => void handleSaveDocumentVersion()}
                disabled={savingDocumentVersion || !selectedDocument}
                className="gap-2"
              >
                {savingDocumentVersion ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar nova versão
              </Button>
              <Button variant="secondary" onClick={closeDocumentPreview}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={paymentReminderOpen} onOpenChange={setPaymentReminderOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="font-serif text-xl">Lembrete de cobrança</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Edite a mensagem antes de enviar ao paciente.</p>
              <Textarea value={paymentReminderMessage} onChange={(event) => setPaymentReminderMessage(event.target.value)} className="min-h-[220px]" />
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setPaymentReminderOpen(false)}>Fechar</Button>
              <Button onClick={handleSendPaymentReminder}>Enviar no WhatsApp</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={preSessionBriefingOpen} onOpenChange={setPreSessionBriefingOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="font-serif text-xl">Briefing pre-sessao</DialogTitle>
              <DialogDescription>
                Resumo interno para o psicologo revisar antes do atendimento. Nao enviar ao paciente.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Textarea value={preSessionBriefingText} readOnly className="min-h-[360px] font-mono text-sm" />
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setPreSessionBriefingOpen(false)}>Fechar</Button>
              <Button variant="outline" onClick={copyPreSessionBriefing}>Copiar</Button>
              <Button onClick={() => void sendPreSessionNotification(true)}>Notificar agora</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={sessionReminderOpen} onOpenChange={setSessionReminderOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="font-serif text-xl">Lembrete de sessão</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Edite a mensagem antes de enviar ao paciente.</p>
              <Textarea value={sessionReminderMessage} onChange={(event) => setSessionReminderMessage(event.target.value)} className="min-h-[200px]" />
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setSessionReminderOpen(false)}>Fechar</Button>
              <Button onClick={handleSendSessionReminder}>Enviar no WhatsApp</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
