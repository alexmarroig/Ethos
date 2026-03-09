/* service-worker.js */

// Troque a versão a cada release (ou automatize no build)
const VERSION = "v2";
const CACHE_NAME = `ethos-pwa-${VERSION}`;

// App Shell (mínimo para subir offline)
const CORE_ASSETS = [
  "/",             // root
  "/index.html",
  "/manifest.json",
  "/assets/icon-192.svg",
  "/assets/icon-512.svg",
];

// Heurísticas simples
const isNavigationRequest = (request) => request.mode === "navigate";
const isSameOrigin = (url) => url.origin === self.location.origin;

const isStaticAsset = (url) => {
  // ajuste conforme seu build (Vite costuma gerar /assets/*.js, *.css etc.)
  return url.pathname.startsWith("/assets/") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".jpeg") ||
    url.pathname.endsWith(".webp") ||
    url.pathname.endsWith(".woff2");
};

// Evite cachear API por acidente
const isApiRequest = (url) => url.pathname.startsWith("/api/") || url.pathname.startsWith("/v1/");

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE_ASSETS);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Só GET
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Só same-origin (evita cachear CDNs/APIs externas sem querer)
  if (!isSameOrigin(url)) return;

  // Não cachear API por padrão (privacidade + consistência)
  if (isApiRequest(url)) {
    // network-only (ou network-first com timeout se você quiser)
    return;
  }

  // Navegação SPA: network-first (pega versão nova quando online), fallback p/ cache
  if (isNavigationRequest(request)) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request);
        // Atualiza o cache do shell
        const cache = await caches.open(CACHE_NAME);
        cache.put("/index.html", fresh.clone());
        return fresh;
      } catch {
        const cached = await caches.match("/index.html");
        return cached || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
      }
    })());
    return;
  }

  // Assets estáticos: cache-first + atualização em background
  if (isStaticAsset(url)) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      if (cached) return cached;

      try {
        const response = await fetch(request);

        // Só cacheia respostas OK (evita guardar 404, etc.)
        if (response && response.status === 200) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, response.clone());
        }

        return response;
      } catch {
        // Se não tem no cache e falhou a rede, responde algo coerente
        return cached || new Response("Offline", { status: 503 });
      }
    })());
    return;
  }

  // Default: network-first com fallback ao cache (conservador)
  event.respondWith((async () => {
    try {
      const response = await fetch(request);

      if (response && response.status === 200) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
      }

      return response;
    } catch {
      const cached = await caches.match(request);
      return cached || new Response("Offline", { status: 503 });
    }
  })());
});
