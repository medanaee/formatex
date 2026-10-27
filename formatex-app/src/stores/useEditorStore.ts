import { create } from "zustand"
import { CompilerUnavailableError, compileProject, exportPdf, locateProblem, type Diagnostic, type PageMap } from "@/lib/compiler"
import type { RevealRequest } from "@/components/editor/CodeEditor"
import { saveBytes } from "@/lib/files/saveFile"
import {
  fileKindOf,
  initProject,
  isTextKind,
  joinPath,
  baseName,
  openProjectFs,
  parentOf,
  isReservedPath,
  uniqueName,
  type FsEntry,
  type ProjectFs,
} from "@/lib/projects"
import { isEngineFile, lineWithin, locateDiagnostics } from "@/lib/editor/diagnosticSource"
import { useLibraryStore } from "@/stores/useLibraryStore"

/** Typing is saved after a pause. The preview does not wait for the save: it is rebuilt from the editor's text after a short pause. */
const SAVE_DELAY_MS = 400
const COMPILE_DELAY_MS = 120

export type SaveState = "saved" | "saving" | "error"
export type CompileStatus = "idle" | "compiling" | "unavailable"
export type ExportStatus = "idle" | "working" | "done" | "error"

interface EditorState {
  projectId: string | null
  mainFile: string
  /** Every file and folder of the project, in display order. */
  files: FsEntry[]
  /** The file shown in the editor. */
  activePath: string | null
  /** Text of the files that were opened. */
  texts: Record<string, string>
  saveState: SaveState
  compileStatus: CompileStatus
  /** The pages of the last successful compilation; kept while a later one fails, so the preview does not blank out. */
  pages: { hash: string; svg: string; map: PageMap | null }[]
  diagnostics: Diagnostic[]
  ok: boolean
  elapsedMs: number | null
  exportStatus: ExportStatus
  exportMessage: string | null
  /** The place a click on a problem asked the editor to show. */
  reveal: RevealRequest | null
  /** Files copied or cut in the tree, waiting for a paste. */
  clipboard: { paths: string[]; mode: "copy" | "cut" } | null

  open: (projectId: string, mainFile: string) => Promise<void>
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
  importFiles: (parent: string, files: { name: string; data: Uint8Array }[]) => Promise<string[]>
  setMainFile: (path: string) => void
  exportPdf: () => Promise<void>
}

// Per-project machinery that does not belong in reactive state
let fs: ProjectFs | null = null
const pendingSaves = new Map<string, ReturnType<typeof setTimeout>>()
let compileTimer: ReturnType<typeof setTimeout> | undefined
let compiling = false
let compileAgain = false
let session = 0

/** Drops the paths that lie inside another path of the list (a folder already carries its content). */
const topLevel = (paths: string[]): string[] => paths.filter((path) => !paths.some((other) => other !== path && path.startsWith(`${other}/`)))

const errorDiagnostic = (message: string): Diagnostic => ({ severity: "error", message, path: null, line: null, column: null, hints: [] })

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
    try {
      await fs.writeText(path, text)
      if (current !== session) return
      if (pendingSaves.size === 0) set({ saveState: "saved" })
      touch()
    } catch (error) {
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

  let locateTimer: ReturnType<typeof setTimeout> | undefined

  /**
   * The first problem raised inside the engine gets the exact block of the text it comes from: the compiler typesets the text again
   * block by block (a few compilations), so this waits until the typing pauses. The text match of `locateDiagnostics` stands in
   * until then and where this finds nothing.
   */
  function refineProblem(diagnostics: Diagnostic[], overrides: Record<string, string>, mainFile: string, projectId: string): void {
    clearTimeout(locateTimer)
    const target = diagnostics.find((d) => d.severity === "error" && (isEngineFile(d.path) || d.path === mainFile))
    if (!target) return
    const current = session
    locateTimer = setTimeout(async () => {
      try {
        const range = await locateProblem(projectId, mainFile, target.message, overrides)
        const text = overrides[mainFile]
        if (!range || current !== session || text === undefined) return
        const line = lineWithin(target, text, range[0], range[1])
        set((state) => ({ diagnostics: state.diagnostics.map((d) => (d.message === target.message && d.severity === "error" && (isEngineFile(d.path) || d.path === mainFile) ? { ...d, path: mainFile, line, column: 1 } : d)) }))
      } catch (error) {
        console.warn("[formatex] could not locate the problem", error)
      }
    }, 700)
  }

  async function runCompile(): Promise<void> {
    const { projectId, mainFile } = get()
    if (!projectId) return
    if (compiling) {
      compileAgain = true
      return
    }
    compiling = true
    const current = session
    set({ compileStatus: "compiling" })
    try {
      const before = get().pages
      const overrides = get().texts
      const output = await compileProject(projectId, mainFile, { overrides, known: before.map((page) => page.hash) })
      if (current !== session) return
      set((state) => ({
        compileStatus: "idle",
        // A page the compiler did not resend is unchanged: keep it (and its image) as it is
        pages: output.ok ? output.pages.map((page, index) => (page.svg !== null ? { hash: page.hash, svg: page.svg, map: page.map } : before[index])) : state.pages,
        // A problem raised inside the engine gets the line of the text it is about
        diagnostics: locateDiagnostics(output.diagnostics, overrides, mainFile),
        ok: output.ok,
        elapsedMs: output.elapsedMs,
      }))
      if (!output.ok) refineProblem(get().diagnostics, overrides, mainFile, projectId)
      else clearTimeout(locateTimer)
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
    const move = (candidate: string) => (candidate === from ? to : candidate.startsWith(`${from}/`) ? to + candidate.slice(from.length) : candidate)
    set((state) => ({
      texts: Object.fromEntries(Object.entries(state.texts).map(([key, text]) => [move(key), text])),
      activePath: state.activePath ? move(state.activePath) : null,
      mainFile: move(state.mainFile),
    }))
    const { projectId, mainFile } = get()
    if (projectId) useLibraryStore.getState().setMainFile(projectId, mainFile)
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
    files: [],
    activePath: null,
    texts: {},
    saveState: "saved",
    compileStatus: "idle",
    pages: [],
    diagnostics: [],
    ok: true,
    elapsedMs: null,
    exportStatus: "idle",
    exportMessage: null,
    reveal: null,
    clipboard: null,

    open: async (projectId, mainFile) => {
      await get().close()
      session++
      fs = await openProjectFs(projectId)
      let files = await fs.list()
      // A project with no files at all (created before files existed, or its folder was lost) starts from the template
      if (files.length === 0) {
        await initProject(projectId)
        files = await fs.list()
      }
      const active = files.some((file) => file.path === mainFile) ? mainFile : (files.find((file) => file.kind === "file" && isTextKind(fileKindOf(file.path)))?.path ?? null)
      set({ projectId, mainFile, files, activePath: null, texts: {}, saveState: "saved", pages: [], diagnostics: [], ok: true, elapsedMs: null, exportStatus: "idle", exportMessage: null, reveal: null, clipboard: null })
      if (active) await get().select(active)
      get().compile()
    },

    close: async () => {
      if (!get().projectId) return
      await flush()
      session++
      fs = null
      compileAgain = false
      set({ projectId: null, files: [], activePath: null, texts: {}, pages: [], diagnostics: [] })
    },

    load: async (path) => {
      const known = get().texts[path]
      if (known !== undefined) return known
      const text = fs ? await fs.readText(path) : ""
      set((state) => ({ texts: { ...state.texts, [path]: text } }))
      return text
    },

    select: async (path) => {
      if (isTextKind(fileKindOf(path))) await get().load(path)
      set({ activePath: path })
    },

    revealAt: async (path, line, column) => {
      await get().select(path)
      set({ reveal: { path, line, column, id: Date.now() } })
    },

    edit: (path, text) => {
      set((state) => ({ texts: { ...state.texts, [path]: text }, saveState: "saving" }))
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
      const doomed = paths.filter((path) => path !== mainFile && path !== "config.toml")
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
        if (targetDir === "" && isReservedPath(name)) continue
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
        if (targetDir === "" && isReservedPath(name)) continue
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

    setClipboard: (paths, mode) => set({ clipboard: paths.length ? { paths, mode } : null }),

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

    setMainFile: (path) => {
      const { projectId } = get()
      set({ mainFile: path })
      if (projectId) useLibraryStore.getState().setMainFile(projectId, path)
      get().compile()
    },

    exportPdf: async () => {
      const { projectId, mainFile } = get()
      if (!projectId) return
      set({ exportStatus: "working", exportMessage: null })
      try {
        await flush()
        const bytes = await exportPdf(projectId, mainFile, get().texts)
        const title = useLibraryStore.getState().documents.find((doc) => doc.id === projectId)?.title ?? "document"
        const fileName = `${title.replace(/[\\/:*?"<>|]+/g, "_").trim() || "document"}.pdf`
        const result = await saveBytes(bytes, fileName, "application/pdf")
        set({ exportStatus: result.saved ? "done" : "idle", exportMessage: result.path ?? null })
      } catch (error) {
        set({ exportStatus: "error", exportMessage: String((error as Error)?.message ?? error) })
      }
    },
  }
})
