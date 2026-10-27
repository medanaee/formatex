import { create } from "zustand"

interface WorkspaceState {
  /** The editor screen is on: the title bar shows its menus and panel switches. */
  active: boolean
  /** A narrow screen shows the editor or the preview; the files open as a panel above them. */
  tab: "edit" | "preview"
  filesSheet: boolean
  settingsOpen: boolean
  set: (patch: Partial<Omit<WorkspaceState, "set">>) => void
}

/** State of the editor screen that the title bar (outside of it) also reads and changes. Not stored: it starts fresh with each project. */
export const useWorkspaceStore = create<WorkspaceState>()((set) => ({
  active: false,
  tab: "edit",
  filesSheet: false,
  settingsOpen: false,
  set: (patch) => set(patch),
}))
