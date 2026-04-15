import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { db } from "./database";

const DATA_FILE = process.env.DATA_FILE ?? path.join(process.cwd(), "data", "ethos-db.json");
const DATABASE_URL = process.env.DATABASE_URL;

// ---------------------------------------------------------------------------
// Snapshot helpers
// ---------------------------------------------------------------------------

function buildSnapshot(): Record<string, unknown[][]> {
  const snapshot: Record<string, unknown[][]> = {};
  for (const [key, value] of Object.entries(db)) {
    if (value instanceof Map) {
      snapshot[key] = Array.from((value as Map<unknown, unknown>).entries());
    }
  }
  return snapshot;
}

function applySnapshot(raw: Record<string, [string, unknown][]>): void {
  for (const [key, entries] of Object.entries(raw)) {
    const map = (db as Record<string, unknown>)[key];
    if (map instanceof Map && Array.isArray(entries)) {
      for (const [k, v] of entries) map.set(k, v);
    }
  }
}

// ---------------------------------------------------------------------------
// File-based persistence (local dev / fallback)
// ---------------------------------------------------------------------------

function writeToFile(): void {
  const dir = path.dirname(DATA_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(DATA_FILE, JSON.stringify(buildSnapshot(), null, 2), "utf8");
}

function readFromFile(): void {
  if (!existsSync(DATA_FILE)) {
    process.stdout.write(`[persist] No data file found at ${DATA_FILE}, starting fresh.\n`);
    return;
  }
  try {
    const raw = JSON.parse(readFileSync(DATA_FILE, "utf8")) as Record<string, [string, unknown][]>;
    applySnapshot(raw);
    process.stdout.write(`[persist] Loaded data from ${DATA_FILE}\n`);
  } catch (e) {
    process.stderr.write(`[persist] Failed to load data: ${(e as Error).message}\n`);
  }
}

// ---------------------------------------------------------------------------
// Neon PostgreSQL persistence
// ---------------------------------------------------------------------------

type NeonSql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Array<Record<string, unknown>>>;

async function ensureTable(sql: NeonSql): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS ethos_snapshot (
      id         TEXT PRIMARY KEY,
      data       JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

async function readFromNeon(sql: NeonSql): Promise<void> {
  await ensureTable(sql);
  const rows = (await sql`SELECT data FROM ethos_snapshot WHERE id = 'main'`) as Array<{ data: Record<string, [string, unknown][]> }>;
  if (rows.length === 0) {
    process.stdout.write("[persist] No Neon snapshot found — starting fresh.\n");
    return;
  }
  applySnapshot(rows[0].data);
  process.stdout.write("[persist] Loaded snapshot from Neon PostgreSQL.\n");
}

async function writeToNeon(sql: NeonSql): Promise<void> {
  const snapshot = buildSnapshot();
  await sql`
    INSERT INTO ethos_snapshot (id, data, updated_at)
    VALUES ('main', ${JSON.stringify(snapshot) as unknown as string}, NOW())
    ON CONFLICT (id) DO UPDATE
      SET data       = EXCLUDED.data,
          updated_at = NOW()
  `;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

let _sql: NeonSql | null = null;

export async function loadFromFile(): Promise<void> {
  if (DATABASE_URL) {
    try {
      const { neon } = await import("@neondatabase/serverless");
      _sql = neon(DATABASE_URL) as unknown as NeonSql;
      await readFromNeon(_sql);
    } catch (err) {
      process.stderr.write(`[persist] Neon load failed, falling back to file: ${String(err)}\n`);
      readFromFile();
    }
  } else {
    readFromFile();
  }
}

export function saveToFile(): void {
  if (_sql) {
    const sqlRef = _sql;
    writeToNeon(sqlRef).catch((err) =>
      process.stderr.write(`[persist] Neon save error: ${String(err)}\n`)
    );
  } else {
    try {
      writeToFile();
    } catch (e) {
      process.stderr.write(`[persist] File save failed: ${(e as Error).message}\n`);
    }
  }
}

export function startAutosave(intervalMs = 30_000): NodeJS.Timeout {
  const timer = setInterval(() => {
    saveToFile();
  }, intervalMs);
  timer.unref();
  return timer;
}
