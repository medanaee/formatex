import { fileKindOf } from "@/lib/projects"
import { previewPlaceForLine } from "@/lib/editor/previewPlace"
import { useEditorStore } from "@/stores/useEditorStore"
import { useEditorViewStore } from "@/stores/useEditorViewStore"
import { usePreviewScrollStore } from "@/stores/usePreviewScrollStore"
import { useSettingsStore } from "@/stores/useSettingsStore"

/** The build that ends a pause this short is the end of a build chain; a longer gap means the next build is not coming. */
const SETTLE_MS = 80

/**
 * Scrolls the preview to the text being edited. It waits for the build that follows the typing: the pages shown before it do not
 * have the new text yet, and a preview that moves while it is rebuilt jumps back and forth. So nothing moves while a build runs
 * (or is about to start again); when the last one has ended, the cursor's line is looked up in the new pages and the preview
 * shows it (only if it is not already comfortably in view). It stays where it is when the user scrolled it by hand a moment ago,
 * when the build failed (the pages on screen are the old ones), or when the setting is off.
 */
export function startFollowingTyping(): () => void {
  let waiting = false
  let timer: ReturnType<typeof setTimeout> | undefined

  const follow = () => {
    waiting = false
    if (!useSettingsStore.getState().previewFollow || Date.now() < usePreviewScrollStore.getState().manualUntil) return
    const { activePath, texts, ok, lastEdit } = useEditorStore.getState()
    const view = useEditorViewStore.getState().view
    // Only the file that was typed in, while it is still the one shown
    if (!view || !ok || !activePath || activePath !== lastEdit?.path || fileKindOf(activePath) !== "markdown") return
    const source = texts[activePath]
    if (source === undefined || view.state.doc.toString() !== source) return
    const head = view.state.selection.main.head
    const line = view.state.doc.lineAt(head)
    const place = previewPlaceForLine(activePath, source, line.number, head - line.from)
    if (place && !place.approximate) usePreviewScrollStore.getState().show(place, false)
  }

  const stop = useEditorStore.subscribe((state, previous) => {
    if (state.lastEdit !== previous.lastEdit && state.lastEdit) {
      waiting = true
      clearTimeout(timer)
    }
    if (state.compileStatus === "compiling") clearTimeout(timer)
    else if (waiting && previous.compileStatus === "compiling") {
      clearTimeout(timer)
      timer = setTimeout(follow, SETTLE_MS)
    }
  })
  return () => {
    stop()
    clearTimeout(timer)
  }
}
