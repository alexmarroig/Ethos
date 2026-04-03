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

void clearLocalWebArtifacts();

createRoot(document.getElementById("root")!).render(<App />);
