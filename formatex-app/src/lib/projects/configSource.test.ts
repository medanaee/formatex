import { describe, expect, it } from "vitest"
import { sourceOf, withSource } from "./configSource"

describe("source of config.toml", () => {
  it("is read from the top level, with its line", () => {
    expect(sourceOf('# comment\nsource = "examples/po.md" # the file\ntheme = "paper"\n')).toEqual({ path: "examples/po.md", line: 2 })
    expect(sourceOf("source = 'a b.md'")).toEqual({ path: "a b.md", line: 1 })
    expect(sourceOf('source = "a\\"b.md"')).toEqual({ path: 'a"b.md', line: 1 })
    expect(sourceOf('source = ""')).toEqual({ path: "", line: 1 })
  })

  it("ignores a source inside a table and a missing one", () => {
    expect(sourceOf('theme = "paper"\n[heading]\nsource = "x.md"\n')).toBeNull()
    expect(sourceOf('# source = "x.md"\ntheme = "paper"')).toBeNull()
    expect(sourceOf("")).toBeNull()
  })

  it("is changed in place, keeping the comment and the line endings", () => {
    expect(withSource('# c\nsource = "main.md" # the file\ntheme = "paper"\n', "notes/po.md")).toBe('# c\nsource = "notes/po.md" # the file\ntheme = "paper"\n')
    expect(withSource('source = "main.md"\r\ntheme = "paper"\r\n', "b.md")).toBe('source = "b.md"\r\ntheme = "paper"\r\n')
  })

  it("is added at the top when there is none, and never into a table", () => {
    expect(withSource('theme = "paper"\n', "b.md")).toBe('source = "b.md"\ntheme = "paper"\n')
    expect(withSource('[heading]\nsource = "x.md"\n', "b.md")).toBe('source = "b.md"\n[heading]\nsource = "x.md"\n')
  })

  it("escapes what a TOML string cannot hold", () => {
    expect(sourceOf(withSource("", 'a"b\\c.md'))?.path).toBe('a"b\\c.md')
  })
})
