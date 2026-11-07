import { isTauri } from "@/lib/platform"
import { CONFIG_FILE, FORMATEX_CONFIG, FORMATEX_DIR } from "./paths"

/** What the app tells about a project kept in a folder of the user's: the paths (project-relative) that changed, and whether the list of files did. */
export interface ProjectChange {
  projectId: string
  paths: string[]
  structural: boolean
}

/**
 * Watches the folder of a project, so a change made from outside the app (another editor, git, a sync tool) shows in it. `onChange`
 * gets the changes of a moment together. Returns the function that stops watching. Only the native app can watch.
 */
export async function watchProject(projectId: string, onChange: (change: ProjectChange) => void): Promise<() => void> {
  if (!isTauri()) return () => undefined
  const [{ listen }, { invoke }] = await Promise.all([import("@tauri-apps/api/event"), import("@tauri-apps/api/core")])
  const unlisten = await listen<ProjectChange>("project-changed", (event) => {
    if (event.payload.projectId === projectId) onChange(event.payload)
  })
  try {
    await invoke("project_watch", { projectId })
  } catch (error) {
    unlisten()
    throw error
  }
  return () => {
    unlisten()
    void invoke("project_unwatch", { projectId }).catch(() => undefined)
  }
}

/**
 * Whether a text read from disk looks like the loss of a text the editor holds: it is empty while the editor's is not, or less than half
 * as long. A file really emptied from outside looks the same as one read in the middle of a write, so the editor keeps its own text to
 * restore whenever it replaces one with a text like this.
 */
export function shrankSuspiciously(held: string, onDisk: string): boolean {
  if (held.trim() === "") return false
  return onDisk.trim() === "" || onDisk.length < held.length / 2
}

/** The number of lines of a text, for telling two versions apart (an empty text has none). */
export const lineCount = (text: string): number => (text === "" ? 0 : text.split("\n").length)

/** The paths of a change as the editor names them: the config of a folder project is `config.toml`, and the rest of `.formatex` is not the project's. */
export function editorPaths(paths: readonly string[]): string[] {
  const out: string[] = []
  for (const path of paths) {
    if (path === FORMATEX_CONFIG) out.push(CONFIG_FILE)
    else if (path !== FORMATEX_DIR && !path.startsWith(`${FORMATEX_DIR}/`)) out.push(path)
  }
  return [...new Set(out)]
}
