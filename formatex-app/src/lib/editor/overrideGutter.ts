import { Facet, StateEffect, StateField } from "@codemirror/state"
import { EditorView, GutterMarker, gutter } from "@codemirror/view"
import { configOverrides, type ConfigOverride, type FrontMatterEntry } from "./overrides"

export interface OverrideRequest {
  override: ConfigOverride
  anchor: DOMRect
}

/** Called when the mark in the gutter is hovered (a mouse) or tapped. */
export const overrideInfo = Facet.define<(request: OverrideRequest) => void, (request: OverrideRequest) => void>({ combine: (values) => values[0] ?? (() => {}) })

/** Replaces the front-matter entries of the project's main document that the gutter compares `config.toml` with. */
export const setFrontMatter = StateEffect.define<readonly FrontMatterEntry[]>()

interface Marks {
  entries: readonly FrontMatterEntry[]
  /** Overridden keys by 1-based line. */
  byLine: Map<number, ConfigOverride>
}

const compute = (doc: string, entries: readonly FrontMatterEntry[]): Marks => ({ entries, byLine: new Map(configOverrides(doc, entries).map((found) => [found.line, found])) })

const INFO_SVG = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>'

class OverrideMarker extends GutterMarker {
  readonly found: ConfigOverride
  readonly label: string
  constructor(found: ConfigOverride, label: string) {
    super()
    this.found = found
    this.label = label
  }
  eq(other: OverrideMarker) {
    return other.found.path === this.found.path && other.found.override.line === this.found.override.line && other.found.override.value === this.found.override.value && other.label === this.label
  }
  toDOM(view: EditorView) {
    const el = document.createElement("button")
    el.type = "button"
    el.className = "cm-override-mark"
    el.setAttribute("aria-label", this.label)
    el.innerHTML = INFO_SVG
    const open = () => view.state.facet(overrideInfo)({ override: this.found, anchor: el.getBoundingClientRect() })
    // The editor keeps its selection and focus; a mouse only has to rest on the mark, a finger taps it
    el.addEventListener("mousedown", (event) => event.preventDefault())
    el.addEventListener("pointerenter", (event) => event.pointerType === "mouse" && open())
    el.addEventListener("click", open)
    return el
  }
}

/** The label of the mark, for screen readers; a facet so a language change reaches the already built markers. */
export const overrideLabel = Facet.define<string, string>({ combine: (values) => values[0] ?? "" })

const field = StateField.define<Marks>({
  create: () => ({ entries: [], byLine: new Map() }),
  update(value, transaction) {
    let entries = value.entries
    let changed = transaction.docChanged
    for (const effect of transaction.effects) {
      if (effect.is(setFrontMatter)) {
        entries = effect.value
        changed = true
      }
    }
    return changed ? compute(transaction.state.doc.toString(), entries) : value
  },
})

/** An info mark in the gutter of every line of `config.toml` that the document's front matter also sets. Feed it with `setFrontMatter`. */
export const overrideGutter = [
  field,
  gutter({
    class: "cm-override-gutter",
    lineMarker(view, line) {
      const found = view.state.field(field).byLine.get(view.state.doc.lineAt(line.from).number)
      return found ? new OverrideMarker(found, view.state.facet(overrideLabel)) : null
    },
    lineMarkerChange: (update) => update.docChanged || update.transactions.some((transaction) => transaction.effects.some((effect) => effect.is(setFrontMatter))),
    initialSpacer: () => new OverrideMarker({ path: "", line: 0, override: { path: "", value: "", line: 0, leaf: true } }, ""),
  }),
  EditorView.baseTheme({
    ".cm-override-gutter": { width: "18px" },
    ".cm-override-gutter .cm-gutterElement": { display: "flex", alignItems: "center", justifyContent: "center" },
    ".cm-override-mark": { display: "flex", color: "var(--info)", background: "none", border: "none", padding: "0", cursor: "pointer", opacity: "1" },
  }),
]
