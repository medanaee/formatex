import { useEffect, useRef, type RefObject } from "react"

/** The value of `data-drop-folder` for the top level of the library. */
export const DROP_ROOT = "root"

const LONG_PRESS_MS = 380
const SLOP_PX = 10

interface TouchDragOptions {
  /** What the card stands for, and the name shown under the finger while it is dragged. */
  label: string
  /** The finger lifted on a drop place: a folder id, or `null` for the top level. */
  onDrop: (folder: string | null) => void
  /** The finger lifted without moving after the long press: show the card's menu. */
  onMenu: () => void
}

/**
 * Drag and drop for a finger. A long press arms the card (a short buzz); after that, moving the finger drags it (the page does not
 * scroll) and lifting it over an element with `data-drop-folder` drops it there; lifting it without having moved opens the card's
 * menu instead. A press that moves before the long press is a scroll and does nothing. A mouse is left to HTML5 drag and drop.
 * Touch events are used (not pointer events) because only they can be cancelled to stop the page from scrolling mid-gesture.
 */
export function useTouchDrag(ref: RefObject<HTMLElement | null>, options: TouchDragOptions): void {
  // The newest callbacks, so a render in the middle of a drag does not restart the gesture
  const latest = useRef(options)
  latest.current = options

  useEffect(() => {
    const card = ref.current
    if (!card) return
    let timer = 0
    let armed = false
    let moved = false
    let startX = 0
    let startY = 0
    let ghost: HTMLElement | null = null
    let over: Element | null = null

    const setOver = (next: Element | null) => {
      if (next === over) return
      over?.removeAttribute("data-drop-over")
      over = next
      over?.setAttribute("data-drop-over", "")
    }
    const reset = () => {
      window.clearTimeout(timer)
      ghost?.remove()
      ghost = null
      setOver(null)
      card.removeAttribute("data-armed")
      armed = false
      moved = false
    }

    const onStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return reset()
      const touch = event.touches[0]
      startX = touch.clientX
      startY = touch.clientY
      armed = false
      moved = false
      timer = window.setTimeout(() => {
        armed = true
        card.setAttribute("data-armed", "")
        navigator.vibrate?.(12)
      }, LONG_PRESS_MS)
    }

    const onMove = (event: TouchEvent) => {
      const touch = event.touches[0]
      const distance = Math.hypot(touch.clientX - startX, touch.clientY - startY)
      if (!armed) {
        // Moving before the long press is a scroll
        if (distance > SLOP_PX) window.clearTimeout(timer)
        return
      }
      event.preventDefault()
      if (!moved && distance > SLOP_PX) {
        moved = true
        ghost = document.createElement("div")
        ghost.textContent = latest.current.label
        ghost.dir = "auto"
        ghost.className = "pointer-events-none fixed z-[100] max-w-48 truncate rounded-lg border border-border bg-popover px-3 py-1.5 text-xs font-medium text-popover-foreground shadow-md"
        document.body.append(ghost)
      }
      if (ghost) {
        ghost.style.left = `${touch.clientX + 12}px`
        ghost.style.top = `${touch.clientY - 20}px`
        setOver(document.elementFromPoint(touch.clientX, touch.clientY)?.closest("[data-drop-folder]") ?? null)
      }
    }

    const onEnd = (event: TouchEvent) => {
      window.clearTimeout(timer)
      if (armed) {
        // No click after this: the card is not opened by the finger that just dragged or asked for the menu
        event.preventDefault()
        if (moved) {
          const target = over?.getAttribute("data-drop-folder")
          if (target !== null && target !== undefined) latest.current.onDrop(target === DROP_ROOT ? null : target)
        } else latest.current.onMenu()
      }
      reset()
    }

    card.addEventListener("touchstart", onStart, { passive: true })
    card.addEventListener("touchmove", onMove, { passive: false })
    card.addEventListener("touchend", onEnd, { passive: false })
    card.addEventListener("touchcancel", reset)
    return () => {
      reset()
      card.removeEventListener("touchstart", onStart)
      card.removeEventListener("touchmove", onMove)
      card.removeEventListener("touchend", onEnd)
      card.removeEventListener("touchcancel", reset)
    }
  }, [ref])
}
