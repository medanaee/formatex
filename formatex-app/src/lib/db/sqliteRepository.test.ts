import { beforeEach, describe, expect, it } from "vitest"
import { runMigrations } from "./schema"
import { SqliteRepository } from "./sqliteRepository"
import { createMemoryDriver } from "./testDriver"
import type { DocumentItem } from "./types"

const doc = (id: string, updatedAt: number, patch: Partial<DocumentItem> = {}): DocumentItem => ({
  id,
  title: `Title ${id}`,
  mainFile: "main.md",
  createdAt: 1,
  updatedAt,
  ...patch,
})

describe("SqliteRepository", () => {
  let repo: SqliteRepository

  beforeEach(async () => {
    const driver = createMemoryDriver()
    await runMigrations(driver)
    repo = new SqliteRepository(driver)
  })

  it("lists documents, most recently updated first", async () => {
    await repo.saveDocument(doc("old", 10))
    await repo.saveDocument(doc("new", 20))
    expect((await repo.loadDocuments()).map((d) => d.id)).toEqual(["new", "old"])
  })

  it("updates a document that already exists instead of adding another", async () => {
    await repo.saveDocument(doc("a", 10))
    await repo.saveDocument(doc("a", 30, { title: "Renamed", mainFile: "docs/report.md" }))

    const all = await repo.loadDocuments()
    expect(all).toHaveLength(1)
    expect(all[0]).toMatchObject({ title: "Renamed", mainFile: "docs/report.md", createdAt: 1, updatedAt: 30 })
  })

  it("keeps Persian text intact", async () => {
    await repo.saveDocument(doc("fa", 1, { title: "گزارش آزمایشگاه", mainFile: "گزارش.md" }))
    expect((await repo.loadDocuments())[0]).toMatchObject({ title: "گزارش آزمایشگاه", mainFile: "گزارش.md" })
  })

  it("deletes a document", async () => {
    await repo.saveDocument(doc("a", 1))
    await repo.deleteDocument("a")
    expect(await repo.loadDocuments()).toEqual([])
  })

  it("stores meta values and overwrites them", async () => {
    expect(await repo.getMeta("k")).toBeNull()
    await repo.setMeta("k", "1")
    await repo.setMeta("k", "2")
    expect(await repo.getMeta("k")).toBe("2")
  })
})

describe("folders", () => {
  it("keeps folders and the folder of a project, and a folder can be renamed, moved and deleted", async () => {
    const driver = createMemoryDriver()
    await runMigrations(driver)
    const repo = new SqliteRepository(driver)
    await repo.saveFolder({ id: "f1", name: "Courses", parentId: null, createdAt: 1, updatedAt: 1 })
    await repo.saveFolder({ id: "f2", name: "Lab", parentId: "f1", createdAt: 2, updatedAt: 2 })
    await repo.saveDocument(doc("a", 5, { parentId: "f2" }))
    await repo.saveDocument(doc("b", 4))

    expect((await repo.loadDocuments()).map((d) => [d.id, d.parentId])).toEqual([["a", "f2"], ["b", null]])
    await repo.saveFolder({ id: "f2", name: "Labs", parentId: null, createdAt: 2, updatedAt: 3 })
    expect((await repo.loadFolders()).map((f) => [f.name, f.parentId])).toEqual([["Courses", null], ["Labs", null]])
    await repo.deleteFolder("f1")
    expect((await repo.loadFolders()).map((f) => f.id)).toEqual(["f2"])
  })
})
