import { indentUnit } from "@codemirror/language"
import { EditorState } from "@codemirror/state"
import { describe, expect, it } from "vitest"
import { guideColumns, leadingColumns, levelOffsets, unitColumns } from "./indentGuides"

describe("leadingColumns", () => {
  it("counts spaces and tabs", () => {
    expect(leadingColumns("    x", 4)).toBe(4)
    expect(leadingColumns("\t\tx", 4)).toBe(8)
    expect(leadingColumns("  \tx", 4)).toBe(4)
    expect(leadingColumns("x", 4)).toBe(0)
  })
  it("is null for a line with nothing on it", () => {
    expect(leadingColumns("", 4)).toBeNull()
    expect(leadingColumns("   ", 4)).toBeNull()
  })
})

describe("guideColumns", () => {
  const doc = EditorState.create({ doc: "- a\n  - b\n    - c\n\n    - d\n- e" }).doc

  it("is the indentation in whole levels", () => {
    expect(guideColumns(doc, 1, 4, 2)).toBe(0)
    expect(guideColumns(doc, 2, 4, 2)).toBe(2)
    expect(guideColumns(doc, 3, 4, 2)).toBe(4)
    expect(guideColumns(doc, 1, 4, 4)).toBe(0)
    expect(guideColumns(doc, 3, 4, 4)).toBe(4)
    expect(guideColumns(doc, 2, 4, 4)).toBe(0)
  })

  it("goes on through a blank line between two indented lines", () => {
    expect(guideColumns(doc, 4, 4, 2)).toBe(4)
  })

  it("stops at a blank line next to an unindented one", () => {
    const flat = EditorState.create({ doc: "- a\n\n  - b" }).doc
    expect(guideColumns(flat, 2, 4, 2)).toBe(0)
  })
})

describe("unitColumns", () => {
  it("follows the indent unit of the editor", () => {
    expect(unitColumns(EditorState.create({ extensions: [indentUnit.of("    ")] }))).toBe(4)
    expect(unitColumns(EditorState.create({ extensions: [indentUnit.of("\t")], doc: "" }))).toBe(4)
    expect(unitColumns(EditorState.create({}))).toBe(2)
  })
})

describe("levelOffsets", () => {
  it("gives the offset where each level starts", () => {
    expect(levelOffsets("      x", 4, 2, 6)).toEqual([0, 2, 4])
    expect(levelOffsets("\t\tx", 4, 4, 8)).toEqual([0, 1])
    expect(levelOffsets("    x", 4, 2, 2)).toEqual([0])
  })

  it("keeps a guide on a blank line that is shorter than the guides it carries", () => {
    expect(levelOffsets("", 4, 2, 4)).toEqual([0, 0])
    expect(levelOffsets("  ", 4, 2, 4)).toEqual([0, 2])
  })
})
