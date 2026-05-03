import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteDir = path.resolve(__dirname, "..");
const distDir = path.join(siteDir, "dist");
const routes = JSON.parse(await readFile(path.join(siteDir, "prerender-routes.json"), "utf8"));

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

const serveFile = (response, filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  response.writeHead(200, { "Content-Type": contentTypes[ext] || "application/octet-stream" });
  createReadStream(filePath).pipe(response);
};

const server = createServer((request, response) => {
  const url = new URL(request.url || "/", "http://127.0.0.1");
  const safePath = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  const filePath = path.join(distDir, safePath);

  if (existsSync(filePath) && statSync(filePath).isFile()) {
    serveFile(response, filePath);
    return;
  }

  const indexPath = path.join(filePath, "index.html");
  if (existsSync(indexPath)) {
    serveFile(response, indexPath);
    return;
  }

  serveFile(response, path.join(distDir, "index.html"));
});

await new Promise((resolve) => server.listen(4179, "127.0.0.1", resolve));

const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

try {
  for (const route of routes) {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      const url = request.url();
      if (/googletagmanager|google-analytics|facebook|doubleclick|connect\.facebook/i.test(url)) {
        request.abort();
        return;
      }
      request.continue();
    });
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem("ethos_site_consent_v1", JSON.stringify({ analytics: false, marketing: false }));
    });
    await page.goto(`http://127.0.0.1:4179${route}`, { waitUntil: "networkidle0", timeout: 45000 });
    await page.waitForSelector("#root", { timeout: 10000 });
    const html = await page.content();
    const outputDir = route === "/" ? distDir : path.join(distDir, route.replace(/^\/+/, ""));
    await mkdir(outputDir, { recursive: true });
    await writeFile(path.join(outputDir, "index.html"), html);
    await page.close();
    console.log(`prerendered ${route}`);
  }
} finally {
  await browser.close();
  server.close();
}
