import type { DocumentItem, FolderItem, Repository, SqlDriver } from "./types"

interface DocumentRow {
  id: string
  title: string
  main_file: string
  parent_id: string | null
  created_at: number
  updated_at: number
}

interface FolderRow {
  id: string
  name: string
  parent_id: string | null
  created_at: number
  updated_at: number
}

const toFolder = (row: FolderRow): FolderItem => ({ id: row.id, name: row.name, parentId: row.parent_id, createdAt: row.created_at, updatedAt: row.updated_at })

const toDocument = (row: DocumentRow): DocumentItem => ({
  id: row.id,
  title: row.title,
  mainFile: row.main_file,
  parentId: row.parent_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

/** The repository over SQLite (the app). The SQL is tested against real SQLite through `node:sqlite`. */
export class SqliteRepository implements Repository {
  private readonly driver: SqlDriver

  constructor(driver: SqlDriver) {
    this.driver = driver
  }

  async loadDocuments(): Promise<DocumentItem[]> {
    const rows = await this.driver.select<DocumentRow>(
      `SELECT id, title, main_file, parent_id, created_at, updated_at FROM documents ORDER BY updated_at DESC`
    )
    return rows.map(toDocument)
  }

  async saveDocument(doc: DocumentItem): Promise<void> {
    await this.driver.execute(
      `INSERT INTO documents (id, title, main_file, parent_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET title = excluded.title, main_file = excluded.main_file, parent_id = excluded.parent_id, updated_at = excluded.updated_at`,
      [doc.id, doc.title, doc.mainFile, doc.parentId ?? null, doc.createdAt, doc.updatedAt]
    )
  }

  async deleteDocument(id: string): Promise<void> {
    await this.driver.execute(`DELETE FROM documents WHERE id = ?`, [id])
  }

  async loadFolders(): Promise<FolderItem[]> {
    const rows = await this.driver.select<FolderRow>(`SELECT id, name, parent_id, created_at, updated_at FROM folders ORDER BY name`)
    return rows.map(toFolder)
  }

  async saveFolder(folder: FolderItem): Promise<void> {
    await this.driver.execute(
      `INSERT INTO folders (id, name, parent_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, parent_id = excluded.parent_id, updated_at = excluded.updated_at`,
      [folder.id, folder.name, folder.parentId ?? null, folder.createdAt, folder.updatedAt]
    )
  }

  async deleteFolder(id: string): Promise<void> {
    await this.driver.execute(`DELETE FROM folders WHERE id = ?`, [id])
  }

  async getMeta(key: string): Promise<string | null> {
    const rows = await this.driver.select<{ value: string }>(`SELECT value FROM meta WHERE key = ?`, [key])
    return rows.length ? rows[0].value : null
  }

  async setMeta(key: string, value: string): Promise<void> {
    await this.driver.execute(
      `INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, value]
    )
  }
}
