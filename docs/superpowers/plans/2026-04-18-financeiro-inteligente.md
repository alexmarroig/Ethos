# Financeiro Inteligente Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatizar cobranças ao concluir sessões, enviar avisos de vencimento por WhatsApp, e exibir inadimplência no painel e no dashboard.

**Architecture:** Geração de lançamento financeiro acontece de forma síncrona no `PATCH /sessions/:id/status` quando o paciente tem `billing_auto_charge = true`; avisos de vencimento rodam em um `billingReminderWorker` a cada hora seguindo o padrão do `sessionReminderWorker`; inadimplência é calculada on-the-fly via `GET /financial/summary`. Frontend adiciona alertas na `FinancePage`, card no `HomePage`, dialog de confirmação `BillingConfirmDialog`, e campos de configuração no `PatientDetailPage`.

**Tech Stack:** Node.js + TypeScript (backend), React + Tailwind + shadcn/ui (frontend), Maps em memória, WhatsApp via infra existente.

---

## Mapa de arquivos

| Arquivo | Ação | Responsabilidade |
|---------|------|-----------------|
| `apps/ethos-clinic/src/domain/types.ts` | Modificar | Adicionar campos em `Patient` e `FinancialEntry` |
| `apps/ethos-clinic/src/application/service.ts` | Modificar | `generateSessionBilling()`, `getFinancialSummary()`, patches em `PatientUpsertInput` e `updatePatient` |
| `apps/ethos-clinic/src/api/httpServer.ts` | Modificar | Lógica em `PATCH /sessions/:id/status`, novo `GET /financial/summary`, aceitar novos campos em `PATCH /patients/:id` |
| `apps/ethos-clinic/src/application/billingReminderWorker.ts` | Criar | Worker que envia avisos de vencimento por WhatsApp |
| `apps/ethos-clinic/src/index.ts` | Modificar | Registrar `startBillingReminderWorker()` |
| `apps/ethos-clinic/test/financeiro-inteligente.test.ts` | Criar | Testes de integração para todos os fluxos |
| `Frontend/src/services/financialService.ts` | Modificar | Adicionar `getFinancialSummary()` |
| `Frontend/src/components/BillingConfirmDialog.tsx` | Criar | Dialog de confirmação de cobrança |
| `Frontend/src/pages/FinancePage.tsx` | Modificar | Card de vencidos, badge, filtro, botão manual |
| `Frontend/src/pages/HomePage.tsx` | Modificar | Card de inadimplência |
| `Frontend/src/pages/PatientDetailPage.tsx` | Modificar | Seção "Cobrança" com 3 novos campos |

---

## Task 1: Tipos — novos campos em Patient e FinancialEntry

**Files:**
- Modify: `apps/ethos-clinic/src/domain/types.ts`

- [ ] **Step 1: Adicionar campos em `PatientBilling` e `FinancialEntry`**

Localizar `PatientBilling` (linha ~77) e adicionar os dois novos campos:

```ts
export type PatientBilling = {
  mode: "per_session" | "package";
  weekly_frequency?: 1 | 2 | 3 | 4 | 5;
  session_price?: number;
  package_total_price?: number;
  package_session_count?: number;
  payment_timing?: "advance" | "after";
  preferred_payment_day?: number;
  billing_reminder_days?: number;   // dias antes do vencimento para enviar aviso
  billing_auto_charge?: boolean;    // true = gera lançamento automático ao concluir sessão
};
```

Localizar `FinancialEntry` (linha ~255) e adicionar:

```ts
export type FinancialEntry = Owned & {
  patient_id: string;
  session_id?: string;
  type: "receivable" | "payable";
  amount: number;
  due_date: string;
  status: "open" | "paid";
  description: string;
  payment_method?: string;
  paid_at?: string;
  notes?: string;
  shared_with_patient?: boolean;
  shared_at?: string;
  reminder_sent_at?: string;   // ISO datetime do último aviso enviado
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/ethos-clinic/src/domain/types.ts
git commit -m "feat(types): add billing_reminder_days, billing_auto_charge, reminder_sent_at"
```

---

## Task 2: Service — `generateSessionBilling` e `getFinancialSummary`

**Files:**
- Modify: `apps/ethos-clinic/src/application/service.ts`

- [ ] **Step 1: Adicionar `calculateDueDate` helper e `generateSessionBilling` no final do arquivo (antes do último export)**

```ts
// Calcula due_date baseado em payment_timing e preferred_payment_day
export const calculateDueDate = (sessionAt: string, billing: PatientBilling): string => {
  const sessionDate = new Date(sessionAt);
  if (billing.payment_timing === "advance") {
    // Vencimento = dia da sessão
    return sessionDate.toISOString().split("T")[0];
  }
  if (billing.preferred_payment_day) {
    // Próxima ocorrência do dia preferido no mês seguinte (ou mesmo mês se já passou)
    const day = billing.preferred_payment_day;
    const candidate = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), day);
    if (candidate <= sessionDate) {
      candidate.setMonth(candidate.getMonth() + 1);
    }
    return candidate.toISOString().split("T")[0];
  }
  // Fallback: 7 dias após a sessão
  const fallback = new Date(sessionDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  return fallback.toISOString().split("T")[0];
};

export type BillingGenerationResult =
  | { pending_billing: false }
  | { pending_billing: true; suggested_amount: number; suggested_due_date: string };

// Chamado após PATCH /sessions/:id/status → completed
export const generateSessionBilling = (
  owner: string,
  session: ClinicalSession,
): BillingGenerationResult => {
  const patient = getPatient(owner, session.patient_id);
  if (!patient?.billing?.session_price) return { pending_billing: false };

  const dueDate = calculateDueDate(session.scheduled_at, patient.billing);

  if (patient.billing.billing_auto_charge) {
    createFinancialEntry(owner, {
      patient_id: patient.id,
      session_id: session.id,
      type: "receivable",
      amount: patient.billing.session_price,
      due_date: dueDate,
      status: "open",
      description: `Sessão ${new Date(session.scheduled_at).toLocaleDateString("pt-BR")}`,
    });
    return { pending_billing: false };
  }

  return {
    pending_billing: true,
    suggested_amount: patient.billing.session_price,
    suggested_due_date: dueDate,
  };
};
```

- [ ] **Step 2: Adicionar `getFinancialSummary` no final do arquivo**

```ts
export type FinancialSummary = {
  overdue_count: number;
  overdue_total: number;
  due_soon_count: number;
};

export const getFinancialSummary = (owner: string): FinancialSummary => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  let overdue_count = 0;
  let overdue_total = 0;
  let due_soon_count = 0;

  for (const entry of db.financial.values()) {
    if (entry.owner_user_id !== owner) continue;
    if (entry.status !== "open") continue;
    const due = new Date(entry.due_date);
    due.setHours(0, 0, 0, 0);
    if (due < today) {
      overdue_count++;
      overdue_total += entry.amount;
    } else if (due <= sevenDaysFromNow) {
      due_soon_count++;
    }
  }

  return { overdue_count, overdue_total, due_soon_count };
};
```

- [ ] **Step 3: Adicionar `billing_reminder_days` e `billing_auto_charge` em `PatientUpsertInput` (linha ~641)**

Localizar o tipo `PatientUpsertInput` e adicionar dentro de `billing?:`:

```ts
  billing?: PatientBilling;  // já existe — PatientBilling agora tem os novos campos
```

Não é necessário alterar o tipo em si — os novos campos já estão em `PatientBilling`.

Localizar `normalizePatientBilling` (linha ~716) e garantir que os novos campos são copiados:

```ts
const normalizePatientBilling = (value: PatientUpsertInput["billing"]) => {
  if (!value) return undefined;
  return {
    mode: value.mode,
    weekly_frequency: value.weekly_frequency,
    session_price: typeof value.session_price === "number" ? value.session_price : undefined,
    package_total_price: typeof value.package_total_price === "number" ? value.package_total_price : undefined,
    package_session_count: typeof value.package_session_count === "number" ? value.package_session_count : undefined,
    payment_timing: value.payment_timing,
    preferred_payment_day: typeof value.preferred_payment_day === "number" ? value.preferred_payment_day : undefined,
    billing_reminder_days: typeof value.billing_reminder_days === "number" ? value.billing_reminder_days : undefined,
    billing_auto_charge: typeof value.billing_auto_charge === "boolean" ? value.billing_auto_charge : undefined,
  } satisfies PatientBilling;
};
```

- [ ] **Step 4: Commit**

```bash
git add apps/ethos-clinic/src/application/service.ts
git commit -m "feat(service): generateSessionBilling, getFinancialSummary, calculateDueDate"
```

---

## Task 3: HTTP — endpoint de summary e lógica de billing na conclusão de sessão

**Files:**
- Modify: `apps/ethos-clinic/src/api/httpServer.ts`

- [ ] **Step 1: Importar novas funções no topo do arquivo**

Localizar a linha com `createFinancialEntry` no bloco de imports e adicionar:

```ts
import {
  // ...imports existentes...
  generateSessionBilling,
  getFinancialSummary,
} from "../application/service";
```

- [ ] **Step 2: Modificar o handler `PATCH /sessions/:id/status` para chamar `generateSessionBilling` quando status = "completed"**

Localizar o bloco (linha ~1394):

```ts
const sessionStatus = url.pathname.match(/^\/sessions\/([^/]+)\/status$/);
if (method === "PATCH" && sessionStatus) {
  const body = await readJson(req);
  const status = body.status as SessionStatus;
  if (!["scheduled", "confirmed", "missed", "completed"].includes(status)) {
    return error(res, requestId, 422, "VALIDATION_ERROR", "Invalid status");
  }
  const session = patchSessionStatus(auth.user.id, sessionStatus[1], status);
  if (!session) return error(res, requestId, 404, "NOT_FOUND", "Session not found");
  return ok(res, requestId, 200, session);
}
```

Substituir por:

```ts
const sessionStatus = url.pathname.match(/^\/sessions\/([^/]+)\/status$/);
if (method === "PATCH" && sessionStatus) {
  const body = await readJson(req);
  const status = body.status as SessionStatus;
  if (!["scheduled", "confirmed", "missed", "completed"].includes(status)) {
    return error(res, requestId, 422, "VALIDATION_ERROR", "Invalid status");
  }
  const session = patchSessionStatus(auth.user.id, sessionStatus[1], status);
  if (!session) return error(res, requestId, 404, "NOT_FOUND", "Session not found");

  let billingResult = { pending_billing: false } as ReturnType<typeof generateSessionBilling>;
  if (status === "completed") {
    billingResult = generateSessionBilling(auth.user.id, session);
  }

  return ok(res, requestId, 200, { ...session, ...billingResult });
}
```

- [ ] **Step 3: Adicionar endpoint `GET /financial/summary`**

Localizar o bloco de `GET /financial/entries` (linha ~2146) e adicionar ANTES dele:

```ts
if (method === "GET" && url.pathname === "/financial/summary") {
  if (!requireClinicalAccess(res, requestId, auth.user.role)) return;
  const summary = getFinancialSummary(auth.user.id);
  return ok(res, requestId, 200, summary);
}
```

- [ ] **Step 4: Garantir que `/financial/summary` está na lista de rotas autenticadas**

Localizar o array de rotas autenticadas (onde `/^\/financial/` já está listado — linha ~244). Nada a fazer pois `/financial/summary` já é coberto pela regex `/^\/financial/`.

- [ ] **Step 5: Commit**

```bash
git add apps/ethos-clinic/src/api/httpServer.ts
git commit -m "feat(api): GET /financial/summary + auto billing on session completion"
```

---

## Task 4: billingReminderWorker

**Files:**
- Create: `apps/ethos-clinic/src/application/billingReminderWorker.ts`
- Modify: `apps/ethos-clinic/src/index.ts`

- [ ] **Step 1: Criar o worker**

```ts
// apps/ethos-clinic/src/application/billingReminderWorker.ts
import { db } from "../infra/database";
import { persistMutation } from "../infra/persist";
import { whatsAppGetConnectionState, whatsAppSendText } from "../infra/whatsapp";

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // a cada hora

function buildBillingMessage(values: {
  patient_name: string;
  amount: string;
  due_date: string;
  psychologist_name: string;
}): string {
  return `Olá ${values.patient_name}, lembramos que há uma cobrança de R$ ${values.amount} com vencimento em ${values.due_date}. Em caso de dúvidas, entre em contato com ${values.psychologist_name}.`;
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDueDate(iso: string): string {
  // iso can be "YYYY-MM-DD" or full ISO
  const date = new Date(iso + (iso.length === 10 ? "T12:00:00" : ""));
  return date.toLocaleDateString("pt-BR");
}

async function runBillingReminderCheck() {
  const whatsappCfg = db.whatsappConfig.get("config");
  if (!whatsappCfg?.enabled) return;

  const state = await whatsAppGetConnectionState();
  if (state !== "open") {
    process.stderr.write(`[billing-reminder] WhatsApp not connected (state: ${state}), skipping.\n`);
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find psychologist name
  let psychologistName = "sua psicóloga";
  for (const user of db.users.values()) {
    if (user.role === "admin" || user.role === "user") {
      psychologistName = user.name;
      break;
    }
  }

  for (const entry of db.financial.values()) {
    if (entry.status !== "open") continue;
    if (entry.reminder_sent_at) continue; // já enviou

    const patient = db.patients.get(entry.patient_id);
    if (!patient) continue;

    const reminderDays = patient.billing?.billing_reminder_days;
    if (!reminderDays || reminderDays <= 0) continue;

    const dueDate = new Date(entry.due_date + (entry.due_date.length === 10 ? "T12:00:00" : ""));
    dueDate.setHours(0, 0, 0, 0);
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

    if (daysUntilDue < 0 || daysUntilDue > reminderDays) continue;

    const phone = patient.whatsapp || patient.phone;
    if (!phone) {
      process.stderr.write(`[billing-reminder] Patient ${patient.id} has no phone, skipping.\n`);
      continue;
    }

    const message = buildBillingMessage({
      patient_name: patient.label || patient.external_id || "Paciente",
      amount: formatCurrency(entry.amount),
      due_date: formatDueDate(entry.due_date),
      psychologist_name: psychologistName,
    });

    const result = await whatsAppSendText(phone, message);

    if (result.ok) {
      entry.reminder_sent_at = new Date().toISOString();
      persistMutation();
      process.stdout.write(`[billing-reminder] Sent reminder to patient ${patient.id} for entry ${entry.id}.\n`);
    } else {
      process.stderr.write(`[billing-reminder] Failed to send reminder to patient ${patient.id}: ${result.error}\n`);
    }
  }
}

export function startBillingReminderWorker() {
  void runBillingReminderCheck();
  setInterval(() => { void runBillingReminderCheck(); }, CHECK_INTERVAL_MS);
  process.stdout.write(`[billing-reminder] Worker started. Checking every ${CHECK_INTERVAL_MS / 60000} minutes.\n`);
}
```

- [ ] **Step 2: Registrar em `index.ts`**

```ts
// apps/ethos-clinic/src/index.ts
import { createEthosBackend } from "./server";
import { startNotificationDispatcher } from "./application/notifications";
import { startSessionReminderWorker } from "./application/sessionReminderWorker";
import { startBillingReminderWorker } from "./application/billingReminderWorker";
import { loadFromFile, saveToFile, startAutosave } from "./infra/persist";
import { deduplicateAndRepairSeeds } from "./infra/database";

async function main() {
  await loadFromFile();
  deduplicateAndRepairSeeds();
  startAutosave(30_000);

  const port = Number(process.env.PORT ?? 8787);
  const server = createEthosBackend();
  startNotificationDispatcher();
  startSessionReminderWorker();
  startBillingReminderWorker();

  server.listen(port, "0.0.0.0", () => {
    process.stdout.write(`ETHOS backend listening on ${port}\n`);
  });

  process.on("SIGTERM", () => {
    saveToFile();
    process.exit(0);
  });
}

main().catch((err) => {
  process.stderr.write(`[startup] Fatal error: ${String(err)}\n`);
  process.exit(1);
});
```

- [ ] **Step 3: Commit**

```bash
git add apps/ethos-clinic/src/application/billingReminderWorker.ts apps/ethos-clinic/src/index.ts
git commit -m "feat(worker): billingReminderWorker — WhatsApp reminder before due date"
```

---

## Task 5: Testes de integração

**Files:**
- Create: `apps/ethos-clinic/test/financeiro-inteligente.test.ts`

- [ ] **Step 1: Escrever o arquivo de testes**

```ts
// apps/ethos-clinic/test/financeiro-inteligente.test.ts
import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import test from "node:test";
import { createEthosBackend } from "../src/server";
import { resetDatabaseForTests } from "../src/infra/database";

const req = async (base: string, path: string, method = "GET", body?: unknown, token?: string) => {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await response.json() as any;
  return { status: response.status, json };
};

const setup = async () => {
  resetDatabaseForTests();
  const server = createEthosBackend();
  server.listen(0);
  await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const adminLogin = await req(base, "/auth/login", "POST", { email: "camila@ethos.local", password: "admin123" });
  const adminToken = adminLogin.json.data.token as string;
  const invite = await req(base, "/auth/invite", "POST", { email: "qa-billing@ethos.local" }, adminToken);
  await req(base, "/auth/accept-invite", "POST", { token: invite.json.data.invite_token, name: "QA Billing", password: "qa123456" });
  const login = await req(base, "/auth/login", "POST", { email: "qa-billing@ethos.local", password: "qa123456" });
  const userToken = login.json.data.token as string;

  // Sync entitlements
  await req(base, "/local/entitlements/sync", "POST", {
    snapshot: {
      entitlements: { finance_enabled: true, max_patients: 100 },
      source_subscription_status: "active",
      last_successful_subscription_validation_at: new Date().toISOString(),
    },
  }, userToken);

  return { server, base, userToken };
};

test("financeiro inteligente: auto-charge cria lançamento ao concluir sessão", async () => {
  const { server, base, userToken } = await setup();
  try {
    // Criar paciente com billing_auto_charge = true
    const patient = await req(base, "/patients", "POST", {
      name: "Paciente Auto",
      billing: {
        mode: "per_session",
        session_price: 200,
        payment_timing: "after",
        preferred_payment_day: 10,
        billing_auto_charge: true,
        billing_reminder_days: 2,
      },
    }, userToken);
    assert.equal(patient.status, 201);
    const patientId = patient.json.data.id as string;

    // Criar sessão
    const session = await req(base, "/sessions", "POST", {
      patient_id: patientId,
      scheduled_at: new Date().toISOString(),
    }, userToken);
    assert.equal(session.status, 201);
    const sessionId = session.json.data.id as string;

    // Concluir sessão → deve gerar lançamento automaticamente
    const complete = await req(base, `/sessions/${sessionId}/status`, "PATCH", { status: "completed" }, userToken);
    assert.equal(complete.status, 200);
    assert.equal(complete.json.data.pending_billing, false);

    // Verificar lançamento criado
    const entries = await req(base, "/financial/entries", "GET", undefined, userToken);
    assert.equal(entries.status, 200);
    const created = entries.json.data.find((e: any) => e.session_id === sessionId);
    assert.ok(created, "lançamento deve existir");
    assert.equal(created.amount, 200);
    assert.equal(created.status, "open");
    assert.equal(created.type, "receivable");
  } finally {
    server.close();
  }
});

test("financeiro inteligente: sem auto-charge retorna pending_billing = true", async () => {
  const { server, base, userToken } = await setup();
  try {
    const patient = await req(base, "/patients", "POST", {
      name: "Paciente Manual",
      billing: {
        mode: "per_session",
        session_price: 150,
        payment_timing: "advance",
        billing_auto_charge: false,
      },
    }, userToken);
    assert.equal(patient.status, 201);
    const patientId = patient.json.data.id as string;

    const session = await req(base, "/sessions", "POST", {
      patient_id: patientId,
      scheduled_at: new Date().toISOString(),
    }, userToken);
    const sessionId = session.json.data.id as string;

    const complete = await req(base, `/sessions/${sessionId}/status`, "PATCH", { status: "completed" }, userToken);
    assert.equal(complete.status, 200);
    assert.equal(complete.json.data.pending_billing, true);
    assert.equal(complete.json.data.suggested_amount, 150);
    assert.ok(complete.json.data.suggested_due_date, "deve ter data sugerida");

    // Não deve ter criado lançamento
    const entries = await req(base, "/financial/entries", "GET", undefined, userToken);
    const created = entries.json.data.find((e: any) => e.session_id === sessionId);
    assert.equal(created, undefined, "não deve ter criado lançamento automático");
  } finally {
    server.close();
  }
});

test("financeiro inteligente: sem session_price não retorna pending_billing", async () => {
  const { server, base, userToken } = await setup();
  try {
    const patient = await req(base, "/patients", "POST", { name: "Sem Preço" }, userToken);
    assert.equal(patient.status, 201);
    const patientId = patient.json.data.id as string;

    const session = await req(base, "/sessions", "POST", {
      patient_id: patientId,
      scheduled_at: new Date().toISOString(),
    }, userToken);
    const sessionId = session.json.data.id as string;

    const complete = await req(base, `/sessions/${sessionId}/status`, "PATCH", { status: "completed" }, userToken);
    assert.equal(complete.status, 200);
    assert.equal(complete.json.data.pending_billing, false);
  } finally {
    server.close();
  }
});

test("financeiro inteligente: GET /financial/summary retorna contagens corretas", async () => {
  const { server, base, userToken } = await setup();
  try {
    // Criar lançamento vencido (due_date ontem)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    await req(base, "/financial/entry", "POST", {
      patient_id: "summary-test-patient",
      type: "receivable",
      amount: 300,
      due_date: yesterday,
      status: "open",
      description: "Sessão vencida",
    }, userToken);

    // Criar lançamento a vencer em 3 dias
    const soon = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    await req(base, "/financial/entry", "POST", {
      patient_id: "summary-test-patient",
      type: "receivable",
      amount: 200,
      due_date: soon,
      status: "open",
      description: "Sessão futura",
    }, userToken);

    const summary = await req(base, "/financial/summary", "GET", undefined, userToken);
    assert.equal(summary.status, 200);
    assert.equal(summary.json.data.overdue_count, 1);
    assert.equal(summary.json.data.overdue_total, 300);
    assert.equal(summary.json.data.due_soon_count, 1);
  } finally {
    server.close();
  }
});

test("financeiro inteligente: calculateDueDate — advance usa dia da sessão", async () => {
  const { server, base, userToken } = await setup();
  try {
    const sessionDate = "2026-05-15T10:00:00.000Z";
    const patient = await req(base, "/patients", "POST", {
      name: "Billing Advance",
      billing: { mode: "per_session", session_price: 100, payment_timing: "advance", billing_auto_charge: true },
    }, userToken);
    const patientId = patient.json.data.id as string;

    const session = await req(base, "/sessions", "POST", { patient_id: patientId, scheduled_at: sessionDate }, userToken);
    const sessionId = session.json.data.id as string;

    await req(base, `/sessions/${sessionId}/status`, "PATCH", { status: "completed" }, userToken);

    const entries = await req(base, "/financial/entries", "GET", undefined, userToken);
    const created = entries.json.data.find((e: any) => e.session_id === sessionId);
    assert.ok(created, "lançamento deve existir");
    assert.equal(created.due_date, "2026-05-15");
  } finally {
    server.close();
  }
});
```

- [ ] **Step 2: Rodar os testes**

```bash
cd apps/ethos-clinic
node --test -r ts-node/register/transpile-only test/financeiro-inteligente.test.ts
```

Expected: todos os 5 testes passando.

- [ ] **Step 3: Rodar suite completa para garantir nenhuma regressão**

```bash
npm --workspace ethos-clinic run test
```

Expected: todos os testes passando (34+ anteriores + 5 novos).

- [ ] **Step 4: Commit**

```bash
git add apps/ethos-clinic/test/financeiro-inteligente.test.ts
git commit -m "test: financeiro inteligente — auto-charge, pending_billing, summary"
```

---

## Task 6: Frontend — `financialService.ts` + `BillingConfirmDialog`

**Files:**
- Modify: `Frontend/src/services/financialService.ts` (ou criar se não existir)
- Create: `Frontend/src/components/BillingConfirmDialog.tsx`

- [ ] **Step 1: Verificar se `financialService.ts` existe**

```bash
ls Frontend/src/services/ | grep financial
```

- [ ] **Step 2: Adicionar `getFinancialSummary` ao serviço financeiro**

Se o arquivo existir, adicionar ao final. Se não existir, criar com:

```ts
// Frontend/src/services/financialService.ts
import { apiClient } from "@/lib/apiClient";

export interface FinancialEntry {
  id: string;
  patient_id: string;
  session_id?: string;
  type: "receivable" | "payable";
  amount: number;
  due_date: string;
  status: "open" | "paid";
  description: string;
  payment_method?: string;
  paid_at?: string;
  notes?: string;
  reminder_sent_at?: string;
}

export interface FinancialSummary {
  overdue_count: number;
  overdue_total: number;
  due_soon_count: number;
}

export const getFinancialSummary = async (): Promise<FinancialSummary> => {
  const res = await apiClient.get("/financial/summary");
  return res.data.data as FinancialSummary;
};
```

Se o arquivo já existir, apenas adicionar a interface `FinancialSummary` e a função `getFinancialSummary`.

- [ ] **Step 3: Criar `BillingConfirmDialog.tsx`**

```tsx
// Frontend/src/components/BillingConfirmDialog.tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface BillingConfirmDialogProps {
  open: boolean;
  patientName: string;
  suggestedAmount: number;
  suggestedDueDate: string;
  onConfirm: () => void;
  onDismiss: () => void;
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(iso: string): string {
  const date = new Date(iso + (iso.length === 10 ? "T12:00:00" : ""));
  return date.toLocaleDateString("pt-BR");
}

export function BillingConfirmDialog({
  open,
  patientName,
  suggestedAmount,
  suggestedDueDate,
  onConfirm,
  onDismiss,
}: BillingConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onDismiss(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gerar cobrança?</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2 text-sm text-muted-foreground">
          <p>
            Deseja gerar uma cobrança para <span className="font-medium text-foreground">{patientName}</span>?
          </p>
          <div className="rounded-md border bg-muted/50 p-3 space-y-1">
            <p>
              <span className="text-muted-foreground">Valor: </span>
              <span className="font-semibold text-foreground">{formatCurrency(suggestedAmount)}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Vencimento: </span>
              <span className="font-semibold text-foreground">{formatDate(suggestedDueDate)}</span>
            </p>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onDismiss}>
            Agora não
          </Button>
          <Button onClick={onConfirm}>
            Gerar cobrança
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add Frontend/src/services/financialService.ts Frontend/src/components/BillingConfirmDialog.tsx
git commit -m "feat(frontend): BillingConfirmDialog + getFinancialSummary service"
```

---

## Task 7: FinancePage — alertas de inadimplência

**Files:**
- Modify: `Frontend/src/pages/FinancePage.tsx`

- [ ] **Step 1: Ler o arquivo atual para entender a estrutura**

```bash
head -80 Frontend/src/pages/FinancePage.tsx
```

- [ ] **Step 2: Adicionar estado de summary e fetch inicial**

No topo do componente, adicionar:

```tsx
import { getFinancialSummary, type FinancialSummary } from "@/services/financialService";
import { AlertCircle } from "lucide-react";

// Dentro do componente, junto com os outros estados:
const [summary, setSummary] = useState<FinancialSummary | null>(null);
const [filterOverdue, setFilterOverdue] = useState(false);

// Verificar query param ?filter=overdue ao montar
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get("filter") === "overdue") setFilterOverdue(true);
}, []);

// Fetch summary junto com os dados financeiros
useEffect(() => {
  getFinancialSummary().then(setSummary).catch(console.error);
}, []);
```

- [ ] **Step 3: Adicionar card de alerta de inadimplência no topo da lista**

Localizar onde a lista de lançamentos começa e adicionar o card antes:

```tsx
{summary && summary.overdue_count > 0 && (
  <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm">
    <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
    <div className="flex-1">
      <span className="font-semibold text-destructive">
        {summary.overdue_count} {summary.overdue_count === 1 ? "cobrança vencida" : "cobranças vencidas"}
      </span>
      <span className="text-muted-foreground">
        {" · "}
        {summary.overdue_total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} em aberto
      </span>
    </div>
    <button
      className="text-xs font-medium text-destructive underline-offset-2 hover:underline"
      onClick={() => setFilterOverdue(true)}
    >
      Ver vencidas
    </button>
  </div>
)}
```

- [ ] **Step 4: Adicionar filtro "Vencidos" e badge em cada lançamento vencido**

Localizar os chips de filtro existentes e adicionar:

```tsx
<button
  onClick={() => setFilterOverdue((v) => !v)}
  className={cn(
    "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
    filterOverdue
      ? "bg-destructive text-destructive-foreground border-destructive"
      : "bg-background text-muted-foreground border-border hover:border-foreground",
  )}
>
  Vencidos
</button>
```

Na lógica de filtro dos lançamentos, adicionar:

```ts
const today = new Date();
today.setHours(0, 0, 0, 0);

const isOverdue = (entry: FinancialEntry) =>
  entry.status === "open" && new Date(entry.due_date + "T12:00:00") < today;

// Filtrar a lista:
const filteredEntries = entries
  .filter((e) => !filterOverdue || isOverdue(e))
  // ...outros filtros existentes
```

No card de cada lançamento, adicionar badge quando vencido:

```tsx
{isOverdue(entry) && (
  <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
    Vencido
  </span>
)}
```

- [ ] **Step 5: Commit**

```bash
git add Frontend/src/pages/FinancePage.tsx
git commit -m "feat(finance): overdue alert card, badge, filter"
```

---

## Task 8: HomePage — card de inadimplência

**Files:**
- Modify: `Frontend/src/pages/HomePage.tsx`

- [ ] **Step 1: Adicionar fetch de summary e card de alerta**

Localizar o componente `HomePage`. Adicionar import e estado:

```tsx
import { getFinancialSummary, type FinancialSummary } from "@/services/financialService";
import { AlertCircle } from "lucide-react";

// Dentro do componente:
const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);

useEffect(() => {
  getFinancialSummary().then(setFinancialSummary).catch(console.error);
}, []);
```

- [ ] **Step 2: Adicionar o card na seção de resumo do dashboard**

Inserir após os cards de métricas existentes:

```tsx
{financialSummary && financialSummary.overdue_count > 0 && (
  <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
    <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
    <div className="flex-1">
      <span className="font-semibold text-amber-700 dark:text-amber-300">
        {financialSummary.overdue_count}{" "}
        {financialSummary.overdue_count === 1 ? "paciente com cobrança em atraso" : "pacientes com cobranças em atraso"}
      </span>
      <span className="text-muted-foreground">
        {" · "}
        {financialSummary.overdue_total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
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
```

- [ ] **Step 3: Commit**

```bash
git add Frontend/src/pages/HomePage.tsx
git commit -m "feat(home): overdue billing alert card"
```

---

## Task 9: PatientDetailPage — seção Cobrança

**Files:**
- Modify: `Frontend/src/pages/PatientDetailPage.tsx`

- [ ] **Step 1: Localizar onde os campos de billing existem no PatientDetailPage**

```bash
grep -n "billing\|session_price\|payment_timing" Frontend/src/pages/PatientDetailPage.tsx | head -20
```

- [ ] **Step 2: Adicionar 3 novos campos na seção de cobrança**

Localizar o bloco de campos de billing e adicionar após os campos existentes:

```tsx
{/* Aviso antecipado de vencimento */}
<div className="space-y-1.5">
  <Label htmlFor="billing_reminder_days">Aviso antecipado</Label>
  <Select
    value={String(formData.billing?.billing_reminder_days ?? 0)}
    onValueChange={(v) =>
      setFormData((prev) => ({
        ...prev,
        billing: { ...prev.billing, billing_reminder_days: Number(v) },
      }))
    }
  >
    <SelectTrigger id="billing_reminder_days">
      <SelectValue placeholder="Não enviar" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="0">Não enviar</SelectItem>
      <SelectItem value="1">1 dia antes</SelectItem>
      <SelectItem value="2">2 dias antes</SelectItem>
      <SelectItem value="3">3 dias antes</SelectItem>
      <SelectItem value="7">7 dias antes</SelectItem>
    </SelectContent>
  </Select>
</div>

{/* Geração automática de cobrança */}
<div className="flex items-center justify-between rounded-lg border p-3">
  <div className="space-y-0.5">
    <Label htmlFor="billing_auto_charge" className="text-sm font-medium">
      Gerar cobrança automaticamente
    </Label>
    <p className="text-xs text-muted-foreground">
      Cria o lançamento ao concluir cada sessão
    </p>
  </div>
  <Switch
    id="billing_auto_charge"
    checked={formData.billing?.billing_auto_charge ?? false}
    onCheckedChange={(checked) =>
      setFormData((prev) => ({
        ...prev,
        billing: { ...prev.billing, billing_auto_charge: checked },
      }))
    }
  />
</div>
```

- [ ] **Step 3: Commit**

```bash
git add Frontend/src/pages/PatientDetailPage.tsx
git commit -m "feat(patient): billing config — auto-charge toggle + reminder days"
```

---

## Task 10: Integrar BillingConfirmDialog na conclusão de sessão

**Files:**
- Modify: `Frontend/src/pages/AgendaPage.tsx` (ou onde `PATCH /sessions/:id/status` é chamado)

- [ ] **Step 1: Localizar onde o status da sessão é atualizado para "completed"**

```bash
grep -n "completed\|status.*patch\|patchStatus" Frontend/src/pages/AgendaPage.tsx | head -10
```

- [ ] **Step 2: Adicionar estado e handler para o dialog**

```tsx
import { BillingConfirmDialog } from "@/components/BillingConfirmDialog";
import { apiClient } from "@/lib/apiClient";

// Estado dentro do componente:
const [billingDialog, setBillingDialog] = useState<{
  open: boolean;
  patientName: string;
  suggestedAmount: number;
  suggestedDueDate: string;
  patientId: string;
} | null>(null);
```

- [ ] **Step 3: Modificar a função que muda status para "completed"**

Onde o frontend chama `PATCH /sessions/:id/status`, verificar a resposta:

```tsx
const handleCompleteSession = async (sessionId: string, patientName: string, patientId: string) => {
  const res = await apiClient.patch(`/sessions/${sessionId}/status`, { status: "completed" });
  const data = res.data.data;

  if (data.pending_billing) {
    setBillingDialog({
      open: true,
      patientName,
      suggestedAmount: data.suggested_amount,
      suggestedDueDate: data.suggested_due_date,
      patientId,
    });
  }
  // Refresh das sessões
  await fetchSessions();
};
```

- [ ] **Step 4: Adicionar o dialog no JSX**

```tsx
{billingDialog && (
  <BillingConfirmDialog
    open={billingDialog.open}
    patientName={billingDialog.patientName}
    suggestedAmount={billingDialog.suggestedAmount}
    suggestedDueDate={billingDialog.suggestedDueDate}
    onConfirm={async () => {
      await apiClient.post("/financial/entry", {
        patient_id: billingDialog.patientId,
        type: "receivable",
        amount: billingDialog.suggestedAmount,
        due_date: billingDialog.suggestedDueDate,
        status: "open",
        description: "Sessão clínica",
      });
      setBillingDialog(null);
    }}
    onDismiss={() => setBillingDialog(null)}
  />
)}
```

- [ ] **Step 5: Commit**

```bash
git add Frontend/src/pages/AgendaPage.tsx
git commit -m "feat(agenda): BillingConfirmDialog on session completion"
```

---

## Verificação final

Após todas as tasks, rodar:

```bash
npm --workspace ethos-clinic run test
```

Expected: todos os testes passando.

Checklist manual:
- [ ] Paciente com `billing_auto_charge = true` → concluir sessão → lançamento criado, sem dialog
- [ ] Paciente com `billing_auto_charge = false` e `session_price` → concluir sessão → dialog aparece com valores corretos
- [ ] "Gerar cobrança" no dialog → lançamento criado e aparece na FinancePage
- [ ] Paciente sem `session_price` → concluir sessão → sem dialog, sem lançamento
- [ ] `GET /financial/summary` → retorna contagens corretas
- [ ] FinancePage: card vermelho aparece quando há vencidos; filtro "Vencidos" funciona; badge em cada vencido
- [ ] HomePage: card amarelo aparece com total; link leva para `/financeiro?filter=overdue`
- [ ] PatientDetailPage: salvar configuração de cobrança → reflete na próxima sessão concluída
