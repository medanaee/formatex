import { EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view"
import { markedLines, setProblems } from "./problems"
import { minimapGeometry } from "./minimapGeometry"

const WIDTH = 80
const CHAR = 1.1
const ROW = 2

/** Fixed-scale, virtualized document miniature at the physical right edge, with a draggable viewport like VS Code. */
export const minimap = ViewPlugin.fromClass(class {
  readonly wrap = document.createElement("div")
  readonly canvas = document.createElement("canvas")
  readonly band = document.createElement("div")
  readonly view: EditorView
  frame = 0
  code: boolean[] = []
  geometry = minimapGeometry(1, 1, 1, 1)
  drag: { y: number; top: number } | null = null
  readonly onScroll = () => this.schedule()
  readonly observer: MutationObserver

  constructor(view: EditorView) {
    this.view = view
    this.wrap.className = "cm-minimap"
    this.band.className = "cm-minimap-band"
    this.wrap.append(this.canvas, this.band)
    view.dom.append(this.wrap)
    view.scrollDOM.style.marginRight = `${WIDTH}px`
    view.dom.style.setProperty("--cm-minimap-width", `${WIDTH}px`)
    view.scrollDOM.addEventListener("scroll", this.onScroll, { passive: true })
    this.wrap.addEventListener("wheel", (event) => {
      event.preventDefault()
      view.scrollDOM.scrollTop += event.deltaY * (event.deltaMode === 1 ? view.defaultLineHeight : 1)
    }, { passive: false })
    this.wrap.addEventListener("pointerdown", (event) => {
      event.preventDefault()
      this.wrap.setPointerCapture(event.pointerId)
      const y = event.clientY - this.wrap.getBoundingClientRect().top
      if (y < this.geometry.bandTop || y > this.geometry.bandTop + this.geometry.bandHeight) {
        const line = Math.min(view.state.doc.lines, Math.max(1, Math.floor((y + this.geometry.offset) / ROW) + 1))
        view.scrollDOM.scrollTop = view.lineBlockAt(view.state.doc.line(line).from).top - view.scrollDOM.clientHeight / 2
      }
      this.drag = { y: event.clientY, top: view.scrollDOM.scrollTop }
    })
    this.wrap.addEventListener("pointermove", (event) => {
      if (!this.drag) return
      const scroller = view.scrollDOM
      const track = Math.max(1, this.wrap.clientHeight - this.geometry.bandHeight)
      scroller.scrollTop = this.drag.top + (event.clientY - this.drag.y) * (scroller.scrollHeight - scroller.clientHeight) / track
    })
    this.wrap.addEventListener("pointerup", () => { this.drag = null })
    this.wrap.addEventListener("pointercancel", () => { this.drag = null })
    this.observer = new MutationObserver(() => this.schedule())
    this.observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "dir"] })
    this.scanFences()
    this.schedule()
  }

  scanFences() {
    let fence = ""
    this.code = []
    for (let n = 1; n <= this.view.state.doc.lines; n++) {
      const mark = /^\s*(`{3,}|~{3,})/.exec(this.view.state.doc.line(n).text)?.[1]?.[0]
      if (mark) fence = fence === mark ? "" : fence || mark
      this.code[n] = !!fence
    }
  }

  update(update: ViewUpdate) {
    if (update.docChanged) this.scanFences()
    if (update.docChanged || update.geometryChanged || update.viewportChanged || update.transactions.some((t) => t.effects.some((e) => e.is(setProblems)))) this.schedule()
  }

  schedule() {
    cancelAnimationFrame(this.frame)
    this.frame = requestAnimationFrame(() => this.draw())
  }

  draw() {
    const { view, canvas } = this
    const height = Math.max(this.wrap.clientHeight, 1)
    const scroller = view.scrollDOM
    const above = Math.max(0, scroller.getBoundingClientRect().top - view.documentTop)
    const first = view.state.doc.lineAt(view.lineBlockAtHeight(above).from).number
    const last = view.state.doc.lineAt(view.lineBlockAtHeight(Math.min(view.contentHeight, above + scroller.clientHeight)).to).number
    this.geometry = minimapGeometry(view.state.doc.lines, first, last, height, ROW)
    const ratio = window.devicePixelRatio || 1
    canvas.width = WIDTH * ratio
    canvas.height = height * ratio
    canvas.style.width = `${WIDTH}px`
    canvas.style.height = `${height}px`
    const context = canvas.getContext("2d")
    if (!context) return
    context.scale(ratio, ratio)
    const style = getComputedStyle(view.contentDOM)
    const chrome = getComputedStyle(view.dom)
    const accent = chrome.getPropertyValue("--syntax-tag").trim() || style.color
    const maxChars = Math.floor((WIDTH - 6) / CHAR)
    for (let n = this.geometry.firstDraw; n <= this.geometry.lastDraw; n++) {
      const text = view.state.doc.line(n).text
      const y = (n - 1) * ROW - this.geometry.offset
      const heading = !this.code[n] && /^\s{0,3}#{1,6}\s/.test(text)
      context.fillStyle = heading ? accent : style.color
      context.globalAlpha = heading ? 0.95 : this.code[n] ? 0.28 : 0.5
      const end = Math.min(text.length, maxChars)
      for (let i = 0; i < end;) {
        if (/\s/.test(text[i])) { i++; continue }
        let j = i
        while (j < end && !/\s/.test(text[j])) j++
        context.fillRect(3 + i * CHAR, y, (j - i) * CHAR, ROW * 0.7)
        i = j
      }
    }
    for (const { line, severity } of markedLines(view.state)) {
      const y = (line - 1) * ROW - this.geometry.offset
      if (y < -ROW || y > height) continue
      context.fillStyle = severity === "error" ? chrome.getPropertyValue("--destructive").trim() : style.color
      context.globalAlpha = 0.35
      context.fillRect(0, y, WIDTH, ROW)
      context.globalAlpha = 1
      context.fillRect(WIDTH - 4, y - 1, 4, ROW + 2)
    }
    this.band.style.top = `${this.geometry.bandTop}px`
    this.band.style.height = `${this.geometry.bandHeight}px`
    this.band.hidden = scroller.scrollHeight <= scroller.clientHeight
  }

  destroy() {
    cancelAnimationFrame(this.frame)
    this.observer.disconnect()
    this.view.scrollDOM.removeEventListener("scroll", this.onScroll)
    this.view.scrollDOM.style.marginRight = ""
    this.view.dom.style.removeProperty("--cm-minimap-width")
    this.wrap.remove()
  }
})

export const minimapTheme = EditorView.baseTheme({
  ".cm-minimap": { position: "absolute", top: "0", right: "0", width: `${WIDTH}px`, height: "100%", overflow: "hidden", cursor: "pointer", userSelect: "none", touchAction: "none", borderLeft: "1px solid var(--border)", backgroundColor: "var(--background)", zIndex: "6" },
  ".cm-minimap canvas": { display: "block" },
  ".cm-minimap-band": { position: "absolute", left: "0", right: "0", backgroundColor: "color-mix(in oklab, var(--foreground) 12%, transparent)", pointerEvents: "none" },
  ".cm-minimap:hover .cm-minimap-band": { backgroundColor: "color-mix(in oklab, var(--foreground) 20%, transparent)" },
})
