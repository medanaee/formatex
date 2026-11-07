import type { Extension } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { figTag, imageOfPaste } from "@/lib/files/pastedImage"
import { useEditorStore } from "@/stores/useEditorStore"

/** Writes the tag of a picture at the cursor, on lines of its own (the selection is replaced). */
export function insertFigure(view: EditorView, path: string): void {
  const { from, to } = view.state.selection.main
  const line = view.state.doc.lineAt(from)
  const before = from > line.from && view.state.sliceDoc(line.from, from).trim() !== "" ? "\n" : ""
  const after = view.state.doc.lineAt(to).to > to && view.state.sliceDoc(to, view.state.doc.lineAt(to).to).trim() !== "" ? "\n" : ""
  const insert = `${before}${figTag(path)}${after}`
  view.dispatch({ changes: { from, to, insert }, selection: { anchor: from + insert.length }, userEvent: "input.paste", scrollIntoView: true })
}

/** An image from the clipboard: kept in the project's image folder, and its `<fig>` tag written at the cursor. */
export async function pasteImageInto(view: EditorView, image: Blob): Promise<void> {
  const path = await useEditorStore.getState().addImage(image)
  // The editor may have been closed or switched to another file while the image was saved
  if (path && view.dom.isConnected) {
    insertFigure(view, path)
    view.focus()
  }
}

/**
 * Ctrl + V (or a paste any other way) with an image on the clipboard: the image wins over any text that comes with it (a copy from a page
 * or from Word has both).
 */
export function pasteImage(): Extension {
  return EditorView.domEventHandlers({
    paste(event, view) {
      const image = imageOfPaste(event.clipboardData)
      // `<fig>` is Formatex's: a plain Typst project pastes as usual
      if (!image || useEditorStore.getState().kind === "typst") return false
      event.preventDefault()
      void pasteImageInto(view, image)
      return true
    },
  })
}
