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
