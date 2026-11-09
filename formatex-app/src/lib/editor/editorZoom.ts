import type { Extension } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { useSettingsStore } from "@/stores/useSettingsStore"

export const EDITOR_ZOOM_MIN = 50
export const EDITOR_ZOOM_MAX = 300
const STEP = 10

/** One step of the code editor's zoom (the View menu, Ctrl + plus / minus, Ctrl + wheel). */
export function stepEditorZoom(direction: 1 | -1): void {
  const { editorZoom, setEditorZoom } = useSettingsStore.getState()
  setEditorZoom(editorZoom + direction * STEP)
}

export const resetEditorZoom = (): void => useSettingsStore.getState().setEditorZoom(100)

/**
 * Ctrl (or Cmd) with plus, minus or 0 zooms the code, and so does Ctrl with the wheel. The keys are read by their place on the keyboard
 * (`event.code`), so they work with a Persian layout too.
 */
export function editorZoomShortcuts(): Extension {
  return EditorView.domEventHandlers({
    keydown(event) {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return false
      if (event.code === "Equal" || event.code === "NumpadAdd") stepEditorZoom(1)
      else if (event.code === "Minus" || event.code === "NumpadSubtract") stepEditorZoom(-1)
      else if (event.code === "Digit0" || event.code === "Numpad0") resetEditorZoom()
      else return false
      event.preventDefault()
      return true
    },
    wheel(event) {
      if (!event.ctrlKey) return false
      event.preventDefault()
      stepEditorZoom(event.deltaY < 0 ? 1 : -1)
      return true
    },
  })
}
