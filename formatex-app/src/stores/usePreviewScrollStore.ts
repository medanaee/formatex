import { create } from "zustand"
import type { PreviewPlace } from "@/lib/editor/previewLookup"

/** After the user scrolls the preview by hand, typing leaves it where it is for this long. */
export const MANUAL_SCROLL_PAUSE_MS = 4000

export interface PreviewTarget extends Pick<PreviewPlace, "page" | "y" | "h"> {
  /** Changes with every request, so the same place can be asked for twice. */
  id: number
  /** The preview draws attention to the place: the user asked for it (the editor's menu), it was not just following the text. */
  flash: boolean
}

interface PreviewScrollState {
  /** The place the preview is asked to show; the pane applies it when it can (it may be hidden or still building). */
  target: PreviewTarget | null
  /** Until when the preview was scrolled by hand recently (epoch ms). */
  manualUntil: number
  show: (place: Pick<PreviewPlace, "page" | "y" | "h">, flash: boolean) => void
  /** The user scrolled the preview: following waits, and a place not yet shown is dropped. */
  manualScroll: () => void
}

let counter = 0

/** A line between the editor (which knows the cursor) and the preview (which knows its scroll), as neither owns the other. */
export const usePreviewScrollStore = create<PreviewScrollState>()((set) => ({
  target: null,
  manualUntil: 0,
  show: (place, flash) => set({ target: { page: place.page, y: place.y, h: place.h, id: ++counter, flash } }),
  manualScroll: () => set((state) => ({ manualUntil: Date.now() + MANUAL_SCROLL_PAUSE_MS, target: state.target && !state.target.flash ? null : state.target })),
}))
