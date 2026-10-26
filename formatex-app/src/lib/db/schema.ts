import type { SqlDriver } from "./types"

/**
 * Numbered migrations, applied in order and recorded in `meta.schema_version`. Statements are idempotent (`IF NOT EXISTS`)
 * so an interrupted migration can simply run again. Never edit an applied migration: add a new one.
 */
const MIGRATIONS: string[][] = [
  // 1: the library
  [
    `CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_documents_updated ON documents(updated_at)`,
  ],
  // 2: a project is a folder of files; the row keeps its main file. (`documents.source` of migration 1 is no longer used.)
  [`ALTER TABLE documents ADD COLUMN main_file TEXT NOT NULL DEFAULT 'main.md'`],
  // 3: folders of the library; a project or a folder points at its parent folder (NULL = top level)
  [
    `ALTER TABLE documents ADD COLUMN parent_id TEXT`,
    `CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      parent_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
  ],
]

export const SCHEMA_VERSION = MIGRATIONS.length

/** Creates / upgrades the schema. Returns the version the database is at afterwards. */
export async function runMigrations(driver: SqlDriver): Promise<number> {
  await driver.execute(`CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`)
  const rows = await driver.select<{ value: string }>(`SELECT value FROM meta WHERE key = ?`, ["schema_version"])
  let version = rows.length ? parseInt(rows[0].value, 10) || 0 : 0
  if (version > SCHEMA_VERSION) throw new Error(`Database schema ${version} is newer than this app (${SCHEMA_VERSION})`)
  for (; version < SCHEMA_VERSION; version++) {
    for (const statement of MIGRATIONS[version]) await driver.execute(statement)
    await driver.execute(
      `INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      ["schema_version", String(version + 1)]
    )
  }
  return version
}
