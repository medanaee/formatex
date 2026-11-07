import { RangeSetBuilder, type Extension } from "@codemirror/state"
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view"
import { findExpressions } from "./variableSyntax"

const printMark = Decoration.mark({ class: "cm-var" })
const codeMark = Decoration.mark({ class: "cm-cond" })
const attributePrintMark = Decoration.mark({ class: "cm-var cm-var-attr" })
const attributeCodeMark = Decoration.mark({ class: "cm-cond cm-cond-attr" })
const pageMark = Decoration.mark({ class: "cm-page" })

interface Mark {
  from: number
  to: number
  mark: Decoration
}

function build(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  const text = view.state.doc.toString()
  const marks: Mark[] = []
  const visible = view.visibleRanges
  const seen = (from: number, to: number) => visible.some((range) => to >= range.from && from <= range.to)
  for (const expr of findExpressions(text)) {
    const end = expr.to ?? text.length
    if (!seen(expr.from, end)) continue
    const mark = expr.inTag ? (expr.plain ? attributePrintMark : attributeCodeMark) : expr.plain ? printMark : codeMark
    marks.push({ from: expr.from, to: expr.from + 2, mark })
    if (expr.to !== null) marks.push({ from: expr.to - 2, to: expr.to, mark })
    for (const [from, to] of expr.code) if (to > from) marks.push({ from, to, mark })
    for (const [from, to] of expr.page) marks.push({ from, to, mark: pageMark })
  }
  // Marks may overlap (a name of the page inside code) but have to be added in the order they start
  marks.sort((a, b) => a.from - b.from || b.to - a.to)
  for (const { from, to, mark } of marks) builder.add(from, to, mark)
  return builder.finish()
}

/** `{{ code }}` of the text and of attribute values in its own colors (the Markdown inside its `[ ... ]` keeps the colors of Markdown). */
export function variableMarks(): Extension {
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
