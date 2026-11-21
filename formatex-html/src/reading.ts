export interface ReadingState { progress: number; heading: string }
export interface ReadingTracker { select(id: string): void; resume(): void; destroy(): void }

/** Track the heading above the reading line, rather than the most recent observer
 * notification. A clicked destination stays selected through smooth/clamped scroll. */
export function trackReading(headings: { id: string }[], inset: number, changed: (state: ReadingState) => void): ReadingTracker {
  let positions: { id: string; top: number }[] = []
  let pinned: string | undefined
  let scheduled = 0, measure = true, disposed = false
  const main = document.querySelector("main.fx-doc")
  const update = () => {
    scheduled = 0
    if (disposed) return
    if (measure) {
      positions = headings.flatMap(({ id }) => {
        const element = document.getElementById(id)
        return element ? [{ id, top: element.getBoundingClientRect().top + scrollY }] : []
      }).sort((a,b) => a.top - b.top)
      if (pinned && !positions.some(position => position.id === pinned)) pinned = undefined
      measure = false
    }
    const line = scrollY + inset + 24
    let low = 0, high = positions.length
    while (low < high) { const mid = (low + high) >>> 1; if (positions[mid].top <= line) low = mid + 1; else high = mid }
    const height = document.documentElement.scrollHeight - innerHeight
    changed({ heading: pinned ?? positions[Math.max(0, low - 1)]?.id ?? "", progress: height > 0 ? Math.max(0, Math.min(100, scrollY / height * 100)) : 0 })
  }
  const queue = () => { if (!disposed && !scheduled) scheduled = requestAnimationFrame(update) }
  const layout = () => { measure = true; queue() }
  const manual = (event?: Event) => {
    if ((event?.target as Element)?.closest?.(".fx-outline,.fx-popover")) return
    pinned = undefined; queue()
  }
  const key = (event: KeyboardEvent) => {
    if ((event.target as Element)?.closest?.("input,textarea,[contenteditable=true]")) return
    if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) manual(event)
  }
  const pointer = (event: Event) => { if (!(event.target as Element)?.closest?.(".fx-toolbar")) manual(event) }
  const reveal = (event: MessageEvent) => {
    const token = (window as unknown as { __fxPreviewToken?: string }).__fxPreviewToken
    if (token && event.source === parent && event.data?.fxToken === token && event.data.fxSourceReveal) manual()
  }
  const resize = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(layout)
  if (main) { resize?.observe(main); main.addEventListener("load", layout, true) }
  document.fonts?.ready.then(() => { if (!disposed) layout() })
  window.addEventListener("scroll", queue, { passive: true })
  window.addEventListener("resize", layout)
  window.addEventListener("wheel", manual, { passive: true })
  window.addEventListener("touchstart", pointer, { passive: true })
  window.addEventListener("pointerdown", pointer, { passive: true })
  window.addEventListener("keydown", key)
  window.addEventListener("message", reveal)
  document.addEventListener("fx-content-updated", layout)
  queue()
  return {
    select(id) { pinned = id; queue() },
    resume() { manual() },
    destroy() {
      disposed = true; cancelAnimationFrame(scheduled); resize?.disconnect()
      main?.removeEventListener("load", layout, true)
      window.removeEventListener("scroll", queue); window.removeEventListener("resize", layout)
      window.removeEventListener("wheel", manual); window.removeEventListener("touchstart", pointer)
      window.removeEventListener("pointerdown", pointer); window.removeEventListener("keydown", key)
      window.removeEventListener("message", reveal)
      document.removeEventListener("fx-content-updated", layout)
    },
  }
}
