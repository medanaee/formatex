import type { FileStore, SqlDriver } from "./types"

/** SQLite through the Tauri SQL plugin (sqlx). The database file lives in the app config directory. */
export async function createTauriDriver(): Promise<SqlDriver> {
  const { default: Database } = await import("@tauri-apps/plugin-sql")
  const db = await Database.load("sqlite:formatex.db")
  // Write-ahead logging survives a killed app best; the busy timeout covers the plugin's connection pool
  await db.select("PRAGMA journal_mode = WAL")
  await db.execute("PRAGMA busy_timeout = 5000")
  await db.execute("PRAGMA synchronous = NORMAL")
  return {
    async execute(sql, params = []) {
      await db.execute(sql, params)
    },
    async select<T>(sql: string, params: unknown[] = []) {
      return db.select<T[]>(sql, params)
    },
  }
}

/** Files under `$APPDATA` through plugin-fs. */
export class TauriFileStore implements FileStore {
  private async fs() {
    return import("@tauri-apps/plugin-fs")
  }

  private parent(path: string): string | null {
    const index = path.lastIndexOf("/")
    return index > 0 ? path.slice(0, index) : null
  }

  async put(path: string, data: Uint8Array): Promise<void> {
    const fs = await this.fs()
    const dir = this.parent(path)
    if (dir) await fs.mkdir(dir, { baseDir: fs.BaseDirectory.AppData, recursive: true })
    await fs.writeFile(path, data, { baseDir: fs.BaseDirectory.AppData })
  }

  async get(path: string): Promise<Uint8Array | null> {
    const fs = await this.fs()
    try {
      return await fs.readFile(path, { baseDir: fs.BaseDirectory.AppData })
    } catch {
      return null
    }
  }

  async remove(path: string): Promise<void> {
    const fs = await this.fs()
    try {
      await fs.remove(path, { baseDir: fs.BaseDirectory.AppData })
    } catch {
      // Already gone
    }
  }

  async removeDir(path: string): Promise<void> {
    const fs = await this.fs()
    try {
      await fs.remove(path, { baseDir: fs.BaseDirectory.AppData, recursive: true })
    } catch {
      // Already gone
    }
  }
}
