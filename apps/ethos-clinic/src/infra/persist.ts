import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { db } from "./database";

const DATA_FILE = process.env.DATA_FILE ?? path.join(process.cwd(), "data", "ethos-db.json");

export function saveToFile(): void {
  const dir = path.dirname(DATA_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const snapshot: Record<string, unknown[][]> = {};
  for (const [key, value] of Object.entries(db)) {
    if (value instanceof Map) {
      snapshot[key] = Array.from((value as Map<unknown, unknown>).entries());
    }
  }
  writeFileSync(DATA_FILE, JSON.stringify(snapshot, null, 2), "utf8");
}

export function loadFromFile(): void {
  if (!existsSync(DATA_FILE)) {
    process.stdout.write(`[persist] No data file found at ${DATA_FILE}, starting fresh.\n`);
    return;
  }
  try {
    const raw = JSON.parse(readFileSync(DATA_FILE, "utf8")) as Record<string, [string, unknown][]>;
    for (const [key, entries] of Object.entries(raw)) {
      const map = (db as Record<string, unknown>)[key];
      if (map instanceof Map && Array.isArray(entries)) {
        for (const [k, v] of entries) map.set(k, v);
      }
    }
    process.stdout.write(`[persist] Loaded data from ${DATA_FILE}\n`);
  } catch (e) {
    process.stderr.write(`[persist] Failed to load data: ${(e as Error).message}\n`);
  }
}

export function startAutosave(intervalMs = 30_000): NodeJS.Timeout {
  const timer = setInterval(() => {
    try {
      saveToFile();
    } catch (e) {
      process.stderr.write(`[persist] Autosave failed: ${(e as Error).message}\n`);
    }
  }, intervalMs);
  timer.unref();
  return timer;
}
