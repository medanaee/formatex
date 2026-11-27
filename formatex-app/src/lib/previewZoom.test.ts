// @vitest-environment happy-dom
import { describe, expect, it } from "vitest"
import { captureZoomAnchor, restoreZoomAnchor } from "./previewZoom"

interface MockLayout {
  clientWidth: number
  clientHeight: number
  scrollLeft: number
  scrollTop: number
  pageWidth: number
  pageHeight: number
  pageCount: number
  padding: number
  gap: number
}

function makeMockScroller(layout: MockLayout) {
  const scroller = document.createElement("div")
  Object.defineProperty(scroller, "clientWidth", { get: () => layout.clientWidth, configurable: true })
  Object.defineProperty(scroller, "clientHeight", { get: () => layout.clientHeight, configurable: true })
  Object.defineProperty(scroller, "scrollLeft", {
    get: () => layout.scrollLeft,
    set: (v: number) => {
      const contentWidth = Math.max(layout.clientWidth, layout.pageWidth + layout.padding * 2)
      layout.scrollLeft = Math.max(0, Math.min(contentWidth - layout.clientWidth, v))
    },
    configurable: true,
  })
  Object.defineProperty(scroller, "scrollTop", {
    get: () => layout.scrollTop,
    set: (v: number) => {
      const contentHeight = layout.padding * 2 + layout.pageCount * layout.pageHeight + Math.max(0, layout.pageCount - 1) * layout.gap
      layout.scrollTop = Math.max(0, Math.min(Math.max(0, contentHeight - layout.clientHeight), v))
    },
    configurable: true,
  })
  scroller.getBoundingClientRect = () => new DOMRect(0, 0, layout.clientWidth, layout.clientHeight)

  const pages = Array.from({ length: layout.pageCount }, (_, i) => {
    const el = document.createElement("div")
    el.getBoundingClientRect = () => {
      const contentLeft = layout.pageWidth + layout.padding * 2 < layout.clientWidth
        ? (layout.clientWidth - layout.pageWidth) / 2
        : layout.padding
      const left = contentLeft - layout.scrollLeft
      const top = layout.padding + i * (layout.pageHeight + layout.gap) - layout.scrollTop
      return new DOMRect(left, top, layout.pageWidth, layout.pageHeight)
    }
    scroller.appendChild(el)
    return el
  })

  return { scroller, pages }
}

describe("previewZoom anchor", () => {
  it("keeps the viewport-center point on the same page and vertical fraction when zooming in and out", () => {
    const layout: MockLayout = {
      clientWidth: 800,
      clientHeight: 600,
      scrollLeft: 0,
      scrollTop: 4200, // Somewhere in page 5 (0-indexed: 4)
      pageWidth: 700,
      pageHeight: 1000,
      pageCount: 10,
      padding: 12,
      gap: 12,
    }
    const { scroller, pages } = makeMockScroller(layout)

    // Before zoom: capture center anchor
    const anchor = captureZoomAnchor(scroller, pages)!
    expect(anchor).not.toBeNull()
    expect(anchor.index).toBe(4)

    // Zoom in 2x (gaps and padding stay constant)
    layout.pageWidth = 1400
    layout.pageHeight = 2000
    restoreZoomAnchor(scroller, pages, anchor)

    // Verify the exact same page point is still at the viewport center
    const afterRect = pages[anchor.index].getBoundingClientRect()
    expect(afterRect.left + anchor.fx * afterRect.width).toBeCloseTo(400, 4)
    expect(afterRect.top + anchor.fy * afterRect.height).toBeCloseTo(300, 4)

    // Zoom out to 0.5x from near the bottom (even if browser clamps scrollTop first)
    const anchor2 = captureZoomAnchor(scroller, pages)!
    layout.pageWidth = 350
    layout.pageHeight = 500
    // Simulate browser clamping scrollTop before useLayoutEffect runs
    const maxScroll = 24 + 10 * 500 + 9 * 12 - 600
    layout.scrollTop = Math.min(layout.scrollTop, maxScroll)

    restoreZoomAnchor(scroller, pages, anchor2)
    const zoomedOutRect = pages[anchor2.index].getBoundingClientRect()
    expect(zoomedOutRect.top + anchor2.fy * zoomedOutRect.height).toBeCloseTo(300, 4)
  })

  it("keeps the exact point under the mouse cursor pinned on Ctrl+wheel zoom", () => {
    const layout: MockLayout = {
      clientWidth: 800,
      clientHeight: 600,
      scrollLeft: 0,
      scrollTop: 2100,
      pageWidth: 700,
      pageHeight: 1000,
      pageCount: 6,
      padding: 12,
      gap: 12,
    }
    const { scroller, pages } = makeMockScroller(layout)
    const cursor = { x: 600, y: 180 }
    const anchor = captureZoomAnchor(scroller, pages, cursor)!
    expect(anchor.index).toBe(2)

    layout.pageWidth = 1400
    layout.pageHeight = 2000
    restoreZoomAnchor(scroller, pages, anchor)

    const rect = pages[anchor.index].getBoundingClientRect()
    expect(rect.left + anchor.fx * rect.width).toBeCloseTo(cursor.x, 4)
    expect(rect.top + anchor.fy * rect.height).toBeCloseTo(cursor.y, 4)
  })
})
