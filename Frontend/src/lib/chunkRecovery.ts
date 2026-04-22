export const CHUNK_RECOVERY_KEY = "ethos:chunk-recovery-at";
const CHUNK_RECOVERY_COOLDOWN_MS = 5 * 60_000;

async function clearWebArtifacts() {
  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
    }
  } catch {
    // Best effort cleanup before reloading stale chunks.
  }

  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    // Best effort cleanup before reloading stale chunks.
  }
}

export async function recoverFromChunkLoadFailure(): Promise<void> {
  const lastAttempt = Number(window.sessionStorage.getItem(CHUNK_RECOVERY_KEY) ?? "0");
  const now = Date.now();

  if (now - lastAttempt < CHUNK_RECOVERY_COOLDOWN_MS) {
    console.error("Chunk load failure persisted after cache cleanup; reload loop suppressed.");
    return;
  }

  window.sessionStorage.setItem(CHUNK_RECOVERY_KEY, String(now));
  await clearWebArtifacts();

  const url = new URL(window.location.href);
  url.searchParams.set("fresh", String(now));
  window.location.replace(url.toString());
}
