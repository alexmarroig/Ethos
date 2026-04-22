import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1"]);
const CHUNK_RECOVERY_KEY = "ethos:chunk-recovery-at";
const CHUNK_RECOVERY_COOLDOWN_MS = 5 * 60_000;

async function clearLocalWebArtifacts() {
  if (typeof window === "undefined") return;
  if (!LOCAL_HOSTNAMES.has(window.location.hostname)) return;

  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
  } catch {
    // Best effort cleanup for local development only.
  }

  try {
    if ("caches" in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((key) => caches.delete(key)));
    }
  } catch {
    // Best effort cleanup for local development only.
  }
}

async function clearWebArtifacts() {
  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
  } catch {
    // Best effort cleanup before reloading stale chunks.
  }

  try {
    if ("caches" in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((key) => caches.delete(key)));
    }
  } catch {
    // Best effort cleanup before reloading stale chunks.
  }
}

async function recoverFromChunkLoadFailure() {
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

// Global handler for Chunk Load Errors (dynamic import failures)
// This is critical for resolving issues after new deployments where old hashes no longer exist.
if (typeof window !== "undefined") {
  window.setTimeout(() => {
    window.sessionStorage.removeItem(CHUNK_RECOVERY_KEY);
  }, 30_000);

  window.addEventListener("error", (event) => {
    const isChunkLoadFailed = /Loading chunk .* failed|Failed to fetch dynamically imported module/.test(
      event.message || ""
    );
    if (isChunkLoadFailed) {
      event.preventDefault();
      console.warn("Chunk load failure detected. Clearing web cache and loading the latest version...");
      void recoverFromChunkLoadFailure();
    }
  }, true);

  window.addEventListener("unhandledrejection", (event) => {
    const isChunkLoadFailed = /Loading chunk .* failed|Failed to fetch dynamically imported module/.test(
      event.reason?.message || ""
    );
    if (isChunkLoadFailed) {
      event.preventDefault();
      console.warn("Chunk load failure detected in promise. Clearing web cache and loading the latest version...");
      void recoverFromChunkLoadFailure();
    }
  });
}

void clearLocalWebArtifacts();

createRoot(document.getElementById("root")!).render(<App />);
