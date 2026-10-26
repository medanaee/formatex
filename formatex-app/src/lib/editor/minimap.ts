import { EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view"

const WIDTH = 80
const CHAR = 1.1
const ROW = 2

/**
 * A miniature of the whole text at the editor's physical right edge, like the minimap of VS Code: every line as small bars, the
 * visible part as a lighter band. Click or drag to scroll. The text is shrunk to fit when it has more lines than the editor is tall.
 */
export const minimap = ViewPlugin.fromClass(
  class {
    readonly wrap: HTMLDivElement
    readonly canvas: HTMLCanvasElement
    readonly band: HTMLDivElement
    /** Height of the miniature in px, the whole text. */
    miniHeight = 0
    frame = 0
    dragging = false
    readonly onScroll = () => this.placeBand()

    readonly view: EditorView

    constructor(view: EditorView) {
      this.view = view
      this.wrap = document.createElement("div")
      this.wrap.className = "cm-minimap"
      this.canvas = document.createElement("canvas")
      this.band = document.createElement("div")
      this.band.className = "cm-minimap-band"
      this.wrap.append(this.canvas, this.band)
      view.dom.append(this.wrap)
      view.scrollDOM.style.marginRight = `${WIDTH}px`
      view.dom.style.setProperty("--cm-minimap-width", `${WIDTH}px`)
      view.scrollDOM.addEventListener("scroll", this.onScroll, { passive: true })

      const go = (event: PointerEvent) => {
        const rect = this.wrap.getBoundingClientRect()
        const scroller = view.scrollDOM
        const fraction = Math.min(Math.max((event.clientY - rect.top) / Math.max(this.miniHeight, 1), 0), 1)
        scroller.scrollTop = fraction * scroller.scrollHeight - scroller.clientHeight / 2
      }
      this.wrap.addEventListener("pointerdown", (event) => {
        this.dragging = true
        this.wrap.setPointerCapture(event.pointerId)
        go(event)
      })
      this.wrap.addEventListener("pointermove", (event) => this.dragging && go(event))
      this.wrap.addEventListener("pointerup", () => (this.dragging = false))
      this.wrap.addEventListener("pointercancel", () => (this.dragging = false))
      this.schedule()
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.geometryChanged) this.schedule()
      else if (update.viewportChanged) this.placeBand()
    }

    destroy() {
      cancelAnimationFrame(this.frame)
      this.view.scrollDOM.removeEventListener("scroll", this.onScroll)
      this.view.scrollDOM.style.marginRight = ""
      this.view.dom.style.removeProperty("--cm-minimap-width")
      this.wrap.remove()
    }

    schedule() {
      cancelAnimationFrame(this.frame)
      this.frame = requestAnimationFrame(() => {
        this.draw()
        this.placeBand()
      })
    }

    draw() {
      const { view, canvas } = this
      const height = Math.max(view.dom.clientHeight, 1)
      const ratio = window.devicePixelRatio || 1
      canvas.width = WIDTH * ratio
      canvas.height = height * ratio
      canvas.style.width = `${WIDTH}px`
      canvas.style.height = `${height}px`
      const context = canvas.getContext("2d")
      if (!context) return
      context.scale(ratio, ratio)
      const doc = view.state.doc
      const row = Math.min(ROW, height / Math.max(doc.lines, 1))
      this.miniHeight = Math.min(doc.lines * row, height)
      const style = getComputedStyle(view.contentDOM)
      const accent = getComputedStyle(view.dom).getPropertyValue("--syntax-tag").trim() || style.color
      const maxChars = Math.floor((WIDTH - 6) / CHAR)
      let inCode = false
      for (let n = 1; n <= doc.lines; n++) {
        const text = doc.line(n).text
        if (/^\s*(```|~~~)/.test(text)) inCode = !inCode
        const y = (n - 1) * row
        const heading = !inCode && /^\s{0,3}#{1,6}\s/.test(text)
        context.fillStyle = heading ? accent : style.color
        context.globalAlpha = heading ? 0.95 : inCode ? 0.28 : 0.5
        const bar = Math.max(row * 0.7, 0.8)
        const end = Math.min(text.length, maxChars)
        for (let i = 0; i < end; ) {
          if (/\s/.test(text[i])) {
            i++
            continue
          }
          let j = i
          while (j < end && !/\s/.test(text[j])) j++
          context.fillRect(3 + i * CHAR, y, (j - i) * CHAR, bar)
          i = j
        }
      }
    }

    placeBand() {
      const scroller = this.view.scrollDOM
      const total = Math.max(scroller.scrollHeight, 1)
      const top = (scroller.scrollTop / total) * this.miniHeight
      const height = Math.max((scroller.clientHeight / total) * this.miniHeight, 14)
      this.band.style.top = `${top}px`
      this.band.style.height = `${Math.min(height, Math.max(this.miniHeight - top, 14))}px`
      this.band.hidden = scroller.scrollHeight <= scroller.clientHeight
    }
  }
)

export const minimapTheme = EditorView.baseTheme({
  ".cm-minimap": {
    position: "absolute",
    top: "0",
    right: "0",
    width: `${WIDTH}px`,
    height: "100%",
    cursor: "pointer",
    userSelect: "none",
    touchAction: "none",
    borderLeft: "1px solid var(--border)",
    backgroundColor: "var(--background)",
    zIndex: "6",
  },
  ".cm-minimap canvas": { display: "block" },
  ".cm-minimap-band": {
    position: "absolute",
    left: "0",
    right: "0",
    backgroundColor: "color-mix(in oklab, var(--foreground) 12%, transparent)",
    pointerEvents: "none",
  },
  ".cm-minimap:hover .cm-minimap-band": { backgroundColor: "color-mix(in oklab, var(--foreground) 20%, transparent)" },
})
