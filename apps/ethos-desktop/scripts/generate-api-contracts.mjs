import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");
const repoRoot = resolve(appRoot, "..", "..");

const HTTP_METHODS = ["get", "post", "put", "patch", "delete", "options", "head", "trace"];

function extractContracts(source) {
  const lines = source.split(/\r?\n/);
  const contract = new Map();
  let inPaths = false;
  let currentPath = null;

  const addMethods = (path, methods) => {
    if (!path || methods.length === 0) return;
    const normalizedPath = path.trim();
    const existing = contract.get(normalizedPath) ?? new Set();
    methods.forEach((method) => existing.add(method));
    contract.set(normalizedPath, existing);
  };

  for (const line of lines) {
    if (/^paths:\s*$/.test(line)) {
      inPaths = true;
      currentPath = null;
      continue;
    }
    if (!inPaths) continue;

    if (/^\S/.test(line) && !/^paths:\s*$/.test(line)) {
      inPaths = false;
      currentPath = null;
      continue;
    }

    const pathLine = line.match(/^\s{2}(\/[^:]+):\s*(\{.*\})?\s*$/);
    if (pathLine) {
      currentPath = pathLine[1];
      const inlineMethods = [...(pathLine[2] ?? "").matchAll(/\b(get|post|put|patch|delete|options|head|trace)\s*:/gi)].map(
        (match) => match[1].toLowerCase(),
      );
      addMethods(currentPath, inlineMethods);
      continue;
    }

    const methodLine = line.match(/^\s{4,}(get|post|put|patch|delete|options|head|trace):/i);
    if (methodLine && currentPath) {
      addMethods(currentPath, [methodLine[1].toLowerCase()]);
    }
  }

  return Object.fromEntries(
    [...contract.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([path, methods]) => [path, [...methods].sort((a, b) => HTTP_METHODS.indexOf(a) - HTTP_METHODS.indexOf(b))]),
  );
}

function renderContractFile(name, sourcePath, contract) {
  return `/* eslint-disable */\n// AUTO-GENERATED FILE.\n// Source: ${sourcePath}\n// Regenerate with: npm --workspace apps/ethos-desktop run contracts:generate\n\nexport const ${name} = ${JSON.stringify(contract, null, 2)} as const;\n\nexport type ${name[0].toUpperCase() + name.slice(1)}Path = keyof typeof ${name};\n`;
}

function writeContract({ sourcePath, outputPath, exportName }) {
  const absoluteSourcePath = resolve(repoRoot, sourcePath);
  const absoluteOutputPath = resolve(appRoot, outputPath);
  const source = readFileSync(absoluteSourcePath, "utf-8");
  const contract = extractContracts(source);
  writeFileSync(absoluteOutputPath, renderContractFile(exportName, sourcePath, contract));
  console.log(`Generated ${outputPath} (${Object.keys(contract).length} paths)`);
}

writeContract({
  sourcePath: "apps/ethos-control-plane/openapi.yaml",
  outputPath: "src/services/api/contracts/controlPlane.contract.ts",
  exportName: "controlPlaneContract",
});

writeContract({
  sourcePath: "apps/ethos-backend/openapi.yaml",
  outputPath: "src/services/api/contracts/clinical.contract.ts",
  exportName: "clinicalContract",
});
