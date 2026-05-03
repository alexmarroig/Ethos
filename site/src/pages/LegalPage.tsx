import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import { SUPPORT_EMAIL } from "@/config/site";
import { useSeo } from "@/lib/seo";
import { breadcrumbSchema, organizationSchema } from "@/lib/schemas";

type LegalContent = {
  title: string;
  description: string;
  path: string;
  sections: Array<{ heading: string; body: string[] }>;
};

const content: Record<"privacy" | "terms" | "cookies", LegalContent> = {
  privacy: {
    title: "Politica de privacidade",
    description: "Como o ETHOS trata dados no site publico, em formularios de contato, analytics e campanhas.",
    path: "/privacidade",
    sections: [
      {
        heading: "Dados coletados no site",
        body: [
          "O site publico do ETHOS pode coletar dados de contato fornecidos voluntariamente, como nome, email, WhatsApp, perfil profissional e interesse comercial.",
          "Nao solicitamos nem devemos receber dados clinicos, prontuarios, informacoes de pacientes ou dados sensiveis no formulario publico.",
        ],
      },
      {
        heading: "Uso de analytics e publicidade",
        body: [
          "Com seu consentimento, podemos usar Google Analytics, Google Ads, Meta Pixel e ferramentas similares para medir visitas, entender campanhas e melhorar a comunicacao do site.",
          "Essas ferramentas podem utilizar cookies, identificadores, enderecos IP e sinais de navegador conforme suas proprias politicas.",
        ],
      },
      {
        heading: "Contato e direitos",
        body: [
          `Para solicitar acesso, correcao ou exclusao de dados de contato enviados pelo site, escreva para ${SUPPORT_EMAIL}.`,
          "Esta politica deve ser revisada por assessoria juridica antes de uso amplo em campanhas pagas e AdSense.",
        ],
      },
    ],
  },
  terms: {
    title: "Termos de uso",
    description: "Condicoes gerais para uso do site publico ETHOS e acesso aos produtos do ecossistema.",
    path: "/termos",
    sections: [
      {
        heading: "Uso informativo do site",
        body: [
          "O site publico apresenta produtos, conteudos e canais de contato do ecossistema ETHOS. Ele nao substitui contrato comercial, proposta formal ou documentacao tecnica.",
          "As funcionalidades descritas podem evoluir conforme desenvolvimento, planos, disponibilidade e ambiente de uso.",
        ],
      },
      {
        heading: "Produtos separados",
        body: [
          "ETHOS Web, app ETHOS e BioHub podem operar em dominios ou aplicacoes separadas, com fluxos proprios de conta, login e assinatura.",
          "BioHub e responsavel por seu proprio cadastro, login, painel, pagina publica e billing.",
        ],
      },
      {
        heading: "Responsabilidade profissional",
        body: [
          "Recursos de IA, automacao ou organizacao auxiliam a rotina, mas nao substituem criterio tecnico, etico e revisao profissional.",
          "A psicologa ou o psicologo permanece responsavel por seus registros, documentos e conduta profissional.",
        ],
      },
    ],
  },
  cookies: {
    title: "Politica de cookies",
    description: "Como o site ETHOS usa cookies essenciais, metricas e ferramentas de marketing.",
    path: "/cookies",
    sections: [
      {
        heading: "Tipos de cookies",
        body: [
          "Cookies essenciais ajudam o site a funcionar e lembrar escolhas basicas, como consentimento.",
          "Cookies de analytics e marketing so devem ser ativados apos consentimento, quando configurados no ambiente de producao.",
        ],
      },
      {
        heading: "Ferramentas possiveis",
        body: [
          "O site foi preparado para Google Tag Manager, Google Analytics 4, Google Ads e Meta Pixel, respeitando a escolha feita no banner de consentimento.",
          "Tambem pode usar tags de conversao para medir envio de leads e cliques em CTAs.",
        ],
      },
      {
        heading: "Como mudar sua escolha",
        body: [
          "Voce pode limpar os dados do site no navegador para redefinir sua escolha de consentimento.",
          `Duvidas sobre privacidade podem ser enviadas para ${SUPPORT_EMAIL}.`,
        ],
      },
    ],
  },
};

const LegalPage = ({ type }: { type: keyof typeof content }) => {
  const page = content[type];
  useSeo({
    title: `${page.title} | ETHOS`,
    description: page.description,
    path: page.path,
    jsonLd: [
      organizationSchema,
      breadcrumbSchema([
        { name: "Inicio", path: "/" },
        { name: page.title, path: page.path },
      ]),
    ],
  });

  return (
    <div className="min-h-screen" style={{ background: "#060F1E" }}>
      <Header />
      <main className="mx-auto max-w-4xl px-6 pb-24 pt-28">
        <h1 className="text-4xl font-bold text-[#EDF2F7] md:text-6xl">{page.title}</h1>
        <p className="mt-5 text-lg leading-8 text-[#6B8FA8]">{page.description}</p>
        <div className="mt-10 space-y-8">
          {page.sections.map((section) => (
            <section key={section.heading} className="rounded-2xl border border-[#1A2D42] bg-[#0D1B2E]/55 p-6">
              <h2 className="text-2xl font-bold text-[#EDF2F7]">{section.heading}</h2>
              <div className="mt-4 space-y-3">
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-7 text-[#B8C7D9]">{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default LegalPage;
