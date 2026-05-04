export type FreeTool = {
  slug: string;
  title: string;
  seoTitle: string;
  description: string;
  category: string;
  keyword: string;
  eyebrow: string;
  heroTitle: string;
  heroText: string;
  ctaLabel: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
  toolType:
    | "contract"
    | "lgpd"
    | "pricing"
    | "absence-policy"
    | "record-checklist"
    | "weekly-planner"
    | "bio-generator";
  highlights: string[];
  references?: Array<{
    label: string;
    url: string;
    note: string;
  }>;
  faq: Array<{ q: string; a: string }>;
};

const ETHICS_REFERENCE = {
  label: "Codigo de Etica Profissional da(o) Psicologa(o) - CFP",
  url: "https://site.cfp.org.br/publicacao/codigo-de-etica-profissional-dao-psicologao/",
  note: "Base para comunicacao profissional, sigilo, combinados e responsabilidade tecnica.",
};

const HONORARIOS_REFERENCE = {
  label: "Tabela de Honorarios CFP/FENAPSI",
  url: "https://site.cfp.org.br/servicos/tabela-de-honorarios/",
  note: "Referencia nacional de honorarios, elaborada por CFP/FENAPSI com apoio do DIEESE. Nao e piso nem teto obrigatorio.",
};

const REGISTRO_REFERENCE = {
  label: "Registro documental e prontuario psicologico - CRP/CFP",
  url: "https://transparencia.cfp.org.br/crp12/pergunta-frequente/registro-documental/",
  note: "Orientacao sobre registro documental, prontuario psicologico e acesso as informacoes registradas.",
};

const LGPD_REFERENCE = {
  label: "ANPD - Autoridade Nacional de Protecao de Dados",
  url: "https://www.gov.br/anpd/pt-br",
  note: "Referencia publica oficial para LGPD. Para psicologia, deve ser lida junto ao Codigo de Etica e normas CFP/CRP.",
};

export const freeTools: FreeTool[] = [
  {
    slug: "modelo-contrato-psicologico",
    title: "Gerador de contrato terapeutico simples",
    seoTitle: "Gerador de contrato terapeutico para psicologos | ETHOS",
    description:
      "Crie um rascunho simples de contrato terapeutico para psicologos com combinados de atendimento, pagamento, faltas e remarcacoes.",
    category: "Documentos",
    keyword: "contrato terapeutico para psicologos",
    eyebrow: "Ferramenta gratuita",
    heroTitle: "Gerador de contrato terapeutico para psicologos",
    heroText:
      "Monte um rascunho inicial com dados profissionais, formato de atendimento, valor, politica de faltas e combinados basicos. Revise tudo antes de usar.",
    ctaLabel: "Gerar rascunho",
    highlights: ["Contrato terapeutico", "Combinados claros", "Rascunho revisavel"],
    toolType: "contract",
    references: [ETHICS_REFERENCE, HONORARIOS_REFERENCE],
    faq: [
      {
        q: "O contrato gerado substitui orientacao juridica?",
        a: "Nao. A ferramenta gera um rascunho inicial e precisa ser revisada pela profissional antes de uso.",
      },
      {
        q: "Posso colocar dados clinicos do paciente?",
        a: "Nao. Use apenas dados administrativos e combinados de atendimento.",
      },
    ],
  },
  {
    slug: "checklist-lgpd-psicologos",
    title: "Checklist LGPD para psicologas",
    seoTitle: "Checklist LGPD para psicologos | ETHOS",
    description:
      "Checklist gratuito de LGPD para psicologas revisarem coleta de dados, armazenamento, acesso, documentos e ferramentas digitais.",
    category: "LGPD e privacidade",
    keyword: "LGPD para psicologos",
    eyebrow: "Privacidade",
    heroTitle: "Checklist LGPD para psicologas",
    heroText:
      "Revise pontos de cuidado com dados pessoais e sensiveis na rotina do consultorio sem transformar privacidade em burocracia infinita.",
    ctaLabel: "Marcar checklist",
    highlights: ["Dados sensiveis", "Rotina do consultorio", "Revisao pratica"],
    toolType: "lgpd",
    references: [LGPD_REFERENCE, ETHICS_REFERENCE, REGISTRO_REFERENCE],
    faq: [
      {
        q: "Esse checklist e consultoria juridica?",
        a: "Nao. Ele organiza pontos de atencao e nao substitui orientacao juridica especializada.",
      },
      {
        q: "A ferramenta coleta dados de pacientes?",
        a: "Nao. Ela serve para autoavaliacao da rotina profissional.",
      },
    ],
  },
  {
    slug: "calculadora-preco-sessao-psicologia",
    title: "Calculadora de preco de sessao para psicologas",
    seoTitle: "Calculadora de preco de sessao para psicologos | ETHOS",
    description:
      "Calcule uma referencia de preco por sessao e receita mensal considerando custos, horas disponiveis, faltas e meta financeira.",
    category: "Financeiro",
    keyword: "calculadora preco sessao psicologia",
    eyebrow: "Financeiro",
    heroTitle: "Calculadora de preco de sessao para psicologas",
    heroText:
      "Simule meta mensal, custos, quantidade de sessoes e margem de faltas junto da referencia nacional CFP/FENAPSI para chegar a uma decisao mais consciente.",
    ctaLabel: "Calcular referencia",
    highlights: ["CFP/FENAPSI", "Preco por sessao", "Custos e faltas"],
    toolType: "pricing",
    references: [HONORARIOS_REFERENCE, ETHICS_REFERENCE],
    faq: [
      {
        q: "A calculadora define quanto devo cobrar?",
        a: "Nao. A tabela CFP/FENAPSI e referencial nacional, nao piso nem teto obrigatorio. A ferramenta combina essa base com seus custos, agenda, cidade e realidade profissional.",
      },
      {
        q: "O ETHOS faz controle financeiro?",
        a: "Sim. O app ETHOS organiza pagamentos, pendencias e previsao de receita do consultorio.",
      },
    ],
  },
  {
    slug: "politica-faltas-remarcacoes",
    title: "Modelo de politica de faltas e remarcacoes",
    seoTitle: "Modelo de politica de faltas e remarcacoes para psicologos | ETHOS",
    description:
      "Gere um rascunho de politica de faltas, atrasos e remarcacoes para comunicar combinados de forma clara e profissional.",
    category: "Gestao de consultorio",
    keyword: "politica de faltas psicologia",
    eyebrow: "Combinados",
    heroTitle: "Modelo de politica de faltas e remarcacoes",
    heroText:
      "Crie uma base de texto para alinhar cancelamentos, atrasos, remarcacoes e cobrancas com linguagem profissional.",
    ctaLabel: "Gerar politica",
    highlights: ["Faltas", "Remarcacoes", "Comunicacao clara"],
    toolType: "absence-policy",
    references: [ETHICS_REFERENCE, HONORARIOS_REFERENCE],
    faq: [
      {
        q: "Posso enviar esse texto diretamente ao paciente?",
        a: "Revise antes para ajustar a sua realidade, abordagem e combinados profissionais.",
      },
      {
        q: "A ferramenta usa dados clinicos?",
        a: "Nao. Ela trata apenas de combinados administrativos.",
      },
    ],
  },
  {
    slug: "checklist-prontuario-psicologico",
    title: "Checklist de prontuario psicologico",
    seoTitle: "Checklist de prontuario psicologico | ETHOS",
    description:
      "Checklist gratuito para revisar organizacao de prontuario psicologico, ficha do paciente, evolucoes, documentos e supervisao.",
    category: "Prontuario e documentos",
    keyword: "checklist prontuario psicologico",
    eyebrow: "Prontuario",
    heroTitle: "Checklist de prontuario psicologico",
    heroText:
      "Veja se sua rotina de registro tem ficha, queixa principal, evolucoes, documentos, supervisao e revisao antes das sessoes.",
    ctaLabel: "Revisar checklist",
    highlights: ["Ficha do paciente", "Evolucoes", "Supervisao"],
    toolType: "record-checklist",
    references: [REGISTRO_REFERENCE, ETHICS_REFERENCE],
    faq: [
      {
        q: "O checklist guarda informacoes do paciente?",
        a: "Nao. Ele nao pede nomes nem dados clinicos. E apenas uma ferramenta de revisao da rotina.",
      },
      {
        q: "O ETHOS organiza prontuarios?",
        a: "Sim. O ETHOS conecta ficha, sessoes, evolucoes, documentos e supervisao no app autenticado.",
      },
    ],
  },
  {
    slug: "planejador-agenda-psicologos",
    title: "Planejador semanal de agenda clinica",
    seoTitle: "Planejador de agenda para psicologos | ETHOS",
    description:
      "Planeje a semana da clinica com sessoes, tarefas administrativas, supervisao, estudos, financeiro e blocos de descanso.",
    category: "Gestao de consultorio",
    keyword: "agenda para psicologos",
    eyebrow: "Agenda clinica",
    heroTitle: "Planejador semanal de agenda para psicologas",
    heroText:
      "Distribua blocos de atendimento, administracao, estudos, supervisao e descanso para enxergar a semana com mais clareza.",
    ctaLabel: "Montar semana",
    highlights: ["Sessoes", "Tarefas", "Supervisao e estudo"],
    toolType: "weekly-planner",
    references: [ETHICS_REFERENCE, REGISTRO_REFERENCE],
    faq: [
      {
        q: "Isso substitui uma agenda completa?",
        a: "Nao. E um planejador rapido. Para rotina diaria, use uma agenda conectada a pacientes e tarefas.",
      },
      {
        q: "A agenda do ETHOS tem cores e tags?",
        a: "Sim. O app autenticado permite organizar compromissos com classificacao visual e contexto clinico.",
      },
    ],
  },
  {
    slug: "gerador-bio-psicologos",
    title: "Gerador de bio profissional para psicologas",
    seoTitle: "Gerador de bio profissional para psicologos | BioHub e ETHOS",
    description:
      "Crie um rascunho de bio profissional para psicologas com foco, abordagem, formato de atendimento e CTA para WhatsApp.",
    category: "Marketing etico",
    keyword: "bio profissional para psicologos",
    eyebrow: "BioHub",
    heroTitle: "Gerador de bio profissional para psicologas",
    heroText:
      "Monte uma bio clara para apresentar sua atuacao, abordagem, formato de atendimento e chamada de contato sem promessas indevidas.",
    ctaLabel: "Gerar bio",
    secondaryCtaLabel: "Criar meu BioHub",
    secondaryCtaHref: "https://biohub.ethos-clinic.com/auth/register",
    highlights: ["Presenca digital", "WhatsApp", "BioHub"],
    toolType: "bio-generator",
    references: [ETHICS_REFERENCE],
    faq: [
      {
        q: "A bio pode prometer resultado clinico?",
        a: "Nao. A comunicacao deve ser clara, etica e sem promessa de cura ou resultado individual.",
      },
      {
        q: "Onde publico essa bio?",
        a: "Voce pode usar em redes sociais ou criar uma pagina profissional no BioHub, produto separado do ecossistema ETHOS.",
      },
    ],
  },
];

export const findFreeTool = (slug = "") => freeTools.find((tool) => tool.slug === slug);
