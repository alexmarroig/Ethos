const clearCaches = async () => {
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
};

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(clearCaches());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await clearCaches();
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clients) {
        client.navigate(client.url);
      }
    })(),
  );
});

self.addEventListener("fetch", () => {
  // Let the browser hit the network directly while this cleanup worker unregisters.
});
