# Spec: Pacotes Terapêuticos por Abordagem Clínica
**Data:** 2026-04-28  
**Status:** Aprovado — aguardando implementação

---

## Contexto e Objetivo

O Ethos atende psicólogos de diversas abordagens clínicas (TCC, DBT, ACT, Analítica, etc.). Hoje o produto é neutro — as mesmas escalas, formulários e templates são oferecidos para todos. A oportunidade é tornar o Ethos **consciente da abordagem** de cada psicólogo e de cada paciente, entregando automaticamente as ferramentas certas para aquela prática clínica específica.

**Objetivo:** quando o psicólogo define a abordagem de um paciente, o sistema carrega automaticamente escalas, fichas de homework, template de prontuário, diário específico e materiais psicoeducativos daquela abordagem — sem que o psicólogo precise procurar nada.

**Posicionamento:** "O único sistema clínico que entende a sua abordagem — não apenas a sua agenda."

---

## Decisões de Produto

- **Fora de escopo:** teleconsulta, mensagens bidirecionais.
- **Conteúdo base:** curado e mantido pelo time Ethos, bloqueado para edição (`is_locked: true`).
- **Customização:** psicólogo pode criar conteúdo próprio por cima da base, usando a infraestrutura de formulários já existente.
- **Monetização:** preparado para gating por entitlement (Opção C futura) via `EntitlementsContext` já existente — hoje todos os pacotes são `free`.
- **Abordagem por paciente:** o psicólogo pode ter múltiplas abordagens no perfil; cada paciente recebe uma abordagem principal.

---

## Abordagens Suportadas (v1)

10 abordagens cobrindo o mercado brasileiro:

| ID | Nome |
|----|------|
| `tcc` | TCC — Terapia Cognitivo-Comportamental |
| `dbt` | DBT — Terapia Comportamental Dialética |
| `act` | ACT — Terapia de Aceitação e Compromisso |
| `psicanalitica` | Psicanálise (Freudiana / Lacaniana) |
| `analitica` | Psicologia Analítica (Junguiana) |
| `gestalt` | Gestalt |
| `emdr` | EMDR |
| `esquema` | Esquema-Terapia |
| `humanista` | Humanista / Centrada na Pessoa |
| `sistemica` | Sistêmica / Terapia Familiar e de Casais |
| `logoterapia` | Logoterapia / Existencial |

---

## Conteúdo de Cada Pacote

### TCC
- **Escalas:** PHQ-9, GAD-7, BDI-II, BAI, DAS
- **Template prontuário:** Agenda → Revisão de humor → Revisão de tarefa → Conteúdo → Nova tarefa → Feedback
- **Fichas paciente:** Registro de Pensamentos (situação→pensamento→emoção→comportamento), Diário de Atividades, Experimento Comportamental, Ficha de Crenças
- **Diário paciente:** Registro de Pensamentos Automáticos (RPD)
- **Psicoeducativo:** O modelo cognitivo, As distorções cognitivas, Como emoções funcionam

### DBT
- **Escalas:** DERS, BSL-23
- **Template prontuário:** Diary Card review → Análise em cadeia → Habilidade trabalhada → Plano
- **Fichas paciente:** Diary Card, DEAR MAN, GIVE, FAST, TIP, TIPP, PLEASE, Tolerância ao Mal-estar, Mindfulness
- **Diário paciente:** Diary Card diário (emoções, comportamentos-alvo, habilidades usadas)
- **Psicoeducativo:** Os 4 módulos DBT, Mindfulness básico, O que é dialética

### ACT
- **Escalas:** AAQ-II, CFQ, VLQ, CAMS-R
- **Template prontuário:** Hexaflex (aceitação, defusão, presente, self, valores, ação comprometida)
- **Fichas paciente:** Identificação de Valores, Ficha de Defusão, Comprometimento com Valores, Roda dos Valores
- **Diário paciente:** Diário de Valores e Comprometimento
- **Psicoeducativo:** O Hexaflex, O que é ACT, Metáforas ACT

### Psicanálise
- **Escalas:** RF Scale (Funcionamento Reflexivo)
- **Template prontuário:** Associação livre observada, Transferência/Contratransferência, Resistências, Material onírico
- **Fichas paciente:** Registro de sonhos (livre), Registro de associações espontâneas
- **Diário paciente:** Diário de sonhos + associações livres
- **Psicoeducativo:** Mínimo — a psicanálise evita psicoeducação diretiva

### Analítica (Junguiana)
- **Escalas:** Inventário de Tipos Psicológicos, Inventário de Símbolos
- **Template prontuário:** Amplificação de símbolo, Arquétipos presentes, Complexos ativos, Material onírico, Tipos psicológicos
- **Fichas paciente:** Registro de Sonho (tema/personagens/símbolos/emoções/associações), Identificação de Arquétipos, Imaginação Ativa, Mandala
- **Diário paciente:** Diário de Sonhos com análise simbólica + Diário de Imaginação Ativa
- **Psicoeducativo:** O que são arquétipos, Persona e Sombra, O que são complexos, Os principais arquétipos

### Gestalt
- **Escalas:** Questionários de Awareness e Contato
- **Template prontuário:** Figura-Fundo, Contato e Resistências, Experimento realizado, Campo terapêutico
- **Fichas paciente:** Roda de Necessidades, Registro de Awareness, Carta à Cadeira Vazia (escrita)
- **Diário paciente:** Diário de Awareness e Presença
- **Psicoeducativo:** Ciclo de Contato, O que é Awareness, Fronteiras de contato

### EMDR
- **Escalas:** PCL-5, IES-R, SUD, VOC
- **Template prontuário:** Protocolo 8 fases, Memória-alvo, Cognição Negativa/Positiva, SUD/VOC por sessão
- **Fichas paciente:** Lugar Seguro (ancoragem), Registro de reações pós-sessão, Contenção entre sessões
- **Diário paciente:** Diário de processamento pós-sessão
- **Psicoeducativo:** O que é EMDR, As 8 fases, O que esperar após a sessão

### Esquema-Terapia
- **Escalas:** YSQ (Young Schema Questionnaire), SMI (Schema Mode Inventory)
- **Template prontuário:** Esquemas ativos, Modos identificados, Intervenções usadas
- **Fichas paciente:** Identificação de Esquemas, Flashcard de Modos, Registro de Ativação de Esquema
- **Diário paciente:** Diário de Modos
- **Psicoeducativo:** Os 18 esquemas, O que são modos, Como esquemas se formam

### Humanista / Centrada na Pessoa
- **Escalas:** CORE-OM, OQ-45, Escala de Autoeficácia
- **Template prontuário:** Presença, Empatia, Aceitação incondicional, Congruência, Processo de mudança
- **Fichas paciente:** Roda da Vida, Registro de Crescimento Pessoal, Autoconceito
- **Diário paciente:** Diário de Autoexploração
- **Psicoeducativo:** As 3 condições de crescimento, O que é autenticidade

### Sistêmica / Familiar
- **Escalas:** FACES-IV, FAD, DAS (casais)
- **Template prontuário:** Genograma, Padrões de comunicação, Subsistemas, Hipótese sistêmica
- **Fichas paciente:** Genograma para preencher, Registro de padrões de interação, Tarefa sistêmica
- **Diário paciente:** Diário de Relações
- **Psicoeducativo:** Pensamento sistêmico, Papéis familiares, Comunicação não-violenta

### Logoterapia / Existencial
- **Escalas:** PIL (Propósito de Vida), MLQ (Sentido de Vida)
- **Template prontuário:** Sentido encontrado/buscado, Valores vivenciais/criativos/de atitude
- **Fichas paciente:** Identificação de Valores, Carta ao Futuro Eu, "O que me dá sentido?"
- **Diário paciente:** Diário de Sentido e Propósito
- **Psicoeducativo:** O triângulo trágico, Os 3 tipos de valores, Paradoxo da intenção

---

## Modelo de Dados

### Novos campos em entidades existentes

```typescript
// Psychologist (AccountPage)
abordagens: Approach[]   // multi-select, substituí o campo abordagem clínica atual

// Patient (PatientDetailPage > aba Perfil)
abordagem: Approach | null   // campo novo, filtrado pelas abordagens do psicólogo
```

### Nova entidade: PackageContent

```typescript
interface PackageContent {
  id: string
  approach: Approach
  type: 'scale' | 'note_template' | 'homework' | 'diary' | 'psychoeducational'
  title: string
  content: object          // estrutura varia por type
  is_locked: boolean       // true = base Ethos, false = criado pelo psicólogo
  psychologist_id?: string // presente quando is_locked = false
  entitlement: 'free' | 'pro' | `pkg_${Approach}`  // gancho monetização futura
  created_at: string
}
```

O `entitlement` é sempre `'free'` na v1. Quando monetização for implementada, basta alterar o valor — o `EntitlementsContext` já existente no frontend bloqueia automaticamente.

---

## Arquitetura — Sem Nova Infraestrutura

Reutiliza integralmente o que já existe:

| Infraestrutura existente | Papel nos pacotes |
|--------------------------|-------------------|
| `FormService` + `FormsPage` | Serve as fichas de homework |
| `ScalesPage` | Serve as escalas, agora filtradas por abordagem |
| `ProntuarioPage` | Carrega template da abordagem ao criar nota |
| `PatientDiaryPage` | Exibe diário primário baseado na abordagem |
| `DocumentsPage` | Lista materiais psicoeducativos para compartilhar |
| `EntitlementsContext` | Gating de pacotes por entitlement (v2) |
| `AccountPage` | Campo de abordagens do psicólogo |
| `PatientDetailPage` | Campo de abordagem do paciente |

---

## Fluxo Completo

```
1. Psicólogo configura perfil (AccountPage)
   └── seleciona suas abordagens: ex. TCC + DBT

2. Psicólogo abre paciente (PatientDetailPage > Perfil)
   └── campo "Abordagem Terapêutica"
       dropdown filtrado pelas abordagens do psicólogo
       preview do pacote ao selecionar
   └── clica [Ativar pacote DBT]
       toast: "Pacote DBT ativado."

3. Psicólogo usa ferramentas
   ├── FormsPage / ScalesPage
   │     seção "📦 Pacote DBT" no topo com escalas/fichas em destaque
   │     botão [Atribuir ao paciente] em cada item
   ├── ProntuarioPage (nova nota)
   │     modal: "Usar template DBT?" → [Usar] [Começar em branco]
   └── DocumentsPage
         seção "Materiais — Pacote DBT" com botão [Compartilhar]

4. Paciente abre portal
   ├── PatientHomePage
   │     seção "Para fazer antes da próxima sessão"
   │     lista fichas atribuídas pelo psicólogo
   ├── PatientDiaryPage
   │     diário primário = Diary Card (DBT)
   │     diário genérico continua acessível abaixo
   └── Materiais recebidos aparecem em PatientDocumentsPage
```

---

## Diário Primário por Abordagem (Portal Paciente)

| Abordagem | Diário primário |
|-----------|----------------|
| TCC | Registro de Pensamentos Automáticos |
| DBT | Diary Card |
| ACT | Diário de Valores e Comprometimento |
| Psicanálise | Diário de Sonhos + Associações |
| Analítica | Diário de Sonhos com análise simbólica |
| Gestalt | Diário de Awareness |
| EMDR | Diário de Processamento pós-sessão |
| Esquema | Diário de Modos |
| Humanista | Diário de Autoexploração |
| Sistêmica | Diário de Relações |
| Logoterapia | Diário de Sentido |

O diário genérico existente permanece sempre acessível — a abordagem define apenas qual aparece primeiro e em destaque.

---

## UI — Componentes Novos

| Componente | Localização | Descrição |
|-----------|-------------|-----------|
| `ApproachMultiSelect` | AccountPage | Chips selecionáveis das 10 abordagens |
| `PatientApproachSelector` | PatientDetailPage > Perfil | Dropdown + preview do pacote + botão ativar |
| `PackageSectionHeader` | FormsPage, ScalesPage | Banner "📦 Pacote [Abordagem]" no topo |
| `PackageContentCard` | FormsPage, ScalesPage | Card de escala/ficha com botão [Atribuir] |
| `NoteTemplatePrompt` | ProntuarioPage | Modal "Usar template [Abordagem]?" |
| `PsychoeducationalSection` | DocumentsPage | Seção de materiais do pacote |
| `HomeworkWidget` | PatientHomePage | "Para fazer antes da próxima sessão" |

---

## Comportamento da Ativação

**Ativar um pacote NÃO atribui conteúdo automaticamente ao paciente.** Ativar apenas:
- Carrega as escalas e fichas do pacote em destaque no `FormsPage` / `ScalesPage`
- Sugere o template de prontuário ao abrir nova nota
- Disponibiliza os materiais psicoeducativos em `DocumentsPage`
- Define o diário primário no portal do paciente

O psicólogo decide o que atribuir a cada paciente clicando em [Atribuir] individualmente. Isso preserva o controle clínico.

**Troca de abordagem mid-tratamento:** todo conteúdo anterior (fichas atribuídas, notas, diários) permanece intacto. A nova abordagem passa a ser destacada nas telas a partir da troca. Não há deleção de dados.

---

## O Que Não Muda

- Psicólogos sem abordagem definida: experiência atual inalterada
- Pacientes sem abordagem: nenhuma mudança no portal
- Biblioteca geral de escalas e formulários: sempre acessível abaixo das seções de pacote
- Dados existentes de prontuários, sessões, financeiro: não afetados

---

## Preparação para Monetização (Opção C)

Quando o time quiser monetizar pacotes:
1. Alterar `entitlement` dos `PackageContent` desejados de `'free'` para `'pkg_dbt'` etc.
2. Adicionar os entitlements no `EntitlementsContext` (já existe)
3. Envolver `PackageSectionHeader` e `PatientApproachSelector` com `<RoleGate>` (já existe)

Nenhuma rearquitetura necessária.

---

## Fora de Escopo (v1)

- Teleconsulta / videochamada
- Mensagens bidirecionais paciente-psicólogo
- Múltiplas abordagens por paciente (v1 = uma abordagem por paciente)
- Geração automática de conteúdo de pacote via IA (pode ser v2)
- Marketplace de pacotes de terceiros
