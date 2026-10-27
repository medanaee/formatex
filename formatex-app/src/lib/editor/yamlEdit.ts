import type { TomlValue } from "./tomlEdit"

/**
 * Reading and changing single settings in the YAML front matter of a Markdown file, line by line, so comments and order stay as written.
 * The text is the front matter without its `---` lines. Settings are `key: value` at the top (the table `""`) or inside a block
 * (`header:` and the lines indented under it). Nothing deeper than one block is understood; the rest is left alone.
 */

export type YamlValue = TomlValue

const INDENT = (line: string) => /^\s*/.exec(line)![0].length
const isBlank = (line: string) => line.trim() === "" || /^\s*#/.test(line)
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

interface Block {
  /** Line index of `table:`; -1 for the top level. */
  header: number
  /** The block's lines are `header + 1 .. end - 1`. */
  end: number
}

function findBlock(lines: string[], table: string): Block | null {
  if (table === "") {
    // The top level is every line that is not indented, so a "block" over the whole text is read with indent 0
    return { header: -1, end: lines.length }
  }
  const header = lines.findIndex((line) => new RegExp(`^${escape(table)}\\s*:\\s*(#.*)?$`).test(line))
  if (header < 0) return null
  let end = header + 1
  while (end < lines.length && (isBlank(lines[end]) || INDENT(lines[end]) > 0)) end++
  return { header, end }
}

/** The line of `key` inside the block, or -1. At the top level only unindented lines count; in a block only its own (first) indent. */
function findKey(lines: string[], block: Block, table: string, key: string): number {
  const pattern = new RegExp(`^(\\s*)${escape(key)}\\s*:(?:\\s|$)`)
  let indent = table === "" ? 0 : -1
  for (let i = block.header + 1; i < block.end; i++) {
    if (isBlank(lines[i])) continue
    const found = pattern.exec(lines[i])
    const lead = INDENT(lines[i])
    if (table !== "" && indent < 0) indent = lead
    if (found && lead === indent) return i
  }
  return -1
}

/** What stands after `key:` on a line, without a trailing comment. */
function rawValue(line: string): string {
  const after = line.slice(line.indexOf(":") + 1).trim()
  const quote = after[0]
  if (quote === '"' || quote === "'") {
    let i = 1
    while (i < after.length && after[i] !== quote) i += quote === '"' && after[i] === "\\" ? 2 : 1
    return after.slice(0, i + 1)
  }
  const hash = after.indexOf(" #")
  return (hash < 0 ? after : after.slice(0, hash)).trim()
}

function parseValue(raw: string): YamlValue | undefined {
  if (raw === "") return undefined
  if (raw.length >= 2 && raw.startsWith('"') && raw.endsWith('"')) {
    try {
      return { kind: "string", value: JSON.parse(raw) as string }
    } catch {
      return { kind: "string", value: raw.slice(1, -1) }
    }
  }
  if (raw.length >= 2 && raw.startsWith("'") && raw.endsWith("'")) return { kind: "string", value: raw.slice(1, -1).replace(/''/g, "'") }
  if (raw === "true" || raw === "false") return { kind: "bool", value: raw === "true" }
  if (/^[+-]?\d[\d_]*(\.\d+)?$/.test(raw)) return { kind: "number", value: Number(raw.replace(/_/g, "")) }
  // A bare word is a string in YAML (`dir: rtl`), unless it starts a list, a map or a block scalar
  if (/^[[{|>&*!]/.test(raw)) return { kind: "other", value: raw }
  return { kind: "string", value: raw }
}

/** A string as a YAML double-quoted scalar (JSON escaping is valid YAML). */
export const yamlString = (value: string): string => JSON.stringify(value)

export function getValue(text: string, table: string, key: string): YamlValue | undefined {
  const lines = text.split("\n")
  const block = findBlock(lines, table)
  if (!block) return undefined
  const at = findKey(lines, block, table, key)
  return at < 0 ? undefined : parseValue(rawValue(lines[at]))
}

const lastContent = (lines: string[], from: number, to: number): number => {
  let last = from
  for (let i = from; i < to; i++) if (!isBlank(lines[i])) last = i
  return last
}

/** Sets `key` in `table` to a YAML scalar (`"text"`, `true`, `12`): changes the line when there is one, else adds it. */
export function setValue(text: string, table: string, key: string, literal: string): string {
  const lines = text.split("\n")
  const block = findBlock(lines, table)
  if (!block) {
    const last = lastContent(lines, 0, lines.length)
    const at = lines.length === 1 && lines[0] === "" ? -1 : last
    lines.splice(at + 1, 0, `${table}:`, `  ${key}: ${literal}`)
    return lines.join("\n")
  }
  const at = findKey(lines, block, table, key)
  if (at >= 0) {
    const line = lines[at]
    const colon = line.indexOf(":")
    const afterColon = line.slice(colon + 1)
    const tail = afterColon.slice(afterColon.length - afterColon.trimStart().length + rawValue(line).length)
    lines[at] = `${line.slice(0, colon)}: ${literal}${tail.startsWith(" ") || tail === "" ? tail : ` ${tail}`}`
    return lines.join("\n")
  }
  if (table === "") {
    // A new top-level key goes before the first block, so it is not taken for a key of the block above it
    const firstBlock = lines.findIndex((line, i) => i >= 0 && /^[\w-]+\s*:\s*(#.*)?$/.test(line) && lines.slice(i + 1).some((next) => !isBlank(next) && INDENT(next) > 0))
    const into = firstBlock < 0 ? lastContent(lines, 0, lines.length) + 1 : firstBlock
    lines.splice(lines.length === 1 && lines[0] === "" ? 0 : into, 0, `${key}: ${literal}`)
    return lines.join("\n")
  }
  const last = lastContent(lines, block.header, block.end)
  const sample = lines.slice(block.header + 1, block.end).find((line) => !isBlank(line))
  const indent = sample ? " ".repeat(INDENT(sample)) : "  "
  lines.splice(last + 1, 0, `${indent}${key}: ${literal}`)
  return lines.join("\n")
}

/** Removes the line that sets `key`; a block left with nothing in it goes too. */
export function removeKey(text: string, table: string, key: string): string {
  const lines = text.split("\n")
  const block = findBlock(lines, table)
  if (!block) return text
  const at = findKey(lines, block, table, key)
  if (at < 0) return text
  lines.splice(at, 1)
  if (table !== "") {
    const remaining = lines.slice(block.header + 1, block.end - 1).some((line) => !isBlank(line))
    if (!remaining) lines.splice(block.header, 1)
  }
  return lines.join("\n")
}
