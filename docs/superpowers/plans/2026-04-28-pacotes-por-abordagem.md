# Pacotes Terapêuticos por Abordagem — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Quando o psicólogo define a abordagem terapêutica de um paciente, o sistema carrega automaticamente escalas, fichas de homework, template de prontuário, diário e materiais psicoeducativos daquela abordagem.

**Architecture:** Conteúdo de pacotes é dados estáticos curados no frontend (`packages.ts`). Abordagem do psicólogo e de cada paciente é persistida em localStorage (offline-first, sem mudança de backend). `packageService.ts` é a única API de acesso aos dados. Cada tela existente (FormsPage, ScalesPage, ProntuarioPage, DocumentsPage, portal do paciente) recebe uma seção de pacote no topo, sem alterar o comportamento existente.

**Tech Stack:** React 18, TypeScript, Tailwind + shadcn/ui, Vitest (testes), localStorage (persistência v1)

---

## File Map

**Novos arquivos:**
- `Frontend/src/types/approach.ts` — tipo `Approach`, labels, constantes
- `Frontend/src/data/packages.ts` — todo o conteúdo curado das 11 abordagens
- `Frontend/src/services/packageService.ts` — lookup de dados por abordagem
- `Frontend/src/services/approachStorageService.ts` — lê/escreve abordagens em localStorage
- `Frontend/src/services/packageService.test.ts` — testes unitários do service
- `Frontend/src/components/ApproachMultiSelect.tsx` — seleção de abordagens no perfil
- `Frontend/src/components/PatientApproachSelector.tsx` — atribuição de abordagem ao paciente
- `Frontend/src/components/PackageBanner.tsx` — banner "📦 Pacote X" reutilizável
- `Frontend/src/components/NoteTemplatePrompt.tsx` — modal "Usar template?"
- `Frontend/src/components/HomeworkWidget.tsx` — "Para fazer antes da próxima sessão"
- `Frontend/src/components/PsychoeducationalSection.tsx` — materiais para compartilhar

**Arquivos modificados:**
- `Frontend/src/pages/AccountPage.tsx` — adiciona `ApproachMultiSelect`
- `Frontend/src/pages/PatientDetailPage.tsx` — adiciona `PatientApproachSelector` na aba Perfil
- `Frontend/src/pages/FormsPage.tsx` — adiciona `PackageBanner` com fichas da abordagem
- `Frontend/src/pages/ScalesPage.tsx` — adiciona `PackageBanner` com escalas da abordagem
- `Frontend/src/pages/ProntuarioPage.tsx` — adiciona `NoteTemplatePrompt`
- `Frontend/src/pages/DocumentsPage.tsx` — adiciona `PsychoeducationalSection`
- `Frontend/src/pages/patient/PatientHomePage.tsx` — adiciona `HomeworkWidget`
- `Frontend/src/pages/patient/PatientDiaryPage.tsx` — exibe diário primário da abordagem em destaque

---

## Task 1: Tipos e Constantes de Abordagem

**Files:**
- Create: `Frontend/src/types/approach.ts`

- [ ] **Criar o arquivo de tipos**

```typescript
// Frontend/src/types/approach.ts

export const APPROACHES = [
  'tcc',
  'dbt',
  'act',
  'psicanalitica',
  'analitica',
  'gestalt',
  'emdr',
  'esquema',
  'humanista',
  'sistemica',
  'logoterapia',
] as const;

export type Approach = typeof APPROACHES[number];

export const APPROACH_LABELS: Record<Approach, string> = {
  tcc: 'TCC',
  dbt: 'DBT',
  act: 'ACT',
  psicanalitica: 'Psicanálise',
  analitica: 'Analítica (Jung)',
  gestalt: 'Gestalt',
  emdr: 'EMDR',
  esquema: 'Esquema-Terapia',
  humanista: 'Humanista',
  sistemica: 'Sistêmica',
  logoterapia: 'Logoterapia',
};

export const APPROACH_FULL_LABELS: Record<Approach, string> = {
  tcc: 'TCC — Terapia Cognitivo-Comportamental',
  dbt: 'DBT — Terapia Comportamental Dialética',
  act: 'ACT — Terapia de Aceitação e Compromisso',
  psicanalitica: 'Psicanálise (Freudiana / Lacaniana)',
  analitica: 'Psicologia Analítica (Junguiana)',
  gestalt: 'Gestalt',
  emdr: 'EMDR',
  esquema: 'Esquema-Terapia',
  humanista: 'Humanista / Centrada na Pessoa',
  sistemica: 'Sistêmica / Terapia Familiar',
  logoterapia: 'Logoterapia / Existencial',
};

export const APPROACH_COLORS: Record<Approach, string> = {
  tcc: 'bg-blue-100 text-blue-800 border-blue-200',
  dbt: 'bg-purple-100 text-purple-800 border-purple-200',
  act: 'bg-green-100 text-green-800 border-green-200',
  psicanalitica: 'bg-gray-100 text-gray-800 border-gray-200',
  analitica: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  gestalt: 'bg-orange-100 text-orange-800 border-orange-200',
  emdr: 'bg-red-100 text-red-800 border-red-200',
  esquema: 'bg-amber-100 text-amber-800 border-amber-200',
  humanista: 'bg-teal-100 text-teal-800 border-teal-200',
  sistemica: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  logoterapia: 'bg-slate-100 text-slate-800 border-slate-200',
};
```

- [ ] **Commit**

```bash
git add Frontend/src/types/approach.ts
git commit -m "feat(packages): add Approach type and label constants"
```

---

## Task 2: Dados de Conteúdo dos Pacotes

**Files:**
- Create: `Frontend/src/data/packages.ts`

- [ ] **Criar interfaces de conteúdo e dados dos pacotes**

```typescript
// Frontend/src/data/packages.ts
import type { Approach } from '../types/approach';

export interface PackageScale {
  id: string;
  title: string;
  abbreviation: string;
  description: string;
}

export interface PackageHomeworkField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'scale_1_10' | 'select' | 'radio';
  placeholder?: string;
  options?: string[];
}

export interface PackageHomework {
  id: string;
  title: string;
  description: string;
  fields: PackageHomeworkField[];
}

export interface NoteTemplateSection {
  id: string;
  label: string;
  placeholder: string;
}

export interface PackagePsychoeducational {
  id: string;
  title: string;
  summary: string;
}

export interface ApproachPackage {
  approach: Approach;
  scales: PackageScale[];
  noteTemplate: {
    title: string;
    sections: NoteTemplateSection[];
  };
  homework: PackageHomework[];
  diaryConfig: {
    title: string;
    description: string;
    entryLabel: string;
  };
  psychoeducational: PackagePsychoeducational[];
}

export const PACKAGES: Record<Approach, ApproachPackage> = {
  tcc: {
    approach: 'tcc',
    scales: [
      { id: 'phq9', abbreviation: 'PHQ-9', title: 'Patient Health Questionnaire-9', description: 'Rastreamento de depressão' },
      { id: 'gad7', abbreviation: 'GAD-7', title: 'Generalized Anxiety Disorder-7', description: 'Rastreamento de ansiedade generalizada' },
      { id: 'bdi2', abbreviation: 'BDI-II', title: 'Beck Depression Inventory II', description: 'Inventário de depressão de Beck' },
      { id: 'bai', abbreviation: 'BAI', title: 'Beck Anxiety Inventory', description: 'Inventário de ansiedade de Beck' },
      { id: 'das', abbreviation: 'DAS', title: 'Dysfunctional Attitude Scale', description: 'Escala de crenças disfuncionais' },
    ],
    noteTemplate: {
      title: 'Sessão TCC',
      sections: [
        { id: 'agenda', label: 'Agenda da sessão', placeholder: 'O que será trabalhado hoje...' },
        { id: 'humor', label: 'Revisão de humor', placeholder: 'Estado emocional relatado, escala 0-10...' },
        { id: 'tarefa_revisao', label: 'Revisão da tarefa anterior', placeholder: 'O que foi feito, dificuldades encontradas...' },
        { id: 'conteudo', label: 'Conteúdo da sessão', placeholder: 'Pensamentos automáticos identificados, reestruturação realizada...' },
        { id: 'nova_tarefa', label: 'Nova tarefa de casa', placeholder: 'Tarefa acordada com o paciente...' },
        { id: 'feedback', label: 'Feedback do paciente', placeholder: 'Como o paciente avaliou a sessão...' },
      ],
    },
    homework: [
      {
        id: 'rpd',
        title: 'Registro de Pensamentos',
        description: 'Identifique situações, pensamentos e emoções ao longo da semana.',
        fields: [
          { id: 'situacao', label: 'Situação', type: 'textarea', placeholder: 'O que aconteceu? Onde? Com quem?' },
          { id: 'pensamento', label: 'Pensamento automático', type: 'textarea', placeholder: 'O que passou pela sua cabeça?' },
          { id: 'emocao', label: 'Emoção', type: 'text', placeholder: 'Que emoção você sentiu? (0-100%)' },
          { id: 'comportamento', label: 'Comportamento', type: 'textarea', placeholder: 'O que você fez?' },
          { id: 'alternativa', label: 'Pensamento alternativo', type: 'textarea', placeholder: 'Existe outra forma de ver essa situação?' },
        ],
      },
      {
        id: 'diario_atividades',
        title: 'Diário de Atividades',
        description: 'Registre suas atividades e o nível de prazer e realização em cada uma.',
        fields: [
          { id: 'atividade', label: 'Atividade realizada', type: 'text', placeholder: 'O que você fez?' },
          { id: 'prazer', label: 'Prazer (0-10)', type: 'scale_1_10' },
          { id: 'realizacao', label: 'Realização (0-10)', type: 'scale_1_10' },
          { id: 'observacoes', label: 'Observações', type: 'textarea', placeholder: 'Algo que chamou atenção...' },
        ],
      },
      {
        id: 'experimento_comportamental',
        title: 'Experimento Comportamental',
        description: 'Teste uma crença colocando-a à prova na vida real.',
        fields: [
          { id: 'crenca', label: 'Crença a testar', type: 'textarea', placeholder: 'Qual pensamento você quer verificar?' },
          { id: 'predicao', label: 'O que você prevê que vai acontecer?', type: 'textarea', placeholder: 'Escreva sua previsão antes de fazer o experimento' },
          { id: 'experimento', label: 'O que você fez', type: 'textarea', placeholder: 'Descreva o experimento realizado' },
          { id: 'resultado', label: 'O que realmente aconteceu?', type: 'textarea', placeholder: 'Compare com sua previsão' },
          { id: 'conclusao', label: 'Conclusão', type: 'textarea', placeholder: 'O que isso significa para sua crença?' },
        ],
      },
    ],
    diaryConfig: {
      title: 'Registro de Pensamentos Automáticos',
      description: 'Anote pensamentos, emoções e situações ao longo do dia.',
      entryLabel: 'Registrar pensamento',
    },
    psychoeducational: [
      { id: 'modelo_cognitivo', title: 'O modelo cognitivo', summary: 'Como pensamentos, emoções e comportamentos se influenciam mutuamente.' },
      { id: 'distorcoes', title: 'As distorções cognitivas', summary: 'Os 10 padrões de pensamento que nos prejudicam — e como reconhecê-los.' },
      { id: 'emocoes', title: 'Como as emoções funcionam', summary: 'Por que sentimos o que sentimos e como regular nossas emoções.' },
    ],
  },

  dbt: {
    approach: 'dbt',
    scales: [
      { id: 'ders', abbreviation: 'DERS', title: 'Difficulties in Emotion Regulation Scale', description: 'Dificuldades na regulação emocional' },
      { id: 'bsl23', abbreviation: 'BSL-23', title: 'Borderline Symptom List-23', description: 'Sintomas de transtorno de personalidade borderline' },
    ],
    noteTemplate: {
      title: 'Sessão DBT',
      sections: [
        { id: 'diary_card_review', label: 'Revisão do Diary Card', placeholder: 'Emoções da semana, comportamentos-alvo, habilidades usadas...' },
        { id: 'analise_cadeia', label: 'Análise em cadeia', placeholder: 'Evento precipitante → vulnerabilidades → elos → comportamento-alvo → consequências...' },
        { id: 'habilidade', label: 'Habilidade trabalhada', placeholder: 'Qual habilidade DBT foi praticada ou ensinada...' },
        { id: 'plano', label: 'Plano e comprometimento', placeholder: 'O que o paciente se comprometeu a fazer esta semana...' },
      ],
    },
    homework: [
      {
        id: 'diary_card',
        title: 'Diary Card — Registro Diário',
        description: 'Registro diário de emoções, comportamentos-alvo e habilidades usadas.',
        fields: [
          { id: 'emocoes', label: 'Emoções do dia (0-5)', type: 'textarea', placeholder: 'Angústia, raiva, tristeza, alegria... e intensidade de 0 a 5' },
          { id: 'comportamentos_alvo', label: 'Comportamentos-alvo', type: 'textarea', placeholder: 'Comportamentos que você e seu terapeuta estão monitorando' },
          { id: 'habilidades', label: 'Habilidades usadas', type: 'textarea', placeholder: 'Quais habilidades DBT você usou hoje?' },
          { id: 'urge_surfing', label: 'Impulsos (0-5)', type: 'scale_1_10' },
        ],
      },
      {
        id: 'dear_man',
        title: 'DEAR MAN — Efetividade Interpessoal',
        description: 'Prepare uma conversa difícil usando a habilidade DEAR MAN.',
        fields: [
          { id: 'situacao', label: 'Situação', type: 'textarea', placeholder: 'Com quem e sobre o quê você precisa falar?' },
          { id: 'descricao', label: 'D — Descreva', type: 'textarea', placeholder: 'Descreva os fatos sem julgamento...' },
          { id: 'emocao', label: 'E — Expresse', type: 'textarea', placeholder: 'Expresse como você se sente com "Eu me sinto..."' },
          { id: 'afirme', label: 'A — Afirme', type: 'textarea', placeholder: 'Peça o que você quer claramente...' },
          { id: 'reforce', label: 'R — Reforce', type: 'textarea', placeholder: 'Por que é bom para a outra pessoa atender seu pedido?' },
          { id: 'resultado', label: 'Como foi?', type: 'textarea', placeholder: 'Depois da conversa, o que aconteceu?' },
        ],
      },
      {
        id: 'tip_skill',
        title: 'TIP — Regulação da Temperatura Emocional',
        description: 'Use habilidades biológicas para regular emoções intensas rapidamente.',
        fields: [
          { id: 'gatilho', label: 'O que causou a emoção intensa?', type: 'textarea', placeholder: 'Descreva a situação...' },
          { id: 'emocao_nivel', label: 'Intensidade da emoção (0-10)', type: 'scale_1_10' },
          { id: 'tecnica', label: 'Técnica usada', type: 'radio', options: ['T — Temperatura (água fria no rosto)', 'I — Exercício Intenso', 'P — Respiração diafragmática (Paced breathing)'] },
          { id: 'resultado_nivel', label: 'Intensidade após a técnica (0-10)', type: 'scale_1_10' },
        ],
      },
    ],
    diaryConfig: {
      title: 'Diary Card',
      description: 'Seu registro diário de emoções, comportamentos e habilidades DBT.',
      entryLabel: 'Preencher Diary Card',
    },
    psychoeducational: [
      { id: 'modulos_dbt', title: 'Os 4 Módulos DBT', summary: 'Mindfulness, Tolerância ao Mal-estar, Regulação Emocional e Efetividade Interpessoal.' },
      { id: 'mindfulness_basico', title: 'Mindfulness básico', summary: 'O que é estar presente e por que é a base de tudo no DBT.' },
      { id: 'dialetica', title: 'O que é dialética', summary: 'Por que duas coisas opostas podem ser verdadeiras ao mesmo tempo.' },
    ],
  },

  act: {
    approach: 'act',
    scales: [
      { id: 'aaq2', abbreviation: 'AAQ-II', title: 'Acceptance and Action Questionnaire II', description: 'Flexibilidade psicológica e evitação experiencial' },
      { id: 'cfq', abbreviation: 'CFQ', title: 'Cognitive Fusion Questionnaire', description: 'Fusão cognitiva' },
      { id: 'vlq', abbreviation: 'VLQ', title: 'Valued Living Questionnaire', description: 'Vida baseada em valores' },
    ],
    noteTemplate: {
      title: 'Sessão ACT',
      sections: [
        { id: 'aceitacao', label: 'Aceitação', placeholder: 'O que o paciente está evitando? Como está a abertura para a experiência?' },
        { id: 'defusao', label: 'Defusão cognitiva', placeholder: 'Pensamentos identificados, trabalho de defusão realizado...' },
        { id: 'presente', label: 'Contato com o momento presente', placeholder: 'Presença observada na sessão, exercícios de atenção plena...' },
        { id: 'valores', label: 'Valores e ação comprometida', placeholder: 'Valores clarificados, barreiras identificadas, comprometimentos...' },
      ],
    },
    homework: [
      {
        id: 'valores',
        title: 'Identificação de Valores',
        description: 'Descubra o que realmente importa para você em cada área da vida.',
        fields: [
          { id: 'relacoes', label: 'Relações (família, amigos, parceiro)', type: 'textarea', placeholder: 'Como você quer ser nessas relações?' },
          { id: 'trabalho', label: 'Trabalho / Estudo', type: 'textarea', placeholder: 'O que você quer contribuir?' },
          { id: 'saude', label: 'Saúde e autocuidado', type: 'textarea', placeholder: 'Como quer cuidar de si?' },
          { id: 'lazer', label: 'Lazer e espiritualidade', type: 'textarea', placeholder: 'O que te dá sentido fora do trabalho?' },
          { id: 'acao', label: 'Uma ação pequena que posso fazer esta semana', type: 'textarea', placeholder: 'Comprometimento concreto...' },
        ],
      },
      {
        id: 'defusao',
        title: 'Ficha de Defusão Cognitiva',
        description: 'Aprenda a observar seus pensamentos sem ser controlado por eles.',
        fields: [
          { id: 'pensamento', label: 'Pensamento difícil', type: 'textarea', placeholder: 'Escreva o pensamento que te incomoda...' },
          { id: 'fusao', label: 'Como esse pensamento te controla? (0-10)', type: 'scale_1_10' },
          { id: 'tecnica', label: 'Técnica de defusão usada', type: 'radio', options: ['Folhas no rio', '"Estou tendo o pensamento de que..."', 'Agradecer à mente', 'Nomear o processo ("Aí está a autocrítica")'] },
          { id: 'fusao_depois', label: 'Depois da técnica, como ficou? (0-10)', type: 'scale_1_10' },
        ],
      },
    ],
    diaryConfig: {
      title: 'Diário de Valores',
      description: 'Registre ações alinhadas com seus valores e barreiras que encontrou.',
      entryLabel: 'Registrar ação valorizada',
    },
    psychoeducational: [
      { id: 'hexaflex', title: 'O Hexaflex', summary: 'Os 6 processos do ACT: aceitação, defusão, momento presente, self como contexto, valores e ação comprometida.' },
      { id: 'metaforas_act', title: 'Metáforas do ACT', summary: 'Passageiros no ônibus, folhas no rio, luta de cabo de guerra com o monstro — as metáforas que tornam o ACT concreto.' },
    ],
  },

  psicanalitica: {
    approach: 'psicanalitica',
    scales: [
      { id: 'rfscale', abbreviation: 'RF Scale', title: 'Reflective Functioning Scale', description: 'Capacidade de mentalização e funcionamento reflexivo' },
    ],
    noteTemplate: {
      title: 'Sessão Psicanalítica',
      sections: [
        { id: 'material', label: 'Material trazido', placeholder: 'Associações livres, sonhos, lapsos, atos falhos relatados...' },
        { id: 'transferencia', label: 'Transferência / Contratransferência', placeholder: 'Dinâmica transferencial observada, sentimentos contratransferenciais...' },
        { id: 'resistencias', label: 'Resistências', placeholder: 'O que o paciente evitou, silêncios, mudanças de assunto...' },
        { id: 'intervencao', label: 'Intervenção', placeholder: 'Interpretação, esclarecimento ou confrontação realizada...' },
      ],
    },
    homework: [
      {
        id: 'registro_sonhos',
        title: 'Registro de Sonhos',
        description: 'Anote seus sonhos ao acordar, com o máximo de detalhes possível.',
        fields: [
          { id: 'sonho', label: 'O sonho', type: 'textarea', placeholder: 'Descreva o sonho com todos os detalhes que lembrar...' },
          { id: 'emocao', label: 'Emoção ao acordar', type: 'text', placeholder: 'Como você se sentiu ao acordar?' },
          { id: 'associacoes', label: 'Associações livres', type: 'textarea', placeholder: 'O que vem à mente quando pensa no sonho? Não censure...' },
        ],
      },
    ],
    diaryConfig: {
      title: 'Diário de Sonhos e Associações',
      description: 'Anote sonhos e associações espontâneas que surgirem ao longo do dia.',
      entryLabel: 'Registrar sonho ou associação',
    },
    psychoeducational: [
      { id: 'associacao_livre', title: 'Regra fundamental da psicanálise', summary: 'O que é a associação livre e por que ela é o método central do tratamento.' },
    ],
  },

  analitica: {
    approach: 'analitica',
    scales: [
      { id: 'mbti_like', abbreviation: 'Tipos Psicológicos', title: 'Inventário de Tipos Psicológicos', description: 'Identificação de funções psíquicas dominantes (Jung)' },
    ],
    noteTemplate: {
      title: 'Sessão Analítica',
      sections: [
        { id: 'material_onirico', label: 'Material onírico', placeholder: 'Sonhos trazidos, imagens, símbolos relevantes...' },
        { id: 'amplificacao', label: 'Amplificação de símbolo', placeholder: 'Mitologia, folclore, cultura relacionados ao símbolo central...' },
        { id: 'arquetipos', label: 'Arquétipos presentes', placeholder: 'Persona, Sombra, Anima/Animus, Self, Herói... observados no material...' },
        { id: 'complexos', label: 'Complexos ativos', placeholder: 'Complexos que parecem estar ativos no material...' },
        { id: 'processo_individuacao', label: 'Processo de individuação', placeholder: 'Movimentos de integração ou dissociação observados...' },
      ],
    },
    homework: [
      {
        id: 'registro_sonho_jung',
        title: 'Registro de Sonho — Análise Junguiana',
        description: 'Registre seu sonho com atenção especial a símbolos, personagens e emoções.',
        fields: [
          { id: 'sonho', label: 'O sonho', type: 'textarea', placeholder: 'Descreva o sonho com todos os detalhes...' },
          { id: 'personagens', label: 'Personagens (quem estava no sonho?)', type: 'textarea', placeholder: 'Descreva cada personagem...' },
          { id: 'simbolos', label: 'Símbolos e imagens marcantes', type: 'textarea', placeholder: 'O que se destacou visualmente?' },
          { id: 'emocao', label: 'Emoção predominante', type: 'text', placeholder: 'Como você se sentiu no sonho e ao acordar?' },
          { id: 'associacoes', label: 'Associações pessoais', type: 'textarea', placeholder: 'O que esses elementos evocam em você?' },
        ],
      },
      {
        id: 'imaginacao_ativa',
        title: 'Imaginação Ativa',
        description: 'Dialogue com uma figura interna em estado de relaxamento consciente.',
        fields: [
          { id: 'figura', label: 'Figura com quem dialogou', type: 'text', placeholder: 'Personagem do sonho, emoção personificada, imagem...' },
          { id: 'dialogo', label: 'O diálogo', type: 'textarea', placeholder: 'Escreva o que você disse e o que a figura respondeu...' },
          { id: 'insight', label: 'O que surgiu', type: 'textarea', placeholder: 'Que insight ou sensação ficou?' },
        ],
      },
    ],
    diaryConfig: {
      title: 'Diário de Sonhos e Imaginação Ativa',
      description: 'Registre sonhos, símbolos e experiências de imaginação ativa.',
      entryLabel: 'Registrar sonho ou imaginação',
    },
    psychoeducational: [
      { id: 'arquetipos_intro', title: 'O que são arquétipos', summary: 'Padrões universais do inconsciente coletivo — Persona, Sombra, Anima/Animus, Self.' },
      { id: 'sombra', title: 'A Sombra', summary: 'O lado desconhecido de nós mesmos — por que integrá-lo é fundamental.' },
      { id: 'complexos', title: 'O que são complexos', summary: 'Constelações de energia psíquica em torno de um tema central.' },
    ],
  },

  gestalt: {
    approach: 'gestalt',
    scales: [
      { id: 'awareness_q', abbreviation: 'Awareness Q.', title: 'Questionário de Awareness', description: 'Nível de contato e presença' },
    ],
    noteTemplate: {
      title: 'Sessão Gestalt',
      sections: [
        { id: 'figura_fundo', label: 'Figura-Fundo', placeholder: 'O que emergiu como figura na sessão? O que permaneceu no fundo?' },
        { id: 'contato', label: 'Contato e Resistências', placeholder: 'Como foi a qualidade do contato? Deflexão, retroflexão, projeção, confluência observadas?' },
        { id: 'experimento', label: 'Experimento realizado', placeholder: 'Técnica usada (cadeira vazia, amplificação, etc.) e o que emergiu...' },
        { id: 'campo', label: 'Campo terapêutico', placeholder: 'Dinâmica do campo, o que o terapeuta percebeu em si mesmo...' },
      ],
    },
    homework: [
      {
        id: 'roda_necessidades',
        title: 'Roda de Necessidades',
        description: 'Identifique quais necessidades estão satisfeitas e quais precisam de atenção.',
        fields: [
          { id: 'necessidade', label: 'Necessidade', type: 'text', placeholder: 'Ex: afeto, autonomia, segurança, reconhecimento...' },
          { id: 'nivel', label: 'Nível de satisfação (0-10)', type: 'scale_1_10' },
          { id: 'o_que_falta', label: 'O que está faltando?', type: 'textarea', placeholder: 'O que precisaria acontecer para essa necessidade ser atendida?' },
        ],
      },
    ],
    diaryConfig: {
      title: 'Diário de Awareness',
      description: 'Registre momentos de presença, contato e o que emergiu na sua experiência.',
      entryLabel: 'Registrar awareness',
    },
    psychoeducational: [
      { id: 'ciclo_contato', title: 'Ciclo de Contato', summary: 'Como a experiência se forma e se completa — da sensação à retirada.' },
      { id: 'awareness', title: 'O que é Awareness', summary: 'A capacidade de perceber o que está acontecendo agora — em você e no ambiente.' },
    ],
  },

  emdr: {
    approach: 'emdr',
    scales: [
      { id: 'pcl5', abbreviation: 'PCL-5', title: 'PTSD Checklist for DSM-5', description: 'Sintomas de TEPT' },
      { id: 'iesr', abbreviation: 'IES-R', title: 'Impact of Event Scale-Revised', description: 'Impacto de evento traumático' },
      { id: 'sud', abbreviation: 'SUD', title: 'Subjective Units of Disturbance', description: 'Intensidade subjetiva de perturbação (0-10)' },
      { id: 'voc', abbreviation: 'VOC', title: 'Validity of Cognition', description: 'Validade da cognição positiva (1-7)' },
    ],
    noteTemplate: {
      title: 'Sessão EMDR',
      sections: [
        { id: 'fase', label: 'Fase atual', placeholder: 'Fase 1 (história), 2 (preparação), 3-6 (dessensibilização/instalação), 7 (fechamento), 8 (reavaliação)...' },
        { id: 'alvo', label: 'Memória-alvo', placeholder: 'Evento alvo desta sessão, imagem representativa...' },
        { id: 'cn_cp', label: 'CN / CP / SUD / VOC', placeholder: 'Cognição Negativa, Cognição Positiva, SUD inicial, VOC inicial...' },
        { id: 'processamento', label: 'Processamento', placeholder: 'O que emergiu durante a estimulação bilateral — associações, insights, emoções...' },
        { id: 'sud_final', label: 'SUD / VOC finais', placeholder: 'SUD e VOC ao final da sessão. Sessão fechada adequadamente?' },
      ],
    },
    homework: [
      {
        id: 'lugar_seguro',
        title: 'Lugar Seguro — Exercício de Ancoragem',
        description: 'Visualize e consolide seu lugar seguro para usar entre as sessões.',
        fields: [
          { id: 'descricao', label: 'Descreva seu lugar seguro', type: 'textarea', placeholder: 'Como é esse lugar? O que você vê, ouve, sente?' },
          { id: 'palavra_chave', label: 'Palavra-chave ou imagem âncora', type: 'text', placeholder: 'Uma palavra ou imagem que evoca esse lugar...' },
          { id: 'nivel_calma', label: 'Nível de calma ao visualizar (0-10)', type: 'scale_1_10' },
          { id: 'observacoes', label: 'Algo diferente desta vez?', type: 'textarea', placeholder: 'Observações sobre a prática...' },
        ],
      },
      {
        id: 'diario_pos_sessao',
        title: 'Registro Pós-Sessão',
        description: 'Anote o que surgiu após a sessão — sonhos, memórias, sensações.',
        fields: [
          { id: 'o_que_surgiu', label: 'O que surgiu após a sessão?', type: 'textarea', placeholder: 'Memórias, sonhos, pensamentos, sensações físicas...' },
          { id: 'intensidade', label: 'Intensidade geral (0-10)', type: 'scale_1_10' },
          { id: 'estrategia', label: 'Como você se cuidou?', type: 'textarea', placeholder: 'O que ajudou a se estabilizar?' },
        ],
      },
    ],
    diaryConfig: {
      title: 'Diário de Processamento',
      description: 'Registre o que surgiu após as sessões — sonhos, memórias, sensações.',
      entryLabel: 'Registrar pós-sessão',
    },
    psychoeducational: [
      { id: 'o_que_e_emdr', title: 'O que é EMDR', summary: 'Como a estimulação bilateral ajuda o cérebro a processar memórias traumáticas.' },
      { id: '8_fases', title: 'As 8 fases do EMDR', summary: 'Da história ao processamento — o que acontece em cada fase do tratamento.' },
      { id: 'o_que_esperar', title: 'O que esperar após uma sessão', summary: 'Por que podem surgir memórias, sonhos e emoções entre sessões — e o que fazer.' },
    ],
  },

  esquema: {
    approach: 'esquema',
    scales: [
      { id: 'ysq', abbreviation: 'YSQ-S3', title: 'Young Schema Questionnaire Short Form 3', description: 'Inventário de esquemas de Young' },
      { id: 'smi', abbreviation: 'SMI', title: 'Schema Mode Inventory', description: 'Inventário de modos de esquema' },
    ],
    noteTemplate: {
      title: 'Sessão Esquema-Terapia',
      sections: [
        { id: 'esquemas', label: 'Esquemas ativos', placeholder: 'Esquemas identificados na sessão (abandono, desconfiança, etc.)...' },
        { id: 'modos', label: 'Modos presentes', placeholder: 'Criança vulnerável, pai punitivo, adulto saudável... o que apareceu?' },
        { id: 'intervencao', label: 'Intervenção realizada', placeholder: 'Técnica cognitiva, experiencial (imaginação, cadeira), comportamental...' },
        { id: 'reparentalizacao', label: 'Reparentalização limitada', placeholder: 'Como o terapeuta respondeu às necessidades do modo criança...' },
      ],
    },
    homework: [
      {
        id: 'ativacao_esquema',
        title: 'Registro de Ativação de Esquema',
        description: 'Identifique quando um esquema foi ativado e como você reagiu.',
        fields: [
          { id: 'situacao', label: 'Situação', type: 'textarea', placeholder: 'O que aconteceu?' },
          { id: 'esquema', label: 'Esquema ativado', type: 'text', placeholder: 'Qual esquema foi ativado? (abandono, desconfiança, incompetência...)' },
          { id: 'modo', label: 'Modo ativado', type: 'radio', options: ['Criança vulnerável', 'Criança raivosa', 'Pai punitivo/crítico', 'Protetor desligado', 'Adulto saudável (consegui ativar?)'] },
          { id: 'reacao', label: 'Como você reagiu?', type: 'textarea', placeholder: 'Rendição, evitação ou hipercompensação?' },
          { id: 'adulto_saudavel', label: 'O que o adulto saudável diria?', type: 'textarea', placeholder: 'Uma resposta mais equilibrada...' },
        ],
      },
    ],
    diaryConfig: {
      title: 'Diário de Modos',
      description: 'Registre situações em que seus modos de esquema foram ativados.',
      entryLabel: 'Registrar ativação de modo',
    },
    psychoeducational: [
      { id: 'o_que_sao_esquemas', title: 'O que são esquemas', summary: 'Padrões emocionais e cognitivos formados na infância que persistem na vida adulta.' },
      { id: '18_esquemas', title: 'Os 18 esquemas de Young', summary: 'Abandono, desconfiança, privação emocional, defectividade... os padrões centrais.' },
      { id: 'modos', title: 'O que são modos de esquema', summary: 'Estados emocionais que dominam nosso comportamento em diferentes momentos.' },
    ],
  },

  humanista: {
    approach: 'humanista',
    scales: [
      { id: 'core_om', abbreviation: 'CORE-OM', title: 'Clinical Outcomes in Routine Evaluation', description: 'Bem-estar, sintomas, funcionamento e risco' },
      { id: 'oq45', abbreviation: 'OQ-45', title: 'Outcome Questionnaire-45', description: 'Monitoramento de resultados terapêuticos' },
    ],
    noteTemplate: {
      title: 'Sessão Centrada na Pessoa',
      sections: [
        { id: 'presenca', label: 'Presença e contato', placeholder: 'Qualidade do contato na sessão, como o cliente se apresentou...' },
        { id: 'empatia', label: 'Empatia e compreensão empática', placeholder: 'O que foi refletido e como o cliente respondeu...' },
        { id: 'processo', label: 'Processo de mudança', placeholder: 'Movimentos de autoexploração, aceitação, integração observados...' },
        { id: 'congruencia', label: 'Congruência do terapeuta', placeholder: 'Vivências do terapeuta que foram ou poderiam ser compartilhadas...' },
      ],
    },
    homework: [
      {
        id: 'roda_da_vida',
        title: 'Roda da Vida',
        description: 'Avalie seu nível de satisfação em diferentes áreas da vida.',
        fields: [
          { id: 'saude', label: 'Saúde e energia (0-10)', type: 'scale_1_10' },
          { id: 'relacoes', label: 'Relações e família (0-10)', type: 'scale_1_10' },
          { id: 'trabalho', label: 'Carreira e propósito (0-10)', type: 'scale_1_10' },
          { id: 'financeiro', label: 'Financeiro (0-10)', type: 'scale_1_10' },
          { id: 'lazer', label: 'Lazer e diversão (0-10)', type: 'scale_1_10' },
          { id: 'crescimento', label: 'Crescimento pessoal (0-10)', type: 'scale_1_10' },
          { id: 'reflexao', label: 'O que essa roda me diz?', type: 'textarea', placeholder: 'Onde estão os maiores desequilíbrios? O que quero mudar?' },
        ],
      },
    ],
    diaryConfig: {
      title: 'Diário de Autoexploração',
      description: 'Espaço para reflexão livre sobre sua experiência.',
      entryLabel: 'Escrever reflexão',
    },
    psychoeducational: [
      { id: '3_condicoes', title: 'As 3 condições de crescimento', summary: 'Empatia, congruência e consideração positiva incondicional — o que Rogers descobriu.' },
    ],
  },

  sistemica: {
    approach: 'sistemica',
    scales: [
      { id: 'faces4', abbreviation: 'FACES-IV', title: 'Family Adaptability and Cohesion Evaluation Scale IV', description: 'Coesão e adaptabilidade familiar' },
      { id: 'das', abbreviation: 'DAS', title: 'Dyadic Adjustment Scale', description: 'Ajustamento diádico (para casais)' },
    ],
    noteTemplate: {
      title: 'Sessão Sistêmica',
      sections: [
        { id: 'genograma', label: 'Genograma / Mapa familiar', placeholder: 'Atualizações no genograma, padrões transgeracionais observados...' },
        { id: 'padroes', label: 'Padrões de comunicação', placeholder: 'Padrões relacionais observados na sessão — quem fala por quem, coalizões, etc.' },
        { id: 'hipotese', label: 'Hipótese sistêmica', placeholder: 'Formulação sistêmica atual do caso...' },
        { id: 'intervencao', label: 'Intervenção', placeholder: 'Prescrição, recadragem, questionamento circular, escultura...' },
      ],
    },
    homework: [
      {
        id: 'genograma_paciente',
        title: 'Meu Genograma Familiar',
        description: 'Mapeie sua família por pelo menos 3 gerações.',
        fields: [
          { id: 'familia_atual', label: 'Família atual (quem mora com você / família nuclear)', type: 'textarea', placeholder: 'Nomes, idades, relações...' },
          { id: 'familia_origem', label: 'Família de origem (pais, avós)', type: 'textarea', placeholder: 'Nomes, profissões, relações marcantes...' },
          { id: 'padroes', label: 'Padrões que percebo na família', type: 'textarea', placeholder: 'Repetições, segredos, temas recorrentes...' },
        ],
      },
    ],
    diaryConfig: {
      title: 'Diário de Relações',
      description: 'Registre interações significativas e padrões que percebeu.',
      entryLabel: 'Registrar interação',
    },
    psychoeducational: [
      { id: 'pensamento_sistemico', title: 'Pensamento sistêmico', summary: 'Por que problemas individuais sempre fazem parte de um sistema maior.' },
      { id: 'papeis', title: 'Papéis familiares', summary: 'Como os papéis que assumimos na família moldam quem nos tornamos.' },
    ],
  },

  logoterapia: {
    approach: 'logoterapia',
    scales: [
      { id: 'pil', abbreviation: 'PIL', title: 'Purpose in Life Test', description: 'Propósito e sentido de vida' },
      { id: 'mlq', abbreviation: 'MLQ', title: 'Meaning in Life Questionnaire', description: 'Presença e busca de sentido' },
    ],
    noteTemplate: {
      title: 'Sessão de Logoterapia',
      sections: [
        { id: 'sentido', label: 'Sentido encontrado / buscado', placeholder: 'Como o paciente está vivenciando a questão do sentido...' },
        { id: 'valores', label: 'Valores em jogo', placeholder: 'Valores vivenciais, criativos ou de atitude identificados...' },
        { id: 'liberdade', label: 'Liberdade e responsabilidade', placeholder: 'Espaço de liberdade que o paciente está exercendo ou evitando...' },
        { id: 'tecnica', label: 'Técnica utilizada', placeholder: 'Intenção paradoxal, derreflexão, diálogo socrático...' },
      ],
    },
    homework: [
      {
        id: 'o_que_me_da_sentido',
        title: '"O que me dá sentido?"',
        description: 'Reflexão sobre as fontes de sentido na sua vida.',
        fields: [
          { id: 'dar', label: 'O que você dá ao mundo (criação, trabalho)', type: 'textarea', placeholder: 'O que você contribui, cria, realiza...' },
          { id: 'receber', label: 'O que você recebe (experiências, amor, beleza)', type: 'textarea', placeholder: 'O que te toca, comove, enriquece...' },
          { id: 'atitude', label: 'Sua atitude diante do sofrimento inevitável', type: 'textarea', placeholder: 'Como você se posiciona diante do que não pode mudar?' },
          { id: 'sentido_agora', label: 'Qual é o sentido possível agora?', type: 'textarea', placeholder: 'Mesmo que pequeno...' },
        ],
      },
      {
        id: 'carta_futuro',
        title: 'Carta ao Futuro Eu',
        description: 'Escreva uma carta para você daqui a 5 anos — de quem você quer ter sido.',
        fields: [
          { id: 'carta', label: 'A carta', type: 'textarea', placeholder: 'Querido(a) eu do futuro... O que você espera ter vivido? Que tipo de pessoa quer ter sido?' },
          { id: 'acao_hoje', label: 'Uma ação que posso fazer hoje', type: 'textarea', placeholder: 'Algo pequeno e concreto que aponta para essa direção...' },
        ],
      },
    ],
    diaryConfig: {
      title: 'Diário de Sentido',
      description: 'Registre momentos em que sentiu propósito, significado ou gratidão.',
      entryLabel: 'Registrar momento de sentido',
    },
    psychoeducational: [
      { id: 'triangulo_tragico', title: 'O triângulo trágico', summary: 'Sofrimento, culpa e transitoriedade — e como encontrar sentido em cada um.' },
      { id: '3_valores', title: 'Os 3 tipos de valores', summary: 'Valores de criação, de experiência e de atitude — as três fontes de sentido.' },
    ],
  },
};
```

- [ ] **Commit**

```bash
git add Frontend/src/data/packages.ts
git commit -m "feat(packages): add curated content data for all 11 therapeutic approaches"
```

---

## Task 3: Package Service + Testes

**Files:**
- Create: `Frontend/src/services/packageService.ts`
- Create: `Frontend/src/services/packageService.test.ts`

- [ ] **Escrever os testes primeiro**

```typescript
// Frontend/src/services/packageService.test.ts
import { describe, it, expect } from 'vitest';
import {
  getPackage,
  getScales,
  getHomework,
  getNoteTemplate,
  getDiaryConfig,
  getPsychoeducational,
  getApproachesForPsychologist,
} from './packageService';

describe('packageService', () => {
  it('getPackage retorna o pacote correto para TCC', () => {
    const pkg = getPackage('tcc');
    expect(pkg.approach).toBe('tcc');
    expect(pkg.scales.length).toBeGreaterThan(0);
    expect(pkg.homework.length).toBeGreaterThan(0);
  });

  it('getScales retorna escalas da abordagem', () => {
    const scales = getScales('dbt');
    expect(scales.map(s => s.abbreviation)).toContain('DERS');
    expect(scales.map(s => s.abbreviation)).toContain('BSL-23');
  });

  it('getHomework retorna fichas da abordagem', () => {
    const hw = getHomework('dbt');
    const ids = hw.map(h => h.id);
    expect(ids).toContain('diary_card');
    expect(ids).toContain('dear_man');
  });

  it('getNoteTemplate retorna template com seções', () => {
    const tpl = getNoteTemplate('tcc');
    expect(tpl.sections.length).toBeGreaterThan(0);
    expect(tpl.sections[0]).toHaveProperty('id');
    expect(tpl.sections[0]).toHaveProperty('label');
    expect(tpl.sections[0]).toHaveProperty('placeholder');
  });

  it('getDiaryConfig retorna config de diário', () => {
    const config = getDiaryConfig('analitica');
    expect(config.title).toBeTruthy();
    expect(config.entryLabel).toBeTruthy();
  });

  it('getPsychoeducational retorna materiais', () => {
    const materials = getPsychoeducational('act');
    expect(materials.length).toBeGreaterThan(0);
    expect(materials[0]).toHaveProperty('title');
    expect(materials[0]).toHaveProperty('summary');
  });

  it('getApproachesForPsychologist filtra da lista global', () => {
    const filtered = getApproachesForPsychologist(['tcc', 'dbt']);
    expect(filtered).toHaveLength(2);
    expect(filtered.map(a => a.approach)).toContain('tcc');
    expect(filtered.map(a => a.approach)).toContain('dbt');
  });

  it('getPackage cobre todas as 11 abordagens', () => {
    const approaches = ['tcc','dbt','act','psicanalitica','analitica','gestalt','emdr','esquema','humanista','sistemica','logoterapia'] as const;
    for (const a of approaches) {
      expect(() => getPackage(a)).not.toThrow();
    }
  });
});
```

- [ ] **Rodar para confirmar que falha**

```bash
cd Frontend && npx vitest run src/services/packageService.test.ts
```
Esperado: FAIL — "Cannot find module './packageService'"

- [ ] **Implementar o service**

```typescript
// Frontend/src/services/packageService.ts
import { PACKAGES, type ApproachPackage, type PackageScale, type PackageHomework, type PackagePsychoeducational } from '../data/packages';
import type { Approach } from '../types/approach';

export function getPackage(approach: Approach): ApproachPackage {
  return PACKAGES[approach];
}

export function getScales(approach: Approach): PackageScale[] {
  return PACKAGES[approach].scales;
}

export function getHomework(approach: Approach): PackageHomework[] {
  return PACKAGES[approach].homework;
}

export function getNoteTemplate(approach: Approach) {
  return PACKAGES[approach].noteTemplate;
}

export function getDiaryConfig(approach: Approach) {
  return PACKAGES[approach].diaryConfig;
}

export function getPsychoeducational(approach: Approach): PackagePsychoeducational[] {
  return PACKAGES[approach].psychoeducational;
}

export function getApproachesForPsychologist(approaches: Approach[]): ApproachPackage[] {
  return approaches.map(a => PACKAGES[a]);
}
```

- [ ] **Rodar testes para confirmar PASS**

```bash
cd Frontend && npx vitest run src/services/packageService.test.ts
```
Esperado: PASS — 8 testes passando

- [ ] **Commit**

```bash
git add Frontend/src/services/packageService.ts Frontend/src/services/packageService.test.ts
git commit -m "feat(packages): add packageService with full test coverage"
```

---

## Task 4: Approach Storage Service (localStorage)

**Files:**
- Create: `Frontend/src/services/approachStorageService.ts`

- [ ] **Implementar o service de persistência**

```typescript
// Frontend/src/services/approachStorageService.ts
import type { Approach } from '../types/approach';

const PSYCHOLOGIST_APPROACHES_KEY = 'ethos_psychologist_approaches_v1';
const PATIENT_APPROACH_PREFIX = 'ethos_patient_approach_v1_';

// Psicólogo — abordagens que ele domina
export function getPsychologistApproaches(): Approach[] {
  try {
    const raw = localStorage.getItem(PSYCHOLOGIST_APPROACHES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Approach[];
  } catch {
    return [];
  }
}

export function setPsychologistApproaches(approaches: Approach[]): void {
  try {
    localStorage.setItem(PSYCHOLOGIST_APPROACHES_KEY, JSON.stringify(approaches));
  } catch { /* best effort */ }
}

// Paciente — abordagem atribuída pelo psicólogo
export function getPatientApproach(patientId: string): Approach | null {
  try {
    const raw = localStorage.getItem(`${PATIENT_APPROACH_PREFIX}${patientId}`);
    return raw ? (raw as Approach) : null;
  } catch {
    return null;
  }
}

export function setPatientApproach(patientId: string, approach: Approach | null): void {
  try {
    if (approach === null) {
      localStorage.removeItem(`${PATIENT_APPROACH_PREFIX}${patientId}`);
    } else {
      localStorage.setItem(`${PATIENT_APPROACH_PREFIX}${patientId}`, approach);
    }
  } catch { /* best effort */ }
}
```

- [ ] **Commit**

```bash
git add Frontend/src/services/approachStorageService.ts
git commit -m "feat(packages): add localStorage-based approach storage service"
```

---

## Task 5: ApproachMultiSelect + AccountPage

**Files:**
- Create: `Frontend/src/components/ApproachMultiSelect.tsx`
- Modify: `Frontend/src/pages/AccountPage.tsx`

- [ ] **Criar o componente ApproachMultiSelect**

```tsx
// Frontend/src/components/ApproachMultiSelect.tsx
import { APPROACHES, APPROACH_LABELS, APPROACH_COLORS, type Approach } from '../types/approach';
import { cn } from '../lib/utils';

interface ApproachMultiSelectProps {
  value: Approach[];
  onChange: (approaches: Approach[]) => void;
}

export function ApproachMultiSelect({ value, onChange }: ApproachMultiSelectProps) {
  const toggle = (approach: Approach) => {
    if (value.includes(approach)) {
      onChange(value.filter(a => a !== approach));
    } else {
      onChange([...value, approach]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {APPROACHES.map(approach => {
        const selected = value.includes(approach);
        return (
          <button
            key={approach}
            type="button"
            onClick={() => toggle(approach)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-150',
              selected
                ? APPROACH_COLORS[approach]
                : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground',
            )}
          >
            {APPROACH_LABELS[approach]}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Integrar em AccountPage**

Encontre a seção do perfil profissional em `Frontend/src/pages/AccountPage.tsx` onde "abordagem clínica" é exibida (campo de texto ou similar). Substitua pelo `ApproachMultiSelect`:

```tsx
// Adicionar imports no topo de AccountPage.tsx:
import { ApproachMultiSelect } from '../components/ApproachMultiSelect';
import { getPsychologistApproaches, setPsychologistApproaches } from '../services/approachStorageService';
import type { Approach } from '../types/approach';

// Dentro do componente AccountPage, adicionar estado:
const [approaches, setApproaches] = useState<Approach[]>(() => getPsychologistApproaches());

const handleApproachesChange = (newApproaches: Approach[]) => {
  setApproaches(newApproaches);
  setPsychologistApproaches(newApproaches);
};

// Na JSX, onde ficava o campo de abordagem clínica, substituir por:
<div className="space-y-2">
  <label className="text-sm font-medium text-foreground">Abordagens clínicas</label>
  <p className="text-xs text-muted-foreground">
    Selecione as abordagens que você domina. Elas determinam quais pacotes ficam disponíveis.
  </p>
  <ApproachMultiSelect value={approaches} onChange={handleApproachesChange} />
</div>
```

- [ ] **Commit**

```bash
git add Frontend/src/components/ApproachMultiSelect.tsx Frontend/src/pages/AccountPage.tsx
git commit -m "feat(packages): add ApproachMultiSelect to AccountPage"
```

---

## Task 6: PatientApproachSelector + PatientDetailPage

**Files:**
- Create: `Frontend/src/components/PatientApproachSelector.tsx`
- Modify: `Frontend/src/pages/PatientDetailPage.tsx`

- [ ] **Criar PatientApproachSelector**

```tsx
// Frontend/src/components/PatientApproachSelector.tsx
import { useState } from 'react';
import { Package } from 'lucide-react';
import { APPROACH_FULL_LABELS, APPROACH_COLORS, type Approach } from '../types/approach';
import { getPackage } from '../services/packageService';
import { getPsychologistApproaches } from '../services/approachStorageService';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

interface PatientApproachSelectorProps {
  patientId: string;
  value: Approach | null;
  onChange: (approach: Approach | null) => void;
}

export function PatientApproachSelector({ patientId, value, onChange }: PatientApproachSelectorProps) {
  const psychologistApproaches = getPsychologistApproaches();
  const [showPreview, setShowPreview] = useState(false);
  const pkg = value ? getPackage(value) : null;

  if (psychologistApproaches.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Configure suas abordagens clínicas em{' '}
        <span className="font-medium text-primary">Conta → Abordagens clínicas</span>{' '}
        para ativar pacotes.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value ? (e.target.value as Approach) : null)}
        className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        <option value="">Sem abordagem definida</option>
        {psychologistApproaches.map(a => (
          <option key={a} value={a}>{APPROACH_FULL_LABELS[a]}</option>
        ))}
      </select>

      {value && pkg && (
        <div className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              <span className={cn('rounded-full border px-2 py-0.5 text-xs font-medium', APPROACH_COLORS[value])}>
                Pacote {APPROACH_FULL_LABELS[value]}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowPreview(v => !v)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {showPreview ? 'Ocultar detalhes' : 'Ver o que inclui'}
            </button>
          </div>

          {showPreview && (
            <div className="space-y-2 text-xs text-muted-foreground">
              <p><span className="font-medium text-foreground">Escalas:</span> {pkg.scales.map(s => s.abbreviation).join(', ')}</p>
              <p><span className="font-medium text-foreground">Fichas:</span> {pkg.homework.map(h => h.title).join(', ')}</p>
              <p><span className="font-medium text-foreground">Template de prontuário:</span> {pkg.noteTemplate.title}</p>
              <p><span className="font-medium text-foreground">Diário do paciente:</span> {pkg.diaryConfig.title}</p>
              <p><span className="font-medium text-foreground">Materiais psicoeducativos:</span> {pkg.psychoeducational.map(p => p.title).join(', ')}</p>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            As ferramentas do pacote ficam em destaque nas páginas de formulários, escalas, prontuário e documentos.
            Nada é atribuído automaticamente — você decide o que usar.
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Integrar em PatientDetailPage — aba Perfil**

Em `Frontend/src/pages/PatientDetailPage.tsx`, na aba "Perfil", adicione após os dados básicos do paciente:

```tsx
// Imports a adicionar:
import { PatientApproachSelector } from '../components/PatientApproachSelector';
import { getPatientApproach, setPatientApproach } from '../services/approachStorageService';
import type { Approach } from '../types/approach';

// Estado a adicionar dentro do componente:
const [patientApproach, setPatientApproachState] = useState<Approach | null>(
  () => patient?.id ? getPatientApproach(patient.id) : null
);

const handleApproachChange = (approach: Approach | null) => {
  if (!patient?.id) return;
  setPatientApproachState(approach);
  setPatientApproach(patient.id, approach);
};

// Na JSX da aba Perfil, adicionar seção antes dos dados de contato:
<div className="session-card space-y-3">
  <div>
    <h3 className="text-sm font-semibold text-foreground">Abordagem Terapêutica</h3>
    <p className="text-xs text-muted-foreground mt-0.5">
      Define o pacote de ferramentas ativo para este paciente.
    </p>
  </div>
  <PatientApproachSelector
    patientId={patient.id}
    value={patientApproach}
    onChange={handleApproachChange}
  />
</div>
```

- [ ] **Commit**

```bash
git add Frontend/src/components/PatientApproachSelector.tsx Frontend/src/pages/PatientDetailPage.tsx
git commit -m "feat(packages): add PatientApproachSelector to PatientDetailPage"
```

---

## Task 7: PackageBanner — FormsPage e ScalesPage

**Files:**
- Create: `Frontend/src/components/PackageBanner.tsx`
- Modify: `Frontend/src/pages/FormsPage.tsx`
- Modify: `Frontend/src/pages/ScalesPage.tsx`

- [ ] **Criar PackageBanner**

```tsx
// Frontend/src/components/PackageBanner.tsx
import { Package } from 'lucide-react';
import { APPROACH_FULL_LABELS, APPROACH_COLORS, type Approach } from '../types/approach';
import { cn } from '../lib/utils';

interface PackageBannerItem {
  id: string;
  title: string;
  description: string;
}

interface PackageBannerProps {
  approach: Approach;
  items: PackageBannerItem[];
  onAssign: (item: PackageBannerItem) => void;
  assignLabel?: string;
}

export function PackageBanner({ approach, items, onAssign, assignLabel = 'Atribuir' }: PackageBannerProps) {
  return (
    <div className="mb-6 rounded-2xl border border-border bg-card/60 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4 text-primary shrink-0" />
        <span className={cn('rounded-full border px-2.5 py-1 text-xs font-semibold', APPROACH_COLORS[approach])}>
          Pacote {APPROACH_FULL_LABELS[approach]}
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map(item => (
          <div
            key={item.id}
            className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-background/60 px-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
            <button
              type="button"
              onClick={() => onAssign(item)}
              className="shrink-0 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              {assignLabel}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Integrar PackageBanner em FormsPage**

Em `Frontend/src/pages/FormsPage.tsx`, após a abertura do conteúdo principal, adicione:

```tsx
// Imports a adicionar:
import { PackageBanner } from '../components/PackageBanner';
import { getPatientApproach } from '../services/approachStorageService';
import { getHomework } from '../services/packageService';
import type { Approach } from '../types/approach';

// Dentro do componente, quando um paciente está selecionado:
// (FormsPage recebe patientId como prop ou via contexto — adapte ao padrão existente)
const patientApproach = patientId ? getPatientApproach(patientId) : null;
const packageHomework = patientApproach ? getHomework(patientApproach) : [];

// Na JSX, antes da lista de formulários:
{patientApproach && packageHomework.length > 0 && (
  <PackageBanner
    approach={patientApproach}
    items={packageHomework.map(h => ({ id: h.id, title: h.title, description: h.description }))}
    onAssign={(item) => {
      // Chama a lógica existente de atribuição de formulário ao paciente
      // (adapte ao padrão atual de formService.assignToPatient ou equivalente)
      toast({ title: `${item.title} atribuída ao paciente.` });
    }}
    assignLabel="Atribuir"
  />
)}
```

- [ ] **Integrar PackageBanner em ScalesPage**

Em `Frontend/src/pages/ScalesPage.tsx`, mesmo padrão:

```tsx
// Imports a adicionar:
import { PackageBanner } from '../components/PackageBanner';
import { getPatientApproach } from '../services/approachStorageService';
import { getScales } from '../services/packageService';

const patientApproach = patientId ? getPatientApproach(patientId) : null;
const packageScales = patientApproach ? getScales(patientApproach) : [];

// Na JSX, antes da lista de escalas:
{patientApproach && packageScales.length > 0 && (
  <PackageBanner
    approach={patientApproach}
    items={packageScales.map(s => ({
      id: s.id,
      title: `${s.abbreviation} — ${s.title}`,
      description: s.description,
    }))}
    onAssign={(item) => {
      toast({ title: `${item.title} adicionada para aplicação.` });
    }}
    assignLabel="Aplicar"
  />
)}
```

- [ ] **Commit**

```bash
git add Frontend/src/components/PackageBanner.tsx Frontend/src/pages/FormsPage.tsx Frontend/src/pages/ScalesPage.tsx
git commit -m "feat(packages): add PackageBanner to FormsPage and ScalesPage"
```

---

## Task 8: NoteTemplatePrompt + ProntuarioPage

**Files:**
- Create: `Frontend/src/components/NoteTemplatePrompt.tsx`
- Modify: `Frontend/src/pages/ProntuarioPage.tsx`

- [ ] **Criar NoteTemplatePrompt**

```tsx
// Frontend/src/components/NoteTemplatePrompt.tsx
import { FileText } from 'lucide-react';
import { APPROACH_FULL_LABELS, type Approach } from '../types/approach';
import { getNoteTemplate } from '../services/packageService';
import { Button } from './ui/button';

interface NoteTemplatePromptProps {
  approach: Approach;
  onUseTemplate: (sections: Record<string, string>) => void;
  onDismiss: () => void;
}

export function NoteTemplatePrompt({ approach, onUseTemplate, onDismiss }: NoteTemplatePromptProps) {
  const template = getNoteTemplate(approach);

  const handleUse = () => {
    // Retorna as seções como objeto vazio para pré-preencher a estrutura
    const sections = Object.fromEntries(template.sections.map(s => [s.id, '']));
    onUseTemplate(sections);
  };

  return (
    <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            Usar template {APPROACH_FULL_LABELS[approach]}?
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Seções: {template.sections.map(s => s.label).join(' · ')}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button size="sm" onClick={handleUse} className="h-8 text-xs">
            Usar template
          </Button>
          <Button size="sm" variant="ghost" onClick={onDismiss} className="h-8 text-xs">
            Começar em branco
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Integrar em ProntuarioPage**

Em `Frontend/src/pages/ProntuarioPage.tsx`, adicione o prompt quando a nota é nova e o paciente tem abordagem:

```tsx
// Imports a adicionar:
import { NoteTemplatePrompt } from '../components/NoteTemplatePrompt';
import { getPatientApproach } from '../services/approachStorageService';
import type { Approach } from '../types/approach';

// Estado a adicionar:
const [templateDismissed, setTemplateDismissed] = useState(false);
const patientApproach = patientId ? getPatientApproach(patientId) : null;
const isNewNote = !existingNote; // adapte à lógica existente

// Na JSX, no topo do editor (antes dos campos de texto):
{isNewNote && patientApproach && !templateDismissed && (
  <NoteTemplatePrompt
    approach={patientApproach}
    onUseTemplate={(sections) => {
      // Pré-preenche os campos do prontuário com as seções do template
      // Adapte ao setFieldValue ou equivalente que a página já usa
      setTemplateDismissed(true);
    }}
    onDismiss={() => setTemplateDismissed(true)}
  />
)}
```

- [ ] **Commit**

```bash
git add Frontend/src/components/NoteTemplatePrompt.tsx Frontend/src/pages/ProntuarioPage.tsx
git commit -m "feat(packages): add NoteTemplatePrompt to ProntuarioPage"
```

---

## Task 9: PsychoeducationalSection + DocumentsPage

**Files:**
- Create: `Frontend/src/components/PsychoeducationalSection.tsx`
- Modify: `Frontend/src/pages/DocumentsPage.tsx`

- [ ] **Criar PsychoeducationalSection**

```tsx
// Frontend/src/components/PsychoeducationalSection.tsx
import { BookOpen, Share2 } from 'lucide-react';
import { APPROACH_FULL_LABELS, APPROACH_COLORS, type Approach } from '../types/approach';
import { getPsychoeducational } from '../services/packageService';
import { cn } from '../lib/utils';

interface PsychoeducationalSectionProps {
  approach: Approach;
  onShare: (materialId: string, title: string) => void;
}

export function PsychoeducationalSection({ approach, onShare }: PsychoeducationalSectionProps) {
  const materials = getPsychoeducational(approach);

  if (materials.length === 0) return null;

  return (
    <div className="mb-6 space-y-3">
      <div className="flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">
          Materiais psicoeducativos
        </h3>
        <span className={cn('rounded-full border px-2 py-0.5 text-xs font-medium', APPROACH_COLORS[approach])}>
          {APPROACH_FULL_LABELS[approach]}
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {materials.map(material => (
          <div
            key={material.id}
            className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-card px-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{material.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{material.summary}</p>
            </div>
            <button
              type="button"
              onClick={() => onShare(material.id, material.title)}
              className="mt-0.5 shrink-0 flex items-center gap-1 rounded-lg border border-border/60 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
            >
              <Share2 className="h-3 w-3" />
              Compartilhar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Integrar em DocumentsPage**

Em `Frontend/src/pages/DocumentsPage.tsx`, antes da lista de documentos gerados:

```tsx
// Imports a adicionar:
import { PsychoeducationalSection } from '../components/PsychoeducationalSection';
import { getPatientApproach } from '../services/approachStorageService';

const patientApproach = patientId ? getPatientApproach(patientId) : null;

// Na JSX:
{patientApproach && (
  <PsychoeducationalSection
    approach={patientApproach}
    onShare={(materialId, title) => {
      // Usa a lógica existente de compartilhamento com o paciente
      toast({ title: `"${title}" compartilhado com o paciente.` });
    }}
  />
)}
```

- [ ] **Commit**

```bash
git add Frontend/src/components/PsychoeducationalSection.tsx Frontend/src/pages/DocumentsPage.tsx
git commit -m "feat(packages): add PsychoeducationalSection to DocumentsPage"
```

---

## Task 10: HomeworkWidget + PatientHomePage

**Files:**
- Create: `Frontend/src/components/HomeworkWidget.tsx`
- Modify: `Frontend/src/pages/patient/PatientHomePage.tsx`

- [ ] **Criar HomeworkWidget**

```tsx
// Frontend/src/components/HomeworkWidget.tsx
import { motion } from 'framer-motion';
import { ClipboardList, ArrowRight } from 'lucide-react';

interface HomeworkItem {
  id: string;
  title: string;
  description: string;
  onOpen: () => void;
}

interface HomeworkWidgetProps {
  items: HomeworkItem[];
}

export function HomeworkWidget({ items }: HomeworkWidgetProps) {
  if (items.length === 0) return null;

  return (
    <motion.section
      className="session-card space-y-4"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
    >
      <div className="flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-serif text-base font-medium md:text-lg">
          Para fazer antes da próxima sessão
        </h2>
      </div>
      <div className="space-y-2.5">
        {items.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={item.onOpen}
            className="w-full text-left rounded-xl border border-border/70 bg-background/70 px-4 py-3 hover:border-primary/30 hover:bg-primary/5 transition-colors group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </button>
        ))}
      </div>
    </motion.section>
  );
}
```

- [ ] **Integrar em PatientHomePage**

Em `Frontend/src/pages/patient/PatientHomePage.tsx`, adicione após o grid de Summary Cards:

```tsx
// Imports a adicionar:
import { HomeworkWidget } from '../../components/HomeworkWidget';
import { getPatientApproach } from '../../services/approachStorageService';
import { getHomework } from '../../services/packageService';
import { useAuth } from '../../contexts/AuthContext';

// Dentro do componente:
const { user } = useAuth();
const patientApproach = user?.id ? getPatientApproach(user.id) : null;
const packageHomework = patientApproach ? getHomework(patientApproach) : [];

// Na JSX, após o grid de summary cards:
<HomeworkWidget
  items={packageHomework.slice(0, 3).map(hw => ({
    id: hw.id,
    title: hw.title,
    description: hw.description,
    onOpen: () => onNavigate('patient-diary'),
  }))}
/>
```

- [ ] **Commit**

```bash
git add Frontend/src/components/HomeworkWidget.tsx Frontend/src/pages/patient/PatientHomePage.tsx
git commit -m "feat(packages): add HomeworkWidget to PatientHomePage"
```

---

## Task 11: PatientDiaryPage — Diário Primário por Abordagem

**Files:**
- Modify: `Frontend/src/pages/patient/PatientDiaryPage.tsx`

- [ ] **Integrar diário primário da abordagem**

Em `Frontend/src/pages/patient/PatientDiaryPage.tsx`, adicione um card de destaque no topo da página com o diário principal da abordagem do paciente:

```tsx
// Imports a adicionar:
import { getPatientApproach } from '../../services/approachStorageService';
import { getDiaryConfig } from '../../services/packageService';
import { APPROACH_COLORS, APPROACH_FULL_LABELS } from '../../types/approach';
import { BookOpen } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';

// Dentro do componente:
const { user } = useAuth();
const patientApproach = user?.id ? getPatientApproach(user.id) : null;
const diaryConfig = patientApproach ? getDiaryConfig(patientApproach) : null;

// Na JSX, ANTES das abas existentes (Diário | Sonhos):
{diaryConfig && patientApproach && (
  <motion.div
    className={cn(
      'mb-6 rounded-2xl border p-4 space-y-3',
      APPROACH_COLORS[patientApproach].replace('text-', 'border-').replace('bg-', 'bg-').split(' ')[0],
      'bg-card',
    )}
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
  >
    <div className="flex items-center gap-2">
      <BookOpen className="h-4 w-4 text-primary" />
      <span className={cn('rounded-full border px-2 py-0.5 text-xs font-medium', APPROACH_COLORS[patientApproach])}>
        {APPROACH_FULL_LABELS[patientApproach]}
      </span>
    </div>
    <div>
      <p className="text-sm font-semibold text-foreground">{diaryConfig.title}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{diaryConfig.description}</p>
    </div>
    <button
      type="button"
      // onClick abre o formulário de nova entrada do diário primário
      // adapte para abrir o formulário correto baseado no diaryConfig
      className="w-full rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
    >
      {diaryConfig.entryLabel}
    </button>
  </motion.div>
)}
```

- [ ] **Commit**

```bash
git add Frontend/src/pages/patient/PatientDiaryPage.tsx
git commit -m "feat(packages): show approach-specific primary diary in PatientDiaryPage"
```

---

## Verificação Final

- [ ] Abrir AccountPage → selecionar 2+ abordagens → recarregar → verificar que persiste
- [ ] Abrir PatientDetailPage de qualquer paciente → aba Perfil → selecionar abordagem → ver preview do pacote
- [ ] Abrir FormsPage com paciente com abordagem → verificar PackageBanner no topo com fichas
- [ ] Abrir ScalesPage com paciente com abordagem → verificar PackageBanner com escalas
- [ ] Criar novo prontuário para paciente com abordagem → verificar NoteTemplatePrompt
- [ ] Abrir DocumentsPage com paciente com abordagem → verificar PsychoeducationalSection
- [ ] Logar como paciente → verificar HomeworkWidget no home
- [ ] Logar como paciente → abrir Diário → verificar card de diário primário no topo
- [ ] Mudar abordagem de um paciente → verificar que as seções de pacote atualizam
- [ ] Rodar testes: `cd Frontend && npx vitest run`
