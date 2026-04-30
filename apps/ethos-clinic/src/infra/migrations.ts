import { readFileSync } from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";

const MIGRATION_ID = "20260429_01_biohub_phase2";
const LOCK_ID = "biohub_phase2_lock";

export const runMigrations = async () => {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return;

  const sql = neon(dbUrl);

  await sql`CREATE TABLE IF NOT EXISTS schema_migrations (
    id TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;

  await sql`CREATE TABLE IF NOT EXISTS schema_migration_locks (
    id TEXT PRIMARY KEY,
    locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;

  try {
    await sql`INSERT INTO schema_migration_locks (id) VALUES (${LOCK_ID})`;
  } catch {
    throw new Error("BIOHUB_FATAL: migration lock already held by another instance");
  }

  try {
    const existing =
      (await sql`SELECT id FROM schema_migrations WHERE id = ${MIGRATION_ID}`) as Array<{
        id: string;
      }>;

    if (existing.length > 0) return;

    const file = path.resolve(
      __dirname,
      "../../migrations/20260429_01_biohub_phase2.sql",
    );
    const raw = readFileSync(file, "utf8");
    const upSection = raw.split("-- down")[0].replace("-- up", "");
    const statements = upSection
      .split(";")
      .map((stmt) => stmt.trim())
      .filter(Boolean);

    for (const stmt of statements) {
      await sql.query(stmt);
    }

    await sql`INSERT INTO schema_migrations (id) VALUES (${MIGRATION_ID})`;
  } finally {
    await sql`DELETE FROM schema_migration_locks WHERE id = ${LOCK_ID}`;
  }
};