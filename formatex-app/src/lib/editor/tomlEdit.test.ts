import { describe, expect, it } from "vitest"
import { getValue, hasTable, removeKey, removeTable, setValue, tableNames, tomlString } from "./tomlEdit"

const sample = `# Project-wide settings.
source = "main.md"

# Color theme
theme = "paper" # the look
scale = 100

# Fonts
[font]
# latin = "Lexend"
code = "Anonymous Pro"

[themes.mine]
base = "nord"
accent = "#ff0000"
`

describe("reading", () => {
  it("reads strings, numbers and booleans, with or without a comment", () => {
    expect(getValue(sample, "", "theme")).toEqual({ kind: "string", value: "paper" })
    expect(getValue(sample, "", "scale")).toEqual({ kind: "number", value: 100 })
    expect(getValue(sample, "font", "code")).toEqual({ kind: "string", value: "Anonymous Pro" })
    expect(getValue(sample, "themes.mine", "accent")).toEqual({ kind: "string", value: "#ff0000" })
    expect(getValue("a = true", "", "a")).toEqual({ kind: "bool", value: true })
  })
  it("does not read a commented key or a key of another table", () => {
    expect(getValue(sample, "font", "latin")).toBeUndefined()
    expect(getValue(sample, "", "code")).toBeUndefined()
  })
})

describe("writing", () => {
  it("changes a value and keeps its comment", () => {
    expect(setValue(sample, "", "theme", tomlString("nord"))).toContain('theme = "nord" # the look')
  })
  it("adds a key after the last setting of its table, before the next table's comments", () => {
    const next = setValue(sample, "", "dir", tomlString("rtl"))
    expect(next.indexOf('dir = "rtl"')).toBeGreaterThan(next.indexOf("scale = 100"))
    expect(next.indexOf('dir = "rtl"')).toBeLessThan(next.indexOf("# Fonts"))
    const font = setValue(sample, "font", "latin", tomlString("Inter"))
    expect(font.indexOf('latin = "Inter"')).toBeGreaterThan(font.indexOf('code = "Anonymous Pro"'))
  })
  it("adds a table that is not there yet", () => {
    const next = setValue("a = 1\n", "header", "color", tomlString("blue"))
    expect(next).toBe('a = 1\n\n[header]\ncolor = "blue"\n')
  })
  it("removes a key and a table", () => {
    expect(removeKey(sample, "", "scale")).not.toContain("scale")
    const without = removeTable(sample, "themes.mine")
    expect(hasTable(without, "themes.mine")).toBe(false)
    expect(without).toContain("[font]")
  })
  it("lists the user's themes", () => {
    expect(tableNames(`${sample}\n[themes.second]\nbase = "paper"\n`, "themes")).toEqual(["mine", "second"])
  })
  it("quotes what has to be quoted", () => {
    expect(tomlString(String.raw`a "b"\c`)).toBe(String.raw`"a \"b\"\\c"`)
  })
})
