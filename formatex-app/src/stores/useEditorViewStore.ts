import type { EditorView } from "@codemirror/view"
import { create } from "zustand"

interface EditorViewState {
  /** The CodeMirror view of the file being edited (not the settings dialog's), for the format bar and undo / redo. */
  view: EditorView | null
  canUndo: boolean
  canRedo: boolean
  set: (patch: Partial<Pick<EditorViewState, "view" | "canUndo" | "canRedo">>) => void
}

/** A window from the toolbars onto the editor that has the focus of the page: its view and whether undo / redo have anything to do. */
export const useEditorViewStore = create<EditorViewState>()((set) => ({
  view: null,
  canUndo: false,
  canRedo: false,
  set: (patch) => set(patch),
}))
