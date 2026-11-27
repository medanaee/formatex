import { useSettingsStore } from "@/stores/useSettingsStore"
import { useWorkspaceStore } from "@/stores/useWorkspaceStore"

export const ZOOM_PRESETS = [50, 75, 100, 125, 150, 200, 300]

export interface ZoomAnchor {
  /** Index of the anchored page in the page list. */
  index: number
  /** Horizontal fraction relative to the page's left edge (0..1 inside the page). */
  fx: number
  /** Vertical fraction relative to the page's top edge (0..1 inside the page). */
  fy: number
  /** Pivot X in scroller client coordinates. */
  px: number
  /** Pivot Y in scroller client coordinates. */
  py: number
}

/** A step of zoom from what is drawn now, so a step out of a fit mode starts at the size it showed. */
export function stepZoom(direction: 1 | -1): void {
  const shown = useWorkspaceStore.getState().previewShown
  useSettingsStore.getState().setPreviewZoom(Math.round(shown / 10) * 10 + direction * 10)
}

/**
 * Captures the page and fractional point under `pivot` (or the viewport center by default)
 * so zooming can keep that exact spot pinned under the same viewport coordinates.
 */
export function captureZoomAnchor(
  scroller: HTMLElement,
  pages: readonly (HTMLElement | null)[],
  pivot?: { x: number; y: number },
): ZoomAnchor | null {
  if (scroller.clientWidth <= 0 || scroller.clientHeight <= 0) return null
  const box = scroller.getBoundingClientRect()
  const px = pivot ? pivot.x : scroller.clientWidth / 2
  const py = pivot ? pivot.y : scroller.clientHeight / 2

  let bestIndex = -1
  let bestRect: DOMRect | null = null
  let bestDist = Infinity
  for (let i = 0; i < pages.length; i++) {
    const el = pages[i]
    if (!el) continue
    const rect = el.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) continue
    const top = rect.top - box.top
    const bottom = rect.bottom - box.top
    if (top <= py && bottom >= py) {
      bestIndex = i
      bestRect = rect
      break
    }
    const dist = top > py ? top - py : py - bottom
    if (dist < bestDist) {
      bestDist = dist
      bestIndex = i
      bestRect = rect
    }
  }
  if (bestIndex < 0 || !bestRect) return null

  return {
    index: bestIndex,
    fx: (px - (bestRect.left - box.left)) / bestRect.width,
    fy: (py - (bestRect.top - box.top)) / bestRect.height,
    px,
    py,
  }
}

/** Adjusts the scroller so the previously captured page point returns to `(anchor.px, anchor.py)`. */
export function restoreZoomAnchor(
  scroller: HTMLElement,
  pages: readonly (HTMLElement | null)[],
  anchor: ZoomAnchor,
): void {
  const el = pages[anchor.index]
  if (!el) return
  const box = scroller.getBoundingClientRect()
  const rect = el.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return
  const curX = rect.left - box.left + anchor.fx * rect.width
  const curY = rect.top - box.top + anchor.fy * rect.height
  scroller.scrollLeft += curX - anchor.px
  scroller.scrollTop += curY - anchor.py
}
