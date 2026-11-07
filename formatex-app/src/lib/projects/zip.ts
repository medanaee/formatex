import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from "fflate"
import type { ProjectKind } from "@/lib/db/types"
import { CONFIG_FILE, DEFAULT_CONFIG, DEFAULT_MAIN_FILE, fileKindOf, isReservedPath, isTextKind, openProjectFs, sourceOf, withSource } from "./index"

/** Written at the top of an exported project: what the app needs to put it back together. */
const MANIFEST = "formatex-project.json"

/** Limits for an imported zip, so a hostile or broken file cannot fill the disk or the memory. */
const MAX_ENTRIES = 5000
const MAX_BYTES = 300 * 1024 * 1024

interface Manifest {
  version: 1
  title: string
  /** The file to typeset: a Markdown file, or for plain Typst a `.typ` file (`""`: none chosen). */
  mainFile: string
  /** What the project is; a zip made before kinds, or by something else, has none and is a Formatex project. */
  kind?: ProjectKind
}

export interface ImportedProject {
  title: string
  mainFile: string
  kind: ProjectKind
  files: { path: string; data: Uint8Array }[]
}

/** A zip path made safe: forward slashes, no `..`, no drive, no empty parts; `null` for a path that cannot be used. */
export function safeZipPath(raw: string): string | null {
  const path = raw.replace(/\\/g, "/").replace(/^\/+/, "")
  if (path === "" || path.endsWith("/")) return null
  const parts = path.split("/")
  if (parts.some((part) => part === "" || part === "." || part === ".." || /^[a-zA-Z]:$/.test(part) || /[\u0000-\u001f]/.test(part))) return null
  // macOS and Windows leave their own bookkeeping in a zip
  if (parts[0] === "__MACOSX" || parts.at(-1) === ".DS_Store" || parts.at(-1) === "Thumbs.db") return null
  return path
}

/** Every file of a project (and its title, its main file and what it is) as a zip. */
export async function exportProjectZip(projectId: string, title: string, mainFile: string, kind: ProjectKind = "formatex"): Promise<Uint8Array> {
  const fs = await openProjectFs(projectId)
  const entries = await fs.list()
  const tree: Zippable = {}
  for (const entry of entries) {
    if (entry.kind !== "file") continue
    // Images and fonts are already compressed
    const level = fileKindOf(entry.path) === "image" || fileKindOf(entry.path) === "font" ? 0 : 6
    tree[entry.path] = [await fs.readBytes(entry.path), { level }]
  }
  const manifest: Manifest = { version: 1, title, mainFile, kind }
  tree[MANIFEST] = strToU8(JSON.stringify(manifest, null, 2))
  return zipSync(tree)
}

/**
 * Reads a zip into a project: the manifest when there is one (a zip made by Formatex), else the folder's own name and the first
 * Markdown file. A zip made from a folder has everything under one top folder: that folder is stripped. Engine-owned paths
 * (`src/`, `components/`, ...) and unsafe paths are left out.
 */
export function readProjectZip(bytes: Uint8Array, fallbackTitle: string): ImportedProject {
  const unzipped = unzipSync(bytes)
  const names = Object.keys(unzipped)
  if (names.length > MAX_ENTRIES) throw new Error("The zip has too many files")
  let total = 0
  const files = new Map<string, Uint8Array>()
  for (const name of names) {
    const path = safeZipPath(name)
    if (!path) continue
    total += unzipped[name].length
    if (total > MAX_BYTES) throw new Error("The zip is too large")
    files.set(path, unzipped[name])
  }

  // Everything under one folder: take the folder off
  const tops = new Set([...files.keys()].map((path) => (path.includes("/") ? path.split("/")[0] : "")))
  let prefix = ""
  // (a folder named like an engine path, `src` say, is the project's own only when the zip says it is plain Typst: checked after the manifest)
  const looksPlain = (): boolean => [...files.keys()].some((path) => path.endsWith(".typ")) && ![...files.keys()].some((path) => fileKindOf(path) === "markdown" || path.endsWith(CONFIG_FILE))
  if (tops.size === 1 && !tops.has("") && !files.has(MANIFEST) && !files.has(CONFIG_FILE) && (!isReservedPath([...tops][0]) || looksPlain())) prefix = `${[...tops][0]}/`
  const rooted = new Map([...files].map(([path, data]) => [path.slice(prefix.length), data] as const))

  let manifest: Partial<Manifest> = {}
  const raw = rooted.get(MANIFEST)
  if (raw) {
    try {
      manifest = JSON.parse(strFromU8(raw)) as Partial<Manifest>
    } catch {
      manifest = {}
    }
    rooted.delete(MANIFEST)
  }

  // What the project is: the manifest says; a zip with none that holds Typst and no Markdown is a plain Typst project (a folder of Typst files)
  const typstOnly = [...rooted.keys()].some((path) => path.endsWith(".typ")) && ![...rooted.keys()].some((path) => fileKindOf(path) === "markdown" || path === CONFIG_FILE)
  const kind: ProjectKind = manifest.kind === "typst" || (manifest.kind === undefined && !raw && typstOnly) ? "typst" : "formatex"

  // A plain Typst project has no engine: no name is reserved there
  const kept = [...rooted].filter(([path]) => kind === "typst" || !isReservedPath(path)).map(([path, data]) => ({ path, data }))
  if (kept.length === 0) throw new Error("The zip has no project files")
  const title = typeof manifest.title === "string" && manifest.title.trim() ? manifest.title.trim() : prefix ? prefix.slice(0, -1) : fallbackTitle
  if (kind === "typst") {
    // The main file the zip names, else main.typ when there is one, else none
    const typst = kept.map((file) => file.path)
    const named = typeof manifest.mainFile === "string" && typst.includes(manifest.mainFile) ? manifest.mainFile : ""
    return { title, kind, mainFile: named || (typst.includes("main.typ") ? "main.typ" : ""), files: kept }
  }
  const markdown = kept.map((file) => file.path).filter((path) => fileKindOf(path) === "markdown")
  const mainFile = kept.some((file) => file.path === manifest.mainFile)
    ? (manifest.mainFile as string)
    : markdown.includes(DEFAULT_MAIN_FILE)
      ? DEFAULT_MAIN_FILE
      : (markdown.sort((a, b) => a.split("/").length - b.split("/").length || a.localeCompare(b))[0] ?? DEFAULT_MAIN_FILE)
  return { title, kind, mainFile, files: kept }
}

/** Writes an imported project's files into a (new) project. A project with no config.toml gets the engine's default. */
export async function writeImportedProject(projectId: string, project: ImportedProject): Promise<void> {
  const fs = await openProjectFs(projectId)
  for (const file of project.files) {
    if (isTextKind(fileKindOf(file.path))) await fs.writeText(file.path, strFromU8(file.data))
    else await fs.writeBytes(file.path, file.data)
  }
  // A plain Typst project has no config.toml of ours: its files are all there is
  if (project.kind === "typst") return
  // The project's main file is the `source` of its config.toml: a zip without one (or with a config that names none) gets the one found
  const config = project.files.find((file) => file.path === CONFIG_FILE)
  const text = config ? strFromU8(config.data) : DEFAULT_CONFIG
  if (!config || !sourceOf(text)) await fs.writeText(CONFIG_FILE, withSource(text, project.mainFile))
}
