import http from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const distDir = path.join(appRoot, process.env.PWA_DIST_DIR ?? 'dist-pwa-test');
const port = Number(process.env.PWA_PORT ?? 4176);
const apiOrigin = process.env.LOCAL_API_ORIGIN ?? 'http://127.0.0.1:8787';
const controlOrigin = process.env.LOCAL_CONTROL_ORIGIN ?? 'http://127.0.0.1:8788';

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'application/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.ttf', 'font/ttf'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
  ['.webmanifest', 'application/manifest+json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
]);

const hopByHopHeaders = new Set([
  'host',
  'connection',
  'content-length',
  'expect',
  'keep-alive',
  'proxy-connection',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

const getContentType = (filePath) => mimeTypes.get(path.extname(filePath).toLowerCase()) ?? 'application/octet-stream';

const sendJsonError = (res, statusCode, message) => {
  res.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: message }));
};

const proxyRequest = async (req, res, targetOrigin, prefix) => {
  const targetUrl = new URL(req.url.slice(prefix.length) || '/', targetOrigin);
  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers)) {
    if (!value) continue;
    if (hopByHopHeaders.has(key.toLowerCase())) continue;
    headers.set(key, Array.isArray(value) ? value.join(', ') : value);
  }

  const requestInit = {
    method: req.method,
    headers,
    body: ['GET', 'HEAD'].includes(req.method ?? 'GET') ? undefined : req,
    duplex: 'half',
  };

  try {
    const upstream = await fetch(targetUrl, requestInit);
    const responseHeaders = {};
    upstream.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    res.writeHead(upstream.status, responseHeaders);
    if (upstream.body) {
      for await (const chunk of upstream.body) {
        res.write(chunk);
      }
    }
    res.end();
  } catch (error) {
    const message = error instanceof Error
      ? [error.message, error.cause instanceof Error ? error.cause.message : null].filter(Boolean).join(' :: ')
      : String(error);
    sendJsonError(res, 502, message);
  }
};

const serveStatic = async (req, res) => {
  const requestPath = new URL(req.url, `http://127.0.0.1:${port}`).pathname;
  const normalizedPath = decodeURIComponent(requestPath);
  const relativePath = normalizedPath === '/' ? 'index.html' : normalizedPath.replace(/^\/+/, '');
  const candidate = path.resolve(distDir, relativePath);

  if (!candidate.startsWith(distDir)) {
    sendJsonError(res, 403, 'Forbidden');
    return;
  }

  let finalPath = candidate;
  if (!existsSync(finalPath)) {
    finalPath = path.join(distDir, 'index.html');
  }

  try {
    const stat = await fs.stat(finalPath);
    if (!stat.isFile()) {
      sendJsonError(res, 404, 'Not found');
      return;
    }

    res.writeHead(200, {
      'content-type': getContentType(finalPath),
      'cache-control': finalPath.endsWith('index.html') ? 'no-store' : 'public, max-age=31536000, immutable',
    });
    createReadStream(finalPath).pipe(res);
  } catch (error) {
    sendJsonError(res, 500, error instanceof Error ? error.message : String(error));
  }
};

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    sendJsonError(res, 400, 'Missing URL');
    return;
  }

  if (req.url.startsWith('/api')) {
    await proxyRequest(req, res, apiOrigin, '/api');
    return;
  }

  if (req.url.startsWith('/control-api')) {
    await proxyRequest(req, res, controlOrigin, '/control-api');
    return;
  }

  await serveStatic(req, res);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`ETHOS local PWA available at http://127.0.0.1:${port}`);
});
