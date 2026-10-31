import { describe, expect, it } from "vitest"
import { FolderProjectFs } from "./folderProjectFs"
import type { FsEntry } from "./paths"
import type { ProjectFs } from "./types"

/** A folder in memory: path to text; directories are the parents of the files. */
function memory(initial: Record<string, string>): ProjectFs & { files: Map<string, string> } {
  const files = new Map(Object.entries(initial))
  const enc = new TextEncoder()
  return {
    files,
    async list() {
      const dirs = new Set<string>()
      for (const path of files.keys()) for (let i = path.indexOf("/"); i > 0; i = path.indexOf("/", i + 1)) dirs.add(path.slice(0, i))
      return [...[...dirs].map((path): FsEntry => ({ path, kind: "dir" })), ...[...files.keys()].map((path): FsEntry => ({ path, kind: "file" }))]
    },
    readText: async (path) => files.get(path) ?? "",
    readBytes: async (path) => enc.encode(files.get(path) ?? ""),
    writeText: async (path, text) => void files.set(path, text),
    writeBytes: async (path, data) => void files.set(path, new TextDecoder().decode(data)),
    createDir: async () => {},
    remove: async (path) => void files.delete(path),
    rename: async (from, to) => {
      files.set(to, files.get(from) ?? "")
      files.delete(from)
    },
    exists: async (path) => files.has(path),
  }
}

describe("FolderProjectFs", () => {
  it("lists .formatex and its config, adds config.toml as an alias, and hides .git and node_modules", async () => {
    const inner = memory({ ".formatex/config.toml": "c", ".git/HEAD": "x", "node_modules/a/b.js": "x", "notes.md": "n", "images/a.png": "p" })
    const fs = new FolderProjectFs(inner)
    const entries = await fs.list()
    expect(entries.map((entry) => entry.path).sort()).toEqual([".formatex", ".formatex/config.toml", "config.toml", "images", "images/a.png", "notes.md"])
    expect(entries.filter((entry) => entry.alias).map((entry) => entry.path)).toEqual(["config.toml"])
  })

  it("reads and writes config.toml inside .formatex", async () => {
    const inner = memory({})
    const fs = new FolderProjectFs(inner)
    await fs.writeText("config.toml", "source = \"a.md\"")
    expect(inner.files.get(".formatex/config.toml")).toBe("source = \"a.md\"")
    expect(await fs.exists("config.toml")).toBe(true)
    expect(await fs.readText("config.toml")).toBe("source = \"a.md\"")
  })

  it("refuses to touch the hidden folders directly, but .formatex is open", async () => {
    const inner = memory({})
    const fs = new FolderProjectFs(inner)
    await fs.writeText(".formatex/other.toml", "x")
    expect(inner.files.get(".formatex/other.toml")).toBe("x")
    await expect(fs.readText(".git/HEAD")).rejects.toThrow(/reserved/)
  })
})
