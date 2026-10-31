import { describe, expect, it } from "vitest"
import { configEntries, configOverrides, frontMatterEntries, overrideFor } from "./overrides"

const doc = `---
theme: "ocean"   # comment
scale: 110
heading:
  color: red
  size: 2
header:
  title: Hi
list:
  - a: 1
  - b
note: |
  x: 1
---
# Body
theme: not-settings
`

describe("frontMatterEntries", () => {
  it("reads top-level and nested keys with Markdown line numbers", () => {
    const by = Object.fromEntries(frontMatterEntries(doc).map((e) => [e.path, e]))
    expect(by.theme).toMatchObject({ value: "ocean", line: 2, leaf: true })
    expect(by.scale.value).toBe("110")
    expect(by.heading).toMatchObject({ leaf: false, line: 4 })
    expect(by["heading.color"]).toMatchObject({ value: "red", line: 5 })
    expect(by["header.title"].line).toBe(8)
  })

  it("does not read list items or block-scalar text as keys, nor the body", () => {
    expect(frontMatterEntries(doc).map((e) => e.path)).toEqual(["theme", "scale", "heading", "heading.color", "heading.size", "header", "header.title", "list", "note"])
  })

  it("gives nothing without, or with unclosed, front matter", () => {
    expect(frontMatterEntries("# Hi\ntheme: x")).toEqual([])
    expect(frontMatterEntries("---\ntheme: x\n")).toEqual([])
    expect(frontMatterEntries("")).toEqual([])
  })

  it("survives garbage inside the front matter", () => {
    expect(() => frontMatterEntries("---\n: : :\n\t- [\n{{\n---\n")).not.toThrow()
  })
})

describe("configEntries", () => {
  it("builds paths from tables and dotted keys, skipping arrays of tables", () => {
    const toml = `theme = "paper"\n[heading]\ncolor = "red" # c\n[themes."my theme"]\nbg = "#fff"\n[[x]]\ny = 1\n[a]\nb.c = 1\n`
    expect(configEntries(toml)).toEqual([
      { path: "theme", line: 1 },
      { path: "heading.color", line: 3 },
      { path: "themes.my theme.bg", line: 5 },
      { path: "a.b.c", line: 9 },
    ])
  })
})

describe("overrideFor / configOverrides", () => {
  const entries = frontMatterEntries(doc)
  it("matches by path, so a block alone does not override its siblings", () => {
    expect(overrideFor(entries, "heading.color")?.value).toBe("red")
    expect(overrideFor(entries, "heading.weight")).toBeUndefined()
    expect(overrideFor(entries, "header.logo")).toBeUndefined()
  })
  it("a value at a parent replaces everything below it", () => {
    expect(overrideFor(entries, "list.a")?.path).toBe("list")
    expect(overrideFor(entries, "scale.x")?.path).toBe("scale")
  })
  it("lists the overridden config keys with their lines", () => {
    const toml = `theme = "paper"\ndir = "rtl"\n[heading]\ncolor = "blue"\nweight = 1\n`
    expect(configOverrides(toml, entries).map((f) => [f.path, f.line, f.override.line])).toEqual([["theme", 1, 2], ["heading.color", 4, 5]])
  })
  it("is empty without front matter", () => {
    expect(configOverrides("a = 1", [])).toEqual([])
  })
})
