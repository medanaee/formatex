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

/** The list as a literal for the file: `["a.typ", "b.typ"]` (the quotes are those of the file's own format). */
export const writeComponentList = (paths: readonly string[], quote: (value: string) => string): string => `[${paths.map(quote).join(", ")}]`

/** The component files a project can offer: its `.typ` files, but not the engine's own paths. */
export const isComponentFile = (path: string): boolean => path.endsWith(".typ") && path !== "main.typ" && !/^(src|components|tools)\//.test(path)
