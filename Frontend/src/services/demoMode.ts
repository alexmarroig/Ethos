type DemoApiSuccess<T> = {
  success: true;
  data: T;
  request_id: string;
  status?: number;
};

type DemoApiError = {
  success: false;
  error: { code: string; message: string };
  request_id: string;
  status?: number;
};

type DemoApiResult<T> = DemoApiSuccess<T> | DemoApiError;

type DemoSession = {
  id: string;
  patient_id: string;
  patient_name: string;
  date: string;
  time: string;
  status: "confirmed" | "pending" | "missed" | "completed";
  has_audio?: boolean;
  has_transcription?: boolean;
  has_clinical_note?: boolean;
  clinical_note_status?: "draft" | "validated";
  payment_status?: "paid" | "open" | "exempt";
};

type DemoPatient = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  total_sessions?: number;
};

const DEMO_PATIENTS: DemoPatient[] = [
  { id: "1", name: "Beatriz Mendonca", email: "beatriz@demo.ethos", phone: "(11) 99999-1001", total_sessions: 12 },
  { id: "2", name: "Carlos Almeida", email: "carlos@demo.ethos", phone: "(11) 99999-1002", total_sessions: 8 },
  { id: "3", name: "Julia Santos", email: "julia@demo.ethos", phone: "(11) 99999-1003", total_sessions: 5 },
];

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildDemoSessions(): DemoSession[] {
  const today = todayIsoDate();
  return [
    {
      id: "101",
      patient_id: "1",
      patient_name: "Beatriz Mendonca",
      date: today,
      time: "14:00",
      status: "confirmed",
      has_audio: true,
      has_transcription: true,
      has_clinical_note: false,
      clinical_note_status: "draft",
      payment_status: "open",
    },
    {
      id: "102",
      patient_id: "2",
      patient_name: "Carlos Almeida",
      date: today,
      time: "16:30",
      status: "pending",
      has_audio: false,
      has_transcription: false,
      has_clinical_note: false,
      payment_status: "open",
    },
    {
      id: "103",
      patient_id: "3",
      patient_name: "Julia Santos",
      date: today,
      time: "10:00",
      status: "completed",
      has_audio: true,
      has_transcription: true,
      has_clinical_note: true,
      clinical_note_status: "validated",
      payment_status: "paid",
    },
  ];
}

function getStoredToken(): string | null {
  try {
    const raw = localStorage.getItem("ethos_user");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed?.token === "string" ? parsed.token : null;
  } catch {
    return null;
  }
}

export function isDemoModeEnabled(): boolean {
  const token = getStoredToken();
  return !!token && token.startsWith("dev-token-");
}

function success<T>(data: T): DemoApiSuccess<T> {
  return { success: true, data, request_id: "demo-local", status: 200 };
}

function parseUrl(path: string): URL {
  return new URL(path, "http://localhost");
}

export function getDemoApiResponse<T>(
  path: string,
  method: string
): DemoApiResult<T> | null {
  if (!isDemoModeEnabled()) return null;
  if (method !== "GET") return null;

  const url = parseUrl(path);
  const pathname = url.pathname;

  if (pathname === "/sessions") {
    let sessions = buildDemoSessions();
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const status = url.searchParams.get("status");
    const patientId = url.searchParams.get("patient_id");

    if (from) sessions = sessions.filter((s) => s.date >= from);
    if (to) sessions = sessions.filter((s) => s.date <= to);
    if (status) sessions = sessions.filter((s) => s.status === status);
    if (patientId) sessions = sessions.filter((s) => s.patient_id === patientId);

    return success(sessions as unknown as T);
  }

  if (pathname.startsWith("/sessions/")) {
    const id = pathname.replace("/sessions/", "");
    const item = buildDemoSessions().find((s) => s.id === id);
    if (!item) {
      return {
        success: false,
        error: { code: "NOT_FOUND", message: "Sessao nao encontrada no modo demo." },
        request_id: "demo-local",
        status: 404,
      };
    }
    return success(item as unknown as T);
  }

  if (pathname === "/patients") {
    return success(DEMO_PATIENTS as unknown as T);
  }

  if (pathname.startsWith("/patients/")) {
    const id = pathname.replace("/patients/", "");
    const item = DEMO_PATIENTS.find((p) => p.id === id);
    if (!item) {
      return {
        success: false,
        error: { code: "NOT_FOUND", message: "Paciente nao encontrado no modo demo." },
        request_id: "demo-local",
        status: 404,
      };
    }
    return success(item as unknown as T);
  }

  return null;
}
