import { APP_URL, CONTACT_EMAIL, SITE_DESCRIPTION, SITE_NAME, SITE_URL, absoluteUrl } from "@/config/site";
import { BIOHUB_HOME_URL } from "@/config/biohub";
import { articles } from "@/data/articles";
import type { CommercialPage } from "@/data/commercialPages";

export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  email: CONTACT_EMAIL,
  sameAs: [APP_URL, BIOHUB_HOME_URL],
};

export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
};

export const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE_NAME,
  applicationCategory: "HealthApplication",
  operatingSystem: "Web, Desktop, Mobile",
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  offers: {
    "@type": "AggregateOffer",
    priceCurrency: "BRL",
    lowPrice: "79",
    highPrice: "149",
  },
};

export const faqSchema = (items: Array<{ q: string; a: string }>) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: items.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.a,
    },
  })),
});

export const breadcrumbSchema = (items: Array<{ name: string; path: string }>) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: absoluteUrl(item.path),
  })),
});

export const articleSchema = (slug: string) => {
  const article = articles.find((item) => item.slug === slug);
  if (!article) return null;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    author: {
      "@type": "Organization",
      name: SITE_NAME,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
    },
    datePublished: article.publishedAt,
    dateModified: article.updatedAt ?? article.publishedAt,
    mainEntityOfPage: absoluteUrl(`/blog/${article.slug}`),
    articleSection: article.category,
  };
};

export const serviceSchema = (page: CommercialPage) => ({
  "@context": "https://schema.org",
  "@type": "Service",
  name: page.title,
  serviceType: page.title,
  provider: {
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
  },
  areaServed: {
    "@type": "Country",
    name: "Brasil",
  },
  description: page.description,
  url: absoluteUrl(`/${page.slug}`),
});
