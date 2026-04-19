# Financeiro Inteligente — Design Spec
**Data:** 2026-04-18  
**Status:** Aprovado pelo usuário  
**Escopo:** `apps/ethos-clinic` (backend) + `Frontend/` (web)

---

## 1. Contexto e objetivo

O sistema financeiro atual permite criar lançamentos manualmente e marcar como pago. Psicólogos precisam criar cobranças a mão após cada sessão, lembrar de avisar pacientes sobre vencimentos, e não têm visibilidade de inadimplência sem varrer a lista manualmente.

O Financeiro Inteligente resolve isso em três frentes:
- **Geração automática** — lançamento criado ao concluir sessão, se paciente configurado
- **Avisos automáticos** — worker envia WhatsApp/e-mail X dias antes do vencimento
- **Detecção de inadimplência** — alertas visíveis na FinancePage e no dashboard

---

## 2. Modelo de dados

### Novos campos em `Patient`

```ts
// Adicionado ao tipo Patient em domain/types.ts
session_value?: number           // valor padrão da sessão em R$
billing_reminder_days?: number   // dias antes do vencimento para enviar aviso (ex: 2)
billing_auto_charge?: boolean    // true = gera lançamento automático ao concluir sessão
```

> `payment_timing: "advance" | "after"` e `preferred_payment_day?: number` já existem em `Patient` e são usados para calcular `due_date`.

**Cálculo de `due_date`:**
- Se `payment_timing = "advance"`: `due_date = scheduled_at` (dia da sessão)
- Se `payment_timing = "after"` e `preferred_payment_day` definido: próxima ocorrência do dia `preferred_payment_day` no mês após a sessão
- Se `payment_timing = "after"` sem `preferred_payment_day`: `due_date = scheduled_at + 7 dias`

### Novo campo em `FinancialEntry`

```ts
reminder_sent_at?: string   // ISO datetime do último aviso enviado — evita spam
```

---

## 3. Backend

### 3.1 Geração automática na conclusão de sessão

**Gatilho:** `PATCH /sessions/:id/status` com `status = "completed"`

**Lógica:**
1. Busca `Patient` pelo `patient_id` da sessão
2. Se `billing_auto_charge = true` e `session_value` definido:
   - Cria `FinancialEntry` com `type = "receivable"`, `status = "open"`, `amount = session_value`, `due_date` calculado, `session_id` preenchido
   - Retorna `{ pending_billing: false }` na resposta
3. Se `session_value` definido mas `billing_auto_charge != true`:
   - Não cria lançamento
   - Retorna `{ pending_billing: true, suggested_amount: session_value, suggested_due_date: "<ISO>" }` na resposta
4. Se `session_value` não definido:
   - Retorna `{ pending_billing: false }` (nenhuma ação)

### 3.2 `billingReminderWorker`

Novo arquivo: `apps/ethos-clinic/src/application/billingReminderWorker.ts`

- Intervalo: a cada hora (`60 * 60 * 1000` ms)
- Para cada `FinancialEntry` com `status = "open"` e `reminder_sent_at` ausente:
  - Busca o `Patient` do lançamento
  - Se `billing_reminder_days` definido e `due_date - hoje <= billing_reminder_days`:
    - Verifica se paciente tem `whatsapp` cadastrado e WhatsApp está conectado
    - Envia mensagem via `whatsAppSendText` com template configurável
    - Atualiza `reminder_sent_at = now()` no lançamento
- Registra log de erros em `process.stderr` (igual ao `sessionReminderWorker`)
- Exporta `startBillingReminderWorker()` — chamado em `index.ts`

**Template padrão de mensagem:**
```
Olá {patient_name}, lembramos que sua sessão de {session_date} tem cobrança de R$ {amount} com vencimento em {due_date}. Em caso de dúvidas, entre em contato.
```

Tokens: `{patient_name}`, `{amount}`, `{due_date}`, `{psychologist_name}`

### 3.3 Novo endpoint

`GET /financial/summary`

Retorna agregado para o dashboard:
```ts
{
  overdue_count: number      // lançamentos com due_date < hoje e status = "open"
  overdue_total: number      // soma dos amounts vencidos
  due_soon_count: number     // vencendo nos próximos 7 dias, status = "open"
}
```

Calculado on-the-fly filtrando `db.financial`. Requer autenticação clínica.

---

## 4. Frontend

### 4.1 `FinancePage.tsx` — alertas de inadimplência

- **Card de alerta** no topo (antes da lista): aparece apenas se `overdue_count > 0`
  - Fundo vermelho suave, texto: "X cobranças vencidas · R$ Y em aberto"
  - Botão "Ver vencidas" aplica filtro automático
- **Badge "Vencido"** em cada `FinancialEntry` com `due_date < hoje` e `status = "open"`
  - Cor: destructive/vermelho, usando `var(--destructive)`
- **Botão "Enviar cobrança"** em cada lançamento vencido
  - Chama `POST /notifications/whatsapp/send` com mensagem de cobrança manual
  - Desabilitado se paciente não tem WhatsApp cadastrado
- **Filtro "Vencidos"** adicionado aos chips de filtro existentes

### 4.2 `HomePage.tsx` — card de inadimplência

- Novo card de alerta (amarelo/laranja) na seção de resumo
- Texto: "N pacientes com cobrança em atraso" + valor total
- Link → `/financeiro` com filtro "Vencidos" pré-ativo via query param `?filter=overdue`
- Dados via `GET /financial/summary` — chamada separada das demais do dashboard
- Não aparece se `overdue_count = 0`

### 4.3 `BillingConfirmDialog.tsx` — novo componente

Dialog acionado quando backend retorna `pending_billing: true` ao concluir sessão:

```
"Deseja gerar cobrança para {patient_name}?"
Valor: R$ {suggested_amount}
Vencimento: {suggested_due_date}

[Gerar cobrança]  [Agora não]
```

- "Gerar cobrança" → `POST /financial/entry` com os dados sugeridos
- "Agora não" → fecha sem criar lançamento
- Componente em `Frontend/src/components/BillingConfirmDialog.tsx`

### 4.4 `PatientDetailPage.tsx` — configuração de cobrança

Nova seção "Cobrança" na aba de dados do paciente (junto com campos existentes):

| Campo | Tipo |
|-------|------|
| Valor da sessão (R$) | Input numérico |
| Aviso antecipado | Select: "Não enviar" / "1 dia antes" / "2 dias antes" / "3 dias antes" / "7 dias antes" |
| Gerar cobrança automaticamente | Toggle (on/off) |

Salvo via `PATCH /patients/:id` com os novos campos.

---

## 5. Arquivos a modificar / criar

| Arquivo | Mudança |
|---------|---------|
| `apps/ethos-clinic/src/domain/types.ts` | Adicionar `session_value`, `billing_reminder_days`, `billing_auto_charge` em `Patient`; `reminder_sent_at` em `FinancialEntry` |
| `apps/ethos-clinic/src/infra/database.ts` | Nenhuma mudança estrutural — campos extras nos Maps existentes |
| `apps/ethos-clinic/src/api/httpServer.ts` | Lógica de geração automática em `PATCH /sessions/:id/status`; novo `GET /financial/summary`; aceitar novos campos em `PATCH /patients/:id` |
| `apps/ethos-clinic/src/application/billingReminderWorker.ts` | Novo — worker de avisos de cobrança |
| `apps/ethos-clinic/src/index.ts` | Chamar `startBillingReminderWorker()` na inicialização |
| `Frontend/src/pages/FinancePage.tsx` | Card de alerta, badge "Vencido", botão manual, filtro "Vencidos" |
| `Frontend/src/pages/HomePage.tsx` | Card de inadimplência via `/financial/summary` |
| `Frontend/src/components/BillingConfirmDialog.tsx` | Novo — dialog de confirmação de cobrança |
| `Frontend/src/pages/PatientDetailPage.tsx` | Seção "Cobrança" com 3 novos campos |

---

## 6. Verificação

1. Paciente com `session_value = 200` e `billing_auto_charge = true` → concluir sessão → lançamento criado automaticamente com valor e vencimento corretos
2. Paciente com `session_value = 200` e `billing_auto_charge = false` → concluir sessão → `BillingConfirmDialog` aparece com valor sugerido
3. Paciente sem `session_value` → concluir sessão → nenhum dialog, nenhum lançamento
4. Lançamento com `due_date` amanhã e `billing_reminder_days = 2` → worker envia WhatsApp e registra `reminder_sent_at`
5. Worker não reenvia aviso para lançamento que já tem `reminder_sent_at`
6. `GET /financial/summary` retorna contagens corretas de vencidos e a vencer
7. `FinancePage`: card vermelho aparece com total de vencidos; filtro "Vencidos" funciona
8. `HomePage`: card amarelo aparece com link para financeiro; some quando não há vencidos
9. Configuração de cobrança no `PatientDetailPage` salva e reflete nos campos do paciente
