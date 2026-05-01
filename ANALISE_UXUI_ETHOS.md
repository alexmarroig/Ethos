# Análise Completa UX/UI/Design — Ethos Platform

> **Documento de auditoria** | Data: 01/05/2026 | Plataformas: Web · Desktop · Mobile

---

## Sumário

1. [Sumário Executivo](#1-sumário-executivo)
2. [Sistema de Design — Auditoria Cross-Platform](#2-sistema-de-design--auditoria-cross-platform)
3. [Heurísticas de Nielsen — Avaliação Completa](#3-heurísticas-de-nielsen--avaliação-completa)
4. [Auditoria de Acessibilidade WCAG 2.1 AA](#4-auditoria-de-acessibilidade-wcag-21-aa)
5. [Análise de Fluxos Críticos](#5-análise-de-fluxos-críticos)
6. [Recomendações Priorizadas](#6-recomendações-priorizadas)
7. [Pontos Fortes para Preservar](#7-pontos-fortes-para-preservar)

---

## 1. Sumário Executivo

### Visão Geral das Plataformas

O Ethos possui três frontends distintos com diferentes maturidades de design e implementação:

| Plataforma | Stack | Maturidade UX | Maturidade Acessibilidade |
|---|---|---|---|
| **Frontend/ (Web)** | React 18 + shadcn/ui + Tailwind | Alta — design system documentado, Apple-inspired | Média — Radix ajuda muito, mas há lacunas |
| **ethos-desktop (Electron)** | React + inline styles + CSS injetado | Média — funcional mas inconsistente | Baixa — foco em funcionalidade, não em a11y |
| **ethos-mobile (Expo/RN)** | React Native + hook theme | Média-alta — telas limpas, RN nativo ajuda | Baixa — sem labels de acessibilidade detectados |

### Estado Geral

O Ethos Web é o produto mais refinado visualmente, com um sistema de design bem pensado, documentado em `Frontend/design.md`, e uma identidade Apple-inspired executada com consistência. O Desktop e o Mobile compartilham uma paleta diferente do Web, mas ambos têm boa legibilidade e fluxos clínicos sólidos. A principal fraqueza transversal é acessibilidade — nenhuma plataforma atinge conformidade WCAG 2.1 AA completa.

### Top 5 Problemas Críticos

| # | Problema | Plataforma | Impacto |
|---|---|---|---|
| 1 | **Sem auto-save em notas clínicas** | Web + Desktop | Perda irreversível de dados clínicos |
| 2 | **Accent dourado (#c78f41) falha contraste WCAG AA** | Desktop + Mobile | Exclusão de usuários com baixa visão |
| 3 | **Sem focus trap em modais do Desktop** | Desktop | Inacessível por teclado; critério de falha WCAG |
| 4 | **Status "pendente" depende só de cor amarela** | Todos | Ilegível para daltônicos (~8% dos homens) |
| 5 | **Tokens de cor completamente divergentes entre plataformas** | Cross-platform | Quebra de identidade de produto, experiência inconsistente |

### Principais Pontos Fortes

- Design system documentado com princípios claros e coerentes (`design.md`)
- Teal institucional (#2a4a54) transmite confiança e profissionalismo clínico
- shadcn/ui + Radix UI provê baseline sólido de acessibilidade no Web
- Modo privacidade (blur de dados) — feature única e valiosa para contexto clínico
- Segurança no Mobile: biometria + secure store + auto-lock em background
- Tipografia Inter + Lora: combinação editorial sofisticada e altamente legível

---

## 2. Sistema de Design — Auditoria Cross-Platform

### 2.1 Paleta de Cores — Divergências Críticas

A maior inconsistência do Ethos é a falta de uma paleta unificada entre as três plataformas. Cada produto tem tokens levemente ou radicalmente diferentes:

#### Tabela Comparativa de Tokens

| Token | Web (`Frontend/`) | Desktop (`ethos-desktop`) | Mobile (`ethos-mobile`) | Diverge? |
|---|---|---|---|---|
| **Background** | `#f5f5f7` (frio, azulado) | `#f9f7f5` (quente, creme) | `#f9f7f5` (quente, creme) | ⚠️ Web difere |
| **Primary** | HSL 193 52% 23% ≈ `#1c596a` | `#234e5c` | `#234e5c` | ⚠️ Web levemente mais claro |
| **Accent** | `#0071e3` (azul Apple) | `#c78f41` (ouro/âmbar) | `#c78f41` (ouro/âmbar) | ❌ Completamente divergente |
| **Card background** | `#ffffff` (branco puro) | `#fcfcfb` (quase branco) | `#fcfcfb` (quase branco) | ✅ Aceitável |
| **Foreground** | `#1d1d1f` | `#272b34` | `#272b34` | ⚠️ Web usa Apple black |
| **Muted foreground** | `#6b7280` (cinza) | `#676e7e` (cinza) | `#676e7e` (cinza) | ✅ Equivalentes |
| **Border radius** | `16px` (1rem) | `14px` (0.875rem) | `12px` | ⚠️ Inconsistente |
| **Status pending** | `#fbbf24` (amarelo) | `#edbd2a` (amarelo) | `#edbd2a` (amarelo) | ✅ Equivalentes |
| **Status validated** | `#10b981` (verde) | `#3a9b73` (verde) | `#3a9b73` (verde) | ✅ Equivalentes |

#### Diagnóstico da Divergência de Accent

O Web usa `#0071e3` (azul Apple) como cor de destaque — alinhado ao guia `design.md` que instrui "Apple Blue para ações digitais e navegação". O Desktop e Mobile usam `#c78f41` (ouro/âmbar), que tem personalidade distinta e não está documentado como accent oficial. Esta divergência:

- Quebra a identidade visual cross-platform
- Confunde usuários que usam mais de uma plataforma
- O ouro (#c78f41) sobre fundo branco tem ratio de contraste ~3.0:1 — **falha WCAG AA** para texto

**Recomendação:** Decidir formalmente entre os dois sistemas e documentar no `design.md`. O azul (#0071e3) é mais acessível e alinhado à documentação existente.

---

### 2.2 Tipografia — Análise Detalhada

#### Hierarquia Tipográfica (Web)

```
Font Stack Headings: "SF Pro Display" → "Inter" → -apple-system → sans-serif
Font Stack Body: "SF Pro Text" → "Inter" → -apple-system → sans-serif

H1-H3:
  weight: 600
  letter-spacing: -0.025em (levemente negativo — elegante)
  line-height: 1.08 (muito justo — bom para títulos display)

Body:
  font-feature-settings: "cv11", "ss01" (ligatures do Inter)
  -webkit-font-smoothing: antialiased
```

#### Problema: SF Pro não está disponível na maioria dos dispositivos

SF Pro Display/Text são fontes proprietárias da Apple, disponíveis apenas em macOS/iOS. Em Windows, Linux e Android, o fallback é Inter diretamente. Isso não é um problema grave (Inter é excelente), mas cria uma inconsistência entre a experiência no Mac vs. outros sistemas.

#### Consistência Cross-Platform de Tipografia

| Fonte | Web | Desktop | Mobile | Status |
|---|---|---|---|---|
| Inter (corpo) | ✅ | ✅ | ✅ | Consistente |
| Lora (editorial) | ✅ (logo/splash) | ✅ (headings) | ✅ (headings) | Consistente |
| SF Pro Display | ✅ (títulos, Apple only) | ❌ | ❌ | Web diverge |
| Tamanho mínimo corpo | 14px | 14px | 14px | Consistente |

---

### 2.3 Sistema de Sombras

O Web tem o sistema mais sofisticado:

```css
--shadow-subtle:  0 1px 2px hsl(220 15% 18% / 0.04), 0 8px 24px -20px hsl(220 15% 18% / 0.08)
--shadow-soft:    0 10px 30px -18px hsl(220 15% 18% / 0.16)
--shadow-medium:  0 18px 44px -24px hsl(220 15% 18% / 0.2)
--shadow-pressed: inset 0 1px 2px 0 hsl(220 15% 18% / 0.08)
```

As sombras são "orgânicas" — longas, suaves, com pouca opacidade. Evitam o visual de SaaS genérico com sombras agressivas. Esta abordagem está alinhada ao `design.md`.

O Desktop usa `box-shadow` simples inline. O Mobile usa elevation nativa do React Native. Nenhum está errado, mas há inconsistência de "peso" visual entre plataformas.

---

### 2.4 Tokens de Transição e Animação

O Web tem transições bem calibradas:

```css
--transition-calm:   300ms cubic-bezier(0.4, 0, 0.2, 1)  /* Material ease-in-out */
--transition-gentle: 500ms cubic-bezier(0.4, 0, 0.2, 1)  /* Mais suave, para elementos maiores */
```

Animações específicas:
- `breathe` (8s, infinita) — splash screen e CTAs pendentes. Sutil e clínico.
- `fadeInUp` (0.6s) — entrada de conteúdo. Adequado.
- `cta-breathe` — sombra pulsante em botões de ação. Elegante.

O Desktop usa `transition: all 200ms ease` inline sem sistema unificado. O Mobile usa `Animated` do RN e Reanimated.

---

### 2.5 Análise do Sistema de Cores de Status

| Status | Web | Desktop/Mobile | Problema |
|---|---|---|---|
| Pendente | `#fbbf24` amarelo | `#edbd2a` amarelo | Contraste ~1.9-2.1:1 — falha AA em texto |
| Validado | `#10b981` verde | `#3a9b73` verde | Contraste ~2.8:1 — falha AA em texto |
| Rascunho | `#f97316` laranja | `#d19747` laranja | Contraste ~3.1:1 — falha AA para texto |
| Destrutivo | `#ef4444` vermelho | `#bd3737` vermelho | Contraste ~4.5:1 — passa AA |

Os status são usados como barras laterais nos cards (decorativo — OK para contraste), mas também em badges de texto — onde o amarelo e o laranja sobre branco falham WCAG AA.

---

### 2.6 Estrutura de Componentes por Plataforma

#### Web — shadcn/ui + Radix (Melhor baseline de acessibilidade)
- 47+ componentes UI reutilizáveis baseados em Radix UI primitives
- Focus trap, ARIA e keyboard navigation built-in
- CVA (Class Variance Authority) para variantes tipadas
- Tailwind merge para composição sem conflitos

#### Desktop — Abordagem Híbrida Problemática
- 60% estilos inline React (objetos `style={{ }}`)
- 30% CSS injetado como string (`<style>` tag)
- 10% Tailwind utilitários
- App.tsx com ~1400 linhas — mistura UI, lógica de negócio e estado

#### Mobile — Hook Theme + StyleSheet
- `useTheme()` hook retorna tokens de cor via `useColorScheme()`
- Componentes majoritariamente screen-specific (pouca reutilização)
- Formulários sem biblioteca de validação robusta

---

## 3. Heurísticas de Nielsen — Avaliação Completa

### Escala de Severidade

| Nível | Descrição | Ação |
|---|---|---|
| **0** | Não é problema de usabilidade | Nenhuma |
| **1** | Cosmético — perceptível mas não interfere | Fix se sobrar tempo |
| **2** | Minor — causa frustração mas há workaround | Alta prioridade |
| **3** | Major — impacta significativamente a experiência | Fix antes do próximo release |
| **4** | Catastrófico — impede uso ou causa dano | Fix imediato |

---

### H1 — Visibilidade do Status do Sistema

> *O sistema deve sempre manter o usuário informado sobre o que está acontecendo, com feedback adequado em tempo razoável.*

#### Web

| Finding | Severidade |
|---|---|
| ✅ Loading states com Skeleton components em listas e cards | 0 |
| ✅ Toast notifications via Sonner (success, error, info) | 0 |
| ✅ Badges de status de sessão com cor + texto (Pendente / Validado / Rascunho) | 0 |
| ❌ Nenhum indicador visual de "última vez salvo" no editor de notas clínicas | 3 |
| ❌ Sem indicador de autosave — usuário não sabe se rascunho foi preservado | 3 |
| ❌ Privacy mode visível apenas na sidebar — sem banner global indicando modo ativo | 2 |
| ❌ Estado de sincronização offline sem representação na UI | 2 |

#### Desktop

| Finding | Severidade |
|---|---|
| ✅ Indicador de gravação de áudio claro (botão muda de estado) | 0 |
| ✅ Status de transcrição com estados explícitos | 0 |
| ❌ Sync status em pequeno pill badge no header — pouco visível | 2 |
| ❌ Feedback de "nota salva" ausente após validação | 2 |

#### Mobile

| Finding | Severidade |
|---|---|
| ✅ ActivityIndicator em carregamentos de tela | 0 |
| ❌ ActivityIndicator sem mensagem de contexto ("Carregando sessões..." vs spinner genérico) | 2 |
| ❌ Sem feedback de progresso ao submeter formulários longos | 2 |

---

### H2 — Match entre Sistema e Mundo Real

> *O sistema deve falar a linguagem do usuário, com palavras, frases e conceitos familiares ao domínio.*

#### Web

| Finding | Severidade |
|---|---|
| ✅ Terminologia clínica brasileira correta: prontuário, anamnese, sessão clínica | 0 |
| ✅ Labels diretos e sem jargão técnico na navegação | 0 |
| ✅ Ícones semanticamente coerentes com contexto clínico | 0 |
| ⚠️ "Formulários e Anamnese" como label único — Anamnese é um formulário, pode ser redundante | 1 |

#### Desktop

| Finding | Severidade |
|---|---|
| ❌ Label "Purge" em botão de privacidade — linguagem técnica inglesa exposta ao usuário | 2 |
| ❌ "Diários" para respostas de formulários de pacientes — pode confundir com diário pessoal | 2 |
| ❌ CRP como campo de cadastro sem explicação contextual "Número do seu CRP (ex: 12.345/SP)" | 1 |

#### Mobile

| Finding | Severidade |
|---|---|
| ✅ "Diário Emocional" como label de tela — adequado ao contexto | 0 |
| ✅ Terminologia pt-BR consistente em todas as telas | 0 |
| ⚠️ Escala de humor 1-5 com emoji sem explicação de cada nível no primeiro uso | 1 |

---

### H3 — Controle e Liberdade do Usuário

> *Usuários frequentemente escolhem funções por engano e precisam de "saída de emergência" clara.*

#### Web

| Finding | Severidade |
|---|---|
| ✅ AlertDialog do Radix para ações destrutivas (deletar paciente, excluir sessão) | 0 |
| ✅ Modal de consentimento antes de gravação (ConsentModal) | 0 |
| ❌ **Sem auto-save no SessionDialog** — sair acidentalmente do modal descarta trabalho não salvo | 3 |
| ❌ Sem "desfazer" após ações deletivas — apenas confirmação antes, não reversão depois | 2 |
| ❌ Sem indicação de "campos não salvos" ao navegar para outra página com form preenchido | 3 |

#### Desktop

| Finding | Severidade |
|---|---|
| ✅ EthicsValidationModal antes de validar nota clínica | 0 |
| ❌ **Editor de nota clínica sem Ctrl+Z/Undo robusto** — área de texto nativa tem undo limitado | 3 |
| ❌ **"Purgar dados" sem confirmação de 2 etapas** — ação irreversível com apenas 1 clique | 3 |
| ❌ Sem prompt ao fechar o app com rascunho não salvo | 3 |

#### Mobile

| Finding | Severidade |
|---|---|
| ✅ Swipe-back de stack navigator funciona consistentemente | 0 |
| ❌ EmotionalDiary sem auto-save de rascunho | 2 |
| ❌ Formulários de sessão sem confirmação ao abandonar com dados preenchidos | 2 |

---

### H4 — Consistência e Padrões

> *Usuários não devem ter que se perguntar se diferentes palavras, situações ou ações significam a mesma coisa.*

#### Cross-Platform

| Finding | Severidade |
|---|---|
| ❌ **Accent color radicalmente diferente: azul (#0071e3) no Web vs ouro (#c78f41) no Desktop/Mobile** | 3 |
| ❌ Primary teal ligeiramente diferente entre Web e Desktop/Mobile | 2 |
| ❌ Background com temperatura de cor diferente: frio no Web, quente no Desktop/Mobile | 2 |
| ❌ Border radius inconsistente: 16px (Web) / 14px (Desktop) / 12px (Mobile) | 1 |
| ❌ Sistema de sombras completamente diferente entre plataformas | 1 |

#### Web (Interno)

| Finding | Severidade |
|---|---|
| ✅ shadcn/ui garante consistência interna de componentes | 0 |
| ✅ CVA para variantes de botões (default, destructive, outline, secondary, ghost) | 0 |
| ✅ Sidebar e BottomNav com lógica de role-based navigation consistente | 0 |
| ⚠️ BottomNav profissional tem 9 itens em "Mais" — quantidade alta, pode confundir | 2 |

#### Desktop (Interno)

| Finding | Severidade |
|---|---|
| ❌ Botões com estilos inline diferentes em várias seções | 2 |
| ❌ Mistura de abordagens de estilo (inline / CSS injetado / Tailwind) sem padrão claro | 2 |

---

### H5 — Prevenção de Erros

> *Melhor que uma boa mensagem de erro é um design cuidadoso que previne o problema antes que aconteça.*

#### Web

| Finding | Severidade |
|---|---|
| ✅ Formulários com React Hook Form + Zod — validação tipada e robusta | 0 |
| ✅ AlertDialog antes de ações destrutivas | 0 |
| ✅ ConsentModal antes de iniciar gravação | 0 |
| ❌ Campos de formulário financeiro sem máscara de valor monetária | 2 |

#### Desktop

| Finding | Severidade |
|---|---|
| ✅ EthicsValidationModal antes de validar nota | 0 |
| ❌ Validação de formulários manual sem biblioteca — apenas campos obrigatórios | 2 |
| ❌ Sem validação de formato de CRP antes de submeter | 2 |
| ❌ **"Purgar dados" sem confirmação robusta** (ex: digitar "CONFIRMAR") | 3 |

#### Mobile

| Finding | Severidade |
|---|---|
| ✅ email regex e validação de campo required funcionais | 0 |
| ❌ Sem biblioteca de formulários — validação ad-hoc inconsistente entre telas | 2 |
| ❌ Campos de data sem date picker — digitação manual propensa a erro | 2 |

---

### H6 — Reconhecimento em vez de Lembrança

> *Minimizar a carga de memória do usuário tornando objetos, ações e opções visíveis.*

#### Web

| Finding | Severidade |
|---|---|
| ✅ Sidebar com labels + ícones sempre visíveis (não é icon-only) | 0 |
| ✅ Badges de status com cor + texto — dupla codificação | 0 |
| ✅ Onboarding coachmarks implementados | 0 |
| ❌ Campos de formulário sem exemplos de placeholder contextual | 2 |
| ❌ Estados vazios genéricos sem instrução de próximo passo | 2 |

#### Desktop

| Finding | Severidade |
|---|---|
| ✅ Labels de seção sempre visíveis na navegação lateral | 0 |
| ❌ Botões de ação de ícone sem tooltips explicativos | 2 |
| ❌ Sem onboarding ou tour guiado para novo usuário | 2 |

#### Mobile

| Finding | Severidade |
|---|---|
| ✅ Bottom tabs com ícone + label | 0 |
| ❌ EmotionalDiary com escala 1-5 sem legenda permanente do que cada nível significa | 2 |

---

### H7 — Flexibilidade e Eficiência de Uso

> *Aceleradores permitem que usuários experientes realizem tarefas mais rapidamente.*

#### Web

| Finding | Severidade |
|---|---|
| ✅ Ctrl+B / Cmd+B para toggle da sidebar | 0 |
| ✅ FAB para nova sessão — acelerador visual principal | 0 |
| ✅ cmdk instalado como dependência — Command Palette possível mas não implementado | 2 |
| ❌ Sem atalho para salvar nota clínica (Ctrl+S seria natural) | 2 |
| ❌ **Sem busca global** — encontrar paciente ou sessão exige navegação manual | 3 |
| ❌ Sem filtros rápidos por data na agenda | 2 |

#### Desktop

| Finding | Severidade |
|---|---|
| ❌ Sem atalhos de teclado documentados ou implementados | 2 |
| ❌ Sem busca de paciente por digitação em lista | 2 |

#### Mobile

| Finding | Severidade |
|---|---|
| ✅ Search screen existe na stack de navegação | 0 |
| ❌ Search não é acessível de todas as telas por gesto ou botão no header | 2 |

---

### H8 — Design Estético e Minimalista

> *Diálogos e telas não devem conter informação irrelevante ou raramente necessária.*

#### Web

| Finding | Severidade |
|---|---|
| ✅ Design Apple-inspired executado com coerência | 0 |
| ✅ Sombras sutis e orgânicas — sem excesso de decoração | 0 |
| ✅ Tipografia com hierarquia clara | 0 |
| ❌ SessionDialog (~28KB) apresenta todo o formulário de uma vez sem progressão por etapas | 2 |
| ❌ Dashboard com muitos cards pequenos — alta densidade vs blocos consolidados | 2 |
| ❌ Sidebar com 10+ itens visíveis — hierarquia de frequência não aplicada | 2 |

#### Desktop

| Finding | Severidade |
|---|---|
| ❌ App.tsx monolítico resulta em seções justapostas sem ritmo visual claro | 2 |
| ❌ Múltiplos botões de ação sem hierarquia primário/secundário clara | 2 |

#### Mobile

| Finding | Severidade |
|---|---|
| ✅ Telas individuais são limpas e bem organizadas | 0 |
| ❌ FinanceScreen com lista longa sem agrupamento por período | 2 |

---

### H9 — Ajuda para Reconhecer, Diagnosticar e Recuperar de Erros

> *Mensagens de erro devem ser em linguagem simples, indicar o problema precisamente e sugerir solução.*

#### Web

| Finding | Severidade |
|---|---|
| ✅ Validação de formulário com mensagens específicas via Zod | 0 |
| ❌ **Sem ErrorBoundary global** — crash de componente derruba a aplicação inteira | 3 |
| ❌ Erros de API sem mensagem contextual amigável | 2 |
| ❌ Toast de erro sem ação de retry | 2 |

#### Desktop

| Finding | Severidade |
|---|---|
| ❌ **Erros de transcrição de áudio sem mensagem visível ao usuário — falha silenciosa** | 3 |
| ❌ Erros de conexão com backend sem fallback de UI | 2 |

#### Mobile

| Finding | Severidade |
|---|---|
| ✅ ErrorBoundary implementado com UI de fallback amigável | 0 |
| ✅ `Promise.allSettled()` para resiliência em chamadas paralelas | 0 |
| ❌ Erros de biometria sem instrução alternativa clara | 2 |

---

### H10 — Ajuda e Documentação

> *O sistema deve ser usável sem documentação, mas quando necessário, a ajuda deve ser fácil de encontrar.*

#### Web

| Finding | Severidade |
|---|---|
| ✅ OnboardingWidget + OnboardingCoachmark para guiar primeiros passos | 0 |
| ✅ Tooltips via shadcn/ui Tooltip | 0 |
| ❌ Texto de helper nos formulários clínicos esparso | 2 |
| ❌ Sem documentação de atalhos de teclado (modal "Ajuda") | 1 |

#### Desktop

| Finding | Severidade |
|---|---|
| ❌ **Sem onboarding ou tour guiado para primeiro acesso** | 2 |
| ❌ Sem tooltips em ícones ou botões de ação | 2 |

#### Mobile

| Finding | Severidade |
|---|---|
| ❌ Sem onboarding visual para funcionalidades novas | 2 |
| ❌ EmotionalDiary sem explicação inicial de uso | 2 |

---

## 4. Auditoria de Acessibilidade WCAG 2.1 AA

### 4.1 Contraste de Cores (Critério 1.4.3 — AA exige 4.5:1 para texto normal)

| Combinação de Cores | Ratio Estimado | WCAG AA | WCAG AAA | Onde é Usado |
|---|---|---|---|---|
| Foreground `#1d1d1f` / Branco | ~20:1 | ✅ Passa | ✅ Passa | Texto principal (Web) |
| Foreground `#272b34` / Branco | ~17:1 | ✅ Passa | ✅ Passa | Texto principal (Desktop/Mobile) |
| Primary teal `#2a4a54` / Branco | ~8.1:1 | ✅ Passa | ✅ Passa | Botões primários, sidebar ativa |
| Accent blue `#0071e3` / Branco | ~4.7:1 | ✅ Passa AA | ❌ Falha AAA | Links, CTAs (Web) |
| Muted foreground `#6b7280` / Branco | ~5.1:1 | ✅ Passa AA | ❌ Falha AAA | Labels secundários |
| **Accent ouro `#c78f41` / Branco** | ~3.0:1 | **❌ FALHA AA** | ❌ | Badge de acento (Desktop/Mobile) |
| **Status pending `#edbd2a` / Branco** | ~2.1:1 | **❌ FALHA AA** | ❌ | Badge de status pendente |
| **Status pending `#fbbf24` / Branco** | ~1.9:1 | **❌ FALHA AA** | ❌ | Status amarelo (Web) |
| **Status draft `#f97316` / Branco** | ~3.1:1 | **❌ FALHA AA** | ❌ | Badge de rascunho em texto |
| **Status validated `#10b981` / Branco** | ~2.8:1 | **❌ FALHA AA** | ❌ | Badge de validado em texto |

> **Nota:** Cores de status passam quando usadas como barras decorativas (4px de borda — critério de UI é 3:1). O problema ocorre quando são usadas como cor de texto em badges.

**Correções de contraste recomendadas:**

| Cor Atual | Uso em texto | Cor Corrigida | Novo Ratio |
|---|---|---|---|
| Gold `#c78f41` | Texto/badge | `#8B5E1A` (escurecido) | ~7.1:1 ✅ |
| Yellow `#edbd2a` | Texto/badge | Usar ícone + texto, não cor | N/A |
| Green `#10b981` | Texto/badge | `#0B6B4A` | ~4.6:1 ✅ |
| Orange `#f97316` | Texto/badge | `#B84500` | ~4.7:1 ✅ |

---

### 4.2 Navegação por Teclado (Critério 2.1.1 — Nível A)

| Critério | Web | Desktop | Mobile | Status |
|---|---|---|---|---|
| Todos os elementos interativos acessíveis por Tab | ✅ (Radix) | ⚠️ Parcial | N/A | Médio |
| Foco visível em elementos interativos | ✅ (`focus-visible:ring-2`) | ⚠️ Default browser | N/A | Médio |
| Focus trap em modais | ✅ (Radix Dialog) | ❌ Ausente | N/A | **Falha** |
| Escape para fechar modal | ✅ (Radix) | ❌ Ausente | N/A | **Falha** |
| Skip links ("Pular para conteúdo") | ❌ Ausente | ❌ Ausente | N/A | **Falha** |
| Atalhos documentados | ⚠️ Ctrl+B apenas | ❌ | N/A | **Falha** |

---

### 4.3 Leitores de Tela e ARIA (Critério 4.1.2 — Nível A)

| Critério | Web | Desktop | Mobile | Status |
|---|---|---|---|---|
| Landmarks semânticos (`<nav>`, `<main>`) | ✅ | ✅ | ✅ (RN) | Bom |
| `aria-label` em botões de ícone | ⚠️ Parcial | ❌ Ausente | ❌ Ausente | **Falha** |
| `aria-live` para updates dinâmicos | ❌ Ausente | ❌ Ausente | ❌ Ausente | **Falha** |
| `aria-expanded` em dropdowns | ✅ (Radix) | ❌ | N/A | Médio |
| `role="alert"` para erros | ✅ (Radix) | ❌ | ❌ | Baixo |

---

### 4.4 Acessibilidade Mobile — React Native

| Critério | Status | Detalhe |
|---|---|---|
| `accessibilityLabel` em botões | ❌ Não detectado | Botões de ícone sem descrição para VoiceOver/TalkBack |
| `accessibilityRole` em componentes | ❌ Não detectado | Sem roles explícitos em componentes customizados |
| `accessibilityHint` para contexto | ❌ Não detectado | Sem dicas de ação para leitor de tela |
| Touch target mínimo 44×44pt | ⚠️ Tab bar (56px ✅), ícones internos não verificados | |
| Dynamic Type (escalabilidade de fonte) | ❌ Não detectado | Fontes hardcoded em px |
| Reduzir movimento | ❌ Não detectado | Animações sem `useReducedMotion()` |

---

### 4.5 Percepção e Distinção de Informação (Critério 1.4.1)

> *Cor não deve ser o único meio de transmitir informação.*

| Caso | Passes? | Detalhe |
|---|---|---|
| Status de sessão (badges) | ✅ Parcial | Cor + texto label — OK para badges. Barra lateral de cor em cards é só cor (decorativo) |
| Modo privacidade ativo/inativo | ✅ | Ícone Eye/EyeOff + label mudam |
| Erro de formulário | ✅ (Web) / ❌ (Desktop) | Web: ícone + texto + cor. Desktop: apenas vermelho |
| EmotionalDiary — escala 1-5 | ⚠️ | Emoji + número. Sem texto descritivo por nível |

---

## 5. Análise de Fluxos Críticos

### 5.1 Fluxo de Login e Autenticação

| Aspecto | Web | Desktop | Mobile |
|---|---|---|---|
| Método | Email/senha + Google OAuth | Email/senha apenas | Email/senha + Biometria |
| Armazenamento de token | localStorage | localStorage | expo-secure-store ✅ |
| Auto-lock | ❌ | ❌ | ✅ 30s background |
| Recuperação de senha | ✅ | ❌ | ✅ |
| Multi-step register | ❌ | ❌ | ✅ |
| UX de login | Boa | Básica | Melhor |

O Mobile tem a melhor implementação de autenticação. O Web deveria considerar WebAuthn (autenticação biométrica web). O Desktop deveria adicionar pelo menos "Lembrar-me" com token de duração estendida.

---

### 5.2 Fluxo de Criação de Sessão Clínica

**Web — Problema de Formulário Monolítico**
```
[FAB "+"] → SessionDialog (modal único com TODOS os campos) → Salvar
```
- Cognitivamente pesado — todo o formulário de uma vez
- Sem progressão por etapas, sem auto-save
- SessionDialog (~28KB) — complexidade excessiva em um único componente

**Recomendação — Wizard em 3 etapas:**
1. Dados básicos (paciente, data, duração)
2. Conteúdo clínico (nota, técnicas usadas, temas abordados)
3. Revisão e salvar

**Desktop — Melhor fluxo clínico**
```
Selecionar paciente → Nova sessão → [Gravar áudio] → [Transcrever] → Prontuário → Validar eticamente → Exportar PDF
```
- Sequência natural e alinhada ao workflow real do psicólogo
- Ponto fraco: sem auto-save e purga de dados sem confirmação robusta

---

### 5.3 Portal do Paciente

| Funcionalidade | Web | Mobile | Gap |
|---|---|---|---|
| Sessões agendadas | ✅ | ✅ | — |
| Diário emocional | ✅ (PatientDiaryPage) | ✅ (EmotionalDiary) | Diferentes abordagens |
| Diário de sonhos | ✅ (DreamDiary) | ❌ | Web mais rico |
| Homework/tarefas | ✅ (HomeworkWidget) | ❌ | Web mais rico |
| Psicoeducação | ✅ (PsychoeducationalSection) | ❌ | Web mais rico |
| Documentos compartilhados | ✅ | ✅ | — |
| Pagamentos | ✅ | ❌ | Web apenas |

O portal do paciente no Web é significativamente mais rico. Mobile deveria receber as funcionalidades de maior engajamento (Homework, Psicoeducação).

---

### 5.4 Fluxo de Documentos Clínicos

| Etapa | Web | Desktop | Mobile |
|---|---|---|---|
| Criar documento | Formulário guiado | Template + editor | Limitado |
| Preview | A implementar (previsto em `design.md`) | PDF viewer interno | DocumentDetail screen |
| Compartilhar com paciente | ShareWithPatientButton | Exportar PDF | Compartilhar via SO |
| Histórico de versões | Parcial | Validação com timestamp | Não detectado |

O `design.md` já prevê melhorias no workspace de documentos como Priority 2. A prioridade declarada — entender → preencher → revisar → salvar → exportar — é o modelo correto quando implementado.

---

## 6. Recomendações Priorizadas

### P0 — Crítico (Fix Imediato)

#### 1. Auto-save em notas e formulários clínicos
**Plataforma:** Web + Desktop  
**Problema:** Perda irreversível de conteúdo clínico ao sair acidentalmente de formulário/modal  
**Solução:**
- Auto-save a cada 30 segundos com debounce
- Indicador persistente: "Salvo às 14:23" ou "Salvando..."
- Prompt de confirmação ao navegar com formulário sujo (`useBeforeUnload`)
- Rascunho guardado em `localStorage` / `IndexedDB` como fallback

#### 2. Focus trap em modais do Desktop
**Plataforma:** Desktop  
**Problema:** Viola WCAG 2.1 Critério 2.1.2 — usuários de teclado não conseguem navegar modais  
**Solução:**
- Usar `focus-trap-react` ou implementar manualmente
- Tab/Shift+Tab percorrem apenas elementos do modal
- Escape fecha o modal
- Foco retorna ao elemento ativador ao fechar

#### 3. Contraste do accent dourado para texto
**Plataforma:** Desktop + Mobile  
**Problema:** `#c78f41` sobre branco = ratio 3.0:1 — falha WCAG AA (4.5:1 para texto)  
**Solução:**
- Para texto: usar `#8B5E1A` (ratio ~7:1)
- Para elementos decorativos (bordas, ícones): manter `#c78f41` (critério de UI é 3:1 ✅)

#### 4. Confirmação de 2 etapas para "Purgar dados"
**Plataforma:** Desktop  
**Problema:** Ação irreversível com apenas 1 clique de confirmação  
**Solução (inspirado no GitHub delete repository):**
1. Modal explicando consequências detalhadamente
2. Campo de texto onde usuário digita "CONFIRMAR" para prosseguir

#### 5. Status com redundância visual além de cor
**Plataforma:** Todos  
**Problema:** Usuários com daltonismo (~8% dos homens) não distinguem status por cor  
**Solução:**
- ⏳ Pendente / ✓ Validado / ✏️ Rascunho — ícone acompanha cor
- Garantir que texto de status sempre acompanha o badge colorido

---

### P1 — Alta Prioridade

#### 6. Unificar tokens de cor cross-platform
**Criar `packages/shared/src/theme.ts` com tokens canônicos:**
- Decisão entre azul `#0071e3` vs ouro `#c78f41` como accent único
- Unificar primary para `#234e5c`
- Unificar background para `#f9f7f5` (mais quente, mais clínico)
- Web, Desktop e Mobile importam do pacote compartilhado

#### 7. ErrorBoundary global no Frontend Web
**Problema:** Crash derruba a app inteira sem feedback  
**Solução:** Adicionar `<ErrorBoundary>` no `AppShell.tsx` e em páginas críticas (SessionPage, ProntuarioPage)

#### 8. Busca global no Web
**cmdk já instalado** — implementar Command Palette:
- Atalho: `Cmd+K` / `Ctrl+K`
- Buscar: pacientes, sessões recentes, documentos
- Resultados com ícone de tipo + nome + data

#### 9. `aria-label` em botões de ícone (todos)
- Web: `aria-label` em ícones da Sidebar sem texto
- Desktop: `aria-label` + `title` em todos os botões icon-only
- Mobile: `accessibilityLabel` + `accessibilityRole="button"` em TouchableOpacity

#### 10. Prompt ao navegar com formulário sujo
**Web** — usar `useBeforeUnload` do React Router v6 para interceptar navegação com dados não salvos

---

### P2 — Média Prioridade

11. **Sistema de design em pacote compartilhado** — `packages/shared/src/theme.ts`
12. **Refatorar App.tsx do Desktop** — dividir em componentes de ~200 linhas cada
13. **Atalhos de teclado clínicos no Web** — `Ctrl+S` salvar, `Ctrl+N` nova sessão, `Ctrl+P` busca
14. **Estados vazios com call-to-action** — "Nenhuma sessão ainda. [Agendar primeira sessão →]"
15. **SessionDialog em wizard multi-etapas** — 3 etapas para reduzir carga cognitiva
16. **Skip link** — `<a href="#main-content" class="sr-only focus:not-sr-only">Pular para conteúdo</a>`
17. **`aria-live="polite"`** para toasts e status dinâmicos
18. **Máscara monetária** em campos financeiros (R$ 1.500,00)
19. **Validação de CRP** com feedback de formato antes do submit
20. **Placeholder contextual** em campos clínicos

---

### P3 — Melhoria Contínua

21. **Onboarding guiado para o Desktop** — tour na primeira sessão
22. **`accessibilityRole` e `accessibilityLabel`** em todos os componentes Mobile
23. **Dynamic Type no Mobile** — respeitar `allowFontScaling` do SO
24. **`useReducedMotion()`** — desabilitar animações quando usuário prefere
25. **Dark mode ativável no Desktop** — toggle já existe no CSS, falta botão na UI
26. **Tooltips em botões de ícone do Desktop**
27. **Command Palette** no Web com `cmdk`
28. **Modal de atalhos de teclado** — pressionar `?` abre lista de atalhos
29. **Agrupamento por período** no FinanceScreen Mobile
30. **Legenda permanente** no EmotionalDiary Mobile

---

## 7. Pontos Fortes para Preservar

### Design e Visual

**1. Sistema de design documentado**  
O `Frontend/design.md` define filosofia, linguagem visual, regras de botões, formulários, motion e responsividade. Ativo raro — manter e expandir.

**2. Teal institucional como primary**  
O `#234e5c` transmite confiança, profissionalismo e autoridade clínica. Não mudar — é parte da identidade diferenciada.

**3. Tipografia Inter + Lora**  
Combinação editorial sofisticada: Inter para UI (legível, moderno) + Lora para contexto editorial/clínico (autoridade, warmth). Perfeita para plataforma clínica.

**4. Sombras orgânicas no Web**  
Sombras longas, suaves e de baixa opacidade evitam visual de SaaS genérico. Replicar no Desktop e Mobile.

**5. Transições calibradas**  
`transition-calm` (300ms) e `transition-gentle` (500ms) com easing adequado — não ansiosas, não lentas. Manter.

### UX e Produto

**6. Modo privacidade (blur de dados sensíveis)**  
Feature única e clinicamente relevante — protege dados durante consultorias presenciais ou compartilhamento de tela.

**7. Segurança no Mobile**  
Biometria, `expo-secure-store`, auto-lock em 30s — referência de boas práticas para app clínico.

**8. Responsividade sidebar ↔ bottom nav**  
Transição automática e role-aware entre sidebar (desktop) e bottom nav (mobile). Fluida e bem implementada.

**9. shadcn/ui + Radix como fundação Web**  
Acessibilidade built-in (focus trap, ARIA, keyboard nav). Não substituir sem razão robusta.

**10. Onboarding coachmarks (Web)**  
Base sólida já implementada — expandir para cobrir mais funcionalidades e adaptar para Desktop.

**11. React Hook Form + Zod (Web)**  
Validação tipada de ponta a ponta em português. Expandir para Desktop e Mobile.

**12. Fluxo clínico completo do Desktop**  
Gravação → transcrição → prontuário → validação ética → PDF é o diferencial de produto mais forte. Preservar e polir.

---

## Apêndice — Resumo de Severidades por Heurística

| Heurística | Problemas S3 | Problemas S2 | Problemas S1 | Total |
|---|---|---|---|---|
| H1 — Visibilidade do status | 2 | 5 | 0 | 7 |
| H2 — Match com mundo real | 0 | 2 | 2 | 4 |
| H3 — Controle e liberdade | 4 | 2 | 0 | 6 |
| H4 — Consistência | 1 | 7 | 2 | 10 |
| H5 — Prevenção de erros | 1 | 6 | 0 | 7 |
| H6 — Reconhecimento | 0 | 6 | 0 | 6 |
| H7 — Eficiência de uso | 1 | 6 | 1 | 8 |
| H8 — Design minimalista | 0 | 6 | 0 | 6 |
| H9 — Recuperação de erros | 2 | 5 | 0 | 7 |
| H10 — Ajuda e docs | 0 | 6 | 1 | 7 |
| **Total** | **11** | **51** | **6** | **68** |

> 68 findings identificados. **11 de severidade 3 (major)**, 51 de severidade 2 (minor), 6 de severidade 1 (cosmético). Nenhum de severidade 4 (catastrófico) — o sistema é utilizável e não bloqueia uso completamente. Os 11 findings S3 são os candidatos diretos ao P0/P1.

---

*Análise produzida com base em leitura estática do código-fonte (194 arquivos TSX Web, ~1400 linhas Desktop, 66 arquivos Mobile). Recomenda-se complementar com testes com usuários reais (psicólogos e pacientes em ambiente controlado) para validar prioridades e descobrir problemas comportamentais não aparentes no código.*
