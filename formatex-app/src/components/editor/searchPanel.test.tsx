// @vitest-environment happy-dom
import { act } from "react"
import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { getSearchQuery, openSearchPanel, search, SearchQuery, setSearchQuery } from "@codemirror/search"
import { describe, expect, it, vi } from "vitest"
import i18n from "@/i18n"
import { useSettingsStore } from "@/stores/useSettingsStore"
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
      expect(host.querySelector('[data-testid="search-match-count"]')?.textContent).toBe("0 / 2")
      await click("Next match")
      expect(host.querySelector('[data-testid="search-match-count"]')?.textContent).toBe("1 / 2")
      await click("Next match")
      expect(host.querySelector('[data-testid="search-match-count"]')?.textContent).toBe("2 / 2")
      expect(view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to)).toBe("سلام")
      await click("Find and replace")
      expect(host.querySelector('input[aria-label="Replace with"]')).not.toBeNull()
      await click("Replace all")
      expect(view.state.doc.toString()).toBe("hello\nدرود دنیا\nدرود دوباره")
      expect(host.querySelector('[data-testid="search-match-count"]')?.textContent).toBe("0 / 0")
      await click("Close")
      expect(host.querySelector('[role="search"]')).toBeNull()
    } finally {
      await act(async () => { view.destroy() })
      host.remove()
      vi.unstubAllGlobals()
    }
  })

  it("remembers up to 15 previous searches across the app and suggests them on input click", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
    await i18n.changeLanguage("en")
    useSettingsStore.setState({ searchHistory: [] })
    for (let i = 1; i <= 17; i += 1) useSettingsStore.getState().addSearchHistory(`term-${i}`)
    expect(useSettingsStore.getState().searchHistory).toHaveLength(15)
    expect(useSettingsStore.getState().searchHistory[0]).toBe("term-17")
    expect(useSettingsStore.getState().searchHistory).not.toContain("term-1")
    expect(useSettingsStore.getState().searchHistory).not.toContain("term-2")

    const host = document.createElement("div")
    document.body.append(host)
    const view = new EditorView({ parent: host, state: EditorState.create({ doc: "alpha term-10 beta", extensions: [search({ top: true, createPanel: createEditorSearchPanel })] }) })
    try {
      await act(async () => { openSearchPanel(view) })
      const input = host.querySelector<HTMLInputElement>("input[main-field]")!
      await act(async () => { input.click() })
      const options = [...host.querySelectorAll('[role="option"]')]
      expect(options).toHaveLength(15)
      const target = options.find((el) => el.textContent?.includes("term-10"))!.querySelector("button")!
      await act(async () => { target.click() })
      expect(getSearchQuery(view.state).search).toBe("term-10")
      expect(useSettingsStore.getState().searchHistory[0]).toBe("term-10")
    } finally {
      await act(async () => { view.destroy() })
      host.remove()
      vi.unstubAllGlobals()
    }
  })
})
