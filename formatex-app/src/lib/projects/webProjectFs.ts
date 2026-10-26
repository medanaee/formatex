import { compareEntries, type FsEntry } from "./paths"
import type { ProjectFs } from "./types"

interface Stored {
  /** path → text, or `base64:<data>` for a binary file */
  files: Record<string, string>
  dirs: string[]
}

const BINARY = "base64:"

const toBase64 = (data: Uint8Array): string => {
  let binary = ""
  for (let i = 0; i < data.length; i += 0x8000) binary += String.fromCharCode(...data.subarray(i, i + 0x8000))
  return btoa(binary)
}

const fromBase64 = (text: string): Uint8Array => Uint8Array.from(atob(text), (char) => char.charCodeAt(0))

/**
 * The project's files in a plain browser (`vite dev`, UI tests, the web build until it gets OPFS): one localStorage entry, a few
 * MB at most. There is no compiler in a browser yet, so this exists to run the editor UI, not to hold real work.
 */
export class WebProjectFs implements ProjectFs {
  private readonly key: string

  constructor(projectId: string) {
    this.key = `formatex_web_project_${projectId}`
  }

  private load(): Stored {
    try {
      const raw = localStorage.getItem(this.key)
      if (raw) return JSON.parse(raw) as Stored
    } catch {
      // Corrupt or unavailable storage: start empty
    }
    return { files: {}, dirs: [] }
  }

  private save(stored: Stored): void {
    localStorage.setItem(this.key, JSON.stringify(stored))
  }

  async list(): Promise<FsEntry[]> {
    const { files, dirs } = this.load()
    const folders = new Set(dirs)
    for (const path of Object.keys(files)) {
      for (let slash = path.indexOf("/"); slash > 0; slash = path.indexOf("/", slash + 1)) folders.add(path.slice(0, slash))
    }
    const out: FsEntry[] = [...folders].map((path) => ({ path, kind: "dir" as const }))
    out.push(...Object.keys(files).map((path) => ({ path, kind: "file" as const })))
    return out.sort(compareEntries)
  }

  async readText(path: string): Promise<string> {
    const text = this.load().files[path]
    if (text === undefined) throw new Error(`not found: ${path}`)
    return text.startsWith(BINARY) ? new TextDecoder().decode(fromBase64(text.slice(BINARY.length))) : text
  }

  async readBytes(path: string): Promise<Uint8Array> {
    const text = this.load().files[path]
    if (text === undefined) throw new Error(`not found: ${path}`)
    return text.startsWith(BINARY) ? fromBase64(text.slice(BINARY.length)) : new TextEncoder().encode(text)
  }

  async writeText(path: string, text: string): Promise<void> {
    const stored = this.load()
    stored.files[path] = text.startsWith(BINARY) ? BINARY + toBase64(new TextEncoder().encode(text)) : text
    this.save(stored)
  }

  async writeBytes(path: string, data: Uint8Array): Promise<void> {
    const stored = this.load()
    stored.files[path] = BINARY + toBase64(data)
    this.save(stored)
  }

  async createDir(path: string): Promise<void> {
    const stored = this.load()
    if (!stored.dirs.includes(path)) stored.dirs.push(path)
    this.save(stored)
  }

  async remove(path: string): Promise<void> {
    const stored = this.load()
    const inside = (candidate: string) => candidate === path || candidate.startsWith(`${path}/`)
    stored.files = Object.fromEntries(Object.entries(stored.files).filter(([candidate]) => !inside(candidate)))
    stored.dirs = stored.dirs.filter((candidate) => !inside(candidate))
    this.save(stored)
  }

  async rename(from: string, to: string): Promise<void> {
    const stored = this.load()
    const move = (candidate: string) => (candidate === from ? to : candidate.startsWith(`${from}/`) ? to + candidate.slice(from.length) : candidate)
    stored.files = Object.fromEntries(Object.entries(stored.files).map(([candidate, text]) => [move(candidate), text]))
    stored.dirs = stored.dirs.map(move)
    this.save(stored)
  }

  async exists(path: string): Promise<boolean> {
    const { files, dirs } = this.load()
    return path in files || dirs.includes(path) || Object.keys(files).some((candidate) => candidate.startsWith(`${path}/`))
  }
}
