import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import autoprefixer from "autoprefixer";
import tailwindcss from "tailwindcss";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

const defaultClinicalProxyTarget =
  process.env.VITE_PROXY_CLINICAL_TARGET || "http://127.0.0.1:8787";
const defaultControlProxyTarget =
  process.env.VITE_PROXY_CONTROL_TARGET || "http://127.0.0.1:8788";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    __CLINICAL_PROXY_TARGET__: JSON.stringify(defaultClinicalProxyTarget),
    __CONTROL_PROXY_TARGET__: JSON.stringify(defaultControlProxyTarget),
  },
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
  },
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api/clinical": {
        target: defaultClinicalProxyTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/clinical/, ""),
      },
      "/api/control": {
        target: defaultControlProxyTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/control/, ""),
      },
    },
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    mode !== "development" &&
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.ico", "icon-192.png", "icon-512.png"],
        manifest: false,
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-cache",
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
      }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
