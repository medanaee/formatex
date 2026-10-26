import { useLibraryStore } from "@/stores/useLibraryStore"
import { openStorage } from "./index"
import type { DocumentItem, FolderItem, Repository } from "./types"
import { WriteQueue } from "./writeQueue"

/** Typing into a document changes it on every keystroke: wait for a pause before writing. */
const SAVE_DELAY_MS = 500

const queue = new WriteQueue((error) => console.error("[formatex] a write to storage failed", error))

let started: Promise<void> | null = null

/** Writes what changed between two states of the library, by reference (an unchanged document is the same object). */
export function scheduleChanges(repo: Repository, before: DocumentItem[], after: DocumentItem[]): void {
  const previous = new Map(before.map((doc) => [doc.id, doc]))
  for (const doc of after) {
    if (previous.get(doc.id) === doc) continue
    queue.schedule(`doc:${doc.id}`, SAVE_DELAY_MS, () => repo.saveDocument(doc))
  }
  const remaining = new Set(after.map((doc) => doc.id))
  for (const id of previous.keys()) {
    // The latest operation for a key wins: this delete replaces a pending save of the same document
    if (!remaining.has(id)) queue.schedule(`doc:${id}`, 0, () => repo.deleteDocument(id))
  }
}

/** The same for folders. */
export function scheduleFolderChanges(repo: Repository, before: FolderItem[], after: FolderItem[]): void {
  const previous = new Map(before.map((folder) => [folder.id, folder]))
  for (const folder of after) {
    if (previous.get(folder.id) !== folder) queue.schedule(`folder:${folder.id}`, 0, () => repo.saveFolder(folder))
  }
  const remaining = new Set(after.map((folder) => folder.id))
  for (const id of previous.keys()) if (!remaining.has(id)) queue.schedule(`folder:${id}`, 0, () => repo.deleteFolder(id))
}

/** Runs every pending write now (the app is going to the background, or a test wants the result). */
export const flushPersistence = (): Promise<void> => queue.flush()

/**
 * Opens the storage, loads the library into its store and keeps writing changes back. Safe to call twice (StrictMode runs
 * effects twice in development): both calls get the same promise.
 */
export function startPersistence(): Promise<void> {
  started ??= (async () => {
    const { repo } = await openStorage()
    useLibraryStore.getState().hydrate(await repo.loadDocuments(), await repo.loadFolders())
    // Subscribe after hydrating, so loading the library is not written straight back
    useLibraryStore.subscribe((state, previous) => {
      if (state.documents !== previous.documents) scheduleChanges(repo, previous.documents, state.documents)
      if (state.folders !== previous.folders) scheduleFolderChanges(repo, previous.folders, state.folders)
    })
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") void flushPersistence()
      })
      window.addEventListener("pagehide", () => void flushPersistence())
    }
  })().catch((error: unknown) => {
    started = null
    throw error
  })
  return started
}
