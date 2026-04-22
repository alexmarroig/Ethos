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
    })(),
  );
});

self.addEventListener("fetch", () => {
  // Let the browser hit the network directly while this cleanup worker unregisters.
});
