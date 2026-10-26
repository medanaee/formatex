import { completeFrontMatter, inFrontMatter } from "./configCompletion"
import { localized, type AttrSpec, type OptionKind, type Schema, type TagSpec } from "./schema"

/**
 * Autocomplete of the engine's markup, from its schema (`engine/tags.json`). Pure: text and a cursor in, suggestions out, so
 * it is tested without an editor; `completionSource.ts` adapts it to CodeMirror.
 *
 * What it completes:
 * - `<` + letters: tag names (the tags of the enclosing tag first; a `scoped` tag only inside its parent)
 * - `<tag ` + letters: attribute names not yet used
 * - `<tag attr="` / `{attr=`: the values of an enum / bool attribute, project files for a path attribute
 * - `</`: the tags that are still open
 * - `{` on a heading, table, list, equation or span line: the engine's `{...}` options
 * It stays silent in the front matter, in fenced code and in inline code.
 */

export type SuggestionKind = "tag" | "attribute" | "value" | "close" | "option"

export interface Suggestion {
  label: string
  kind: SuggestionKind
  detail?: string
  info?: string
  /** Text to insert. `${}` marks a place the cursor visits (CodeMirror snippet syntax). */
  template: string
  boost?: number
}

export interface Completions {
  /** Start of the text the suggestion replaces. */
  from: number
  options: Suggestion[]
}

export interface CompletionEnv {
  schema: Schema
  /** Language of descriptions: `en` or `fa`. */
  language: string
  /** Paths of the project's files, for `path` attributes. */
  files?: readonly string[]
}

const IMAGE_EXTENSION = /\.(png|jpe?g|gif|svg|webp|bmp)$/i

/** Replaces front matter, fenced code and inline code by spaces (same length), so tag scanning ignores them. */
export function maskCode(text: string): string {
  const blank = (match: string) => match.replace(/[^\n]/g, " ")
  let out = text.replace(/^---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?=\r?\n|$)/, blank)
  out = out.replace(/^[ \t]*(```|~~~)[^\n]*\n[\s\S]*?(?:\n[ \t]*\1[^\n]*(?=\n|$)|$)/gm, blank)
  out = out.replace(/`[^`\n]*`/g, blank)
  return out
}

/** Whether `pos` is in the front matter, in a fenced code block or in an inline code span. */
function inCode(text: string, pos: number): boolean {
  const before = text.slice(0, pos)
  const lineStart = before.lastIndexOf("\n") + 1
  const line = before.slice(lineStart)

  const front = /^---[ \t]*\r?\n/.exec(text)
  if (front && pos >= front[0].length) {
    const rest = text.slice(front[0].length)
    const close = /^---[ \t]*$/m.exec(rest)
    if (!close || front[0].length + close.index >= lineStart) return true
  }

  const fence = /^[ \t]*(```|~~~)/
  if (fence.test(line)) return true
  const fences = before.slice(0, lineStart).split("\n").filter((candidate) => fence.test(candidate))
  if (fences.length % 2 === 1) return true

  return (line.match(/`/g)?.length ?? 0) % 2 === 1
}

/** Whether `inside` (the text after a `<`) is a tag that has not been closed by a `>` yet. */
function isTagOpen(inside: string): boolean {
  let quote = ""
  for (const char of inside) {
    if (quote) {
      if (char === quote) quote = ""
    } else if (char === '"' || char === "'") quote = char
    else if (char === ">" || char === "<") return false
  }
  return true
}

interface OpenTag {
  name: string
}

/** The tags still open at `pos`, outermost first. */
export function openTags(text: string, pos: number, schema: Schema): OpenTag[] {
  const masked = maskCode(text.slice(0, pos))
  const stack: OpenTag[] = []
  const tag = /<(\/)?([A-Za-z][\w-]*)((?:"[^"]*"|'[^']*'|[^<>"'])*?)(\/)?>/g
  for (let match = tag.exec(masked); match; match = tag.exec(masked)) {
    const [, closing, name, , selfClosing] = match
    if (closing) {
      const index = stack.map((open) => open.name).lastIndexOf(name)
      if (index >= 0) stack.length = index
    } else if (!selfClosing && schema.tags[name]?.kind !== "void") {
      stack.push({ name })
    }
  }
  return stack
}

type AttrContext =
  | { state: "name"; from: number; partial: string; used: Set<string> }
  | { state: "value"; from: number; partial: string; attr: string; quote: string; used: Set<string> }

/**
 * Reads the attributes written so far (`a="x" b=y c`) and says what is being typed at the end: a name or a value.
 * `offset` is the position of `rest[0]` in the document.
 */
function readAttributes(rest: string, offset: number): AttrContext {
  const used = new Set<string>()
  let i = 0
  const skipSpace = () => {
    while (i < rest.length && /\s|\//.test(rest[i])) i++
  }
  for (;;) {
    skipSpace()
    if (i >= rest.length) return { state: "name", from: offset + rest.length, partial: "", used }
    const start = i
    // `#id` shorthand of option lines is a name of its own kind
    if (rest[i] === "#") {
      while (i < rest.length && !/\s/.test(rest[i])) i++
      used.add("id")
      continue
    }
    while (i < rest.length && !/[\s="'/>]/.test(rest[i])) i++
    const name = rest.slice(start, i)
    if (i >= rest.length) return { state: "name", from: offset + start, partial: name, used }
    if (rest[i] !== "=") {
      used.add(name)
      continue
    }
    i++ // =
    if (i >= rest.length) return { state: "value", from: offset + i, partial: "", attr: name, quote: "", used }
    const quote = rest[i] === '"' || rest[i] === "'" ? rest[i] : ""
    if (quote) {
      const close = rest.indexOf(quote, i + 1)
      if (close < 0) return { state: "value", from: offset + i + 1, partial: rest.slice(i + 1), attr: name, quote, used }
      i = close + 1
    } else {
      const valueStart = i
      while (i < rest.length && !/\s/.test(rest[i])) i++
      if (i >= rest.length) return { state: "value", from: offset + valueStart, partial: rest.slice(valueStart), attr: name, quote: "", used }
    }
    used.add(name)
  }
}

function attrDetail(spec: AttrSpec): string {
  const type = spec.type === "enum" && spec.values ? spec.values.slice(0, 3).join(" | ") + (spec.values.length > 3 ? " …" : "") : spec.type
  return spec.required ? `${type} *` : type
}

function attrSuggestions(attrs: Record<string, AttrSpec>, used: Set<string>, env: CompletionEnv, optionLine: boolean): Suggestion[] {
  return Object.entries(attrs)
    .filter(([name]) => !used.has(name))
    .map(([name, spec]) => {
      const shorthand = optionLine && spec.shorthand === "#"
      return {
        label: shorthand ? "#id" : name,
        kind: "attribute" as const,
        detail: attrDetail(spec),
        info: localized(spec.doc, env.language),
        template: shorthand ? "#${}" : optionLine ? `${name}=\${}` : `${name}="\${}"`,
        boost: spec.required ? 10 : 0,
      }
    })
}

function valueSuggestions(spec: AttrSpec, tag: string, quote: string, closed: boolean, env: CompletionEnv): Suggestion[] {
  const finish = (value: string) => value + (quote && !closed ? quote : "")
  const make = (value: string, detail?: string, boost = 0): Suggestion => ({ label: value, kind: "value", detail, template: finish(value), boost })
  if (spec.type === "enum" && spec.values) return spec.values.map((value) => make(value, value === spec.default ? "default" : undefined, value === spec.default ? 1 : 0))
  if (spec.type === "bool") return ["true", "false"].map((value) => make(value))
  if (spec.type === "path") {
    const imageLike = /img|picheader|fig/.test(tag)
    return (env.files ?? []).map((file) => make(file, undefined, imageLike && IMAGE_EXTENSION.test(file) ? 5 : 0))
  }
  return spec.default ? [make(spec.default, "default")] : []
}

function tagTemplate(name: string, spec: TagSpec, closed: boolean): string {
  const required = Object.entries(spec.attrs)
    .filter(([, attr]) => attr.required)
    .map(([key]) => ` ${key}="\${}"`)
    .join("")
  if (closed) return name + required
  if (spec.kind === "void") return `${name}${required}>`
  return `${name}${required}>\${}</${name}>`
}

/**
 * Whether a tag takes nothing but its own child tags: it lists `children` and every one of them is `scoped` (only meaningful
 * inside it), like <steps> with <step> or <compare> with <pros> and <cons>. Inside such a tag only those children are offered.
 * A tag whose children are ordinary tags too (<fig>, <exercise>) still takes any content.
 */
export function takesOnlyChildren(name: string, schema: Schema): boolean {
  const children = schema.tags[name]?.children ?? []
  return children.length > 0 && children.every((child) => schema.tags[child]?.scoped)
}

function tagSuggestions(stack: OpenTag[], closed: boolean, env: CompletionEnv): Suggestion[] {
  const parent = stack.at(-1)?.name
  const parentChildren = new Set(parent ? (env.schema.tags[parent]?.children ?? []) : [])
  const exclusive = parent !== undefined && takesOnlyChildren(parent, env.schema)
  return Object.entries(env.schema.tags)
    .filter(([name, spec]) => {
      // Inside a tag that takes only its children: those, and nothing else
      if (exclusive) return parentChildren.has(name) || (spec.parents?.includes(parent) ?? false)
      // A tag that only makes sense inside another: only there
      if (spec.scoped) return parent !== undefined && ((spec.parents?.includes(parent) ?? false) || parentChildren.has(name))
      return true
    })
    .map(([name, spec]) => ({
      label: name,
      kind: "tag" as const,
      detail: spec.kind,
      info: localized(spec.description, env.language),
      template: tagTemplate(name, spec, closed),
      boost: parentChildren.has(name) ? 20 : spec.scoped ? 15 : 0,
    }))
}

function optionKindAt(text: string, lineStart: number, braceAt: number): OptionKind | null {
  const line = text.slice(lineStart, text.indexOf("\n", lineStart) < 0 ? text.length : text.indexOf("\n", lineStart))
  const before = text.slice(lineStart, braceAt).trimEnd()
  if (/^\s*#{1,6}\s/.test(line)) return "heading"
  if (before.endsWith("$$")) return "equation"
  if (before.endsWith("]")) return "span"
  if (before !== "") return null
  // A `{...}` line of its own describes what is below it (or the equation above it)
  const lines = text.split("\n")
  const index = text.slice(0, lineStart).split("\n").length - 1
  const next = lines.slice(index + 1).find((candidate) => candidate.trim() !== "")?.trimStart() ?? ""
  if (next.startsWith("|")) return "table"
  if (/^([-*+]|\d+[.)])\s/.test(next)) return "list"
  const previous = lines.slice(0, index).reverse().find((candidate) => candidate.trim() !== "")?.trimEnd() ?? ""
  if (previous.endsWith("$$")) return "equation"
  return null
}

/** Suggestions for the text before `pos`, or `null` when nothing applies there. */
export function complete(text: string, pos: number, env: CompletionEnv): Completions | null {
  // The YAML block at the top of the file has its own settings, from the config schema
  if (inFrontMatter(text, pos)) return completeFrontMatter(text, pos, env)
  if (inCode(text, pos)) return null
  const nextChar = text[pos] ?? ""

  // 1. Inside a tag: `<name`, `<name attr`, `<name attr="va`, `</na`
  const lt = text.lastIndexOf("<", pos - 1)
  if (lt >= 0 && lt < pos) {
    const inside = text.slice(lt + 1, pos)
    const stillOpen = isTagOpen(inside)
    if (stillOpen) {
      if (inside.startsWith("/")) {
        const partial = inside.slice(1)
        if (/^[\w-]*$/.test(partial)) {
          const open = openTags(text, lt, env.schema)
          const options = [...open].reverse().map((tag, index): Suggestion => ({
            label: tag.name,
            kind: "close",
            template: nextChar === ">" ? tag.name : `${tag.name}>`,
            boost: 100 - index,
          }))
          return options.length ? { from: lt + 2, options } : null
        }
        return null
      }
      const name = /^[A-Za-z][\w-]*/.exec(inside)?.[0] ?? ""
      if (name.length === inside.length) {
        const open = openTags(text, lt, env.schema)
        return { from: lt + 1, options: tagSuggestions(open, nextChar === ">", env) }
      }
      const spec = env.schema.tags[name]
      if (name && spec && /^\s/.test(inside.slice(name.length))) {
        const context = readAttributes(inside.slice(name.length), lt + 1 + name.length)
        if (context.state === "name") return { from: context.from, options: attrSuggestions(spec.attrs, context.used, env, false) }
        const attr = spec.attrs[context.attr]
        if (!attr) return null
        const closed = context.quote !== "" && nextChar === context.quote
        const options = valueSuggestions(attr, name, context.quote, closed, env)
        return options.length ? { from: context.from, options } : null
      }
      return null
    }
  }

  // 2. Inside the `{...}` of an option line
  const lineStart = text.lastIndexOf("\n", pos - 1) + 1
  const line = text.slice(lineStart, pos)
  const brace = line.lastIndexOf("{")
  if (brace >= 0 && !line.includes("}", brace)) {
    const kind = optionKindAt(text, lineStart, lineStart + brace)
    const spec = kind ? env.schema.options[kind] : undefined
    if (spec) {
      const context = readAttributes(line.slice(brace + 1), lineStart + brace + 1)
      if (context.state === "name") return { from: context.from, options: attrSuggestions(spec.attrs, context.used, env, true) }
      const attr = spec.attrs[context.attr]
      if (!attr) return null
      const closed = context.quote !== "" && nextChar === context.quote
      const options = valueSuggestions(attr, "", context.quote, closed, env)
      return options.length ? { from: context.from, options } : null
    }
  }
  return null
}

/**
 * The text of a tag dropped or inserted from the palette. Block tags get their own lines (`<alert>` / content / `</alert>`); the
 * required attributes are filled in as places to type. `${}` marks where the cursor goes (CodeMirror snippet syntax).
 */
export function paletteTemplate(name: string, spec: TagSpec): string {
  const required = Object.entries(spec.attrs)
    .filter(([, attr]) => attr.required)
    .map(([key]) => ` ${key}="\${}"`)
    .join("")
  if (spec.kind === "void") return `<${name}${required}>`
  if (spec.kind === "inline") return `<${name}${required}>\${}</${name}>`
  return `<${name}${required}>\n\${}\n</${name}>`
}
