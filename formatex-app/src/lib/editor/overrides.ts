import { frontMatterRange } from "./livePreview"

/**
 * Which settings of `config.toml` the Markdown document overrides. The engine merges the front matter over the config table by table
 * (`merge-config`): a key the front matter sets wins, and a front-matter value that is not a table replaces the whole config value
 * at that path. Settings are compared by their dotted key path (`heading.color`, `themes.ocean.bg`).
 */

export interface FrontMatterEntry {
  /** Dotted key path: `theme`, `header.title`. */
  path: string
  /** The value as written, without quotes; a block of keys has none. */
  value: string
  /** 1-based line in the Markdown file. */
  line: number
  /** Not a block of keys: the value replaces whatever the config has at this path. */
  leaf: boolean
}

export interface ConfigEntry {
  path: string
  /** 1-based line in `config.toml`. */
  line: number
}

const unquote = (text: string): string => {
  const t = text.trim()
  if (t.length >= 2 && ((t[0] === '"' && t.endsWith('"')) || (t[0] === "'" && t.endsWith("'")))) return t.slice(1, -1)
  return t
}

/** What stands after `key:` without a trailing comment. */
function yamlValue(after: string): string {
  const text = after.trim()
  const quote = text[0]
  if (quote === '"' || quote === "'") {
    let i = 1
    while (i < text.length && text[i] !== quote) i += quote === '"' && text[i] === "\\" ? 2 : 1
    return unquote(text.slice(0, i + 1))
  }
  const hash = text.search(/(^|\s)#/)
  return (hash < 0 ? text : text.slice(0, hash)).trim()
}

const indentOf = (line: string) => /^\s*/.exec(line)![0].length
const blank = (line: string) => line.trim() === "" || /^\s*#/.test(line)

/** Every key the front matter of a Markdown file sets, nested keys by path. Nothing for a file without front matter; never throws. */
export function frontMatterEntries(markdown: string): FrontMatterEntry[] {
  const range = frontMatterRange(markdown)
  if (!range) return []
  const firstLine = markdown.slice(0, range.from).split("\n").length
  const lines = markdown.slice(range.from, range.to).split(/\r?\n/)
  const out: FrontMatterEntry[] = []
  const stack: { indent: number; path: string }[] = []
  let skipAbove = -1
  for (let i = 0; i < lines.length; i++) {
    const text = lines[i]
    if (blank(text)) continue
    const indent = indentOf(text)
    // Continuation of a value: block scalar text, the items of a list
    if (skipAbove >= 0 && indent > skipAbove) continue
    skipAbove = -1
    const found = /^\s*(?:([\w.-]+)|"([^"]+)"|'([^']+)')\s*:(?:\s+(.*)|\s*)$/.exec(text)
    if (!found) continue
    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) stack.pop()
    const key = found[1] ?? found[2] ?? found[3]
    const path = stack.length > 0 ? `${stack[stack.length - 1].path}.${key}` : key
    const value = yamlValue(found[4] ?? "")
    if (value === "") {
      const next = lines.slice(i + 1).find((line) => !blank(line))
      if (next !== undefined && indentOf(next) > indent && !next.trim().startsWith("-")) {
        out.push({ path, value: "", line: firstLine + i, leaf: false })
        stack.push({ indent, path })
        continue
      }
    }
    out.push({ path, value, line: firstLine + i, leaf: true })
    skipAbove = indent
  }
  return out
}

const segments = (name: string): string[] =>
  name
    .split(/\.(?=(?:[^"']*["'][^"']*["'])*[^"']*$)/)
    .map((part) => unquote(part))
    .filter((part) => part !== "")

/** Every key `config.toml` sets, by dotted path (the table header and the key). Arrays of tables are skipped. */
export function configEntries(toml: string): ConfigEntry[] {
  const out: ConfigEntry[] = []
  let table: string | null = ""
  toml.split(/\r?\n/).forEach((text, i) => {
    const header = /^\s*(\[\[?)\s*([^\]]+?)\s*\]\]?\s*(?:#.*)?$/.exec(text)
    if (header) {
      table = header[1] === "[[" ? null : segments(header[2]).join(".")
      return
    }
    if (table === null) return
    const key = /^\s*((?:[\w-]+|"[^"]*"|'[^']*')(?:\s*\.\s*(?:[\w-]+|"[^"]*"|'[^']*'))*)\s*=/.exec(text)
    if (!key) return
    const own = segments(key[1].replace(/\s+/g, "")).join(".")
    out.push({ path: table === "" ? own : `${table}.${own}`, line: i + 1 })
  })
  return out
}

/**
 * The front-matter entry that overrides `path`, or `undefined`: the entry for the path itself, or a value (not a block) set at one
 * of its parents (`list: x` replaces `list.a`).
 */
export function overrideFor(entries: readonly FrontMatterEntry[], path: string): FrontMatterEntry | undefined {
  const exact = entries.find((entry) => entry.path === path)
  if (exact) return exact
  return entries.find((entry) => entry.leaf && path.startsWith(`${entry.path}.`))
}

export interface ConfigOverride extends ConfigEntry {
  override: FrontMatterEntry
}

/** The keys of `config.toml` the front matter sets too, with the line each is on. */
export function configOverrides(toml: string, entries: readonly FrontMatterEntry[]): ConfigOverride[] {
  if (entries.length === 0) return []
  const out: ConfigOverride[] = []
  for (const entry of configEntries(toml)) {
    const override = overrideFor(entries, entry.path)
    if (override) out.push({ ...entry, override })
  }
  return out
}
