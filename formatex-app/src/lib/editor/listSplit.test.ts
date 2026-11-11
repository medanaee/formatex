import { EditorState } from "@codemirror/state"
import { describe, expect, it } from "vitest"
import { listStarts } from "./listSplit"

const doc = (text: string) => EditorState.create({ doc: text }).doc

describe("listStarts", () => {
  it("is one list when the items are close or one blank line apart", () => {
    const d = doc("- a\n  - a1\n\n- b\n- c")
    expect(listStarts(d, 1, d.lines)).toEqual([1])
  })

  it("starts a list after two blank lines or more", () => {
    const d = doc("- a\n  - a1\n\n\n- b\n\n\n\n- c")
    expect(listStarts(d, 1, d.lines)).toEqual([1, 5, 9])
  })

  it("keeps a deeper item in the list it follows", () => {
    const d = doc("- a\n\n\n  - a1\n- b")
    expect(listStarts(d, 1, d.lines)).toEqual([1])
  })

  it("starts a new list when numbering restarts at 1 after a blank line", () => {
    const d = doc("1. مختار\n2. بیست سال\n\n1. nigg")
    expect(listStarts(d, 1, d.lines)).toEqual([1, 4])
  })

  it("starts a new list when Persian numbering restarts at ۱ after a blank line", () => {
    const d = doc("۱. مختار\n۲. بیست سال\n\n۱. nigg")
    expect(listStarts(d, 1, d.lines)).toEqual([1, 4])
  })
})
