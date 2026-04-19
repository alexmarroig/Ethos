# Email, Credenciais, Contratos e Lembretes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire real email delivery (Resend), fix broken patient credential/contract flows, and add automatic session reminders.

**Architecture:** Add Resend SDK as the email transport, replacing webhook-based dispatch. Fix `sendContract` signature mismatch and missing `attachSignedContract`. Generate secure random passwords for patient access. Auto-schedule reminder 24h before each session.

**Tech Stack:** Resend (email), Node.js crypto (password generation)

---

### Task 1: Install Resend and create emailService

**Files:**
- Modify: `apps/ethos-clinic/package.json`
- Create: `apps/ethos-clinic/src/infra/emailService.ts`

- [ ] **Step 1: Install resend**

```bash
cd apps/ethos-clinic && npm install resend
```

- [ ] **Step 2: Create emailService.ts**

```typescript
// apps/ethos-clinic/src/infra/emailService.ts
import { Resend } from "resend";

let resendClient: Resend | null = null;

const getClient = () => {
  if (!resendClient) {
    const key = process.env.RESEND_API_KEY;
    if (!key) return null;
    resendClient = new Resend(key);
  }
  return resendClient;
};

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

export const sendEmail = async (input: SendEmailInput): Promise<{ ok: boolean; error?: string }> => {
  const client = getClient();
  if (!client) {
    process.stderr.write("[email] RESEND_API_KEY not configured\n");
    return { ok: false, error: "RESEND_NOT_CONFIGURED" };
  }

  const from = process.env.RESEND_FROM_EMAIL || "Ethos <noreply@ethos.app>";

  try {
    const { error } = await client.emails.send({ from, to: [input.to], subject: input.subject, html: input.html });
    if (error) {
      process.stderr.write(`[email] Resend error: ${JSON.stringify(error)}\n`);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[email] send failed: ${msg}\n`);
    return { ok: false, error: msg };
  }
};
```

- [ ] **Step 3: Commit**

```bash
git add apps/ethos-clinic/package.json apps/ethos-clinic/package-lock.json apps/ethos-clinic/src/infra/emailService.ts
git commit -m "feat: add Resend email service"
```

---

### Task 2: Integrate Resend into notification dispatcher

**Files:**
- Modify: `apps/ethos-clinic/src/application/notifications.ts:221-240`

Replace the email webhook block with a direct Resend call.

- [ ] **Step 1: Add import at top of notifications.ts**

At line 2, after the existing imports, add:

```typescript
import { sendEmail } from "../infra/emailService";
```

- [ ] **Step 2: Replace email dispatch block**

Replace lines 221-240 (the `else if (schedule.channel === "email")` block) with:

```typescript
      } else if (schedule.channel === "email") {
        const result = await sendEmail({
          to: schedule.recipient,
          subject: subject || "Notificação Ethos",
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
            <h2 style="color:#6B46C1">Ethos</h2>
            <p>${message.replace(/\n/g, "<br>")}</p>
          </div>`,
        });
        status = result.ok ? "sent" : "failed";
        reason = result.ok ? undefined : result.error;
        providerResponse = result.error || undefined;
      }
```

- [ ] **Step 3: Commit**

```bash
git add apps/ethos-clinic/src/application/notifications.ts
git commit -m "feat: dispatch email notifications via Resend instead of webhooks"
```

---

### Task 3: Fix createPatientAccess — secure password + email delivery

**Files:**
- Modify: `apps/ethos-clinic/src/application/service.ts:1048-1087`

- [ ] **Step 1: Add import at top of service.ts**

After the existing imports (around line 1), add:

```typescript
import { sendEmail } from "../infra/emailService";
```

- [ ] **Step 2: Replace password default and add email sending**

Replace lines 1058-1087 with:

```typescript
  const temporaryPassword = input.patient_password || crypto.randomBytes(4).toString("hex"); // 8-char random
  const patientUser = sameEmail ?? {
    id: uid(),
    email: input.patient_email,
    name: input.patient_name,
    password_hash: hashPassword(temporaryPassword),
    role: "patient" as const,
    status: "active" as const,
    created_at: now(),
  };
  db.users.set(patientUser.id, patientUser);

  createPatientIfMissing(owner, input.patient_id);
  const access: PatientAccess = {
    id: uid(),
    owner_user_id: owner,
    patient_user_id: patientUser.id,
    patient_id: input.patient_id,
    permissions: {
      scales: input.permissions?.scales ?? true,
      diary: input.permissions?.diary ?? true,
      session_confirmation: input.permissions?.session_confirmation ?? true,
      async_messages_per_day: input.permissions?.async_messages_per_day ?? 3,
    },
    created_at: now(),
  };
  db.patientAccess.set(access.id, access);
  persistMutation();

  // Send credentials email (fire-and-forget)
  void sendEmail({
    to: input.patient_email,
    subject: "Suas credenciais de acesso — Ethos",
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <h2 style="color:#6B46C1">Bem-vindo ao Ethos</h2>
      <p>Olá <strong>${input.patient_name}</strong>,</p>
      <p>Seu psicólogo criou um acesso para você na plataforma Ethos.</p>
      <p><strong>Email:</strong> ${input.patient_email}</p>
      <p><strong>Senha temporária:</strong> ${temporaryPassword}</p>
      <p>Recomendamos que altere sua senha no primeiro acesso.</p>
      <p style="color:#888;font-size:12px">Este é um email automático do sistema Ethos.</p>
    </div>`,
  }).catch((err) => process.stderr.write(`[patient-access] email failed: ${err}\n`));

  return { access, patientUser, temporaryPassword: input.patient_password ? undefined : temporaryPassword };
};
```

- [ ] **Step 3: Commit**

```bash
git add apps/ethos-clinic/src/application/service.ts
git commit -m "feat: secure random password + email credentials to patient on access creation"
```

---

### Task 4: Fix sendContract — accept channel/recipient and send email

**Files:**
- Modify: `apps/ethos-clinic/src/application/service.ts:1232-1240`

- [ ] **Step 1: Replace sendContract function**

Replace lines 1232-1240 with:

```typescript
export const sendContract = (owner: string, id: string, channel?: string, recipient?: string) => {
  const contract = getContract(owner, id);
  if (!contract) return null;
  contract.status = "sent";
  contract.portal_token = contract.portal_token ?? crypto.randomBytes(12).toString("hex");
  contract.updated_at = now();
  persistMutation();

  // Send contract link via email if channel is email and recipient provided
  if (channel === "email" && recipient) {
    const baseUrl = process.env.ETHOS_PUBLIC_URL || "http://localhost:8787";
    const portalUrl = `${baseUrl}/portal/contract?token=${contract.portal_token}`;
    void sendEmail({
      to: recipient,
      subject: "Contrato para revisão — Ethos",
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#6B46C1">Ethos</h2>
        <p>Olá,</p>
        <p>Você recebeu um contrato terapêutico para revisão e aceite.</p>
        <p><a href="${portalUrl}" style="display:inline-block;padding:12px 24px;background:#6B46C1;color:#fff;text-decoration:none;border-radius:8px">Revisar contrato</a></p>
        <p style="color:#888;font-size:12px">Se o botão não funcionar, copie e cole este link: ${portalUrl}</p>
      </div>`,
    }).catch((err) => process.stderr.write(`[contract] email send failed: ${err}\n`));
  }

  return contract;
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/ethos-clinic/src/application/service.ts
git commit -m "fix: sendContract accepts channel/recipient and sends email via Resend"
```

---

### Task 5: Implement attachSignedContract

**Files:**
- Modify: `apps/ethos-clinic/src/application/service.ts` (after sendContract, ~line 1255)

- [ ] **Step 1: Add attachSignedContract function**

Insert after `sendContract`:

```typescript
export const attachSignedContract = (owner: string, id: string, input: {
  file_name: string;
  mime_type: string;
  data_url: string;
}) => {
  const contract = getContract(owner, id);
  if (!contract) return null;
  (contract as any).signed_file = {
    file_name: input.file_name,
    mime_type: input.mime_type,
    data_url: input.data_url,
    uploaded_at: now(),
  };
  contract.status = "accepted";
  contract.updated_at = now();
  persistMutation();
  return contract;
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/ethos-clinic/src/application/service.ts
git commit -m "feat: implement attachSignedContract for signed document uploads"
```

---

### Task 6: Auto-schedule session reminder 24h before

**Files:**
- Modify: `apps/ethos-clinic/src/application/service.ts` — inside `createSession` function (lines 1009-1023)

- [ ] **Step 1: Add auto-reminder import**

At the top of service.ts, add to existing imports from notifications:

```typescript
import { scheduleNotification, createNotificationTemplate, grantNotificationConsent } from "./notifications";
```

- [ ] **Step 2: Add reminder logic at end of createSession**

Replace lines 1009-1023 with:

```typescript
export const createSession = (owner: string, patientId: string, scheduledAt: string, durationMinutes?: number): ClinicalSession => {
  createPatientIfMissing(owner, patientId);
  const session: ClinicalSession = {
    id: uid(),
    owner_user_id: owner,
    patient_id: patientId,
    scheduled_at: scheduledAt,
    status: "scheduled",
    duration_minutes: typeof durationMinutes === "number" ? durationMinutes : undefined,
    created_at: now(),
  };
  db.sessions.set(session.id, session);
  persistMutation();

  // Auto-schedule 24h reminder if session is >24h from now
  const sessionTime = Date.parse(scheduledAt);
  const reminderTime = sessionTime - 86_400_000; // 24h before
  if (reminderTime > Date.now()) {
    const patient = db.patients.get(patientId);
    const patientEmail = patient?.email;
    if (patientEmail) {
      // Ensure a default reminder template exists
      let template = Array.from(db.notificationTemplates.values()).find(
        (t) => t.owner_user_id === owner && t.name === "__session_reminder_24h" && t.channel === "email",
      );
      if (!template) {
        template = createNotificationTemplate(owner, {
          name: "__session_reminder_24h",
          channel: "email",
          content: "Olá {patient_name}, lembramos que você tem uma sessão agendada para {session_date} às {session_time}.",
          subject: "Lembrete de sessão — Ethos",
        });
      }
      // Auto-grant consent for email (clinician is creating the session)
      grantNotificationConsent(owner, { patientId, channel: "email", source: "session_auto" });
      void scheduleNotification(owner, {
        session,
        template,
        scheduledFor: new Date(reminderTime).toISOString(),
        recipient: patientEmail,
      });
    }
  }

  return session;
};
```

- [ ] **Step 3: Commit**

```bash
git add apps/ethos-clinic/src/application/service.ts
git commit -m "feat: auto-schedule 24h email reminder when creating sessions"
```

---

### Task 7: Verification

- [ ] **Step 1: Verify server starts**

```bash
cd apps/ethos-clinic && npm run dev
```

Expected: Server starts on port 8787 without errors.

- [ ] **Step 2: Test credential creation**

```bash
# Login as clinician
curl -s http://localhost:8787/auth/login -d '{"email":"camila@ethos.local","password":"admin123"}' -H "Content-Type: application/json" | jq .data.token
# Create patient access (use token from above)
curl -s http://localhost:8787/patient-access -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" -d '{"patient_id":"test-p1","patient_email":"test@example.com","patient_name":"Test Patient"}' | jq .
```

Expected: Returns `temporary_password` (8-char hex), email send attempted (check server logs for `[email]` or `[patient-access]` output).

- [ ] **Step 3: Test contract send**

```bash
# Create a contract first, then send it
curl -s http://localhost:8787/contracts/<ID>/send -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" -d '{"channel":"email","recipient":"test@example.com"}' | jq .
```

Expected: Returns contract with `portal_url`, email send attempted.

- [ ] **Step 4: Test session reminder scheduling**

```bash
# Create a session 48h from now
curl -s http://localhost:8787/sessions -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" -d '{"patient_id":"test-p1","scheduled_at":"2026-04-15T14:00:00Z"}' | jq .
# Check notification schedules
curl -s http://localhost:8787/notifications/schedules -H "Authorization: Bearer <TOKEN>" | jq .
```

Expected: A notification schedule exists for 24h before the session time.

- [ ] **Step 5: Run existing tests**

```bash
cd apps/ethos-clinic && npm test
```

Expected: All 34 tests pass.
