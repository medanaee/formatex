import defaultConfig from "../../../engine/config.toml?raw"
import starterMain from "../../../templates/main.md?raw"
import { isTauri } from "@/lib/platform"
import { useLibraryStore } from "@/stores/useLibraryStore"
import { FolderProjectFs } from "./folderProjectFs"
import { sourceOf } from "./configSource"
import { CONFIG_FILE, DEFAULT_MAIN_FILE, IGNORED_DIRS } from "./paths"
import type { ProjectFs } from "./types"
import { WebProjectFs } from "./webProjectFs"

export * from "./paths"
export * from "./configSource"
export type { ProjectFs } from "./types"

/** The default `config.toml` of a new project (the engine's own, pointing at `main.md`). */
export const DEFAULT_CONFIG = defaultConfig

/** The folder of the user's a project keeps its files in, registered for the native compiler too; `null` for the app's own storage. */
export async function projectLocation(projectId: string): Promise<string | null> {
  const location = useLibraryStore.getState().documents.find((doc) => doc.id === projectId)?.location ?? null
  if (!location || !isTauri()) return null
  const { invoke } = await import("@tauri-apps/api/core")
  // The access to the folder lasts as long as the app runs, so it is asked for again each time a project is opened
  await invoke("project_set_root", { projectId, root: location })
  return location
}

/** The files of a project: real files in the app (in its own storage or in the folder the user chose), localStorage in a browser. */
export async function openProjectFs(projectId: string): Promise<ProjectFs> {
  if (isTauri()) {
    const { TauriProjectFs } = await import("./tauriProjectFs")
    const location = await projectLocation(projectId)
    if (location) return new FolderProjectFs(new TauriProjectFs(projectId, { root: location, ignore: IGNORED_DIRS }))
    return new TauriProjectFs(projectId)
  }
  return new WebProjectFs(projectId)
}

/** The Markdown file a project typesets: the `source` of its `config.toml`, read from disk (`null` when there is none). */
export async function projectMainFile(projectId: string): Promise<string | null> {
  try {
    const fs = await openProjectFs(projectId)
    return sourceOf(await fs.readText(CONFIG_FILE))?.path || null
  } catch {
    return null
  }
}

/** Creates the files of a new project: config.toml, a starter document and an `images` folder. */
export async function initProject(projectId: string): Promise<void> {
  const fs = await openProjectFs(projectId)
  await fs.createDir("images")
  await fs.writeText(CONFIG_FILE, DEFAULT_CONFIG)
  await fs.writeText(DEFAULT_MAIN_FILE, starterMain)
}

/** Deletes every file of a project. */
export async function deleteProjectFiles(projectId: string): Promise<void> {
  if (isTauri()) {
    const { remove, BaseDirectory } = await import("@tauri-apps/plugin-fs")
    try {
      await remove(`documents/${projectId}`, { baseDir: BaseDirectory.AppData, recursive: true })
    } catch {
      // Already gone
    }
  } else {
    try {
      localStorage.removeItem(`formatex_web_project_${projectId}`)
    } catch {
      // No storage
    }
  }
}

/** Copies every file of a project into another project (a duplicate): folders first, then the files. */
export async function copyProjectFiles(fromId: string, toId: string): Promise<void> {
  const from = await openProjectFs(fromId)
  const to = await openProjectFs(toId)
  const entries = await from.list()
  for (const entry of entries.filter((item) => item.kind === "dir")) await to.createDir(entry.path)
  for (const entry of entries.filter((item) => item.kind === "file")) await to.writeBytes(entry.path, await from.readBytes(entry.path))
}
