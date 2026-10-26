import { EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view"
import { enclosingHeadings, parseHeadings, type OutlineHeading } from "./outline"

const ROW_HEIGHT = 24

/**
 * Pins the headings that enclose the first visible line to the top of the editor, up to three levels (like the sticky scroll of
 * VS Code). A click on one goes to it. Only for Markdown.
 */
export const stickyHeadings = ViewPlugin.fromClass(
  class {
    readonly dom: HTMLDivElement
    headings: OutlineHeading[] = []
    shown = ""
    readonly onScroll = () => this.render()

    readonly view: EditorView

    constructor(view: EditorView) {
      this.view = view
      this.dom = document.createElement("div")
      this.dom.className = "cm-sticky"
      this.dom.hidden = true
      view.dom.append(this.dom)
      this.headings = parseHeadings(view.state.doc.toString())
      view.scrollDOM.addEventListener("scroll", this.onScroll, { passive: true })
      this.render()
    }

    update(update: ViewUpdate) {
      if (update.docChanged) this.headings = parseHeadings(update.state.doc.toString())
      if (update.docChanged || update.viewportChanged || update.geometryChanged) this.render()
    }

    destroy() {
      this.view.scrollDOM.removeEventListener("scroll", this.onScroll)
      this.dom.remove()
    }

    /** The headings above the first line that is visible below the pinned rows. */
    stackAt(offset: number): OutlineHeading[] {
      const { view } = this
      const top = view.scrollDOM.scrollTop + offset
      const block = view.lineBlockAtHeight(Math.max(top, 0))
      return enclosingHeadings(this.headings, view.state.doc.lineAt(block.from).number)
    }

    render() {
      const { view } = this
      if (view.scrollDOM.scrollTop <= 0) {
        this.set([])
        return
      }
      // The rows themselves cover the first lines, so settle the count against the line that is left visible
      let stack = this.stackAt(0)
      stack = this.stackAt(stack.length * ROW_HEIGHT)
      this.set(stack)
    }

    set(stack: OutlineHeading[]) {
      const key = stack.map((heading) => `${heading.line}:${heading.title}`).join("|")
      if (key === this.shown) return
      this.shown = key
      this.dom.hidden = stack.length === 0
      this.dom.replaceChildren(
        ...stack.map((heading) => {
          const row = document.createElement("button")
          row.type = "button"
          row.className = `cm-sticky-row cm-sticky-h${heading.level}`
          row.dir = "auto"
          row.textContent = heading.title || "—"
          row.style.paddingInlineStart = `${8 + (heading.level - 1) * 10}px`
          row.addEventListener("mousedown", (event) => event.preventDefault())
          row.addEventListener("click", () => {
            this.view.dispatch({ selection: { anchor: heading.from }, effects: EditorView.scrollIntoView(heading.from, { y: "start" }) })
            this.view.focus()
          })
          return row
        })
      )
    }
  }
)

export const stickyTheme = EditorView.baseTheme({
  ".cm-sticky": {
    position: "absolute",
    top: "0",
    insetInline: "0",
    zIndex: "5",
    backgroundColor: "var(--background)",
    borderBottom: "1px solid var(--border)",
    boxShadow: "0 1px 0 var(--background)",
    paddingRight: "var(--cm-minimap-width, 0px)",
  },
  ".cm-sticky-row": {
    display: "block",
    width: "100%",
    height: `${ROW_HEIGHT}px`,
    lineHeight: `${ROW_HEIGHT}px`,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    textAlign: "start",
    background: "transparent",
    border: "none",
    color: "var(--muted-foreground)",
    fontSize: "12px",
    cursor: "pointer",
  },
  ".cm-sticky-row:hover": { backgroundColor: "var(--muted)", color: "var(--foreground)" },
  ".cm-sticky-h1": { fontWeight: "700", color: "var(--foreground)" },
  ".cm-sticky-h2": { fontWeight: "600" },
})
