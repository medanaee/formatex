import { indentUnit } from "@codemirror/language"
import { RangeSetBuilder, StateEffect, type EditorState, type Extension, type Text } from "@codemirror/state"
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view"
import { isRtl } from "./readingOrder"

/** Columns taken by the leading whitespace of a line (a tab counts as `tabSize` columns), or `null` for a line with nothing else on it. */
export function leadingColumns(text: string, tabSize: number): number | null {
  let columns = 0
  for (const ch of text) {
    if (ch === " ") columns++
    else if (ch === "\t") columns += tabSize - (columns % tabSize)
    else return columns
  }
  return null
}

/** The columns of one level of indentation (`indentUnit`: two spaces, four, or a tab). */
export function unitColumns(state: EditorState): number {
  const unit = state.facet(indentUnit)
  return Math.max(1, leadingColumns(unit + "x", state.tabSize) ?? 2)
}

/**
 * How many columns of guide lines a line gets: its indentation rounded down to whole levels. A blank line takes the smaller of the lines
 * around it, so the lines go on through a gap in a list or a block, as in VS Code.
 */
export function guideColumns(doc: Text, lineNumber: number, tabSize: number, unit: number): number {
  const own = leadingColumns(doc.line(lineNumber).text, tabSize)
  const around = (step: number): number => {
    for (let n = lineNumber + step, seen = 0; n >= 1 && n <= doc.lines; n += step, seen++) {
      if (seen >= 40) return 0
      const columns = leadingColumns(doc.line(n).text, tabSize)
      if (columns !== null) return columns
    }
    return 0
  }
  const columns = own ?? Math.min(around(-1), around(1))
  return Math.floor(columns / unit) * unit
}

/**
 * The character offsets in a line where each level of its indentation starts, up to `columns` columns: the whitespace the line has is walked
 * (a tab is a whole step), and a blank or shorter line reuses the unit step. Offsets past the whitespace of the line itself are given as the
 * line's own characters (a guide still stands there: the line is a blank line between two indented ones).
 */
export function levelOffsets(text: string, tabSize: number, unit: number, columns: number): number[] {
  const offsets: number[] = []
  let column = 0
  let index = 0
  for (const ch of text) {
    if (column >= columns) break
    if (column % unit === 0) offsets.push(index)
    if (ch === " ") column++
    else if (ch === "\t") column += tabSize - (column % tabSize)
    else break
    index += ch.length
  }
  // A blank line may be shorter than the guides it carries on
  while (column < columns) {
    if (column % unit === 0) offsets.push(Math.min(index, text.length))
    column++
  }
  return offsets
}

const remeasured = StateEffect.define<null>()

const COLOR = "var(--ig, rgba(128,128,128,.3))"

/** The background of a line: a one-pixel line at each of the measured places (in pixels from the line's left edge). */
function layers(xs: number[]): string {
  return xs.map((x) => `linear-gradient(${COLOR}, ${COLOR}) ${Math.round(x)}px 0 / 1px 1lh no-repeat`).join(", ")
}

/**
 * A thin vertical line at every level of indentation behind the text, like VS Code's indent guides (Markdown lists, TOML, Typst).
 *
 * The places are measured, not computed: a Persian line takes its spaces from another font than the editor's monospace one, so a guide
 * computed in `ch` drifts away from the text it belongs to. The first draw uses `ch`; the measure that follows puts every line right.
 */
export function indentGuides(): Extension {
  return [
    ViewPlugin.fromClass(
      class {
        decorations: DecorationSet
        /** Where the guides of a line stand, in pixels from its left edge, by the offset of the line's start. */
        measured = new Map<number, { text: string; xs: number[] }>()
        view: EditorView
        constructor(view: EditorView) {
          this.view = view
          this.decorations = this.build(view)
          this.measure(view)
        }
        update(update: ViewUpdate) {
          if (update.docChanged || update.viewportChanged || update.transactions.some((tr) => tr.effects.some((effect) => effect.is(remeasured)))) {
            this.decorations = this.build(update.view)
          }
          // A change of width moves the places too, with no change of the text
          if (update.docChanged || update.viewportChanged || update.geometryChanged) this.measure(update.view)
        }
        build(view: EditorView): DecorationSet {
          const builder = new RangeSetBuilder<Decoration>()
          const { state } = view
          const unit = unitColumns(state)
          let last = 0
          for (const { from, to } of view.visibleRanges) {
            let pos = from
            while (pos <= to) {
              const line = state.doc.lineAt(pos)
              pos = line.to + 1
              if (line.number <= last) continue
              last = line.number
              const columns = guideColumns(state.doc, line.number, state.tabSize, unit)
              if (columns <= 0) continue
              const known = this.measured.get(line.from)
              const attributes: Record<string, string> =
                known && known.text === line.text
                  ? { style: `background:${layers(known.xs)}` }
                  : // Before the measure: by `ch`, from the side the line starts on
                    { style: `--ig-w:${columns}ch;--ig-u:${unit}ch` }
              builder.add(line.from, line.from, Decoration.line({ class: known && known.text === line.text ? "cm-indent-guides-measured" : isRtl(line.text) ? "cm-indent-guides cm-indent-guides-rtl" : "cm-indent-guides", attributes }))
            }
          }
          return builder.finish()
        }
        measure(view: EditorView) {
          view.requestMeasure({
            read: (v) => {
              const { state } = v
              const unit = unitColumns(state)
              const found = new Map<number, { text: string; xs: number[] }>()
              for (const { from, to } of v.visibleRanges) {
                let pos = from
                while (pos <= to) {
                  const line = state.doc.lineAt(pos)
                  pos = line.to + 1
                  const columns = guideColumns(state.doc, line.number, state.tabSize, unit)
                  if (columns <= 0) continue
                  const dom = v.domAtPos(line.from).node
                  const element = (dom instanceof Element ? dom : dom.parentElement)?.closest(".cm-line")
                  if (!element) continue
                  const origin = element.getBoundingClientRect().left
                  const xs: number[] = []
                  for (const offset of levelOffsets(line.text, state.tabSize, unit, columns)) {
                    const at = v.coordsAtPos(line.from + offset)
                    if (at) xs.push(at.left - origin)
                  }
                  if (xs.length) found.set(line.from, { text: line.text, xs })
                }
              }
              return found
            },
            write: (found) => {
              let changed = found.size !== this.measured.size
              for (const [from, value] of found) {
                const old = this.measured.get(from)
                if (!old || old.text !== value.text || old.xs.some((x, i) => Math.abs(x - value.xs[i]) > 0.5) || old.xs.length !== value.xs.length) changed = true
              }
              this.measured = found
              if (changed) queueMicrotask(() => this.view.dispatch({ effects: remeasured.of(null) }))
            },
          })
        }
      },
      { decorations: (plugin) => plugin.decorations },
    ),
    EditorView.theme({
      ".cm-indent-guides": {
        "--ig": "color-mix(in oklab, var(--foreground) 16%, transparent)",
        backgroundImage: "repeating-linear-gradient(to right, var(--ig) 0, var(--ig) 1px, transparent 1px, transparent var(--ig-u))",
        backgroundSize: "var(--ig-w) 1lh",
        backgroundRepeat: "no-repeat",
        backgroundOrigin: "content-box",
      },
      // Persian lines start on the right
      ".cm-indent-guides-rtl": {
        backgroundImage: "repeating-linear-gradient(to left, var(--ig) 0, var(--ig) 1px, transparent 1px, transparent var(--ig-u))",
        backgroundPosition: "right top",
      },
      ".cm-indent-guides-measured": { "--ig": "color-mix(in oklab, var(--foreground) 16%, transparent)" },
    }),
  ]
}
