import type { Range } from "@codemirror/state"
import { Decoration, EditorView, ViewPlugin, type DecorationSet, type ViewUpdate } from "@codemirror/view"
import { frontMatterRange } from "./livePreview"

/**
 * In a right-to-left editor (forced, or a Persian line) the Latin markup between Persian words is reordered by the bidirectional
 * algorithm: the neutral characters at the edges of `<alert type="tip">` take the line's direction and end up on the wrong side. Those
 * pieces are marked as isolated left-to-right runs, so each reads as it is written: tags, `{...}` option blocks and inline code.
 * The lines of the front matter are settings (`key: value`), not prose: they are left-to-right as a whole.
 */
const PATTERNS = [
  /<\/?[A-Za-z][\w-]*(?:"[^"\n]*"|'[^'\n]*'|[^<>"'\n])*>/g,
  /\{[^{}\n]*\}/g,
  /`[^`\n]+`/g,
]

const isolate = Decoration.mark({ class: "cm-ltr-run" })
const ltrLine = Decoration.line({ attributes: { dir: "ltr" } })

function build(view: EditorView): DecorationSet {
  const out: Range<Decoration>[] = []
  const doc = view.state.doc
  const front = frontMatterRange(doc.toString())
  const frontEnd = front ? front.end : -1
  if (front) for (let n = 1; n <= doc.lineAt(Math.min(frontEnd, doc.length)).number; n++) out.push(ltrLine.range(doc.line(n).from))

  for (const { from, to } of view.visibleRanges) {
    const start = doc.lineAt(from).from
    const end = doc.lineAt(to).to
    const text = doc.sliceString(start, end)
    for (const pattern of PATTERNS) {
      pattern.lastIndex = 0
      for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
        const at = start + match.index
        // The front matter is already left-to-right
        if (at > frontEnd) out.push(isolate.range(at, at + match[0].length))
      }
    }
  }
  return Decoration.set(out, true)
}

export const bidiIsolate = [
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet
      constructor(view: EditorView) {
        this.decorations = build(view)
      }
      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) this.decorations = build(update.view)
      }
    },
    { decorations: (value) => value.decorations }
  ),
  EditorView.baseTheme({ ".cm-ltr-run": { direction: "ltr", unicodeBidi: "isolate" } }),
]
