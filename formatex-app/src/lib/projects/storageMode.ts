import { isTauri } from "@/lib/platform"
import { useLibraryStore } from "@/stores/useLibraryStore"
import { FolderProjectFs } from "./folderProjectFs"
import { DEFAULT_CONFIG, deleteProjectFiles, openProjectFs } from "./index"
import { sourceOf, withSource } from "./configSource"
import { CONFIG_FILE, DEFAULT_MAIN_FILE, FORMATEX_DIR, IGNORED_DIRS, type FsEntry } from "./paths"
import { configForCopy, destinations, markdownFiles, planMove, type MovePlan, type Resolution } from "./storagePlan"
import starterMain from "../../../templates/main.md?raw"
import type { ProjectFs } from "./types"

/** Folders of the user's as the app's storage mode: the dialog, the folder as a project, and moving a project either way. Desktop only. */

/** Whether a project can be kept in a folder of the user's here (the native app on a desktop). */
export const canUseFolders = (): boolean => isTauri()

/** The native "choose a folder" dialog; `null` when it is cancelled. */
export async function pickFolder(): Promise<string | null> {
  const { open } = await import("@tauri-apps/plugin-dialog")
  const chosen = await open({ directory: true, multiple: false })
  return typeof chosen === "string" ? chosen : null
}

/** Shows the folder in the file manager of the system. */
export async function revealFolder(path: string): Promise<void> {
  const { revealItemInDir } = await import("@tauri-apps/plugin-opener")
  await revealItemInDir(path)
}

export const folderName = (path: string): string => path.replace(/[\\/]+$/, "").split(/[\\/]/).pop() ?? path

async function rawFolderFs(projectId: string, root: string): Promise<ProjectFs> {
  const { TauriProjectFs } = await import("./tauriProjectFs")
  return new TauriProjectFs(projectId, { root, ignore: IGNORED_DIRS })
}

async function setRoot(projectId: string, root: string | null): Promise<void> {
  const { invoke } = await import("@tauri-apps/api/core")
  await invoke("project_set_root", { projectId, root })
}

/** Runs `work` with the folder open for the file plugin (the dialog does not always grant it), and closes it again. */
async function withAccess<T>(root: string, work: () => Promise<T>): Promise<T> {
  await setRoot("scan", root)
  try {
    return await work()
  } finally {
    await setRoot("scan", null).catch(() => {})
  }
}

/** What a folder holds before it becomes a project: its files (as the project would list them) and whether it is one already. */
export async function scanFolder(root: string): Promise<{ files: FsEntry[]; isProject: boolean; markdown: string[] }> {
  return withAccess(root, async () => {
    const raw = await rawFolderFs("scan", root)
    const isProject = await raw.exists(`${FORMATEX_DIR}/${CONFIG_FILE}`)
    const files = (await raw.list()).filter((entry) => entry.path.split("/")[0] !== FORMATEX_DIR)
    return { files, isProject, markdown: markdownFiles(files) }
  })
}

/**
 * Makes a folder a Formatex project: `.formatex/config.toml` with the defaults and `source` set to `mainFile`; a starter document
 * when it is a new one. A folder that is a project already is left as it is. Nothing of the user's own files is changed.
 */
export async function initFolderProject(projectId: string, mainFile: string | null): Promise<string> {
  const fs = await openProjectFs(projectId)
  if (await fs.exists(CONFIG_FILE)) return sourceOf(await fs.readText(CONFIG_FILE))?.path ?? ""
  const main = mainFile ?? DEFAULT_MAIN_FILE
  await fs.writeText(CONFIG_FILE, withSource(DEFAULT_CONFIG, main))
  if (!mainFile) await fs.writeText(main, starterMain)
  return main
}

/** What the local project will copy to the folder, and what would be replaced: for the dialog that asks. */
export async function planToFolder(projectId: string, root: string): Promise<{ plan: MovePlan; target: FsEntry[] }> {
  const local = await localFs(projectId)
  const scan = await scanFolder(root)
  const existing = scan.isProject ? [...scan.files, { path: CONFIG_FILE, kind: "file" as const }] : scan.files
  return { plan: planMove(await local.list(), existing), target: existing }
}

async function localFs(projectId: string): Promise<ProjectFs> {
  const { TauriProjectFs } = await import("./tauriProjectFs")
  return new TauriProjectFs(projectId)
}

async function copyFiles(from: ProjectFs, to: ProjectFs, plan: MovePlan, where: Map<string, string>): Promise<void> {
  for (const dir of plan.dirs) await to.createDir(dir)
  for (const [path, destination] of where) await to.writeBytes(destination, await from.readBytes(path))
}

/**
 * A project in the app's storage moves into a folder of the user's: its files are copied there (`config.toml` into `.formatex/`),
 * then the project points at the folder and the app's own copy is deleted. Nothing is deleted unless every copy succeeded.
 */
export async function moveToFolder(projectId: string, root: string, answers: Record<string, Resolution>): Promise<void> {
  const local = await localFs(projectId)
  await setRoot(projectId, root)
  try {
    const target = new FolderProjectFs(await rawFolderFs(projectId, root))
    const { plan, target: existing } = await planToFolder(projectId, root)
    await copyFiles(local, target, plan, destinations(plan, existing, answers))
  } catch (error) {
    await setRoot(projectId, null)
    throw error
  }
  useLibraryStore.getState().setLocation(projectId, root)
  await deleteProjectFiles(projectId)
}

/** The files of a project kept in a folder, as the dialog that chooses what to copy lists them. */
export async function listFolderProject(projectId: string): Promise<FsEntry[]> {
  return ownFiles(await (await openProjectFs(projectId)).list())
}

/** The user's own files of a folder project: not the config (it always goes along) nor anything of `.formatex`. */
const ownFiles = (entries: readonly FsEntry[]): FsEntry[] => entries.filter((entry) => !entry.alias && entry.path.split("/")[0] !== FORMATEX_DIR)

/**
 * A project kept in a folder moves into the app's storage: the chosen files (and always `config.toml`) are copied, and the
 * project points at the app again. The folder itself is not touched.
 */
export async function moveToLocal(projectId: string, selected: ReadonlySet<string>): Promise<void> {
  const from = await openProjectFs(projectId)
  const entries = ownFiles(await from.list())
  const to = await localFs(projectId)
  const plan = planMove(entries, [], new Set([...selected].filter((path) => path !== CONFIG_FILE)))
  await copyFiles(from, to, plan, new Map(plan.files.map((path) => [path, path])))
  const config = (await from.exists(CONFIG_FILE)) ? await from.readText(CONFIG_FILE) : DEFAULT_CONFIG
  await to.writeText(CONFIG_FILE, configForCopy(config, new Set(plan.files)))
  useLibraryStore.getState().setLocation(projectId, null)
  await setRoot(projectId, null)
}
