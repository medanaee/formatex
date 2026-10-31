import { compareEntries, type FsEntry } from "./paths"
import type { ProjectFs } from "./types"

const encoder = new TextEncoder()
const decoder = new TextDecoder()

type Fs = typeof import("@tauri-apps/plugin-fs")

/**
 * A project folder through plugin-fs; the native compiler reads the same files. By default `$APPDATA/documents/<id>/`; with
 * `absolute` the root is a folder of the user's (an absolute path the app has been given access to) and `ignore` names the
 * folders at its top that are left out of the listing.
 */
export class TauriProjectFs implements ProjectFs {
  private readonly root: string
  private readonly absolute: boolean
  private readonly ignore: readonly string[]
  private fsModule: Promise<Fs> | null = null

  constructor(projectId: string, absolute?: { root: string; ignore?: readonly string[] }) {
    this.root = absolute ? absolute.root.replace(/[\\/]+$/, "") : `documents/${projectId}`
    this.absolute = !!absolute
    this.ignore = absolute?.ignore ?? []
  }

  private fs(): Promise<Fs> {
    return (this.fsModule ??= import("@tauri-apps/plugin-fs"))
  }

  private async options(): Promise<{ baseDir?: number }> {
    if (this.absolute) return {}
    const { BaseDirectory } = await this.fs()
    return { baseDir: BaseDirectory.AppData }
  }

  private full = (path: string) => (path ? `${this.root}/${path}` : this.root)

  async list(): Promise<FsEntry[]> {
    const fs = await this.fs()
    const options = await this.options()
    const out: FsEntry[] = []
    const walk = async (dir: string) => {
      for (const entry of await fs.readDir(this.full(dir), options)) {
        const path = dir ? `${dir}/${entry.name}` : entry.name
        if (entry.isDirectory) {
          if (!dir && this.ignore.includes(entry.name)) continue
          out.push({ path, kind: "dir" })
          await walk(path)
        } else if (entry.isFile) {
          out.push({ path, kind: "file" })
        }
      }
    }
    await walk("")
    return out.sort(compareEntries)
  }

  async readText(path: string): Promise<string> {
    return decoder.decode(await this.readBytes(path))
  }

  async readBytes(path: string): Promise<Uint8Array> {
    const fs = await this.fs()
    return fs.readFile(this.full(path), await this.options())
  }

  async writeText(path: string, text: string): Promise<void> {
    await this.writeBytes(path, encoder.encode(text))
  }

  async writeBytes(path: string, data: Uint8Array): Promise<void> {
    const fs = await this.fs()
    const options = await this.options()
    const slash = path.lastIndexOf("/")
    if (slash > 0) await fs.mkdir(this.full(path.slice(0, slash)), { ...options, recursive: true })
    await fs.writeFile(this.full(path), data, options)
  }

  async createDir(path: string): Promise<void> {
    const fs = await this.fs()
    await fs.mkdir(this.full(path), { ...(await this.options()), recursive: true })
  }

  async remove(path: string): Promise<void> {
    const fs = await this.fs()
    await fs.remove(this.full(path), { ...(await this.options()), recursive: true })
  }

  async rename(from: string, to: string): Promise<void> {
    const fs = await this.fs()
    const options = await this.options()
    await fs.rename(this.full(from), this.full(to), options.baseDir === undefined ? {} : { oldPathBaseDir: options.baseDir, newPathBaseDir: options.baseDir })
  }

  async exists(path: string): Promise<boolean> {
    const fs = await this.fs()
    return fs.exists(this.full(path), await this.options())
  }
}
