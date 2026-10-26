import type { DocumentItem, FolderItem, Repository } from "./types"

const DOCUMENTS_KEY = "formatex_web_documents"
const FOLDERS_KEY = "formatex_web_folders"
const META_KEY = "formatex_web_meta"

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value))
}

/**
 * The repository of a plain browser (`vite dev`, UI tests, and the web build until it gets a real store): localStorage, one
 * quota of a few MB. The web release should replace it with SQLite-in-WASM on OPFS behind the same `Repository` interface.
 */
export class WebRepository implements Repository {
  async loadDocuments(): Promise<DocumentItem[]> {
    return read<DocumentItem[]>(DOCUMENTS_KEY, []).sort((a, b) => b.updatedAt - a.updatedAt)
  }

  async saveDocument(doc: DocumentItem): Promise<void> {
    const all = read<DocumentItem[]>(DOCUMENTS_KEY, []).filter((item) => item.id !== doc.id)
    write(DOCUMENTS_KEY, [...all, doc])
  }

  async deleteDocument(id: string): Promise<void> {
    write(
      DOCUMENTS_KEY,
      read<DocumentItem[]>(DOCUMENTS_KEY, []).filter((item) => item.id !== id)
    )
  }

  async loadFolders(): Promise<FolderItem[]> {
    return read<FolderItem[]>(FOLDERS_KEY, [])
  }

  async saveFolder(folder: FolderItem): Promise<void> {
    write(FOLDERS_KEY, [...read<FolderItem[]>(FOLDERS_KEY, []).filter((item) => item.id !== folder.id), folder])
  }

  async deleteFolder(id: string): Promise<void> {
    write(
      FOLDERS_KEY,
      read<FolderItem[]>(FOLDERS_KEY, []).filter((item) => item.id !== id)
    )
  }

  async getMeta(key: string): Promise<string | null> {
    return read<Record<string, string>>(META_KEY, {})[key] ?? null
  }

  async setMeta(key: string, value: string): Promise<void> {
    write(META_KEY, { ...read<Record<string, string>>(META_KEY, {}), [key]: value })
  }
}
