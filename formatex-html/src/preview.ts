import type { SourceRange } from "@formatex/core"
import { nodeAt, sourceIndex, sourceAtText, textAtSource } from "@formatex/core/source"

interface Entry { source: SourceRange[]; at: { file: string; line: number; column: number }; text?: string }
type MapData = Record<string, Entry>

/** Only installed by a preview host. Standalone documents carry neither source maps nor this bridge. */
export function installPreviewBridge(): () => void {
  const token = (window as unknown as { __fxPreviewToken?: string }).__fxPreviewToken
  if (!token || !document.getElementById("fx-source-map")) return () => {}
  let previous = "", map: MapData = {}, index = new Map<string, import("@formatex/core/source").SourceHit[]>()
  const sourceMap = (): MapData => {
    const text = document.getElementById("fx-source-map")?.textContent ?? "{}"
    if (text !== previous) {
      previous = text
      try { map = JSON.parse(text) as MapData } catch { map = {} }
      index = sourceIndex({ version: 1, file: "", settings: {}, tokens: {}, children: Object.entries(map).map(([key, entry]) => ({ key, type: "text", at: entry.at, source: entry.source })) })
    }
    return map
  }
  const send = (data: Record<string, unknown>) => parent.postMessage({ ...data, fxToken: token }, "*")
  const onClick = (event: MouseEvent) => {
    const element = event.target instanceof Element ? event.target.closest<HTMLElement>("main [data-fx-node]") : null
    if (!element || (event.target as Element).closest("a,button,input,textarea,[contenteditable=true]")) return
    if (!window.getSelection()?.isCollapsed) return
    const entry = sourceMap()[element.dataset.fxNode ?? ""]
    const first = entry?.source[0]
    if (!first) return
    let offset = first.utf16Start
    if (entry.text !== undefined) {
      const dom = document as Document & { caretPositionFromPoint?: (x: number, y: number) => { offsetNode: globalThis.Node; offset: number } | null; caretRangeFromPoint?: (x: number, y: number) => Range | null }
      const point = dom.caretPositionFromPoint?.(event.clientX, event.clientY)
      const caret = point ? { node: point.offsetNode, offset: point.offset } : (() => { const range = dom.caretRangeFromPoint?.(event.clientX, event.clientY); return range ? { node: range.startContainer, offset: range.startOffset } : null })()
      if (caret && element.contains(caret.node)) {
        const range = document.createRange(); range.selectNodeContents(element); range.setEnd(caret.node, caret.offset)
        const index = Math.min(entry.text.length, range.toString().length)
        const hit = sourceAtText(entry.source, entry.text, index)
        if (!hit) return
        send({ fxSource: { path: hit.range.file, offset: hit.offset, end: hit.end, node: element.dataset.fxNode, line: entry.at.line, column: entry.at.column } })
        return
      }
    }
    send({ fxSource: { path: first.file, offset, end: first.generated ? first.utf16End : offset, node: element.dataset.fxNode, line: entry.at.line, column: entry.at.column } })
  }
  let flashTimer: ReturnType<typeof setTimeout> | undefined
  const clearFlash = () => {
    document.querySelectorAll(".fx-source-flash").forEach(element => element.classList.remove("fx-source-flash"))
    document.querySelectorAll(".fx-source-range-flash").forEach(element => element.remove())
  }
  const onMessage = (event: MessageEvent) => {
    const request = event.data
    if (event.source !== parent || request?.fxToken !== token || !request.fxSourceReveal) return
    const { path, offset, flash } = request.fxSourceReveal as { path?: unknown; offset?: unknown; flash?: unknown }
    if (typeof path !== "string" || typeof offset !== "number" || !Number.isFinite(offset)) return
    sourceMap()
    const selected = nodeAt(index, path, offset)
    if (!selected) return
    const element = document.querySelector<HTMLElement>(`[data-fx-node="${CSS.escape(selected.node)}"]`)
    if (!element) return
    // Select the word containing the source caret, so a long source line that wraps
    // into many browser rows scrolls to the correct row, not the top of its node.
    const range = document.createRange(); range.selectNodeContents(element)
    const entry = map[selected.node]
    if (entry?.text !== undefined) {
      const at = textAtSource(selected.range, entry.text, offset)
      const word = [...entry.text.matchAll(/\S+/gu)].find(match => match.index <= at && at < match.index + match[0].length)
      const from = word?.index ?? Math.min(at, Math.max(0, entry.text.length - 1))
      const to = word ? word.index + word[0].length : Math.min(entry.text.length, from + 1)
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
      let position = 0, started = false, text: globalThis.Node | null
      while ((text = walker.nextNode())) {
        const length = text.textContent?.length ?? 0
        if (!started && from < position + length) { range.setStart(text, from - position); started = true }
        if (started && to <= position + length) { range.setEnd(text, to - position); break }
        position += length
      }
    }
    const bounds = range.getBoundingClientRect?.() ?? element.getBoundingClientRect()
    if (flash || bounds.top < 60 || bounds.bottom > innerHeight - 40) window.scrollBy({ top: bounds.top - innerHeight * .35, behavior: "smooth" })
    if (flash) {
      clearFlash()
      if (entry?.text !== undefined) {
        for (const rect of Array.from(range.getClientRects?.() ?? [])) {
          const mark = document.createElement("span"); mark.className = "fx-source-range-flash"
          Object.assign(mark.style, { position: "absolute", pointerEvents: "none", left: `${rect.left + scrollX}px`, top: `${rect.top + scrollY}px`, width: `${rect.width}px`, height: `${rect.height}px`, background: "color-mix(in srgb, var(--accent) 25%, transparent)", outline: "1px solid var(--accent)", borderRadius: "2px" })
          document.documentElement.append(mark)
        }
      } else { element.classList.add("fx-source-flash") }
      clearTimeout(flashTimer)
      flashTimer = setTimeout(clearFlash, 1200)
    }
  }
  document.addEventListener("click", onClick)
  window.addEventListener("message", onMessage)
  return () => { document.removeEventListener("click", onClick); window.removeEventListener("message", onMessage); clearTimeout(flashTimer); clearFlash() }
}
