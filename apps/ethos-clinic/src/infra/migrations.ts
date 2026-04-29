import { readFileSync } from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";

const MIGRATION_ID = "20260429_01_biohub_phase2";

export const runMigrations = async () => {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return;
  const sql = neon(dbUrl);
  await sql`CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  const existing = await sql`SELECT id FROM schema_migrations WHERE id=${MIGRATION_ID}` as Array<{id:string}>;
  if (existing.length > 0) return;
  const file = path.resolve(__dirname, "../../migrations/20260429_01_biohub_phase2.sql");
  const raw = readFileSync(file, "utf8");
  const upSection = raw.split("-- down")[0].replace("-- up", "");
  const statements = upSection.split(";").map((s) => s.trim()).filter(Boolean);
  for (const stmt of statements) {
    await sql.query(stmt);
  }
  await sql`INSERT INTO schema_migrations (id) VALUES (${MIGRATION_ID})`;
};
