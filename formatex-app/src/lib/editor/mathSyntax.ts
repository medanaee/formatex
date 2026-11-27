import { RangeSetBuilder, type Extension } from "@codemirror/state"
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view"
import { mathRegions, type MathKind, type MathRegion } from "./mathRegions"
import { TYPST_FUNCTIONS, TYPST_SYMBOLS } from "./typstSymbols"

/**
 * Syntax color inside `$` / `$$` and `%` / `%%`. The line under the cursor keeps this color; live preview
 * draws the typeset formula only on the other lines.
 */

const SYMBOLS = new Set(TYPST_SYMBOLS.map(([name]) => name))
const FUNCTIONS = new Set<string>(TYPST_FUNCTIONS)

const delimMark = Decoration.mark({ class: "cm-math-delim" })
const cmdMark = Decoration.mark({ class: "cm-math-cmd" })
const fnMark = Decoration.mark({ class: "cm-math-fn" })
const symMark = Decoration.mark({ class: "cm-math-sym" })
const varMark = Decoration.mark({ class: "cm-math-var" })
const numMark = Decoration.mark({ class: "cm-math-num" })
const strMark = Decoration.mark({ class: "cm-math-str" })
const opMark = Decoration.mark({ class: "cm-math-op" })
const commentMark = Decoration.mark({ class: "cm-math-comment" })

const MARK = {
  "cm-math-delim": delimMark,
  "cm-math-cmd": cmdMark,
  "cm-math-fn": fnMark,
  "cm-math-sym": symMark,
  "cm-math-var": varMark,
  "cm-math-num": numMark,
  "cm-math-str": strMark,
  "cm-math-op": opMark,
  "cm-math-comment": commentMark,
} as const

export type MathClass = keyof typeof MARK

export interface MathMark {
  from: number
  to: number
  cls: MathClass
}

const OPS = new Set("+-*=<>!/|^_,&;:~")

function identClass(text: string, from: number, to: number, kind: MathKind): MathClass {
  const name = text.slice(from, to)
  if (kind === "latex") return "cm-math-var"
  if (text[to] === "(" || FUNCTIONS.has(name)) return "cm-math-fn"
  if (name.includes(".") || SYMBOLS.has(name)) return "cm-math-sym"
  return "cm-math-var"
}

function tokenize(text: string, region: MathRegion, out: MathMark[]) {
  const push = (from: number, to: number, cls: MathClass) => {
    if (to > from) out.push({ from, to, cls })
  }
  push(region.from, region.innerFrom, "cm-math-delim")
  if (region.closed) push(region.innerTo, region.to, "cm-math-delim")
  const end = region.innerTo
  let i = region.innerFrom
  while (i < end) {
    const char = text[i]
    if (char === " " || char === "\n" || char === "\t" || char === "\r") {
      i++
      continue
    }
    if (region.kind === "latex" && char === "%") {
      const line = text.indexOf("\n", i)
      const stop = line < 0 || line > end ? end : line
      push(i, stop, "cm-math-comment")
      i = stop
      continue
    }
    if (region.kind === "typst" && char === "/" && text[i + 1] === "/") {
      const line = text.indexOf("\n", i)
      const stop = line < 0 || line > end ? end : line
      push(i, stop, "cm-math-comment")
      i = stop
      continue
    }
    if (char === '"' || char === "'") {
      let j = i + 1
      while (j < end && text[j] !== char && text[j] !== "\n") j += text[j] === "\\" ? 2 : 1
      if (j < end && text[j] === char) j++
      push(i, j, "cm-math-str")
      i = j
      continue
    }
    if (region.kind === "latex" && char === "\\") {
      let j = i + 1
      if (/[A-Za-z]/.test(text[j] ?? "")) while (j < end && /[A-Za-z]/.test(text[j])) j++
      else if (j < end) j++
      push(i, j, "cm-math-cmd")
      i = j
      continue
    }
    if (char >= "0" && char <= "9") {
      let j = i + 1
      while (j < end && /[0-9.]/.test(text[j])) j++
      push(i, j, "cm-math-num")
      i = j
      continue
    }
    if (/[A-Za-z]/.test(char)) {
      let j = i + 1
      while (j < end && /[A-Za-z0-9_]/.test(text[j])) j++
      if (region.kind === "typst") {
        while (text[j] === "." && /[A-Za-z]/.test(text[j + 1] ?? "")) {
          j++
          while (j < end && /[A-Za-z0-9_]/.test(text[j])) j++
        }
      }
      push(i, j, identClass(text, i, j, region.kind))
      i = j
      continue
    }
    if ("()[]{}".includes(char)) {
      push(i, i + 1, "cm-math-delim")
      i++
      continue
    }
    if (OPS.has(char)) {
      push(i, i + 1, "cm-math-op")
      i++
      continue
    }
    i++
  }
}

/** Token ranges inside every equation. */
export function mathMarks(text: string): MathMark[] {
  const marks: MathMark[] = []
  for (const region of mathRegions(text)) tokenize(text, region, marks)
  return marks
}

function build(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  const text = view.state.doc.toString()
  const visible = view.visibleRanges
  const marks = mathMarks(text).filter((mark) => visible.some((range) => mark.to >= range.from && mark.from <= range.to))
  marks.sort((a, b) => a.from - b.from || a.to - b.to)
  for (const mark of marks) builder.add(mark.from, mark.to, MARK[mark.cls])
  return builder.finish()
}

/** Colors equations by their syntax, LaTeX and Typst alike. */
export function mathSyntax(): Extension {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet
      constructor(view: EditorView) {
        this.decorations = build(view)
      }
      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) this.decorations = build(update.view)
      }
    },
    { decorations: (plugin) => plugin.decorations },
  )
}
