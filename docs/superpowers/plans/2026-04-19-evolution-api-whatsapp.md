# Evolution API WhatsApp — Deploy + Confirmação Automática

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Subir Evolution API no Fly.io (grátis, 24/7) e adicionar confirmação automática de sessão via resposta do paciente no WhatsApp.

**Architecture:** A Evolution API roda como container Docker no Fly.io com volume persistente (mantém conexão WhatsApp após restarts). O backend Ethos (Render) já tem adapter e workers prontos — só precisa da URL configurada. Para confirmação, o sessionReminderWorker registra phone→session_id em `db.pendingConfirmations` ao enviar o lembrete, e um novo endpoint `POST /webhook/whatsapp` (chamado pela Evolution API) lê essa map, confirma a sessão e envia resposta automática.

**Tech Stack:** Fly.io CLI (`flyctl`), Docker image `athosgalvao/evolution-api:latest`, Node.js/TypeScript backend existente em `apps/ethos-clinic`.

---

## Arquivos a criar/modificar

| Arquivo | Ação |
|---|---|
| `fly.toml` | Criar — configuração do serviço Fly.io |
| `apps/ethos-clinic/src/infra/database.ts` | Modificar — adicionar `pendingConfirmations` Map |
| `apps/ethos-clinic/src/application/sessionReminderWorker.ts` | Modificar — atualizar template + registrar pendingConfirmation |
| `apps/ethos-clinic/src/api/httpServer.ts` | Modificar — novo endpoint `POST /webhook/whatsapp` |

---

## Task 1: Deploy Evolution API no Fly.io

**Files:**
- Create: `fly.toml` (raiz do repositório)

- [ ] **Step 1: Instalar flyctl**

No Windows (PowerShell):
```powershell
powershell -ExecutionPolicy ByPass -c "irm https://fly.io/install.ps1 | iex"
```
Ou com Scoop:
```powershell
scoop install flyctl
```
Verificar: `flyctl version` → deve mostrar versão instalada.

- [ ] **Step 2: Login no Fly.io**

```bash
flyctl auth login
```
Abre o browser, criar conta gratuita em https://fly.io se não tiver.

- [ ] **Step 3: Criar o app**

```bash
flyctl apps create ethos-evolution
```
Expected output: `New app created: ethos-evolution`

- [ ] **Step 4: Criar o arquivo fly.toml na raiz do repositório**

Criar `fly.toml` com o conteúdo:
```toml
app = "ethos-evolution"
primary_region = "gru"

[build]
  image = "athosgalvao/evolution-api:latest"

[env]
  PORT = "8080"
  DATABASE_ENABLED = "false"
  STORE_MESSAGES = "false"
  STORE_MESSAGE_UP = "false"
  STORE_CONTACTS = "false"
  STORE_CHATS = "false"
  WEBHOOK_GLOBAL_ENABLED = "true"
  WEBHOOK_GLOBAL_WEBHOOK_BY_EVENTS = "true"
  WEBHOOK_EVENTS_MESSAGES = "true"

[[services]]
  internal_port = 8080
  protocol = "tcp"

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

  [services.concurrency]
    hard_limit = 25
    soft_limit = 20

[mounts]
  source = "evolution_instances"
  destination = "/evolution/instances"
```

- [ ] **Step 5: Setar as variáveis secretas**

Substitua `<RANDOM_KEY>` por uma string aleatória de 32+ chars (ex: gerar em https://randomkeygen.com):
```bash
flyctl secrets set \
  AUTHENTICATION_TYPE=apikey \
  AUTHENTICATION_API_KEY=<RANDOM_KEY> \
  --app ethos-evolution
```

Também setar a URL do webhook apontando para o backend Ethos no Render (substitua pela URL real):
```bash
flyctl secrets set \
  WEBHOOK_GLOBAL_URL=https://<seu-app>.onrender.com/webhook/whatsapp \
  --app ethos-evolution
```

- [ ] **Step 6: Criar volume persistente**

```bash
flyctl volumes create evolution_instances \
  --region gru \
  --size 1 \
  --app ethos-evolution
```
Expected: `Volume 'evolution_instances' created successfully`

- [ ] **Step 7: Deploy**

```bash
flyctl deploy --app ethos-evolution
```
Expected: Deploy finaliza com `✓ v1 deployed successfully`

- [ ] **Step 8: Verificar que está rodando**

```bash
flyctl status --app ethos-evolution
```
Expected: status `running`. Também testar:
```bash
curl https://ethos-evolution.fly.dev
```
Deve retornar JSON da Evolution API (algo como `{"status": "online"}`).

- [ ] **Step 9: Commit do fly.toml**

```bash
git add fly.toml
git commit -m "feat(infra): fly.toml para Evolution API no Fly.io"
git push origin main
```

---

## Task 2: Configurar Ethos para usar a Evolution API

**Files:**
- Nenhum arquivo de código — é configuração via UI.

- [ ] **Step 1: Abrir AccountPage no Ethos**

Acessar o Ethos (Render) → Menu → Conta → seção WhatsApp.

- [ ] **Step 2: Preencher as credenciais**

- **URL:** `https://ethos-evolution.fly.dev`
- **API Key:** o mesmo valor de `AUTHENTICATION_API_KEY` setado no Step 5 da Task 1
- **Instance name:** `ethos`
- **Habilitado:** ativar o toggle

Clicar "Salvar".

- [ ] **Step 3: Conectar e escanear QR code**

Clicar "Conectar / QR code". Um QR code aparece na tela. Abrir o WhatsApp no celular → Aparelhos conectados → Conectar um aparelho → Escanear o QR.

Status muda para "Conectado" (verde).

- [ ] **Step 4: Testar envio**

Na mesma tela, usar o campo "Enviar mensagem de teste" → colocar seu próprio número de celular com DDD → clicar Enviar.

Deve receber "Teste do Ethos 👋" no WhatsApp.

---

## Task 3: Adicionar `pendingConfirmations` ao banco em memória

**Files:**
- Modify: `apps/ethos-clinic/src/infra/database.ts`

- [ ] **Step 1: Adicionar o Map ao objeto `db`**

Localizar o bloco onde `db` é definido (buscar por `sentSessionReminders`). Adicionar logo após:

```ts
// Antes (linha ~118-120):
sessionReminderConfig: new Map<"config", SessionReminderConfig>(),
patientSessionReminderEnabled: new Map<string, boolean>(),
sentSessionReminders: new Set<string>(),

// Depois — adicionar a linha:
sessionReminderConfig: new Map<"config", SessionReminderConfig>(),
patientSessionReminderEnabled: new Map<string, boolean>(),
sentSessionReminders: new Set<string>(),
pendingConfirmations: new Map<string, string>(), // phone (normalized) → session_id
```

- [ ] **Step 2: Commit**

```bash
git add apps/ethos-clinic/src/infra/database.ts
git commit -m "feat(db): adicionar pendingConfirmations Map para confirmação de sessão via WhatsApp"
git push origin main
```

---

## Task 4: Atualizar sessionReminderWorker para registrar confirmação pendente

**Files:**
- Modify: `apps/ethos-clinic/src/application/sessionReminderWorker.ts`

- [ ] **Step 1: Atualizar o template padrão**

No `sessionReminderWorker.ts`, o template padrão é usado quando o usuário não configurou um customizado. O template fica em `db.sessionReminderConfig`. O template padrão que aparece na UI é definido no `AccountPage.tsx` do frontend — o backend usa o que está salvo no banco.

Não há template hardcoded no worker — ele usa `reminderCfg.template`. O que precisamos fazer é: ao salvar o envio bem-sucedido, **normalizar o telefone** (mesmo algoritmo do `whatsapp.ts`) e armazená-lo no `pendingConfirmations`.

- [ ] **Step 2: Adicionar a função de normalização de telefone**

No início do arquivo `sessionReminderWorker.ts`, após os imports, adicionar:

```ts
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("55") ? digits : `55${digits}`;
}
```

- [ ] **Step 3: Registrar pendingConfirmation após envio bem-sucedido**

Localizar o bloco `if (result.ok)` (linha ~102-104):

```ts
// Antes:
if (result.ok) {
  db.sentSessionReminders.add(reminderKey);
  process.stdout.write(`[session-reminder] Sent reminder to patient ${patientId} for session ${session.id}.\n`);
}

// Depois:
if (result.ok) {
  db.sentSessionReminders.add(reminderKey);
  // Registra o telefone normalizado como chave para confirmação via webhook
  const normalizedPhone = normalizePhone(phone);
  db.pendingConfirmations.set(normalizedPhone, session.id);
  process.stdout.write(`[session-reminder] Sent reminder to patient ${patientId} for session ${session.id}.\n`);
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/ethos-clinic/src/application/sessionReminderWorker.ts
git commit -m "feat(worker): registrar pendingConfirmation ao enviar lembrete de sessão"
git push origin main
```

---

## Task 5: Endpoint POST /webhook/whatsapp

**Files:**
- Modify: `apps/ethos-clinic/src/api/httpServer.ts`

- [ ] **Step 1: Localizar onde adicionar o endpoint**

Buscar por `settings/whatsapp` no `httpServer.ts`. O endpoint novo deve ser adicionado **antes** do bloco de autenticação/guard, pois a Evolution API chama sem Bearer token.

Localizar a seção inicial do handler principal — onde ficam as rotas públicas como `/health` e `/auth/login`. Adicionar logo após `/health`:

- [ ] **Step 2: Implementar o endpoint**

```ts
// ─── Webhook Evolution API (sem auth) ────────────────────────────────────────
if (method === "POST" && url.pathname === "/webhook/whatsapp") {
  try {
    const body = await readJson(req) as Record<string, unknown>;
    const event = String(body.event ?? "");

    // Só processar eventos de mensagem recebida
    if (event !== "messages.upsert") {
      return ok(res, requestId, 200, { received: true });
    }

    const data = body.data as Record<string, unknown> | undefined;
    const key = data?.key as Record<string, unknown> | undefined;
    const message = data?.message as Record<string, unknown> | undefined;

    // Extrair número do remetente e texto
    const remoteJid = String(key?.remoteJid ?? "");
    const text = String(
      message?.conversation ??
      (message?.extendedTextMessage as Record<string, unknown> | undefined)?.text ??
      ""
    ).trim().toLowerCase();

    // Normalizar o número: remover sufixo @s.whatsapp.net, manter só dígitos
    const phoneRaw = remoteJid.replace(/@.*$/, "");
    const phoneNormalized = phoneRaw.replace(/\D/g, "");

    // Palavras que significam "confirmar"
    const CONFIRM_WORDS = ["sim", "s", "confirmar", "confirmo", "ok", "okay", "yes", "👍"];
    if (!CONFIRM_WORDS.includes(text)) {
      return ok(res, requestId, 200, { received: true });
    }

    // Buscar sessão pendente para este número
    const sessionId = db.pendingConfirmations.get(phoneNormalized);
    if (!sessionId) {
      return ok(res, requestId, 200, { received: true });
    }

    const session = db.sessions.get(sessionId);
    if (!session) {
      db.pendingConfirmations.delete(phoneNormalized);
      return ok(res, requestId, 200, { received: true });
    }

    // Confirmar a sessão
    session.status = "confirmed";
    db.pendingConfirmations.delete(phoneNormalized);
    schedulePersistDatabase();

    // Enviar resposta automática
    const patientPhone = phoneRaw; // já normalizado da Evolution API
    void whatsAppSendText(patientPhone, "✅ Presença confirmada! Te esperamos na sessão.");

    process.stdout.write(`[webhook/whatsapp] Session ${sessionId} confirmed via WhatsApp reply from ${phoneNormalized}.\n`);
  } catch (err) {
    process.stderr.write(`[webhook/whatsapp] Error processing webhook: ${String(err)}\n`);
  }
  return ok(res, requestId, 200, { received: true });
}
```

- [ ] **Step 3: Verificar imports necessários**

No topo de `httpServer.ts`, `whatsAppSendText` e `schedulePersistDatabase` já devem estar importados. Verificar buscando:
```bash
grep -n "whatsAppSendText\|schedulePersistDatabase" apps/ethos-clinic/src/api/httpServer.ts | head -5
```
Se não aparecer `whatsAppSendText`, adicionar ao bloco de imports de `../infra/whatsapp`.

- [ ] **Step 4: Commit**

```bash
git add apps/ethos-clinic/src/api/httpServer.ts
git commit -m "feat(api): POST /webhook/whatsapp — confirmação automática de sessão via resposta WhatsApp"
git push origin main
```

---

## Task 6: Atualizar template padrão na UI para incluir instrução de confirmação

**Files:**
- Modify: `Frontend/src/pages/AccountPage.tsx`

- [ ] **Step 1: Localizar o template padrão no AccountPage**

Buscar por `{patient_name}` no `AccountPage.tsx`. O template padrão é uma string hardcoded usada como placeholder/default.

- [ ] **Step 2: Atualizar o template padrão**

Localizar onde o template default é definido (algo como `DEFAULT_TEMPLATE` ou string com `{patient_name}`). Atualizar para incluir instrução de confirmação:

```ts
const DEFAULT_SESSION_TEMPLATE =
  "Olá {patient_name}, lembrando da sua sessão com {psychologist_name} em {session_date} às {session_time}.\n\nResponda *SIM* para confirmar sua presença.";
```

- [ ] **Step 3: Commit**

```bash
git add Frontend/src/pages/AccountPage.tsx
git commit -m "feat(ui): template de lembrete de sessão inclui instrução de confirmação via WhatsApp"
git push origin main
```

---

## Verificação End-to-End

1. `flyctl status --app ethos-evolution` → status `running`
2. AccountPage → WhatsApp → status "Conectado" (verde)
3. Criar sessão agendada para daqui a `hoursBeforeSession` horas com paciente que tem WhatsApp cadastrado e lembrete habilitado
4. Aguardar worker disparar (ou reduzir `CHECK_INTERVAL_MS` temporariamente para 30s para testar)
5. Mensagem chega no WhatsApp do paciente com "Responda *SIM* para confirmar"
6. Responder "SIM" → no Ethos, sessão muda para status "Confirmada"
7. Auto-reply "✅ Presença confirmada! Te esperamos na sessão." chega no WhatsApp
8. Criar cobrança com `due_date` próximo e paciente com `billing_reminder_days` configurado → lembrete de cobrança chega no WhatsApp

---

## Troubleshooting

**QR code não aparece:** `flyctl logs --app ethos-evolution` para ver erros. Geralmente é problema de volume não montado.

**Webhook não chega:** Verificar URL em `flyctl secrets list --app ethos-evolution` — `WEBHOOK_GLOBAL_URL` deve apontar para o Render. Verificar logs do Render: `POST /webhook/whatsapp` deve aparecer.

**"SIM" não confirma:** Checar `db.pendingConfirmations` — o número normalizado deve estar lá. O webhook pode estar recebendo o número em formato diferente (com/sem código de país). Ver logs do Render para o payload completo.
