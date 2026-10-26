import { Facet, RangeSetBuilder } from "@codemirror/state"
import { Decoration, EditorView, ViewPlugin, WidgetType, type DecorationSet, type ViewUpdate } from "@codemirror/view"
import { findHexColors, normalizeHex } from "./colors"

/** A color in the text that the user wants to change: where it is (the `#` included), what it is, and where on screen. */
export interface ColorRequest {
  from: number
  to: number
  value: string
  anchor: DOMRect
}

/** Called when a swatch is clicked, or when a `#` is typed where a color goes. */
export const colorPicker = Facet.define<(request: ColorRequest) => void, (request: ColorRequest) => void>({ combine: (values) => values[0] ?? (() => {}) })

class SwatchWidget extends WidgetType {
  readonly value: string
  constructor(value: string) {
    super()
    this.value = value
  }
  eq(other: SwatchWidget) {
    return other.value === this.value
  }
  toDOM(view: EditorView) {
    const el = document.createElement("span")
    el.className = "cm-swatch"
    el.style.setProperty("--swatch", normalizeHex(this.value) ?? this.value)
    el.addEventListener("mousedown", (event) => event.preventDefault())
    el.addEventListener("click", (event) => {
      event.preventDefault()
      const from = view.posAtDOM(el)
      const text = view.state.doc.sliceString(from, from + 9)
      const found = findHexColors(`"${text}`)[0]
      if (!found) return
      view.state.facet(colorPicker)({ from, to: from + (found.to - found.from), value: found.value, anchor: el.getBoundingClientRect() })
    })
    return el
  }
  ignoreEvent() {
    return true
  }
}

function build(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  for (const { from, to } of view.visibleRanges) {
    // A little context before, so a color at the edge of the viewport still has its quote
    const start = Math.max(0, from - 1)
    const text = view.state.doc.sliceString(start, to)
    for (const found of findHexColors(text)) {
      builder.add(start + found.from, start + found.from, Decoration.widget({ widget: new SwatchWidget(found.value), side: -1 }))
    }
  }
  return builder.finish()
}

/** `#` typed right after a quote, `=` or `:` starts a color: the picker opens at once. */
const opensOnHash = EditorView.updateListener.of((update) => {
  if (!update.docChanged) return
  for (const transaction of update.transactions) {
    if (!transaction.isUserEvent("input.type")) continue
    transaction.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
      if (inserted.toString() !== "#" || fromA !== toA) return
      const before = update.state.doc.sliceString(Math.max(0, fromB - 2), fromB)
      if (!/(["'=]|[=:]\s)$/.test(before)) return
      const coords = update.view.coordsAtPos(toB)
      if (!coords) return
      update.view.state.facet(colorPicker)({ from: fromB, to: toB, value: "#", anchor: new DOMRect(coords.left, coords.top, 0, coords.bottom - coords.top) })
    })
  }
})

const swatchTheme = EditorView.baseTheme({
  ".cm-swatch": {
    display: "inline-block",
    width: "0.85em",
    height: "0.85em",
    marginInlineEnd: "0.3em",
    verticalAlign: "-0.1em",
    borderRadius: "3px",
    border: "1px solid color-mix(in oklab, currentColor 35%, transparent)",
    backgroundColor: "var(--swatch)",
    cursor: "pointer",
  },
})

/** A small swatch before every hex color in the text (`#3366ff`); a click on it opens the color picker. */
export function colorSwatches(onPick: (request: ColorRequest) => void) {
  const plugin = ViewPlugin.fromClass(
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
  )
  return [colorPicker.of(onPick), plugin, opensOnHash, swatchTheme]
}
