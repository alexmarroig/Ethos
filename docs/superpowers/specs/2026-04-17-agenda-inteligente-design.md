# Agenda Inteligente — Design Spec
**Data:** 2026-04-17  
**Status:** Aprovado pelo usuário  
**Escopo:** `apps/ethos-clinic` (backend) + `Frontend/` (web)

---

## 1. Contexto e objetivo

O sistema de agenda atual suporta sessões únicas com drag-and-drop semanal, sem recorrência nem detecção de padrões. Psicólogos precisam reagendar manualmente cada sessão toda semana, mesmo para pacientes com horário fixo.

A Agenda Inteligente resolve isso em três frentes:
- **Recorrência explícita** — o psicólogo configura "Ana, toda terça às 9h, semanal"
- **Geração rolling** — o sistema cria a próxima sessão automaticamente após cada atendimento (nunca gera o ano inteiro de uma vez)
- **Detecção automática** — analisa histórico e sugere padrões sem configuração

---

## 2. Tipos de sessão e recorrência

### Tipos de evento no calendário
| Tipo | Descrição | Visual |
|------|-----------|--------|
| `session` | Sessão clínica com paciente | teal claro / cyan dark |
| `block` | Bloqueio pessoal (almoço, reunião, feriado) | cinza tracejado |
| `other` | Evento genérico | neutro |

> **Futuro (fora de escopo):** sincronização com Google Calendar / Outlook. O tipo `block` é o ponto de integração — mesma entidade, origem diferente.

### Frequências de recorrência
- `weekly` — toda semana no mesmo dia e horário
- `2x-week` — duas vezes por semana (dois dias configuráveis, mesmo horário)
- `biweekly` — quinzenal (a cada 14 dias)
- `adhoc` — sessão única sem padrão (sem recorrência)

---

## 3. Modelo de dados

### Mudanças em `ClinicalSession`

```ts
// Adicionado ao tipo existente em domain/types.ts
type RecurrenceRule = {
  type: "weekly" | "2x-week" | "biweekly"
  days: Array<"monday"|"tuesday"|"wednesday"|"thursday"|"friday">
  time: string          // "HH:MM" — horário fixo da série
  duration_minutes: number
}

// Campos adicionais em ClinicalSession:
recurrence?: RecurrenceRule   // ausente = ad hoc
series_id?: string            // agrupa sessões da mesma série
is_series_anchor?: boolean    // true apenas na primeira sessão da série
event_type?: "session" | "block" | "other"  // default: "session"
block_title?: string          // obrigatório quando event_type = "block"
```

### Entidade `CalendarSuggestion` (em memória, não persistida)
Calculada on-the-fly pelo endpoint `/sessions/suggestions`. Não tem tabela própria.

```ts
type CalendarSuggestion = {
  patient_id: string
  patient_name: string
  suggested_at: string        // ISO datetime da próxima sessão sugerida
  duration_minutes: number
  source: "rule" | "pattern"  // "rule" = série configurada, "pattern" = detectado
  confidence?: number         // 0–100, presente apenas quando source = "pattern"
  series_id?: string          // presente quando source = "rule"
  recurrence_type?: string    // descritivo para exibição
}
```

---

## 4. Backend — novos endpoints

### Novos campos na criação de sessão
`POST /sessions` — aceita os novos campos opcionais:
- `recurrence` — se presente, marca como sessão recorrente e salva `series_id` gerado
- `event_type`, `block_title` — para bloqueios pessoais
- `is_series_anchor: true` — automaticamente definido pelo backend na criação da série

### Geração rolling automática
**Gatilho:** quando `PATCH /sessions/:id/status` define `status = "completed"` e a sessão tem `recurrence` definido:
1. Backend verifica se já existe próxima sessão com mesmo `series_id` agendada no futuro
2. Se não existe → cria nova sessão com `scheduled_at = atual + intervalo da recorrência`
3. Nova sessão herda `recurrence`, `series_id`, `patient_id`, `duration_minutes`
4. `is_series_anchor = false` na sessão gerada

**Janela de geração:** sempre apenas a próxima sessão (rolling). Nunca gera mais de uma à frente.

### Endpoint de sugestões
`GET /sessions/suggestions?week_start=<ISO date>`

Retorna sugestões para a semana iniciando em `week_start`:

**Lógica:**
1. **Source "rule"** — busca sessões com `recurrence` definido cuja próxima ocorrência cai na semana alvo e ainda não foi confirmada (não existe sessão com mesmo `series_id` nessa semana)
2. **Source "pattern"** — para pacientes SEM `recurrence` configurado: agrupa sessões por `patient_id`, calcula moda de dia-da-semana + horário + intervalo, retorna sugestão se confiança ≥ 70% e histórico ≥ 3 sessões

**Algoritmo de detecção (sem ML):**
```
Para cada paciente sem recorrência explícita:
  sessions = listar sessões completed ordenadas por data desc (últimas 12)
  se sessions.length < 3 → ignorar
  
  intervalos = [diff em dias entre sessões consecutivas]
  intervalo_modal = moda(intervalos)  // 7, 14, etc.
  
  dias = sessions.map(s => dayOfWeek(s.scheduled_at))
  dia_modal = moda(dias)
  
  horários = sessions.map(s => timeOfDay(s.scheduled_at))
  horario_modal = moda(horários)
  
  sessoes_no_padrão = sessions.filter(s =>
    dayOfWeek(s) === dia_modal &&
    timeOfDay(s) === horario_modal
  )
  confiança = (sessoes_no_padrão.length / sessions.length) * 100
  
  se confiança >= 85 → source "pattern", exibe como sugestão confirmável
  se confiança >= 70 → source "pattern", exibe com aviso "detectado"
  se confiança < 70 → não exibe
```

---

## 5. Frontend — componentes

### 5.1 `AgendaPage.tsx` — alterações

**Painel lateral de sugestões:**
- Aparece à direita do grid (coluna fixa de 240px)
- Título "✨ Próxima semana" + contador
- Cards com borda esquerda: teal = série configurada, amarelo = detectado pelo histórico
- Botões "Confirmar" (chama `POST /sessions` com os dados sugeridos) e "✗" (dismiss local)
- Dismiss persiste apenas na sessão — na próxima visita a sugestão reaparece se ainda não confirmada

**Sessões recorrentes no grid:**
- Badge "🔁 semanal / 2×semana / quinzenal" no card
- Visual: background teal claro (light) / cyan escuro (dark), mesma estrutura de card atual
- Bloqueios: background cinza tracejado, título livre

**Drag-and-drop (comportamento existente mantido):**
- Sessão remanejada vira "exceção" da série: `series_id` mantido, `scheduled_at` alterado
- A série continua gerando próximas sessões no horário original
- Não propaga o remarcamento para outras sessões da série

### 5.2 `SessionDialog.tsx` — novo componente (extraído de AgendaPage)

Dialog unificado para criar sessão ou bloqueio:

**Campos:**
1. **Tipo** — pills: `🧠 Sessão clínica` | `⊘ Bloqueio` | `📋 Outro`
2. Se `Sessão clínica`:
   - Paciente (select)
   - Data inicial + Horário
   - Toggle "Sessão recorrente" (off por padrão)
   - Se toggle on → pills: `Semanal` | `2× semana` | `Quinzenal`
   - Se `2× semana` → seletor de dois dias da semana
   - Resumo automático: "Toda terça-feira às 09:00"
   - Nota: "Próxima sessão gerada automaticamente após cada atendimento"
   - Botão: "Iniciar série recorrente" / "Agendar sessão"
3. Se `Bloqueio`:
   - Título (texto livre)
   - Data + Horário + Duração
   - Botão: "Salvar bloqueio"

### 5.3 Mobile — `AgendaPage` responsiva

**Breakpoint mobile:** `< 768px`

- Grid semanal → **lista de sessões por dia**
- Strip horizontal de dias no topo (rolável), dia ativo destacado com pill primary
- Sugestões aparecem como card inline no topo da lista do dia
- Tela separada "Sugestões" acessível via badge no header
- Touch drag-to-reschedule: `onTouchStart` + `onTouchMove` + `onTouchEnd` para mover entre dias (mantém a mesma lógica de `moveSession`)
- Bottom navigation (substitui sidebar): Início | Agenda | Pacientes | Formulários | Mais

### 5.4 Dark mode

Usa as variáveis CSS já existentes em `index.css`. Nenhuma cor hardcoded — todos os componentes novos usam `var(--primary)`, `var(--border)`, `var(--card)`, etc. O dark mode é automático via classe `.dark` no `<html>`.

---

## 6. Responsivo — app inteiro (spec separado)

A agenda define o padrão de responsividade para todo o Ethos Web:

| Padrão desktop | Padrão mobile |
|---------------|---------------|
| Sidebar lateral | Bottom navigation (5 itens) |
| Grid/tabela | Lista vertical com cards |
| `<Dialog>` | Sheet que sobe de baixo (`vaul` ou similar) |
| Calendário semanal | Lista de dia com strip |
| Formulários em colunas | Campos empilhados |

Implementação para as demais páginas (Pacientes, Financeiro, Diário, Anamnese, etc.) será planejada em spec próprio após a agenda.

---

## 7. Arquivos a modificar / criar

| Arquivo | Mudança |
|---------|---------|
| `apps/ethos-clinic/src/domain/types.ts` | Adicionar `RecurrenceRule`, `CalendarSuggestion`, campos em `ClinicalSession` |
| `apps/ethos-clinic/src/infra/database.ts` | Persistência dos novos campos (Maps existentes, campos extras) |
| `apps/ethos-clinic/src/application/service.ts` | `generateNextSession`, `detectPatterns`, `listSuggestions` |
| `apps/ethos-clinic/src/api/httpServer.ts` | `GET /sessions/suggestions`, lógica rolling em `PATCH /:id/status` |
| `Frontend/src/pages/AgendaPage.tsx` | Painel de sugestões, lógica mobile, sessões recorrentes no grid |
| `Frontend/src/components/SessionDialog.tsx` | Novo — dialog unificado extraído de AgendaPage |
| `Frontend/src/services/sessionService.ts` | Adicionar `getSuggestions(weekStart)`, campos de recorrência no `create` |
| `Frontend/src/index.css` | Media queries para bottom nav e layout mobile |

---

## 8. Verificação

1. Criar sessão recorrente semanal → aparece com badge 🔁 no calendário
2. Marcar sessão como concluída → nova sessão criada automaticamente na semana seguinte
3. Drag-and-drop de sessão recorrente → apenas aquela sessão muda, série mantida
4. Criar bloqueio "Almoço" → aparece em cinza tracejado, não confunde com sessão
5. Abrir `/sessions/suggestions` → retorna sugestões da próxima semana
6. Paciente com 6+ sessões toda terça → detectado com ≥ 85% confiança, aparece no painel
7. Confirmar sugestão no painel → sessão criada e aparece no calendário
8. Em mobile (< 768px): grid some, aparece lista de dia com strip de navegação
9. Dark mode: todos os novos elementos seguem a paleta dark automaticamente
10. 2× semana → dois dias configuráveis, ambas as sessões aparecem na semana certa
