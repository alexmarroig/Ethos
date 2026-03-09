import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./components/App";
import "./index.css";

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(<App />);
}

// Service Worker: só faz sentido no build WEB/PWA.
// Em Electron, isso tende a causar cache fantasma e bugs de atualização.
const isElectronRenderer =
  typeof window !== "undefined" &&
  typeof (window as any).process === "object" &&
  (window as any).process?.type === "renderer";

if (!isElectronRenderer && import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch(() => {
      // opcional: console.warn("SW registration failed", err);
    });
  });
}
