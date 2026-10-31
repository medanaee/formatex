import { isTauri } from "@/lib/platform"

export interface Diagnostic {
  severity: "error" | "warning"
  message: string
  /** Project-relative path; null for a file of a package. */
  path: string | null
  /** 1-based. */
  line: number | null
  /** 1-based. */
  column: number | null
  hints: string[]
}

/** A link on a page, in points from the page's top start corner: an external address, or a place (a page and a point on it). */
export interface PageLink {
  x: number
  y: number
  w: number
  h: number
  url: string | null
  /** 1-based; set for a link inside the document. */
  page: number | null
  px: number
  py: number
}

/** A run of text on a page, with its box (same units as the links). */
export interface PageText {
  x: number
  y: number
  w: number
  h: number
  text: string
}

/** What makes a page interactive: its size in points, its links and its text runs. */
export interface PageMap {
  width: number
  height: number
  links: PageLink[]
  texts: PageText[]
}

/** A page the compiler sent: its content hash, and its SVG and map unless the frontend already had that hash. */
export interface CompiledPage {
  hash: string
  svg: string | null
  map: PageMap | null
}

/** Where a block of the Markdown starts on the pages (the engine's invisible marker): its file and line, and its place on a page. */
export interface SourceMarker {
  file: string
  /** 1-based. */
  line: number
  /** 1-based. */
  page: number
  /** Points from the page's top start corner, like the boxes of a `PageMap`. */
  x: number
  y: number
}

export interface CompileOutput {
  /** Every page in order; empty when the compilation failed. */
  pages: CompiledPage[]
  diagnostics: Diagnostic[]
  /** The blocks of the source in document order; empty for an engine that does not mark them. */
  markers: SourceMarker[]
  ok: boolean
  elapsedMs: number
}

/** Thrown where there is no compiler: a plain browser, until the WebAssembly build exists. */
export class CompilerUnavailableError extends Error {
  constructor() {
    super("The Typst compiler is only available in the app")
    this.name = "CompilerUnavailableError"
  }
}

export const compilerAvailable = (): boolean => isTauri()

interface RawOutput {
  pages: CompiledPage[]
  diagnostics: Diagnostic[]
  markers?: SourceMarker[]
  ok: boolean
  elapsed_ms: number
}

/**
 * The user's themes (app settings) are given to the compiler, which adds them to the engine's own. Every compilation waits for the
 * last hand-over, so a theme that was just made is already there.
 */
let themesHandedOver: Promise<unknown> = Promise.resolve()

export function setCompilerThemes(themes: Record<string, unknown>): Promise<unknown> {
  if (!isTauri()) return Promise.resolve()
  themesHandedOver = import("@tauri-apps/api/core").then(({ invoke }) => invoke("themes_set", { themes })).catch((error) => console.warn("[formatex] could not hand the themes over", error))
  return themesHandedOver
}

async function invoke<T>(command: string, args: Record<string, unknown>): Promise<T> {
  if (!isTauri()) throw new CompilerUnavailableError()
  if (command !== "themes_set") await themesHandedOver
  const { invoke } = await import("@tauri-apps/api/core")
  return invoke<T>(command, args)
}

/** Typesets the project with the native Typst engine: the pages as SVG, and what went wrong. */
export async function compileProject(
  projectId: string,
  main: string,
  options: { inputs?: Record<string, string>; /** Unsaved text by path, used instead of the files on disk. */ overrides?: Record<string, string>; /** Hashes of the pages already shown, by index: those pages are not sent again. */ known?: string[] } = {}
): Promise<CompileOutput> {
  // The preview asks the engine to mark where each block of the source starts (a PDF export does not)
  const raw = await invoke<RawOutput>("compile_project", { projectId, main, ...options, inputs: { markers: "1", ...options.inputs } })
  return { pages: raw.pages, diagnostics: raw.diagnostics, markers: raw.markers ?? [], ok: raw.ok, elapsedMs: raw.elapsed_ms }
}

/** The first page of a project as SVG text (a card of the library); `null` when it does not compile. */
export const projectPreview = (projectId: string, main: string, overrides?: Record<string, string>): Promise<string | null> => invoke<string | null>("project_preview", { projectId, main, overrides })

/** The PDF of the project. Rejects with the first error when it does not compile. */
export async function exportPdf(projectId: string, main: string, overrides?: Record<string, string>): Promise<Uint8Array> {
  return new Uint8Array(await invoke<ArrayBuffer>("export_pdf", { projectId, main, overrides }))
}

export interface FontFamily {
  family: string
  faces: number
  origin: "imported" | "system" | "embedded"
}

export const listFonts = (): Promise<FontFamily[]> => invoke<FontFamily[]>("fonts_list", {})

/** Tell the compiler the fonts folder changed. */
export const reloadFonts = (): Promise<void> => invoke<void>("fonts_reload", {})
