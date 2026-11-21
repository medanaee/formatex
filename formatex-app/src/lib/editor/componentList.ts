import type { SettingValue } from "@/lib/editor/settingsFormat"

/**
 * The `components` setting is a list of project paths. In a file it is written as an array (`["a.typ", "b.typ"]`, one line), as one
 * path, or as paths separated by commas. Returns the paths, or `null` for a form the settings screen cannot rewrite (an array over
 * several lines): the text stays as it is then.
 */
export function readComponentList(value: SettingValue | undefined): string[] | null {
  if (!value) return []
  if (value.kind === "string") return splitPaths(value.value)
  if (value.kind !== "other") return null
  const raw = value.value.trim()
  if (!raw.startsWith("[")) return splitPaths(raw)
  if (!raw.endsWith("]")) return null
  const inner = raw.slice(1, -1)
  const paths: string[] = []
  for (const match of inner.matchAll(/"((?:[^"\\]|\\.)*)"|'([^']*)'|([^,\s][^,]*)/g)) {
    const path = (match[1] ?? match[2] ?? match[3] ?? "").trim()
    if (path) paths.push(path.replace(/\\(.)/g, "$1"))
  }
  return paths
}

const splitPaths = (text: string): string[] =>
  text
    .split(",")
    .map((path) => path.trim())
    .filter(Boolean)

/** The list as a literal for the file: `["a", "b"]` (the quotes are those of the file's own format). */
export const writeComponentList = (paths: readonly string[], quote: (value: string) => string): string => `[${paths.map(quote).join(", ")}]`

/** Normalizes a component folder path the same way `local-components.typ` does (`./cards/` -> `cards`). */
export const normalizeComponentFolder = (path: string): string =>
  path.trim().replace(/\/+$/, "").replace(/^(\.\/)+/, "")

/** If `path` is a project component's `manifest.toml`, returns its folder path; otherwise `null`. */
export const componentFolderOf = (path: string): string | null => {
  const clean = normalizeComponentFolder(path)
  if (!clean.endsWith("/manifest.toml")) return null
  const folder = clean.slice(0, -"/manifest.toml".length)
  if (!folder || /^(src|components|tools)(\/|$)/.test(folder)) return null
  return folder
}

/** Every valid component package folder (`<folder>/manifest.toml`) in the project's file list. */
export const projectComponentFolders = (files: readonly string[]): string[] =>
  [...new Set(files.map(componentFolderOf).filter((folder): folder is string => folder !== null))].sort((a, b) => a.localeCompare(b))

/** Whether `path` is a project component's `manifest.toml` (not inside the engine's own `src/`, `components/` or `tools/` folders). */
export const isComponentFile = (path: string): boolean => componentFolderOf(path) !== null
