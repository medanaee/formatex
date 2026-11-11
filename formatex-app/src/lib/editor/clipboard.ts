import type { EditorView } from "@codemirror/view"
import { imageOnClipboard } from "@/lib/files/pastedImage"
import { isTauri } from "@/lib/platform"
import { fileKindOf } from "@/lib/projects"
import { useEditorStore } from "@/stores/useEditorStore"
import { pasteImageInto } from "./pasteImage"

const selected = (view: EditorView): string => view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to)

/** The text on the system clipboard. In the app it is read natively: a phone's web view does not let a page read it. */
export async function readClipboardText(): Promise<string> {
  if (isTauri()) {
    try {
      const { readText } = await import("@tauri-apps/plugin-clipboard-manager")
      return (await readText()) ?? ""
    } catch {
      // Fall back to the page's own clipboard
    }
  }
  return navigator.clipboard.readText()
}

export async function writeClipboardText(text: string): Promise<void> {
  if (isTauri()) {
    try {
      const { writeText } = await import("@tauri-apps/plugin-clipboard-manager")
      await writeText(text)
      return
    } catch {
      // Fall back to the page's own clipboard
    }
  }
  await navigator.clipboard.writeText(text)
}

export async function cutSelection(view: EditorView): Promise<void> {
  const text = selected(view)
  if (!text) return
  await writeClipboardText(text)
  view.dispatch(view.state.replaceSelection(""))
  view.focus()
}

export async function copySelection(view: EditorView): Promise<void> {
  const text = selected(view)
  if (text) await writeClipboardText(text)
}

export async function pasteClipboard(view: EditorView): Promise<void> {
  // An image on the clipboard goes into the project (a Formatex one, in a Markdown file), as with Ctrl + V
  const { activePath, kind } = useEditorStore.getState()
  if (kind !== "typst" && activePath && fileKindOf(activePath) === "markdown") {
    const image = await imageOnClipboard()
    if (image) return pasteImageInto(view, image)
  }
  const text = await readClipboardText()
  if (text) view.dispatch({ ...view.state.replaceSelection(text), userEvent: "input.paste", scrollIntoView: true })
  view.focus()
}
