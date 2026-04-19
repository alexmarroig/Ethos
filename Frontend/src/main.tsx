import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1"]);

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

// Global handler for Chunk Load Errors (dynamic import failures)
// This is critical for resolving issues after new deployments where old hashes no longer exist.
if (typeof window !== "undefined") {
  window.addEventListener("error", (event) => {
    const isChunkLoadFailed = /Loading chunk .* failed|Failed to fetch dynamically imported module/.test(
      event.message || ""
    );
    if (isChunkLoadFailed) {
      console.warn("Chunk load failure detected. Reloading page to fetch latest version...");
      window.location.reload();
    }
  }, true);

  window.addEventListener("unhandledrejection", (event) => {
    const isChunkLoadFailed = /Loading chunk .* failed|Failed to fetch dynamically imported module/.test(
      event.reason?.message || ""
    );
    if (isChunkLoadFailed) {
      console.warn("Chunk load failure detected in promise. Reloading page...");
      window.location.reload();
    }
  });
}

void clearLocalWebArtifacts();

createRoot(document.getElementById("root")!).render(<App />);
