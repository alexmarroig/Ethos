export type Article = {
  slug: string;
  title: string;
  description: string;
  category: string;
  publishedAt: string;
  updatedAt?: string;
  readingTime: string;
  keywords: string[];
  sections: Array<{
    heading: string;
    body: string[];
  }>;
};

export const articles: Article[] = [
  {
    slug: "prontuario-psicologico-como-organizar-com-seguranca",
    title: "Prontuario psicologico: como organizar com seguranca",
    description:
      "Veja como estruturar prontuarios psicologicos com clareza, rastreabilidade e cuidado com o sigilo profissional.",
    category: "Prontuario",
    publishedAt: "2026-05-02",
    readingTime: "6 min",
    keywords: ["prontuario psicologico", "sigilo clinico", "CRP", "registro de sessao"],
    sections: [
      {
        heading: "Por que o prontuario precisa de metodo",
        body: [
          "O prontuario psicologico nao e apenas um arquivo administrativo. Ele organiza a historia clinica, sustenta a continuidade do cuidado e ajuda a profissional a tomar decisoes com mais contexto.",
          "Um bom fluxo separa dados cadastrais, registros de sessao, documentos, escalas, contratos e observacoes administrativas. Essa separacao evita mistura de informacoes sensiveis e facilita revisao futura.",
        ],
      },
      {
        heading: "Elementos minimos de organizacao",
        body: [
          "Use datas, contexto objetivo da sessao, plano de cuidado, evolucao percebida e pendencias clinicas. Evite excesso narrativo quando ele nao acrescenta ao cuidado.",
          "Modelos como SOAP, evolucao narrativa e notas livres podem conviver, desde que a profissional mantenha consistencia e revise tudo antes de assinar.",
        ],
      },
      {
        heading: "Seguranca e acesso",
        body: [
          "O acesso ao prontuario deve ser restrito, protegido e auditavel. Em ferramentas digitais, prefira armazenamento criptografado, controle local e exportacao em formatos abertos.",
          "O ETHOS foi desenhado para reduzir burocracia sem tirar da psicologa a responsabilidade final sobre o registro clinico.",
        ],
      },
    ],
  },
  {
    slug: "software-para-psicologos-o-que-avaliar",
    title: "Software para psicologos: o que avaliar antes de escolher",
    description:
      "Criterios praticos para escolher um software de psicologia: prontuario, agenda, financeiro, seguranca e rotina real de consultorio.",
    category: "Gestao clinica",
    publishedAt: "2026-05-02",
    readingTime: "7 min",
    keywords: ["software para psicologos", "gestao clinica psicologia", "sistema para psicologos"],
    sections: [
      {
        heading: "A ferramenta precisa caber na rotina",
        body: [
          "Um sistema para psicologos nao deve ser apenas bonito. Ele precisa reduzir tarefas repetitivas, organizar informacoes e continuar simples depois de meses de uso.",
          "Avalie se a ferramenta resolve os pontos centrais: agenda, pacientes, prontuario, documentos, financeiro, lembretes e exportacao de dados.",
        ],
      },
      {
        heading: "Privacidade vem antes de conveniencia",
        body: [
          "Dados clinicos exigem cuidado superior ao de um CRM comum. Antes de escolher, entenda onde os dados ficam, como sao protegidos e como voce pode exporta-los.",
          "O ideal e que o sistema deixe claro o que e local, o que e nuvem e quais integracoes sao opcionais.",
        ],
      },
      {
        heading: "IA deve ajudar, nao decidir",
        body: [
          "Recursos de IA podem acelerar transcricao, organizacao e rascunho de evolucoes, mas a revisao clinica segue sendo humana.",
          "Prefira ferramentas que tratam a IA como assistente de escrita e organizacao, nao como substituta da responsabilidade profissional.",
        ],
      },
    ],
  },
  {
    slug: "agenda-para-psicologos-reduzir-faltas",
    title: "Agenda para psicologos: como reduzir faltas e remarcacoes",
    description:
      "Boas praticas para organizar agenda de psicologia, reduzir faltas e automatizar lembretes sem perder o cuidado humano.",
    category: "Agenda",
    publishedAt: "2026-05-02",
    readingTime: "5 min",
    keywords: ["agenda psicologo", "lembrete de sessao", "faltas em psicoterapia"],
    sections: [
      {
        heading: "Agenda clinica nao e apenas calendario",
        body: [
          "Para psicologas, a agenda precisa lidar com recorrencia, remarcacao, faltas, bloqueios, confirmacoes e historico de atendimento.",
          "Quando tudo fica espalhado entre mensagens e planilhas, a chance de atraso administrativo cresce rapidamente.",
        ],
      },
      {
        heading: "Lembretes reduzem atrito",
        body: [
          "Lembretes por WhatsApp ou canais combinados ajudam o paciente a se organizar, principalmente quando a mensagem e clara, respeitosa e enviada no tempo certo.",
          "A automacao deve preservar o tom profissional e permitir ajustes por paciente, porque nem todo caso pede a mesma comunicacao.",
        ],
      },
      {
        heading: "Use dados para melhorar a rotina",
        body: [
          "Acompanhar faltas, remarcacoes e horarios mais instaveis ajuda a psicologa a ajustar politicas de cancelamento e disponibilidade.",
          "O ETHOS conecta agenda, pacientes e financeiro para transformar esses dados em rotina mais previsivel.",
        ],
      },
    ],
  },
  {
    slug: "ia-para-psicologos-limites-eticos-usos-seguros",
    title: "IA para psicologos: limites eticos e usos seguros",
    description:
      "Como pensar o uso de IA na psicologia sem abrir mao de sigilo, revisao humana, criterio clinico e responsabilidade profissional.",
    category: "IA clinica",
    publishedAt: "2026-05-02",
    readingTime: "8 min",
    keywords: ["IA para psicologos", "etica em psicologia", "prontuario com IA"],
    sections: [
      {
        heading: "IA precisa ter papel delimitado",
        body: [
          "A IA pode organizar transcricoes, sugerir rascunhos e acelerar documentos, mas nao deve tomar decisoes clinicas pela profissional.",
          "O uso seguro comeca por definir limites: o que a IA pode resumir, o que precisa de revisao e o que nunca deve ser enviado sem avaliacao humana.",
        ],
      },
      {
        heading: "Sigilo e minimizacao de dados",
        body: [
          "Quanto menos dados sensiveis forem enviados para servicos externos, menor o risco. Sempre que possivel, prefira processamento local ou fluxos que deixem claro onde a informacao trafega.",
          "Tambem e importante evitar inserir dados identificaveis quando eles nao sao necessarios para a tarefa.",
        ],
      },
      {
        heading: "A revisao e parte do cuidado",
        body: [
          "Rascunhos gerados por IA podem conter lacunas, inferencias indevidas ou linguagem inadequada. A assinatura do prontuario continua sendo da psicologa.",
          "Ferramentas bem desenhadas tornam a revisao facil, visivel e obrigatoria antes de qualquer registro final.",
        ],
      },
    ],
  },
  {
    slug: "organizar-financeiro-consultorio-psicologico",
    title: "Como organizar financeiro de consultorio psicologico",
    description:
      "Um guia pratico para acompanhar pagamentos, pacotes, recibos e inadimplencia em consultorios de psicologia.",
    category: "Financeiro",
    publishedAt: "2026-05-02",
    readingTime: "6 min",
    keywords: ["financeiro psicologo", "consultorio psicologico", "cobranca psicologia"],
    sections: [
      {
        heading: "Financeiro tambem e cuidado com a pratica",
        body: [
          "Organizar pagamentos, pacotes e recibos reduz ansiedade administrativa e evita conversas desconfortaveis em momentos errados.",
          "A clareza financeira protege a continuidade do atendimento e ajuda a psicologa a sustentar uma pratica profissional saudavel.",
        ],
      },
      {
        heading: "Separe combinados, vencimentos e historico",
        body: [
          "Registre valor combinado, forma de pagamento, dia de vencimento, politica de falta e recorrencia. Esses dados devem estar conectados ao paciente sem expor informacao clinica desnecessaria.",
          "Acompanhar o historico evita cobrancas duplicadas e facilita a emissao de recibos e declaracoes.",
        ],
      },
      {
        heading: "Automatize sem perder delicadeza",
        body: [
          "Lembretes de cobranca podem ser objetivos e respeitosos, com linguagem previamente revisada pela profissional.",
          "No ETHOS, financeiro e agenda conversam para que pendencias aparecam no momento certo, sem virar uma planilha paralela.",
        ],
      },
    ],
  },
];

export const featuredArticles = articles.slice(0, 3);
