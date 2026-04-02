import { generateSW } from 'workbox-build';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const distDir = path.join(appRoot, 'dist');
const publicDir = path.join(appRoot, 'public');

const copyTargets = [
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png',
  'apple-touch-icon.png',
];

const headTags = [
  '<meta name="theme-color" content="#15171a" />',
  '<meta name="apple-mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />',
  '<meta name="apple-mobile-web-app-title" content="ETHOS" />',
  '<link rel="manifest" href="./manifest.webmanifest" />',
  '<link rel="apple-touch-icon" href="./apple-touch-icon.png" />',
];

const serviceWorkerBootstrap = `<script>
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((error) => {
      console.error('Service worker registration failed:', error);
    });
  });
}
</script>`;

async function copyPublicAssets() {
  for (const fileName of copyTargets) {
    const sourcePath = path.join(publicDir, fileName);
    const destinationPath = path.join(distDir, fileName);
    await fs.copyFile(sourcePath, destinationPath);
  }
}

async function patchIndexHtml() {
  const indexPath = path.join(distDir, 'index.html');
  let html = await fs.readFile(indexPath, 'utf8');

  for (const tag of headTags) {
    if (!html.includes(tag)) {
      html = html.replace('</head>', `  ${tag}\n</head>`);
    }
  }

  if (!html.includes("navigator.serviceWorker.register('./sw.js')")) {
    html = html.replace('</head>', `  ${serviceWorkerBootstrap}\n</head>`);
  }

  await fs.writeFile(indexPath, html, 'utf8');
}

async function buildServiceWorker() {
  await generateSW({
    globDirectory: distDir,
    globPatterns: ['**/*.{html,js,css,json,ico,png,svg,ttf,woff,woff2,webmanifest}'],
    globIgnores: ['sw.js'],
    swDest: path.join(distDir, 'sw.js'),
    cleanupOutdatedCaches: true,
    clientsClaim: true,
    skipWaiting: true,
    navigateFallback: '/index.html',
    maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
  });
}

await fs.access(distDir);
await copyPublicAssets();
await patchIndexHtml();
await buildServiceWorker();
