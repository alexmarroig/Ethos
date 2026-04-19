"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const client_1 = require("react-dom/client");
const App_1 = require("./components/App");
require("./index.css");
const container = document.getElementById("root");
if (container) {
    (0, client_1.createRoot)(container).render((0, jsx_runtime_1.jsx)(App_1.App, {}));
}
// Service Worker: só faz sentido no build WEB/PWA.
// Em Electron, isso tende a causar cache fantasma e bugs de atualização.
const isElectronRenderer = typeof window !== "undefined" &&
    typeof window.process === "object" &&
    window.process?.type === "renderer";
if (!isElectronRenderer && import.meta.env.PROD && "serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("/service-worker.js").catch(() => {
            // opcional: console.warn("SW registration failed", err);
        });
    });
}
