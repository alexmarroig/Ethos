import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const appRoot = path.resolve(__dirname, "..");
const openapiPath = path.join(appRoot, "openapi.yaml");
const serverPath = path.join(appRoot, "src", "server.ts");

type Route = { method: string; path: string };

const routeKey = ({ method, path }: Route) => `${method} ${path}`;

const extractOpenApiRoutes = (yaml: string): Route[] => {
  const routes: Route[] = [];
  let currentPath: string | null = null;

  for (const rawLine of yaml.split(/\r?\n/)) {
    const line = rawLine.replace(/\t/g, "    ");
    const pathMatch = line.match(/^  (\/[^:\s]+):\s*$/);
    if (pathMatch) {
      currentPath = pathMatch[1];
      continue;
    }

    const methodMatch = line.match(/^    (get|post|patch|put|delete):\s*$/i);
    if (methodMatch && currentPath) {
      routes.push({ method: methodMatch[1].toUpperCase(), path: currentPath });
    }
  }

  return routes;
};

const extractServerRoutes = (source: string): Route[] => {
  const routes: Route[] = [];
  const directRouteRegex = /method === "(GET|POST|PATCH|PUT|DELETE)" && url\.pathname === "([^"]+)"/g;

  for (const match of source.matchAll(directRouteRegex)) {
    routes.push({ method: match[1], path: match[2] });
  }

  if (source.includes("if (method === \"PATCH\" && adminUserPatch)")) {
    routes.push({ method: "PATCH", path: "/v1/admin/users/{id}" });
  }

  return routes;
};

test("OpenAPI document descreve exatamente as rotas públicas do Control Plane", () => {
  const yaml = fs.readFileSync(openapiPath, "utf8");
  const serverSource = fs.readFileSync(serverPath, "utf8");

  const openapiRoutes = extractOpenApiRoutes(yaml).map(routeKey).sort();
  const serverRoutes = extractServerRoutes(serverSource).map(routeKey).sort();

  assert.deepEqual(openapiRoutes, serverRoutes);
});
