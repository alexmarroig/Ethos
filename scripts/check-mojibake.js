const fs = require("node:fs");
const path = require("node:path");

const ROOT = process.cwd();
const TARGET_DIRS = ["Frontend/src", "apps/ethos-clinic/src", "Site/src"];
const TARGET_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".css", ".md"]);

const SUSPICIOUS_PATTERNS = [
  /Ã§/g,
  /Ã£/g,
  /Ã¡/g,
  /Ã¢/g,
  /Ãª/g,
  /Ã©/g,
  /Ã­/g,
  /Ã³/g,
  /Ãº/g,
  /Ãµ/g,
  /Ãƒ/g,
  /Ã‚/g,
  /Â©/g,
  /Â·/g,
  /Î¨/g,
  /ï¿½/g,
];

const SUSPICIOUS_LINE_PATTERNS = [
  /\bIn\?cio\b/g,
  /\bRelat\?rios\b/g,
  /\bSess\?es\b/g,
  /\bConfigura\?es\b/g,
  /\bCobran\?a\b/g,
  /\bcl\?nica\b/g,
  /\bcl\?nico\b/g,
  /\bDi\?rio\b/g,
  /\bformul\?rios\b/gi,
  /\bn\?o\b/g,
  /\bpr\?ximo\b/g,
  /\bpr\?ximos\b/g,
  /\bconte\?do\b/g,
  /\bA\?o\b/g,
  /\bedi\?o\b/g,
  /\brefer\?ncia\b/g,
  /\bevolu\?o\b/g,
  /\bpend\?ncia\b/g,
];

const IGNORE_FILE_PATTERNS = [
  /[\\/]scripts[\\/]check-mojibake\.js$/,
  /[\\/]pages[\\/]ContractsPage\.tsx$/,
  /[\\/]application[\\/]service\.ts$/,
  /[\\/]lib[\\/]reportAiPrompts\.ts$/,
  /[\\/]application[\\/]ai[\\/]reportGenerator\.ts$/,
  /[\\/]application[\\/]clinicalNoteDocument\.ts$/,
  /[\\/]services[\\/]clinicalNoteService\.ts$/,
];

function shouldScanFile(filePath) {
  const ext = path.extname(filePath);
  if (!TARGET_EXTENSIONS.has(ext)) return false;
  return !IGNORE_FILE_PATTERNS.some((pattern) => pattern.test(filePath));
}

function walk(dir, result = []) {
  if (!fs.existsSync(dir)) return result;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath, result);
    else if (shouldScanFile(fullPath)) result.push(fullPath);
  }
  return result;
}

const findings = [];

for (const targetDir of TARGET_DIRS) {
  const absoluteDir = path.join(ROOT, targetDir);
  for (const filePath of walk(absoluteDir)) {
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split(/\r?\n/);

    lines.forEach((line, index) => {
      if (line.includes("replaceAll(")) return;
      const matchesMojibake = SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(line));
      const matchesBrokenQuestion = SUSPICIOUS_LINE_PATTERNS.some((pattern) => pattern.test(line));
      if (matchesMojibake || matchesBrokenQuestion) {
        findings.push({
          file: path.relative(ROOT, filePath),
          line: index + 1,
          content: line.trim().slice(0, 160),
        });
      }
    });
  }
}

if (findings.length > 0) {
  console.error("Mojibake detectado:");
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} -> ${finding.content}`);
  }
  process.exit(1);
}

console.log("Nenhum caractere corrompido detectado.");
