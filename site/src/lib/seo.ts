import { useEffect } from "react";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, absoluteUrl } from "@/config/site";

export type SeoConfig = {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  type?: "website" | "article";
  noindex?: boolean;
  jsonLd?: Array<Record<string, unknown>>;
};

const setMeta = (selector: string, attribute: "content" | "href", value: string) => {
  const element = document.head.querySelector(selector);
  if (element) {
    element.setAttribute(attribute, value);
  }
};

const upsertMeta = (key: "name" | "property", name: string, content: string) => {
  let element = document.head.querySelector(`meta[${key}="${name}"]`) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(key, name);
    document.head.appendChild(element);
  }
  element.content = content;
};

const collectSchemaTypes = (schema: unknown): string[] => {
  if (!schema || typeof schema !== "object") return [];
  const value = schema as Record<string, unknown>;
  const type = value["@type"];
  const graph = value["@graph"];

  return [
    ...(typeof type === "string" ? [type] : []),
    ...(Array.isArray(graph) ? graph.flatMap(collectSchemaTypes) : []),
  ];
};

const getExistingStaticSchemaTypes = () => {
  const types = new Set<string>();
  document.querySelectorAll('script[type="application/ld+json"]:not([data-ethos-json-ld="true"])').forEach((node) => {
    try {
      collectSchemaTypes(JSON.parse(node.textContent ?? "")).forEach((type) => types.add(type));
    } catch {
      // Ignore invalid third-party JSON-LD; ETHOS only de-dupes valid schema blocks.
    }
  });
  return types;
};

export const useSeo = ({
  title = SITE_TITLE,
  description = SITE_DESCRIPTION,
  path = "/",
  image = "/og-image.svg",
  type = "website",
  noindex = false,
  jsonLd = [],
}: SeoConfig) => {
  useEffect(() => {
    const canonical = absoluteUrl(path);
    const imageUrl = absoluteUrl(image);
    document.title = title;

    upsertMeta("name", "description", description);
    upsertMeta("name", "robots", noindex ? "noindex,nofollow" : "index,follow");
    setMeta('link[rel="canonical"]', "href", canonical);

    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:type", type);
    upsertMeta("property", "og:url", canonical);
    upsertMeta("property", "og:image", imageUrl);
    upsertMeta("property", "og:site_name", SITE_NAME);
    upsertMeta("property", "og:locale", "pt_BR");

    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", imageUrl);

    document
      .querySelectorAll('script[data-ethos-json-ld="true"], script[data-ethos-static-json-ld="true"]')
      .forEach((node) => node.remove());
    const existingStaticTypes = getExistingStaticSchemaTypes();
    jsonLd.forEach((schema) => {
      const schemaTypes = collectSchemaTypes(schema);
      if (schemaTypes.some((schemaType) => existingStaticTypes.has(schemaType))) return;

      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.dataset.ethosJsonLd = "true";
      script.textContent = JSON.stringify(schema);
      document.head.appendChild(script);
    });
  }, [description, image, jsonLd, noindex, path, title, type]);
};
