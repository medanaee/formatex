import { create } from "zustand"
import { imageFolder, nextImageName, readableImage } from "@/lib/files/pastedImage"
import { pasteSystemFiles } from "@/lib/files/systemClipboard"
import type { HtmlExportOptions } from "@/lib/projects/htmlConfig"
import { CompilerUnavailableError, compileProject, exportHtml, exportPdf, syncRemote, type Diagnostic, type PageMap, type SourceMarker } from "@/lib/compiler"
import type { RevealRequest } from "@/components/editor/CodeEditor"
import { planSave, zipItems } from "@/lib/files/saveEntries"
import { saveBytes } from "@/lib/files/saveFile"
import { strToU8 } from "fflate"
import {
  CONFIG_FILE,
  FORMATEX_CONFIG,
  fileKindOf,
  initProject,
  isTextKind,
  joinPath,
  baseName,
  openProjectFs,
  parentOf,
  isReservedPath,
  RESERVED_ROOTS,
  CACHE_DIRS,
  sourceOf,
  uniqueName,
  withSource,
  type FsEntry,
  type ProjectFs,
} from "@/lib/projects"
import { componentsApi } from "@/lib/components/api"
import type { ProjectKind } from "@/lib/db/types"
import { changeProjectKind, initTypstProject, TYPST_MAIN_FILE } from "@/lib/projects/projectKind"
import { editorPaths, shrankSuspiciously, watchProject, type ProjectChange } from "@/lib/projects/watch"
import { isDesktopApp } from "@/lib/platform"
import { useLibraryStore } from "@/stores/useLibraryStore"
import { useSchemaStore } from "@/stores/useSchemaStore"

/** Typing is saved after a pause. The preview does not wait for the save: it is rebuilt from the editor's text after a short pause. */
const SAVE_DELAY_MS = 400
const COMPILE_DELAY_MS = 120

export type SaveState = "saved" | "saving" | "error"
export type CompileStatus = "idle" | "compiling" | "unavailable"
export type ExportStatus = "idle" | "working" | "done" | "error"

interface EditorState {
  projectId: string | null
  /** The Markdown file that is typeset: the `source` of config.toml (`""` when it names none). Follows config.toml; never set by hand. */
  mainFile: string
  /** Every file and folder of the project, in display order. */
  files: FsEntry[]
  /** Files that changed outside the app while the editor has typing of its own waiting to be saved: the text on disk, until the user chooses. */
  conflicts: Record<string, string>
  /** The text the editor had before it was replaced by one from disk that looked like a loss (empty, or much shorter), to put back. */
  replaced: Record<string, string>
  /** What the open project is: a Formatex project, or plain Typst (no engine, no `config.toml`; the main file is kept by the app). */
  kind: ProjectKind
  /** The file shown in the editor. */
  activePath: string | null
  /** Text of the files that were opened. */
  texts: Record<string, string>
  saveState: SaveState
  compileStatus: CompileStatus
  /** The pages of the last successful compilation; kept while a later one fails, so the preview does not blank out. */
  pages: { hash: string; svg: string; map: PageMap | null }[]
  diagnostics: Diagnostic[]
  /** Where each block of the source starts on `pages` (from the same build). */
  markers: SourceMarker[]
  ok: boolean
  elapsedMs: number | null
  exportStatus: ExportStatus
  exportMessage: string | null
  /** The sync of the files from the internet (the button beside Export). */
  syncStatus: ExportStatus
  syncMessage: string | null
  /** The place a click on a problem asked the editor to show. */
  reveal: RevealRequest | null
  /** The file the user last changed the text of; the preview follows it once rebuilt. */
  lastEdit: { path: string; id: number } | null
  /** Files copied or cut in the tree, waiting for a paste. */
  clipboard: { paths: string[]; mode: "copy" | "cut" } | null

  open: (projectId: string) => Promise<void>
  close: () => Promise<void>
  select: (path: string) => Promise<void>
  revealAt: (path: string, line: number, column: number) => Promise<void>
  edit: (path: string, text: string) => void
  /** Makes sure a file's text is loaded (the settings dialog reads config.toml this way). */
  load: (path: string) => Promise<string>
  compile: () => void
  createFile: (parent: string, name: string, text?: string) => Promise<string>
  createFolder: (parent: string, name: string) => Promise<void>
  rename: (path: string, newName: string) => Promise<void>
  remove: (path: string) => Promise<void>
  /** Deletes several files and folders at once (the main file and config.toml stay). */
  removeMany: (paths: string[]) => Promise<void>
  /** Moves files and folders into a folder (`""` is the project root). Returns the new paths. */
  moveEntries: (paths: string[], targetDir: string) => Promise<string[]>
  /** Copies files and folders into a folder. Returns the new paths. */
  copyEntries: (paths: string[], targetDir: string) => Promise<string[]>
  setClipboard: (paths: string[], mode: "copy" | "cut") => void
  /** Pastes the clipboard into a folder: a copy stays in the clipboard, a cut is moved once. */
  paste: (targetDir: string) => Promise<string[]>
  /** Files and folders copied in the system's file manager, pasted into a folder of the project (desktop app). Returns their new paths. */
  pasteSystemFiles: (targetDir: string) => Promise<string[]>
  /** Keeps an image from the clipboard in the project's image folder as `image_<n>.<ext>`; returns its path (`null`: not an image Typst can read). */
  addImage: (image: Blob) => Promise<string | null>
  importFiles: (parent: string, files: { name: string; data: Uint8Array }[]) => Promise<string[]>
  /** Adds files with the folders they come in (a dropped folder): `path` is relative to `parent`. Returns the new top-level paths. */
  importTree: (parent: string, files: { path: string; data: Uint8Array }[]) => Promise<string[]>
  /** Saves files and folders out of the project: a single file as it is, anything else as a ZIP, with the Save dialog. */
  saveEntries: (paths: string[]) => Promise<void>
  /** Makes a file the one to typeset: written as the `source` of config.toml in a Formatex project, kept by the app in a plain Typst one (`""`: none). */
  setMainFile: (path: string) => void
  /** Changes what the project is (see `changeProjectKind`) and opens it again. */
  switchKind: (kind: ProjectKind) => Promise<void>
  /** Settles a file that changed outside the app while the editor had typing of its own: load what is on disk, or keep the text of the editor. */
  resolveConflict: (path: string, loadFromDisk: boolean) => void
  /** Puts back the text the editor had before a text from disk replaced it (`dismiss`: keep what is there). */
  restoreReplaced: (path: string, restore: boolean) => void
  exportPdf: () => Promise<void>
  /** The project as one HTML file, with the choices of the export dialog (an experiment). */
  /** Writes the project as one HTML file with these options (the dialog starts them from `[html]` of config.toml). */
  exportHtml: (options: HtmlExportOptions) => Promise<void>
  /** Downloads the files from the internet that the project keeps in its cache again (all, or only `url`), then typesets. */
  syncRemote: (url?: string) => Promise<void>
}

// Per-project machinery that does not belong in reactive state
let fs: ProjectFs | null = null
const pendingSaves = new Map<string, ReturnType<typeof setTimeout>>()
let compileTimer: ReturnType<typeof setTimeout> | undefined
let compiling = false
let compileAgain = false
let session = 0
/** Stops the watcher of a project kept in a folder of the user's. */
let stopWatching: (() => void) | null = null
/** What the editor last wrote to each file: a change on disk that is only this is the app's own write, not a change from outside. */
const written = new Map<string, string>()
/**
 * Files the editor is writing, or wrote a moment ago. Writing a file is several events on disk, the first of them with the file
 * empty or half written: reading it then would be reading the app's own write as a change from outside.
 */
const writing = new Map<string, ReturnType<typeof setTimeout>>()
const WRITE_SETTLE_MS = 600

/** Marks the editor as writing `path` until a moment after it is done. */
function startWriting(path: string): void {
  clearTimeout(writing.get(path))
  writing.set(path, setTimeout(() => writing.delete(path), 60_000))
}
function doneWriting(path: string): void {
  clearTimeout(writing.get(path))
  writing.set(path, setTimeout(() => writing.delete(path), WRITE_SETTLE_MS))
}

/** A file read twice with a pause between: the text only when both reads agree (the file was not being written), else `null`. */
async function stableRead(read: () => Promise<string>): Promise<string | null> {
  const first = await read()
  await new Promise((resolve) => setTimeout(resolve, 150))
  return (await read()) === first ? first : null
}
/** What the schema of the open project was last read from: `config.toml`, the front matter and the open `.typ` files. */
let schemaSignature = ""

/** Does a text set `components` (in config.toml, or in the front matter at the top of a Markdown file)? */
const declaresComponents = (text: string): boolean => /^\s*components\s*[:=]/m.test(text)
const frontMatterOf = (text: string): string => /^\uFEFF?---[ \t]*\r?\n([\s\S]*?\r?\n)?---/.exec(text)?.[0] ?? ""

/** Drops the paths that lie inside another path of the list (a folder already carries its content). */
const topLevel = (paths: string[]): string[] => paths.filter((path) => !paths.some((other) => other !== path && path.startsWith(`${other}/`)))

const errorDiagnostic = (message: string): Diagnostic => ({ severity: "error", message, path: null, line: null, column: null, hints: [] })
const configProblem = (message: string, line: number | null): Diagnostic => ({ severity: "error", message, path: CONFIG_FILE, line, column: line ? 1 : null, hints: [] })

export const useEditorStore = create<EditorState>()((set, get) => {
  const touch = () => {
    const id = get().projectId
    if (id) useLibraryStore.getState().touch(id)
  }

  const refreshFiles = async () => {
    if (fs) set({ files: await fs.list() })
  }

  async function save(path: string): Promise<void> {
    const text = get().texts[path]
    if (!fs || text === undefined) return
    const current = session
    // What is being written is known before it is, and the events of the write are the app's own, not a change from outside
    written.set(path, text)
    startWriting(path)
    try {
      await fs.writeText(path, text)
      doneWriting(path)
      if (current !== session) return
      if (pendingSaves.size === 0) set({ saveState: "saved" })
      touch()
    } catch (error) {
      doneWriting(path)
      console.error("[formatex] could not save", path, error)
      if (current === session) set({ saveState: "error" })
    }
  }

  async function flush(): Promise<void> {
    const paths = [...pendingSaves.keys()]
    for (const path of paths) clearTimeout(pendingSaves.get(path))
    pendingSaves.clear()
    await Promise.all(paths.map(save))
  }

  /**
   * The file to typeset is whatever `source` of config.toml names, as for the engine on the command line (there is no file with a
   * special name). Reads it (from the editor's text of config.toml, else the file), loads that file's text, and returns what is wrong:
   * no `source`, or a file that is not in the project.
   */
  async function resolveMain(): Promise<Diagnostic | null> {
    // Plain Typst: the app keeps the main file; none chosen is fine (nothing is built)
    if (get().kind === "typst") {
      const { mainFile } = get()
      if (!mainFile) return null
      if (!get().files.some((file) => file.kind === "file" && file.path === mainFile)) return errorDiagnostic(`The main file "${mainFile}" is not a file of the project`)
      if (isTextKind(fileKindOf(mainFile))) await get().load(mainFile)
      return null
    }
    const config = await get().load(CONFIG_FILE).catch(() => "")
    const found = sourceOf(config)
    const main = found?.path ?? ""
    const { projectId, mainFile } = get()
    if (main !== mainFile) {
      set({ mainFile: main })
      if (projectId && main) useLibraryStore.getState().setMainFile(projectId, main)
    }
    if (!found) return configProblem('config.toml has no `source`: the Markdown file to typeset, for example source = "main.md"', null)
    if (!main) return configProblem("`source` in config.toml is empty: write the path of the Markdown file to typeset", found.line)
    if (!get().files.some((file) => file.kind === "file" && file.path === main)) return configProblem(`\`source\` in config.toml names "${main}", which is not a file of the project`, found.line)
    if (isTextKind(fileKindOf(main))) await get().load(main)
    return null
  }

  /**
   * A change made from outside the app in the folder of the project. The list of files is read again when it changed; an open file takes
   * the text on disk, unless that is only what the editor wrote itself, or the editor has typing waiting to be saved (then the user
   * chooses); a file the document may use changed: it is built again.
   */
  async function onExternal(change: ProjectChange, current: number): Promise<void> {
    if (!fs || current !== session) return
    const paths = editorPaths(change.paths)
    if (paths.length === 0) return
    if (change.structural) await refreshFiles()
    if (current !== session) return
    let changed = change.structural
    for (const path of paths) {
      const open = get().texts[path]
      if (open === undefined) {
        changed = true
        continue
      }
      // The app is writing this file, or just did: its own events
      if (writing.has(path)) continue
      if (!get().files.some((file) => file.kind === "file" && file.path === path)) {
        // The file that was open is gone
        clearTimeout(pendingSaves.get(path))
        pendingSaves.delete(path)
        written.delete(path)
        set((state) => {
          const texts = { ...state.texts }
          delete texts[path]
          return { texts, activePath: state.activePath === path ? null : state.activePath }
        })
        changed = true
        continue
      }
      // Only a text that stays the same while it is read twice is taken: a file in the middle of someone's write is not a change yet
      const disk = await stableRead(() => (fs ? fs.readText(path) : Promise.resolve(""))).catch(() => null)
      if (current !== session || writing.has(path)) continue
      if (disk === null) {
        // Still changing: look again once it is quiet
        setTimeout(() => void onExternal({ projectId: change.projectId, paths: [path], structural: false }, current), 400)
        continue
      }
      if (disk === open || disk === written.get(path)) continue
      if (pendingSaves.has(path)) {
        set((state) => ({ conflicts: { ...state.conflicts, [path]: disk } }))
        continue
      }
      // A text that looks like a loss replaces the editor's only with a way back
      if (shrankSuspiciously(open, disk)) set((state) => ({ replaced: { ...state.replaced, [path]: open } }))
      written.set(path, disk)
      set((state) => ({ texts: { ...state.texts, [path]: disk } }))
      changed = true
    }
    if (get().activePath === null && get().files.length > 0) {
      const first = get().files.find((file) => file.kind === "file" && file.path === get().mainFile) ?? get().files.find((file) => file.kind === "file" && isTextKind(fileKindOf(file.path)))
      if (first) await get().select(first.path).catch(() => undefined)
    }
    if (changed && current === session) get().compile()
  }

  /**
   * Autocomplete knows the tags of the components the project lists in `components`: the schema is read again when what it depends on
   * (the settings, the front matter, a component file) changed. A project that lists none uses the library's schema.
   */
  async function syncProjectSchema(projectId: string, main: string, current: number): Promise<void> {
    const texts = get().texts
    const config = texts[CONFIG_FILE] ?? (await get().load(CONFIG_FILE).catch(() => ""))
    const front = frontMatterOf(texts[main] ?? "")
    const schemas = useSchemaStore.getState()
    if (!declaresComponents(config) && !declaresComponents(front)) {
      schemaSignature = ""
      if (schemas.project) schemas.setProject(null)
      return
    }
    const signature = [config, front, ...Object.keys(texts).filter((path) => path.endsWith(".typ")).sort().map((path) => `${path}\n${texts[path]}`)].join("\u0000")
    if (signature === schemaSignature && schemas.project) return
    schemaSignature = signature
    try {
      const project = await componentsApi.projectSchema(projectId, main, get().texts)
      if (current === session && project) useSchemaStore.getState().setProject(project)
    } catch (error) {
      console.warn("[formatex] could not read the schema of the project", error)
    }
  }

  async function runCompile(): Promise<void> {
    const { projectId } = get()
    if (!projectId) return
    if (compiling) {
      compileAgain = true
      return
    }
    compiling = true
    const current = session
    set({ compileStatus: "compiling" })
    try {
      const problem = await resolveMain()
      if (current !== session) return
      if (problem) {
        // The pages on screen stay: only the problem is new
        set({ compileStatus: "idle", ok: false, diagnostics: [problem] })
        return
      }
      const { mainFile, kind } = get()
      // Plain Typst with no main file chosen: there is nothing to build
      if (kind === "typst" && !mainFile) {
        set({ compileStatus: "idle", ok: true, diagnostics: [], pages: [], markers: [], elapsedMs: null })
        return
      }
      const before = get().pages
      const output = await compileProject(projectId, mainFile, { overrides: get().texts, known: before.map((page) => page.hash), kind })
      if (current !== session) return
      if (kind === "formatex") void syncProjectSchema(projectId, mainFile, current)
      set((state) => ({
        compileStatus: "idle",
        // A page the compiler did not resend is unchanged: keep it (and its image) as it is
        pages: output.ok ? output.pages.map((page, index) => (page.svg !== null ? { hash: page.hash, svg: page.svg, map: page.map } : before[index])) : state.pages,
        diagnostics: output.diagnostics,
        markers: output.ok ? output.markers : state.markers,
        ok: output.ok,
        elapsedMs: output.elapsedMs,
      }))
      // A compile that downloaded or copied a file made the cache folder: the file tree shows it
      const { texts, files } = get()
      if (!CACHE_DIRS.some((dir) => files.some((file) => file.path === dir)) && Object.values(texts).some((text) => /(https?|file):\/\//.test(text))) await refreshFiles()
    } catch (error) {
      if (current !== session) return
      if (error instanceof CompilerUnavailableError) set({ compileStatus: "unavailable" })
      else set({ compileStatus: "idle", ok: false, diagnostics: [errorDiagnostic(String((error as Error)?.message ?? error))] })
    } finally {
      compiling = false
      if (compileAgain) {
        compileAgain = false
        void runCompile()
      }
    }
  }

  /** Moves a file or folder and keeps the open buffers, the active file and the main file pointing at it. */
  async function relocate(from: string, to: string): Promise<void> {
    if (!fs || from === to) return
    await fs.rename(from, to)
    const mainBefore = get().mainFile
    const move = (candidate: string) => (candidate === from ? to : candidate.startsWith(`${from}/`) ? to + candidate.slice(from.length) : candidate)
    set((state) => ({
      texts: Object.fromEntries(Object.entries(state.texts).map(([key, text]) => [move(key), text])),
      activePath: state.activePath ? move(state.activePath) : null,
      mainFile: move(state.mainFile),
    }))
    // The main file is named in config.toml: when it moved, the name there moves with it (a plain Typst project keeps it in the app)
    const { projectId, mainFile } = get()
    if (mainFile !== mainBefore && get().kind === "typst") {
      if (projectId) useLibraryStore.getState().setMainFile(projectId, mainFile)
    } else if (mainFile !== mainBefore) {
      const config = withSource(await get().load(CONFIG_FILE).catch(() => ""), mainFile)
      set((state) => ({ texts: { ...state.texts, [CONFIG_FILE]: config } }))
      await fs.writeText(CONFIG_FILE, config)
      if (projectId) useLibraryStore.getState().setMainFile(projectId, mainFile)
    }
  }

  /** Copies a file, or a folder with everything in it. */
  async function copyTree(from: string, to: string): Promise<void> {
    if (!fs) return
    const entry = get().files.find((file) => file.path === from)
    if (entry?.kind === "dir") {
      await fs.createDir(to)
      for (const child of get().files.filter((file) => file.path.startsWith(`${from}/`))) {
        const target = to + child.path.slice(from.length)
        if (child.kind === "dir") await fs.createDir(target)
        else await fs.writeBytes(target, await fs.readBytes(child.path))
      }
    } else {
      // Unsaved text is copied too, not the older file on disk
      const text = get().texts[from]
      if (text !== undefined) await fs.writeText(to, text)
      else await fs.writeBytes(to, await fs.readBytes(from))
    }
  }

  return {
    projectId: null,
    mainFile: "main.md",
    kind: "formatex",
    conflicts: {},
    replaced: {},
    files: [],
    activePath: null,
    texts: {},
    saveState: "saved",
    compileStatus: "idle",
    pages: [],
    diagnostics: [],
    markers: [],
    ok: true,
    elapsedMs: null,
    exportStatus: "idle",
    exportMessage: null,
    syncStatus: "idle",
    syncMessage: null,
    reveal: null,
    lastEdit: null,
    clipboard: null,

    open: async (projectId) => {
      await get().close()
      session++
      fs = await openProjectFs(projectId)
      let files = await fs.list()
      // A project with no files at all (created before files existed, or its folder was lost) starts from the template of its kind:
      // Formatex's, or a plain Typst project's own (a plain Typst project in a folder of the user's gets nothing)
      if (files.length === 0) {
        const created = useLibraryStore.getState().documents.find((item) => item.id === projectId)
        if (created?.kind === "typst") {
          if (!created.location) {
            await initTypstProject(projectId)
            useLibraryStore.getState().setMainFile(projectId, TYPST_MAIN_FILE)
          }
        } else await initProject(projectId)
        files = await fs.list()
      }
      // A plain Typst project keeps its main file in the app's library; a Formatex one has it named by config.toml, and when that names none
      // that exists, config.toml is what to look at
      const doc = useLibraryStore.getState().documents.find((item) => item.id === projectId)
      const kind: ProjectKind = doc?.kind === "typst" ? "typst" : "formatex"
      const mainFile = kind === "typst" ? (doc?.mainFile ?? "") : (sourceOf(await fs.readText(CONFIG_FILE).catch(() => ""))?.path ?? "")
      const firstText = files.find((file) => file.kind === "file" && isTextKind(fileKindOf(file.path)))?.path ?? null
      const active = files.some((file) => file.kind === "file" && file.path === mainFile)
        ? mainFile
        : kind === "formatex" && files.some((file) => file.path === CONFIG_FILE)
          ? CONFIG_FILE
          : firstText
      written.clear()
      set({ projectId, kind, mainFile, files, activePath: null, texts: {}, conflicts: {}, replaced: {}, saveState: "saved", pages: [], diagnostics: [], markers: [], ok: true, elapsedMs: null, exportStatus: "idle", exportMessage: null, reveal: null, lastEdit: null, clipboard: null })
      if (active) await get().select(active)
      get().compile()
      // A project in a folder of the user's can be changed from outside the app: it is watched while it is open
      if (doc?.location) {
        const current = session
        const stop = await watchProject(projectId, (change) => void onExternal(change, current)).catch((error) => {
          console.warn("[formatex] could not watch the project folder", error)
          return null
        })
        if (current !== session) stop?.()
        else stopWatching = stop
      }
    },

    close: async () => {
      if (!get().projectId) return
      await flush()
      session++
      stopWatching?.()
      stopWatching = null
      fs = null
      compileAgain = false
      schemaSignature = ""
      useSchemaStore.getState().setProject(null)
      set({ projectId: null, files: [], activePath: null, texts: {}, conflicts: {}, replaced: {}, pages: [], markers: [], diagnostics: [] })
    },

    load: async (path) => {
      const known = get().texts[path]
      if (known !== undefined) return known
      const text = fs ? await fs.readText(path) : ""
      set((state) => ({ texts: { ...state.texts, [path]: text } }))
      return text
    },

    select: async (path) => {
      // A folder project's config is listed as `.formatex/config.toml`; it is edited as `config.toml`, the one name every part of the editor knows
      if (path === FORMATEX_CONFIG && get().files.some((file) => file.path === CONFIG_FILE && file.alias)) path = CONFIG_FILE
      if (isTextKind(fileKindOf(path))) await get().load(path)
      set({ activePath: path })
    },

    revealAt: async (path, line, column) => {
      await get().select(path)
      set({ reveal: { path, line, column, id: Date.now() } })
    },

    edit: (path, text) => {
      set((state) => ({ texts: { ...state.texts, [path]: text }, saveState: "saving", lastEdit: { path, id: (state.lastEdit?.id ?? 0) + 1 } }))
      clearTimeout(compileTimer)
      compileTimer = setTimeout(() => get().compile(), COMPILE_DELAY_MS)
      clearTimeout(pendingSaves.get(path))
      pendingSaves.set(
        path,
        setTimeout(() => {
          pendingSaves.delete(path)
          void save(path)
        }, SAVE_DELAY_MS)
      )
    },

    compile: () => {
      void runCompile()
    },

    createFile: async (parent, name, text = "") => {
      const path = joinPath(parent, name)
      await fs?.writeText(path, text)
      await refreshFiles()
      touch()
      await get().select(path)
      return path
    },

    createFolder: async (parent, name) => {
      await fs?.createDir(joinPath(parent, name))
      await refreshFiles()
    },

    rename: async (path, newName) => {
      await relocate(path, joinPath(parentOf(path), newName))
      await refreshFiles()
      get().compile()
    },

    remove: async (path) => {
      if (!fs) return
      await flush()
      await fs.remove(path)
      const inside = (candidate: string) => candidate === path || candidate.startsWith(`${path}/`)
      set((state) => ({
        texts: Object.fromEntries(Object.entries(state.texts).filter(([key]) => !inside(key))),
        activePath: state.activePath && inside(state.activePath) ? null : state.activePath,
      }))
      await refreshFiles()
      if (get().activePath === null) await get().select(get().mainFile).catch(() => undefined)
      touch()
      get().compile()
    },

    removeMany: async (paths) => {
      if (!fs) return
      await flush()
      const { mainFile } = get()
      const doomed = paths.filter((path) => path !== mainFile && (get().kind === "typst" || path !== "config.toml"))
      // A folder in the list already removes what is inside it
      const roots = doomed.filter((path) => !doomed.some((other) => other !== path && path.startsWith(`${other}/`)))
      for (const path of roots) await fs.remove(path)
      const inside = (candidate: string) => roots.some((root) => candidate === root || candidate.startsWith(`${root}/`))
      set((state) => ({
        texts: Object.fromEntries(Object.entries(state.texts).filter(([key]) => !inside(key))),
        activePath: state.activePath && inside(state.activePath) ? null : state.activePath,
      }))
      await refreshFiles()
      if (get().activePath === null) await get().select(get().mainFile).catch(() => undefined)
      touch()
      get().compile()
    },

    moveEntries: async (paths, targetDir) => {
      if (!fs) return []
      await flush()
      const taken = new Set(get().files.map((file) => file.path))
      const moved: string[] = []
      for (const path of topLevel(paths)) {
        const name = baseName(path)
        // Not into itself, not where it already is, and no engine name at the top
        if (targetDir === path || targetDir.startsWith(`${path}/`) || parentOf(path) === targetDir) continue
        if (targetDir === "" && get().kind !== "typst" && isReservedPath(name)) continue
        const target = joinPath(targetDir, uniqueName(name, targetDir, taken))
        await relocate(path, target)
        taken.delete(path)
        taken.add(target)
        moved.push(target)
      }
      await refreshFiles()
      get().compile()
      return moved
    },

    copyEntries: async (paths, targetDir) => {
      if (!fs) return []
      const taken = new Set(get().files.map((file) => file.path))
      const copied: string[] = []
      for (const path of topLevel(paths)) {
        const name = baseName(path)
        if (targetDir === path || targetDir.startsWith(`${path}/`)) continue
        if (targetDir === "" && get().kind !== "typst" && isReservedPath(name)) continue
        const target = joinPath(targetDir, uniqueName(name, targetDir, taken))
        await copyTree(path, target)
        taken.add(target)
        copied.push(target)
      }
      await refreshFiles()
      touch()
      get().compile()
      return copied
    },

    setClipboard: (paths, mode) => {
      set({ clipboard: paths.length ? { paths, mode } : null })
      // The system clipboard is replaced too, so an image copied before this is not taken for newer than this copy
      if (paths.length) void navigator.clipboard?.writeText(paths.join(" ")).catch(() => undefined)
    },

    pasteSystemFiles: async (targetDir) => {
      const { projectId, kind } = get()
      if (!projectId) return []
      await flush()
      const added = await pasteSystemFiles(projectId, targetDir, kind !== "typst")
      if (added.length) {
        await refreshFiles()
        touch()
        get().compile()
      }
      return added
    },

    addImage: async (image) => {
      const { projectId } = get()
      if (!fs || !projectId) return null
      const readable = await readableImage(image)
      if (!readable) return null
      const inFolder = Boolean(useLibraryStore.getState().documents.find((doc) => doc.id === projectId)?.location) && get().kind !== "typst"
      const folder = imageFolder(inFolder)
      const taken = get().files.filter((file) => file.path.startsWith(`${folder}/`)).map((file) => file.path)
      const path = joinPath(folder, nextImageName(taken, readable.ext))
      await flush()
      await fs.writeBytes(path, readable.data)
      await refreshFiles()
      touch()
      get().compile()
      return path
    },

    paste: async (targetDir) => {
      const clipboard = get().clipboard
      if (!clipboard) return []
      if (clipboard.mode === "cut") {
        set({ clipboard: null })
        return get().moveEntries(clipboard.paths, targetDir)
      }
      return get().copyEntries(clipboard.paths, targetDir)
    },

    importFiles: async (parent, files) => {
      if (!fs) return []
      const taken = new Set(get().files.map((file) => file.path))
      const added: string[] = []
      for (const file of files) {
        const name = uniqueName(file.name, parent, taken)
        const path = joinPath(parent, name)
        await fs.writeBytes(path, file.data)
        taken.add(path)
        added.push(path)
      }
      await refreshFiles()
      touch()
      get().compile()
      return added
    },

    importTree: async (parent, files) => {
      if (!fs) return []
      const taken = new Set(get().files.map((file) => file.path))
      // The engine's own names at the top of a Formatex project are not for a folder to take
      if (parent === "" && get().kind !== "typst") for (const name of RESERVED_ROOTS) taken.add(name)
      const names = new Map<string, string>()
      const tops: string[] = []
      for (const file of files) {
        const parts = file.path.split("/").filter((part) => part !== "" && part !== "." && part !== "..")
        if (parts.length === 0) continue
        const [top, ...rest] = parts
        if (!names.has(top)) {
          const name = uniqueName(top, parent, taken)
          taken.add(joinPath(parent, name))
          names.set(top, name)
          tops.push(joinPath(parent, name))
        }
        await fs.writeBytes(joinPath(joinPath(parent, names.get(top)!), rest.join("/")).replace(/\/$/, ""), file.data)
      }
      await refreshFiles()
      touch()
      get().compile()
      return tops
    },

    saveEntries: async (paths) => {
      if (!fs) return
      const plan = planSave(get().files, paths)
      if (!plan) return
      const { texts } = get()
      // What is being typed counts: the text of the editor, before it reaches the disk
      const read = async (path: string): Promise<Uint8Array> => (texts[path] !== undefined ? strToU8(texts[path]) : fs!.readBytes(path))
      const data = plan.zip ? await zipItems(plan.items, read) : await read(plan.items[0].path)
      await saveBytes(data, plan.name, plan.mime)
    },

    setMainFile: (path) => {
      if (get().kind === "typst") {
        const { projectId } = get()
        set({ mainFile: path })
        if (projectId) useLibraryStore.getState().setMainFile(projectId, path)
        get().compile()
        return
      }
      void (async () => {
        const config = await get().load(CONFIG_FILE).catch(() => "")
        const { projectId } = get()
        set({ mainFile: path })
        if (projectId) useLibraryStore.getState().setMainFile(projectId, path)
        // The edit saves config.toml and rebuilds the preview
        get().edit(CONFIG_FILE, withSource(config, path))
      })()
    },

    resolveConflict: (path, loadFromDisk) => {
      const disk = get().conflicts[path]
      const mine = get().texts[path]
      set((state) => {
        const conflicts = { ...state.conflicts }
        delete conflicts[path]
        // What the editor had is kept, so loading the other one is never a loss
        const replaced = loadFromDisk && disk !== undefined && mine !== undefined && mine.trim() !== "" ? { ...state.replaced, [path]: mine } : state.replaced
        return loadFromDisk && disk !== undefined ? { conflicts, replaced, texts: { ...state.texts, [path]: disk } } : { conflicts }
      })
      if (loadFromDisk && disk !== undefined) {
        clearTimeout(pendingSaves.get(path))
        pendingSaves.delete(path)
        written.set(path, disk)
        get().compile()
      }
    },

    restoreReplaced: (path, restore) => {
      const previous = get().replaced[path]
      set((state) => {
        const replaced = { ...state.replaced }
        delete replaced[path]
        return { replaced }
      })
      // The text comes back as the editor's own: it is saved over the file
      if (restore && previous !== undefined) get().edit(path, previous)
    },

    switchKind: async (kind) => {
      const { projectId } = get()
      if (!projectId || get().kind === kind) return
      await flush()
      await changeProjectKind(projectId, kind)
      await get().open(projectId)
    },

    exportPdf: async () => {
      const { projectId, mainFile } = get()
      if (!projectId) return
      set({ exportStatus: "working", exportMessage: null })
      try {
        await flush()
        if (!mainFile) throw new Error("No main file is chosen")
        const bytes = await exportPdf(projectId, mainFile, get().texts, get().kind)
        const title = useLibraryStore.getState().documents.find((doc) => doc.id === projectId)?.title ?? "document"
        const fileName = `${title.replace(/[\\/:*?"<>|]+/g, "_").trim() || "document"}.pdf`
        const result = await saveBytes(bytes, fileName, "application/pdf")
        set({ exportStatus: result.saved ? "done" : "idle", exportMessage: result.path ?? null })
      } catch (error) {
        set({ exportStatus: "error", exportMessage: String((error as Error)?.message ?? error) })
      }
    },

    exportHtml: async (options) => {
      const { projectId, mainFile } = get()
      if (!projectId) return
      set({ exportStatus: "working", exportMessage: null })
      try {
        await flush()
        if (!mainFile) throw new Error("No main file is chosen")
        const title = useLibraryStore.getState().documents.find((doc) => doc.id === projectId)?.title ?? "document"
        const fileName = `${title.replace(/[\\/:*?"<>|]+/g, "_").trim() || "document"}.html`
        if (isDesktopApp()) {
          // The page is megabytes (the fonts are in it): ask where first, and let the native side write it
          const { save } = await import("@tauri-apps/plugin-dialog")
          const path = await save({ defaultPath: fileName, filters: [{ name: "HTML", extensions: ["html"] }] })
          if (!path) {
            set({ exportStatus: "idle", exportMessage: null })
            return
          }
          await exportHtml(projectId, mainFile, options, get().texts, get().kind, path)
          set({ exportStatus: "done", exportMessage: path })
          return
        }
        const bytes = await exportHtml(projectId, mainFile, options, get().texts, get().kind)
        const result = await saveBytes(bytes, fileName, "text/html")
        set({ exportStatus: result.saved ? "done" : "idle", exportMessage: result.path ?? null })
      } catch (error) {
        set({ exportStatus: "error", exportMessage: String((error as Error)?.message ?? error) })
      }
    },

    syncRemote: async (url) => {
      const { projectId } = get()
      if (!projectId) return
      set({ syncStatus: "working", syncMessage: null })
      try {
        const report = await syncRemote(projectId, url)
        set(report.failed.length ? { syncStatus: "error", syncMessage: report.failed.join(" · ") } : { syncStatus: "done", syncMessage: String(report.updated) })
        get().compile()
      } catch (error) {
        set({ syncStatus: "error", syncMessage: String((error as Error)?.message ?? error) })
      }
    },
  }
})
