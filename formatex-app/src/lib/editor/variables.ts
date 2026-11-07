/**
 * The variables of a document or a project, read from the text for autocomplete and for the settings screen (see the engine's
 * src/lib/vars.typ): `vars` holds the values and `var-types` the rules. A small scanner of the shapes the docs show, not a parser:
 *
 *   vars:                                  var-types:
 *     audience: teacher                      audience: [student, teacher, parent]
 *     level: 2                               level: { min: 1, max: 3 }
 *     width: 12em                            width: length
 *     exam: data/exam.json                   exam: json
 *
 *   [vars]                                 [var-types]
 *   audience = "teacher"                   audience = ["student", "teacher", "parent"]
 */
export type VariableRule =
  /** The values it may have. */
  | { kind: "enum"; options: string[] }
  /** The range of a number. */
  | { kind: "range"; min?: string; max?: string }
  /** Its type: bool, number, int, length, color, string, markdown, json, data. */
  | { kind: "type"; name: string }

export interface VariableSpec {
  name: string
  /** The value written, without quotes. */
  value?: string
  /** It was written in quotes, so it is a text even when it looks like a number. */
  quoted?: boolean
  rule?: VariableRule
  /** The value is more than one scalar (a list, a table, several lines): the settings screen shows it but does not rewrite it. */
  block?: boolean
}

/** What a document can always read, whatever it defines: the keys of the cover. */
export const READ_ONLY_VARIABLES = ["title", "subtitle", "author", "date", "institution", "faculty", "department", "supervisor", "advisor"]
/** The types a `var-types` entry can name. */
export const VARIABLE_TYPES = ["bool", "number", "int", "length", "color", "string", "markdown", "json"] as const
/** Values of the page, known only when the pages are made. */
export const PAGE_VALUES = ["PAGE", "PAGES", "SECTION", "SECTION_NUMBER"]

const FRONT_MATTER = /^﻿?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/
const KEYWORDS = ["if", "else", "for", "while", "in", "and", "or", "not", "let", "set", "show", "import", "include", "return", "break", "continue", "context", "true", "false", "none", "auto", "setting"]

export const isNumeric = (value: string): boolean => /^-?\d+(\.\d+)?$/.test(value)
export const isBoolean = (value: string): boolean => value === "true" || value === "false"
/** A name the engine accepts for a variable: letters, digits, `-` and `_`, not a keyword, not all capitals (those are values of the page). */
export const isVariableName = (name: string): boolean =>
  /^[\p{L}_][\p{L}\p{N}_-]*$/u.test(name) && !KEYWORDS.includes(name) && (name.toUpperCase() !== name || name.toLowerCase() === name)

const isQuoted = (raw: string): boolean => /^\s*["']/.test(raw)

/** Drops quotes and a trailing ` # comment`. */
export function unquote(raw: string): string {
  let text = raw.trim()
  const quote = text[0]
  if (quote === '"' || quote === "'") {
    const end = text.indexOf(quote, 1)
    return end > 0 ? text.slice(1, end) : text.slice(1)
  }
  const comment = text.search(/\s#/)
  if (comment >= 0) text = text.slice(0, comment)
  return text.trim()
}

/** Splits at the commas that are not inside brackets, braces or quotes. */
function splitTop(text: string): string[] {
  const parts: string[] = []
  let depth = 0
  let quote = ""
  let current = ""
  for (const ch of text) {
    if (quote) {
      if (ch === quote) quote = ""
    } else if (ch === '"' || ch === "'") quote = ch
    else if (ch === "[" || ch === "{") depth++
    else if (ch === "]" || ch === "}") depth--
    if (ch === "," && depth === 0 && !quote) {
      parts.push(current)
      current = ""
    } else current += ch
  }
  if (current.trim()) parts.push(current)
  return parts
}

function flowList(text: string): string[] {
  const inner = text.trim().replace(/^\[/, "").replace(/\](?:\s*#.*)?$/, "")
  return splitTop(inner).map(unquote).filter((item) => item !== "")
}

/** `{ min: 1, max: 3 }` (or with `=`) as the pairs it holds. */
function flowTable(text: string, separator: ":" | "="): Record<string, string> {
  const out: Record<string, string> = {}
  for (const pair of splitTop(text.trim().replace(/^\{/, "").replace(/\}\s*(?:#.*)?$/, ""))) {
    const at = pair.indexOf(separator)
    if (at > 0) out[pair.slice(0, at).trim()] = unquote(pair.slice(at + 1))
  }
  return out
}

/** The rule a `var-types` entry writes: a list, a range, or a type name. */
function readRule(raw: string, separator: ":" | "="): VariableRule | undefined {
  const text = raw.trim()
  if (text.startsWith("[")) return { kind: "enum", options: flowList(text) }
  if (text.startsWith("{")) {
    const table = flowTable(text, separator)
    if ("min" in table || "max" in table) return { kind: "range", min: table.min, max: table.max }
    if (table.type) return { kind: "type", name: table.type }
    return undefined
  }
  const name = unquote(text)
  return name ? { kind: "type", name } : undefined
}

interface Entry {
  name: string
  /** What follows the key on its line. */
  rest: string
  /** The lines under it (more indented). */
  below: string[]
}

/** The entries of the YAML block `key:` in `lines`. */
function yamlBlock(lines: string[], key: string): Entry[] {
  const start = lines.findIndex((line) => new RegExp(`^${key}\\s*:\\s*(?:#.*)?$`).test(line))
  if (start < 0) return []
  const entries: Entry[] = []
  let base = -1
  for (const line of lines.slice(start + 1)) {
    if (line.trim() === "" || line.trim().startsWith("#")) continue
    const indent = line.length - line.trimStart().length
    if (indent === 0) break
    if (base < 0) base = indent
    const text = line.trim()
    if (indent <= base) {
      const entry = /^["']?([^"':]+?)["']?\s*:\s*(.*)$/.exec(text)
      if (entry) entries.push({ name: entry[1], rest: entry[2].trim(), below: [] })
    } else entries.at(-1)?.below.push(text)
  }
  return entries
}

function mergeSpecs(values: Map<string, VariableSpec>, rules: Map<string, VariableRule>): VariableSpec[] {
  const out: VariableSpec[] = [...values.values()].map((spec) => ({ ...spec, rule: rules.get(spec.name) }))
  for (const [name, rule] of rules) if (!values.has(name)) out.push({ name, rule })
  return out
}

/** The variables of a YAML front matter without its `---` lines: the values of `vars` with the rule of each from `var-types`. */
export function readYamlVariables(body: string): VariableSpec[] {
  const lines = body.split(/\r?\n/)
  const values = new Map<string, VariableSpec>()
  for (const entry of yamlBlock(lines, "vars")) {
    const spec: VariableSpec = { name: entry.name }
    if (entry.rest !== "" && !/^[[{|>&*!]/.test(entry.rest) && !entry.rest.startsWith("#")) {
      spec.value = unquote(entry.rest)
      spec.quoted = isQuoted(entry.rest)
    } else {
      spec.value = entry.rest || entry.below.join(" ")
      spec.block = true
    }
    values.set(entry.name, spec)
  }
  const rules = new Map<string, VariableRule>()
  for (const entry of yamlBlock(lines, "var-types")) {
    const rule = entry.rest !== "" ? readRule(entry.rest, ":") : entry.below.length && entry.below.every((line) => line.startsWith("- ")) ? ({ kind: "enum", options: entry.below.map((line) => unquote(line.slice(2))) } as VariableRule) : undefined
    if (rule) rules.set(entry.name, rule)
  }
  return mergeSpecs(values, rules)
}

/** The variables of config.toml: `[vars]` with the rule of each from `[var-types]`. */
export function readTomlVariables(text: string): VariableSpec[] {
  const values = new Map<string, VariableSpec>()
  const rules = new Map<string, VariableRule>()
  let table = ""
  for (const line of text.split(/\r?\n/)) {
    const header = /^\s*\[([^\]]+)\]\s*(?:#.*)?$/.exec(line)
    if (header) {
      table = header[1].trim()
      continue
    }
    const pair = /^\s*["']?([^"'=\s]+)["']?\s*=\s*(.*)$/.exec(line)
    if (!pair) continue
    if (table === "vars") {
      const raw = pair[2].trim()
      const complex = /^[[{]/.test(raw)
      values.set(pair[1], { name: pair[1], value: complex ? raw : unquote(raw), quoted: isQuoted(raw), block: complex || undefined })
    } else if (table === "var-types") {
      const rule = readRule(pair[2], "=")
      if (rule) rules.set(pair[1], rule)
    }
  }
  return mergeSpecs(values, rules)
}

/** The variables the front matter of a whole Markdown file defines. */
export function readVariables(text: string): VariableSpec[] {
  const match = FRONT_MATTER.exec(text)
  return match ? readYamlVariables(match[1]) : []
}

/** A value as it is written in the file: numbers and `true` / `false` bare (unless it was a quoted text), other text in quotes. */
export function valueLiteral(value: string, quoted: boolean, string: (text: string) => string): string {
  return !quoted && (isNumeric(value) || isBoolean(value)) ? value : string(value)
}

const optionScalar = (value: string, string: (text: string) => string): string => (isNumeric(value) || isBoolean(value) ? value : string(value))

/** A rule as one line: a list, `{ min, max }`, or a type name. `string` quotes a text for the format. */
export function ruleLiteral(rule: VariableRule, toml: boolean, string: (text: string) => string): string {
  if (rule.kind === "enum") return `[${rule.options.map((item) => optionScalar(item, string)).join(", ")}]`
  if (rule.kind === "type") return string(rule.name)
  const sep = toml ? " = " : ": "
  const parts: string[] = []
  if (rule.min !== undefined) parts.push(`min${sep}${rule.min}`)
  if (rule.max !== undefined) parts.push(`max${sep}${rule.max}`)
  return `{ ${parts.join(", ")} }`
}

/** An attribute value that chooses by a condition: it holds a `{{ ... }}`. */
export const isConditional = (value: string): boolean => value.includes("{{")

const word = (value: string): string => `'${value.replace(/'/g, "")}'`

/** A fixed value as a choice by a condition, `{{ if name { 'value' } else { 'value' } }}`, to be edited: both ways give the value it had. */
export function toConditional(value: string, name: string): string {
  return `{{ if ${name} { ${word(value)} } else { ${word(value)} } }}`
}

/** The first way of a choice by a condition (the value it gives when the condition holds), or the text as it is. */
export function fromConditional(value: string): string {
  const match = /^\s*\{\{\s*if\s+[^{]*\{\s*(?:'([^']*)'|"([^"]*)")\s*\}\s*else\b/.exec(value)
  if (!match) return value.includes("{{") ? "" : value
  return match[1] ?? match[2] ?? ""
}
