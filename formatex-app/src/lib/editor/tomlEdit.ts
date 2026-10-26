/**
 * Reading and changing single settings in the text of a `config.toml`, line by line, so the comments and the order of the file stay
 * as the user wrote them. A "table" is the text of a header without its brackets (`font`, `themes.ocean`); the keys above the first
 * header belong to the table `""`.
 */

const KEY = (key: string) => new RegExp(`^\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*=`)
const HEADER = /^\s*\[([^[\]\n]+)\]\s*(?:#.*)?$/

export type TomlValue = { kind: "string"; value: string } | { kind: "bool"; value: boolean } | { kind: "number"; value: number } | { kind: "other"; value: string }

interface Span {
  /** Line index of the header (`-1` for the keys at the top of the file). */
  header: number
  /** The lines of the section are `header + 1 .. end - 1`. */
  end: number
}

const headerName = (line: string): string | null => HEADER.exec(line)?.[1].trim().replace(/\s*\.\s*/g, ".") ?? null

function findSection(lines: string[], table: string): Span | null {
  if (table === "") {
    const first = lines.findIndex((line) => headerName(line) !== null)
    return { header: -1, end: first < 0 ? lines.length : first }
  }
  const start = lines.findIndex((line) => headerName(line) === table)
  if (start < 0) return null
  let end = start + 1
  while (end < lines.length && headerName(lines[end]) === null) end++
  return { header: start, end }
}

const isAssignment = (line: string) => /^\s*[\w"'.-]+\s*=/.test(line)

/** The index of the line that sets `key` in `table`, or -1. */
function findKey(lines: string[], span: Span, key: string): number {
  const pattern = KEY(key)
  for (let i = span.header + 1; i < span.end; i++) if (pattern.test(lines[i])) return i
  return -1
}

/** The value written after `=`, comment removed. */
function rawValue(line: string): string {
  const after = line.slice(line.indexOf("=") + 1).trim()
  const quote = after[0]
  if (quote === '"' || quote === "'") {
    let i = 1
    while (i < after.length && after[i] !== quote) i += quote === '"' && after[i] === "\\" ? 2 : 1
    return after.slice(0, i + 1)
  }
  const hash = after.indexOf(" #")
  return (hash < 0 ? after : after.slice(0, hash)).trim()
}

function parseValue(raw: string): TomlValue {
  if (/^".*"$/s.test(raw)) {
    return { kind: "string", value: raw.slice(1, -1).replace(/\\(["\\nt])/g, (_, c: string) => (c === "n" ? "\n" : c === "t" ? "\t" : c)) }
  }
  if (/^'.*'$/s.test(raw)) return { kind: "string", value: raw.slice(1, -1) }
  if (raw === "true" || raw === "false") return { kind: "bool", value: raw === "true" }
  if (/^[+-]?\d[\d_]*(\.\d+)?$/.test(raw)) return { kind: "number", value: Number(raw.replace(/_/g, "")) }
  return { kind: "other", value: raw }
}

/** A string as a TOML literal. */
export const tomlString = (value: string): string => `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\t/g, "\\t")}"`

export function getValue(text: string, table: string, key: string): TomlValue | undefined {
  const lines = text.split("\n")
  const span = findSection(lines, table)
  if (!span) return undefined
  const at = findKey(lines, span, key)
  return at < 0 ? undefined : parseValue(rawValue(lines[at]))
}

/** Sets `key` in `table` to a TOML literal (`"text"`, `true`, `12`): changes the line when there is one, else adds it. */
export function setValue(text: string, table: string, key: string, literal: string): string {
  const lines = text.split("\n")
  const span = findSection(lines, table)
  if (!span) {
    const body = text.endsWith("\n") || text === "" ? text : `${text}\n`
    return `${body}${body === "" ? "" : "\n"}[${table}]\n${key} = ${literal}\n`
  }
  const at = findKey(lines, span, key)
  if (at >= 0) {
    const line = lines[at]
    const eq = line.indexOf("=")
    const afterEq = line.slice(eq + 1)
    // What follows the old value (spaces and a comment) stays
    const tail = afterEq.slice(afterEq.length - afterEq.trimStart().length + rawValue(line).length)
    lines[at] = `${line.slice(0, eq)}= ${literal}${tail}`
    return lines.join("\n")
  }
  // After the last setting of the section (not after the comments that introduce the next table)
  let after = span.header
  for (let i = span.header + 1; i < span.end; i++) if (isAssignment(lines[i])) after = i
  lines.splice(after + 1, 0, `${key} = ${literal}`)
  return lines.join("\n")
}

/** Removes the line that sets `key`; the table stays. */
export function removeKey(text: string, table: string, key: string): string {
  const lines = text.split("\n")
  const span = findSection(lines, table)
  if (!span) return text
  const at = findKey(lines, span, key)
  if (at < 0) return text
  lines.splice(at, 1)
  return lines.join("\n")
}

/** Removes a table with everything in it (and the comment lines right above its header). */
export function removeTable(text: string, table: string): string {
  const lines = text.split("\n")
  const span = findSection(lines, table)
  if (!span || span.header < 0) return text
  let start = span.header
  while (start > 0 && /^\s*#/.test(lines[start - 1])) start--
  lines.splice(start, span.end - start)
  return lines.join("\n").replace(/\n{3,}/g, "\n\n")
}

/** Renames a table: `renameTable(text, "themes.a", "themes.b")` changes its header line. */
export function renameTable(text: string, from: string, to: string): string {
  const lines = text.split("\n")
  const at = lines.findIndex((line) => headerName(line) === from)
  if (at < 0) return text
  lines[at] = lines[at].replace(HEADER, (whole, name: string) => whole.replace(`[${name}]`, `[${to}]`))
  return lines.join("\n")
}

/** The names that follow `prefix.` in the headers: `tableNames(text, "themes")` gives the user's themes. */
export function tableNames(text: string, prefix: string): string[] {
  const names: string[] = []
  for (const line of text.split("\n")) {
    const name = headerName(line)
    if (name?.startsWith(`${prefix}.`)) {
      const rest = name.slice(prefix.length + 1).replace(/^"(.*)"$/, "$1")
      if (rest && !rest.includes(".") && !names.includes(rest)) names.push(rest)
    }
  }
  return names
}

export const hasTable = (text: string, table: string): boolean => text.split("\n").some((line) => headerName(line) === table)
