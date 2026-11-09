import { create } from "zustand"

interface WorkspaceState {
  /** The editor screen is on: the title bar shows its menus and panel switches. */
  active: boolean
  /** A narrow screen shows the editor or the preview; the files open as a panel above them. */
  tab: "edit" | "preview"
  filesSheet: boolean
  /** The zoom of the preview pages in percent as drawn now, whatever the mode (a fit mode is a percent too). */
  previewShown: number
  /** The dialog that moves the project between the storage of the app and a folder of the user. */
  storageDialog: "toFolder" | "toLocal" | null
  /** The dialog of the HTML export (an experiment) with its settings. */
  htmlDialog: boolean
  /** What the preview pane shows: the typeset pages, or the live HTML page (built from the same text, with the `[html]` settings of config.toml). */
  previewMode: "pages" | "html"
  set: (patch: Partial<Omit<WorkspaceState, "set">>) => void
}

/** State of the editor screen that the title bar (outside of it) also reads and changes. Not stored: it starts fresh with each project. */
export const useWorkspaceStore = create<WorkspaceState>()((set) => ({
  active: false,
  tab: "edit",
  filesSheet: false,
  previewShown: 100,
  storageDialog: null,
  htmlDialog: false,
  previewMode: "pages",
  set: (patch) => set(patch),
}))
