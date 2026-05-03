export type CommercialPage = {
  slug: string;
  title: string;
  seoTitle: string;
  description: string;
  eyebrow: string;
  heroTitle: string;
  heroText: string;
  primaryCta: string;
  secondaryCta: string;
  intent: string;
  problems: string[];
  features: Array<{ title: string; text: string }>;
  proofPoints: string[];
  faq: Array<{ q: string; a: string }>;
};

export const commercialPages: CommercialPage[] = [
  {
    slug: "software-para-psicologos",
    title: "Software para psicologos",
    seoTitle: "Software para psicologos | ETHOS",
    description:
      "Conheca o ETHOS, software para psicologos com prontuario, agenda, financeiro, documentos e IA clinica com foco em sigilo e rotina profissional.",
    eyebrow: "Software para psicologos",
    heroTitle: "Um sistema para organizar a rotina clinica sem perder o cuidado humano.",
    heroText:
      "O ETHOS conecta prontuario, agenda, financeiro, documentos e apoio com IA em uma experiencia pensada para psicologas e psicologos.",
    primaryCta: "Testar o ETHOS",
    secondaryCta: "Ver recursos",
    intent: "Busca comercial para profissionais que procuram um sistema completo para consultorio psicologico.",
    problems: [
      "Informacoes espalhadas entre agenda, planilhas, documentos e mensagens.",
      "Dificuldade para revisar historico clinico antes da sessao.",
      "Rotina financeira desconectada do atendimento.",
      "Medo de usar ferramentas genericas para dados sensiveis.",
    ],
    features: [
      {
        title: "Prontuario organizado",
        text: "Registre evolucoes, queixas, documentos e observacoes em uma linha clinica facil de revisar.",
      },
      {
        title: "Agenda clinica",
        text: "Visualize sessoes, tarefas, prioridades e lembretes em uma rotina mais parecida com agenda profissional.",
      },
      {
        title: "Financeiro do consultorio",
        text: "Acompanhe pagamentos, pendencias e previsao de receita sem misturar controle financeiro com dados clinicos.",
      },
      {
        title: "IA como apoio",
        text: "Use IA para rascunhos e organizacao, mantendo a revisao e decisao sempre com a profissional.",
      },
    ],
    proofPoints: ["Foco em psicologia", "Fluxo clinico + gestao", "Conteudo revisavel", "Dados sensiveis tratados com cuidado"],
    faq: [
      {
        q: "O ETHOS substitui meu julgamento clinico?",
        a: "Nao. O ETHOS organiza a rotina e pode apoiar rascunhos, mas a psicologa revisa e decide tudo.",
      },
      {
        q: "Serve para consultorio individual?",
        a: "Sim. A proposta atende profissionais solo e tambem rotinas de clinicas pequenas.",
      },
    ],
  },
  {
    slug: "prontuario-psicologico-online",
    title: "Prontuario psicologico online",
    seoTitle: "Prontuario psicologico online | ETHOS",
    description:
      "Organize prontuario psicologico, evolucoes, queixa principal, documentos e historico de atendimentos com mais seguranca e clareza.",
    eyebrow: "Prontuario psicologico online",
    heroTitle: "Prontuario psicologico claro para chegar melhor preparada em cada sessao.",
    heroText:
      "Centralize historico, evolucoes, observacoes, documentos e lembretes clinicos sem depender de arquivos soltos.",
    primaryCta: "Organizar prontuarios",
    secondaryCta: "Ler artigos",
    intent: "Busca para quem precisa organizar registros clinicos com mais seguranca e continuidade.",
    problems: [
      "Evolucoes registradas em locais diferentes.",
      "Dificuldade para recuperar o contexto antes da sessao.",
      "Documentos e observacoes sem padrao.",
      "Risco de misturar informacoes clinicas com canais informais.",
    ],
    features: [
      {
        title: "Ficha do paciente",
        text: "Mantenha dados essenciais, queixa principal, historico e observacoes em um unico lugar.",
      },
      {
        title: "Evolucao clinica",
        text: "Registre sessoes com estrutura, datas e continuidade para revisao futura.",
      },
      {
        title: "Anotacoes de supervisao",
        text: "Associe dicas e comentarios de supervisao ao paciente para revisar antes do atendimento.",
      },
      {
        title: "Briefing pre-sessao",
        text: "Revise queixa principal, evolucao e pontos de supervisao antes de atender.",
      },
    ],
    proofPoints: ["Linha clinica por paciente", "Revisao antes da sessao", "Documentos centralizados", "Sem dados clinicos no site publico"],
    faq: [
      {
        q: "Posso guardar dados sensiveis no formulario do site?",
        a: "Nao. O formulario publico e apenas comercial. Dados clinicos devem ficar dentro do app autenticado.",
      },
      {
        q: "O prontuario tem apoio de IA?",
        a: "O ETHOS pode apoiar organizacao e rascunhos, sempre com revisao profissional.",
      },
    ],
  },
  {
    slug: "agenda-para-psicologos",
    title: "Agenda para psicologos",
    seoTitle: "Agenda para psicologos | ETHOS",
    description:
      "Agenda para psicologos com sessoes, tarefas, cores, tags, prioridades e organizacao alem da rotina clinica.",
    eyebrow: "Agenda para psicologos",
    heroTitle: "Uma agenda clinica para organizar sessoes, tarefas e foco do dia.",
    heroText:
      "Planeje atendimentos, tarefas administrativas, prioridades e lembretes com uma visao mais completa da rotina profissional.",
    primaryCta: "Testar agenda",
    secondaryCta: "Ver como funciona",
    intent: "Busca de agenda online para psicologas que precisam reduzir faltas e organizar rotina.",
    problems: [
      "Agenda separada das informacoes do paciente.",
      "Falta de visao sobre tarefas administrativas.",
      "Remarcacoes e prioridades sem contexto.",
      "Dificuldade para organizar semana, pacientes e financeiro juntos.",
    ],
    features: [
      {
        title: "Cores e categorias",
        text: "Classifique sessoes e tarefas por cor, tipo de compromisso e prioridade.",
      },
      {
        title: "Tags de organizacao",
        text: "Use tags para separar supervisao, financeiro, estudo, retornos e tarefas pessoais.",
      },
      {
        title: "Tarefas alem da clinica",
        text: "Inclua demandas administrativas, conteudo, estudo e follow-ups no mesmo calendario.",
      },
      {
        title: "Contexto antes da sessao",
        text: "Abra o paciente com queixa principal, evolucao e anotacoes relevantes.",
      },
    ],
    proofPoints: ["Cores", "Tags", "Prioridades", "Rotina clinica e pessoal"],
    faq: [
      {
        q: "A agenda serve so para sessoes?",
        a: "Nao. Ela tambem pode organizar tarefas, estudos, administracao e prioridades pessoais.",
      },
      {
        q: "Consigo separar compromissos por cor?",
        a: "Sim. A agenda foi preparada para categorias visuais, tags e prioridade.",
      },
    ],
  },
  {
    slug: "sistema-para-clinica-de-psicologia",
    title: "Sistema para clinica de psicologia",
    seoTitle: "Sistema para clinica de psicologia | ETHOS",
    description:
      "Sistema para clinica de psicologia com pacientes, agenda, financeiro, documentos e visao de gestao para consultorios e clinicas.",
    eyebrow: "Sistema para clinica de psicologia",
    heroTitle: "Gestao clinica e administrativa em uma mesma rotina.",
    heroText:
      "O ETHOS ajuda a organizar atendimento, agenda, documentos, financeiro e indicadores sem transformar a clinica em planilha.",
    primaryCta: "Conhecer sistema",
    secondaryCta: "Falar com ETHOS",
    intent: "Busca de clinicas e consultorios que precisam organizar operacao e atendimento.",
    problems: [
      "Informacoes administrativas desconectadas do atendimento.",
      "Dificuldade para acompanhar pendencias e pagamentos.",
      "Processos diferentes entre profissionais.",
      "Pouca visibilidade sobre rotina, agenda e receita.",
    ],
    features: [
      {
        title: "Pacientes e atendimentos",
        text: "Organize fichas, sessoes, documentos e observacoes por paciente.",
      },
      {
        title: "Financeiro",
        text: "Acompanhe pagamentos, inadimplencia e previsao de receita.",
      },
      {
        title: "Padrao de rotina",
        text: "Ajude a equipe a trabalhar com mais consistencia e menos retrabalho.",
      },
      {
        title: "Indicadores",
        text: "Use dados operacionais para entender agenda, receita e pontos de melhoria.",
      },
    ],
    proofPoints: ["Consultorio", "Clinicas pequenas", "Financeiro", "Organizacao operacional"],
    faq: [
      {
        q: "Serve para clinica com mais de uma profissional?",
        a: "A proposta ja contempla visao de organizacao para consultorios e clinicas pequenas.",
      },
      {
        q: "O sistema mistura dados clinicos e financeiros?",
        a: "A experiencia conecta a rotina, mas trata cada tipo de informacao com finalidade propria.",
      },
    ],
  },
  {
    slug: "ia-para-psicologos",
    title: "IA para psicologos",
    seoTitle: "IA para psicologos | ETHOS",
    description:
      "IA para psicologos com foco em apoio a organizacao clinica, rascunhos, revisao e produtividade, sem substituir responsabilidade profissional.",
    eyebrow: "IA para psicologos",
    heroTitle: "IA clinica como apoio, nao como substituta.",
    heroText:
      "Use tecnologia para organizar informacoes, gerar rascunhos e revisar a rotina, preservando criterio tecnico, sigilo e supervisao profissional.",
    primaryCta: "Conhecer IA do ETHOS",
    secondaryCta: "Ler sobre limites eticos",
    intent: "Busca educativa e comercial sobre uso seguro de IA na rotina psicologica.",
    problems: [
      "Ferramentas genericas sem contexto clinico.",
      "Risco de colar dados sensiveis em lugares inadequados.",
      "Promessas exageradas sobre automacao do cuidado.",
      "Falta de apoio para organizar, nao substituir, o raciocinio clinico.",
    ],
    features: [
      {
        title: "Rascunhos revisaveis",
        text: "Apoio para estruturar textos que sempre precisam de leitura e decisao profissional.",
      },
      {
        title: "Organizacao de contexto",
        text: "Ajuda para revisar historico, pontos importantes e continuidade do caso.",
      },
      {
        title: "Limites claros",
        text: "A IA entra como recurso de produtividade, nao como diagnostico automatico.",
      },
      {
        title: "Foco em sigilo",
        text: "A experiencia do ETHOS prioriza cuidado com dados e informacoes sensiveis.",
      },
    ],
    proofPoints: ["Apoio revisavel", "Criterio profissional", "Sigilo", "Produtividade"],
    faq: [
      {
        q: "A IA faz diagnostico?",
        a: "Nao. O ETHOS nao deve ser usado para diagnostico automatico. Ele apoia organizacao e produtividade.",
      },
      {
        q: "Posso usar IA com dados sensiveis?",
        a: "O uso precisa respeitar sigilo, LGPD e criterio profissional. O ETHOS foi pensado com essa cautela.",
      },
    ],
  },
  {
    slug: "app-para-psicologos",
    title: "App para psicologos",
    seoTitle: "App para psicologos | ETHOS",
    description:
      "App para psicologos organizarem pacientes, agenda, prontuarios, tarefas e financeiro em uma rotina profissional integrada.",
    eyebrow: "App para psicologos",
    heroTitle: "Um app para levar mais ordem ao consultorio.",
    heroText:
      "Organize sua pratica profissional com uma plataforma pensada para psicologia, atendimento, tarefas e gestao.",
    primaryCta: "Testar app",
    secondaryCta: "Ver funcionalidades",
    intent: "Busca por aplicativo para psicologas organizarem consultorio e rotina.",
    problems: [
      "Uso de muitos aplicativos sem conexao entre si.",
      "Agenda sem contexto clinico.",
      "Tarefas soltas em cadernos ou mensagens.",
      "Falta de visao da rotina completa do consultorio.",
    ],
    features: [
      {
        title: "Tudo em um fluxo",
        text: "Pacientes, agenda, prontuarios, financeiro e tarefas trabalhando juntos.",
      },
      {
        title: "Rotina mais leve",
        text: "Menos alternancia entre ferramentas e mais clareza sobre o proximo passo.",
      },
      {
        title: "Organizacao visual",
        text: "Cores, prioridades e tags ajudam a entender o dia com rapidez.",
      },
      {
        title: "Acesso ao ecossistema",
        text: "O ETHOS tambem se conecta ao BioHub como produto separado para presenca profissional.",
      },
    ],
    proofPoints: ["Agenda", "Prontuario", "Tarefas", "Financeiro"],
    faq: [
      {
        q: "O app e so agenda?",
        a: "Nao. A proposta e reunir agenda, pacientes, prontuario, financeiro e tarefas.",
      },
      {
        q: "BioHub fica dentro do app?",
        a: "Nao. BioHub e produto separado do ecossistema ETHOS e abre em outro app.",
      },
    ],
  },
];

export const findCommercialPage = (slug = "") => commercialPages.find((page) => page.slug === slug);
