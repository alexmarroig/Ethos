import fs from "node:fs";
import path from "node:path";

const openapiPath = path.resolve(process.cwd(), "openapi.yaml");
const content = fs.readFileSync(openapiPath, "utf8");
const lines = content.split(/\r?\n/);

const fail = (message) => {
  console.error(`OpenAPI lint failed: ${message}`);
  process.exit(1);
};

const openapiLines = lines
  .map((line) => line)
  .filter((line) => /^openapi:\s*/.test(line));

if (openapiLines.length !== 1) fail(`expected exactly 1 'openapi' declaration, found ${openapiLines.length}`);
if (openapiLines[0].trim() !== "openapi: 3.0.3") fail("expected 'openapi: 3.0.3'");

const pathsOccurrences = lines.filter((line) => line.trim() === "paths:").length;
if (pathsOccurrences !== 1) fail(`expected exactly 1 'paths' section, found ${pathsOccurrences}`);

const pathsIndex = lines.findIndex((line) => line.trim() === "paths:");
if (pathsIndex < 0) fail("missing 'paths' section");

const pathOperations = [];
let currentPath = null;
let currentMethod = null;
let hasSummary = false;
let inResponses = false;
let hasResponseCode = false;

const flushMethod = () => {
  if (!currentMethod || !currentPath) return;
  if (!hasSummary) fail(`missing summary for ${currentMethod.toUpperCase()} ${currentPath}`);
  if (!hasResponseCode) fail(`missing responses for ${currentMethod.toUpperCase()} ${currentPath}`);
  pathOperations.push({ method: currentMethod.toUpperCase(), path: currentPath });
};

for (let i = pathsIndex + 1; i < lines.length; i += 1) {
  const line = lines[i];

  const pathMatch = line.match(/^  (\/[^:\s]+):\s*$/);
  if (pathMatch) {
    flushMethod();
    currentPath = pathMatch[1];
    currentMethod = null;
    hasSummary = false;
    inResponses = false;
    hasResponseCode = false;
    continue;
  }

  const methodMatch = line.match(/^    (get|post|patch|put|delete):\s*$/i);
  if (methodMatch) {
    flushMethod();
    currentMethod = methodMatch[1].toLowerCase();
    hasSummary = false;
    inResponses = false;
    hasResponseCode = false;
    continue;
  }

  if (!currentMethod) continue;

  if (/^      summary:\s+.+/.test(line)) {
    hasSummary = true;
    continue;
  }

  if (/^      responses:\s*$/.test(line)) {
    inResponses = true;
    continue;
  }

  if (inResponses) {
    if (/^        "[1-5][0-9][0-9]":\s*$/.test(line) || /^        default:\s*$/.test(line)) {
      hasResponseCode = true;
      continue;
    }
    if (/^      \S/.test(line)) inResponses = false;
  }
}

flushMethod();

if (!pathOperations.length) fail("no operations found in paths section");

console.log(`OpenAPI lint passed (${pathOperations.length} operações).`);
