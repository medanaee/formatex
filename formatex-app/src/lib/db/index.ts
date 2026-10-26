import { isTauri } from "@/lib/platform"
import { runMigrations } from "./schema"
import { SqliteRepository } from "./sqliteRepository"
import { WebRepository } from "./webRepository"
import type { FileStore, Repository } from "./types"

export * from "./types"

export type StorageKind = "sqlite" | "web"

interface Storage {
  kind: StorageKind
  repo: Repository
  /** Binary files; null in the browser fallback. */
  files: FileStore | null
}

let current: Storage | null = null
let opening: Promise<Storage> | null = null

async function open(): Promise<Storage> {
  if (isTauri()) {
    const { createTauriDriver, TauriFileStore } = await import("./tauriBackend")
    const driver = await createTauriDriver()
    await runMigrations(driver)
    return { kind: "sqlite", repo: new SqliteRepository(driver), files: new TauriFileStore() }
  }
  return { kind: "web", repo: new WebRepository(), files: null }
}

/** Opens the storage of this runtime once: SQLite + files inside the app, localStorage in a plain browser. */
export function openStorage(): Promise<Storage> {
  if (current) return Promise.resolve(current)
  // StrictMode mounts effects twice in development: both calls must share one open
  opening ??= open().then(
    (storage) => (current = storage),
    (error: unknown) => {
      opening = null
      throw error
    }
  )
  return opening
}

/** The opened storage, or null before `openStorage()` ran (unit tests, early boot). */
export function getStorage(): Storage | null {
  return current
}

/** Tests: use a prepared storage (e.g. SQLite over `node:sqlite`) or reset with null. */
export function setStorageForTests(storage: Storage | null): void {
  current = storage
  opening = null
}
