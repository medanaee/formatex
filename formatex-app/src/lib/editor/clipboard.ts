import type { EditorView } from "@codemirror/view"

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
  view.dispatch({ ...view.state.replaceSelection(await navigator.clipboard.readText()), userEvent: "input.paste" })
  view.focus()
}
