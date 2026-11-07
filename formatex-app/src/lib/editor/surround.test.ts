import { EditorSelection, EditorState, Text } from "@codemirror/state"
import { describe, expect, it } from "vitest"
import { surroundSelection } from "./surround"
import { tagFoldRange } from "./tagFolding"

const apply = (state: EditorState, typed: string) => {
  const spec = surroundSelection(state, typed)
  return spec && state.update(spec).state
}

describe("typing a bracket or a quote over a selection", () => {
  const select = (doc: string, from: number, to: number) => EditorState.create({ doc, selection: EditorSelection.single(from, to) })

  it("goes around the selection, which stays selected", () => {
    for (const [typed, close] of [["(", ")"], ["[", "]"], ["{", "}"], ['"', '"'], ["'", "'"], ["`", "`"], ["$", "$"]] as const) {
      const next = apply(select("hello world", 0, 5), typed)!
      expect(next.doc.toString()).toBe(`${typed}hello${close} world`)
      expect(next.selection.main.from).toBe(1)
      expect(next.selection.main.to).toBe(6)
    }
  })

  it("wraps again when a second mark is typed: the selection is still the word", () => {
    const once = apply(select("a word here", 2, 6), "(")!
    const twice = apply(once, '"')!
    expect(twice.doc.toString()).toBe('a ("word") here')
    expect(twice.sliceDoc(twice.selection.main.from, twice.selection.main.to)).toBe("word")
  })

  it("wraps every selection of a multi-cursor, and leaves an empty one alone", () => {
    const state = EditorState.create({ doc: "one two three", selection: EditorSelection.create([EditorSelection.range(0, 3), EditorSelection.cursor(5), EditorSelection.range(8, 13)]), extensions: [EditorState.allowMultipleSelections.of(true)] })
    expect(apply(state, "[")!.doc.toString()).toBe("[one] two [three]")
  })

  it("does nothing without a selection, or for a key that is not a mark", () => {
    expect(surroundSelection(EditorState.create({ doc: "hello", selection: EditorSelection.single(2) }), "(")).toBeNull()
    expect(surroundSelection(select("hello", 0, 5), "x")).toBeNull()
    // A closing mark replaces the selection as before
    expect(surroundSelection(select("hello", 0, 5), ")")).toBeNull()
  })

  it("keeps Persian text and emoji whole", () => {
    const next = apply(select("سلام 😀 دنیا", 0, 4), "(")!
    expect(next.doc.toString()).toBe("(سلام) 😀 دنیا")
  })
})

describe("folding a tag", () => {
  const doc = (lines: string[]) => Text.of(lines)
  const text = ["# Title", "", '<alert type="info">', "", "Inside", "", "</alert>", "", "<box>", "<box>", "x", "</box>", "y", "</box>", "<kbd>a</kbd>", "<br />", "<grid>", "no end"]

  it("folds from the end of the opening line to the line before the closing tag, which stays", () => {
    const d = doc(text)
    const range = tagFoldRange(d, 3)!
    expect(d.sliceString(range.from, range.to)).toBe("\n\nInside\n")
    expect(d.lineAt(range.to).number).toBe(6)
  })

  it("counts tags of the same name inside, so the outer one closes on its own tag", () => {
    const d = doc(text)
    const outer = tagFoldRange(d, 9)!
    expect(d.lineAt(outer.to).number).toBe(13)
    const inner = tagFoldRange(d, 10)!
    expect(d.lineAt(inner.to).number).toBe(11)
  })

  it("does not fold what is not a block: a line of text, a tag closed on its line, a self-closing tag, a tag never closed, nothing between", () => {
    const d = doc(text)
    for (const line of [1, 2, 15, 16, 17]) expect(tagFoldRange(d, line), `line ${line}`).toBeNull()
    expect(tagFoldRange(doc(["<a>", "</a>"]), 1)).toBeNull()
  })
})
