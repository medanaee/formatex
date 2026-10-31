import { describe, expect, it } from "vitest"
import { runMigrations, SCHEMA_VERSION } from "./schema"
import { createMemoryDriver } from "./testDriver"

describe("runMigrations", () => {
  it("creates the schema and records its version", async () => {
    const driver = createMemoryDriver()
    expect(await runMigrations(driver)).toBe(SCHEMA_VERSION)

    const tables = await driver.select<{ name: string }>(`SELECT name FROM sqlite_master WHERE type = 'table'`)
    expect(tables.map((t) => t.name)).toEqual(expect.arrayContaining(["documents", "meta"]))
    const version = await driver.select<{ value: string }>(`SELECT value FROM meta WHERE key = 'schema_version'`)
    expect(version[0].value).toBe(String(SCHEMA_VERSION))
  })

  it("can run again on an up-to-date database without changing it", async () => {
    const driver = createMemoryDriver()
    await runMigrations(driver)
    expect(await runMigrations(driver)).toBe(SCHEMA_VERSION)
  })

  it("upgrades a version-1 database and keeps its documents", async () => {
    const driver = createMemoryDriver()
    await runMigrations(driver)
    // Pretend the database is at version 1: drop what migrations 2 to 4 added, and the version
    await driver.execute(`ALTER TABLE documents DROP COLUMN location`)
    await driver.execute(`ALTER TABLE documents DROP COLUMN parent_id`)
    await driver.execute(`DROP TABLE folders`)
    await driver.execute(`ALTER TABLE documents DROP COLUMN main_file`)
    await driver.execute(`UPDATE meta SET value = '1' WHERE key = 'schema_version'`)
    await driver.execute(`INSERT INTO documents (id, title, created_at, updated_at) VALUES ('old', 'Old', 1, 1)`)

    await runMigrations(driver)
    const rows = await driver.select<{ id: string; main_file: string }>(`SELECT id, main_file FROM documents`)
    expect(rows).toEqual([{ id: "old", main_file: "main.md" }])
  })

  it("refuses a database that is newer than the app", async () => {
    const driver = createMemoryDriver()
    await runMigrations(driver)
    await driver.execute(`UPDATE meta SET value = ? WHERE key = 'schema_version'`, [String(SCHEMA_VERSION + 1)])
    await expect(runMigrations(driver)).rejects.toThrow(/newer than this app/)
  })
})
