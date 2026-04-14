# Patient Portal — Complete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete patient portal in the same Frontend, with shared documents, payment visibility, session scheduling slots, and notifications — all controlled by the psychologist.

**Architecture:** Role-based routing already exists (`role: "patient"` in AuthContext). The backend has `/patient/*` endpoints and a `patientPortalService` on the frontend. We extend both with: (1) a `shared_with_patient` field on documents/contracts/reports/financial entries, (2) new backend endpoints for patient-visible data, (3) new patient pages, (4) a slot-based scheduling system. All data stays in-memory Maps with JSON persistence.

**Tech Stack:** Node.js backend (in-memory Maps), React + Vite + Tailwind + shadcn/ui frontend, Bearer token auth, scrypt passwords.

**Existing Infrastructure:**
- Backend: `apps/ethos-clinic/src/api/httpServer.ts` already has `/patient/*` routes (lines 757-929)
- Backend: `apps/ethos-clinic/src/application/service.ts` has `createPatientAccess()`, `listPatientSessions()`, etc.
- Backend: `apps/ethos-clinic/src/infra/database.ts` has Maps for all collections
- Backend: `apps/ethos-clinic/src/domain/types.ts` has all domain types
- Frontend: `Frontend/src/services/patientPortalService.ts` has basic patient API calls
- Frontend: `Frontend/src/pages/patient/` has 4 basic pages (PatientHomePage, PatientSessionsPage, PatientDiaryPage, PatientMessagesPage)
- Frontend: `Frontend/src/pages/Index.tsx` routes patient pages with RoleGate
- Frontend: `Frontend/src/components/Sidebar.tsx` has patient nav items

---

## Phase 1: Shared-With-Patient Field + Backend Endpoints

### Task 1: Add `shared_with_patient` to domain types

**Files:**
- Modify: `apps/ethos-clinic/src/domain/types.ts`

- [ ] **Step 1: Add shared_with_patient to relevant types**

Add the field to Contract, ClinicalReport, ClinicalDocument, and FinancialEntry types:

```typescript
// In Contract type (find existing definition and add):
shared_with_patient?: boolean;
shared_at?: string; // ISO date when shared

// In ClinicalReport type:
shared_with_patient?: boolean;
shared_at?: string;

// In ClinicalDocument type:
shared_with_patient?: boolean;
shared_at?: string;

// In FinancialEntry type:
shared_with_patient?: boolean;
shared_at?: string;
```

- [ ] **Step 2: Commit**

```bash
git add apps/ethos-clinic/src/domain/types.ts
git commit -m "feat: add shared_with_patient field to domain types"
```

### Task 2: Backend — Share/unshare endpoints for psychologist

**Files:**
- Modify: `apps/ethos-clinic/src/application/service.ts`
- Modify: `apps/ethos-clinic/src/api/httpServer.ts`

- [ ] **Step 1: Add share toggle functions to service.ts**

Add these functions to `service.ts` after the existing document/contract/report functions:

```typescript
export const toggleShareWithPatient = (
  owner: string,
  collection: "contracts" | "reports" | "documents" | "financial",
  itemId: string,
  share: boolean
) => {
  const map = db[collection];
  const item = getByOwner(map, owner, itemId);
  if (!item) return null;
  (item as any).shared_with_patient = share;
  (item as any).shared_at = share ? now() : undefined;
  map.set(itemId, item);
  return item;
};
```

- [ ] **Step 2: Add HTTP endpoints in httpServer.ts**

Add after existing clinical routes (before patient routes section):

```typescript
// POST /contracts/:id/share — toggle share with patient
if (method === "POST" && url.pathname.match(/^\/contracts\/[^/]+\/share$/)) {
  const { user } = requireAuth();
  requireClinicalAccess(user);
  const id = url.pathname.split("/")[2];
  const { shared } = await parseBody(req);
  const result = toggleShareWithPatient(user.id, "contracts", id, shared !== false);
  if (!result) return send(res, 404, { error: { code: "NOT_FOUND", message: "Contrato não encontrado" } });
  return send(res, 200, result);
}

// POST /reports/:id/share
if (method === "POST" && url.pathname.match(/^\/reports\/[^/]+\/share$/)) {
  const { user } = requireAuth();
  requireClinicalAccess(user);
  const id = url.pathname.split("/")[2];
  const { shared } = await parseBody(req);
  const result = toggleShareWithPatient(user.id, "reports", id, shared !== false);
  if (!result) return send(res, 404, { error: { code: "NOT_FOUND", message: "Relatório não encontrado" } });
  return send(res, 200, result);
}

// POST /documents/:id/share
if (method === "POST" && url.pathname.match(/^\/documents\/[^/]+\/share$/)) {
  const { user } = requireAuth();
  requireClinicalAccess(user);
  const id = url.pathname.split("/")[2];
  const { shared } = await parseBody(req);
  const result = toggleShareWithPatient(user.id, "documents", id, shared !== false);
  if (!result) return send(res, 404, { error: { code: "NOT_FOUND", message: "Documento não encontrado" } });
  return send(res, 200, result);
}

// POST /financial/entries/:id/share
if (method === "POST" && url.pathname.match(/^\/financial\/entries\/[^/]+\/share$/)) {
  const { user } = requireAuth();
  requireClinicalAccess(user);
  const id = url.pathname.split("/")[2];
  const { shared } = await parseBody(req);
  const result = toggleShareWithPatient(user.id, "financial", id, shared !== false);
  if (!result) return send(res, 404, { error: { code: "NOT_FOUND", message: "Lançamento não encontrado" } });
  return send(res, 200, result);
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/ethos-clinic/src/application/service.ts apps/ethos-clinic/src/api/httpServer.ts
git commit -m "feat: add share/unshare endpoints for patient portal"
```

### Task 3: Backend — Patient portal data endpoints

**Files:**
- Modify: `apps/ethos-clinic/src/application/service.ts`
- Modify: `apps/ethos-clinic/src/api/httpServer.ts`

- [ ] **Step 1: Add patient portal query functions to service.ts**

```typescript
export const getPatientSharedDocuments = (access: PatientAccess) => {
  const results: any[] = [];
  
  // Shared contracts
  for (const [, c] of db.contracts) {
    if (c.owner_user_id === access.owner_user_id && c.patient_id === access.patient_id && c.shared_with_patient) {
      results.push({ ...c, type: "contract" });
    }
  }
  
  // Shared reports
  for (const [, r] of db.reports) {
    if (r.owner_user_id === access.owner_user_id && r.patient_id === access.patient_id && r.shared_with_patient) {
      results.push({ ...r, type: "report" });
    }
  }
  
  // Shared clinical documents
  for (const [, d] of db.documents) {
    if (d.owner_user_id === access.owner_user_id && d.patient_id === access.patient_id && d.shared_with_patient) {
      results.push({ ...d, type: "document" });
    }
  }
  
  return results.sort((a, b) => Date.parse(b.shared_at || b.created_at) - Date.parse(a.shared_at || a.created_at));
};

export const getPatientFinancial = (access: PatientAccess) => {
  const results: any[] = [];
  for (const [, f] of db.financial) {
    if (f.owner_user_id === access.owner_user_id && f.patient_id === access.patient_id) {
      // Payments are always visible; receipts only if shared
      if (f.status === "open" || f.shared_with_patient) {
        results.push(f);
      }
    }
  }
  return results.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
};
```

- [ ] **Step 2: Add HTTP routes for patient portal data**

Add to the `/patient/*` section in httpServer.ts:

```typescript
// GET /patient/shared-documents — all documents shared by psychologist
if (method === "GET" && url.pathname === "/patient/shared-documents") {
  const { user } = requireAuth();
  requireRole(user, "patient");
  const access = findPatientAccess(user.id);
  if (!access) return send(res, 403, { error: { code: "NO_ACCESS", message: "Acesso não configurado" } });
  return send(res, 200, getPatientSharedDocuments(access));
}

// GET /patient/financial — payments visible to patient
if (method === "GET" && url.pathname === "/patient/financial") {
  const { user } = requireAuth();
  requireRole(user, "patient");
  const access = findPatientAccess(user.id);
  if (!access) return send(res, 403, { error: { code: "NO_ACCESS", message: "Acesso não configurado" } });
  return send(res, 200, getPatientFinancial(access));
}

// POST /patient/contracts/:id/sign — patient signs a contract
if (method === "POST" && url.pathname.match(/^\/patient\/contracts\/[^/]+\/sign$/)) {
  const { user } = requireAuth();
  requireRole(user, "patient");
  const access = findPatientAccess(user.id);
  if (!access) return send(res, 403, { error: { code: "NO_ACCESS", message: "Acesso não configurado" } });
  const contractId = url.pathname.split("/")[3];
  const contract = db.contracts.get(contractId);
  if (!contract || contract.patient_id !== access.patient_id || !contract.shared_with_patient) {
    return send(res, 404, { error: { code: "NOT_FOUND", message: "Contrato não encontrado" } });
  }
  contract.status = "signed";
  contract.signed_at = now();
  contract.signed_by = user.id;
  db.contracts.set(contractId, contract);
  return send(res, 200, contract);
}
```

- [ ] **Step 3: Add findPatientAccess helper if not present**

Check if `findPatientAccess` exists in service.ts. If not, add:

```typescript
export const findPatientAccess = (patientUserId: string): PatientAccess | null => {
  for (const [, access] of db.patientAccess) {
    if (access.patient_user_id === patientUserId) return access;
  }
  return null;
};
```

- [ ] **Step 4: Commit**

```bash
git add apps/ethos-clinic/src/application/service.ts apps/ethos-clinic/src/api/httpServer.ts
git commit -m "feat: patient portal endpoints for shared docs, financial, contract signing"
```

---

## Phase 2: Psychologist UI — "Disponibilizar para paciente" buttons

### Task 4: Frontend — Share toggle API + button component

**Files:**
- Modify: `Frontend/src/services/patientPortalService.ts`
- Create: `Frontend/src/components/ShareWithPatientButton.tsx`

- [ ] **Step 1: Add share API calls to patientPortalService or create a shareService**

Add to existing API services (or create a new small service):

```typescript
// In Frontend/src/services/patientPortalService.ts, add:
export const shareApi = {
  toggleShare: (type: "contracts" | "reports" | "documents" | "financial/entries", id: string, shared: boolean): Promise<ApiResult<unknown>> =>
    api.post(`/${type}/${id}/share`, { shared }),
};
```

- [ ] **Step 2: Create ShareWithPatientButton component**

Create `Frontend/src/components/ShareWithPatientButton.tsx`:

```tsx
import { useState } from "react";
import { Share2, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { shareApi } from "@/services/patientPortalService";
import { useToast } from "@/hooks/use-toast";

interface Props {
  type: "contracts" | "reports" | "documents" | "financial/entries";
  id: string;
  shared: boolean;
  onToggle?: (shared: boolean) => void;
}

export const ShareWithPatientButton = ({ type, id, shared, onToggle }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isShared, setIsShared] = useState(shared);

  const toggle = async () => {
    setLoading(true);
    const next = !isShared;
    const result = await shareApi.toggleShare(type, id, next);
    setLoading(false);

    if (!result.success) {
      toast({ title: "Erro", description: result.error.message, variant: "destructive" });
      return;
    }

    setIsShared(next);
    onToggle?.(next);
    toast({ title: next ? "Disponibilizado para o paciente" : "Removido do portal do paciente" });
  };

  return (
    <Button
      variant={isShared ? "default" : "outline"}
      size="sm"
      className="gap-1.5"
      onClick={toggle}
      disabled={loading}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isShared ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
      {isShared ? "Compartilhado" : "Disponibilizar"}
    </Button>
  );
};
```

- [ ] **Step 3: Commit**

```bash
git add Frontend/src/services/patientPortalService.ts Frontend/src/components/ShareWithPatientButton.tsx
git commit -m "feat: ShareWithPatientButton component + share API"
```

### Task 5: Add share button to ContractsPage, ReportsPage, DocumentsPage

**Files:**
- Modify: `Frontend/src/pages/ContractsPage.tsx`
- Modify: `Frontend/src/pages/ReportsPage.tsx`
- Modify: `Frontend/src/pages/DocumentsPage.tsx`
- Modify: `Frontend/src/pages/FinancePage.tsx`

- [ ] **Step 1: Add ShareWithPatientButton to ContractsPage**

Import the component and add it to the contract card actions (after the existing buttons like Revisar, Email, WhatsApp, PDF, DOC, Upload assinado, Preview):

```tsx
import { ShareWithPatientButton } from "@/components/ShareWithPatientButton";

// In the contract card actions div (after Preview button):
<ShareWithPatientButton
  type="contracts"
  id={contract.id}
  shared={contract.shared_with_patient ?? false}
  onToggle={(shared) => syncLocalContract({ ...contract, shared_with_patient: shared })}
/>
```

- [ ] **Step 2: Add ShareWithPatientButton to ReportsPage**

In the report list card (inside the button that opens the editor), add a share button. Since report cards are `<button>` elements, add the share button in a wrapper that stops propagation:

```tsx
import { ShareWithPatientButton } from "@/components/ShareWithPatientButton";

// Add to each report card, after the status badge:
<div onClick={(e) => e.stopPropagation()}>
  <ShareWithPatientButton
    type="reports"
    id={report.id}
    shared={report.shared_with_patient ?? false}
    onToggle={(shared) => syncLocalReport({ ...report, shared_with_patient: shared })}
  />
</div>
```

Also add `shared_with_patient?: boolean` to the Report interface in `reportService.ts`.

- [ ] **Step 3: Add ShareWithPatientButton to DocumentsPage**

In the document preview dialog footer, add the share button:

```tsx
import { ShareWithPatientButton } from "@/components/ShareWithPatientButton";

// In the preview DialogFooter, add before the Fechar button:
{previewDoc && (
  <ShareWithPatientButton
    type="documents"
    id={previewDoc.id}
    shared={previewDoc.shared_with_patient ?? false}
  />
)}
```

Also add `shared_with_patient?: boolean` to the Document type in `api/types.ts`.

- [ ] **Step 4: Add ShareWithPatientButton to FinancePage**

In each financial entry card/row, add the button. This allows psychologist to share specific receipts:

```tsx
import { ShareWithPatientButton } from "@/components/ShareWithPatientButton";

// In each financial entry row:
<ShareWithPatientButton
  type="financial/entries"
  id={entry.id}
  shared={entry.shared_with_patient ?? false}
/>
```

- [ ] **Step 5: Commit**

```bash
git add Frontend/src/pages/ContractsPage.tsx Frontend/src/pages/ReportsPage.tsx Frontend/src/pages/DocumentsPage.tsx Frontend/src/pages/FinancePage.tsx Frontend/src/services/reportService.ts Frontend/src/api/types.ts
git commit -m "feat: add share-with-patient button to contracts, reports, documents, finance"
```

---

## Phase 3: Patient Portal — Enhanced Dashboard

### Task 6: Extend patientPortalService with new endpoints

**Files:**
- Modify: `Frontend/src/services/patientPortalService.ts`

- [ ] **Step 1: Add new API methods**

```typescript
// Add these types:
export interface SharedDocument {
  id: string;
  type: "contract" | "report" | "document";
  title?: string;
  status?: string;
  content?: string;
  shared_at?: string;
  created_at?: string;
  // Contract-specific
  terms?: { value?: string; periodicity?: string; absence_policy?: string; payment_method?: string };
  psychologist?: { name?: string; license?: string; email?: string };
}

export interface PatientFinancialEntry {
  id: string;
  amount: number;
  status: "paid" | "open";
  due_date?: string;
  paid_at?: string;
  payment_method?: string;
  description?: string;
}

// Add to patientPortalService:
getSharedDocuments: (): Promise<ApiResult<SharedDocument[]>> =>
  api.get<SharedDocument[]>("/patient/shared-documents"),

getFinancial: (): Promise<ApiResult<PatientFinancialEntry[]>> =>
  api.get<PatientFinancialEntry[]>("/patient/financial"),

signContract: (contractId: string): Promise<ApiResult<unknown>> =>
  api.post(`/patient/contracts/${contractId}/sign`),
```

- [ ] **Step 2: Commit**

```bash
git add Frontend/src/services/patientPortalService.ts
git commit -m "feat: patient portal service — shared docs, financial, contract signing"
```

### Task 7: PatientHomePage — Full dashboard

**Files:**
- Modify: `Frontend/src/pages/patient/PatientHomePage.tsx`

- [ ] **Step 1: Rewrite PatientHomePage as a full dashboard**

The page should show:
1. **Próximas sessões** — from `getSessions()`, with confirm button
2. **Pagamentos pendentes** — from `getFinancial()`, only `status: "open"`
3. **Documentos compartilhados** — from `getSharedDocuments()`, latest 5
4. **Quick links** — to Sessões, Diário, Mensagens

Use the existing session confirm logic. Add cards for each section. Show a notification banner for pending payments and upcoming sessions (within 24h).

```tsx
// Structure:
// - Welcome header with patient name
// - Grid with 2 columns:
//   Left: Próximas sessões (top 3) + Pagamentos pendentes
//   Right: Documentos recentes + Quick actions
// - Each section is a card with session-card styling
```

- [ ] **Step 2: Commit**

```bash
git add Frontend/src/pages/patient/PatientHomePage.tsx
git commit -m "feat: patient home — full dashboard with sessions, payments, documents"
```

### Task 8: Patient Documents Page

**Files:**
- Create: `Frontend/src/pages/patient/PatientDocumentsPage.tsx`

- [ ] **Step 1: Create the patient documents page**

This page lists all shared documents, contracts, and reports. For contracts, show a "Assinar" button if not yet signed.

```tsx
// Structure:
// - Header: "Seus documentos"
// - Tabs or grouped sections: Contratos | Relatórios | Documentos
// - Each item shows: title, date, type badge, preview button
// - Contracts: "Assinar contrato" button if status !== "signed"
// - Preview: open HTML in iframe dialog (same pattern as psychologist pages)
// - Download: PDF/DOC buttons
```

Key features:
- Contract signing: calls `patientPortalService.signContract(id)`
- Preview: build HTML from contract/report content and show in iframe
- Download: use `openHtmlInNewTab()` for PDF and `downloadWordFromHtml()` for DOC

- [ ] **Step 2: Commit**

```bash
git add Frontend/src/pages/patient/PatientDocumentsPage.tsx
git commit -m "feat: patient documents page with contract signing"
```

### Task 9: Patient Payments Page

**Files:**
- Create: `Frontend/src/pages/patient/PatientPaymentsPage.tsx`

- [ ] **Step 1: Create the patient payments page**

Simple page showing payment history and pending amounts.

```tsx
// Structure:
// - Header: "Pagamentos"
// - Summary card: Total pendente, Próximo vencimento
// - List of entries:
//   - Paid: green badge, amount, date, payment method
//   - Open: yellow badge, amount, due date
// - No edit capability — read-only for patient
```

- [ ] **Step 2: Commit**

```bash
git add Frontend/src/pages/patient/PatientPaymentsPage.tsx
git commit -m "feat: patient payments page"
```

### Task 10: Wire new patient pages into routing + sidebar

**Files:**
- Modify: `Frontend/src/pages/Index.tsx`
- Modify: `Frontend/src/components/Sidebar.tsx`

- [ ] **Step 1: Add new routes to Index.tsx**

Import the new pages and add them to the patient section:

```tsx
import PatientDocumentsPage from "@/pages/patient/PatientDocumentsPage";
import PatientPaymentsPage from "@/pages/patient/PatientPaymentsPage";

// In the patient RoleGate section, add:
{activePage === "patient-documents" && <PatientDocumentsPage />}
{activePage === "patient-payments" && <PatientPaymentsPage />}
```

Also add `"patient-documents" | "patient-payments"` to the Page type union.

- [ ] **Step 2: Add sidebar items**

In Sidebar.tsx, add to the patient navigation items:

```typescript
// After existing patient items, add:
{ page: "patient-documents", label: "Documentos", icon: FileText },
{ page: "patient-payments", label: "Pagamentos", icon: DollarSign },
```

- [ ] **Step 3: Commit**

```bash
git add Frontend/src/pages/Index.tsx Frontend/src/components/Sidebar.tsx
git commit -m "feat: wire patient documents and payments pages"
```

---

## Phase 4: Slot-Based Scheduling (Calendly-style)

### Task 11: Backend — Availability slots data model

**Files:**
- Modify: `apps/ethos-clinic/src/domain/types.ts`
- Modify: `apps/ethos-clinic/src/infra/database.ts`

- [ ] **Step 1: Add slot types to domain**

```typescript
// Recurring availability block (psychologist defines)
type AvailabilityBlock = Owned & {
  day_of_week: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sunday
  start_time: string; // "14:00"
  end_time: string;   // "18:00"
  slot_duration_minutes: number; // 50
  enabled: boolean;
};

// A specific slot request from patient
type SlotRequest = Owned & {
  patient_id: string;
  patient_user_id: string;
  requested_date: string; // "2026-04-20"
  requested_time: string; // "15:00"
  duration_minutes: number;
  status: "pending" | "confirmed" | "rejected";
  responded_at?: string;
  rejection_reason?: string;
};
```

- [ ] **Step 2: Add Maps to database**

```typescript
// In database.ts, add to the db object:
availabilityBlocks: new Map<string, AvailabilityBlock>(),
slotRequests: new Map<string, SlotRequest>(),
```

- [ ] **Step 3: Commit**

```bash
git add apps/ethos-clinic/src/domain/types.ts apps/ethos-clinic/src/infra/database.ts
git commit -m "feat: availability slots data model"
```

### Task 12: Backend — Slot management endpoints

**Files:**
- Modify: `apps/ethos-clinic/src/application/service.ts`
- Modify: `apps/ethos-clinic/src/api/httpServer.ts`

- [ ] **Step 1: Add slot service functions**

```typescript
// Psychologist CRUD for availability blocks
export const createAvailabilityBlock = (owner: string, data: Omit<AvailabilityBlock, "id" | "owner_user_id" | "created_at">) => {
  const block: AvailabilityBlock = { id: uid(), owner_user_id: owner, created_at: now(), ...data };
  db.availabilityBlocks.set(block.id, block);
  return block;
};

export const listAvailabilityBlocks = (owner: string) =>
  [...db.availabilityBlocks.values()].filter(b => b.owner_user_id === owner && b.enabled);

export const deleteAvailabilityBlock = (owner: string, blockId: string) => {
  const block = getByOwner(db.availabilityBlocks, owner, blockId);
  if (!block) return false;
  db.availabilityBlocks.delete(blockId);
  return true;
};

// Patient: get available slots for a date range
export const getAvailableSlots = (access: PatientAccess, startDate: string, endDate: string) => {
  const blocks = [...db.availabilityBlocks.values()].filter(
    b => b.owner_user_id === access.owner_user_id && b.enabled
  );
  
  const slots: { date: string; time: string; duration: number }[] = [];
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T23:59:59");
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    const dateStr = d.toISOString().split("T")[0];
    
    for (const block of blocks) {
      if (block.day_of_week !== dow) continue;
      
      const [startH, startM] = block.start_time.split(":").map(Number);
      const [endH, endM] = block.end_time.split(":").map(Number);
      const startMin = startH * 60 + startM;
      const endMin = endH * 60 + endM;
      
      for (let t = startMin; t + block.slot_duration_minutes <= endMin; t += block.slot_duration_minutes) {
        const h = String(Math.floor(t / 60)).padStart(2, "0");
        const m = String(t % 60).padStart(2, "0");
        const time = `${h}:${m}`;
        
        // Check if slot is already booked (existing session or pending request)
        const booked = [...db.sessions.values()].some(
          s => s.owner_user_id === access.owner_user_id && s.scheduled_at?.startsWith(dateStr) && s.scheduled_at?.includes(time)
        );
        const requested = [...db.slotRequests.values()].some(
          sr => sr.owner_user_id === access.owner_user_id && sr.requested_date === dateStr && sr.requested_time === time && sr.status === "pending"
        );
        
        if (!booked && !requested) {
          slots.push({ date: dateStr, time, duration: block.slot_duration_minutes });
        }
      }
    }
  }
  
  return slots;
};

// Patient: request a slot
export const requestSlot = (access: PatientAccess, date: string, time: string, duration: number) => {
  const request: SlotRequest = {
    id: uid(),
    owner_user_id: access.owner_user_id,
    patient_id: access.patient_id,
    patient_user_id: access.patient_user_id,
    requested_date: date,
    requested_time: time,
    duration_minutes: duration,
    status: "pending",
    created_at: now(),
  };
  db.slotRequests.set(request.id, request);
  return request;
};

// Psychologist: respond to slot request
export const respondSlotRequest = (owner: string, requestId: string, approved: boolean, reason?: string) => {
  const request = getByOwner(db.slotRequests, owner, requestId);
  if (!request) return null;
  
  request.status = approved ? "confirmed" : "rejected";
  request.responded_at = now();
  if (!approved && reason) request.rejection_reason = reason;
  db.slotRequests.set(requestId, request);
  
  // If approved, create session
  if (approved) {
    const scheduledAt = `${request.requested_date}T${request.requested_time}:00`;
    createSession(owner, request.patient_id, scheduledAt, request.duration_minutes);
  }
  
  return request;
};

// Psychologist: list pending slot requests
export const listSlotRequests = (owner: string) =>
  [...db.slotRequests.values()].filter(sr => sr.owner_user_id === owner).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
```

- [ ] **Step 2: Add HTTP endpoints**

Psychologist endpoints:
```typescript
// GET /availability — list blocks
// POST /availability — create block
// DELETE /availability/:id — remove block
// GET /slot-requests — list pending requests
// POST /slot-requests/:id/respond — approve/reject
```

Patient endpoints:
```typescript
// GET /patient/available-slots?start=2026-04-14&end=2026-04-21 — get open slots
// POST /patient/slot-request — request a slot
```

- [ ] **Step 3: Commit**

```bash
git add apps/ethos-clinic/src/application/service.ts apps/ethos-clinic/src/api/httpServer.ts
git commit -m "feat: slot-based scheduling backend"
```

### Task 13: Frontend — Psychologist availability settings

**Files:**
- Create: `Frontend/src/pages/AvailabilitySettingsPage.tsx` (or add as section in AgendaPage)

- [ ] **Step 1: Create availability UI for psychologist**

The psychologist configures their weekly availability blocks. Simple UI:

```tsx
// Structure:
// - Header: "Horários disponíveis para agendamento"
// - Toggle: "Habilitar agendamento pelo paciente" (on/off)
// - Grid: Monday-Friday (or all 7 days)
// - For each day: start time, end time, slot duration
// - Add/remove blocks per day
// - Save button calls createAvailabilityBlock for each
```

- [ ] **Step 2: Add slot requests list to AgendaPage or as notification**

Show pending slot requests in the agenda with Accept/Reject buttons:

```tsx
// Notification banner or section at top of AgendaPage:
// "João solicitou sessão para 20/04 às 15:00" [Aceitar] [Recusar]
```

- [ ] **Step 3: Commit**

```bash
git add Frontend/src/pages/AvailabilitySettingsPage.tsx Frontend/src/pages/AgendaPage.tsx
git commit -m "feat: psychologist availability settings + slot request management"
```

### Task 14: Frontend — Patient slot booking page

**Files:**
- Create: `Frontend/src/pages/patient/PatientBookingPage.tsx`

- [ ] **Step 1: Create the booking page**

Calendly-style slot picker:

```tsx
// Structure:
// - Header: "Agendar sessão"
// - Calendar view (week by week)
// - Available slots shown as clickable time blocks
// - On click: "Confirmar solicitação para [data] às [hora]?"
// - On confirm: calls requestSlot, shows success toast
// - Show pending requests with status badges
```

- [ ] **Step 2: Wire into routing + sidebar**

Add `patient-booking` page to Index.tsx and Sidebar.tsx:

```typescript
// Sidebar patient items:
{ page: "patient-booking", label: "Agendar sessão", icon: CalendarPlus },
```

- [ ] **Step 3: Commit**

```bash
git add Frontend/src/pages/patient/PatientBookingPage.tsx Frontend/src/pages/Index.tsx Frontend/src/components/Sidebar.tsx
git commit -m "feat: patient slot booking page (Calendly-style)"
```

---

## Phase 5: Notification System for Patients

### Task 15: Backend — Auto-notifications for patients

**Files:**
- Modify: `apps/ethos-clinic/src/application/notifications.ts`
- Modify: `apps/ethos-clinic/src/application/service.ts`

- [ ] **Step 1: Add automatic notification triggers**

Extend the notification dispatcher to auto-schedule:
1. **Session reminder** — 24h before session, notify patient
2. **Payment due** — when a payment is open and due_date is approaching
3. **Document shared** — when psychologist shares a document
4. **Slot response** — when psychologist accepts/rejects a slot request

```typescript
// In service.ts or notifications.ts:
export const notifyPatient = (access: PatientAccess, type: string, data: Record<string, string>) => {
  // Store in-app notification
  const notification = {
    id: uid(),
    patient_user_id: access.patient_user_id,
    type, // "session_reminder" | "payment_due" | "document_shared" | "slot_response"
    data,
    read: false,
    created_at: now(),
  };
  db.patientNotifications.set(notification.id, notification);
  return notification;
};
```

- [ ] **Step 2: Add patientNotifications Map to database**

```typescript
patientNotifications: new Map<string, PatientNotification>(),
```

- [ ] **Step 3: Add patient notification endpoints**

```typescript
// GET /patient/notifications — list unread notifications
// POST /patient/notifications/:id/read — mark as read
```

- [ ] **Step 4: Commit**

```bash
git add apps/ethos-clinic/src/application/notifications.ts apps/ethos-clinic/src/application/service.ts apps/ethos-clinic/src/infra/database.ts apps/ethos-clinic/src/api/httpServer.ts
git commit -m "feat: patient notification system"
```

### Task 16: Frontend — Patient notifications

**Files:**
- Modify: `Frontend/src/pages/patient/PatientHomePage.tsx`
- Modify: `Frontend/src/services/patientPortalService.ts`

- [ ] **Step 1: Add notification bell to patient sidebar/header**

Show unread notification count. On click, show notification list:
- "Sua sessão é amanhã às 14:00" (session_reminder)
- "Pagamento de R$ 250 vence em 2 dias" (payment_due)
- "Novo documento disponível: Contrato terapêutico" (document_shared)
- "Seu horário de 20/04 às 15:00 foi confirmado!" (slot_response)

- [ ] **Step 2: Show notifications in PatientHomePage**

Add notification cards at the top of the dashboard.

- [ ] **Step 3: Commit**

```bash
git add Frontend/src/pages/patient/PatientHomePage.tsx Frontend/src/services/patientPortalService.ts Frontend/src/components/Sidebar.tsx
git commit -m "feat: patient notifications UI"
```

---

## Summary

| Phase | Tasks | What it delivers |
|-------|-------|-----------------|
| 1 | Tasks 1-3 | Backend: shared_with_patient + portal data endpoints |
| 2 | Tasks 4-5 | Psychologist UI: "Disponibilizar" button everywhere |
| 3 | Tasks 6-10 | Patient dashboard, documents, payments, contract signing |
| 4 | Tasks 11-14 | Calendly-style slot booking (backend + both UIs) |
| 5 | Tasks 15-16 | In-app notifications for patients |

Total: **16 tasks**, each with 2-5 steps. Estimated: ~3-4 hours with subagent-driven execution.
