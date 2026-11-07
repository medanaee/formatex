import { snippet, type Completion, type CompletionContext, type CompletionResult } from "@codemirror/autocomplete"
import { isTauri } from "@/lib/platform"
import { useEditorStore } from "@/stores/useEditorStore"
import type { PreviewPlace } from "./previewLookup"

/**
 * What a Typst editor knows, from the native app: completions as you type, and the way between a place in the text and a place on
 * the page. It is Typst's own `typst-ide` running on the project (`src-tauri/src/ide.rs`), so it sees what the build sees. It is for
 * a plain Typst project and only in the app (a browser has no compiler).
 */

async function call<T>(command: string, args: Record<string, unknown>): Promise<T | null> {
  if (!isTauri()) return null
  try {
    const { invoke } = await import("@tauri-apps/api/core")
    return await invoke<T>(command, args)
  } catch (error) {
    console.warn(`[formatex] ${command} failed`, error)
    return null
  }
}

/** The open project when it is plain Typst: what the commands need (the editor's unsaved texts are sent along, so they see what is typed). */
function plainProject(): { projectId: string; main: string; overrides: Record<string, string> } | null {
  const state = useEditorStore.getState()
  return state.kind === "typst" && state.projectId ? { projectId: state.projectId, main: state.mainFile, overrides: state.texts } : null
}

interface RawCompletions {
  from: number
  completions: { kind: string; label: string; apply: string | null; detail: string | null }[]
}

const TYPE: Record<string, string> = {
  func: "function",
  type: "type",
  param: "property",
  constant: "constant",
  symbol: "constant",
  path: "text",
  package: "namespace",
  label: "variable",
  font: "text",
  syntax: "keyword",
}

/**
 * CodeMirror's completion source for a Typst file of a plain Typst project. A request goes to Typst for every key; it answers in a
 * few milliseconds. Whitespace typed is not a request (Ctrl + Space still is).
 */
export function typstCompletionSource(path: string) {
  return async (context: CompletionContext): Promise<CompletionResult | null> => {
    const project = plainProject()
    if (!project) return null
    const before = context.state.sliceDoc(Math.max(0, context.pos - 1), context.pos)
    if (!context.explicit && (before === "" || /\s/.test(before))) return null
    const found = await call<RawCompletions | null>("typst_complete", { ...project, path, offset: context.pos, explicit: context.explicit })
    if (!found || found.completions.length === 0) return null
    const options: Completion[] = found.completions.map((item) => ({
      label: item.label,
      type: TYPE[item.kind] ?? "text",
      detail: item.detail ?? undefined,
      apply: item.apply ? (item.apply.includes("${") ? snippet(item.apply) : item.apply) : undefined,
    }))
    return { from: found.from, options }
  }
}

/** About the height of a line of text in points: the box the preview marks at a place. */
const LINE_POINTS = 14

/** Where the text at `offset` (a UTF-16 position in the file) is on the pages, for the preview to scroll to; `null` when it is not on them. */
export async function typstPlaceForOffset(path: string, offset: number): Promise<PreviewPlace | null> {
  const project = plainProject()
  if (!project) return null
  const on = await call<{ page: number; x: number; y: number } | null>("typst_jump_to_cursor", { ...project, path, offset })
  // The point is where the text sits; the box starts a little above it
  return on ? { page: on.page - 1, y: Math.max(on.y - LINE_POINTS * 0.8, 0), h: LINE_POINTS, approximate: false } : null
}

/** The place in the text that a click on the page came from: a page (0-based) and the point on it in points from its top left. */
export async function typstSourceAt(page: number, x: number, y: number): Promise<{ path: string; line: number; column: number } | null> {
  const project = plainProject()
  if (!project) return null
  return call<{ path: string; line: number; column: number } | null>("typst_jump_from_click", { projectId: project.projectId, main: project.main, page: page + 1, x, y })
}
