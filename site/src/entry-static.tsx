import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { AppProviders, AppRoutes } from "./App";
import { BIOHUB_HOME_URL } from "./config/biohub";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from "./config/site";
import { articles } from "./data/articles";
import { findCommercialPage } from "./data/commercialPages";
import "./index.css";

export const render = (url: string) =>
  renderToString(
    <AppProviders>
      <StaticRouter location={url}>
        <AppRoutes />
      </StaticRouter>
    </AppProviders>,
  );

const absoluteUrl = (path = "/") => {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalizedPath}`;
};

export const getStaticSeo = (url: string) => {
  const path = url.split("?")[0] || "/";
  const canonical = absoluteUrl(path === "/" ? "/" : path);
  const base = {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    canonical,
    image: absoluteUrl("/og-image.svg"),
    type: "website",
    jsonLd: [] as Array<Record<string, unknown>>,
  };

  if (path === "/blog") {
    return {
      ...base,
      title: "Blog ETHOS - Psicologia, prontuario e gestao clinica",
      description:
        "Artigos sobre prontuario psicologico, software para psicologos, agenda, IA clinica, sigilo e gestao de consultorio.",
    };
  }

  if (path.startsWith("/blog/")) {
    const slug = path.replace("/blog/", "");
    const article = articles.find((item) => item.slug === slug);
    if (!article) return base;

    return {
      ...base,
      title: `${article.title} | ETHOS`,
      description: article.description,
      image: absoluteUrl(article.image ?? "/og-image.svg"),
      type: "article",
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: article.title,
          description: article.description,
          datePublished: article.publishedAt,
          dateModified: article.updatedAt ?? article.publishedAt,
          author: {
            "@type": "Organization",
            name: article.author?.name ?? SITE_NAME,
          },
          publisher: {
            "@type": "Organization",
            name: SITE_NAME,
            url: SITE_URL,
          },
          mainEntityOfPage: canonical,
          image: absoluteUrl(article.image ?? "/og-image.svg"),
        },
      ],
    };
  }

  const commercialSlug = path.replace(/^\/+/, "");
  const commercialPage = findCommercialPage(commercialSlug);
  if (commercialPage) {
    return {
      ...base,
      title: commercialPage.seoTitle,
      description: commercialPage.description,
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: commercialPage.faq.map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.a,
            },
          })),
        },
      ],
    };
  }

  if (path === "/psicologos") {
    return {
      ...base,
      title: "ETHOS para psicologos | Teste gratuito",
      description:
        "Landing para psicologas e psicologos conhecerem o ETHOS: prontuario, agenda, financeiro, documentos e IA em uma rotina clinica organizada.",
    };
  }

  if (path === "/contato") {
    return {
      ...base,
      title: "Contato | ETHOS",
      description: "Fale com o ETHOS para conhecer o software para psicologos, tirar duvidas e organizar a rotina do consultorio.",
    };
  }

  if (path === "/privacidade") {
    return {
      ...base,
      title: "Politica de privacidade | ETHOS",
      description: "Conheca os principios de privacidade, LGPD, cookies e tratamento de dados do site ETHOS.",
    };
  }

  if (path === "/termos") {
    return {
      ...base,
      title: "Termos de uso | ETHOS",
      description: "Termos gerais de uso do site e produtos do ecossistema ETHOS.",
    };
  }

  if (path === "/cookies") {
    return {
      ...base,
      title: "Politica de cookies | ETHOS",
      description: "Entenda como o site ETHOS utiliza cookies essenciais, analytics e tags de marketing conforme consentimento.",
    };
  }

  return {
    ...base,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: SITE_NAME,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        sameAs: [BIOHUB_HOME_URL],
      },
    ],
  };
};
