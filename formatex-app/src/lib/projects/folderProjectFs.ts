import { compareEntries, CONFIG_FILE, FORMATEX_CONFIG, IGNORED_DIRS, type FsEntry } from "./paths"
import type { ProjectFs } from "./types"

/**
 * A project kept in a folder of the user's. The config lives in `.formatex/config.toml`, which is listed like any file; the editor
 * also finds it under the name `config.toml` (an alias entry the file tree does not show), so everything that reads the project's
 * config works the same. `.git` and `node_modules` are not listed. Paths are relative to the folder that was opened.
 */
export class FolderProjectFs implements ProjectFs {
  private readonly inner: ProjectFs

  /** `inner` is a file system rooted at the folder (it lists everything, `.formatex` included). */
  constructor(inner: ProjectFs) {
    this.inner = inner
  }

  /** The place in the folder of a project path; `.git` and `node_modules` are refused. */
  private map(path: string): string {
    if (path === CONFIG_FILE) return FORMATEX_CONFIG
    if ((IGNORED_DIRS as readonly string[]).includes(path.split("/")[0])) throw new Error(`reserved path: ${path}`)
    return path
  }

  async list(): Promise<FsEntry[]> {
    const entries = (await this.inner.list()).filter((entry) => !(IGNORED_DIRS as readonly string[]).includes(entry.path.split("/")[0]))
    if (await this.inner.exists(FORMATEX_CONFIG)) entries.push({ path: CONFIG_FILE, kind: "file", alias: true })
    return entries.sort(compareEntries)
  }
  readText = async (path: string) => this.inner.readText(this.map(path))
  readBytes = async (path: string) => this.inner.readBytes(this.map(path))
  writeText = async (path: string, text: string) => this.inner.writeText(this.map(path), text)
  writeBytes = async (path: string, data: Uint8Array) => this.inner.writeBytes(this.map(path), data)
  createDir = async (path: string) => this.inner.createDir(this.map(path))
  remove = async (path: string) => this.inner.remove(this.map(path))
  rename = async (from: string, to: string) => this.inner.rename(this.map(from), this.map(to))
  exists = async (path: string) => this.inner.exists(this.map(path))
}
