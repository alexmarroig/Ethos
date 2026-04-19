# Agenda Inteligente Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar recorrência explícita de sessões, geração rolling automática após cada atendimento, e detecção de padrões de agenda com sugestões para o psicólogo.

**Architecture:** Backend recebe campos de recorrência no `POST /sessions`, gera a próxima sessão automaticamente quando `PATCH /sessions/:id/status → completed`, e expõe `GET /sessions/suggestions` calculando sugestões on-the-fly (sem tabela própria). Frontend adiciona painel lateral de sugestões na `AgendaPage`, novo `SessionDialog` unificado para criar sessões/bloqueios, e badges de recorrência nos cards.

**Tech Stack:** Node.js + TypeScript + in-memory Maps (backend), React + Tailwind + shadcn/ui (frontend).

---

## Mapa de arquivos

| Arquivo | Ação | Responsabilidade |
|---------|------|-----------------|
| `apps/ethos-clinic/src/domain/types.ts` | Modificar | Adicionar `RecurrenceRule`, `CalendarSuggestion`, campos em `ClinicalSession` |
| `apps/ethos-clinic/src/application/service.ts` | Modificar | `generateNextSession()`, `detectPatterns()`, `listSuggestions()` |
| `apps/ethos-clinic/src/api/httpServer.ts` | Modificar | Aceitar campos de recorrência em `POST /sessions`, rolling em `PATCH /:id/status`, `GET /sessions/suggestions` |
| `apps/ethos-clinic/test/agenda-inteligente.test.ts` | Criar | Testes de integração |
| `Frontend/src/services/sessionService.ts` | Modificar | Adicionar `getSuggestions(weekStart)`, campos de recorrência em `create` |
| `Frontend/src/components/SessionDialog.tsx` | Criar | Dialog unificado para sessão/bloqueio com opções de recorrência |
| `Frontend/src/pages/AgendaPage.tsx` | Modificar | Painel de sugestões lateral, badges de recorrência, bloqueios |

---

## Task 1: Tipos — RecurrenceRule, CalendarSuggestion, campos em ClinicalSession

**Files:**
- Modify: `apps/ethos-clinic/src/domain/types.ts`

- [ ] **Step 1: Adicionar `RecurrenceRule` e novos campos em `ClinicalSession`**

Localizar `ClinicalSession` (linha ~132) e adicionar ANTES dela o novo tipo `RecurrenceRule`, e expandir `ClinicalSession`:

```ts
export type RecurrenceRule = {
  type: "weekly" | "2x-week" | "biweekly";
  days: Array<"monday" | "tuesday" | "wednesday" | "thursday" | "friday">;
  time: string;           // "HH:MM"
  duration_minutes: number;
};

export type ClinicalSession = Owned & {
  patient_id: string;
  scheduled_at: string;
  status: SessionStatus;
  duration_minutes?: number;
  // Recurrence fields
  recurrence?: RecurrenceRule;
  series_id?: string;
  is_series_anchor?: boolean;
  event_type?: "session" | "block" | "other";
  block_title?: string;
};
```

- [ ] **Step 2: Adicionar `CalendarSuggestion` após `ClinicalSession`**

```ts
export type CalendarSuggestion = {
  patient_id: string;
  patient_name: string;
  suggested_at: string;       // ISO datetime da próxima sessão sugerida
  duration_minutes: number;
  source: "rule" | "pattern"; // rule = série configurada, pattern = detectado
  confidence?: number;        // 0–100, presente quando source = "pattern"
  series_id?: string;         // presente quando source = "rule"
  recurrence_type?: string;   // descritivo para exibição
};
```

- [ ] **Step 3: Commit**

```bash
git add apps/ethos-clinic/src/domain/types.ts
git commit -m "feat(types): RecurrenceRule, CalendarSuggestion, recurrence fields on ClinicalSession"
```

---

## Task 2: Service — generateNextSession, detectPatterns, listSuggestions

**Files:**
- Modify: `apps/ethos-clinic/src/application/service.ts`

- [ ] **Step 1: Adicionar helper `addDays` e `nextOccurrence` no topo da seção de utils (após os helpers de datas existentes)**

```ts
const addDays = (iso: string, days: number): string => {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
};

const dayOfWeekName = (iso: string): "monday" | "tuesday" | "wednesday" | "thursday" | "friday" => {
  const names = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return names[new Date(iso).getDay()] as any;
};

const timeOfDay = (iso: string): string => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const modeOf = <T>(arr: T[]): T | undefined => {
  if (!arr.length) return undefined;
  const counts = new Map<string, number>();
  for (const v of arr) {
    const key = String(v);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let best: T | undefined;
  let bestCount = 0;
  for (const [key, count] of counts) {
    if (count > bestCount) {
      bestCount = count;
      best = arr.find((v) => String(v) === key);
    }
  }
  return best;
};
```

- [ ] **Step 2: Adicionar `generateNextSession` ao final do arquivo**

```ts
// Gera a próxima sessão de uma série quando a atual é concluída.
// Chamado internamente por patchSessionStatus.
export const generateNextSession = (owner: string, completedSession: ClinicalSession): ClinicalSession | null => {
  if (!completedSession.recurrence || !completedSession.series_id) return null;

  const rule = completedSession.recurrence;

  // Verificar se já existe sessão futura com mesmo series_id
  const existingFuture = Array.from(db.sessions.values()).find(
    (s) =>
      s.owner_user_id === owner &&
      s.series_id === completedSession.series_id &&
      s.id !== completedSession.id &&
      new Date(s.scheduled_at) > new Date(),
  );
  if (existingFuture) return null;

  // Calcular próximo scheduled_at
  const currentDate = new Date(completedSession.scheduled_at);
  let nextDate: Date;

  if (rule.type === "weekly") {
    nextDate = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  } else if (rule.type === "biweekly") {
    nextDate = new Date(currentDate.getTime() + 14 * 24 * 60 * 60 * 1000);
  } else {
    // 2x-week: next day in rule.days after currentDate's day
    const dayOrder = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const currentDayIdx = currentDate.getDay();
    const ruleDayIdxes = rule.days.map((d) => dayOrder.indexOf(d)).sort((a, b) => a - b);
    const nextIdx = ruleDayIdxes.find((idx) => idx > currentDayIdx) ?? ruleDayIdxes[0];
    const diff = nextIdx > currentDayIdx ? nextIdx - currentDayIdx : 7 - currentDayIdx + nextIdx;
    nextDate = new Date(currentDate.getTime() + diff * 24 * 60 * 60 * 1000);
  }

  // Apply the rule's fixed time
  const [hours, minutes] = rule.time.split(":").map(Number);
  nextDate.setHours(hours, minutes, 0, 0);

  const next: ClinicalSession = {
    id: uid(),
    owner_user_id: owner,
    patient_id: completedSession.patient_id,
    scheduled_at: nextDate.toISOString(),
    status: "scheduled",
    duration_minutes: rule.duration_minutes,
    recurrence: rule,
    series_id: completedSession.series_id,
    is_series_anchor: false,
    event_type: "session",
    created_at: now(),
  };

  db.sessions.set(next.id, next);
  persistMutation();
  return next;
};
```

- [ ] **Step 3: Adicionar `listSuggestions` ao final do arquivo**

```ts
export const listSuggestions = (owner: string, weekStart: string): CalendarSuggestion[] => {
  const start = new Date(weekStart);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

  const suggestions: CalendarSuggestion[] = [];

  // --- Source "rule": sessões com recorrência configurada ---
  // Agrupa por series_id para pegar configuração
  const seriesMap = new Map<string, ClinicalSession>();
  for (const s of db.sessions.values()) {
    if (s.owner_user_id !== owner) continue;
    if (!s.recurrence || !s.series_id) continue;
    if (!seriesMap.has(s.series_id) || new Date(s.scheduled_at) > new Date(seriesMap.get(s.series_id)!.scheduled_at)) {
      seriesMap.set(s.series_id, s);
    }
  }

  for (const [seriesId, anchor] of seriesMap) {
    const rule = anchor.recurrence!;

    // Verificar se já existe sessão confirmada nessa semana para a série
    const alreadyThisWeek = Array.from(db.sessions.values()).some(
      (s) =>
        s.owner_user_id === owner &&
        s.series_id === seriesId &&
        new Date(s.scheduled_at) >= start &&
        new Date(s.scheduled_at) < end,
    );
    if (alreadyThisWeek) continue;

    // Calcular quando seria a próxima ocorrência dentro da semana
    const dayOrder = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const targetDays = rule.days.map((d) => dayOrder.indexOf(d));
    const [hours, minutes] = rule.time.split(":").map(Number);

    for (const dayIdx of targetDays) {
      // Find the date in [start, end) with this weekday
      const candidate = new Date(start);
      while (candidate.getDay() !== dayIdx && candidate < end) {
        candidate.setDate(candidate.getDate() + 1);
      }
      if (candidate >= end) continue;
      candidate.setHours(hours, minutes, 0, 0);

      const patient = db.patients.get(anchor.patient_id);
      const recurrenceLabel = rule.type === "weekly" ? "semanal" : rule.type === "biweekly" ? "quinzenal" : "2× semana";

      suggestions.push({
        patient_id: anchor.patient_id,
        patient_name: patient?.label ?? anchor.patient_id,
        suggested_at: candidate.toISOString(),
        duration_minutes: rule.duration_minutes,
        source: "rule",
        series_id: seriesId,
        recurrence_type: recurrenceLabel,
      });
    }
  }

  // --- Source "pattern": pacientes SEM recorrência explícita ---
  const patientSessions = new Map<string, ClinicalSession[]>();
  for (const s of db.sessions.values()) {
    if (s.owner_user_id !== owner) continue;
    if (s.recurrence) continue; // já tem série
    if (s.status !== "completed") continue;
    if (!s.patient_id) continue;
    const list = patientSessions.get(s.patient_id) ?? [];
    list.push(s);
    patientSessions.set(s.patient_id, list);
  }

  for (const [patientId, sessions] of patientSessions) {
    const sorted = sessions.sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()).slice(0, 12);
    if (sorted.length < 3) continue;

    // Calcular intervalos
    const intervals: number[] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      const diff = Math.round((new Date(sorted[i + 1].scheduled_at).getTime() - new Date(sorted[i].scheduled_at).getTime()) / (24 * 60 * 60 * 1000));
      intervals.push(Math.abs(diff));
    }
    const intervalModal = modeOf(intervals);
    if (!intervalModal) continue;

    const days = sorted.map((s) => dayOfWeekName(s.scheduled_at));
    const dayModal = modeOf(days);
    if (!dayModal) continue;

    const times = sorted.map((s) => timeOfDay(s.scheduled_at));
    const timeModal = modeOf(times);
    if (!timeModal) continue;

    const matching = sorted.filter(
      (s) => dayOfWeekName(s.scheduled_at) === dayModal && timeOfDay(s.scheduled_at) === timeModal,
    );
    const confidence = Math.round((matching.length / sorted.length) * 100);
    if (confidence < 70) continue;

    // Verificar se já existe sessão desta semana para este paciente
    const alreadyThisWeek = Array.from(db.sessions.values()).some(
      (s) =>
        s.owner_user_id === owner &&
        s.patient_id === patientId &&
        !s.recurrence &&
        new Date(s.scheduled_at) >= start &&
        new Date(s.scheduled_at) < end,
    );
    if (alreadyThisWeek) continue;

    // Calcular data sugerida dentro da semana alvo
    const dayOrder = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const targetDayIdx = dayOrder.indexOf(dayModal);
    const candidate = new Date(start);
    while (candidate.getDay() !== targetDayIdx && candidate < end) {
      candidate.setDate(candidate.getDate() + 1);
    }
    if (candidate >= end) continue;

    const [hours, minutes] = timeModal.split(":").map(Number);
    candidate.setHours(hours, minutes, 0, 0);

    const patient = db.patients.get(patientId);
    suggestions.push({
      patient_id: patientId,
      patient_name: patient?.label ?? patientId,
      suggested_at: candidate.toISOString(),
      duration_minutes: sorted[0].duration_minutes ?? 50,
      source: "pattern",
      confidence,
    });
  }

  return suggestions;
};
```

- [ ] **Step 4: Commit**

```bash
git add apps/ethos-clinic/src/application/service.ts
git commit -m "feat(service): generateNextSession, listSuggestions with rule+pattern detection"
```

---

## Task 3: HTTP — campos de recorrência em POST /sessions, rolling em PATCH, GET /sessions/suggestions

**Files:**
- Modify: `apps/ethos-clinic/src/api/httpServer.ts`

- [ ] **Step 1: Importar novas funções**

Adicionar `generateNextSession` e `listSuggestions` ao import de `"../application/service"`.

- [ ] **Step 2: Atualizar `POST /sessions` para aceitar campos de recorrência**

Localizar o handler (linha ~1345). Substituir:

```ts
const session = createSession(
  auth.user.id,
  body.patient_id,
  body.scheduled_at,
  typeof body.duration_minutes === "number" ? body.duration_minutes : undefined,
);
```

Por:

```ts
// Parse recurrence
let recurrence: RecurrenceRule | undefined;
if (body.recurrence && typeof body.recurrence === "object") {
  const r = body.recurrence as any;
  if (["weekly", "2x-week", "biweekly"].includes(r.type) && Array.isArray(r.days) && typeof r.time === "string") {
    recurrence = {
      type: r.type,
      days: r.days,
      time: r.time,
      duration_minutes: typeof r.duration_minutes === "number" ? r.duration_minutes : (typeof body.duration_minutes === "number" ? body.duration_minutes : 50),
    };
  }
}

const session = createSession(
  auth.user.id,
  body.patient_id,
  body.scheduled_at,
  typeof body.duration_minutes === "number" ? body.duration_minutes : undefined,
);

// Apply recurrence and block fields
if (recurrence) {
  session.recurrence = recurrence;
  session.series_id = uid();
  session.is_series_anchor = true;
}
if (body.event_type === "block" || body.event_type === "other") {
  session.event_type = body.event_type;
  if (typeof body.block_title === "string" && body.block_title.trim()) {
    session.block_title = body.block_title.trim();
  }
} else {
  session.event_type = "session";
}
persistMutation();
```

Add import for `RecurrenceRule` at top of file (from domain/types).

- [ ] **Step 3: Atualizar `PATCH /sessions/:id/status` para chamar `generateNextSession`**

Localizar o bloco que já foi modificado para billing (usa `generateSessionBilling`). Após `billingResult`, adicionar:

```ts
if (status === "completed") {
  generateNextSession(auth.user.id, session);
}
```

O `generateNextSession` é idempotente (verifica se já existe sessão futura antes de criar).

- [ ] **Step 4: Adicionar `GET /sessions/suggestions`**

Adicionar ANTES de `GET /sessions` (linha ~1374):

```ts
if (method === "GET" && url.pathname === "/sessions/suggestions") {
  const weekStart = url.searchParams.get("week_start");
  if (!weekStart) return error(res, requestId, 422, "VALIDATION_ERROR", "week_start required");
  const suggestions = listSuggestions(auth.user.id, weekStart);
  return ok(res, requestId, 200, suggestions);
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/ethos-clinic/src/api/httpServer.ts
git commit -m "feat(api): recurrence on POST /sessions, rolling generation, GET /sessions/suggestions"
```

---

## Task 4: Testes de integração

**Files:**
- Create: `apps/ethos-clinic/test/agenda-inteligente.test.ts`

- [ ] **Step 1: Criar arquivo de testes**

```ts
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
  const login = await req(base, "/auth/login", "POST", { email: "camila@ethos.local", password: "admin123" });
  const userToken = login.json.data.token as string;
  await req(base, "/local/entitlements/sync", "POST", {
    snapshot: {
      entitlements: { max_sessions_per_month: 500, max_patients: 100 },
      source_subscription_status: "active",
      last_successful_subscription_validation_at: new Date().toISOString(),
    },
  }, userToken);
  return { server, base, userToken };
};

test("agenda: criar sessão recorrente semanal salva recurrence e series_id", async () => {
  const { server, base, userToken } = await setup();
  try {
    const res = await req(base, "/sessions", "POST", {
      patient_id: "pt-recurrence-1",
      scheduled_at: "2026-05-06T09:00:00.000Z", // Tuesday
      duration_minutes: 50,
      recurrence: { type: "weekly", days: ["tuesday"], time: "09:00", duration_minutes: 50 },
    }, userToken);
    assert.equal(res.status, 201);
    const session = res.json.data;
    assert.ok(session.recurrence, "deve ter recurrence");
    assert.equal(session.recurrence.type, "weekly");
    assert.ok(session.series_id, "deve ter series_id");
    assert.equal(session.is_series_anchor, true);
    assert.equal(session.event_type, "session");
  } finally { server.close(); }
});

test("agenda: concluir sessão recorrente gera próxima automaticamente", async () => {
  const { server, base, userToken } = await setup();
  try {
    const create = await req(base, "/sessions", "POST", {
      patient_id: "pt-rolling-1",
      scheduled_at: "2026-05-06T09:00:00.000Z",
      duration_minutes: 50,
      recurrence: { type: "weekly", days: ["tuesday"], time: "09:00", duration_minutes: 50 },
    }, userToken);
    assert.equal(create.status, 201);
    const sessionId = create.json.data.id as string;
    const seriesId = create.json.data.series_id as string;

    // Concluir sessão
    const complete = await req(base, `/sessions/${sessionId}/status`, "PATCH", { status: "completed" }, userToken);
    assert.equal(complete.status, 200);

    // Verificar que próxima sessão foi criada
    const list = await req(base, "/sessions?page=1&page_size=50", "GET", undefined, userToken);
    const sessions = list.json.data.items as any[];
    const next = sessions.find((s: any) => s.series_id === seriesId && s.id !== sessionId);
    assert.ok(next, "próxima sessão deve existir");
    assert.equal(next.status, "scheduled");
    // Deve ser 7 dias depois
    const origDate = new Date("2026-05-06T09:00:00.000Z");
    const nextDate = new Date(next.scheduled_at);
    const diffDays = Math.round((nextDate.getTime() - origDate.getTime()) / (24 * 60 * 60 * 1000));
    assert.equal(diffDays, 7, "deve ser exatamente 7 dias depois");
  } finally { server.close(); }
});

test("agenda: concluir sessão recorrente não gera duplicata se próxima já existe", async () => {
  const { server, base, userToken } = await setup();
  try {
    const create = await req(base, "/sessions", "POST", {
      patient_id: "pt-nodup-1",
      scheduled_at: "2026-05-06T09:00:00.000Z",
      duration_minutes: 50,
      recurrence: { type: "weekly", days: ["tuesday"], time: "09:00", duration_minutes: 50 },
    }, userToken);
    const sessionId = create.json.data.id as string;
    const seriesId = create.json.data.series_id as string;

    // Concluir duas vezes
    await req(base, `/sessions/${sessionId}/status`, "PATCH", { status: "completed" }, userToken);
    await req(base, `/sessions/${sessionId}/status`, "PATCH", { status: "completed" }, userToken);

    const list = await req(base, "/sessions?page=1&page_size=50", "GET", undefined, userToken);
    const sessions = (list.json.data.items as any[]).filter((s: any) => s.series_id === seriesId && s.id !== sessionId);
    assert.equal(sessions.length, 1, "deve ter apenas uma próxima sessão");
  } finally { server.close(); }
});

test("agenda: criar bloqueio salva event_type=block e block_title", async () => {
  const { server, base, userToken } = await setup();
  try {
    const res = await req(base, "/sessions", "POST", {
      patient_id: "block-patient",
      scheduled_at: "2026-05-06T12:00:00.000Z",
      duration_minutes: 60,
      event_type: "block",
      block_title: "Almoço",
    }, userToken);
    assert.equal(res.status, 201);
    assert.equal(res.json.data.event_type, "block");
    assert.equal(res.json.data.block_title, "Almoço");
  } finally { server.close(); }
});

test("agenda: GET /sessions/suggestions retorna sugestões de série configurada", async () => {
  const { server, base, userToken } = await setup();
  try {
    // Criar série semanal para um paciente
    const create = await req(base, "/sessions", "POST", {
      patient_id: "pt-suggest-1",
      scheduled_at: "2026-04-29T09:00:00.000Z", // Tuesday one week before
      duration_minutes: 50,
      recurrence: { type: "weekly", days: ["tuesday"], time: "09:00", duration_minutes: 50 },
    }, userToken);
    assert.equal(create.status, 201);

    // Pedir sugestões para a semana de 05/05/2026 (Monday) — deve sugerir terça 06/05
    const suggestions = await req(base, "/sessions/suggestions?week_start=2026-05-04", "GET", undefined, userToken);
    assert.equal(suggestions.status, 200);
    const list = suggestions.json.data as any[];
    assert.ok(list.length > 0, "deve ter pelo menos uma sugestão");
    const s = list[0];
    assert.equal(s.source, "rule");
    assert.ok(s.suggested_at.startsWith("2026-05-05") || s.suggested_at.startsWith("2026-05-06"), "sugestão deve cair na semana certa");
  } finally { server.close(); }
});
```

- [ ] **Step 2: Rodar os testes**

```bash
cd apps/ethos-clinic
node --test -r ts-node/register/transpile-only test/agenda-inteligente.test.ts
```

Expected: 5/5 passando.

- [ ] **Step 3: Rodar suite completa**

```bash
npm --workspace ethos-clinic run test
```

Expected: todos passando, sem regressões.

- [ ] **Step 4: Commit**

```bash
git add apps/ethos-clinic/test/agenda-inteligente.test.ts
git commit -m "test: agenda inteligente — recorrência, rolling generation, sugestões"
```

---

## Task 5: sessionService — getSuggestions e campos de recorrência em create

**Files:**
- Modify: `Frontend/src/services/sessionService.ts`

- [ ] **Step 1: Adicionar tipos e interface de CalendarSuggestion**

No topo do arquivo, adicionar:

```ts
export interface RecurrenceRule {
  type: "weekly" | "2x-week" | "biweekly";
  days: Array<"monday" | "tuesday" | "wednesday" | "thursday" | "friday">;
  time: string; // "HH:MM"
  duration_minutes: number;
}

export interface CalendarSuggestion {
  patient_id: string;
  patient_name: string;
  suggested_at: string;
  duration_minutes: number;
  source: "rule" | "pattern";
  confidence?: number;
  series_id?: string;
  recurrence_type?: string;
}
```

- [ ] **Step 2: Atualizar `Session` interface e `RawSession` para incluir campos de recorrência**

Em `RawSession`, adicionar:
```ts
recurrence?: RecurrenceRule;
series_id?: string;
is_series_anchor?: boolean;
event_type?: "session" | "block" | "other";
block_title?: string;
```

Em `Session`, adicionar:
```ts
recurrence?: RecurrenceRule;
series_id?: string;
is_series_anchor?: boolean;
event_type?: "session" | "block" | "other";
block_title?: string;
```

Em `mapSession`, adicionar após `payment_status`:
```ts
recurrence: raw.recurrence,
series_id: raw.series_id,
is_series_anchor: raw.is_series_anchor,
event_type: raw.event_type,
block_title: raw.block_title,
```

- [ ] **Step 3: Atualizar `sessionService.create` para aceitar recorrência**

```ts
create: async (data: {
  patient_id: string;
  scheduled_at: string;
  duration_minutes?: number;
  recurrence?: RecurrenceRule;
  event_type?: "session" | "block" | "other";
  block_title?: string;
}): Promise<ApiResult<Session>> => {
  const [createResult, patients] = await Promise.all([
    api.post<RawSession>("/sessions", data),
    loadPatientsIndex(),
  ]);
  if (!createResult.success) return createResult;
  return { ...createResult, data: mapSession(createResult.data, patients) };
},
```

- [ ] **Step 4: Adicionar `getSuggestions` ao objeto `sessionService`**

```ts
getSuggestions: async (weekStart: string): Promise<ApiResult<CalendarSuggestion[]>> => {
  return api.get<CalendarSuggestion[]>(`/sessions/suggestions?week_start=${weekStart}`);
},
```

- [ ] **Step 5: Commit**

```bash
git add Frontend/src/services/sessionService.ts
git commit -m "feat(service): getSuggestions, recurrence fields in Session + create"
```

---

## Task 6: SessionDialog — componente unificado de criação de sessão/bloqueio

**Files:**
- Create: `Frontend/src/components/SessionDialog.tsx`

- [ ] **Step 1: Criar o componente**

```tsx
// Frontend/src/components/SessionDialog.tsx
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { sessionService, type RecurrenceRule } from "@/services/sessionService";

interface Patient {
  id: string;
  name: string;
}

interface SessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patients: Patient[];
  defaultDate?: string; // "YYYY-MM-DD"
  defaultTime?: string; // "HH:MM"
  onCreated: () => void;
}

type EventType = "session" | "block" | "other";
type RecurrenceType = "weekly" | "2x-week" | "biweekly";
type DayName = "monday" | "tuesday" | "wednesday" | "thursday" | "friday";

const DAY_LABELS: Record<DayName, string> = {
  monday: "Seg",
  tuesday: "Ter",
  wednesday: "Qua",
  thursday: "Qui",
  friday: "Sex",
};

const ALL_DAYS: DayName[] = ["monday", "tuesday", "wednesday", "thursday", "friday"];

function recurrenceSummary(type: RecurrenceType, days: DayName[], time: string): string {
  const dayLabel = days.map((d) => DAY_LABELS[d]).join(" e ");
  if (type === "weekly") return `Toda ${dayLabel} às ${time}`;
  if (type === "biweekly") return `A cada 2 semanas, ${dayLabel} às ${time}`;
  return `2× semana, ${dayLabel} às ${time}`;
}

export function SessionDialog({ open, onOpenChange, patients, defaultDate, defaultTime, onCreated }: SessionDialogProps) {
  const [eventType, setEventType] = useState<EventType>("session");
  const [patientId, setPatientId] = useState("");
  const [date, setDate] = useState(defaultDate ?? "");
  const [time, setTime] = useState(defaultTime ?? "");
  const [duration, setDuration] = useState(50);
  const [recurring, setRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>("weekly");
  const [selectedDays, setSelectedDays] = useState<DayName[]>(["monday"]);
  const [blockTitle, setBlockTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleDay = (day: DayName) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const handleSubmit = async () => {
    setError(null);
    if (!date || !time) { setError("Data e horário são obrigatórios"); return; }
    if (eventType === "session" && !patientId) { setError("Selecione um paciente"); return; }
    if (eventType === "block" && !blockTitle.trim()) { setError("Título do bloqueio é obrigatório"); return; }
    if (eventType !== "session" && recurring) { setRecurring(false); }

    const scheduledAt = new Date(`${date}T${time}:00`).toISOString();

    let recurrence: RecurrenceRule | undefined;
    if (eventType === "session" && recurring) {
      recurrence = {
        type: recurrenceType,
        days: recurrenceType === "2x-week" ? selectedDays.slice(0, 2) : [selectedDays[0]],
        time,
        duration_minutes: duration,
      };
    }

    setLoading(true);
    try {
      const result = await sessionService.create({
        patient_id: eventType === "session" ? patientId : `block-${Date.now()}`,
        scheduled_at: scheduledAt,
        duration_minutes: duration,
        recurrence,
        event_type: eventType,
        block_title: eventType === "block" ? blockTitle.trim() : undefined,
      });
      if (!result.success) {
        setError("Erro ao criar. Tente novamente.");
        return;
      }
      onCreated();
      onOpenChange(false);
      // Reset
      setPatientId(""); setDate(defaultDate ?? ""); setTime(defaultTime ?? "");
      setRecurring(false); setBlockTitle(""); setEventType("session");
    } finally {
      setLoading(false);
    }
  };

  const submitLabel =
    eventType === "block" ? "Salvar bloqueio" :
    recurring ? "Iniciar série recorrente" : "Agendar sessão";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova entrada na agenda</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Tipo de evento */}
          <div className="flex gap-2">
            {(["session", "block", "other"] as EventType[]).map((t) => (
              <button
                key={t}
                onClick={() => setEventType(t)}
                className={cn(
                  "flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                  eventType === t
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-foreground",
                )}
              >
                {t === "session" ? "🧠 Sessão" : t === "block" ? "⊘ Bloqueio" : "📋 Outro"}
              </button>
            ))}
          </div>

          {/* Paciente (só sessão clínica) */}
          {eventType === "session" && (
            <div className="space-y-1.5">
              <Label>Paciente</Label>
              <Select value={patientId} onValueChange={setPatientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar paciente..." />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Título (bloqueio) */}
          {eventType === "block" && (
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input
                value={blockTitle}
                onChange={(e) => setBlockTitle(e.target.value)}
                placeholder="Ex: Almoço, Reunião..."
              />
            </div>
          )}

          {/* Data + Horário */}
          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <Label>Data</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="w-28 space-y-1.5">
              <Label>Horário</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div className="w-24 space-y-1.5">
              <Label>Duração (min)</Label>
              <Input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                min={15}
                step={5}
              />
            </div>
          </div>

          {/* Recorrência (só sessão clínica) */}
          {eventType === "session" && (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Sessão recorrente</p>
                <p className="text-xs text-muted-foreground">Próxima gerada automaticamente</p>
              </div>
              <Switch checked={recurring} onCheckedChange={setRecurring} />
            </div>
          )}

          {eventType === "session" && recurring && (
            <div className="space-y-3 rounded-lg border p-3">
              {/* Tipo de recorrência */}
              <div className="flex gap-2">
                {(["weekly", "2x-week", "biweekly"] as RecurrenceType[]).map((rt) => (
                  <button
                    key={rt}
                    onClick={() => setRecurrenceType(rt)}
                    className={cn(
                      "flex-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors",
                      recurrenceType === rt
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:border-foreground",
                    )}
                  >
                    {rt === "weekly" ? "Semanal" : rt === "2x-week" ? "2× semana" : "Quinzenal"}
                  </button>
                ))}
              </div>

              {/* Seleção de dias (2x-week mostra múltiplos) */}
              <div className="flex gap-1.5">
                {ALL_DAYS.map((day) => (
                  <button
                    key={day}
                    onClick={() => {
                      if (recurrenceType === "2x-week") toggleDay(day);
                      else setSelectedDays([day]);
                    }}
                    className={cn(
                      "flex-1 rounded-md border py-1 text-xs font-medium transition-colors",
                      selectedDays.includes(day)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:border-foreground",
                    )}
                  >
                    {DAY_LABELS[day]}
                  </button>
                ))}
              </div>

              {/* Resumo */}
              {selectedDays.length > 0 && time && (
                <p className="text-xs text-muted-foreground">
                  {recurrenceSummary(recurrenceType, selectedDays, time)}
                </p>
              )}
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Salvando..." : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add Frontend/src/components/SessionDialog.tsx
git commit -m "feat(frontend): SessionDialog — unified session/block creation with recurrence"
```

---

## Task 7: AgendaPage — painel de sugestões, badges de recorrência, SessionDialog

**Files:**
- Modify: `Frontend/src/pages/AgendaPage.tsx`

- [ ] **Step 1: Ler `AgendaPage.tsx` completamente antes de editar**

```bash
cat Frontend/src/pages/AgendaPage.tsx
```

- [ ] **Step 2: Adicionar imports e estado de sugestões**

Adicionar imports no topo:
```tsx
import { SessionDialog } from "@/components/SessionDialog";
import type { CalendarSuggestion } from "@/services/sessionService";
import { RefreshCw, Sparkles, X } from "lucide-react";
```

Adicionar estados:
```tsx
const [suggestions, setSuggestions] = useState<CalendarSuggestion[]>([]);
const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
const [sessionDialogDefaults, setSessionDialogDefaults] = useState<{ date?: string; time?: string }>({});
```

- [ ] **Step 3: Carregar sugestões da próxima semana junto com as sessões**

Localizar o `useEffect` que carrega sessões. Adicionar chamada paralela:

```tsx
// Calcular week_start da próxima semana (Monday)
const nextMonday = new Date();
const dayOfWeek = nextMonday.getDay();
const daysUntilNextMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
nextMonday.setDate(nextMonday.getDate() + daysUntilNextMonday);
const weekStart = nextMonday.toISOString().split("T")[0];

sessionService.getSuggestions(weekStart).then((result) => {
  if (result.success) setSuggestions(result.data);
}).catch(console.error);
```

- [ ] **Step 4: Substituir o botão "Nova sessão" existente para abrir `SessionDialog`**

Localizar onde o dialog de criação de sessão é chamado atualmente. Substituir pelo `SessionDialog`:

```tsx
<SessionDialog
  open={sessionDialogOpen}
  onOpenChange={setSessionDialogOpen}
  patients={patients.map((p) => ({ id: p.id, name: p.patient_name ?? p.id }))}
  defaultDate={sessionDialogDefaults.date}
  defaultTime={sessionDialogDefaults.time}
  onCreated={() => {
    fetchSessions(); // ou a função que recarrega sessões
    setSuggestions((prev) => prev); // trigger re-render
  }}
/>
```

O botão "Nova sessão" existente deve chamar `setSessionDialogOpen(true)`.

- [ ] **Step 5: Adicionar painel de sugestões lateral**

Localizar o container principal do grid (provavelmente um `div` com `flex` ou `grid`). Adicionar o painel de sugestões À DIREITA do grid como coluna fixa:

```tsx
{/* Sugestões — painel lateral */}
{suggestions.filter((s) => !dismissedSuggestions.has(s.patient_id + s.suggested_at)).length > 0 && (
  <div className="w-60 shrink-0 space-y-3">
    <div className="flex items-center gap-2 text-sm font-semibold">
      <Sparkles className="h-4 w-4 text-primary" />
      <span>Próxima semana</span>
      <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
        {suggestions.filter((s) => !dismissedSuggestions.has(s.patient_id + s.suggested_at)).length}
      </span>
    </div>

    {suggestions
      .filter((s) => !dismissedSuggestions.has(s.patient_id + s.suggested_at))
      .map((s) => (
        <div
          key={`${s.patient_id}-${s.suggested_at}`}
          className={cn(
            "rounded-lg border p-3 text-sm space-y-2",
            s.source === "rule"
              ? "border-l-4 border-l-teal-500 bg-teal-50 dark:bg-teal-950/30"
              : "border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-950/30",
          )}
        >
          <div className="flex items-start justify-between gap-1">
            <div>
              <p className="font-medium">{s.patient_name}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(s.suggested_at).toLocaleString("pt-BR", {
                  weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                })}
              </p>
              {s.source === "pattern" && s.confidence !== undefined && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  detectado · {s.confidence}% confiança
                </p>
              )}
              {s.recurrence_type && (
                <p className="text-xs text-teal-600 dark:text-teal-400">{s.recurrence_type}</p>
              )}
            </div>
            <button
              onClick={() =>
                setDismissedSuggestions((prev) => new Set([...prev, s.patient_id + s.suggested_at]))
              }
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <Button
            size="sm"
            className="w-full h-7 text-xs"
            onClick={async () => {
              const d = new Date(s.suggested_at);
              await sessionService.create({
                patient_id: s.patient_id,
                scheduled_at: s.suggested_at,
                duration_minutes: s.duration_minutes,
                series_id: s.series_id,
              } as any);
              setDismissedSuggestions((prev) => new Set([...prev, s.patient_id + s.suggested_at]));
              fetchSessions();
            }}
          >
            Confirmar
          </Button>
        </div>
      ))}
  </div>
)}
```

- [ ] **Step 6: Adicionar badge 🔁 nos cards de sessões recorrentes**

Localizar onde os cards de sessão são renderizados no grid (buscar por `session.status` ou onde o nome do paciente aparece). Adicionar badge:

```tsx
{session.recurrence && (
  <span className="text-xs opacity-70">
    🔁 {session.recurrence.type === "weekly" ? "semanal" : session.recurrence.type === "biweekly" ? "quinzenal" : "2×sem"}
  </span>
)}
```

Adicionar estilo para bloqueios (`event_type === "block"`):

```tsx
className={cn(
  "...", // classes existentes
  session.event_type === "block" && "border-dashed bg-muted/50",
)}
```

- [ ] **Step 7: Commit**

```bash
git add Frontend/src/pages/AgendaPage.tsx
git commit -m "feat(agenda): suggestion panel, recurrence badges, SessionDialog integration"
```

---

## Verificação final

```bash
npm --workspace ethos-clinic run test
```

Checklist manual:
- [ ] Criar sessão recorrente semanal → aparece com badge 🔁
- [ ] Marcar como concluída → nova sessão criada automaticamente na semana seguinte
- [ ] Drag-and-drop de sessão recorrente → só aquela sessão muda (series_id mantido)
- [ ] Criar bloqueio → aparece em cinza tracejado sem confundir com sessão
- [ ] Painel de sugestões aparece com sessões da próxima semana
- [ ] Confirmar sugestão → sessão criada no calendário
- [ ] Dismiss de sugestão → some até o próximo carregamento
- [ ] `GET /sessions/suggestions` retorna sugestões corretas
