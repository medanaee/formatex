import type { CompletionEnv, Completions, Suggestion } from "./completion"
import { localized, type AttrSpec, type ConfigSchema } from "./schema"

/**
 * Autocomplete for the engine's two settings files, from the schema in `src/lib/config-schema.typ` (exported as `config` in
 * `engine/tags.json`): `config.toml`, and the YAML front matter at the top of a Markdown file. The same data suggests
 * [table] names, keys, and the values of an enum or a boolean, so a new setting needs no change here.
 */

const KEY_PLACEHOLDER = "${}"

const quoted = (spec: AttrSpec) => spec.type === "string" || spec.type === "enum" || spec.type === "path" || spec.type === "color"

function attrSuggestion(name: string, spec: AttrSpec, env: CompletionEnv, template: string): Suggestion {
  return { label: name, kind: "attribute", detail: spec.type === "enum" && spec.values ? spec.values.slice(0, 3).join(" | ") + (spec.values.length > 3 ? " …" : "") : spec.type, info: localized(spec.doc, env.language), template }
}

/** The values to offer for a key: an enum's values, true / false, other suggested values, or the default. */
function valueSuggestions(spec: AttrSpec, wrap: (value: string) => string, rawBool: boolean): Suggestion[] {
  const make = (value: string, template: string, detail?: string, boost = 0): Suggestion => ({ label: value, kind: "value", detail, template, boost })
  if (spec.type === "bool") return ["true", "false"].map((value) => make(value, value, value === spec.default ? "default" : undefined, value === spec.default ? 1 : 0))
  if (spec.values) return spec.values.map((value) => make(value, wrap(value), value === spec.default ? "default" : undefined, value === spec.default ? 1 : 0))
  if (spec.default !== undefined && spec.default !== "") return [make(spec.default, quoted(spec) && !rawBool ? wrap(spec.default) : spec.default, "default")]
  return []
}

// ----- config.toml -----

function tomlSection(textBefore: string): string {
  let section = ""
  for (const line of textBefore.split("\n")) {
    const header = /^\s*\[([^\]\n]+)\]\s*$/.exec(line)
    if (header) section = header[1].trim()
  }
  return section
}

/** The keys already written in the section that contains `pos`, so they are not suggested twice. */
function tomlKeysInSection(text: string, lineStart: number): Set<string> {
  const lines = text.split("\n")
  const index = text.slice(0, lineStart).split("\n").length - 1
  const keys = new Set<string>()
  const read = (line: string) => /^\s*([\w-]+)\s*=/.exec(line)?.[1]
  for (let i = index - 1; i >= 0 && !/^\s*\[/.test(lines[i]); i--) {
    const key = read(lines[i])
    if (key) keys.add(key)
  }
  for (let i = index + 1; i < lines.length && !/^\s*\[/.test(lines[i]); i++) {
    const key = read(lines[i])
    if (key) keys.add(key)
  }
  return keys
}

export function completeToml(text: string, pos: number, env: CompletionEnv): Completions | null {
  const config = env.schema.config?.config
  if (!config) return null
  const lineStart = text.lastIndexOf("\n", pos - 1) + 1
  const before = text.slice(lineStart, pos)
  if (/^\s*#/.test(before)) return null
  const next = text[pos] ?? ""

  // A table header: [fo
  const header = /^\s*\[([\w.-]*)$/.exec(before)
  if (header) {
    const options = Object.entries(config.tables).map(([name, table]): Suggestion => ({ label: name, kind: "tag", detail: "table", info: localized(table.doc, env.language), template: next === "]" ? name : `${name}]` }))
    return { from: pos - header[1].length, options }
  }

  const section = tomlSection(text.slice(0, lineStart))
  const attrs = section ? config.tables[section]?.attrs : config.attrs
  if (!attrs) return null

  // A value: key = "va
  const assignment = /^\s*([\w-]+)\s*=\s*(.*)$/.exec(before)
  if (assignment) {
    const spec = attrs[assignment[1]]
    if (!spec) return null
    const value = assignment[2]
    const open = (value.match(/"/g)?.length ?? 0) % 2 === 1
    const from = open ? lineStart + before.lastIndexOf('"') + 1 : pos - value.length
    const wrap = (item: string) => (open ? item + (next === '"' ? "" : '"') : `"${item}"`)
    const options = valueSuggestions(spec, wrap, !open)
    return options.length ? { from, options } : null
  }

  // A key: fo
  const key = /^\s*([\w-]*)$/.exec(before)
  if (key) {
    const present = tomlKeysInSection(text, lineStart)
    const options = Object.entries(attrs)
      .filter(([name]) => !present.has(name))
      .map(([name, spec]) => attrSuggestion(name, spec, env, quoted(spec) ? `${name} = "${KEY_PLACEHOLDER}"` : `${name} = ${KEY_PLACEHOLDER}`))
    return { from: pos - key[1].length, options }
  }
  return null
}

// ----- YAML front matter -----

/** The `---` block at the very top of a Markdown file: where it ends (the start of its closing line), or `null` when there is none. */
export function frontMatterEnd(text: string): number | null {
  const open = /^---[ \t]*\r?\n/.exec(text)
  if (!open) return null
  const close = /^---[ \t]*$/m.exec(text.slice(open[0].length))
  return close ? open[0].length + close.index : text.length
}

export function inFrontMatter(text: string, pos: number): boolean {
  const end = frontMatterEnd(text)
  const open = /^---[ \t]*\r?\n/.exec(text)
  return end !== null && open !== null && pos >= open[0].length && pos <= end
}

/** The key of the block a line at `indent` belongs to (`header` for an indented line under `header:`), or `""` at the top level. */
function yamlParent(lines: string[], index: number, indent: number): string {
  if (indent === 0) return ""
  for (let i = index - 1; i >= 0; i--) {
    const match = /^(\s*)([\w-]+):\s*$/.exec(lines[i])
    if (match && match[1].length < indent) return match[2]
  }
  return ""
}

function yamlSiblingKeys(lines: string[], index: number, indent: number, parentIndent: number): Set<string> {
  const keys = new Set<string>()
  const scan = (from: number, step: number) => {
    for (let i = from; i >= 0 && i < lines.length; i += step) {
      if (lines[i].trim() === "") continue
      const lead = /^\s*/.exec(lines[i])![0].length
      // A line less indented than the block ends it
      if (lead < indent && (parentIndent >= 0 || lead < indent)) break
      const key = /^(\s*)([\w-]+):/.exec(lines[i])
      if (key && key[1].length === indent) keys.add(key[2])
    }
  }
  scan(index - 1, -1)
  scan(index + 1, 1)
  return keys
}

export function completeFrontMatter(text: string, pos: number, env: CompletionEnv): Completions | null {
  const config = env.schema.config?.["front-matter"]
  if (!config) return null
  const lineStart = text.lastIndexOf("\n", pos - 1) + 1
  const before = text.slice(lineStart, pos)
  if (/^\s*#/.test(before) || / #/.test(before)) return null
  const lines = text.split("\n")
  const index = text.slice(0, lineStart).split("\n").length - 1
  const indent = /^\s*/.exec(before)![0].length
  const parent = yamlParent(lines, index, indent)
  const attrs = parent ? (config.tables[parent]?.attrs ?? null) : config.attrs
  if (!attrs) return null

  // A value: theme: oc
  const assignment = /^(\s*)([\w-]+):[ \t]+(.*)$/.exec(before)
  if (assignment) {
    const spec = attrs[assignment[2]]
    if (!spec) return null
    const partial = assignment[3]
    const quote = partial.startsWith('"') ? 1 : 0
    const options = valueSuggestions(spec, (value) => value, true)
    return options.length ? { from: pos - partial.length + quote, options } : null
  }

  // A key: he
  const key = /^\s*([\w-]*)$/.exec(before)
  if (key) {
    const parentIndent = parent ? (/^\s*/.exec(lines.slice(0, index).reverse().find((line) => new RegExp(`^\\s*${parent}:\\s*$`).test(line)) ?? "")![0].length) : -1
    const present = yamlSiblingKeys(lines, index, indent, parentIndent)
    const options: Suggestion[] = Object.entries(attrs)
      .filter(([name]) => !present.has(name))
      .map(([name, spec]) => attrSuggestion(name, spec, env, `${name}: `))
    // At the top level the blocks (header, footer, cover, ...) are keys too
    if (!parent) {
      for (const [name, table] of Object.entries(config.tables)) {
        if (!present.has(name)) options.push({ label: name, kind: "tag", detail: "block", info: localized(table.doc, env.language), template: `${name}:\n  ${KEY_PLACEHOLDER}`, boost: 1 })
      }
    }
    return { from: pos - key[1].length, options }
  }
  return null
}

export type { ConfigSchema }
