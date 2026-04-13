import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.join(__dirname, "migrations");

async function ensureMigrationsTable(db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      migration_name VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function getAppliedMigrations(db) {
  const [rows] = await db.query("SELECT migration_name FROM schema_migrations");
  return new Set(rows.map((row) => row.migration_name));
}

async function getMigrationFiles() {
  const files = await fs.readdir(migrationsDir);
  return files.filter((name) => name.endsWith(".sql")).sort();
}

export async function runMySqlMigrations(db) {
  if (!db) {
    throw new Error("runMySqlMigrations requires a MySQL pool instance");
  }

  await ensureMigrationsTable(db);

  const applied = await getAppliedMigrations(db);
  const files = await getMigrationFiles();

  for (const file of files) {
    if (applied.has(file)) {
      continue;
    }

    const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
    await db.query(sql);
    await db.query("INSERT INTO schema_migrations (migration_name) VALUES (?)", [file]);
  }
}
