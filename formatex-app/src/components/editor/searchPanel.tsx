import { createRoot } from "react-dom/client"
import { getSearchQuery } from "@codemirror/search"
import type { EditorView, Panel, ViewUpdate } from "@codemirror/view"
import { EditorSearchPanel } from "./EditorSearchPanel"

export function createEditorSearchPanel(view: EditorView): Panel {
  const dom = document.createElement("div")
  const root = createRoot(dom)
  const render = () => root.render(<EditorSearchPanel view={view} query={getSearchQuery(view.state)} />)
  return { dom, top: true, mount: render, update(update: ViewUpdate) { if (update.state !== update.startState) render() }, destroy() { root.unmount() } }
}
