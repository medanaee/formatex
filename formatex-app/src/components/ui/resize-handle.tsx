import { useRef, type KeyboardEvent, type PointerEvent } from "react"
import { cn } from "@/lib/utils"

interface ResizeHandleProps {
  /** Called with the pointer's x while dragging (client coordinates); the parent turns it into a size. */
  onDrag: (clientX: number) => void
  /** Called for arrow keys: -1 / +1 in the direction of the screen's left / right. */
  onNudge?: (direction: -1 | 1) => void
  label: string
  className?: string
}

/**
 * The thin bar between two panels. Drag it with the mouse or a finger; with the keyboard focus on it, the arrow keys move it.
 * Its hit area is wider than the line you see, so it is easy to grab.
 */
export function ResizeHandle({ onDrag, onNudge, label, className }: ResizeHandleProps) {
  const dragging = useRef(false)

  const down = (event: PointerEvent<HTMLDivElement>) => {
    dragging.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
  }
  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (dragging.current) onDrag(event.clientX)
  }
  const up = (event: PointerEvent<HTMLDivElement>) => {
    dragging.current = false
    event.currentTarget.releasePointerCapture(event.pointerId)
    document.body.style.cursor = ""
    document.body.style.userSelect = ""
  }
  const key = (event: KeyboardEvent) => {
    if (event.key === "ArrowLeft") onNudge?.(-1)
    else if (event.key === "ArrowRight") onNudge?.(1)
    else return
    event.preventDefault()
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      tabIndex={0}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onKeyDown={key}
      className={cn(
        "group relative z-10 w-px shrink-0 cursor-col-resize bg-border outline-none touch-none",
        "before:absolute before:inset-y-0 before:-inset-x-1.5 before:content-['']",
        "hover:bg-ring focus-visible:bg-ring active:bg-ring",
        className
      )}
    />
  )
}
