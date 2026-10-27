import { useSettingsStore } from "@/stores/useSettingsStore"
import { useWorkspaceStore } from "@/stores/useWorkspaceStore"

export const ZOOM_PRESETS = [50, 75, 100, 125, 150, 200, 300]

/** A step of zoom from what is drawn now, so a step out of a fit mode starts at the size it showed. */
export function stepZoom(direction: 1 | -1): void {
  const shown = useWorkspaceStore.getState().previewShown
  useSettingsStore.getState().setPreviewZoom(Math.round(shown / 10) * 10 + direction * 10)
}
