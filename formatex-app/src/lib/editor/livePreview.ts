import { ensureSyntaxTree } from "@codemirror/language"
import { Facet, StateField, type EditorState, type Range } from "@codemirror/state"
import { Decoration, EditorView, WidgetType, type DecorationSet } from "@codemirror/view"
import katex from "katex"
import { maskCode } from "./completion"
import { parseTable, type ParsedTable } from "./markdownTable"
import type { Schema } from "./schema"
import { gearSvg, tagIconSvg } from "./tagIcons"
import { expandBare, parseOpenTag, parseOptions, type Attrs } from "./tagSyntax"

/**
 * The visual editor: Obsidian-style *live preview*. The file stays plain text (Markdown with the engine's tags); this layer only
 * decorates it. A line you are not on is drawn like the result (headings sized, `**bold**` without the stars, math typeset by
 * KaTeX, tables as tables, tags as chips and tinted blocks); the line the cursor is on shows its source. A gear on a tag, a
 * heading or a table opens the settings popover (`OptionsPopover`), built from the engine's schema.
 */

export type ConfigureRequest =
  | {
      kind: "tag"
      name: string
      from: number
      to: number
      attrs: Attrs
      selfClosing: boolean
      /** The tag is not written yet: the range of text (a fenced code block) its opening and closing tags go around. */
      wrap?: { from: number; to: number }
      anchor: DOMRect
    }
  | {
      kind: "option"
      option: "heading" | "table" | "list"
      /** The `{...}` text (a heading) or line (a table, a list) to replace; with `missing`, where to insert one. */
      from: number
      to: number
      missing: boolean
      attrs: Attrs
      anchor: DOMRect
    }

/** The schema of the tags, read when the decorations are built (so a new component's tags are recognized). */
export const liveSchema = Facet.define<() => Schema, () => Schema>({ combine: (values) => values[0] ?? (() => ({ tags: {}, options: {} }) as unknown as Schema) })
/** Called when a gear is clicked. */
export const liveConfigure = Facet.define<(request: ConfigureRequest) => void, (request: ConfigureRequest) => void>({ combine: (values) => values[0] ?? (() => {}) })

// ----- widgets -----

function button(view: EditorView, label: string, onClick: (rect: DOMRect) => void): HTMLButtonElement {
  const el = document.createElement("button")
  el.type = "button"
  el.className = "cm-lp-gear"
  el.setAttribute("aria-label", label)
  el.innerHTML = gearSvg(13)
  // The editor keeps its selection: the button only opens the popover
  el.addEventListener("mousedown", (event) => event.preventDefault())
  el.addEventListener("click", (event) => {
    event.preventDefault()
    event.stopPropagation()
    onClick(el.getBoundingClientRect())
  })
  void view
  return el
}

const placeCursor = (view: EditorView, dom: HTMLElement) => {
  view.dispatch({ selection: { anchor: view.posAtDOM(dom) } })
  view.focus()
}

class ChipWidget extends WidgetType {
    readonly name: string
  readonly raw: string
  readonly attrs: Attrs
  readonly selfClosing: boolean
  constructor(name: string, raw: string, attrs: Attrs, selfClosing: boolean) {
    super()
    this.name = name
    this.raw = raw
    this.attrs = attrs
    this.selfClosing = selfClosing
  }
  eq(other: ChipWidget) {
    return other.raw === this.raw && other.name === this.name
  }
  toDOM(view: EditorView) {
    const el = document.createElement("span")
    el.className = "cm-lp-chip"
    const summary = this.attrs
      .slice(0, 2)
      .map(([key, value]) => (key === "type" ? value : `${key}=${value}`))
      .join(" · ")
    el.innerHTML = `${tagIconSvg(this.name, 13)}<span class="cm-lp-chip-name"></span><span class="cm-lp-chip-attrs"></span>`
    el.querySelector(".cm-lp-chip-name")!.textContent = this.name
    el.querySelector(".cm-lp-chip-attrs")!.textContent = summary
    el.addEventListener("click", () => placeCursor(view, el))
    el.append(
      button(view, this.name, (anchor) => {
        const from = view.posAtDOM(el)
        view.state.facet(liveConfigure)({ kind: "tag", name: this.name, from, to: from + this.raw.length, attrs: this.attrs, selfClosing: this.selfClosing, anchor })
      })
    )
    return el
  }
  ignoreEvent() {
    return true
  }
}

/**
 * The `{...}` of a heading, or the `{...}` line above a list, drawn as a chip with a gear; when there is none, just a gear (at the
 * end of the heading's line, or of the list's first line) that shows on hover.
 */
class OptionsWidget extends WidgetType {
  readonly option: "heading" | "list"
  readonly raw: string
  readonly attrs: Attrs
  constructor(option: "heading" | "list", raw: string, attrs: Attrs) {
    super()
    this.option = option
    this.raw = raw
    this.attrs = attrs
  }
  eq(other: OptionsWidget) {
    return other.raw === this.raw && other.option === this.option
  }
  toDOM(view: EditorView) {
    const el = document.createElement("span")
    el.className = this.raw ? "cm-lp-opts" : "cm-lp-opts cm-lp-opts-empty"
    if (this.raw) {
      const text = document.createElement("span")
      text.className = "cm-lp-chip-attrs"
      text.textContent = this.attrs.map(([key, value]) => (key === "id" ? `#${value}` : key)).join(" ")
      el.append(text)
    }
    el.append(
      button(view, this.option, (anchor) => {
        const at = view.posAtDOM(el)
        // A list without options has its gear on its first line; the new `{...}` line goes above that line
        const from = this.option === "list" && !this.raw ? view.state.doc.lineAt(at).from : at
        view.state.facet(liveConfigure)({ kind: "option", option: this.option, from, to: from + this.raw.length, missing: !this.raw, attrs: this.attrs, anchor })
      })
    )
    return el
  }
  ignoreEvent() {
    return true
  }
}

/** A gear at the end of the first line of a fenced code block that has no <code> tag around it. */
class CodeOptionsWidget extends WidgetType {
  readonly length: number
  constructor(length: number) {
    super()
    this.length = length
  }
  eq(other: CodeOptionsWidget) {
    return other.length === this.length
  }
  toDOM(view: EditorView) {
    const el = document.createElement("span")
    el.className = "cm-lp-opts cm-lp-opts-empty"
    el.append(
      button(view, "code", (anchor) => {
        const from = view.state.doc.lineAt(view.posAtDOM(el)).from
        view.state.facet(liveConfigure)({ kind: "tag", name: "code", from, to: from, attrs: [], selfClosing: false, wrap: { from, to: from + this.length }, anchor })
      })
    )
    return el
  }
  ignoreEvent() {
    return true
  }
}

const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

/** Bold, italic, code and math inside a table cell. */
function cellHtml(text: string): string {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\$([^$\n]+)\$/g, (_, tex: string) => {
      try {
        return katex.renderToString(tex.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"), { throwOnError: false })
      } catch {
        return `$${tex}$`
      }
    })
}

class TableWidget extends WidgetType {
    readonly table: ParsedTable
  readonly source: string
  readonly optionsLength: number
  readonly attrs: Attrs
  constructor(table: ParsedTable, source: string, optionsLength: number, attrs: Attrs) {
    super()
    this.table = table
    this.source = source
    this.optionsLength = optionsLength
    this.attrs = attrs
  }
  eq(other: TableWidget) {
    return other.source === this.source
  }
  toDOM(view: EditorView) {
    const wrap = document.createElement("div")
    wrap.className = "cm-lp-table"
    const table = document.createElement("table")
    const row = (cells: string[], tag: "th" | "td") => {
      const tr = document.createElement("tr")
      this.table.header.forEach((_, index) => {
        const cell = document.createElement(tag)
        cell.innerHTML = cellHtml(cells[index] ?? "")
        const align = this.table.align[index]
        if (align) cell.style.textAlign = align
        tr.append(cell)
      })
      return tr
    }
    const head = document.createElement("thead")
    head.append(row(this.table.header, "th"))
    const body = document.createElement("tbody")
    this.table.rows.forEach((cells) => body.append(row(cells, "td")))
    table.append(head, body)
    wrap.append(table)
    // A click on the table puts the cursor in it, which shows the source to edit
    wrap.addEventListener("click", () => placeCursor(view, wrap))
    const gear = button(view, "table", (anchor) => {
      const from = view.posAtDOM(wrap)
      view.state.facet(liveConfigure)({
        kind: "option",
        option: "table",
        from,
        to: from + this.optionsLength,
        missing: this.optionsLength === 0,
        attrs: this.attrs,
        anchor,
      })
    })
    gear.classList.add("cm-lp-table-gear")
    wrap.append(gear)
    return wrap
  }
  ignoreEvent() {
    return true
  }
}

class MathWidget extends WidgetType {
    readonly tex: string
  readonly display: boolean
  readonly raw: string
  constructor(tex: string, display: boolean, raw: string) {
    super()
    this.tex = tex
    this.display = display
    this.raw = raw
  }
  eq(other: MathWidget) {
    return other.raw === this.raw
  }
  toDOM(view: EditorView) {
    const el = document.createElement(this.display ? "div" : "span")
    el.className = this.display ? "cm-lp-math cm-lp-math-block" : "cm-lp-math"
    try {
      el.innerHTML = katex.renderToString(this.tex, { displayMode: this.display, throwOnError: false })
    } catch {
      el.textContent = this.raw
    }
    el.addEventListener("click", () => placeCursor(view, el))
    return el
  }
  ignoreEvent() {
    return true
  }
}

class BulletWidget extends WidgetType {
  toDOM() {
    const el = document.createElement("span")
    el.className = "cm-lp-bullet"
    el.textContent = "•"
    return el
  }
  eq() {
    return true
  }
}

// ----- building the decorations -----

const hide = Decoration.replace({})
const TYPE_CLASSES = new Set(["note", "info", "tip", "success", "warning", "danger", "important"])

function build(state: EditorState, getSchema: () => Schema): DecorationSet {
  try {
    return buildUnsafe(state, getSchema())
  } catch (error) {
    // A decoration problem must never make the text unreadable or uneditable
    console.error("[formatex] live preview failed", error)
    return Decoration.none
  }
}

function buildUnsafe(state: EditorState, schema: Schema): DecorationSet {
  const doc = state.doc
  const text = doc.toString()
  const masked = maskCode(text)
  const out: Range<Decoration>[] = []
  const taken: [number, number][] = []
  const overlaps = (from: number, to: number) => taken.some(([a, b]) => from < b && to > a)
  const take = (from: number, to: number) => taken.push([from, to])

  const touches = (from: number, to: number) => state.selection.ranges.some((range) => range.from <= to && range.to >= from)
  const touchedLines = new Set<number>()
  for (const range of state.selection.ranges) for (let n = doc.lineAt(range.from).number; n <= doc.lineAt(range.to).number; n++) touchedLines.add(n)
  const lineTouched = (pos: number) => touchedLines.has(doc.lineAt(pos).number)

  // Front matter: muted source, never interpreted
  const front = /^---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?=\r?\n|$)/.exec(text)
  const frontEnd = front ? front[0].length : 0
  if (front) {
    for (let n = 1; n <= doc.lineAt(frontEnd).number; n++) out.push(Decoration.line({ class: "cm-lp-front" }).range(doc.line(n).from))
    take(0, frontEnd)
  }

  // Tables
  const tree = ensureSyntaxTree(state, doc.length, 200)
  tree?.iterate({
    enter(node) {
      if (node.name !== "Table" || node.from < frontEnd) return
      const lines = text.slice(node.from, node.to).split("\n")
      const parsed = parseTable(lines)
      if (!parsed) return
      // The `{...}` line above the table (a blank line between is fine)
      let start = node.from
      let optionsLength = 0
      let attrs: Attrs = []
      for (let n = doc.lineAt(node.from).number - 1; n >= 1; n--) {
        const line = doc.line(n)
        if (line.text.trim() === "") continue
        const found = /^\s*\{([^{}]*)\}\s*$/.exec(line.text)
        if (found) {
          start = line.from
          optionsLength = line.length
          attrs = parseOptions(found[1])
        }
        break
      }
      if (touches(start, node.to)) return
      out.push(Decoration.replace({ widget: new TableWidget(parsed, text.slice(start, node.to), optionsLength, attrs), block: true }).range(start, node.to))
      take(start, node.to)
    },
  })

  // Tags: chips for the opening tag, tinted blocks for what is inside
  const tagPattern = /<(\/)?([A-Za-z][\w-]*)((?:"[^"]*"|'[^']*'|[^<>"'])*?)(\/)?>/g
  interface Open { name: string; from: number; to: number; line: number; type: string }
  const stack: Open[] = []
  const depthByLine = new Map<number, { depth: number; type: string }>()
  for (let match = tagPattern.exec(masked); match; match = tagPattern.exec(masked)) {
    const [raw, closing, name, , selfClose] = match
    const spec = schema.tags[name]
    if (!spec) continue
    const from = match.index
    const to = from + raw.length
    if (overlaps(from, to)) continue
    if (closing) {
      const index = stack.map((open) => open.name).lastIndexOf(name)
      if (index < 0) continue
      const open = stack[index]
      stack.length = index
      const closeLine = doc.lineAt(from).number
      if (spec.kind !== "inline" && closeLine > open.line) {
        for (let n = open.line; n <= closeLine; n++) {
          const previous = depthByLine.get(n)
          depthByLine.set(n, { depth: (previous?.depth ?? 0) + 1, type: open.type || previous?.type || "" })
        }
      }
      if (!touches(from, to)) {
        out.push(hide.range(from, to))
        take(from, to)
      }
      continue
    }
    const parsed = parseOpenTag(raw)
    if (!parsed) continue
    if (!selfClose && spec.kind !== "void") stack.push({ name, from, to, line: doc.lineAt(from).number, type: parsed.attrs.find(([key]) => key === "type")?.[1] ?? "" })
    if (!touches(from, to)) {
      out.push(Decoration.replace({ widget: new ChipWidget(name, raw, expandBare(parsed.attrs, spec.attrs), parsed.selfClosing) }).range(from, to))
      take(from, to)
    }
  }
  for (const [number, { depth, type }] of depthByLine) {
    const line = doc.line(number)
    const cls = `cm-lp-tagblock${TYPE_CLASSES.has(type) ? ` cm-lp-ty-${type}` : ""}`
    out.push(Decoration.line({ class: cls, attributes: { style: `--lp-depth:${depth}` } }).range(line.from))
  }

  // Math, typeset with KaTeX (the engine reads the same LaTeX)
  const mathRanges: [number, number][] = []
  for (const match of masked.matchAll(/\$\$([\s\S]+?)\$\$/g)) {
    const from = match.index
    const to = from + match[0].length
    mathRanges.push([from, to])
    if (overlaps(from, to) || touches(from, to)) continue
    const lineStart = doc.lineAt(from).from
    const lineEnd = doc.lineAt(to).to
    const alone = text.slice(lineStart, from).trim() === "" && text.slice(to, lineEnd).trim() === ""
    out.push(Decoration.replace({ widget: new MathWidget(match[1].trim(), true, match[0]), block: alone }).range(alone ? lineStart : from, alone ? lineEnd : to))
    take(alone ? lineStart : from, alone ? lineEnd : to)
  }
  for (const match of masked.matchAll(/(?<![\\$])\$(?![\s$])([^$\n]+?)(?<![\s\\])\$(?!\$)/g)) {
    const from = match.index
    const to = from + match[0].length
    if (mathRanges.some(([a, b]) => from >= a && to <= b) || overlaps(from, to) || touches(from, to)) continue
    out.push(Decoration.replace({ widget: new MathWidget(match[1], false, match[0]) }).range(from, to))
    take(from, to)
  }

  // Markdown: headings, emphasis, links, lists, quotes, code
  tree?.iterate({
    enter(node) {
      const { name, from, to } = node
      // Skip what lies inside something already drawn (front matter, a table, a chip); descend through what merely contains it
      if (taken.some(([x, y]) => from >= x && to <= y)) return false
      const heading = /^ATXHeading([1-6])$/.exec(name)
      if (heading) {
        const line = doc.lineAt(from)
        out.push(Decoration.line({ class: `cm-lp-h cm-lp-h${heading[1]}` }).range(line.from))
        if (!lineTouched(from)) {
          const mark = node.node.getChild("HeaderMark")
          if (mark && !overlaps(mark.from, mark.to + 1)) out.push(hide.range(mark.from, Math.min(mark.to + 1, line.to)))
          // `{#id fill=true}` at the end of the line: a settings chip; with none, a gear on hover
          const options = /(\s*)(\{[^{}]*\})\s*$/.exec(line.text)
          const closingMarks = line.text.slice(mark ? mark.to - line.from : 0)
          if (options && closingMarks.includes("{")) {
            const start = line.from + options.index
            out.push(Decoration.replace({ widget: new OptionsWidget("heading", options[0], parseOptions(options[2].slice(1, -1))) }).range(start, line.to))
          } else {
            out.push(Decoration.widget({ widget: new OptionsWidget("heading", "", []), side: 1 }).range(line.to))
          }
        }
        return
      }
      const mark = (cls: string, childName: string) => {
        out.push(Decoration.mark({ class: cls }).range(from, to))
        if (!touches(from, to)) for (const child of node.node.getChildren(childName)) out.push(hide.range(child.from, child.to))
      }
      if (name === "StrongEmphasis") mark("cm-lp-strong", "EmphasisMark")
      else if (name === "Emphasis") mark("cm-lp-em", "EmphasisMark")
      else if (name === "Strikethrough") mark("cm-lp-strike", "StrikethroughMark")
      else if (name === "InlineCode") mark("cm-lp-code", "CodeMark")
      else if (name === "Link") {
        const marks = node.node.getChildren("LinkMark")
        if (marks.length >= 2) {
          out.push(Decoration.mark({ class: "cm-lp-link" }).range(marks[0].to, marks[1].from))
          if (!touches(from, to)) {
            out.push(hide.range(marks[0].from, marks[0].to))
            out.push(hide.range(marks[1].from, to))
          }
        }
      } else if (name === "ListMark" && /^[-*+]$/.test(text.slice(from, to)) && !lineTouched(from)) {
        out.push(Decoration.replace({ widget: new BulletWidget() }).range(from, to))
      } else if (name === "Blockquote") {
        for (let n = doc.lineAt(from).number; n <= doc.lineAt(to).number; n++) out.push(Decoration.line({ class: "cm-lp-quote" }).range(doc.line(n).from))
      } else if (name === "QuoteMark" && !lineTouched(from)) {
        out.push(hide.range(from, Math.min(to + 1, doc.lineAt(from).to)))
      } else if (name === "FencedCode") {
        for (let n = doc.lineAt(from).number; n <= doc.lineAt(to).number; n++) out.push(Decoration.line({ class: "cm-lp-codeblock" }).range(doc.line(n).from))
        // Settings belong to a <code> tag: a fence already inside one has its chip; any other can be wrapped by the gear
        const first = doc.lineAt(from)
        const above = first.number > 1 ? doc.line(first.number - 1).text : ""
        if (!/<code[^>]*>\s*$/.test(above)) out.push(Decoration.widget({ widget: new CodeOptionsWidget(to - from), side: 1 }).range(first.to))
        return false
      } else if ((name === "BulletList" || name === "OrderedList") && node.node.parent?.name === "Document") {
        // The `{...}` line directly above the list, as a chip; without one, a gear on the first line
        const first = doc.lineAt(from)
        const above = first.number > 1 ? doc.line(first.number - 1) : null
        const found = above ? /^\s*\{([^{}]*)\}\s*$/.exec(above.text) : null
        if (above && found) {
          if (!lineTouched(above.from) && !overlaps(above.from, above.to)) out.push(Decoration.replace({ widget: new OptionsWidget("list", above.text, parseOptions(found[1])) }).range(above.from, above.to))
        } else if (!overlaps(first.to, first.to)) {
          out.push(Decoration.widget({ widget: new OptionsWidget("list", "", []), side: 1 }).range(first.to))
        }
      }
    },
  })

  return Decoration.set(out, true)
}

/** The live preview as a CodeMirror extension; `getSchema` and `onConfigure` are read whenever they are needed. */
export function livePreview(getSchema: () => Schema, onConfigure: (request: ConfigureRequest) => void) {
  const field = StateField.define<DecorationSet>({
    create: (state) => build(state, getSchema),
    update: (value, transaction) => (transaction.docChanged || transaction.selection || transaction.reconfigured ? build(transaction.state, getSchema) : value),
    provide: (f) => EditorView.decorations.from(f),
  })
  return [liveSchema.of(getSchema), liveConfigure.of(onConfigure), field, liveTheme]
}

const liveTheme = EditorView.theme({
  ".cm-lp-front": { opacity: "0.55", fontSize: "0.9em" },
  ".cm-lp-h": { fontWeight: "700", lineHeight: "1.4" },
  ".cm-lp-h1": { fontSize: "1.7em" },
  ".cm-lp-h2": { fontSize: "1.45em" },
  ".cm-lp-h3": { fontSize: "1.25em" },
  ".cm-lp-h4, .cm-lp-h5, .cm-lp-h6": { fontSize: "1.1em" },
  ".cm-lp-strong": { fontWeight: "700" },
  ".cm-lp-em": { fontStyle: "italic" },
  ".cm-lp-strike": { textDecoration: "line-through" },
  ".cm-lp-code": { fontFamily: "ui-monospace, Menlo, Consolas, monospace", backgroundColor: "var(--muted)", borderRadius: "4px", padding: "0 3px" },
  ".cm-lp-link": { color: "var(--syntax-link)", textDecoration: "underline" },
  ".cm-lp-bullet": { color: "var(--muted-foreground)", paddingInlineEnd: "2px" },
  ".cm-lp-quote": { borderInlineStart: "3px solid var(--border)", color: "var(--muted-foreground)", paddingInlineStart: "10px" },
  ".cm-lp-codeblock": { backgroundColor: "color-mix(in oklab, var(--muted) 60%, transparent)", fontSize: "0.92em" },

  ".cm-lp-tagblock": {
    borderInlineStart: "3px solid var(--border)",
    backgroundColor: "color-mix(in oklab, var(--muted) 45%, transparent)",
    paddingInlineStart: "calc(var(--lp-depth, 1) * 10px) !important",
  },
  ".cm-lp-ty-note, .cm-lp-ty-important": { borderInlineStartColor: "var(--syntax-tag)", backgroundColor: "color-mix(in oklab, var(--syntax-tag) 10%, transparent)" },
  ".cm-lp-ty-info": { borderInlineStartColor: "var(--syntax-link)", backgroundColor: "color-mix(in oklab, var(--syntax-link) 10%, transparent)" },
  ".cm-lp-ty-tip, .cm-lp-ty-success": { borderInlineStartColor: "var(--syntax-string)", backgroundColor: "color-mix(in oklab, var(--syntax-string) 10%, transparent)" },
  ".cm-lp-ty-warning": { borderInlineStartColor: "var(--syntax-number)", backgroundColor: "color-mix(in oklab, var(--syntax-number) 12%, transparent)" },
  ".cm-lp-ty-danger": { borderInlineStartColor: "var(--destructive)", backgroundColor: "color-mix(in oklab, var(--destructive) 10%, transparent)" },

  ".cm-lp-chip": {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "0 4px 0 6px",
    borderRadius: "6px",
    border: "1px solid var(--border)",
    backgroundColor: "var(--card)",
    fontSize: "0.85em",
    lineHeight: "1.6",
    cursor: "text",
    verticalAlign: "baseline",
  },
  ".cm-lp-chip svg": { color: "var(--syntax-tag)", flexShrink: "0" },
  ".cm-lp-chip-name": { fontWeight: "600" },
  ".cm-lp-chip-attrs": { color: "var(--muted-foreground)", fontSize: "0.92em" },
  ".cm-lp-gear": {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "20px",
    height: "20px",
    border: "none",
    borderRadius: "5px",
    background: "transparent",
    color: "var(--muted-foreground)",
    cursor: "pointer",
  },
  ".cm-lp-gear:hover": { backgroundColor: "var(--accent)", color: "var(--foreground)" },
  ".cm-lp-opts": { display: "inline-flex", alignItems: "center", gap: "2px", marginInlineStart: "6px", verticalAlign: "middle" },
  ".cm-lp-opts-empty": { opacity: "0" },
  ".cm-line:hover .cm-lp-opts-empty": { opacity: "1" },

  ".cm-lp-table": { position: "relative", margin: "6px 12px", overflowX: "auto", cursor: "text" },
  ".cm-lp-table table": { borderCollapse: "collapse", width: "100%", fontSize: "0.95em" },
  ".cm-lp-table th, .cm-lp-table td": { border: "1px solid var(--border)", padding: "4px 8px" },
  ".cm-lp-table th": { backgroundColor: "var(--muted)", fontWeight: "600" },
  ".cm-lp-table-gear": { position: "absolute", top: "2px", insetInlineEnd: "2px", backgroundColor: "var(--card)", border: "1px solid var(--border)", opacity: "0" },
  ".cm-lp-table:hover .cm-lp-table-gear": { opacity: "1" },

  ".cm-lp-math": { cursor: "text" },
  ".cm-lp-math-block": { textAlign: "center", padding: "6px 0" },
})
