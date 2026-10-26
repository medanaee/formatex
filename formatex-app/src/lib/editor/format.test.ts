import { EditorSelection, EditorState, type TransactionSpec } from "@codemirror/state"
import type { EditorView } from "@codemirror/view"
import { describe, expect, it } from "vitest"
import { insertLink, insertTable, setHeading, toggleBullets, toggleNumbers, toggleQuote, toggleWrap } from "./format"

/** A view stand-in: the commands only read `state` and call `dispatch` and `focus`. */
function fake(doc: string, anchor: number, head = anchor) {
  const view = {
    state: EditorState.create({ doc, selection: EditorSelection.single(anchor, head) }),
    dispatch(spec: TransactionSpec) {
      view.state = view.state.update(spec).state
    },
    focus() {},
  }
  return view as unknown as EditorView & { state: EditorState }
}
const text = (view: EditorView) => view.state.doc.toString()
const selected = (view: EditorView) => view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to)

describe("wrapping", () => {
  it("wraps the selection and keeps it selected", () => {
    const view = fake("make this bold", 5, 9)
    toggleWrap(view, "**")
    expect(text(view)).toBe("make **this** bold")
    expect(selected(view)).toBe("this")
  })

  it("wraps the word at the cursor when nothing is selected", () => {
    const view = fake("make this bold", 7)
    toggleWrap(view, "*")
    expect(text(view)).toBe("make *this* bold")
  })

  it("puts the cursor between the marks on an empty spot", () => {
    const view = fake("", 0)
    toggleWrap(view, "**")
    expect(text(view)).toBe("****")
    expect(view.state.selection.main.head).toBe(2)
  })

  it("takes the marks off when they are already there, inside or outside the selection", () => {
    const outside = fake("a **b** c", 4, 5)
    toggleWrap(outside, "**")
    expect(text(outside)).toBe("a b c")
    const inside = fake("a **b** c", 2, 7)
    toggleWrap(inside, "**")
    expect(text(inside)).toBe("a b c")
  })
})

describe("lines", () => {
  it("turns lines into a bulleted list and back", () => {
    const view = fake("one\ntwo", 0, 7)
    toggleBullets(view)
    expect(text(view)).toBe("- one\n- two")
    toggleBullets(view)
    expect(text(view)).toBe("one\ntwo")
  })

  it("numbers the lines in order", () => {
    const view = fake("a\nb\nc", 0, 5)
    toggleNumbers(view)
    expect(text(view)).toBe("1. a\n2. b\n3. c")
  })

  it("quotes the current line", () => {
    const view = fake("hello", 2)
    toggleQuote(view)
    expect(text(view)).toBe("> hello")
  })

  it("sets, replaces and removes a heading level", () => {
    const view = fake("Title", 2)
    setHeading(view, 2)
    expect(text(view)).toBe("## Title")
    setHeading(view, 3)
    expect(text(view)).toBe("### Title")
    setHeading(view, 3)
    expect(text(view)).toBe("Title")
    setHeading(view, 1)
    setHeading(view, 0)
    expect(text(view)).toBe("Title")
  })
})

describe("insertions", () => {
  it("inserts a link around the selected text, the cursor in the address", () => {
    const view = fake("see docs here", 4, 8)
    insertLink(view)
    expect(text(view)).toBe("see [docs](https://) here")
    expect(view.state.selection.main.head).toBe(text(view).indexOf("https://") + "https://".length)
  })

  it("inserts a table with a header, a rule and empty rows", () => {
    const view = fake("", 0)
    insertTable(view, 2, 3)
    expect(text(view)).toBe("| Column 1 | Column 2 | Column 3 |\n|---|---|---|\n|  |  |  |\n|  |  |  |\n")
  })

  it("starts the table on its own line", () => {
    const view = fake("text", 4)
    insertTable(view, 1, 2)
    expect(text(view).startsWith("text\n| Column 1 |")).toBe(true)
  })
})
