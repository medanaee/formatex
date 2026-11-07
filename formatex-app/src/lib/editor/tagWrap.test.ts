import { EditorSelection, EditorState } from "@codemirror/state"
import { describe, expect, it } from "vitest"
import { tagWrapOnType, wrapInTag } from "./tagWrap"

const start = (doc: string, from: number, to: number) => EditorState.create({ doc, selection: EditorSelection.single(from, to), extensions: [tagWrapOnType()] })
const wrap = (state: EditorState) => state.update(wrapInTag(state)!).state

/** Types at the cursor as a person does. */
const type = (state: EditorState, text: string) => {
  const { from, to } = state.selection.main
  return state.update({ changes: { from, to, insert: text }, selection: EditorSelection.cursor(from + text.length), userEvent: "input.type" }).state
}

describe("wrapping a selection in a tag", () => {
  it("puts the tag around it, with the cursor in the name", () => {
    const state = wrap(start("one two three", 4, 7))
    expect(state.doc.toString()).toBe("one <>two</> three")
    expect(state.selection.main.head).toBe(5)
  })

  it("puts the tags on lines of their own when the selection has several lines", () => {
    expect(wrap(start("a\nb", 0, 3)).doc.toString()).toBe("<>\na\nb\n</>")
  })

  it("does nothing without a selection", () => {
    expect(wrapInTag(EditorState.create({ doc: "abc", selection: EditorSelection.single(1) }))).toBeNull()
  })

  it("gives the closing tag what is typed in the name, and stops at a space", () => {
    let state = wrap(start("one two three", 4, 7))
    state = type(state, "al")
    expect(state.doc.toString()).toBe("one <al>two</al> three")
    state = type(state, "ert")
    expect(state.doc.toString()).toBe("one <alert>two</alert> three")
    state = type(state, ' type="tip"')
    state = type(state, "x")
    expect(state.doc.toString()).toBe('one <alert type="tip"x>two</alert> three')
  })

  it("follows a name that is deleted", () => {
    let state = wrap(start("word", 0, 4))
    state = type(state, "box")
    state = state.update({ changes: { from: 3, to: 4 }, selection: EditorSelection.cursor(3), userEvent: "delete.backward" }).state
    expect(state.doc.toString()).toBe("<bo>word</bo>")
  })
})
