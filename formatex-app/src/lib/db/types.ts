/**
 * A project of the library. Its files (config.toml, Markdown, images) live in `$APPDATA/documents/<id>/`; this row holds what
 * the library shows and which Markdown file is typeset.
 */
export interface DocumentItem {
  id: string
  title: string
  /** Project-relative path of the Markdown file that is typeset and exported. */
  mainFile: string
  /** The folder of the library the project is in; none (or null) means the top level. */
  parentId?: string | null
  createdAt: number
  updatedAt: number
}

/** A folder of the library: it holds projects and other folders. */
export interface FolderItem {
  id: string
  name: string
  parentId?: string | null
  createdAt: number
  updatedAt: number
}

/** Minimal SQL access: one statement per call (the Tauri SQL plugin cannot run reliable multi-call transactions). */
export interface SqlDriver {
  execute(sql: string, params?: unknown[]): Promise<void>
  select<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>
}

/** Binary files (images, fonts, exports) under the app data directory; paths are relative like `documents/<id>/figure.png`. */
export interface FileStore {
  put(path: string, data: Uint8Array): Promise<void>
  get(path: string): Promise<Uint8Array | null>
  remove(path: string): Promise<void>
  /** Removes a directory and everything in it; a missing directory is fine. */
  removeDir(path: string): Promise<void>
}

/** Everything the app stores in SQLite, as domain operations. UI code never writes SQL. */
export interface Repository {
  loadDocuments(): Promise<DocumentItem[]>
  /** Inserts or updates the document. */
  saveDocument(doc: DocumentItem): Promise<void>
  deleteDocument(id: string): Promise<void>
  loadFolders(): Promise<FolderItem[]>
  saveFolder(folder: FolderItem): Promise<void>
  deleteFolder(id: string): Promise<void>
  getMeta(key: string): Promise<string | null>
  setMeta(key: string, value: string): Promise<void>
}
