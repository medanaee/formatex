// @vitest-environment happy-dom
import { EditorState, type TransactionSpec } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { describe, expect, it } from "vitest"
import { enableTouchSelection, selectByTouch, touchSelection, touchSelecting } from "./touchSelection"

const state = () => EditorState.create({ doc: "سلام دنیا\nsecond line\nthird line", extensions: touchSelection })

describe("explicit touch selection", () => {
  it("starts with native range selection disabled", () => {
    expect(state().field(touchSelecting)).toBe(false)
  })

  it("blocks the system's selectstart until explicitly enabled, without a drawn selection layer", () => {
    const view = new EditorView({ state: state(), parent: document.body })
    try {
      const before = new Event("selectstart", { bubbles: true, cancelable: true })
      view.contentDOM.dispatchEvent(before)
      expect(before.defaultPrevented).toBe(true)
      view.dispatch({ effects: enableTouchSelection.of(true), selection: { anchor: 0, head: 4 } })
      const after = new Event("selectstart", { bubbles: true, cancelable: true })
      view.contentDOM.dispatchEvent(after)
      expect(after.defaultPrevented).toBe(false)
      expect(view.contentDOM.getAttribute("data-touch-selecting")).toBe("true")
      expect(view.dom.querySelector(".cm-selectionLayer")).toBeNull()
    } finally {
      view.destroy()
    }
  })

  it("selects the Persian word at the press and enables native handles", () => {
    const target = {
      state: state(),
      dispatch(spec: TransactionSpec) { target.state = target.state.update(spec).state },
      focus() {},
    }
    selectByTouch(target as unknown as EditorView, 6)
    expect(target.state.sliceDoc(target.state.selection.main.from, target.state.selection.main.to)).toBe("دنیا")
    expect(target.state.field(touchSelecting)).toBe(true)
  })

  it("keeps the mode while handles extend across lines and cross each other", () => {
    let current = state().update({ effects: enableTouchSelection.of(true), selection: { anchor: 0, head: 4 } }).state
    current = current.update({ selection: { anchor: 4, head: 25 }, userEvent: "select.pointer" }).state
    expect(current.field(touchSelecting)).toBe(true)
    expect(current.sliceDoc(4, 25)).toContain("\nsecond line\n")
    current = current.update({ selection: { anchor: 25, head: 0 }, userEvent: "select.pointer" }).state
    expect(current.field(touchSelecting)).toBe(true)
    expect(current.selection.main.head).toBe(0)
  })

  it("ends the mode when a tap collapses the selection or typing replaces it", () => {
    const selected = state().update({ effects: enableTouchSelection.of(true), selection: { anchor: 0, head: 4 } }).state
    expect(selected.update({ selection: { anchor: 10 } }).state.field(touchSelecting)).toBe(false)
    expect(selected.update(selected.replaceSelection("new")).state.field(touchSelecting)).toBe(false)
  })
})
