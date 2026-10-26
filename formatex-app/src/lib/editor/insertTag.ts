import { snippet } from "@codemirror/autocomplete"
import type { EditorView } from "@codemirror/view"
import { paletteTemplate } from "./completion"
import type { Schema } from "./schema"

/** What a palette tile carries when it is dragged. */
export const TAG_DRAG_TYPE = "application/x-formatex-tag"

/**
 * Writes a tag into the editor at `pos` (the cursor by default) and puts the cursor where its content goes. A block tag always
 * starts on its own line.
 */
export function insertTag(view: EditorView, name: string, schema: Schema, pos = view.state.selection.main.head): boolean {
  const spec = schema.tags[name]
  if (!spec) return false
  const line = view.state.doc.lineAt(pos)
  const midLine = pos > line.from && line.text.slice(0, pos - line.from).trim() !== ""
  let template = paletteTemplate(name, spec)
  if (spec.kind !== "inline" && midLine) template = `\n${template}`
  snippet(template)(view, { label: name }, pos, pos)
  view.focus()
  return true
}
