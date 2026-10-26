import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { setStorageForTests } from "./index"
import { runMigrations } from "./schema"
import { SqliteRepository } from "./sqliteRepository"
import { flushPersistence, startPersistence } from "./sync"
import { createMemoryDriver } from "./testDriver"
import { useLibraryStore } from "@/stores/useLibraryStore"

describe("persistence", () => {
  let repo: SqliteRepository

  beforeEach(async () => {
    const driver = createMemoryDriver()
    await runMigrations(driver)
    repo = new SqliteRepository(driver)
    await repo.saveDocument({ id: "stored", title: "Stored", mainFile: "main.md", createdAt: 1, updatedAt: 1 })
    setStorageForTests({ kind: "sqlite", repo, files: null })
  })

  afterEach(() => setStorageForTests(null))

  // `startPersistence` keeps its state for the life of the module, so one test walks through the whole life of the library
  it("loads the library, then writes every change back", async () => {
    await startPersistence()
    await startPersistence() // a second call (StrictMode) must not subscribe twice
    expect(useLibraryStore.getState().loaded).toBe(true)
    expect(useLibraryStore.getState().documents.map((d) => d.id)).toEqual(["stored"])

    const created = useLibraryStore.getState().createDocument("New")
    useLibraryStore.getState().setMainFile(created.id, "docs/a.md")
    await flushPersistence()
    expect((await repo.loadDocuments()).find((d) => d.id === created.id)).toMatchObject({ title: "New", mainFile: "docs/a.md" })

    useLibraryStore.getState().renameDocument("stored", "Renamed")
    await flushPersistence()
    expect((await repo.loadDocuments()).find((d) => d.id === "stored")?.title).toBe("Renamed")

    useLibraryStore.getState().removeDocument(created.id)
    await flushPersistence()
    expect((await repo.loadDocuments()).map((d) => d.id)).toEqual(["stored"])
  })
})
