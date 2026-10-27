import { EditorView, showPanel, type Panel, type ViewUpdate } from "@codemirror/view"
import { enclosingHeadings, parseHeadings, type OutlineHeading } from "./outline"

/** The icons of heading levels 1 to 3 (Lucide's paths); deeper levels show their number. */
const LEVEL_ICON: Record<number, string> = {
  1: '<path d="M4 12h8M4 18V6M12 18V6M17 12l3-2v8"/>',
  2: '<path d="M4 12h8M4 18V6M12 18V6M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1"/>',
  3: '<path d="M4 12h8M4 18V6M12 18V6M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2"/>',
}

function icon(level: number): string {
  const path = LEVEL_ICON[level]
  return path
    ? `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`
    : `<span class="cm-sticky-n">H${level}</span>`
}

/**
 * The panel above the text: the headings that enclose the first visible line, up to three levels (like the sticky scroll of VS Code).
 * It is a real panel, not an overlay, so the text starts below it and never slides under; a click on a row goes to that heading.
 */
function stickyPanel(view: EditorView): Panel {
  const dom = document.createElement("div")
  dom.className = "cm-sticky"
  dom.hidden = true
  let headings: OutlineHeading[] = parseHeadings(view.state.doc.toString())
  let shown = ""

  const set = (stack: OutlineHeading[]) => {
    const key = stack.map((heading) => `${heading.line}:${heading.level}:${heading.title}`).join("|")
    if (key === shown) return
    shown = key
    dom.hidden = stack.length === 0
    dom.replaceChildren(
      ...stack.map((heading) => {
        const row = document.createElement("button")
        row.type = "button"
        row.className = `cm-sticky-row cm-sticky-h${heading.level}`
        row.title = heading.title
        row.style.paddingInlineStart = `${6 + (heading.level - 1) * 12}px`
        row.innerHTML = `<span class="cm-sticky-icon">${icon(heading.level)}</span>`
        const text = document.createElement("span")
        text.className = "cm-sticky-text"
        text.dir = "auto"
        text.textContent = heading.title || "—"
        row.append(text)
        row.addEventListener("mousedown", (event) => event.preventDefault())
        row.addEventListener("click", () => {
          view.dispatch({ selection: { anchor: heading.from }, effects: EditorView.scrollIntoView(heading.from, { y: "start" }) })
          view.focus()
        })
        return row
      })
    )
  }

  const render = () => {
    // How far the document is scrolled under the top edge of the text area, in the document's own units
    const above = view.scrollDOM.getBoundingClientRect().top - view.documentTop
    if (above <= 0) return set([])
    const block = view.lineBlockAtHeight(above)
    set(enclosingHeadings(headings, view.state.doc.lineAt(block.from).number))
  }

  const onScroll = () => render()
  return {
    dom,
    top: true,
    mount() {
      view.scrollDOM.addEventListener("scroll", onScroll, { passive: true })
      render()
    },
    update(update: ViewUpdate) {
      if (update.docChanged) headings = parseHeadings(update.state.doc.toString())
      if (update.docChanged || update.viewportChanged || update.geometryChanged) render()
    },
    destroy() {
      view.scrollDOM.removeEventListener("scroll", onScroll)
    },
  }
}

export const stickyHeadings = showPanel.of(stickyPanel)

export const stickyTheme = EditorView.baseTheme({
  ".cm-panels.cm-panels-top:has(.cm-sticky[hidden])": { borderBottom: "none" },
  ".cm-sticky": {
    paddingRight: "var(--cm-minimap-width, 0px)",
    backgroundColor: "var(--background)",
    fontFamily: "Inter, Vazirmatn, system-ui, sans-serif",
  },
  ".cm-sticky-row": {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    width: "100%",
    height: "22px",
    padding: "0 8px",
    border: "none",
    background: "transparent",
    color: "var(--muted-foreground)",
    fontSize: "11.5px",
    textAlign: "start",
    cursor: "pointer",
  },
  ".cm-sticky-row:hover": { backgroundColor: "var(--muted)", color: "var(--foreground)" },
  ".cm-sticky-icon": { display: "inline-flex", flexShrink: "0", opacity: "0.8" },
  ".cm-sticky-n": { fontSize: "9px", fontWeight: "700" },
  ".cm-sticky-text": { minWidth: "0", flex: "1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  ".cm-sticky-h1": { fontWeight: "700", color: "var(--foreground)" },
  ".cm-sticky-h2": { fontWeight: "600" },
})
