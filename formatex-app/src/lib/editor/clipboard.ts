import type { EditorView } from "@codemirror/view"
import { imageOnClipboard } from "@/lib/files/pastedImage"
import { fileKindOf } from "@/lib/projects"
import { useEditorStore } from "@/stores/useEditorStore"
import { pasteImageInto } from "./pasteImage"

const selected = (view: EditorView): string => view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to)

export async function cutSelection(view: EditorView): Promise<void> {
  const text = selected(view)
  if (!text) return
  await navigator.clipboard.writeText(text)
  view.dispatch(view.state.replaceSelection(""))
  view.focus()
}

export async function copySelection(view: EditorView): Promise<void> {
  const text = selected(view)
  if (text) await navigator.clipboard.writeText(text)
}

export async function pasteClipboard(view: EditorView): Promise<void> {
  // An image on the clipboard goes into the project (a Formatex one, in a Markdown file), as with Ctrl + V
  const { activePath, kind } = useEditorStore.getState()
  if (kind !== "typst" && activePath && fileKindOf(activePath) === "markdown") {
    const image = await imageOnClipboard()
    if (image) return pasteImageInto(view, image)
  }
  view.dispatch({ ...view.state.replaceSelection(await navigator.clipboard.readText()), userEvent: "input.paste" })
  view.focus()
}
