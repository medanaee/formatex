/** Names at the top of a project that belong to the engine: a project can neither create nor replace them (mirrors `engine.rs`). */
export const RESERVED_ROOTS = ["main.typ", "code-dark.tmTheme", "src", "components", "tools"] as const

export const CONFIG_FILE = "config.toml"
export const DEFAULT_MAIN_FILE = "main.md"

export type FileKind = "markdown" | "toml" | "typst" | "text" | "image" | "font" | "binary"

const EXTENSIONS: Record<string, FileKind> = {
  md: "markdown",
  markdown: "markdown",
  toml: "toml",
  typ: "typst",
  txt: "text",
  json: "text",
  csv: "text",
  bib: "text",
  yml: "text",
  yaml: "text",
  html: "text",
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  webp: "image",
  svg: "image",
  bmp: "image",
  ttf: "font",
  otf: "font",
  ttc: "font",
  woff: "font",
  woff2: "font",
}

export const baseName = (path: string): string => path.slice(path.lastIndexOf("/") + 1)

/** The folder of a path (`""` for the project root). */
export const parentOf = (path: string): string => (path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "")

export const joinPath = (parent: string, name: string): string => (parent ? `${parent}/${name}` : name)

export function extensionOf(path: string): string {
  const name = baseName(path)
  const dot = name.lastIndexOf(".")
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : ""
}

export const fileKindOf = (path: string): FileKind => EXTENSIONS[extensionOf(path)] ?? "binary"

/** Kinds the editor can show as text. */
export const isTextKind = (kind: FileKind): boolean => kind === "markdown" || kind === "toml" || kind === "typst" || kind === "text"

export function isReservedPath(path: string): boolean {
  const first = path.split("/")[0]
  return (RESERVED_ROOTS as readonly string[]).includes(first)
}

export type NameProblem = "empty" | "invalid" | "reserved" | "exists"

const FORBIDDEN = /[\\/:*?"<>|]/
const hasControlCharacter = (text: string): boolean => [...text].some((char) => char.charCodeAt(0) < 32)

/** Why `name` cannot be used for a new file or folder inside `parent`, or `null` when it can. */
export function nameProblem(name: string, parent: string, existing: ReadonlySet<string>): NameProblem | null {
  const trimmed = name.trim()
  if (!trimmed) return "empty"
  if (FORBIDDEN.test(trimmed) || hasControlCharacter(trimmed) || trimmed === "." || trimmed === ".." || trimmed.length > 120 || trimmed.endsWith(".")) return "invalid"
  const path = joinPath(parent, trimmed)
  if (parent === "" && isReservedPath(path)) return "reserved"
  if (existing.has(path)) return "exists"
  return null
}

/** `figure.png` → `figure 2.png` when `figure.png` is taken. */
export function uniqueName(name: string, parent: string, existing: ReadonlySet<string>): string {
  if (!existing.has(joinPath(parent, name))) return name
  const dot = name.lastIndexOf(".")
  const stem = dot > 0 ? name.slice(0, dot) : name
  const extension = dot > 0 ? name.slice(dot) : ""
  for (let n = 2; ; n++) {
    const candidate = `${stem} ${n}${extension}`
    if (!existing.has(joinPath(parent, candidate))) return candidate
  }
}

export interface FsEntry {
  /** Project-relative path with `/` separators, no leading slash. */
  path: string
  kind: "file" | "dir"
}

/** Folders before files, then by name with numbers in order (`img2` before `img10`). */
export function compareEntries(a: FsEntry, b: FsEntry): number {
  const sa = a.path.split("/")
  const sb = b.path.split("/")
  const length = Math.min(sa.length, sb.length)
  for (let i = 0; i < length; i++) {
    if (sa[i] === sb[i]) continue
    const aIsDir = i < sa.length - 1 || a.kind === "dir"
    const bIsDir = i < sb.length - 1 || b.kind === "dir"
    if (aIsDir !== bIsDir) return aIsDir ? -1 : 1
    return sa[i].localeCompare(sb[i], undefined, { numeric: true, sensitivity: "base" })
  }
  return sa.length - sb.length
}
