# Evolution API — WhatsApp Lembretes Automáticos

## Contexto

O Ethos já tem o código completo para envio de lembretes via WhatsApp (session reminder worker + billing reminder worker + adapter Evolution API). O que falta é um servidor Evolution API rodando para o sistema ter onde conectar. Adicionalmente, o usuário quer confirmação automática de sessão via resposta do paciente.

## Arquitetura

```
Paciente (WhatsApp)
      ↕
Evolution API (Fly.io — grátis, 24/7)
      ↕ HTTP/REST
Ethos Backend (Render)
  ├─ sessionReminderWorker  → envia lembrete + armazena pendingConfirmation
  ├─ billingReminderWorker  → envia lembrete de cobrança
  └─ POST /webhook/whatsapp ← recebe resposta do paciente → confirma sessão
```

## Parte 1 — Deploy Evolution API no Fly.io

**Imagem oficial:** `athosgalvao/evolution-api:latest`

**Variáveis de ambiente necessárias:**
```
AUTHENTICATION_TYPE=apikey
AUTHENTICATION_API_KEY=<gerado-aleatoriamente>
PORT=8080
DATABASE_ENABLED=false
STORE_MESSAGES=false
STORE_MESSAGE_UP=false
STORE_CONTACTS=false
STORE_CHATS=false
WEBHOOK_GLOBAL_ENABLED=true
WEBHOOK_GLOBAL_URL=https://<ethos-render-url>/webhook/whatsapp
WEBHOOK_GLOBAL_WEBHOOK_BY_EVENTS=true
WEBHOOK_EVENTS_MESSAGES=true
```

**Volume persistente:** `evolution_instances` montado em `/evolution/instances` — garante que o pareamento WhatsApp sobrevive restarts.

**fly.toml mínimo:**
```toml
app = "ethos-evolution"
primary_region = "gru"  # São Paulo

[build]
  image = "athosgalvao/evolution-api:latest"

[env]
  PORT = "8080"

[[services]]
  internal_port = 8080
  protocol = "tcp"
  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]
  [[services.ports]]
    port = 80
    handlers = ["http"]

[mounts]
  source = "evolution_instances"
  destination = "/evolution/instances"
```

**Comandos de deploy:**
```bash
brew install flyctl          # ou scoop install flyctl no Windows
fly auth login
fly apps create ethos-evolution
fly secrets set AUTHENTICATION_API_KEY=<random-32-chars>
fly volumes create evolution_instances --region gru --size 1
fly deploy
```

## Parte 2 — Configuração do Ethos

Após o deploy, no AccountPage → WhatsApp:
- **URL:** `https://ethos-evolution.fly.dev`
- **API Key:** o valor de `AUTHENTICATION_API_KEY`
- **Instance name:** `ethos`

Clicar "Conectar" → escanear QR code → WhatsApp conectado → workers passam a funcionar.

## Parte 3 — Confirmação automática de sessão (novo)

### Fluxo
1. `sessionReminderWorker` envia lembrete e adiciona `phone → session_id` no map `pendingConfirmations`
2. Paciente responde "SIM", "sim", "Confirmar", "ok"
3. Evolution API POST `→ /webhook/whatsapp` com o número e o texto
4. Backend verifica `pendingConfirmations[phone]` → encontra session_id
5. Atualiza `session.status = "confirmed"`
6. Envia resposta automática: "✅ Presença confirmada! Até a sessão."
7. Remove da map

### Template de lembrete atualizado
```
Olá {patient_name}, lembrando da sua sessão com {psychologist_name} em {session_date} às {session_time}.

Responda *SIM* para confirmar sua presença.
```

### Novo endpoint
`POST /webhook/whatsapp` — sem auth (chamado pela Evolution API)

Payload Evolution API (evento `MESSAGES_UPSERT`):
```json
{
  "event": "messages.upsert",
  "data": {
    "key": { "remoteJid": "5511999999999@s.whatsapp.net" },
    "message": { "conversation": "SIM" }
  }
}
```

### Novos campos em memória (database.ts)
```ts
pendingConfirmations: Map<string, string>  // phone → session_id
```

## Arquivos a modificar

| Arquivo | Mudança |
|---|---|
| `fly.toml` | Novo — configuração do deploy Fly.io |
| `apps/ethos-clinic/src/infra/database.ts` | Adicionar `pendingConfirmations` Map |
| `apps/ethos-clinic/src/application/sessionReminderWorker.ts` | Atualizar template + registrar pendingConfirmation ao enviar |
| `apps/ethos-clinic/src/api/httpServer.ts` | Novo endpoint `POST /webhook/whatsapp` |

## Verificação

1. `fly status` → serviço rodando em `https://ethos-evolution.fly.dev`
2. AccountPage → conectar → QR code aparece → escanear → status "Conectado"
3. Criar sessão para amanhã → aguardar worker → mensagem chega no WhatsApp do paciente com "Responda SIM"
4. Responder "SIM" → sessão muda para status "confirmed" no Ethos
5. Cobrança vencendo → lembrete automático chega no WhatsApp do paciente
