import { describe, expect, it } from "vitest"
import { getValue, removeKey, setValue, yamlString } from "./yamlEdit"

const sample = `dir: auto # per paragraph
columns: 2

header:
  style: line
  start: "عنوان سند"
  end: "صفحه {page} از {pages}"

cover:
  title: "T"
`

describe("reading", () => {
  it("reads top-level keys and block keys, with comments and non-ASCII text", () => {
    expect(getValue(sample, "", "dir")).toEqual({ kind: "string", value: "auto" })
    expect(getValue(sample, "", "columns")).toEqual({ kind: "number", value: 2 })
    expect(getValue(sample, "header", "start")).toEqual({ kind: "string", value: "عنوان سند" })
    expect(getValue(sample, "header", "style")).toEqual({ kind: "string", value: "line" })
  })
  it("does not mix a block's key with a top-level one", () => {
    expect(getValue(sample, "", "start")).toBeUndefined()
    expect(getValue(sample, "cover", "start")).toBeUndefined()
    expect(getValue(sample, "footer", "start")).toBeUndefined()
  })
})

describe("writing", () => {
  it("changes a value and keeps its comment", () => {
    expect(setValue(sample, "", "dir", "rtl")).toContain("dir: rtl # per paragraph")
  })
  it("adds a top-level key before the first block", () => {
    const next = setValue(sample, "", "theme", yamlString("nord"))
    expect(next.indexOf('theme: "nord"')).toBeLessThan(next.indexOf("header:"))
    expect(getValue(next, "", "theme")).toEqual({ kind: "string", value: "nord" })
    expect(getValue(next, "header", "style")).toEqual({ kind: "string", value: "line" })
  })
  it("adds a key to a block after its last line, and a block that is not there", () => {
    const next = setValue(sample, "header", "center", yamlString("x"))
    expect(next.indexOf('  center: "x"')).toBeGreaterThan(next.indexOf("  end:"))
    expect(next.indexOf('  center: "x"')).toBeLessThan(next.indexOf("cover:"))
    expect(setValue("dir: rtl\n", "footer", "start", yamlString("a"))).toBe('dir: rtl\nfooter:\n  start: "a"\n')
  })
  it("starts a file that has no settings yet", () => {
    expect(setValue("", "", "dir", "rtl")).toBe("dir: rtl\n")
  })
  it("removes a key, and a block that is left empty", () => {
    expect(removeKey(sample, "", "columns")).not.toContain("columns")
    const without = removeKey(sample, "cover", "title")
    expect(without).not.toContain("cover:")
    expect(without).toContain("header:")
  })
})
