import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteDir = path.resolve(__dirname, "..");
const distDir = path.join(siteDir, "dist");
const ssrEntry = path.join(siteDir, "dist-ssr", "entry-static.js");
const template = await readFile(path.join(distDir, "index.html"), "utf8");
const routes = JSON.parse(await readFile(path.join(siteDir, "prerender-routes.json"), "utf8"));
const { getStaticSeo, render } = await import(pathToFileURL(ssrEntry).href);

const injectMarkup = (html, markup) => html.replace('<div id="root"></div>', `<div id="root">${markup}</div>`);
const escapeAttr = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
const escapeJson = (value) => JSON.stringify(value).replaceAll("</script", "<\\/script");

const upsertHead = (html, seo) => {
  let output = html
    .replace(/<title>.*?<\/title>/s, `<title>${escapeAttr(seo.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/s, `<meta name="description" content="${escapeAttr(seo.description)}" />`)
    .replace(/<link rel="canonical" href="[^"]*" \/>/s, `<link rel="canonical" href="${escapeAttr(seo.canonical)}" />`)
    .replace(/<meta property="og:title" content="[^"]*" \/>/s, `<meta property="og:title" content="${escapeAttr(seo.title)}" />`)
    .replace(/<meta property="og:description" content="[^"]*" \/>/s, `<meta property="og:description" content="${escapeAttr(seo.description)}" />`)
    .replace(/<meta property="og:type" content="[^"]*" \/>/s, `<meta property="og:type" content="${escapeAttr(seo.type)}" />`)
    .replace(/<meta property="og:url" content="[^"]*" \/>/s, `<meta property="og:url" content="${escapeAttr(seo.canonical)}" />`)
    .replace(/<meta property="og:image" content="[^"]*" \/>/s, `<meta property="og:image" content="${escapeAttr(seo.image)}" />`)
    .replace(/<meta name="twitter:title" content="[^"]*" \/>/s, `<meta name="twitter:title" content="${escapeAttr(seo.title)}" />`)
    .replace(/<meta name="twitter:description" content="[^"]*" \/>/s, `<meta name="twitter:description" content="${escapeAttr(seo.description)}" />`)
    .replace(/<meta name="twitter:image" content="[^"]*" \/>/s, `<meta name="twitter:image" content="${escapeAttr(seo.image)}" />`);

  if (seo.jsonLd?.length) {
    const jsonLd = seo.jsonLd
      .map((schema) => `<script type="application/ld+json" data-ethos-static-json-ld="true">${escapeJson(schema)}</script>`)
      .join("\n    ");
    output = output.replace("</head>", `    ${jsonLd}\n  </head>`);
  }

  return output;
};

for (const route of routes) {
  const markup = render(route);
  const html = upsertHead(injectMarkup(template, markup), getStaticSeo(route));
  const outputDir = route === "/" ? distDir : path.join(distDir, route.replace(/^\/+/, ""));

  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, "index.html"), html);
  console.log(`prerendered ${route}`);
}

await rm(path.join(siteDir, "dist-ssr"), { recursive: true, force: true });
