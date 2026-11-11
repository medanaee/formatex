// @vitest-environment happy-dom
import { act } from "react"
import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { getSearchQuery, openSearchPanel, search, SearchQuery, setSearchQuery } from "@codemirror/search"
import { describe, expect, it, vi } from "vitest"
import i18n from "@/i18n"
import { createEditorSearchPanel } from "./searchPanel"

describe("touch search controls", () => {
  it("finds Persian text, replaces all matches and closes with app controls", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
    await i18n.changeLanguage("en")
    const host = document.createElement("div")
    document.body.append(host)
    const view = new EditorView({ parent: host, state: EditorState.create({ doc: "hello\nسلام دنیا\nسلام دوباره", extensions: [search({ top: true, createPanel: createEditorSearchPanel })] }) })
    const click = async (label: string) => { await act(async () => { host.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!.click() }) }
    try {
      await act(async () => { openSearchPanel(view) })
      expect(host.querySelector('input[main-field]')).not.toBeNull()
      expect(host.querySelectorAll('input[type="checkbox"]')).toHaveLength(0)
      await act(async () => { view.dispatch({ effects: setSearchQuery.of(new SearchQuery({ search: "سلام", replace: "درود" })) }) })
      expect(getSearchQuery(view.state).search).toBe("سلام")
      await click("Next match")
      expect(view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to)).toBe("سلام")
      await click("Find and replace")
      expect(host.querySelector('input[aria-label="Replace with"]')).not.toBeNull()
      await click("Replace all")
      expect(view.state.doc.toString()).toBe("hello\nدرود دنیا\nدرود دوباره")
      await click("Close")
      expect(host.querySelector('[role="search"]')).toBeNull()
    } finally {
      await act(async () => { view.destroy() })
      host.remove()
      vi.unstubAllGlobals()
    }
  })
})
